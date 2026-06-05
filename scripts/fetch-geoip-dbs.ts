#!/usr/bin/env tsx
/**
 * Fetch the four offline IP databases and their license texts into
 * `assets/geoip/`.
 *
 * Why build-time: GitHub release assets and zxinc.org don't send
 * `Access-Control-Allow-Origin`, so a browser can't fetch them directly.
 * We sidestep the issue by downloading on the build machine (no CORS) and
 * letting Vite copy the files to `public/geoip/` as plain same-origin
 * static assets. The browser then fetches them from its own origin.
 *
 * Sources:
 *   ip2region_v4.xdb   -> jsdelivr (mirror of github)
 *   cdn.yml            -> jsdelivr (mirror of github)
 *   qqwry.dat          -> github.com/metowolf/qqwry.dat/releases (no CORS, ok at build)
 *   zxipv6wry.db       -> ip.zxinc.org/ip.7z (a 7z archive; extracted via the system 7z)
 *                         + the bundled 版权声明.txt / 使用说明.txt (z xinc §1
 *                         requires the unmodified 协议 to ship with every
 *                         distribution).
 *
 * The fetch script also writes `assets/geoip/NOTICE.md` with attributions
 * and license terms for each DB.
 */

import { mkdir, readdir, rename, rm, stat, unlink, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { createWriteStream, existsSync } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import { createHash } from 'node:crypto';

const here = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(here, '..');
// Yacd-meta's vite config sets publicDir='assets' and build.outDir='public'.
// Anything we put in `assets/` is copied verbatim into `public/` on build,
// so the browser sees it at `/geoip/...` regardless of the source dir.
const outDir = join(projectRoot, 'assets', 'geoip');
const zxincLicenseDir = join(outDir, 'zxinc-license');

const SOURCES = [
  {
    name: 'ip2region_v4.xdb',
    url: 'https://cdn.jsdelivr.net/gh/lionsoul2014/ip2region@master/data/ip2region_v4.xdb',
    minSize: 5 * 1024 * 1024, // 5 MB
    license: {
      name: 'ip2region',
      spdx: 'Apache-2.0',
      copyright: 'lionsoul2014 (chenxin619315@gmail.com)',
      homepage: 'https://github.com/lionsoul2014/ip2region',
      noticeUrl: 'https://github.com/lionsoul2014/ip2region/blob/master/LICENSE.md',
    },
  },
  {
    name: 'qqwry.dat',
    url: 'https://github.com/metowolf/qqwry.dat/releases/latest/download/qqwry.dat',
    minSize: 10 * 1024 * 1024, // 10 MB
    license: {
      name: 'qqwry (纯真 IP 库)',
      spdx: 'custom-personal-non-commercial',
      copyright: 'CZ88.NET (纯真网络) — auto-synced by metowolf',
      homepage: 'https://github.com/metowolf/qqwry.dat',
      noticeUrl: 'https://www.cz88.net/',
      restriction:
        'Personal use only; cannot be sold or used for commercial purposes; ' +
        'the database itself must not be modified.',
    },
  },
  {
    name: 'cdn.yml',
    url: 'https://cdn.jsdelivr.net/gh/SukkaLab/cdn@master/src/cdn.yml',
    minSize: 5 * 1024, // 5 KB
    license: {
      name: 'SukkaLab/cdn',
      spdx: 'MIT',
      copyright: 'Sukka (https://github.com/Sukka)',
      homepage: 'https://github.com/SukkaLab/cdn',
      noticeUrl: 'https://github.com/SukkaLab/cdn/blob/master/LICENSE',
    },
  },
  {
    // This one is a 7z archive; we extract ipv6wry.db and the license TXT
    // files (which zxinc §1 requires we ship with every copy).
    name: 'zxipv6wry.db',
    url: 'https://ip.zxinc.org/ip.7z',
    archive: true,
    minSize: 100 * 1024, // 100 KB extracted
    license: {
      name: 'ZX IPv6 地址数据库',
      spdx: 'custom-non-commercial-zxinc',
      copyright: '蓝视云大数据（武汉）有限公司',
      homepage: 'https://ip.zxinc.org/',
      noticeUrl: 'https://ip.zxinc.org/',
      restriction:
        'Free redistribution permitted only with the unmodified 协议 (TXT files) ' +
        'shipped alongside; non-commercial use only without separate authorization.',
    },
  },
] as const;

function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

async function downloadTo(
  url: string,
  dest: string,
  opts: { retries?: number } = {}
): Promise<{ bytes: number; sha256: string }> {
  const retries = opts.retries ?? 3;
  const tmp = `${dest}.part`;
  let lastErr: unknown;
  for (let attempt = 1; attempt <= retries; attempt++) {
    console.log(`  GET ${url}  (attempt ${attempt}/${retries})`);
    try {
      const res = await fetch(url, { redirect: 'follow' });
      if (!res.ok || !res.body) {
        throw new Error(`HTTP ${res.status} ${res.statusText} for ${url}`);
      }
      const hash = createHash('sha256');
      let bytes = 0;
      const body = Readable.fromWeb(res.body as unknown as import('node:stream/web').ReadableStream);
      body.on('data', (chunk: Buffer) => {
        bytes += chunk.length;
        hash.update(chunk);
      });
      await pipeline(body, createWriteStream(tmp));
      await rename(tmp, dest);
      return { bytes, sha256: hash.digest('hex') };
    } catch (err) {
      lastErr = err;
      // Clean up the half-written part file before retrying.
      await unlink(tmp).catch(() => undefined);
      if (attempt < retries) {
        // Small exponential backoff.
        await new Promise((r) => setTimeout(r, 500 * 2 ** (attempt - 1)));
      }
    }
  }
  throw new Error(`failed to download ${url} after ${retries} attempts: ${String(lastErr)}`);
}

async function hashFile(path: string): Promise<{ bytes: number; sha256: string }> {
  const { readFile } = await import('node:fs/promises');
  const buf = await readFile(path);
  return { bytes: buf.length, sha256: createHash('sha256').update(buf).digest('hex') };
}

async function run7z(args: string[]): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const p = spawn('7z', args, { stdio: 'inherit' });
    p.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`7z exited ${code}`))));
    p.on('error', reject);
  });
}

async function extractZxinc(archive: string): Promise<void> {
  // Extract the .db to outDir and the three required license TXT files to
  // outDir/zxinc-license/. We don't extract the sample-code subdirs
  // (cpp/, c#/, go/, etc.) because they're not part of the data license.
  const requiredTxts = ['版权声明.txt', '使用说明.txt', '格式详解-ipdb.txt'];
  const work = await mkdtemp('zxinc-');
  try {
    await run7z(['x', '-y', `-o${work}`, archive]);
    // Locate ipv6wry.db (its case-insensitive name varies across releases).
    const entries = await readdir(work);
    const dbEntry = entries.find((e) => /^ipv6wry\.db$/i.test(e));
    if (!dbEntry) throw new Error('zxinc archive missing ipv6wry.db');
    await rename(join(work, dbEntry), join(outDir, 'zxipv6wry.db'));
    // Copy the required TXT files into zxinc-license/.
    for (const txt of requiredTxts) {
      const match = entries.find((e) => e === txt);
      if (!match) {
        console.warn(`  [zxinc] missing required file: ${txt} — license may be incomplete`);
        continue;
      }
      await rename(join(work, match), join(zxincLicenseDir, txt));
    }
  } finally {
    await rmrf(work);
  }
}

function fmtTimestamp(d: Date = new Date()): string {
  return d.toISOString().slice(0, 10);
}

async function writeNotice(records: Array<{ name: string; bytes: number; sha256: string }>): Promise<void> {
  const lines: string[] = [];
  lines.push('# IP database attributions and licenses');
  lines.push('');
  lines.push(`Generated by \`scripts/fetch-geoip-dbs.ts\` on ${fmtTimestamp()}.`);
  lines.push('');
  lines.push('The four databases in this directory are downloaded at build time from');
  lines.push('their canonical sources. Each has its own license; users of Yacd-meta');
  lines.push('who redistribute the resulting build must respect all of them.');
  lines.push('');
  lines.push('## Bundled files');
  lines.push('');
  lines.push('| File | Size | SHA-256 (prefix) | Source |');
  lines.push('|------|------|------------------|--------|');
  for (const r of records) {
    lines.push(`| \`${r.name}\` | ${fmtBytes(r.bytes)} | \`${r.sha256.slice(0, 12)}…\` | build-time |`);
  }
  lines.push('');
  lines.push('## Licenses');
  lines.push('');
  for (const src of SOURCES) {
    const L = src.license;
    lines.push(`### ${L.name}`);
    lines.push('');
    lines.push(`- **SPDX identifier:** \`${L.spdx}\``);
    lines.push(`- **Copyright:** ${L.copyright}`);
    lines.push(`- **Homepage:** <${L.homepage}>`);
    lines.push(`- **License text:** <${L.noticeUrl}>`);
    if ('restriction' in L && L.restriction) {
      lines.push(`- **Restriction:** ${L.restriction}`);
    }
    lines.push('');
  }
  lines.push('## ZX IP地址数据库 licensing note');
  lines.push('');
  lines.push(
    'Per the zxinc 协议 (§1), every copy, distribution, or transmission of the',
  );
  lines.push(
    'ZX IPv6 数据库 must include the unmodified 协议 documents. We ship them in',
  );
  lines.push('the `zxinc-license/` subdirectory next to `zxipv6wry.db` for that reason.');
  lines.push(
    'Removal of these TXT files from a redistribution would violate §1 and §2',
  );
  lines.push('of the 协议.');
  lines.push('');
  lines.push('## qqwry licensing note');
  lines.push('');
  lines.push(
    'The 纯真 IP 库 is owned by CZ88.NET. It is free for personal use; commercial',
  );
  lines.push(
    'use, resale, or modification of the database is prohibited. Yacd-meta is a',
  );
  lines.push(
    'free open-source dashboard; if you intend to deploy it commercially (e.g.',
  );
  lines.push(
    'as part of a paid service), remove or replace `qqwry.dat` with an',
  );
  lines.push('alternatively-licensed database.');
  lines.push('');
  await writeFile(join(outDir, 'NOTICE.md'), lines.join('\n'), 'utf-8');
}

async function main() {
  await mkdir(outDir, { recursive: true });
  await mkdir(zxincLicenseDir, { recursive: true });
  console.log(`Output: ${outDir}\n`);

  const records: Array<{ name: string; bytes: number; sha256: string }> = [];

  for (const src of SOURCES) {
    const dest = join(outDir, src.name);
    const t0 = performance.now();

    if (src.name === 'zxipv6wry.db') {
      // Download the 7z, extract ipv6wry.db and required license TXT files.
      const tmp = join(outDir, 'ip.7z');
      const { bytes } = await downloadTo(src.url, tmp);
      if (bytes < src.minSize) {
        throw new Error(`archive looks too small: ${fmtBytes(bytes)}`);
      }
      console.log(`  archive: ${fmtBytes(bytes)}`);
      await extractZxinc(tmp);
      await unlink(tmp).catch(() => undefined);
      // Hash the extracted .db (not the 7z) so the SHA-256 matches what
      // gets shipped in the build.
      const { sha256 } = await hashFile(join(outDir, 'zxipv6wry.db'));
      const dbStat = await stat(join(outDir, 'zxipv6wry.db'));
      console.log(`  zxipv6wry.db: ${fmtBytes(dbStat.size)}  sha256=${sha256.slice(0, 12)}…`);
      records.push({ name: 'zxipv6wry.db', bytes: dbStat.size, sha256 });
    } else {
      const { bytes, sha256 } = await downloadTo(src.url, dest);
      if (bytes < src.minSize) {
        throw new Error(
          `download for ${src.name} is too small (${fmtBytes(bytes)}), ` +
            `expected at least ${fmtBytes(src.minSize)}`,
        );
      }
      console.log(`  ${src.name}: ${fmtBytes(bytes)}  sha256=${sha256.slice(0, 12)}…`);
      records.push({ name: src.name, bytes, sha256 });
    }

    const elapsed = ((performance.now() - t0) / 1000).toFixed(2);
    console.log(`  done in ${elapsed}s\n`);
  }

  await writeNotice(records);

  // Sanity check: required artifacts exist.
  for (const required of [
    'ip2region_v4.xdb',
    'qqwry.dat',
    'cdn.yml',
    'zxipv6wry.db',
    'zxinc-license/版权声明.txt',
    'zxinc-license/使用说明.txt',
    'zxinc-license/格式详解-ipdb.txt',
    'NOTICE.md',
  ]) {
    const p = join(outDir, required);
    if (!existsSync(p)) {
      throw new Error(`missing required output: ${p}`);
    }
  }
  console.log('All databases fetched into', outDir);
  console.log('Sanity check passed.');
}

// Tiny helpers (avoid an extra import in this otherwise self-contained file).
async function mkdtemp(prefix: string): Promise<string> {
  const dir = join(outDir, `.${prefix}${Date.now()}`);
  await mkdir(dir, { recursive: true });
  return dir;
}
async function rmrf(p: string): Promise<void> {
  await rm(p, { recursive: true, force: true });
}

main().catch((err) => {
  console.error('\nfetch-geoip-dbs failed:', err);
  process.exit(1);
});
