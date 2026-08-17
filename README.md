# dsh-meter

> **中文** | [English](README.en.md)

> 2026年8月17日 by 运维部Harmen（原作者）
> 更新：2026年8月18日（v1.2.0：多语言支持、Gemini 会话显示收敛）
> 仓库：https://github.com/whjdygyh/dsh-meter
> 版本：v1.2.0

**dsh-meter** 在 **DeepSeek Harness（DSH）** 会话标题栏右侧显示一条信息条，实时展示：

- **峰/谷计价**（北京时间 9:00-12:00、14:00-18:00 为高峰，其余为空闲；仅 DeepSeek 会话）
- **输出 token 用量**（本会话累计 output tokens，随每次回复实时推送）
- **DeepSeek 账户余额**（¥，每 60 秒自动刷新；余额本身即「充值」入口）
- **任务级模型推荐**（依据最近对话提炼任务，推荐 flash / pro 并支持一键切换；仅 DeepSeek 会话）
- **Gemini 本月用量**（自然月累计输出 token，每月 1 日归零；Gemini 会话仅显示此用量）

![截图](docs/screenshot-zh.png)

信息条形态如下：

```
谷 · 出 4.5K · 余额 ¥95.29 · 推荐 v4-flash
```

## 功能特性

| 数据 | 来源 | 更新方式 |
|---|---|---|
| 峰/谷 | DeepSeek 官方定价（高峰价格翻倍，空闲半价） | 每分钟刷新，点击直达官方定价文档 |
| 输出 token | DSH 宿主 `tokenUsage` 投影（累计 outputTokens） | 每次回复实时推送，无需轮询 |
| 账户余额 | DeepSeek 官方 `GET /user/balance` | 每 60 秒自动刷新，点击直达充值页 |
| 模型推荐 | 最近 6 条历史提炼任务，flash/pro 性价比对比 | 新消息后自动刷新，点击一键切换 |
| Gemini 月度 | Host 增量折叠本月 Gemini 输出 token | 每 5 分钟刷新，每月 1 日归零 |

## 环境要求

- [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)（`@deepseek-ai/dsh`，已验证 `0.1.0-rc.6`）
- 已配置 DeepSeek API key（见下文）

## 支持的模型

| Provider | 模型 | 信息条显示 |
|---|---|---|
| DeepSeek | `deepseek-v4-flash` / `deepseek-v4-pro` | 峰/谷、出、余额、推荐、一键切换 |
| Google Gemini | `gemini-2.5-flash` 等 Gemini 系列 | 本月用量（自然月累计输出 token） |

- DeepSeek 会话：完整功能（峰谷计价、token 用量、余额、任务级推荐、一键切换）。
- Gemini 会话：仅显示本月累计输出 token（每月 1 日归零）；峰/谷与模型推荐为 DeepSeek 专属，不在 Gemini 显示。
- 其他 provider 的会话：仅显示通用信息（token 用量），不影响使用。

### 多语言（i18n）

信息条文案**自动跟随 DSH 界面语言**：界面为英文时显示 `Valley · Out 4.5K · Balance ¥95.29 · Rec v4-flash`，中文界面显示中文。模型推荐的任务与理由也按界面语言生成。当前支持 **中文（zh）与英文（en）**。

### 规划中的模型

- **DeepSeek 更多型号**：随官方发布跟进新版本（如新的 v4 系列型号），自动适配峰谷计价与推荐。
- **OpenAI / Claude 等主流 provider**：计划加入与 Gemini 类似的月度用量统计（按各自 API 用量口径）。
- 插件的 provider 识别是通用的，新增 provider 只需在 Host 端补充对应的用量/余额取数逻辑即可，无需改 UI。

## 算力成本说明

信息条本身的**基础功能不产生任何额外算力成本**：

- **token 用量、峰/谷、余额、Gemini 月度**：全部来自 DSH 本地数据或 DeepSeek 官方免费余额接口，不消耗模型算力。
- **模型推荐**（唯一会调用模型的环节）：每次会话出现新消息后，调用一次 `deepseek-v4-flash` 提炼最近 6 条对话并给出推荐。单次消耗约几百 token（输入约 1K、输出约 100 token 以内），按 v4-flash 计费约为**每次 0.001 元量级**，且只有 DeepSeek 会话触发，可放心使用。无明确任务时仅显示「—」，不产生额外调用。

## 配置 API Key（复用官方入口）

本插件**不存储密钥**，直接复用 DSH 官方的 DeepSeek 凭据，零额外配置：

1. 打开 DSH 网页版「**设置 → 模型 → DeepSeek**」。
2. 填入你的 DeepSeek API key（底层写入 `DEEPSEEK_API_KEY` 凭据，存于 `$DSH_HOME/.credentials.yaml`）。
3. 插件自动读取该凭据查询余额；未配置时信息条余额显示为「—」，token 用量不受影响。

> 插件还兼容自定义凭据引用名：若你的 `llm-deepseek` 配置里改了 `apiKeyEnv`，插件会自动跟随。

## 安装（正式插件）

dsh-meter 已按 DSH 插件包规范构建为正式插件（Host + Client 双端，随 DSH 启动加载，出现在 Settings → Plugins）：

1. 将 `dist/` 中的包复制到你的 profile 依赖目录：

   ```powershell
   Copy-Item dist\* "$env:USERPROFILE\.dsh\profiles\node_modules\dsh-meter\" -Recurse -Force
   ```

2. 在你的 profile 组合文件中声明插件（`web/cordis.patch.yml`）：

   ```yaml
   - insert:
       - id: dsh-meter
         name: 'dsh-meter'
   ```

3. 重启 DSH，在「设置 → 插件」中确认 dsh-meter 已加载。

### 备选：动态插件（免构建，源码即用）

DSH `0.1.0-rc.6` 的第三方插件「打包 + 发布」工具链尚未随 npm 开放，也可以直接用 **DSH 动态插件**运行（`cordis` 预设会话）：

1. 用 `cordis_define` 定义插件：`code.host` = [`src/index.js`](./src/index.js) 的 `apply` 函数体（去 `export default`，包在 `return { … }` 里）；`code.client` = [`src/client.js`](./src/client.js) 同理。
2. `cordis_run` 激活，在 UI 中批准。

两个源文件**均为纯 JavaScript、无 import、无构建**，可直接照搬。

## 技术原理

- **用量**：DSH 宿主持有服务级 `tokenMeter` 与 `tokenUsage` 会话投影；Client 端通过 Slot 标准属性 `useProjection('tokenUsage')` 直接订阅，Host 侧零自定义代码。
- **余额/推荐/Gemini**：Client 经 Typert Remote（`remote.$mount` + `typertGateway` RPC）调用 Host 服务；Host 提供 5 个方法：`balance` / `sessionModels` / `selectModel` / `geminiUsage` / `recommend`。
- **凭据**：Host 用 `credentials.resolve('DEEPSEEK_API_KEY')` 解析密钥（密钥只在宿主进程内使用、绝不下发浏览器），再以 `curl` 查询官方接口。
- **沙箱**：`curl` 查询的 `shell.resolve` 显式以 `danger-full-access` 模式执行——DSH 沙箱只约束「文件效果」、不约束网络，全访问模式仅为避免 `workspace-write` 下 `curl` 子进程被 confine 而失败（只读外发，无文件写入）。

## 目录结构

```
├── package.json      # DSH 插件包声明（exports + dsh.client）
├── LICENSE           # MIT
├── README.md         # 中文文档
├── README.en.md      # English docs
├── CHANGELOG.md
├── docs
│   ├── screenshot-zh.png  # 中文界面截图
│   └── screenshot-en.png  # English UI screenshot
├── src               # 动态插件版源码（免构建）
│   ├── index.js      # Host 插件
│   └── client.js     # Client 插件
└── dist              # 正式插件包（构建产物）
    ├── package.json
    └── lib
        ├── index.js  # Host 插件（TypertRemoteService）
        └── client.js # Client 插件（__ModuleLoader__.load bundle）
```

## 版本历史

- **v1.2.0**：多语言支持（信息条自动跟随 DSH 界面语言）；修复语言代号与模型推荐门控问题；Gemini 会话收敛为仅显示用量。
- **v1.1.0**：新增峰/谷计价、任务级模型推荐与一键切换、Gemini 本月用量；修复正式插件 Host 服务 `typertRemote` binding 缺失导致余额不显示的问题。
- **v1.0.0**：首个版本——输出 token 用量、账户余额、充值入口。

## License

[MIT](./LICENSE) © 2026 whjdygyh
