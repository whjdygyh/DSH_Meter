# DeepCost

> 2026年8月17日 by 运维部Harmen（原作者）
> 仓库：https://github.com/whjdygyh/DeepCost

**DeepCost** 在 **DeepSeek Harness（DSH）** 会话标题栏右侧显示一条信息条，实时展示：

- **输出 token 用量**（本会话累计 output tokens，随每次回复实时推送）
- **DeepSeek 账户余额**（¥，每 60 秒自动刷新）
- **「充值」入口**（一键直达 `https://platform.deepseek.com/usage`）

![截图](docs/screenshot.png)

信息条形态如下：

```
出 4.5K · 余额 ¥29.54 · 充值
```

## 功能特性

| 数据 | 来源 | 更新方式 |
|---|---|---|
| 输出 token | DSH 宿主 `tokenUsage` 投影（累计 outputTokens） | 每次回复实时推送，无需轮询 |
| 账户余额 | DeepSeek 官方 `GET /user/balance` | 每 60 秒自动刷新 |
| 充值链接 | `https://platform.deepseek.com/usage` | 静态 |

## 环境要求

- [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)（`@deepseek-ai/dsh`，已验证 `0.1.0-rc.6`）
- 已配置 DeepSeek API key（见下文）

## 配置 API Key（复用官方入口）

本插件**不存储密钥**，直接复用 DSH 官方的 DeepSeek 凭据，零额外配置：

1. 打开 DSH 网页版「**设置 → 模型 → DeepSeek**」。
2. 填入你的 DeepSeek API key（底层写入 `DEEPSEEK_API_KEY` 凭据，存于 `$DSH_HOME/.credentials.yaml`）。
3. 插件自动读取该凭据查询余额；未配置时信息条余额显示为「—」，token 用量不受影响。

> 插件还兼容自定义凭据引用名：若你的 `llm-deepseek` 配置里改了 `apiKeyEnv`，插件会自动跟随。

## 快速开始（当前推荐：动态插件）

DSH `0.1.0-rc.6` 的第三方插件「打包 + 发布」工具链尚未随 npm 开放，因此目前最直接的运行方式是 **DSH 动态插件**（免构建，源码即用）：

1. 在 DSH 中使用支持动态插件的会话（`cordis` 预设）。
2. 用 `cordis_define` 定义插件：
   - `code.host` = [`src/index.js`](./src/index.js) 中 `apply` 的函数体（去掉 `export default`，整体包在 `return { … }` 里）
   - `code.client` = [`src/client.js`](./src/client.js) 同理
3. `cordis_run` 激活，在 UI 中批准。

两个源文件**均为纯 JavaScript、无 import、无构建**，可直接照搬。

## 正式化（工具链开放后）

项目结构已按 DSH 插件包规范备好，未来可直接发布为 npm 包并 `dsh plugin add`：

- `package.json`：`main` 指向 Host 半（`src/index.js`），`exports["./client"]` 指向 Client 半（`src/client.js`），`dsh.client` 声明 `platform: "web"`。
- 安装后在你的 profile 的 `cordis.patch.yml` 声明：

```yaml
- id: deepcost
  name: 'deepcost'
```

> 注意：正式插件包形态下，`harness.handle`（动态插件专用）需替换为 Typert `@Remote`，client bundle 需用 DSH 的 `tsdown` 工具链构建为 `__ModuleLoader__.load` 格式。这两点是 DSH 生态内部机制，待其对外发布后即可无缝切换。

## 技术原理

- **用量**：DSH 宿主持有服务级 `tokenMeter` 与 `tokenUsage` 会话投影；Client 端通过 Slot 标准属性 `useProjection('tokenUsage')` 直接订阅，Host 侧零自定义代码。
- **余额**：Client 经包私有 RPC 请求 Host；Host 用 `credentials.resolve('DEEPSEEK_API_KEY')` 解析密钥（密钥只在宿主进程内使用、绝不下发浏览器），再以 `curl` 查询官方 `/user/balance`，返回 `balance_infos` 中的 CNY 余额。
- **沙箱**：余额查询的 `shell.resolve` 显式以 `danger-full-access` 模式执行——DSH 沙箱只约束「文件效果」、不约束网络，全访问模式仅为避免 `workspace-write` 下 `curl` 子进程被 confine 而失败（只读外发，无文件写入）。

## 目录结构

```
├── package.json      # DSH 插件包声明（exports + dsh.client）
├── LICENSE           # MIT
├── README.md
└── src
    ├── index.js      # Host 插件：余额查询 RPC
    └── client.js     # Client 插件：信息条 UI
```

## License

[MIT](./LICENSE) © 2026 whjdygyh
