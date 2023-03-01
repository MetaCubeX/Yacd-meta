<h1 align="center">
  <img src="https://user-images.githubusercontent.com/1166872/47954055-97e6cb80-dfc0-11e8-991f-230fd40481e5.png" alt="yacd">
</h1>

> Yet Another [Clash](https://github.com/yaling888/clash) [Dashboard](https://github.com/yaling888/clash-dashboard)

## Usage

Install [twemoji](https://github.com/mozilla/twemoji-colr/releases) to display emoji better on Windows system.


The site http://yacd.metacubex.one is served with HTTP not HTTPS is because many browsers block requests to HTTP resources from a HTTPS website. If you think it's not safe, you could just download the [zip of the gh-pages](https://github.com/yaling888/yacd/archive/gh-pages.zip), unzip and serve those static files with a web server(like Nginx).

**Supported URL query params**

| Param    | Description                                                                        |
| -------- | ---------------------------------------------------------------------------------- |
| hostname | Hostname of the clash backend API (usually the host part of `external-controller`) |
| port     | Port of the clash backend API (usually the port part of `external-controller`)     |
| secret   | Clash API secret (`secret` in your config.yaml)                                    |
| theme    | UI color scheme (dark, light, auto)                                                |

## Development

```sh
# install dependencies
# you may install pnpm with `npm i -g pnpm`
pnpm i

# start the dev server
# then go to http://127.0.0.1:3000
pnpm start


# build optimized assets
# ready to deploy assets will be in the directory `public`
pnpm build
```
