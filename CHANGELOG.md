# Changelog

本项目遵循 [Semantic Versioning](https://semver.org/lang/zh-CN/) 语义化版本。

## [1.2.0] - 2026-08-18

### 新增

- **多语言（i18n）**：信息条文案自动跟随 DSH 界面语言（中文 / English），支持界面切换即时刷新；模型推荐的任务与理由也按界面语言生成。
- README 增加语言切换标签（中文 / English）、支持的模型、规划中的模型、算力成本说明。

### 修复

- 语言代号用错导致中文词典不生效：DSH 只注册 `zh` / `en` 两个代号，修正 `zh-CN`/`en-US` → `zh`/`en`。
- 模型推荐从未发起：移除依赖会话快照 `lastUserSeq` 的门控（快照节点字段可能为空导致短路），改为 DeepSeek 会话触发时直接调用。

### 变更

- **Gemini 会话收敛**：不显示峰/谷（DeepSeek 官方定价）与模型推荐（当前仅单一对话模型、无可对比对象），只保留本月用量。

## [1.1.0] - 2026-08-17

### 新增

- 峰/谷计价提示：按北京时间 9:00-12:00、14:00-18:00 判定高峰（峰），其余为空闲（谷），点击直达官方定价文档。
- 任务级模型推荐：依据最近 6 条对话历史提炼任务，在 deepseek-v4-flash / deepseek-v4-pro 之间推荐性价比最优，支持一键切换；无明确任务时显示「—」。
- Gemini 会话显示本月（自然月）累计输出 token，每月 1 日自动归零。

### 修复

- 正式插件 Host 服务缺失 `typertRemote` binding，导致 Client 远程调用全部静默失败、余额不显示——服务改为继承 `TypertRemoteService` 自动挂载 binding。
- `sessionModels` 识别 provider 依赖 Host 回退链不稳定——Client 优先从会话快照（`requestConfig`/`provenance`）读取 provider，Host 调用作兜底。
- Client 无参 Remote 调用（`balance`/`geminiUsage`）不再传多余参数，避免 Typert 参数个数校验拒绝。

### 变更

- 移除临时调试探针与诊断标记，信息条保持干净。

## [1.0.0] - 2026-08-17

### 新增

- 在 DeepSeek Harness（DSH）会话标题栏右侧显示信息条：输出 token 用量、账户余额、「充值」入口。
- 输出 token 用量通过宿主 `tokenUsage` 投影实时推送（无需轮询）。
- 账户余额每 60 秒经 `GET /user/balance` 自动刷新（复用官方 `DEEPSEEK_API_KEY` 凭据）。
- 一键充值链接直达 `https://platform.deepseek.com/usage`。
- Host 端余额查询显式以 `danger-full-access` 沙箱执行，规避 `curl` 子进程被 confine。
- 提供中英文 README、MIT LICENSE、DSH 插件包结构（`dsh.client` + `exports["./client"]`）。

[1.2.0]: https://github.com/whjdygyh/dsh-meter/releases/tag/v1.2.0
[1.1.0]: https://github.com/whjdygyh/dsh-meter/releases/tag/v1.1.0
[1.0.0]: https://github.com/whjdygyh/dsh-meter/releases/tag/v1.0.0
