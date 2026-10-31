---
name: shots
description: Take screenshots of a public URL in real browsers (Chrome, Edge, Firefox, WebKit/Safari, Brave, Opera, mobile profiles) via the relayted API, in several viewports and light/dark mode. Use when the user wants screenshots of a website, a cross-browser or responsive check, or a dark/light comparison. Costs money per screenshot.
---

# relayted shots: cross-browser screenshots

Helper: `node "${CLAUDE_PLUGIN_ROOT}/scripts/relayted.mjs"`. Needs `RELAYTED_API_KEY` (see the `setup` skill). Only public URLs work.

## Procedure

1. Look up the current browsers once (free, no key): `... services shots`. Use only ids from that list.
2. Build the request body. One screenshot is produced per browser version x viewport x scheme, so keep the matrix small unless the user asks for more.

   Fields: `url` (required), `browsers` (required; `"chrome"` = newest, or `{"id":"firefox","versions":["133"]}`), `viewports` (`"1920x1080"`, presets `fhd qhd laptop hd tablet phone`, max 3, desktop only), `schemes` (`"light"`, `"dark"`), `options` (`fullPage`, `retina`, `hideCookieBanner`, `delay` 0/2/5).
3. Get the price first: `... quote shots '<json>'`. It is free. Tell the user how many screenshots it is and what they cost.
4. Run it: `... run shots '<json>' --out <folder>`. The helper quotes again, refuses above the cost limit (exit code 3, `needsConfirmation`), downloads the PNGs and reports charged/refunded and the new balance.
5. Tell the user where the files are. View them with the Read tool if they ask for a visual check.

## Cost rules (important)

- The user pays real money per screenshot. Never run a job without having named the price, unless the user explicitly said to go ahead for that exact request.
- If `run` answers `needsConfirmation`, show the price and ask. Only then repeat with `--yes`.
- Never loop over many URLs or browsers on your own. For more than one job, give the total price and ask once.
- `insufficient_funds`: point to the `setup` skill (top-up). Do not retry.
- Failed screenshots are refunded automatically; say so if `problems` is not empty.

Results are deleted after 24 hours, so download them in the same step.
