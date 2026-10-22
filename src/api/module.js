import { exec, spawn, moduleInfo, enableEdgeToEdge } from 'kernelsu'
import { mockExec, MOCK_MODULE_VERSION } from './mock'

// 浏览器开发环境没有 ksu 全局对象，使用 mock 实现（pnpm dev 本地预览）
export const isBrowserDev = typeof window !== 'undefined' && !window.ksu

// KSU/APatch edge-to-edge 全屏：请求管理器注入 --safe-area-inset-*（浏览器 dev 跳过）。
// 管理器默认 edge-to-edge 但不注入 inset，须页面主动 enableEdgeToEdge/fullScreen 才接收。
export function requestFullScreen() {
  if (isBrowserDev) return
  try {
    enableEdgeToEdge(true)
  } catch {
    /* 非 KSU/APatch 环境或旧版无此 API，忽略 */
  }
}

// moduleInfo() 返回 module.prop 全字段 + moduleDir，模块加载时取一次
const moduleInfoData = isBrowserDev
  ? { version: MOCK_MODULE_VERSION }
  : (() => {
      try {
        return JSON.parse(moduleInfo())
      } catch {
        return null
      }
    })()

// 模块内 webui.sh 的路径：优先从 KernelSU 动态取，取不到再 fallback
export const MODULE_PATH = moduleInfoData?.moduleDir || '/data/adb/modules/sub_store'
export const WEBUI_SCRIPT = `${MODULE_PATH}/scripts/webui.sh`

// 模块版本（module.prop 的 version 字段），供顶栏副标题等展示
export const MODULE_VERSION = moduleInfoData?.version || ''

async function runExec(command, options) {
  if (isBrowserDev) {
    return mockExec(command, options)
  }
  return exec(command, options)
}

export async function runModuleCommand(command, options = {}) {
  const result = await runExec(command, options)
  const stdout = result?.stdout ?? ''
  const stderr = result?.stderr ?? ''
  const errno = Number(result?.errno ?? -1)
  return {
    ok: errno === 0,
    errno,
    stdout,
    stderr,
  }
}

export async function getStatus() {
  const result = await runModuleCommand(`sh ${WEBUI_SCRIPT} status`)
  if (!result.ok) {
    throw new Error(result.stderr || result.stdout || '读取状态失败')
  }
  return JSON.parse(result.stdout)
}

// 读取服务操作日志（run.log + run_error.log；配合 log-reset 归档，内容即本次操作输出）
export async function getLog() {
  const result = await runModuleCommand(`sh ${WEBUI_SCRIPT} log`)
  return result.ok ? result.stdout : result.stderr || result.stdout
}

// 查询 run.log 当前字节数，用于轮询判断服务操作是否完成（日志停止增长即结束）
export async function getLogSize() {
  const result = await runModuleCommand(`sh ${WEBUI_SCRIPT} log-size`)
  return Number(result.stdout) || 0
}

// 读取更新日志（update.log + update_error.log；webui.sh 已把重启操作日志追加进 update.log）
export async function getUpdateLog() {
  const result = await runModuleCommand(`sh ${WEBUI_SCRIPT} update-log`)
  return result.ok ? result.stdout : result.stderr || result.stdout
}

// 查询更新完成状态：返回 'running' 或 update.done 中的退出码。
// 完成判定靠 webui.sh 在更新进程退出时写的标记，而非日志字节数（大文件下载可能长时间停滞）。
export async function getUpdateStatus() {
  const result = await runModuleCommand(`sh ${WEBUI_SCRIPT} update-status`)
  return (result.stdout || 'running').trim()
}

function parseJsonOutput(result, fallbackMessage) {
  let parsed
  try {
    parsed = JSON.parse(result.stdout)
  } catch {
    if (!result.ok) throw new Error(result.stderr || result.stdout || fallbackMessage)
    throw new Error(`无法解析自动更新状态: ${result.stdout || result.stderr || '空输出'}`)
  }
  if (!result.ok || parsed?.success === false) {
    throw new Error(parsed?.error || parsed?.message || result.stderr || fallbackMessage)
  }
  return parsed
}

export async function getAutoUpdateStatus() {
  const result = await runModuleCommand(`sh ${WEBUI_SCRIPT} auto-update-status`)
  return parseJsonOutput(result, '读取自动更新状态失败')
}

export async function saveAutoUpdateConfig(config) {
  const raw = JSON.stringify(config)
  const bytes = new TextEncoder().encode(raw)
  let bin = ''
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
  const result = await runModuleCommand(`sh ${WEBUI_SCRIPT} auto-update-config '${btoa(bin)}'`)
  return parseJsonOutput(result, '保存自动更新配置失败')
}

export async function runAutoUpdateNow() {
  const result = await runModuleCommand(`sh ${WEBUI_SCRIPT} auto-update-run-now`)
  return parseJsonOutput(result, '启动自动更新失败')
}

export async function getAutoUpdateLog() {
  const result = await runModuleCommand(`sh ${WEBUI_SCRIPT} auto-update-log`)
  return result.ok ? result.stdout : result.stderr || result.stdout
}

// 后台执行：先同步轮转旧日志（新 run.log 只含本次输出），再 nohup 后台运行。
// 服务控制（start/stop/restart）与更新（update-*）都走这里，页面传完整子命令。
// update-* 在 webui.sh 内不轮转，必须在此先行 log-reset，否则会追加到上次的旧日志。
export async function runBackground(name) {
  await runModuleCommand(`sh ${WEBUI_SCRIPT} log-reset`)
  spawn('sh', [WEBUI_SCRIPT, name])
  return { ok: true, errno: 0, stdout: '', stderr: '' }
}

export async function toggleAutostart() {
  return runModuleCommand(`sh ${WEBUI_SCRIPT} toggle-autostart`)
}

export async function regenerateBackendPath() {
  return runModuleCommand(`sh ${WEBUI_SCRIPT} regenerate-backend-path`)
}

export async function openUrl(url) {
  return runModuleCommand(`am start -a android.intent.action.VIEW -d '${url}'`)
}

// 读取用户配置 env 文件（webui.sh 内缺失时先从模块默认落一份）
export async function readEnvFile() {
  const result = await runModuleCommand(`sh ${WEBUI_SCRIPT} read-env`)
  if (!result.ok) throw new Error(result.stderr || '读取 env 文件失败')
  return result.stdout
}

// 保存用户配置 env 文件：内容经 base64 传输（规避引号/换行/特殊字符）。
// webui.sh save-env 先 cp 当前源文件为 .webbak，再把新内容写入源文件
export async function writeEnvFile(content) {
  const bytes = new TextEncoder().encode(content)
  let bin = ''
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
  const result = await runModuleCommand(`sh ${WEBUI_SCRIPT} save-env '${btoa(bin)}'`)
  if (!result.ok) throw new Error(result.stderr || '写入 env 文件失败')
}
