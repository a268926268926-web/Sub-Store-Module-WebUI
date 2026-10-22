// 开发环境 mock：浏览器里没有 ksu 全局对象，这里模拟 kernelsu.exec
// 数据与真实 webui.sh status 输出对齐，方便在电脑上调试 UI

// 模拟 module.prop 的 version 字段
const MOCK_MODULE_VERSION = '2.0.1 (Browser Dev)'

export { MOCK_MODULE_VERSION }

const MOCK_STATUS = {
  serviceRunning: true,
  autostart: true,
  configModified: false,
  mergeMode: true,
  directUrl: 'http://127.0.0.1:3001?api=http://127.0.0.1:3001/AbCdEfGhIjKlMnOpQrStUv',
  frontUrl: 'http://127.0.0.1:3002',
  backUrl: 'http://127.0.0.1:3001?api=http://127.0.0.1:3001/AbCdEfGhIjKlMnOpQrStUv',
  openUrl: 'http://127.0.0.1:3001?api=http://127.0.0.1:3001/AbCdEfGhIjKlMnOpQrStUv',
  backendPathIsDefault: true,
  backendPathIsEmpty: true,
  crosAllowedOriginsIsAll: true,
  runUserIsRoot: true,
}

const mockAutoUpdateState = {
  enabled: false,
  schedule: 'daily',
  hour: 4,
  minute: 30,
  intervalDays: 1,
  running: false,
  daemonRunning: false,
  lastRun: '',
  lastStatus: 'never',
  lastResult: '尚未执行',
  nextRun: '',
}

function nextMockRun(intervalDays, hour, minute) {
  const date = new Date()
  date.setDate(date.getDate() + intervalDays)
  date.setHours(hour, minute, 0, 0)
  return date.getTime()
}

// 模拟 sub_store.env 内容，供浏览器 dev 调试编辑器
const MOCK_ENV = `##!/system/bin/sh
# ============================================================
# Sub-Store 环境变量 (Browser Dev mock)
# ============================================================
# ============================================================
# Sub-Store 环境变量
# 内容与注释参考 Docker 介绍，未来 Sub-Store 更新时以 Docker 版说明为准！
#   https://hub.docker.com/r/xream/sub-store
#
# 修改后重启服务生效:
#   su -c "sh /data/adb/modules/sub_store/scripts/sub_store.service restart"
# ============================================================

# ---------- 后端监听 ----------
# 后端 API 监听地址, 应永远不要暴露, 这是内部裸后端
SUB_STORE_BACKEND_API_HOST="127.0.0.1"
# 后端监听端口, 默认为 3001
SUB_STORE_BACKEND_API_PORT="3001"
# 数据文件夹 (对应 Docker 版挂载的 /opt/app/data)
SUB_STORE_DATA_BASE_PATH="\${run_path}"
# API 路径前缀, 不要使用特殊符号
# 首次安装时会被自动替换为随机值 (20~24 位字母数字);
# 若仍在使用模块默认值, 执行菜单 (TUI) 会告警, 可用菜单项一键重新生成
SUB_STORE_FRONTEND_BACKEND_PATH="/2cXaAxRGfddmGz2yx1wA"
# 默认代理, 支持 SOCKS5 / HTTP / HTTPS
# SUB_STORE_BACKEND_DEFAULT_PROXY="socks5://127.0.0.1:7890"

# ---------- 请求限制 ----------
# 请求 Body 限制, 报 request entity too large 时调大 (默认 1mb)
SUB_STORE_BODY_JSON_LIMIT="1mb"
# undici header 大小限制; 订阅响应头过大时报 Headers Overflow Error 可调大 (默认 32768)
SUB_STORE_MAX_HEADER_SIZE="32768"
# CORS allowlist (默认 *)
SUB_STORE_CORS_ALLOWED_ORIGINS="*"

# ---------- 前端 ----------
# 前端文件夹路径 (Docker 版自带默认内部路径, 无需设置)
SUB_STORE_FRONTEND_PATH="\${sub_store_path}/bin/frontend"
# 前端监听地址, 可按需开放 (局域网访问时改 0.0.0.0)
SUB_STORE_FRONTEND_HOST="\${SUB_STORE_BACKEND_API_HOST}"
# 前端监听端口, 默认为 3002
SUB_STORE_FRONTEND_PORT="3002"

# ---------- 合并端口 ----------
# 默认启用 (与官方 Docker 默认一致): 后端同时处理 API 和前端资源请求
# 想用分离模式 (前后端独立端口): 注释本行, 前端走 SUB_STORE_FRONTEND_PORT
# 注意: 后端按「变量非空即合并」判断 (truthy), 设 "false" 无效! 关闭=注释本行
SUB_STORE_BACKEND_MERGE="true"

# ---------- 定时任务 ----------
# SUB_STORE_BACKEND_SYNC_CRON=""
# 推送服务 URL
# 支持 Bark / Telegram Bot / PushPlus / shoutrrr, 示例见 Docker 说明
# SUB_STORE_PUSH_SERVICE=""

# ---------- MMDB 数据库 ----------
# SUB_STORE_MMDB_COUNTRY_PATH=""
# SUB_STORE_MMDB_COUNTRY_URL=""
# SUB_STORE_MMDB_ASN_PATH=""
# SUB_STORE_MMDB_ASN_URL=""
# 定时更新 MMDB CRON
# SUB_STORE_MMDB_CRON=""

# ---------- 自定义显示与响应 ----------
# 自定义前端显示的运行环境名称/图标
# SUB_STORE_BACKEND_CUSTOM_NAME=""
# SUB_STORE_BACKEND_CUSTOM_ICON=""
# 自定义响应头中的 X-Powered-By
# SUB_STORE_X_POWERED_BY=""

# ============================================================
# HTTP-META 环境变量 (对应 http-meta docker tag)
# ============================================================
# 监听地址 (与后端同 host, 一般不需要改)
HOST="\${SUB_STORE_BACKEND_API_HOST}"
# 监听端口, 9876 可能与其他服务冲突 (如 ddns-go), 可自行调整
PORT="9876"
# 同 SUB_STORE_BODY_JSON_LIMIT
BODY_JSON_LIMIT="\${SUB_STORE_BODY_JSON_LIMIT}"
# 数据/配置文件夹
META_FOLDER="\${sub_store_path}/bin/http-meta"
# 临时文件夹
META_TEMP_FOLDER="\${run_path}"
# 调试: 保留每次运行的核心日志和配置
# META_DISABLE_AUTO_CLEAN="true"
`

const MOCK_OUTPUT = {
  'read-env': MOCK_ENV,
  restart: '[Warn] stopping sub_store_node service.\n[Info] starting sub_store_node service.',
  stop: '[Warn] stopping sub_store_node service.',
  'update-all': '[Info] 后端已是最新版本\n[Info] 前端已是最新版本\n[Info] http-meta 处理完成',
  'toggle-autostart': '已禁用开机自启',
  log: '[2026-08-08 09:00:00 CST] [Info]: starting sub_store_node service.\n[2026-08-08 09:00:01 CST] [Info]: 降权: /system/bin/setpriv (toybox, --init-groups)\n[2026-08-08 09:00:02 CST] [Warn]: 这是一条示例警告\n[2026-08-08 09:00:03 CST] [Error]: 这是一条示例错误',
  default: 'mock output',
}

export function mockExec(command, options = {}) {
  return new Promise((resolve) => {
    setTimeout(() => {
      if (/\sstatus$/.test(command)) {
        resolve({ errno: 0, stdout: JSON.stringify(MOCK_STATUS), stderr: '' })
        return
      }
      if (command.includes('log-size')) {
        // dev 环境跳过完成轮询，返回固定字节数即可
        resolve({ errno: 0, stdout: '400', stderr: '' })
        return
      }
      if (command.includes('auto-update-log')) {
        resolve({
          errno: 0,
          stdout: '[Info] 自动更新任务启动\n[Info] 后端已是最新版本\n[Info] 前端已是最新版本\n[Info] http-meta 处理完成',
          stderr: '',
        })
        return
      }
      if (command.includes('auto-update-status') || command.includes('auto-update-config') || command.includes('auto-update-run-now')) {
        if (command.includes('auto-update-run-now')) {
          mockAutoUpdateState.running = true
          mockAutoUpdateState.lastStatus = 'running'
          setTimeout(() => {
            mockAutoUpdateState.running = false
            mockAutoUpdateState.lastStatus = 'success'
            mockAutoUpdateState.lastResult = '已是最新版本'
            mockAutoUpdateState.lastRun = Date.now()
          }, 1200)
          resolve({ errno: 0, stdout: JSON.stringify({ accepted: true }), stderr: '' })
          return
        }
        if (command.includes('auto-update-config')) {
          const encoded = command.match(/'([^']+)'/)?.[1]
          if (encoded) {
            try {
              Object.assign(mockAutoUpdateState, JSON.parse(atob(encoded)))
              const intervalDays = mockAutoUpdateState.schedule === 'interval_days'
                ? Number(mockAutoUpdateState.intervalDays) || 7
                : 1
              mockAutoUpdateState.nextRun = mockAutoUpdateState.enabled
                ? nextMockRun(
                    intervalDays,
                    Number(mockAutoUpdateState.hour) || 0,
                    Number(mockAutoUpdateState.minute) || 0,
                  )
                : ''
              mockAutoUpdateState.daemonRunning = mockAutoUpdateState.enabled
            } catch {
              resolve({ errno: 1, stdout: '', stderr: 'invalid config' })
              return
            }
          }
        }
        resolve({ errno: 0, stdout: JSON.stringify(mockAutoUpdateState), stderr: '' })
        return
      }
      const key = Object.keys(MOCK_OUTPUT).find((k) => command.includes(k))
      resolve({ errno: 0, stdout: MOCK_OUTPUT[key] || MOCK_OUTPUT.default, stderr: '' })
    }, 300)
  })
}
