# Changelog

本项目遵循 [Semantic Versioning](https://semver.org/lang/zh-CN/) 语义化版本。

## [1.0.0] - 2026-08-17

### 新增

- 在 DeepSeek Harness（DSH）会话标题栏右侧显示信息条：输出 token 用量、账户余额、「充值」入口。
- 输出 token 用量通过宿主 `tokenUsage` 投影实时推送（无需轮询）。
- 账户余额每 60 秒经 `GET /user/balance` 自动刷新（复用官方 `DEEPSEEK_API_KEY` 凭据）。
- 一键充值链接直达 `https://platform.deepseek.com/usage`。
- Host 端余额查询显式以 `danger-full-access` 沙箱执行，规避 `curl` 子进程被 confine。
- 提供中英文 README、MIT LICENSE、DSH 插件包结构（`dsh.client` + `exports["./client"]`）。

[1.0.0]: https://github.com/whjdygyh/DeepCost/releases/tag/v1.0.0
