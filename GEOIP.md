# GEOIP integration

The Connections page now shows the geolocation of each connection's
destination IP. The data comes from four offline databases, ported from
the Go [zu1k/nali](https://github.com/zu1k/nali) project, plus a CDN
provider list for hostname lookups.

## Quick start

The databases are **not committed to the repo** (~38 MB total) and are
**not downloaded automatically** — to keep `pnpm install` and `pnpm
build` hermetic for contributors who don't need this feature, you have
to fetch them explicitly:

```bash
pnpm fetch:geoip        # downloads to assets/geoip/
pnpm dev                # works
```

After the first fetch, the files live in `assets/geoip/` (gitignored)
and Vite serves them at `/geoip/*` for the browser to load.

To refresh against upstream later, just re-run `pnpm fetch:geoip`.

## What's bundled

| File | Size | Format | Source | License |
|------|------|--------|--------|---------|
| `ip2region_v4.xdb` | 10 MB | xdb v3 | [lionsoul2014/ip2region](https://github.com/lionsoul2014/ip2region) | Apache-2.0 |
| `qqwry.dat` | 26 MB | custom (GBK) | 纯真 IP 库 (via [metowolf/qqwry.dat](https://github.com/metowolf/qqwry.dat)) | Personal use, non-commercial — see NOTICE.md |
| `zxipv6wry.db` | 2.6 MB | IPDB | [ip.zxinc.org](https://ip.zxinc.org) | Non-commercial — license text in `zxinc-license/` |
| `cdn.yml` | 21 KB | YAML | [SukkaLab/cdn](https://github.com/SukkaLab/cdn) | MIT |
| `NOTICE.md` | auto-generated | – | this script | – |
| `zxinc-license/*.txt` | 6 KB | TXT | bundled in zxinc ip.7z per zxinc 协议 §1 | – |

`NOTICE.md` is regenerated on every `pnpm fetch:geoip` and lists the
SPDX identifier, copyright holder, homepage, and restriction for each
DB.

## Why build-time, not runtime

GitHub release assets (`qqwry.dat`) and zxinc.org don't send
`Access-Control-Allow-Origin`, so a browser can't fetch them directly.
We sidestep the issue by downloading on the build machine (no CORS at
the network edge) and letting Vite copy the files into `public/geoip/`
as plain same-origin static assets.

If you'd rather fetch at runtime, you can swap `/geoip/*` for a CORS-
enabled mirror, but you'd be trusting that mirror to stay available.

## License compliance

The four DBs have different licenses — the script preserves and ships
all the required attribution documents automatically:

- **Apache 2.0 (ip2region)** — keep the Apache notice; we link to the
  upstream license in `NOTICE.md`.
- **MIT (cdn.yml)** — keep the copyright; link in `NOTICE.md`.
- **qqwry** — personal use only, no resale, no modification. Yacd-meta
  is a free open-source dashboard so this is fine for personal
  deployments. If you intend to deploy it as part of a paid service,
  remove or replace `qqwry.dat` before shipping.
- **zxinc** — non-commercial use only. Per the 协议 §1, every
  distribution must include the unmodified 协议 documents; the fetch
  script copies `版权声明.txt`, `使用说明.txt`, and `格式详解-ipdb.txt`
  into `zxinc-license/` next to `zxipv6wry.db` for exactly this reason.
  Don't strip them when redistributing.

Compared to the upstream Go `nali` tool, our build-time fetch is no
worse: nali also auto-downloads these DBs (at runtime, into
`~/.local/share/nali/`) and ships them with the binary. We've just
moved the same fetch to the build step.

## What the readers do

The four TypeScript readers under `src/lib/geoip/` are the only
project-specific code; they were ported directly from
[zu1k/nali](https://github.com/zu1k/nali) and validated against
both the upstream source-of-truth (`ip2region/data/ipv4_source.txt`)
and the Go nali reference output (`scripts/oracle/` in a separate test
project).

The high-level wrapper at `src/api/geoip.ts`:

- fetches and parses all four DBs on first call to `init()` (called
  from `main.tsx` at boot);
- exposes a synchronous `lookupIp(ip: string): string` after init
  resolves, with an LRU cache so repeat IPs cost nothing;
- returns `''` for IPs that aren't in any DB, or before init finishes
  (the table renders an em-dash in that case).

## Removing the feature

If you want a slimmer build:

1. delete `src/api/geoip.ts` and `src/lib/geoip/`;
2. revert the four reader imports in `ConnectionTable.tsx` and
   `ModalConnectionDetails.tsx`;
3. revert the i18n key additions in `src/i18n/*.ts`;
4. remove the `prebuild`/dev modifications from `main.tsx`;
5. remove the `geoip` hook call from `main.tsx`;
6. drop the new dependencies (`iconv-lite`, `js-yaml`, `buffer`) and
   `tsx` from `package.json`.

After that you can also delete `scripts/fetch-geoip-dbs.ts`.
