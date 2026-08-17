# DeepCost

> 2026-08-17 by Harmen (Ops)
> Repository: https://github.com/whjdygyh/DeepCost

**DeepCost** shows a compact readout in the **DeepSeek Harness (DSH)** session header:

- **Output token usage** (cumulative `outputTokens` of the current session, pushed live)
- **DeepSeek account balance** (¥, refreshed every 60 seconds)
- **Recharge link** (one click to `https://platform.deepseek.com/usage`)

![screenshot](docs/screenshot.png)

The readout looks like:

```
出 4.5K · 余额 ¥29.54 · 充值
```

## Features

| Data | Source | Update |
|---|---|---|
| Output tokens | DSH host `tokenUsage` projection (cumulative `outputTokens`) | Pushed live on every reply, no polling |
| Account balance | DeepSeek official `GET /user/balance` | Auto-refresh every 60 seconds |
| Recharge link | `https://platform.deepseek.com/usage` | Static |

## Requirements

- [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) (`@deepseek-ai/dsh`, verified on `0.1.0-rc.6`)
- A configured DeepSeek API key (see below)

## Configure API Key (reuses the official entry)

DeepCost **never stores your key** — it reuses the official DeepSeek credential, so there is zero extra setup:

1. Open the DSH web app: **Settings → Models → DeepSeek**.
2. Enter your DeepSeek API key (stored as the `DEEPSEEK_API_KEY` credential in `$DSH_HOME/.credentials.yaml`).
3. DeepCost reads that credential to query the balance. Without it, the balance shows `—` while token usage still works.

> DeepCost also follows a custom credential ref: if your `llm-deepseek` config overrides `apiKeyEnv`, the plugin honors it automatically.

## Quick Start (currently recommended: dynamic plugin)

DSH `0.1.0-rc.6` has not yet published the third-party plugin build/publish toolchain, so the most direct way to run today is the **DSH dynamic plugin** (no build, source-as-is):

1. Use a DSH session that supports dynamic plugins (the `cordis` preset).
2. Define the plugin with `cordis_define`:
   - `code.host` = the `apply` body of [`src/index.js`](./src/index.js) (drop `export default`, wrap in `return { … }`)
   - `code.client` = the same for [`src/client.js`](./src/client.js)
3. Activate with `cordis_run` and approve it in the UI.

Both source files are **plain JavaScript, no imports, no build step**.

## Formalization (once the toolchain ships)

The project is already laid out as a DSH plugin package, ready to publish to npm and install with `dsh plugin add`:

- `package.json`: `main` points to the Host half (`src/index.js`), `exports["./client"]` to the Client half (`src/client.js`), and `dsh.client` declares `platform: "web"`.
- After install, declare the row in your profile's `cordis.patch.yml`:

```yaml
- id: deepcost
  name: 'deepcost'
```

> Note: in the formal package form, `harness.handle` (dynamic-plugin only) must be replaced with a Typert `@Remote`, and the client bundle must be built into the `__ModuleLoader__.load` format with DSH's `tsdown` toolchain. Both are DSH-internal mechanisms that will switch over seamlessly once they ship publicly.

## How It Works

- **Usage**: the DSH host owns the service-level `tokenMeter` and the `tokenUsage` session projection; the client subscribes directly through the standard Slot prop `useProjection('tokenUsage')` — zero custom Host code.
- **Balance**: the client calls the Host over a package-private RPC; the Host resolves the key with `credentials.resolve('DEEPSEEK_API_KEY')` (used only in the host process, never sent to the browser), then queries the official `/user/balance` with `curl` and returns the CNY balance from `balance_infos`.
- **Sandbox**: the balance query passes `sandboxPolicy: { mode: 'danger-full-access' }` to `shell.resolve`. DSH's sandbox only constrains file effects, not network; full-access mode merely avoids `curl` being confined under `workspace-write` (read-only outbound, no file writes).

## Directory Layout

```
├── package.json      # DSH plugin package declaration (exports + dsh.client)
├── LICENSE           # MIT
├── README.md         # 中文文档
├── README.en.md      # English docs
├── CHANGELOG.md
├── docs
│   └── screenshot.png
└── src
    ├── index.js      # Host plugin: balance query RPC
    └── client.js     # Client plugin: header readout UI
```

## License

[MIT](./LICENSE) © 2026 苏明阳 (Andy)
