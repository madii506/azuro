# AZURO: deploy notes

Static pages plus four Vercel functions. Built and tested locally against a simulated Solana and an in-memory database. Nothing here has run on mainnet yet.

## What's here

- `index.html`: the front page at `/`. The name with ENTER (into the home page) and CONNECT (links a wallet, then into the terminal) over a moving woodblock sunrise drawn by `assets/js/gate.js`.
- `home.html`: the home page at `/home` (woodblock hero, how it works, floor math, rules, wall, pool, FAQ). Visitors who come through the gate skip its shoji intro.
- `app.html`: the terminal (market, launch, coin pages, pool, wall, ledger, docs, search, wallet).
- `404.html`: the "this stone was never set" page.
- `api/launch.js`: builds the backed launch transaction, checks the rules, has the pool sign last, and sends it.
- `api/data.js`: the registry joined with live bonding curves, holders, the pool, ledgers and charts.
- `api/trade.js`: buys and sells for the user's own wallet to sign.
- `api/media.js`: coin images and metadata, served from the site.
- `assets/js/config.js`: set `ca` and `x` here when $AZURO exists. Its block on the home page stays hidden until then.

## Environment variables (Vercel → Project → Settings → Environment Variables)

| Name | Required | What it is |
|---|---|---|
| `PLATFORM_KEY` | yes | The pool wallet's secret key (base58 or JSON array). Make a brand-new wallet just for this. Never reuse a personal wallet. Every backing buy is paid from it. |
| `DATABASE_URL` | yes | Postgres connection string. Neon from the Vercel Marketplace works; tables are created on first use. |
| `RPC_URL` | strongly recommended | A paid Solana RPC (Helius or similar). Public RPCs rate-limit and drop sends. |
| `SITE_URL` | yes | The final domain, e.g. `https://azuro-iota.vercel.app`. Each coin's metadata link points here forever, so set it before the first launch. |
| `BACK_SOL` | no | Size of each backing buy. Default `0.5`. |
| `DEV_MAX_SOL` | no | Creator buy cap. Default `0.5`. |
| `BACKED_PER_DAY` | no | Backed launches per 24 h across the site. Default `40`. |
| `LAUNCHES_PER_WALLET_PER_DAY` | no | Default `2`. |
| `POOL_RESERVE_SOL` | no | SOL always left in the pool for fees and rent. Default `0.03`. |
| `PRIORITY_MICRO_LAMPORTS` | no | Priority fee. Default `150000`. |
| `ALT_ADDRESS` | no | Use an existing address lookup table. Leave empty: the pool creates its own on the first launch (about 0.003 SOL). |
| `JITO_URL`, `JITO_TIP_SOL` | no | Block engine used when a creator buy needs a second transaction. Defaults: the public Jito endpoint and `0.0001`. |

## Steps

1. Push this folder to a new GitHub repo. `node_modules` is ignored.
2. Import the repo in Vercel. No build command is needed; Node 22.
3. Add the database (Neon) and the variables above, then redeploy.
4. Change `https://azuro-iota.vercel.app` in the `og:image` tags of `index.html`, `home.html` and `app.html` if the domain is different.
5. Fund the pool wallet. Each backed launch costs the pool 1.5 SOL plus a few thousandths for fees.
6. Do one launch yourself with a small creator buy, and check it on Solscan and pump.fun before announcing.

## Things to decide before going public

- **Budget.** At the defaults the pool can spend up to 60 SOL a day (40 launches × 1.5 SOL). The backing can't be pulled back out by anyone, since the bought tokens are burned, but someone could use many wallets to use up the daily backing. Starting with `BACKED_PER_DAY` around 10 is safer.
- **The site's numbers** come from the chain and the registry only. Until the pool and database are connected, the pages say so ("not connected", "the registry is offline") instead of showing figures.
