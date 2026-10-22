<script setup>
import { computed, onActivated, ref } from 'vue'
import {
  CircleCheck,
  CircleStop,
  ChevronRight,
  ExternalLink,
  Link2,
  Play,
  Power,
  RotateCw,
  Server,
  ShieldAlert,
  Square,
} from '@lucide/vue'
import { useModuleState } from '../composables/useModuleState'
import { useOperationLog } from '../composables/useOperationLog'
import { showToast } from '../composables/useToast'
import OperationLogPanel from '../components/OperationLogPanel.vue'
import M3LoadingIndicator from '../components/M3LoadingIndicator.vue'
import * as moduleApi from '../api/module'

const { status, busy, error, refreshStatus, runAction } = useModuleState()

onActivated(() => {
  refreshStatus(false)
})

const metricItems = computed(() => {
  if (!status.value) return []
  return [
    {
      label: '开机自启',
      value: status.value.autostart ? '已启用' : '已禁用',
      icon: Power,
    },
    {
      label: '配置状态',
      value: status.value.configModified ? '等待重启' : '正常',
      icon: CircleCheck,
    },
    {
      label: '运行用户',
      value: status.value.runUserIsRoot ? 'ROOT' : 'SHELL',
      icon: ShieldAlert,
    },
    {
      label: '后端模式',
      value: status.value.mergeMode ? '合并端口' : '前后端分离',
      icon: Server,
    },
  ]
})

const addresses = computed(() => {
  if (!status.value) return []
  if (status.value.mergeMode) {
    return [{ label: '直达地址', value: status.value.directUrl }]
  }
  return [
    { label: '前端地址', value: status.value.frontUrl },
    { label: '后端地址', value: status.value.backUrl },
  ]
})

function handleOpen() {
  if (status.value?.openUrl) {
    runAction('open', () => moduleApi.openUrl(status.value.openUrl))
  }
}

const { content, visible } = useOperationLog()
const currentAction = ref('')
const pendingAction = ref(false)

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function pollUntil(predicate, timeoutMs, intervalMs = 600, onPoll) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    await refreshStatus(false)
    if (onPoll) await onPoll()
    if (predicate()) return
    await sleep(intervalMs)
  }
}

async function pollServiceState(name, onPoll) {
  if (name === 'restart') {
    await pollUntil(() => status.value?.serviceRunning === false, 6000, 600, onPoll)
    await pollUntil(() => status.value?.serviceRunning === true, 15000, 600, onPoll)
  } else if (name === 'start') {
    await pollUntil(() => status.value?.serviceRunning === true, 12000, 600, onPoll)
  } else {
    await pollUntil(() => status.value?.serviceRunning === false, 10000, 600, onPoll)
  }
}

async function handleServiceAction(name) {
  currentAction.value = name
  pendingAction.value = true
  visible.value = true
  content.value = '正在执行，等待输出…'
  try {
    const result = await moduleApi.runBackground(name)
    if (!result.ok) throw new Error(result.stderr || '指令发送失败')
    if (!moduleApi.isBrowserDev) {
      await pollServiceState(name, async () => {
        const log = await moduleApi.getLog().catch(() => '')
        if (log) content.value = log
      })
    }
    content.value = await moduleApi.getLog().catch(() => '')
    visible.value = true
    showToast(name === 'restart' ? '服务已重启' : name === 'start' ? '服务已启动' : '服务已停止')
  } catch (err) {
    error.value = err?.message || '操作失败'
    showToast(error.value, { tone: 'error' })
  } finally {
    pendingAction.value = false
    currentAction.value = ''
  }
}

const securityIssues = computed(() => {
  if (!status.value) return []
  const issues = []
  if (status.value.backendPathIsDefault) {
    issues.push({
      title: '访问路径仍为模块默认值',
      text: '建议在配置页重新生成随机路径，避免不同安装实例使用同一入口。',
    })
  }
  if (status.value.backendPathIsEmpty && status.value.crosAllowedOriginsIsAll) {
    issues.push({
      title: '开放路径与跨域策略较宽',
      text: '后端路径为根路径且允许所有来源，建议生成随机路径或限制可信来源。',
    })
  }
  if (status.value.runUserIsRoot) {
    issues.push({
      title: '服务正在以 root 运行',
      text: '除非确有权限需求，建议将 run_as_user 改为 shell，缩小服务被利用后的影响面。',
    })
  }
  return issues
})
</script>

<template>
  <div class="overview-page">
  <div class="m3e-card service-summary-card">
    <div class="m3e-list">
      <div class="m3e-list-row service-state-row">
        <span class="m3e-list-row__icon">
          <Server :size="23" />
        </span>
        <div class="m3e-list-row__copy">
          <p class="m3e-list-row__title">Sub-Store 核心服务</p>
          <p class="m3e-list-row__summary">
            {{ status?.serviceRunning ? '运行中' : '未运行' }} ·
            {{ status?.mergeMode ? '合并端口' : '前后端分离' }}
          </p>
        </div>
        <span
          class="m3e-chip"
          :class="status?.serviceRunning ? 'm3e-chip--success' : 'm3e-chip--error'"
        >
          <CircleCheck v-if="status?.serviceRunning" :size="14" />
          <CircleStop v-else :size="14" />
          {{ status?.serviceRunning ? '运行中' : '已停止' }}
        </span>
      </div>
      <div class="status-metrics" aria-label="服务状态摘要">
        <div v-for="item in metricItems" :key="item.label" class="status-metric">
          <span class="status-metric__icon">
            <component :is="item.icon" :size="20" />
          </span>
          <span class="status-metric__copy">
            <span class="status-metric__label">{{ item.label }}</span>
            <strong class="status-metric__value">{{ item.value }}</strong>
          </span>
        </div>
      </div>
    </div>
  </div>

  <div class="section-heading">
    <div class="section-heading__copy">
      <h2 class="section-heading__title">访问入口</h2>
      <p class="section-heading__subtitle">从当前运行模式生成的本机地址</p>
    </div>
    <button type="button" class="m3e-button m3e-button--tonal" :disabled="busy" @click="handleOpen">
      <ExternalLink :size="18" />
      打开
    </button>
  </div>
  <div class="m3e-card m3e-card--filled">
    <div class="m3e-list">
      <div v-for="item in addresses" :key="item.label" class="m3e-list-row">
        <span class="m3e-list-row__icon">
          <Link2 :size="20" />
        </span>
        <div class="m3e-list-row__copy">
          <p class="m3e-list-row__title">{{ item.label }}</p>
          <p class="m3e-list-row__summary address-value">{{ item.value }}</p>
        </div>
      </div>
    </div>
  </div>

  <template v-if="securityIssues.length">
    <div class="section-heading">
      <div class="section-heading__copy">
        <h2 class="section-heading__title">安全检查</h2>
        <p class="section-heading__subtitle">仅在当前配置命中风险条件时显示</p>
      </div>
    </div>
    <div class="m3e-card">
      <div class="m3e-list">
        <div v-for="issue in securityIssues" :key="issue.title" class="m3e-list-row">
          <span class="m3e-list-row__icon">
            <ShieldAlert :size="20" />
          </span>
          <div class="m3e-list-row__copy">
            <p class="m3e-list-row__title">{{ issue.title }}</p>
            <p class="m3e-list-row__summary" style="white-space: normal">{{ issue.text }}</p>
          </div>
        </div>
      </div>
    </div>
  </template>

  <div class="section-heading">
    <div class="section-heading__copy">
      <h2 class="section-heading__title">服务控制</h2>
      <p class="section-heading__subtitle">操作在后台执行，不会阻塞当前页面</p>
    </div>
  </div>
  <div class="m3e-card">
    <div class="m3e-list">
      <button
        v-for="action in [
          { name: 'start', title: '启动服务', summary: '拉起 Sub-Store、HTTP-META 与前端', icon: Play },
          { name: 'stop', title: '停止服务', summary: '停止当前运行中的全部服务', icon: Square },
          { name: 'restart', title: '重启服务', summary: '重新载入配置并重启全部组件', icon: RotateCw },
        ]"
        :key="action.name"
        type="button"
        class="m3e-list-row"
        :class="{ 'is-loading': pendingAction && currentAction === action.name }"
        :disabled="pendingAction || (action.name === 'start' && status?.serviceRunning) || (action.name === 'stop' && !status?.serviceRunning)"
        @click="handleServiceAction(action.name)"
      >
        <span class="m3e-list-row__icon">
          <component :is="action.icon" :size="22" />
        </span>
        <span class="m3e-list-row__copy">
          <span class="m3e-list-row__title">{{ action.title }}</span>
          <span class="m3e-list-row__summary">{{ action.summary }}</span>
        </span>
        <M3LoadingIndicator
          v-if="pendingAction && currentAction === action.name"
          :size="21"
          tone="inherit"
          :label="`${action.title}执行中`"
        />
        <ChevronRight v-else :size="20" class="row-chevron" />
      </button>
    </div>
  </div>

  <OperationLogPanel
    :visible="visible"
    :content="content"
    :loading="pendingAction"
    title="本次操作日志"
  />

  <div v-if="error" class="m3e-error">
    <Power :size="18" />
    <span>{{ error }}</span>
  </div>
  </div>
</template>

<style scoped>
.service-state-row {
  min-height: 82px;
}

.status-metrics {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1px;
  overflow: hidden;
  border-radius: 5px 5px var(--m3e-radius-lg) var(--m3e-radius-lg);
  background: var(--md-sys-color-surface);
}

.status-metric {
  display: flex;
  min-width: 0;
  min-height: 78px;
  align-items: center;
  gap: 11px;
  padding: 12px 16px;
  background: var(--md-sys-color-surface-container-high);
}

.status-metric__icon {
  display: grid;
  flex: none;
  width: 22px;
  height: 22px;
  place-items: center;
  color: var(--md-sys-color-on-surface-variant);
}

.status-metric__copy {
  display: grid;
  min-width: 0;
  gap: 2px;
}

.status-metric__label {
  overflow: hidden;
  color: var(--md-sys-color-on-surface-variant);
  font-size: 12px;
  line-height: 1.3;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.status-metric__value {
  overflow-wrap: anywhere;
  color: var(--md-sys-color-on-surface);
  font-size: 15px;
  font-weight: 570;
  line-height: 1.35;
}

.row-chevron {
  flex: none;
  color: var(--md-sys-color-on-surface-variant);
}

button.m3e-list-row:disabled {
  cursor: not-allowed;
  opacity: 0.38;
}

@media (max-width: 360px) {
  .service-state-row .m3e-chip {
    display: none;
  }
}
</style>
