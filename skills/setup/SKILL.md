---
name: setup
description: Set up and manage the relayted API - create an API key, check the balance, top up with Lightning, see prices. Use when the user wants to start with relayted, asks about relayted prices or balance, or when another relayted skill reports a missing key or insufficient funds.
---

# relayted API: setup, balance, top-up

The relayted API sells screenshots (shots), web page conversion (websitepro) and Nostr relay tests (labs). It is prepaid: the user tops up a balance in Payloads (10,000 Payloads = 1 EUR) with Bitcoin Lightning and pays per delivered result. No account, no subscription.

All calls go through the helper `${CLAUDE_PLUGIN_ROOT}/scripts/relayted.mjs` (Node 18+). It reads the key from the environment variable `RELAYTED_API_KEY` and prints JSON. Never print, log or ask for the key in the chat.

## First-time setup (the user does this once, in the browser)

1. Open https://api.relayted.de/account and top up the balance (1 EUR is enough to try it).
2. Click to create an API key. It is shown once.
3. Store it as an environment variable, then restart Claude Code:
   - Windows (PowerShell): `setx RELAYTED_API_KEY "<key>"`
   - macOS/Linux: add `export RELAYTED_API_KEY="<key>"` to the shell profile.

No API call creates keys; that is intentional. If the user pastes a key into the chat, tell them it is now in the conversation and they should replace it on the account page (the old one stops working immediately).

## Commands

- Prices (no key needed): `node "${CLAUDE_PLUGIN_ROOT}/scripts/relayted.mjs" pricing`
- Balance: `node "${CLAUDE_PLUGIN_ROOT}/scripts/relayted.mjs" balance`
- Top-up invoice: `node "${CLAUDE_PLUGIN_ROOT}/scripts/relayted.mjs" topup 5` returns a Lightning invoice (`bolt11`). Show it to the user so they can pay it with their wallet. Never pay anything yourself. Then `topup-status <id>` until `status` is `paid`.

## Rules

- Tell the user before creating a top-up invoice and name the amount.
- A lost key cannot be recovered and the balance is tied to it. Say so when setting up.
- Errors come as `{"ok":false,"error":{"code","message"}}`. `no_key` means the variable is missing; `insufficient_funds` means top up.
