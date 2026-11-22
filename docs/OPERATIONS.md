# Operations guide

Settings and routines for running the ZIOK server in production (Coolify or any Docker host).

## Environment variables

| Variable | Purpose | Default |
|---|---|---|
| `ZIOK_PUBLIC_ORIGIN` | Public HTTPS origin, for example `https://ziok.org` | required |
| `ZIOK_USERS_JSON` | Administrator and editor accounts with password hashes | required |
| `ZIOK_STATE_FILE` | Content, draft and audit history file | `/app/var/content.json` in Docker |
| `ZIOK_TRUSTED_PROXIES` | Reverse-proxy addresses or CIDR ranges allowed to supply `X-Forwarded-For` | none |
| `ZIOK_HSTS_MAX_AGE` | `Strict-Transport-Security` lifetime in seconds; `0` disables | `604800` (one week) |
| `ZIOK_HSTS_INCLUDE_SUBDOMAINS` | Set `true` to add `includeSubDomains` | off |
| `ZIOK_BACKUP_KEEP` | Number of backups the backup command keeps | `30` |
| `ZIOK_BACKUP_DIR` | Backup folder | `backups/` next to the state file |

## Login protection behind a proxy

Failed sign-ins are limited per client address (20 attempts per 15 minutes). Behind Coolify's proxy the connecting address is the proxy itself, so without configuration every visitor shares one limit and a handful of failed attempts could lock administrators out.

Set `ZIOK_TRUSTED_PROXIES` to the address range the proxy connects from, for example the Docker network the app and proxy share:

```
ZIOK_TRUSTED_PROXIES=172.16.0.0/12
```

- Only connections from these addresses may supply `X-Forwarded-For`. The header is read from the right, skipping other trusted proxies, so a client cannot choose its own address.
- Keep the range as narrow as you can. Blanket values such as `0.0.0.0/0` are refused at startup.
- If a CDN such as Cloudflare sits in front of the proxy, also list the CDN's published ranges. Otherwise all visitors appear as the CDN.
- The server logs a warning at startup in production when the variable is empty.
- To find the proxy's address, check the app container's network in Coolify or run `docker network inspect` on the host, then use that subnet.

## HSTS

The server sends `Strict-Transport-Security` in production (not in local development mode). The default of one week is deliberately short. After confirming that `ziok.org` and any subdomain you want covered work over HTTPS, raise `ZIOK_HSTS_MAX_AGE` to `31536000` (one year). Set `ZIOK_HSTS_INCLUDE_SUBDOMAINS=true` only when every subdomain serves HTTPS. Preloading is intentionally not enabled because it is hard to undo. The `_headers` file carries the same header for static hosts.

## Backups

All editable content, drafts and the audit trail live in one file, `ZIOK_STATE_FILE`. Create a backup with:

```sh
npm run backup
# or inside the container
node server/backup.cjs
```

Each run validates the file, writes `content-<UTC time>-r<revision>.json` with private permissions, skips the run when nothing changed since the newest backup, and prunes to the newest `ZIOK_BACKUP_KEEP` files. A failed or invalid run never deletes existing backups.

In Coolify, add a Scheduled Task to the application that runs `node server/backup.cjs` daily, in the application container.

These backups sit on the same volume as the live file. They protect against bad edits and file corruption, not against losing the server or volume. Also copy the backup folder somewhere else on a schedule (another server, object storage, or a periodic download to an administrator's computer), and restore-test it occasionally.

### Restore

1. Stop the application.
2. Copy the chosen backup over the state file (keep a copy of the current file first).
3. Start the application and check `/admin`.

## Directory listings: corrections and removal

The business, church and village directories show names, phone numbers and addresses. Each directory page tells visitors to write to `admin@ziok.org` to add, update, correct or remove a listing.

Suggested handling:

1. Reply within a few days and confirm the request came from the listed person or business, for example by replying from the contact details already listed.
2. Make the change in the administrator portal as a draft, then publish. The audit history records who changed what.
3. For removal requests, remove the entry and publish promptly. Remember that earlier copies remain in backups until they rotate out; they are not served publicly.
4. Record the request date and outcome in an internal log.
5. Before adding a business, get the owner's agreement to be listed.

## Custom 404 page

`404.html` is served with status 404 for unknown pages requested by a browser; API paths and non-browser requests keep the JSON error. It uses root-absolute links because it is shown at any URL depth. On static hosts such as Cloudflare Pages, `404.html` is picked up automatically.
