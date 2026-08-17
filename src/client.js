/**
 * dsh-meter — Client 插件
 *
 * 在会话标题栏右侧（conversation.session.header.utilities）渲染信息条：
 *   - 输出 token（本会话累计 outputTokens，实时推送）
 *   - 账户余额（每 60 秒经 Host RPC 刷新）
 *   - 「充值」链接（一键直达 https://platform.deepseek.com/usage）
 *
 * 依赖：
 *   - timer   定时刷新余额（inject 声明）
 *   - slots   注册 UI（conversation.session.header.utilities，标题栏右侧）
 *   - useProjection('tokenUsage')  标准 Slot 属性，直接读宿主累计 token 用量
 */
export default {
  inject: ['timer'],
  apply(ctx) {
    const slots = ctx.get('slots')
    if (slots === undefined) return

    styles.insert(`
      .dc-bar{display:inline-flex;align-items:center;gap:8px;font-size:11px;line-height:16px;font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-secondary);white-space:nowrap;user-select:none}
      .dc-item{display:inline-flex;align-items:center;gap:4px;flex:none}
      .dc-label{color:var(--dsw-alias-label-tertiary)}
      .dc-value{color:var(--dsw-alias-label-primary);font-weight:500}
      .dc-sep{color:var(--dsw-alias-border-l3)}
      .dc-muted{color:var(--dsw-alias-label-tertiary)}
      .dc-link{color:var(--dsw-static-blue-450, #4a90e2);text-decoration:none;cursor:pointer;flex:none;font-weight:500}
      .dc-link:hover{text-decoration:underline}
    `)

    function formatTokens(n) {
      if (!Number.isFinite(n)) return '0'
      if (n >= 1000000) return (n / 1000000).toFixed(2) + 'M'
      if (n >= 1000) return (n / 1000).toFixed(1) + 'K'
      return String(Math.round(n))
    }

    function UsageBar(props) {
      const usage = props.useProjection('tokenUsage')
      const [balance, setBalance] = React.useState({ status: 'loading' })

      React.useEffect(() => {
        let alive = true
        const load = async () => {
          let res
          try {
            res = await host.call('deepseek-balance')
          } catch (e) {
            if (alive) setBalance({ status: 'error', detail: 'transport' })
            return
          }
          if (!alive) return
          if (res && res.ok) setBalance({ status: 'ok', data: res.data })
          else setBalance({ status: 'error', detail: String((res && res.detail) || (res && res.error) || '') })
        }
        load()
        return ctx.interval(() => { load() }, 60000)
      }, [])

      // 只显示输出 token
      let outputTokens = 0
      let hasUsage = false
      if (usage) {
        outputTokens = usage.outputTokens || 0
        hasUsage = outputTokens > 0
      }

      // 提取 CNY 余额
      let balanceText = null
      if (balance.status === 'ok' && balance.data) {
        const infos = balance.data.balance_infos
        if (Array.isArray(infos) && infos.length > 0) {
          const info = infos.filter(function (b) { return b && b.currency === 'CNY' })[0] || infos[0]
          if (info && typeof info.total_balance !== 'undefined' && info.total_balance !== null) {
            balanceText = '\u00a5' + String(info.total_balance)
          }
        }
      }

      const cells = []
      if (hasUsage) {
        cells.push(
          React.createElement(
            'span',
            { key: 'usage', className: 'dc-item' },
            React.createElement('span', { className: 'dc-label' }, '\u51fa'),
            React.createElement('span', { className: 'dc-value' }, formatTokens(outputTokens)),
          ),
        )
      }
      if (balanceText !== null) {
        cells.push(
          React.createElement(
            'span',
            { key: 'balance', className: 'dc-item' },
            React.createElement('span', { className: 'dc-label' }, '\u4f59\u989d'),
            React.createElement('span', { className: 'dc-value' }, balanceText),
          ),
        )
      } else if (balance.status === 'error') {
        cells.push(
          React.createElement(
            'span',
            {
              key: 'balance',
              className: 'dc-item',
              title: balance.detail || '\u4f59\u989d\u67e5\u8be2\u5931\u8d25',
            },
            React.createElement('span', { className: 'dc-label' }, '\u4f59\u989d'),
            React.createElement('span', { className: 'dc-muted' }, '\u2014'),
          ),
        )
      }
      // 充值入口：始终显示
      cells.push(
        React.createElement(
          'a',
          {
            key: 'recharge',
            className: 'dc-link',
            href: 'https://platform.deepseek.com/usage',
            target: '_blank',
            rel: 'noopener noreferrer',
          },
          '\u5145\u503c',
        ),
      )

      const children = []
      cells.forEach(function (cell, i) {
        if (i > 0) {
          children.push(React.createElement('span', { key: 'sep' + i, className: 'dc-sep', 'aria-hidden': true }, '\u00b7'))
        }
        children.push(cell)
      })
      return React.createElement('div', { className: 'dc-bar' }, children)
    }

    slots.inject('conversation.session.header.utilities', () =>
      slots.register(
        { name: 'conversation.session.header.utilities', id: 'dsh-meter', order: -100 },
        (props) => React.createElement(UsageBar, props),
      ),
    )
  },
}
