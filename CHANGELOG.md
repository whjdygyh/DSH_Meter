# Changelog

本项目遵循 [Semantic Versioning](https://semver.org/lang/zh-CN/) 语义化版本。

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

[1.1.0]: https://github.com/whjdygyh/DeepCost/releases/tag/v1.1.0
[1.0.0]: https://github.com/whjdygyh/DeepCost/releases/tag/v1.0.0
