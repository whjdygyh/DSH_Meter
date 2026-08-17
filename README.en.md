# DeepCost

> 2026-08-17 by Harmen (Ops)
> Repository: https://github.com/whjdygyh/DeepCost
> Version: v1.1.0

**DeepCost** shows a compact readout in the **DeepSeek Harness (DSH)** session header:

- **Peak / valley pricing** (Beijing time 9:00-12:00 & 14:00-18:00 = peak, otherwise valley)
- **Output token usage** (cumulative `outputTokens` of the current session, pushed live)
- **DeepSeek account balance** (¥, refreshed every 60 seconds; the balance itself is the recharge link)
- **Task-based model recommendation** (distills the recent conversation and recommends flash / pro with one-click switching)
- **Gemini monthly usage** (cumulative output tokens of the natural month, reset on the 1st)

![screenshot](docs/screenshot.png)

The readout looks like:

```
谷 · 出 4.5K · 余额 ¥95.29 · 推荐 v4-flash
```

## Features

| Data | Source | Update |
|---|---|---|
| Peak / valley | DeepSeek official pricing (peak = double, valley = half) | Refreshed every minute; click for the official pricing doc |
| Output tokens | DSH host `tokenUsage` projection (cumulative `outputTokens`) | Pushed live on every reply, no polling |
| Account balance | DeepSeek official `GET /user/balance` | Auto-refresh every 60 seconds; click for the recharge page |
| Model recommendation | Latest 6 messages distilled; flash / pro cost comparison | Auto-refresh after new messages; click to switch |
| Gemini monthly | Host incremental fold of this month's Gemini output tokens | Every 5 minutes; reset on the 1st of each month |

## Requirements

- [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) (`@deepseek-ai/dsh`, verified on `0.1.0-rc.6`)
- A configured DeepSeek API key (see below)

## Supported Models

| Provider | Models | Readout |
|---|---|---|
| DeepSeek | `deepseek-v4-flash` / `deepseek-v4-pro` | Peak/valley, output tokens, balance, recommendation, one-click switch |
| Google Gemini | `gemini-2.5-flash` and other Gemini models | Monthly usage (cumulative output tokens of the natural month) |

- **DeepSeek sessions**: full feature set (peak/valley pricing, token usage, balance, task-based recommendation, one-click switch).
- **Gemini sessions**: show the month-to-date cumulative output tokens, reset on the 1st; other cells hide as appropriate.
- **Other providers**: generic info only (peak/valley, token usage) — nothing breaks.

### i18n

The readout **follows the DSH UI language automatically**: English UI shows `Peak / Valley · Out 4.5K · Balance ¥95.29 · Rec v4-flash`, Chinese UI shows Chinese. The recommendation task and reason are also generated in the UI language. Currently supported: **Chinese (zh-CN) and English (en-US)**.

### Planned Models

- **More DeepSeek models**: tracked as official releases ship (e.g. new v4 series), automatically adapting peak/valley pricing and recommendation.
- **OpenAI / Claude and other mainstream providers**: monthly usage statistics similar to Gemini are planned (per each provider's API usage semantics).
- Provider detection is generic: adding a provider only needs Host-side logic for its usage/balance data — no UI changes.

## Cost Considerations

The **base features of the readout cost nothing extra**:

- **Token usage, peak/valley, balance, Gemini monthly**: all come from local DSH data or the free DeepSeek balance API — no model compute is consumed.
- **Model recommendation** (the only place a model is called): once per new message in a session, a `deepseek-v4-flash` call distills the latest 6 messages and suggests a model. Each call consumes roughly a few hundred tokens (about 1K input, under 100 output), which costs on the order of **¥0.001 per call** at v4-flash rates — and it only runs in DeepSeek sessions. With no clear task it shows `—` and makes no call.

## Configure API Key (reuses the official entry)

DeepCost **never stores your key** — it reuses the official DeepSeek credential, so there is zero extra setup:

1. Open the DSH web app: **Settings → Models → DeepSeek**.
2. Enter your DeepSeek API key (stored as the `DEEPSEEK_API_KEY` credential in `$DSH_HOME/.credentials.yaml`).
3. DeepCost reads that credential to query the balance. Without it, the balance shows `—` while token usage still works.

> DeepCost also follows a custom credential ref: if your `llm-deepseek` config overrides `apiKeyEnv`, the plugin honors it automatically.

## Install (formal plugin)

DeepCost is built as a formal DSH plugin package (Host + Client halves, loaded at DSH startup, shown in Settings → Plugins):

1. Copy the package from `dist/` into your profile's dependencies:

   ```powershell
   Copy-Item dist\* "$env:USERPROFILE\.dsh\profiles\node_modules\deepcost\" -Recurse -Force
   ```

2. Declare the plugin in your profile composition (e.g. `web/cordis.patch.yml`):

   ```yaml
   - insert:
       - id: deepcost
         name: 'deepcost'
   ```

3. Restart DSH and confirm deepcost is loaded under **Settings → Plugins**.

### Alternative: dynamic plugin (no build, source-as-is)

DSH `0.1.0-rc.6` has not yet published the third-party plugin build/publish toolchain, so you can also run it as a **DSH dynamic plugin** (a `cordis` preset session):

1. Define the plugin with `cordis_define`: `code.host` = the `apply` body of [`src/index.js`](./src/index.js) (drop `export default`, wrap in `return { … }`); `code.client` = the same for [`src/client.js`](./src/client.js).
2. Activate with `cordis_run` and approve it in the UI.

Both source files are **plain JavaScript, no imports, no build step**.

## How It Works

- **Usage**: the DSH host owns the service-level `tokenMeter` and the `tokenUsage` session projection; the client subscribes directly through the standard Slot prop `useProjection('tokenUsage')` — zero custom Host code.
- **Balance / recommendation / Gemini**: the client calls the Host over Typert Remote (`remote.$mount` + `typertGateway` RPC); the Host exposes 5 methods: `balance` / `sessionModels` / `selectModel` / `geminiUsage` / `recommend`.
- **Credentials**: the Host resolves the key with `credentials.resolve('DEEPSEEK_API_KEY')` (used only in the host process, never sent to the browser), then queries the official endpoints with `curl`.
- **Sandbox**: the `curl` queries pass `sandboxPolicy: { mode: 'danger-full-access' }` to `shell.resolve`. DSH's sandbox only constrains file effects, not network; full-access mode merely avoids `curl` being confined under `workspace-write` (read-only outbound, no file writes).

## Directory Layout

```
├── package.json      # DSH plugin package declaration (exports + dsh.client)
├── LICENSE           # MIT
├── README.md         # 中文文档
├── README.en.md      # English docs
├── CHANGELOG.md
├── docs
│   └── screenshot.png
├── src               # dynamic-plugin source (no build)
│   ├── index.js      # Host plugin
│   └── client.js     # Client plugin
└── dist              # formal plugin package (build output)
    ├── package.json
    └── lib
        ├── index.js  # Host plugin (TypertRemoteService)
        └── client.js # Client plugin (__ModuleLoader__.load bundle)
```

## Changelog

- **v1.1.0**: added peak/valley pricing, task-based model recommendation with one-click switching, Gemini monthly usage; fixed the missing `typertRemote` binding that silently broke remote calls and hid the balance in the formal plugin.
- **v1.0.0**: initial release — output token usage, account balance, recharge link.

## License

[MIT](./LICENSE) © 2026 whjdygyh
