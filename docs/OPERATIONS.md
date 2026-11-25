# Operations guide

Settings and routines for running the ZIOK server in production (Coolify or any Docker host).

## Environment variables

| Variable | Purpose | Default |
|---|---|---|
| `ZIOK_PUBLIC_ORIGIN` | Public HTTPS origin, for example `https://ziok.org` | required |
| `ZIOK_USERS_JSON` | Administrator and editor accounts with password hashes | required |
| `ZIOK_STATE_FILE` | Content, draft and audit history file | `/app/var/content.json` in Docker |
| `ZIOK_TRUSTED_PROXIES` | Narrow address or CIDR range of the reverse proxy, measured with `/api/admin/network` (see below) | none |
| `ZIOK_HSTS_MAX_AGE` | `Strict-Transport-Security` lifetime in seconds; `0` disables | `604800` (one week) |
| `ZIOK_HSTS_INCLUDE_SUBDOMAINS` | Set `true` to add `includeSubDomains` | off |
| `ZIOK_BACKUP_KEEP` | Number of backups the backup command keeps | `30` |
| `ZIOK_BACKUP_DIR` | Backup folder | `backups/` next to the state file |

## Login protection

Two limits apply to failed sign-ins, both for 15 minutes:

- **Per client address:** 20 attempts. A successful sign-in clears the count.
- **Per account:** 10 failures, counted across all addresses and for any submitted name whether or not it exists, so a lock reveals nothing about which accounts are real. While an account is locked, even the correct password is refused until the window ends, and the server logs a line saying which account locked. Already signed-in sessions are unaffected.

The account lock stops a distributed password-guessing attack, at a cost: someone who knows a username can keep it locked by repeating failures. If you see lock messages you did not cause, sign in again after the window or check the logs; real administrators are never locked out permanently.

### Trusted proxy (required behind Coolify)

Behind a reverse proxy the connecting address is the proxy itself, so without configuration every visitor shares one per-address limit. `ZIOK_TRUSTED_PROXIES` tells the server which addresses are the proxy, so it may read the visitor's address from `X-Forwarded-For`. The header is read from the right, skipping other trusted proxies, so a client cannot choose its own address, and blanket values such as `0.0.0.0/0` are refused at startup.

Do not guess the value. Measure it, then trust only that:

1. Deploy with `ZIOK_TRUSTED_PROXIES` **unset**. The server logs a warning at startup; behaviour is unchanged.
2. Sign in to `/admin` as an administrator, then open `https://ziok.org/api/admin/network` in the same browser. It returns JSON such as:
   ```json
   {"connectingAddress":"10.0.1.4","clientAddress":"10.0.1.4","forwardedFor":"203.0.113.7","trustedProxiesConfigured":false}
   ```
   `connectingAddress` is the proxy as the app sees it. `forwardedFor` should end with your own public address (compare with any "what is my IP" site). If `forwardedFor` is `null`, the proxy is not forwarding the header and you must not enable trust.
3. Set `ZIOK_TRUSTED_PROXIES` to the narrowest value that covers `connectingAddress`. A single address is tightest, but Docker may give the proxy a new address after a redeploy, so a small subnet is usually needed. Find the subnet of the network shared by the proxy and the app (in Coolify's server terminal: `docker network inspect <network>`) and use that subnet, not a large private range such as `10.0.0.0/8` or `172.16.0.0/12`. Anything else that can reach the app from inside a trusted range could forge the header.
4. Redeploy and open `/api/admin/network` again. `trustedProxiesConfigured` must be `true` and `clientAddress` must now equal your public address. If it does not, remove the variable (this returns to the old behaviour) and recheck.
5. If a CDN such as Cloudflare sits in front of the proxy, `forwardedFor` will list the CDN last, and `clientAddress` will then be the CDN. Add the CDN's published ranges to `ZIOK_TRUSTED_PROXIES` as well, and repeat step 4.

This procedure could not be run against the live Coolify server when the feature was written, so complete steps 2 to 4 after deploying. Coolify's default proxy (Traefik) normally sets `X-Forwarded-For`; verify rather than assume.

## HSTS

The server sends `Strict-Transport-Security` in production (not in local development mode). The default of one week is deliberately short. After confirming that `ziok.org` and any subdomain you want covered work over HTTPS, raise `ZIOK_HSTS_MAX_AGE` to `31536000` (one year). Set `ZIOK_HSTS_INCLUDE_SUBDOMAINS=true` only when every subdomain serves HTTPS. Preloading is intentionally not enabled because it is hard to undo. The `_headers` file carries the same header for static hosts.

## Backups

All editable content, drafts and the audit trail live in one file, `ZIOK_STATE_FILE`. Backups protect against bad edits, corruption and server loss, so keep copies in more than one place.

### 1. Scheduled copy on the server

```sh
npm run backup
# or inside the container
node server/backup.cjs
```

Each run validates the file with the same content checks the server applies at startup (not just its shape), writes `content-<UTC time>-r<revision>.json` with private permissions, skips the run when nothing changed since the newest backup, and prunes to the newest `ZIOK_BACKUP_KEEP` files. An invalid file or failed run never deletes existing backups. In Coolify, add a Scheduled Task to the application that runs `node server/backup.cjs` daily, in the application container.

### 2. Off-server copy (required)

Copies on the same VPS are lost with the VPS. Keep at least one copy elsewhere:

- **Manual download:** sign in to `/admin` as an administrator and use **Download backup copy** (bottom of the page). It saves the current state as `ziok-content-r<revision>-<date>.json` on your computer. Do this after significant publishing sessions and at least weekly. Store it in cloud storage or on a drive that is not this server.
- **Automatic pull:** from a second machine that is not the VPS, copy the `backups/` folder on a schedule with `rsync` or `scp` over SSH, or with `rclone` to object storage. Coolify shows where the application's persistent volume lives on the host. Pulling (rather than the server pushing to a remote) keeps remote credentials off the web server.

Treat backup files as confidential: they contain drafts and administrator names in the audit history.

### 3. Check before you rely on a copy

```sh
node server/backup.cjs --verify path/to/backup.json
```

This runs the same validation and prints the revision and audit count. Run it on an off-server copy now and then.

### Restore

1. Run `--verify` on the file you intend to restore.
2. Stop the application.
3. Keep a copy of the current state file, then copy the chosen backup over it.
4. Start the application and check `/admin` and the public pages.

## Directory listings: corrections and removal

The business, church and village directories show names, phone numbers and addresses. Each directory page tells visitors to write to `admin@ziok.org` to add, update, correct or remove a listing.

Suggested handling:

1. Reply within a few days and confirm the request came from the listed person or business, for example by replying from the contact details already listed.
2. Make the change in the administrator portal as a draft, then publish. The audit history records who changed what.
3. For removal requests, remove the entry and publish promptly. Remember that earlier copies remain in backups until they rotate out; they are not served publicly.
4. Record the request date and outcome in an internal log.
5. Before adding a business, get the owner's agreement to be listed.

## Custom 404 page

`404.html` (with the automatically updating copyright year) is served with status 404 for unknown pages requested by a browser; API paths and non-browser requests keep the JSON error. It uses root-absolute links because it is shown at any URL depth. On static hosts such as Cloudflare Pages, `404.html` is picked up automatically.

## Contact email setting

Administrators can change the public contact address under **Contact** in the portal. It is used in the footer, the directory notices and the news and event pages, and applies when you publish. Older saved content without the setting falls back to `admin@ziok.org`. The address inside the home page's structured data (for search engines) is static, so update `index.html` too if the address ever changes permanently.
## Maintenance

- **Node version**: the Dockerfile and CI both use Node 24 (`.nvmrc`). `engines` keeps 22 as the minimum. To move to a newer Node, change `.nvmrc` and the Dockerfile `FROM` line together, then let CI pass before deploying.
- **Dependabot** (`.github/dependabot.yml`) opens pull requests for npm (weekly, max 3), GitHub Actions and the Docker base image (monthly). The only npm packages are test tools (Playwright, axe-core); the running site has no dependencies. Review and merge them like any other PR: CI must pass, and nothing deploys until you redeploy in Coolify (or Coolify's webhook fires on merge to `main`).
- **Before every release**: run `python -m unittest discover -s tests`, `npm run test:server` and `npm run test:browser`, take a backup (`npm run backup`), then deploy.

## "Last updated" on directory pages

The business, church and village pages show "Last updated <date>" once something has been published in the administrator portal. The date is the day of the most recent **publish** (drafts and saves do not count), the same date the sitemap uses. Static hosts without the Node server show no date. The label is English only until a Zomi translation is supplied in `locale.js`.

## Running behind Cloudflare

If the domain's DNS record is **Proxied** (orange cloud) in Cloudflare, visitors connect to Cloudflare, not to the server. This also lets people on company networks that block hosting addresses reach the site.

1. In Cloudflare: **SSL/TLS → Overview → Full (strict)**. (Flexible causes redirect loops with Coolify's HTTPS redirect.)
2. In Coolify, add `ZIOK_CLOUDFLARE=true` next to `ZIOK_TRUSTED_PROXIES` (the Docker network, as before) and redeploy. The visitor's address is then taken from Cloudflare's `CF-Connecting-IP`, and believed only when the connection really came from a Cloudflare address (`server/proxy.cjs` lists the ranges, checked 2026-11-24; compare with https://www.cloudflare.com/ips-v4 now and then).
3. Verify: sign in as admin and open `/api/admin/network`. `clientAddress` should be your own public address and `cloudflare` should be `true`. If `clientAddress` is a Cloudflare address, login limits are shared by all visitors: check steps 1–2.
4. Leave `cloud.siamsil.org` (the Coolify panel) **DNS only** (grey cloud) unless you want it proxied too.
