/**
 * DeepCost — Host 插件
 *
 * 提供「DeepSeek 账户余额查询」的 Client→Host RPC。密钥只在宿主进程内
 * 解析并使用，绝不下发到浏览器，也不外传。
 *
 * 依赖的宿主服务（均通过 ctx.get 可选读取，缺省时优雅降级）：
 *   - shell         执行 curl 查询官方余额接口
 *   - credentials   解析 DEEPSEEK_API_KEY（DSH「设置 → 模型 → DeepSeek」写入）
 *   - settings      读取 llm-deepseek.apiKeyEnv（可覆盖默认的凭据引用名）
 *   - sandboxPolicy 提供 workspaceRoot，让 curl 以全访问模式执行
 *
 * 说明：`harness.handle` 是 DSH 动态插件专用的包私有 RPC 桥；正式插件包
 * 形态下应改用 Typert Remote（见 README「正式化」一节）。
 */
export default {
  apply(ctx) {
    // 密钥只允许 HTTP 头可承载的字符，同时杜绝命令注入
    const KEY_RE = /^[A-Za-z0-9._-]+$/

    harness.handle('deepseek-balance', async () => {
      const shell = ctx.get('shell')
      if (shell === undefined) return { ok: false, error: 'shell-unavailable' }
      const credentials = ctx.get('credentials')
      const settings = ctx.get('settings')
      const sandboxPolicy = ctx.get('sandboxPolicy')

      // 1) 凭据引用名：默认 DEEPSEEK_API_KEY，可被 llm-deepseek.apiKeyEnv 覆盖
      let refName = 'DEEPSEEK_API_KEY'
      if (settings !== undefined) {
        try {
          const section = settings.get('llm-deepseek')
          if (
            section &&
            typeof section === 'object' &&
            typeof section.apiKeyEnv === 'string' &&
            section.apiKeyEnv.length > 0
          ) {
            refName = section.apiKeyEnv
          }
        } catch (e) {
          /* 读取失败则保留默认引用名 */
        }
      }

      // 2) 解析密钥（credentials 服务；环境变量 / .credentials.yaml 均可）
      let key = null
      if (credentials !== undefined) {
        try {
          const resolved = await credentials.resolve(refName)
          if (resolved && typeof resolved.value === 'string' && resolved.value.length > 0) {
            key = resolved.value
          }
        } catch (e) {
          /* 解析失败继续，返回 no-key */
        }
      }
      if (key === null) return { ok: false, error: 'no-key', ref: refName }
      if (!KEY_RE.test(key)) return { ok: false, error: 'invalid-key' }

      // 3) 查询 DeepSeek 官方余额接口
      //    Windows 下为 curl.exe；macOS/Linux 请把命令改为 `curl`
      const command =
        "curl.exe -s -m 20 -H 'Authorization: Bearer " + key +
        "' 'https://api.deepseek.com/user/balance'"

      // 沙箱只约束「文件效果」，不约束网络；但 workspace-write 会 confine
      // curl 子进程导致失败，故显式以全访问模式执行（只读外发，安全）。
      const policy =
        sandboxPolicy !== undefined && typeof sandboxPolicy.workspaceRoot === 'string'
          ? { mode: 'danger-full-access', workspaceRoot: sandboxPolicy.workspaceRoot }
          : undefined

      try {
        const spec = shell.resolve({
          command,
          timeoutMs: 25000,
          stdoutMaxBytes: 8192,
          sandboxPolicy: policy,
        })
        const result = await shell.run(spec)
        if (result.exitCode !== 0) {
          return {
            ok: false,
            error: 'curl-exit',
            exitCode: result.exitCode,
            sandboxMode: result.sandbox ? result.sandbox.mode : 'unknown',
            detail: String((result.stderr && result.stderr.text) || '').slice(0, 500),
          }
        }
        const text = String((result.stdout && result.stdout.text) || '').trim()
        let data
        try {
          data = JSON.parse(text)
        } catch (e) {
          return { ok: false, error: 'bad-json', detail: text.slice(0, 500) }
        }
        return { ok: true, data }
      } catch (e) {
        return { ok: false, error: 'shell-error', detail: String((e && e.message) || e).slice(0, 500) }
      }
    })
  },
}
