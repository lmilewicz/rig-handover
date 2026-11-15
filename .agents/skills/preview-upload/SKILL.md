---
name: preview-upload
description: Save a rig page as one HTML file and put it on a public Surge link for a reviewer, then later upload it again without the lane marker over the same link. Use for a plan's "Preview for review" and "Clean up" steps (ADR 0003).
---

# preview-upload

A preview is one self-contained HTML file on a public HTTPS link we can upload over (ADR 0003).
Host: Surge (`npx surge`, no install), signed in as the human who owns the link.

## Before you start

- **Ask the human before every upload** (first one and clean-up): what page, which link, who can
  see it (anyone with the link), how to undo it (`npx surge teardown <domain>`).
- `npx -y surge whoami </dev/null` must not say "Not Authenticated". If it does, the human runs
  `npx surge login` in their own terminal (it prompts for email and password, so not through an
  agent shell). A new account must be verified from the email Surge sends, or the link may stop.
- Pick the domain once, per plan: `rig-<plan>-<first 4 chars of marker>.surge.sh`, e.g.
  `rig-digest-co7l.surge.sh`. Write it into the preview issue, so the clean-up uses the same one.

## 1. Save the page (marker on)

Previews live in `var/preview/` (git-ignored). Never in the repo, an issue or chat (ADR 0003).

```sh
PORT=8788 pnpm start &                     # .env sets LANE_MARKER
curl -sf localhost:8788/<path> -o var/preview/index.html
M=$(sed -n 's/^LANE_MARKER=//p' .env)
grep -c "$M" var/preview/index.html                     # 1: the banner
grep -Eo '<script|(src|href)="http' var/preview/index.html  # nothing: self-contained (ADR 0001)
```

Stop the server after.

## 2. Upload and check like a stranger

```sh
npx -y surge var/preview <domain> </dev/null
curl -s -o /dev/null -w '%{http_code}\n' https://<domain>/      # 200
curl -s https://<domain>/ | cmp - var/preview/index.html        # no output: same bytes
```

Send the link only after both checks pass. Surge writes `var/preview/CNAME`; leave it.

## 3. Wait for the review

The preview issue stays open until the reviewer has looked; sending the link is not the end of it.
The clean-up issue is blocked by that review. Check back on a timer; don't take the marker off early.

## 4. Clean up (marker off), same link

```sh
LANE_MARKER= PORT=8788 pnpm start &        # an empty env var wins over .env
curl -sf localhost:8788/<path> -o var/preview/index.html
grep -o '<span class="marker">[^<]*' var/preview/index.html    # "no marker set"
npx -y surge var/preview <domain> </dev/null
curl -s https://<domain>/ | grep -c "$M"                       # 0
```

Then the plan's clean-up step: move `plan.md` to `docs/plans/done/` with its issue list.
