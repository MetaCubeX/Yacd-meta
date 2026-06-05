/**
 * qqwry.dat (纯真 IP 库) reader.
 *
 * Format (little-endian throughout, GBK-encoded strings):
 *
 *   Header (8 bytes):
 *     0..3   first index offset (u32)
 *     4..7   last  index offset (u32)
 *
 *   Index: 7-byte entries between firstIdx..lastIdx
 *     each: ipStart (u32 LE) + recordOffset (u24 LE)  -> 7 bytes total
 *
 *   Record (variable):
 *     4 bytes  endIp  (u32 LE)  -- only meaningful for non-redirect; ignored
 *                                 by the searcher (we use the next index to
 *                                 find eip).
 *     Then either:
 *       A. Direct string:   <string> 0x00  [then Area follows]
 *       B. Mode 0x01:       0x01 <offset:3B>  -> points to another record
 *       C. Mode 0x02:       0x02 <offset:3B>  [then Area follows here]
 *                            (Country is at the redirect target)
 *
 *   "Area" handling: after the Country segment ends, read a mode byte:
 *     - 0x01 / 0x02: follow redirect for Area
 *     - else: that byte is the first char of the Area string
 *
 * Reference: github.com/zu1k/nali/pkg/qqwry + pkg/wry
 *            github.com/metowolf/qqwry.dat/protocol.md
 */

import iconv from 'iconv-lite';

const REDIRECT_MODE_1 = 0x01;
const REDIRECT_MODE_2 = 0x02;

const IP_BYTES = 4;
const OFF_BYTES = 3;
const INDEX_ENTRY_BYTES = IP_BYTES + OFF_BYTES; // 7

export interface QQwryHeader {
  firstIndexPtr: number;
  lastIndexPtr: number;
  totalEntries: number;
}

export function parseHeader(buf: Uint8Array): QQwryHeader {
  if (buf.length < 8) throw new Error('qqwry: buffer too small');
  const dv = new DataView(buf.buffer, buf.byteOffset, 8);
  const first = dv.getUint32(0, true);
  const last = dv.getUint32(4, true);
  const total = Math.floor((last - first) / INDEX_ENTRY_BYTES) + 1;
  return { firstIndexPtr: first, lastIndexPtr: last, totalEntries: total };
}

function readU32LE(buf: Uint8Array, off: number): number {
  return (
    (buf[off]! | (buf[off + 1]! << 8) | (buf[off + 2]! << 16) | (buf[off + 3]! << 24)) >>> 0
  );
}

function readU24LE(buf: Uint8Array, off: number): number {
  return (buf[off]! | (buf[off + 1]! << 8) | (buf[off + 2]! << 16)) >>> 0;
}

function ipToU32(s: string): number | null {
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(s);
  if (!m) return null;
  const a = Number(m[1]!);
  const b = Number(m[2]!);
  const c = Number(m[3]!);
  const d = Number(m[4]!);
  if (a > 255 || b > 255 || c > 255 || d > 255) return null;
  // qqwry stores IPv4 in big-endian (network order) in the index
  return ((a << 24) | (b << 16) | (c << 8) | d) >>> 0;
}

class Reader {
  private readonly buf: Uint8Array;
  private pos = 0;
  private lastPos = 0;

  constructor(buf: Uint8Array) {
    this.buf = buf;
  }

  seekAbs(offset: number): void {
    this.lastPos = this.pos;
    this.pos = offset;
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

  /** Read a null-terminated string.
   *  When `consumeNull` is true, advance past the null and update `lastPos`.
   *  When false, leave `pos` pointing at the null and do NOT touch `lastPos`
   *  (mirrors the Go binding's `seek=false` behavior, which is required for
   *  Mode 2 area parsing: after reading the redirected country, the reader
   *  must seek back to the position right after the redirect-offset bytes).
   */
  private readString(consumeNull: boolean): Uint8Array {
    const start = this.pos;
    while (this.pos < this.buf.length && this.buf[this.pos]! !== 0) {
      this.pos++;
    }
    const out = this.buf.subarray(start, this.pos);
    if (consumeNull) {
      if (this.pos < this.buf.length) this.pos++; // skip null
      this.lastPos = this.pos;
    }
    return out;
  }

  private readOffset(follow: boolean): number {
    const off = readU24LE(this.buf, this.pos);
    this.pos += OFF_BYTES;
    this.lastPos = this.pos;
    if (follow) this.pos = off;
    return off;
  }

  /** Parse the record at `offset + 4` (skip the 4-byte endIp). */
  parse(offset: number): { country: string; area: string } {
    this.seekAbs(offset);
    return this.parseFromHere();
  }

  private parseFromHere(): { country: string; area: string } {
    const mode = this.buf[this.pos]!;
    if (mode === REDIRECT_MODE_1) {
      this.pos++; // consume mode
      this.readOffset(true);
      return this.parseFromHere();
    }
    if (mode === REDIRECT_MODE_2) {
      this.pos++; // consume mode
      const country = this.parseRedirectMode2();
      const area = this.readArea();
      return { country, area };
    }
    // Direct string mode: the mode byte is the first char of the string.
    const country = decodeGbk(this.readString(true));
    const area = this.readArea();
    return { country, area };
  }

  private parseRedirectMode2(): string {
    this.readOffset(true);
    const s = this.readString(false);
    this.seekBack();
    return decodeGbk(s);
  }

  private readArea(): string {
    const mode = this.buf[this.pos]!;
    if (mode === REDIRECT_MODE_1 || mode === REDIRECT_MODE_2) {
      this.pos++; // consume mode
      const off = this.readOffset(true);
      if (off === 0) return '';
      // Area redirects always point at a plain string (not a record).
      return decodeGbk(this.readString(false));
    }
    // Direct area string at current pos. The mode byte is the first char.
    const s = this.readString(true);
    return decodeGbk(s);
  }
}

function decodeGbk(bytes: Uint8Array): string {
  if (bytes.length === 0) return '';
  // GBK strings in qqwry may contain "CZ88.NET" markers; nali trims them.
  return iconv.decode(bytes, 'gbk').replace(/CZ88\.NET/g, '').trim();
}

export interface QQwrySearcher {
  header: QQwryHeader;
  search(ip: string): string;
}

export function createQQwrySearcher(buf: Uint8Array): QQwrySearcher {
  const header = parseHeader(buf);

  const reader = new Reader(buf);

  function search(ip: string): string {
    const ipU32 = ipToU32(ip);
    if (ipU32 === null) return '';

    // Binary search the index.
    let lo = 0;
    let hi = header.totalEntries - 1;
    let recordOffset = -1;

    while (lo <= hi) {
      const mid = (lo + hi) >>> 1;
      const p = header.firstIndexPtr + mid * INDEX_ENTRY_BYTES;
      if (p + INDEX_ENTRY_BYTES > buf.length) return '';
      const idxIp = readU32LE(buf, p);
      if (idxIp > ipU32) {
        hi = mid - 1;
      } else if (idxIp < ipU32) {
        lo = mid + 1;
      } else {
        recordOffset = readU24LE(buf, p + IP_BYTES);
        break;
      }
    }

    if (recordOffset === -1) {
      // No exact match. After the loop, `lo` is the smallest index whose
      // idxIp > ipU32; the matching range is the previous entry.
      if (lo === 0) return '';
      const prev = lo > header.totalEntries ? header.totalEntries - 1 : lo - 1;
      const p = header.firstIndexPtr + prev * INDEX_ENTRY_BYTES;
      if (p + INDEX_ENTRY_BYTES > buf.length) return '';
      recordOffset = readU24LE(buf, p + IP_BYTES);
    }

    if (recordOffset < 0) return '';
    const { country, area } = reader.parse(recordOffset + IP_BYTES);
    return `${country} ${area}`.trim().replace(/\s+/g, ' ');
  }

  return { header, search };
}
