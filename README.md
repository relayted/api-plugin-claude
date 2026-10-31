# relayted-api: Claude plugin

![relayted API for Claude](assets/banner.png)

Use the [relayted API](https://api.relayted.de) straight from Claude Code:

- **shots**: screenshots of any public URL in real browsers (Chrome, Edge, Firefox, WebKit, Brave, Opera, mobile), several viewports, light and dark mode
- **websitepro**: a web page as Markdown, text, metadata, HTML or PDF
- **labs**: Nostr relay tests with a pass/fail report

Prepaid, per delivered result, paid with Bitcoin Lightning. No account, no subscription. Failed results are refunded automatically.

## Quick start (5 minutes, once)

This plugin is for **Claude Code** (terminal or desktop app with Code). It is not available in the normal Claude chat.

1. **Key:** open <https://api.relayted.de/account>, top up (1 EUR is enough to try it) and create an API key.
2. **Save the key** in the environment variable `RELAYTED_API_KEY`. Do this in PowerShell or a normal terminal, not inside Claude Code:
   - Windows: `setx RELAYTED_API_KEY "<key>"`
   - macOS/Linux: add `export RELAYTED_API_KEY="<key>"` to your shell profile
3. **Restart:** close all terminal windows, open a new one and start `claude`. A running session does not see the new variable.
4. **Install** (inside Claude Code):
   ```
   /plugin marketplace add relayted/api-plugin-claude
   /plugin install relayted-api@relayted
   ```
   Then run `/reload-plugins` or restart Claude Code.
5. **Test:** ask "What is my relayted balance?" It is free and shows whether the key works.

Requires Node 18 or newer. The key is only read from the environment and never printed.

## Use

Just ask Claude, for example:

- "Take a screenshot of example.com in Chrome and Firefox, light and dark."
- "Get https://example.com/docs as Markdown."
- "Test the Nostr relay wss://relay.example.com."
- "What is my relayted balance?"

## Troubleshooting

| Message / symptom | Fix |
|---|---|
| `no_key` or "RELAYTED_API_KEY is not set" | Step 2 and 3: set the variable, then open a **new** terminal and start `claude` there. Check with `echo $env:RELAYTED_API_KEY` (PowerShell) or `echo $RELAYTED_API_KEY`. |
| Error mentioning the key, `http_401` or `http_403` | The key is wrong or was replaced. Create a new key on the account page and set it again. |
| `insufficient_funds` | Top up: ask "Top up 1 EUR of relayted balance" and pay the Lightning invoice with your wallet. |
| Skills are not found | Run `/plugin` and check that `relayted-api` is enabled, then `/reload-plugins`. |
| `node` not found | Install Node 18 or newer. |
| `network` | No internet access or api.relayted.de is not reachable; try again. |

## Cost protection

Every result costs real money, so the plugin has two brakes:

1. The skills tell Claude to get the free quote first, name the price and never start batches on its own.
2. The helper script enforces a limit: a job above 0.25 EUR is refused until you confirm. Change the limit with the environment variable `RELAYTED_MAX_EUR`.

## Files

```
.claude-plugin/   plugin and marketplace manifest
skills/           setup, shots, websitepro, labs
scripts/relayted.mjs   the helper (no dependencies)
```

API reference: <https://api.relayted.de/docs> · OpenAPI: <https://api.relayted.de/openapi.json> · MIT License
