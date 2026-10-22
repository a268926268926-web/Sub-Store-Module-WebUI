<script setup>
import { computed, onActivated, onDeactivated, reactive, ref } from 'vue'
import {
  CalendarClock,
  CircleAlert,
  Clock3,
  History,
  Play,
  RefreshCw,
  Save,
  TimerReset,
} from '@lucide/vue'
import { useModuleState } from '../composables/useModuleState'
import { useOperationLog } from '../composables/useOperationLog'
import { showToast } from '../composables/useToast'
import OperationLogPanel from '../components/OperationLogPanel.vue'
import * as moduleApi from '../api/module'

const { refreshStatus } = useModuleState()
const { content, visible, pending, runWithLog, followAutoUpdate } = useOperationLog()

const options = [
  { text: '全部更新', summary: 'Sub-Store 前后端 + HTTP-META', cmd: 'update-all' },
  { text: '更新前后端', summary: 'Sub-Store 前端与后端', cmd: 'update-sub-store' },
  { text: '仅后端', summary: '只替换 Sub-Store 后端', cmd: 'update-backend' },
  { text: '仅前端', summary: '只替换 Sub-Store 前端', cmd: 'update-frontend' },
  { text: 'HTTP-META 全部', summary: 'JS + 模板 + Mihomo 内核', cmd: 'update-http-meta all' },
  { text: 'HTTP-META 脚本', summary: '只更新 JS 与模板文件', cmd: 'update-http-meta js' },
  { text: 'Mihomo 稳定版', summary: '更新稳定版内核', cmd: 'update-http-meta kernel' },
  { text: 'Mihomo Alpha', summary: '更新预览版内核', cmd: 'update-http-meta kernel-alpha' },
]

const selectedCommand = ref(options[0].cmd)
const selectedOption = computed(() => options.find((item) => item.cmd === selectedCommand.value) || options[0])

const autoStatus = ref(null)
const autoLoading = ref(true)
const autoSaving = ref(false)
const autoRunPending = ref(false)
const autoError = ref('')
let autoTimer

const form = reactive({
  enabled: false,
  schedule: 'daily',
  hour: 4,
  minute: 30,
})

const timeValue = computed({
  get: () => `${String(form.hour).padStart(2, '0')}:${String(form.minute).padStart(2, '0')}`,
  set: (value) => {
    const [hour, minute] = String(value).split(':').map(Number)
    if (Number.isInteger(hour) && Number.isInteger(minute)) {
      form.hour = hour
      form.minute = minute
    }
  },
})

const scheduleLabel = computed(() => form.schedule === 'daily' ? '每天' : '每 7 天')
const autoStatusText = computed(() => {
  if (!autoStatus.value) return '等待读取'
  if (autoStatus.value.configValid === false) return '配置异常'
  if (autoStatus.value.running) return '正在更新'
  if (!autoStatus.value.enabled) return '未启用'
  return autoStatus.value.daemonRunning === false ? '调度器离线' : '计划已启用'
})
const autoStatusTone = computed(() => {
  if (!autoStatus.value) return ''
  if (autoStatus.value.configValid === false) return 'm3e-chip--error'
  if (autoStatus.value.running) return 'm3e-chip--warning'
  if (!autoStatus.value.enabled) return ''
  return autoStatus.value.daemonRunning === false ? 'm3e-chip--error' : 'm3e-chip--success'
})
const lastStatusText = computed(() => {
  const status = autoStatus.value?.lastStatus
  if (!status || status === 'never') return '尚未执行'
  if (status === 'success' || status === 'complete') return '成功'
  if (status === 'running') return '执行中'
  if (status === 'queued') return '等待执行'
  if (status === 'skipped') return '已跳过'
  if (status === 'failed' || status === 'error') return '失败'
  return status
})
const lastStatusTone = computed(() => {
  const status = autoStatus.value?.lastStatus
  if (status === 'failed' || status === 'error') return 'm3e-chip--error'
  if (status === 'running') return 'm3e-chip--warning'
  if (status === 'queued') return 'm3e-chip--warning'
  if (status === 'skipped') return 'm3e-chip--warning'
  if (status === 'success' || status === 'complete') return 'm3e-chip--success'
  return ''
})

function formatMoment(value) {
  if (!value || value === 'never') return '尚未安排'
  const numeric = Number(value)
  const date = Number.isFinite(numeric) && numeric > 0
    ? new Date(numeric < 1e12 ? numeric * 1000 : numeric)
    : new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

function hydrateForm(status) {
  if (!status) return
  form.enabled = status.enabled === true
  form.schedule = status.schedule === 'daily' ? 'daily' : 'interval_days'
  form.hour = Number.isInteger(Number(status.hour)) ? Number(status.hour) : 4
  form.minute = Number.isInteger(Number(status.minute)) ? Number(status.minute) : 30
}

async function loadAutoStatus({ notify = false } = {}) {
  autoLoading.value = true
  autoError.value = ''
  try {
    const status = await moduleApi.getAutoUpdateStatus()
    autoStatus.value = status
    hydrateForm(status)
    if (notify) showToast('自动更新状态已刷新')
  } catch (err) {
    autoError.value = err?.message || '读取自动更新状态失败'
  } finally {
    autoLoading.value = false
  }
}

async function saveAutoPlan() {
  autoSaving.value = true
  autoError.value = ''
  try {
    const status = await moduleApi.saveAutoUpdateConfig({
      enabled: form.enabled,
      schedule: form.schedule,
      hour: form.hour,
      minute: form.minute,
      intervalDays: form.schedule === 'interval_days' ? 7 : 1,
    })
    autoStatus.value = status
    hydrateForm(status)
    showToast(form.enabled ? '自动更新计划已保存' : '自动更新已关闭')
  } catch (err) {
    autoError.value = err?.message || '保存自动更新配置失败'
    showToast(autoError.value, { tone: 'error' })
  } finally {
    autoSaving.value = false
  }
}

async function handleManualUpdate() {
  const ok = await runWithLog(selectedCommand.value)
  await Promise.all([
    refreshStatus(false),
    loadAutoStatus(),
  ])
  showToast(ok ? '更新任务已结束' : '更新任务失败', { tone: ok ? 'neutral' : 'error' })
}

async function runAutoNow() {
  autoRunPending.value = true
  autoError.value = ''
  visible.value = true
  content.value = '自动更新任务已接收，等待输出…'
  try {
    const result = await moduleApi.runAutoUpdateNow()
    if (result.accepted !== true && result.ok !== true) {
      throw new Error(result.message || '调度器未接受任务')
    }
    const finalStatus = await followAutoUpdate()
    const ok = finalStatus?.lastStatus === 'success'
    await Promise.all([
      refreshStatus(false),
      loadAutoStatus(),
    ])
    showToast(ok ? '自动更新测试已完成' : '自动更新测试失败', { tone: ok ? 'neutral' : 'error' })
  } catch (err) {
    autoError.value = err?.message || '立即执行失败'
    showToast(autoError.value, { tone: 'error' })
  } finally {
    autoRunPending.value = false
  }
}

function startAutoPolling() {
  stopAutoPolling()
  autoTimer = window.setInterval(() => {
    if (autoStatus.value?.running || pending.value || autoRunPending.value) {
      loadAutoStatus()
    }
  }, 15000)
}

function stopAutoPolling() {
  if (autoTimer) {
    window.clearInterval(autoTimer)
    autoTimer = undefined
  }
}

onActivated(() => {
  loadAutoStatus()
  startAutoPolling()
})

onDeactivated(stopAutoPolling)
</script>

<template>
  <div class="updates-page">
  <div class="section-heading">
    <div class="section-heading__copy">
      <h2 class="section-heading__title">手动更新</h2>
      <p class="section-heading__subtitle">稳定渠道 · Alpha 内核需要手动选择</p>
    </div>
  </div>
  <div class="m3e-card m3e-card__body">
    <label class="m3e-field">
      <span class="m3e-field__label">更新项</span>
      <select v-model="selectedCommand" :disabled="pending">
        <option v-for="option in options" :key="option.cmd" :value="option.cmd">
          {{ option.text }}
        </option>
      </select>
    </label>
    <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 16px">
      <span style="color: var(--md-sys-color-on-surface-variant); font-size: 13px">
        {{ selectedOption.summary }}
      </span>
      <button
        type="button"
        class="m3e-button"
        :disabled="pending"
        @click="handleManualUpdate"
      >
        <RefreshCw :size="18" :class="{ 'is-spinning': pending }" />
        {{ pending ? '更新中…' : '开始更新' }}
      </button>
    </div>
  </div>

  <div class="section-heading">
    <div class="section-heading__copy">
      <h2 class="section-heading__title">自动更新</h2>
      <p class="section-heading__subtitle">由模块后台调度，关闭面板后仍会执行</p>
    </div>
    <span class="m3e-chip" :class="autoStatusTone">{{ autoStatusText }}</span>
  </div>
  <div class="m3e-card m3e-card__body">
    <div class="auto-update-header">
      <span class="auto-update-header__icon">
        <CalendarClock :size="24" />
      </span>
      <div class="auto-update-header__copy">
        <p class="auto-update-header__title">定时执行全部更新</p>
        <p class="auto-update-header__summary">稳定渠道 · 默认关闭 · 设备醒着时补跑</p>
      </div>
      <label class="m3e-switch" aria-label="启用自动更新">
        <input v-model="form.enabled" type="checkbox" :disabled="autoLoading">
        <span class="m3e-switch__track">
          <span class="m3e-switch__thumb" />
        </span>
      </label>
    </div>

    <div class="auto-update-controls">
      <div class="m3e-field">
        <span class="m3e-field__label">执行周期</span>
        <div class="segmented-control" role="tablist" aria-label="自动更新周期">
          <button
            type="button"
            role="tab"
            :aria-selected="form.schedule === 'daily'"
            :disabled="autoLoading"
            @click="form.schedule = 'daily'"
          >
            每天
          </button>
          <button
            type="button"
            role="tab"
            :aria-selected="form.schedule === 'interval_days'"
            :disabled="autoLoading"
            @click="form.schedule = 'interval_days'"
          >
            每 7 天
          </button>
        </div>
      </div>
      <div class="m3e-inline-fields">
        <label class="m3e-field">
          <span class="m3e-field__label">执行时间</span>
          <input v-model="timeValue" type="time" step="60" :disabled="autoLoading">
        </label>
        <div class="m3e-field">
          <span class="m3e-field__label">下次计划</span>
          <div class="m3e-field" style="min-height: 48px; display: flex; justify-content: center; padding: 0 2px">
            <strong style="font-size: 14px">{{ formatMoment(autoStatus?.nextRun) }}</strong>
          </div>
        </div>
      </div>
      <div class="m3e-button-row">
        <button
          type="button"
          class="m3e-button m3e-button--tonal"
          :disabled="autoSaving || autoLoading"
          @click="saveAutoPlan"
        >
          <Save :size="18" />
          {{ autoSaving ? '保存中…' : '保存计划' }}
        </button>
        <button
          type="button"
          class="m3e-button m3e-button--outline"
          :disabled="autoRunPending || pending || autoStatus?.running"
          @click="runAutoNow"
        >
          <Play :size="18" />
          {{ autoRunPending || autoStatus?.running ? '执行中…' : '立即测试' }}
        </button>
      </div>
    </div>

    <div class="auto-update-status">
      <div class="auto-update-status__row">
        <span><Clock3 :size="15" style="vertical-align: -3px" /> 调度周期</span>
        <strong>{{ scheduleLabel }} {{ timeValue }}</strong>
      </div>
      <div class="auto-update-status__row">
        <span><History :size="15" style="vertical-align: -3px" /> 上次执行</span>
        <strong>{{ formatMoment(autoStatus?.lastRun) }}</strong>
      </div>
      <div class="auto-update-status__row">
        <span><TimerReset :size="15" style="vertical-align: -3px" /> 上次结果</span>
        <span class="m3e-chip" :class="lastStatusTone">{{ lastStatusText }}</span>
      </div>
      <div v-if="autoStatus?.lastResult" class="auto-update-status__row">
        <span>结果说明</span>
        <strong style="max-width: 70%; overflow-wrap: anywhere">{{ autoStatus.lastResult }}</strong>
      </div>
    </div>

    <div v-if="autoError" class="m3e-error">
      <CircleAlert :size="18" />
      <span>{{ autoError }}</span>
    </div>
  </div>

  <OperationLogPanel :visible="visible" :content="content" title="更新日志" fill />
  </div>
</template>

<style scoped>
.is-spinning {
  animation: spin 900ms linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
