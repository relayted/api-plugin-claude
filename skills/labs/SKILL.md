---
name: labs
description: Test a Nostr relay (connectivity, TLS, NIP-11, publish/query, latency, stability, NIP-01 conformance) via the relayted API and get a pass/fail report. Use when the user wants to check, debug or compare a Nostr relay. Costs money per test.
---

# relayted labs: Nostr relay tests

Helper: `node "${CLAUDE_PLUGIN_ROOT}/scripts/relayted.mjs"`. Needs `RELAYTED_API_KEY` (see the `setup` skill).

## Procedure

1. Body: `{"relay": "wss://relay.example.com", "modules": ["quick"]}`.
   - `quick`: connectivity, TLS, NIP-11, publish/query, latency, stability.
   - `conformance`: NIP-01, all filters, event semantics, limits.
   - Optional `checks`: single check ids (list with `... services labs`, field `selectable`). Some need a test dataset, which adds a one-time fee on the wallet's first such job. The quote shows it.
2. Price: `... quote labs '<json>'` (free). Name the price to the user.
3. Run: `... run labs '<json>' --out <folder>`. Each result is a JSON report (`relaylab.report/1`) with per-check status `pass`, `fail`, `warn`, `skip`, `info`.
4. Read the report and explain it: list failures and warnings first, say what each means for the relay operator, then the passes in one line.

## Cost rules (important)

- Real money per test. Name the price before running unless the user already approved that exact request.
- `needsConfirmation` from `run`: ask the user, then repeat with `--yes`.
- Do not test many relays in one go without giving the total and asking once.
- `relay_busy` (429): a relay can be tested only a few times per hour. Wait; nothing was charged.
- `insufficient_funds`: see the `setup` skill.

Reports are kept 30 days.
