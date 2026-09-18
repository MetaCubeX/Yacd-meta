# Changelog

## [0.5.0](https://github.com/MetaCubeX/Yacd-meta/compare/v0.4.0...v0.5.0) (2026-09-18)


### Features

* `mips` stack ([e2a7bc6](https://github.com/MetaCubeX/Yacd-meta/commit/e2a7bc6c47b3c93bf0ba2de5461b8be0fd4110bb))


### Bug Fixes

* urltest后连接未自动断开 ([590bd1c](https://github.com/MetaCubeX/Yacd-meta/commit/590bd1c4600d70cd7b1334d8c3a467da60515f5f))

## [0.4.0](https://github.com/MetaCubeX/Yacd-meta/compare/v0.3.8...v0.4.0) (2026-09-09)


### ⚠ BREAKING CHANGES

* **deps:** update depends

### Features

* add ru translate ([658fb7b](https://github.com/MetaCubeX/Yacd-meta/commit/658fb7b769f5736e95302045660504ae8aace509))
* add ru translate ([cfbca00](https://github.com/MetaCubeX/Yacd-meta/commit/cfbca00b11e3a55b3186888a899431c59105ea3e))
* **configs:** add signal support and timeout for fetchConfigs ([a8f8bb1](https://github.com/MetaCubeX/Yacd-meta/commit/a8f8bb1d6b9925425b5b1121de0ea1c0de1645ed))
* **connections:** optimize closing connections with Promise.allSettled ([dcc5572](https://github.com/MetaCubeX/Yacd-meta/commit/dcc5572e526489480b3c9a0aacc64734969269ab))
* mod controller api ([abf2f68](https://github.com/MetaCubeX/Yacd-meta/commit/abf2f68ec43f6db2a3aa813f60a73cedda0d4034))
* oxlint ([affab40](https://github.com/MetaCubeX/Yacd-meta/commit/affab400be7f830de55cf5243383b4c5333f15cb))
* **proxies:** add fixed selection feature and related translations ([37367ef](https://github.com/MetaCubeX/Yacd-meta/commit/37367efe2a385114adac21f9bb044bc82c8789d5))
* **proxies:** add latency test URL and timeout configuration ([cc6efa2](https://github.com/MetaCubeX/Yacd-meta/commit/cc6efa25afc9853771565a5f68d1cc24b3a945b2))
* **proxies:** add latency test URL configuration and expected status handling ([5f99353](https://github.com/MetaCubeX/Yacd-meta/commit/5f9935312b1703561caf1187fa94abed1d046894))
* **proxies:** add provider health check timeout configuration and related translations ([2b6d587](https://github.com/MetaCubeX/Yacd-meta/commit/2b6d5875421a801ddc79568387b161b2b47424c1))
* **proxies:** animate display number in ProxyLatency component ([e0f63fc](https://github.com/MetaCubeX/Yacd-meta/commit/e0f63fc4a069a9e94689ab2347981a66a3e422c7))
* **proxies:** left-align status dots on provider cards ([477a2bc](https://github.com/MetaCubeX/Yacd-meta/commit/477a2bc5c761ef606b4889385071a37c7c02d150))
* **proxies:** optimize proxy state updates and add deep equality check ([562df68](https://github.com/MetaCubeX/Yacd-meta/commit/562df682377b00dbb6d3bc221d26963151943ea7))
* proxy group by providers ([120f06c](https://github.com/MetaCubeX/Yacd-meta/commit/120f06c59ef7e1514baa3cdf81dec79c7fa6e1e6))
* **rules:** support enabling/disabling rules and show hit/entry counts ([30dfb51](https://github.com/MetaCubeX/Yacd-meta/commit/30dfb51a61a6d6083640d411da8c63cb076318ab))
* **ui:** increase rule column width ([9e6e938](https://github.com/MetaCubeX/Yacd-meta/commit/9e6e9389616cb7d3248a24b8f6d318c4c70fa92f))
* update core channel ([ef20fd0](https://github.com/MetaCubeX/Yacd-meta/commit/ef20fd088594dd37ceccff3485b482bfef0e57ac))


### Bug Fixes

* about ([8f5f586](https://github.com/MetaCubeX/Yacd-meta/commit/8f5f586d8fce31f51aff02f3b240bd865fb4dda9))
* **connections:** sort traffic columns descending on first click ([ed9054b](https://github.com/MetaCubeX/Yacd-meta/commit/ed9054bba44a2348a91c7ae5197f2d03904a486b))
* encode rule provider name in refresh request ([a5c75e8](https://github.com/MetaCubeX/Yacd-meta/commit/a5c75e865fc751edfeb0c2c49e70bfc3b2b76503))
* encode the group name when switching a proxy ([a680bd0](https://github.com/MetaCubeX/Yacd-meta/commit/a680bd0aae625b33d8ea021ad48b7ebe6a811c03))
* encode the group name when switching a proxy ([6dbd4e5](https://github.com/MetaCubeX/Yacd-meta/commit/6dbd4e53a8f1d2c2e358db6cfe4a6e382178d56e))
* **logs:** ensure proper cleanup of log fetching on component unmount ([a7a842e](https://github.com/MetaCubeX/Yacd-meta/commit/a7a842ee25a5b7fc5aa0cd20e9a3086d747332bc))
* **logs:** improve log fetching and add log level selection ([2cf8322](https://github.com/MetaCubeX/Yacd-meta/commit/2cf83223f6d4b551998e8cd8f74fcec5e7ffd8ae))
* **proxies:** drop the stale delay after a failed latency test ([d988f95](https://github.com/MetaCubeX/Yacd-meta/commit/d988f955d484eb84690279ff71fa8ccb872a4efc))
* **proxies:** toast latency test failures instead of showing them inline ([50d11cc](https://github.com/MetaCubeX/Yacd-meta/commit/50d11cc2d14a74a38f51e009532f5b8fa085b153))
* proxy page header in mobile ([f1173a7](https://github.com/MetaCubeX/Yacd-meta/commit/f1173a77f7b20105a9677708c8201450ebef5cce))
* **router:** redirect root path to /proxies ([c8604a7](https://github.com/MetaCubeX/Yacd-meta/commit/c8604a7f794dcab8d8a7d58c3c4cbd1c4cd32755))
* **rules:** keep the update button on the header first row ([1aedb6f](https://github.com/MetaCubeX/Yacd-meta/commit/1aedb6f08666210c5e52c42ccfe080b73aac9a06))
* **sidebar:** remove min-width to fix SVG misalignment on connections ([e8ffc6f](https://github.com/MetaCubeX/Yacd-meta/commit/e8ffc6f606d383ebe9108d6f77b8bf3298d092cc))
* **sidebar:** remove min-width to fix SVG misalignment on connections page ([0323469](https://github.com/MetaCubeX/Yacd-meta/commit/0323469f85b8331b3324153d325c5046d6843208))
* **SideBar:** update root path from '/' to '/home' ([57b2b54](https://github.com/MetaCubeX/Yacd-meta/commit/57b2b5491c9c2cfb0f41606120b67cbb42350fa9))
* **styles:** ensure background color is applied to listWrapper ([1dac860](https://github.com/MetaCubeX/Yacd-meta/commit/1dac8605eccab498e717de00523fc1fec1a14c21))
* switch api ([e46df66](https://github.com/MetaCubeX/Yacd-meta/commit/e46df665bca1c8be8f8daf4cc80b58e5d1f29d1a))
* switch failures and roll back the optimistic update ([afd385f](https://github.com/MetaCubeX/Yacd-meta/commit/afd385f4828d1fed7260510815e61b632e4463e3))
* **ui:** improve log display and placeholder handling in Logs component ([f76224c](https://github.com/MetaCubeX/Yacd-meta/commit/f76224c3131616251b50f12d6697e5f2540416da))
* **ui:** prevent sidebar shrink / svg compression on connections page ([2940640](https://github.com/MetaCubeX/Yacd-meta/commit/2940640733f4becdd2f41c768957547b7260124b))
* **ui:** prevent sidebar shrink / svg compression on Connections page ([d5a1ab7](https://github.com/MetaCubeX/Yacd-meta/commit/d5a1ab7b0c1934f85352d5e7c1c18044267b238d))
* 修复图标对齐的问题 ([53caadd](https://github.com/MetaCubeX/Yacd-meta/commit/53caaddade7b16ec2ca4cc2b4a5959f3fb044009))
* 修复图标对齐的问题 ([25c34e0](https://github.com/MetaCubeX/Yacd-meta/commit/25c34e00c6036dc3a033b4704cee4b7a29c6cabc))


### Performance Improvements

* **connections,proxies:** cache per-tick formatting and cut render overhead ([3d84dd1](https://github.com/MetaCubeX/Yacd-meta/commit/3d84dd1f1703c473ebc5f05966b5067350770c8d))


### Build System

* **deps:** update depends ([edf6c5c](https://github.com/MetaCubeX/Yacd-meta/commit/edf6c5cb65cbf103fb1848760595f5c381dac723))

## [0.3.5](https://github.com/haishanh/yacd/compare/v0.3.4...v0.3.5) (2022-05-14)

Added:

- Added "Auto" theme option for theme to follow system theme preference
- Display rule payload if possible in rule column of connections table
- Allow override default backend url use environment variable with docker container
- Gzip and cache static assets in docker container
- Docker image is now published to ghcr too

Changed:

- Use Inter as app wide font

## [0.3.4](https://github.com/haishanh/yacd/compare/v0.3.3...v0.3.4) (2021-11-14)

Added:

- Add float action button to pause/start log streaming

## [0.3.3](https://github.com/haishanh/yacd/compare/v0.3.2...v0.3.3) (2021-07-19)

Added:

- Support switch theme on backend config page
- If / is api server, use it as default

## [0.3.2](https://github.com/haishanh/yacd/compare/v0.3.1...v0.3.2) (2021-06-07)

Changed:

- Change web base to './'

## [0.3.1](https://github.com/haishanh/yacd/compare/v0.3.0...v0.3.1) (2021-06-06)

Fixed:

- Fixed floating action button style

## [0.3.0](https://github.com/haishanh/yacd/compare/v0.2.15...v0.3.0) (2021-06-05)

Changed:

- Switch the build system to use Vite. This should not change much about user experience.
- Style tweaks:
  - The light theme now use a light gray background instead of a pure white
  - Statistic blocks on Overview are now styled more like a card
  - Log type badges are now ellipse shaped
  - Config fields are more compact now

Added:

- Request logs with configured log level
- Reconnect logs web socket on log level config change

## [0.2.15](https://github.com/haishanh/yacd/compare/v0.2.14...v0.2.15) (2021-02-28)

Changed:

- Display API backend info in title only when there are multiple backends
- Changed the function of floating action button from refresh to update all providers on rules page

Added:

- Action button to update all proxies providers on proxies page

## [0.2.14](https://github.com/haishanh/yacd/compare/v0.2.13...v0.2.14) (2021-01-04)

Added:

- support set default Clash API baseURL with data attribute in HTML template (see [details](https://github.com/haishanh/yacd/pull/550))
- add apple-touch-icon\*.png

Fixed:

- encode URI for latency test url

## [0.2.13](https://github.com/haishanh/yacd/compare/v0.2.12...v0.2.13) (2020-12-06)

Added:

- Initial Chinese UI language support

Fixed:

- Fix weird scroll behavior on config page

## [0.2.12](https://github.com/haishanh/yacd/compare/v0.2.11...v0.2.12) (2020-11-24)

Changed:

- Some minor accessibility improvements
- Changed log level display order to `debug warning info error silent`

## [0.2.11](https://github.com/haishanh/yacd/compare/v0.2.10...v0.2.11) (2020-11-09)

Changed:

- Display proxy type "Shadowsocks" as "SS" to make proxy item tile more compact

## [0.2.10](https://github.com/haishanh/yacd/compare/v0.2.9...v0.2.10) (2020-11-06)

Added:

- Precache assets with service worker.

## [0.2.9](https://github.com/haishanh/yacd/compare/v0.2.8...v0.2.9) (2020-11-01)

Added:

- Display current backend host in title.

Changed:

- Change backend baseURL default port to 9090.

## [0.2.8](https://github.com/haishanh/yacd/compare/v0.2.7...v0.2.8) (2020-10-12)

Added:

- Better error message for filling API base URL without providing a http protocol prefix.

## [0.2.7](https://github.com/haishanh/yacd/compare/v0.2.6...v0.2.7) (2020-09-13)

Added:

- multi backends management (see "Switch backend" action the the bottom of Config page)

## [0.2.6](https://github.com/haishanh/yacd/compare/v0.2.5...v0.2.6) (2020-09-08)

Changed:

- use API base URL instead of hostname and port for Clash backend config

## [0.2.5](https://github.com/haishanh/yacd/compare/v0.2.4...v0.2.5) (2020-08-30)

Added:

- docker image arm and arm64 support

## [0.2.4](https://github.com/haishanh/yacd/compare/v0.2.3...v0.2.4) (2020-08-11)

Fixed:

- fix cannot change mixed port

## [0.2.3](https://github.com/haishanh/yacd/compare/v0.2.2...v0.2.3) (2020-08-06)

Changed:

- use desc sort first for columns with numeric value in connections table

## [0.2.2](https://github.com/haishanh/yacd/compare/v0.2.1...v0.2.2) (2020-08-01)

Added:

- a simple about page

Removed:

- logo in sidebar

## [0.2.1](https://github.com/haishanh/yacd/compare/v0.2.0...v0.2.1) (2020-07-13)

Fixed:

- uri-encode API secret for it to be used in url safely

## [0.2.0](https://github.com/haishanh/yacd/compare/v0.1.25...v0.2.0) (2020-07-04)

Added:

- support rule provider

## [0.1.25](https://github.com/haishanh/yacd/compare/v0.1.24...v0.1.25) (2020-07-01)

Added:

- support mixed-port

## [0.1.24](https://github.com/haishanh/yacd/compare/v0.1.23...v0.1.24) (2020-06-22)

Fixed:

- fix can not type in Chinese in proxy text filter input

## [0.1.23](https://github.com/haishanh/yacd/compare/v0.1.22...v0.1.23) (2020-06-20)

Added:

- add a simple filter for proxy names

Fixed:

- fix color display for unavailable proxy item

## [0.1.22](https://github.com/haishanh/yacd/compare/v0.1.21...v0.1.22) (2020-06-18)

Fixed:

- fix mode switching
- fix broken "Hide unavailable proxies" setting

Changed:

- make proxy group lowest latency item when sorting by latency

## [0.1.21](https://github.com/haishanh/yacd/compare/v0.1.20...v0.1.21) (2020-06-17)

Fixed:

- default to big latency for items with unavailable statistics when sorting

Added:

- a toggle to close old connections automatically when switching proxy
- use special color for non-proxy summary view dot item

## [0.1.20](https://github.com/haishanh/yacd/compare/v0.1.19...v0.1.20) (2020-06-08)

Changed:

- switch to Open Sans and reduce emitted font files

## [0.1.19](https://github.com/haishanh/yacd/compare/v0.1.18...v0.1.19) (2020-06-07)

Added:

- modal prompt to close previous connections when switch proxy

Fixed:

- mode not display correctly due to clash API change

Changed:

- switch primary font family from "Merriweather Sans" to "Inter", also starting to self hosting font files

## [0.1.18](https://github.com/haishanh/yacd/compare/v0.1.17...v0.1.18) (2020-06-04)

Added:

- test latency button for each proxy group

## [0.1.17](https://github.com/haishanh/yacd/compare/v0.1.16...v0.1.17) (2020-06-03)

Changed:

- reduce connections table visual width

## [0.1.16](https://github.com/haishanh/yacd/compare/v0.1.15...v0.1.16) (2020-05-31)

Added:

- filtering connections

## [0.1.15](https://github.com/haishanh/yacd/compare/v0.1.14...v0.1.15) (2020-05-25)

Added:

- add loading status to test latency button

## [0.1.14](https://github.com/haishanh/yacd/compare/v0.1.13...v0.1.14) (2020-05-17)

Added:

- button to pause connection refresh

Fixed:

- sorting option accessibility issue due to incorrect background in dark mode

## [0.1.13](https://github.com/haishanh/yacd/compare/v0.1.12...v0.1.13) (2020-05-01)

Changed:

- use color icons in sidebar (experimental)

## [0.1.12](https://github.com/haishanh/yacd/compare/v0.1.11...v0.1.12) (2020-04-26)

Features:

- allow change proxies sorting in group

## [0.1.11](https://github.com/haishanh/yacd/compare/v0.1.10...v0.1.11) (2020-03-21)

Features:

- remembers group collapse state

## [0.1.10](https://github.com/haishanh/yacd/compare/v0.1.9...v0.1.10) (2020-03-14)

Fixes:

- fix broken allow-lan switch

Features:

- support set theme with querystring `?theme=dark` or `?theme=light`

## [0.1.9](https://github.com/haishanh/yacd/compare/v0.1.8...v0.1.9) (2020-03-01)

Fixes:

- allow request latency for non-original clash proxy types

## [0.1.8](https://github.com/haishanh/yacd/compare/v0.1.7...v0.1.8) (2020-03-01)

Features:

- support overwrite API hostname in querystring with `?hostname=`
- show current download/upload speed of connections

## [0.1.7](https://github.com/haishanh/yacd/compare/v0.1.6...v0.1.7) (2020-02-11)

Refactor:

- proxies page UI improvement

Fixes:

- use destination ip as host if host is an empty string

## [0.1.6](https://github.com/haishanh/yacd/compare/v0.1.5...v0.1.6) (2020-01-07)

Features:

- keep up to 100 closed connections in another tab

## [0.1.5](https://github.com/haishanh/yacd/compare/v0.1.4...v0.1.5) (2020-01-04)

Features:

- support change latency test url #286

## [0.1.4](https://github.com/haishanh/yacd/compare/v0.1.3...v0.1.4) (2020-01-03)

Features:

- refresh providers and proxies on window regain focus

Fixes:

- optimize test latency action when there are providers
- do not show provider section when is no provider

## [0.1.3](https://github.com/haishanh/yacd/compare/v0.1.2...v0.1.3) (2019-12-27)

Features:

- can healthcheck a provider

## [0.1.2](https://github.com/haishanh/yacd/compare/v0.1.1...v0.1.2) (2019-12-22)

Fixes:

- typo in connections table header

## [0.1.1](https://github.com/haishanh/yacd/compare/v0.1.0...v0.1.1) (2019-12-21)

Fixes:

- connections table header data miss alignment

## [0.1.0](https://github.com/haishanh/yacd/compare/v0.0.10...v0.1.0) (2019-12-20)

Features:

- support proxy provider

## [0.0.10](https://github.com/haishanh/yacd/compare/v0.0.9...v0.0.10) (2019-12-04)

Features:

- add upload/download total and connectors number on overview

## [0.0.9](https://github.com/haishanh/yacd/compare/v0.0.8...v0.0.9) (2019-12-02)

Fix:

- specify fab group z-index

## [0.0.8](https://github.com/haishanh/yacd/compare/v0.0.7...v0.0.8) (2019-12-01)

Features:

- support close all connections

## [0.0.7](https://github.com/haishanh/yacd/compare/v0.0.6...v0.0.7) (2019-11-20)

Features:

- use history latency data

## [0.0.6](https://github.com/haishanh/yacd/compare/v0.0.5...v0.0.6) (2019-11-17)

Improvements:

- improve UI for small screens
- connections: update connections table sorting indicator icon
- connections: add place holder when there is no connections data

## [0.0.5](https://github.com/haishanh/yacd/compare/v0.0.4...v0.0.5) (2019-11-09)

Features:

- connections inspection

## [0.0.4](https://github.com/haishanh/yacd/compare/v0.0.3...v0.0.4) (2019-10-14)

Features:

- probing the API server with the given url and auto fill hostname and port

Internal:

- upgrade dependencies
