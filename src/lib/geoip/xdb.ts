/**
 * ip2region xdb v3 (Structure30) reader.
 *
 * Format (little-endian):
 *   Header (256B):
 *     0..1   version (u16)            // 2 = v2, 3 = v3
 *     2..3   indexPolicy (u16)        // 1 = vector, 2 = btree
 *     4..7   createdAt (u32)
 *     8..11  startIndexPtr (u32)
 *     12..15 endIndexPtr (u32)
 *     16..17 ipVersion (u16)          // 4 or 6
 *     18..19 runtimePtrBytes (u16)
 *
 *   Vector Index (256 * 256 * 8 = 524288B = 512KB):
 *     2D table indexed by ip[0], ip[1].
 *     Each cell: sPtr (u32) + ePtr (u32).
 *
 *   Segment Index (variable, between startIndexPtr and endIndexPtr):
 *     IPv4 entry: 14B = sip(4, LE) + eip(4, LE) + dataLen(2) + dataPtr(4)
 *     IPv6 entry: 38B = sip(16)   + eip(16)   + dataLen(2) + dataPtr(4)
 *
 *   Data: dataPtr..dataPtr+dataLen, region string e.g. "中国|福建省|福州市|中国电信|CN"
 *
 * Reference: github.com/lionsoul2014/ip2region/binding/golang/xdb
 */

export const HEADER_SIZE = 256;
export const VECTOR_INDEX_ROWS = 256;
export const VECTOR_INDEX_COLS = 256;
export const VECTOR_INDEX_SIZE = 8; // (sPtr u32 + ePtr u32)
export const VECTOR_INDEX_BYTES =
  VECTOR_INDEX_ROWS * VECTOR_INDEX_COLS * VECTOR_INDEX_SIZE;

export const STRUCTURE_2 = 2;
export const STRUCTURE_3 = 3;

export const IPV4 = 4;
export const IPV6 = 6;

export const SEGMENT_INDEX_SIZE_IPV4 = 14;
export const SEGMENT_INDEX_SIZE_IPV6 = 38;

export interface XdbHeader {
  version: number;
  indexPolicy: number;
  createdAt: number;
  startIndexPtr: number;
  endIndexPtr: number;
  ipVersion: number;
  runtimePtrBytes: number;
}

/** Parse the 256-byte header (little-endian). */
export function parseHeader(buf: Uint8Array): XdbHeader {
  if (buf.length < HEADER_SIZE) {
    throw new Error(`xdb buffer too small: ${buf.length} < ${HEADER_SIZE}`);
  }
  const dv = new DataView(buf.buffer, buf.byteOffset, HEADER_SIZE);
  return {
    version: dv.getUint16(0, true),
    indexPolicy: dv.getUint16(2, true),
    createdAt: dv.getUint32(4, true),
    startIndexPtr: dv.getUint32(8, true),
    endIndexPtr: dv.getUint32(12, true),
    ipVersion: dv.getUint16(16, true),
    runtimePtrBytes: dv.getUint16(18, true),
  };
}

/** Parse "1.2.3.4" -> [1,2,3,4] (4 bytes, network order). */
export function parseIpv4(s: string): Uint8Array | null {
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(s);
  if (!m) return null;
  const out = new Uint8Array(4);
  for (let i = 0; i < 4; i++) {
    const n = Number(m[i + 1]);
    if (n < 0 || n > 255) return null;
    out[i] = n;
  }
  return out;
}

/** Parse "2001:db8::1" -> 16 bytes. */
export function parseIpv6(s: string): Uint8Array | null {
  // Use a quick manual parser; covers the common fully-expanded form and the
  // shorthand :: form. Anything we miss is rejected (returns null) and the
  // caller can fall back to a different strategy.
  const parts = s.split('::');
  if (parts.length > 2) return null;
  const head = parts[0] ? parts[0].split(':') : [];
  const tail = parts.length === 2 && parts[1] ? parts[1].split(':') : [];
  if (parts.length === 1 && head.length !== 8) return null;
  if (head.length + tail.length > 8) return null;
  const out = new Uint8Array(16);
  let i = 0;
  for (const g of head) {
    if (g.length === 0 || g.length > 4) return null;
    const v = parseInt(g, 16);
    if (!Number.isFinite(v)) return null;
    out[i++] = (v >> 8) & 0xff;
    out[i++] = v & 0xff;
  }
  const fill = 8 - head.length - tail.length;
  i += fill * 2;
  for (const g of tail) {
    if (g.length === 0 || g.length > 4) return null;
    const v = parseInt(g, 16);
    if (!Number.isFinite(v)) return null;
    out[i++] = (v >> 8) & 0xff;
    out[i++] = v & 0xff;
  }
  return out;
}

/** Read a u32 at offset (LE). */
function readU32(buf: Uint8Array, offset: number): number {
  return (
    buf[offset]! |
    (buf[offset + 1]! << 8) |
    (buf[offset + 2]! << 16) |
    (buf[offset + 3]! << 24)
  ) >>> 0;
}

/** Read a u16 at offset (LE). */
function readU16(buf: Uint8Array, offset: number): number {
  return (buf[offset]! | (buf[offset + 1]! << 8)) & 0xffff;
}

/** Decode a UTF-8 region string. We also trim the "|0" zero-region markers. */
function decodeRegion(raw: Uint8Array): string {
  const s = new TextDecoder('utf-8').decode(raw);
  return s.replace(/\|0/g, '').replace(/0$/, '').trim();
}

/**
 * Compare `ip` (network order) against a `len`-byte ip stored at `entryOffset+0`
 * or `entryOffset+len` (the latter is little-endian for IPv4).
 *
 * Matches the Go binding's IPv4 byte-swap trick: IPv4 segment index stores
 * sip/eip in LE, IPv6 stores them in network order.
 */
function compareIp(
  ip: Uint8Array,
  buf: Uint8Array,
  peerOffset: number,
  isIpv4: boolean,
): number {
  // The Go code reads 4 bytes for v4 / 16 bytes for v6 from the index and
  // compares them in network order. For v4, it first swaps the LE bytes
  // into network order. We do the same.
  const len = isIpv4 ? 4 : 16;
  for (let k = 0; k < len; k++) {
    let bv: number;
    if (isIpv4) {
      // Little-endian to big-endian byte swap
      bv = buf[peerOffset + (3 - k)]!;
    } else {
      bv = buf[peerOffset + k]!;
    }
    const av = ip[k]!;
    if (av < bv) return -1;
    if (av > bv) return 1;
  }
  return 0;
}

export interface XdbSearcher {
  header: XdbHeader;
  /** Search region string for an IPv4 or IPv6 address; "" if not found. */
  search(ip: string): string;
}

export function createSearcher(buf: Uint8Array): XdbSearcher {
  const header = parseHeader(buf);
  if (header.version !== STRUCTURE_2 && header.version !== STRUCTURE_3) {
    throw new Error(`unsupported xdb version: ${header.version}`);
  }
  if (header.version === STRUCTURE_2 && header.ipVersion === 0) {
    // v2 is implicitly IPv4.
    header.ipVersion = IPV4;
  }
  if (header.ipVersion !== IPV4 && header.ipVersion !== IPV6) {
    throw new Error(`unsupported ip version: ${header.ipVersion}`);
  }

  const isIpv4 = header.ipVersion === IPV4;
  const segIndexSize = isIpv4 ? SEGMENT_INDEX_SIZE_IPV4 : SEGMENT_INDEX_SIZE_IPV6;

  function search(ip: string): string {
    const ipBytes = isIpv4 ? parseIpv4(ip) : parseIpv6(ip);
    if (!ipBytes) return '';

    // 1) vector index lookup using first two bytes of the IP
    const b0 = ipBytes[0]!;
    const b1 = ipBytes[1]!;
    const vIdx = HEADER_SIZE + (b0 * VECTOR_INDEX_COLS + b1) * VECTOR_INDEX_SIZE;
    if (vIdx + VECTOR_INDEX_SIZE > buf.length) return '';
    const sPtr = readU32(buf, vIdx);
    const ePtr = readU32(buf, vIdx + 4);
    if (sPtr === 0 || ePtr === 0) return '';

    // 2) binary search the segment index
    let lo = 0;
    let hi = Math.floor((ePtr - sPtr) / segIndexSize);
    let dataLen = 0;
    let dataPtr = 0;

    while (lo <= hi) {
      const mid = (lo + hi) >>> 1;
      const p = sPtr + mid * segIndexSize;
      if (p + segIndexSize > buf.length) return '';

      // sip comparison (ip >= sip ?)
      if (compareIp(ipBytes, buf, p, isIpv4) < 0) {
        hi = mid - 1;
        continue;
      }
      // eip comparison (ip <= eip ?)
      if (compareIp(ipBytes, buf, p + (isIpv4 ? 4 : 16), isIpv4) > 0) {
        lo = mid + 1;
        continue;
      }
      // match
      const dataLenOff = p + (isIpv4 ? 8 : 32);
      const dataPtrOff = dataLenOff + 2;
      dataLen = readU16(buf, dataLenOff);
      dataPtr = readU32(buf, dataPtrOff);
      break;
    }

    if (dataLen === 0 || dataPtr === 0) return '';
    if (dataPtr + dataLen > buf.length) return '';
    return decodeRegion(buf.subarray(dataPtr, dataPtr + dataLen));
  }

  return { header, search };
}
