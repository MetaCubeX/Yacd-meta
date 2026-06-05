/**
 * zxipv6wry.db (ZX IPv6) reader.
 *
 * Format (per the official 格式详解-ipdb.txt):
 *
 *   Header (24 bytes for v1, 40+ for v2):
 *     0..3   "IPDB" magic
 *     4      minor version
 *     5      major version
 *     6      offLen (offset length, bytes per record-offset field)
 *     7      ipLen  (IP length, bytes per IP-key in the index)
 *     8..15  counts   (u64 LE)
 *     16..23 start    (u64 LE)  -- byte offset of the first index entry
 *
 *   Index (between start and start + counts * (ipLen+offLen)):
 *     each entry: ip (ipLen bytes, network order) + offset (offLen bytes LE)
 *
 *   Records (variable):
 *     01 <offset>          -> country = record at offset
 *     02 <offset> [rest]   -> country = string at offset; area follows here
 *     20-FF <utf8 string>  -> country = string; area follows
 *
 *   Strings are UTF-8, null-terminated.
 *
 * Reference: github.com/zu1k/nali/pkg/zxipv6wry
 */

const MAGIC = 'IPDB';
const IPV6_KEY_BYTES = 8; // nali only uses the leading 8 bytes
const REDIRECT_MODE_1 = 0x01;
const REDIRECT_MODE_2 = 0x02;

export interface ZxIpv6Header {
  minor: number;
  major: number;
  offLen: number;
  ipLen: number;
  counts: bigint;
  start: bigint;
}

export function parseHeader(buf: Uint8Array): ZxIpv6Header {
  if (buf.length < 24) throw new Error('zxipv6: header too small');
  if (
    buf[0] !== MAGIC.charCodeAt(0) ||
    buf[1] !== MAGIC.charCodeAt(1) ||
    buf[2] !== MAGIC.charCodeAt(2) ||
    buf[3] !== MAGIC.charCodeAt(3)
  ) {
    throw new Error('zxipv6: bad magic');
  }
  const dv = new DataView(buf.buffer, buf.byteOffset, 24);
  return {
    minor: dv.getUint8(4),
    major: dv.getUint8(5),
    offLen: dv.getUint8(6),
    ipLen: dv.getUint8(7),
    counts: dv.getBigUint64(8, true),
    start: dv.getBigUint64(16, true),
  };
}

class Reader {
  constructor(private readonly buf: Uint8Array) {}
  private pos = 0;
  private lastPos = 0;

  seekAbs(o: number): void {
    this.lastPos = this.pos;
    this.pos = o;
  }
  seekBack(): void {
    this.pos = this.lastPos;
  }
  private readByte(): number {
    const b = this.buf[this.pos]!;
    this.lastPos = this.pos;
    this.pos += 1;
    return b;
  }
  private readBytes(n: number): Uint8Array {
    const out = this.buf.subarray(this.pos, this.pos + n);
    this.lastPos = this.pos;
    this.pos += n;
    return out;
  }
  private readString(consume: boolean): Uint8Array {
    const start = this.pos;
    while (this.pos < this.buf.length && this.buf[this.pos]! !== 0) this.pos++;
    const out = this.buf.subarray(start, this.pos);
    if (consume && this.pos < this.buf.length) this.pos++;
    if (consume) this.lastPos = this.pos;
    return out;
  }
  private readOffset(offLen: number, follow: boolean): number {
    let n = 0;
    for (let i = 0; i < offLen; i++) {
      n |= this.buf[this.pos + i]! << (8 * i);
    }
    this.pos += offLen;
    this.lastPos = this.pos;
    if (follow) this.pos = n >>> 0;
    return n >>> 0;
  }
  parse(offset: number, offLen: number): { country: string; area: string } {
    this.seekAbs(offset);
    return this.parseFromHere(offLen);
  }
  private parseFromHere(offLen: number): { country: string; area: string } {
    const mode = this.buf[this.pos]!;
    if (mode === REDIRECT_MODE_1) {
      this.pos++;
      const off = this.readOffset(offLen, true);
      return this.parseFromHere(offLen);
    }
    if (mode === REDIRECT_MODE_2) {
      this.pos++;
      const country = this.parseRedirectMode2(offLen);
      const area = this.readArea(offLen);
      return { country, area };
    }
    const country = decodeUtf8(this.readString(true));
    const area = this.readArea(offLen);
    return { country, area };
  }
  private parseRedirectMode2(offLen: number): string {
    this.readOffset(offLen, true);
    const s = this.readString(false);
    this.seekBack();
    return decodeUtf8(s);
  }
  private readArea(offLen: number): string {
    const mode = this.buf[this.pos]!;
    if (mode === REDIRECT_MODE_1 || mode === REDIRECT_MODE_2) {
      this.pos++;
      const off = this.readOffset(offLen, true);
      if (off === 0) return '';
      return decodeUtf8(this.readString(false));
    }
    return decodeUtf8(this.readString(true));
  }
}

function decodeUtf8(bytes: Uint8Array): string {
  return new TextDecoder('utf-8').decode(bytes);
}

export interface ZxIpv6Searcher {
  header: ZxIpv6Header;
  search(ip: string): string;
}

export function createZxIpv6Searcher(buf: Uint8Array): ZxIpv6Searcher {
  const header = parseHeader(buf);
  if (header.ipLen < IPV6_KEY_BYTES) {
    throw new Error(`zxipv6: ipLen ${header.ipLen} < 8, cannot index IPv6`);
  }
  const reader = new Reader(buf);
  const entryLen = header.ipLen + header.offLen;
  const start = Number(header.start);
  const counts = Number(header.counts);
  // End offset in bytes: start + counts*entryLen. We don't pre-store it;
  // the binary search bounds itself with this expression.
  const totalEntries = counts;

  function readKeyLE(p: number): bigint {
    // nali reads the index entries as little-endian u64. This is
    // mathematically inconsistent with the network-order (BE) IPv6
    // encoding, but the upstream data is arranged so that LE-read
    // values are monotonically increasing, which makes the binary
    // search converge. We mirror that behavior for compatibility
    // with the Go reference.
    let v = 0n;
    for (let i = header.ipLen - 1; i >= 0; i--) {
      v = (v << 8n) | BigInt(buf[p + i]!);
    }
    return v;
  }

  function search(ip: string): string {
    let bytes = parseIpv6(ip);
    if (!bytes) {
      // Accept IPv4 too: convert to IPv4-mapped IPv6 (::ffff:a.b.c.d).
      const v4 = parseIpv4(ip);
      if (!v4) return '';
      bytes = new Uint8Array(16);
      bytes[10] = 0xff;
      bytes[11] = 0xff;
      bytes.set(v4, 12);
    }
    // nali uses only the leading 8 bytes, read as BE u64.
    const query =
      (BigInt(bytes[0]!) << 56n) |
      (BigInt(bytes[1]!) << 48n) |
      (BigInt(bytes[2]!) << 40n) |
      (BigInt(bytes[3]!) << 32n) |
      (BigInt(bytes[4]!) << 24n) |
      (BigInt(bytes[5]!) << 16n) |
      (BigInt(bytes[6]!) << 8n) |
      BigInt(bytes[7]!);

    let lo = 0;
    let hi = totalEntries - 1;
    let recordOffset = -1;
    while (lo <= hi) {
      const mid = (lo + hi) >>> 1;
      const p = start + mid * entryLen;
      if (p + entryLen > buf.length) return '';
      const idxKey = readKeyLE(p);
      if (idxKey > query) {
        hi = mid - 1;
      } else if (idxKey < query) {
        lo = mid + 1;
      } else {
        recordOffset = readOffset(buf, p + header.ipLen, header.offLen);
        break;
      }
    }
    if (recordOffset === -1) {
      if (lo === 0) return '';
      const prev = lo > totalEntries ? totalEntries - 1 : lo - 1;
      const p = start + prev * entryLen;
      if (p + entryLen > buf.length) return '';
      recordOffset = readOffset(buf, p + header.ipLen, header.offLen);
    }
    if (recordOffset < 0) return '';
    const { country, area } = reader.parse(recordOffset, header.offLen);
    return `${country} ${area}`.trim();
  }

  return { header, search };
}

function readOffset(buf: Uint8Array, p: number, offLen: number): number {
  let n = 0;
  for (let i = 0; i < offLen; i++) {
    n |= buf[p + i]! << (8 * i);
  }
  return n >>> 0;
}

// Re-export parseIpv6 from xdb.ts to avoid duplicating it.
import { parseIpv4, parseIpv6 } from './xdb';
