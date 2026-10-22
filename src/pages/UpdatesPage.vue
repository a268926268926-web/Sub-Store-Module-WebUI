<script setup>
import { computed, onActivated, onDeactivated, reactive, ref } from 'vue'
import {
  CalendarClock,
  CircleAlert,
  Clock3,
  History,
  Minus,
  Play,
  Plus,
  RefreshCw,
  Save,
  TimerReset,
} from '@lucide/vue'
import { useModuleState } from '../composables/useModuleState'
import { useOperationLog } from '../composables/useOperationLog'
import { showToast } from '../composables/useToast'
import M3Select from '../components/M3Select.vue'
import M3LoadingIndicator from '../components/M3LoadingIndicator.vue'
import OperationLogPanel from '../components/OperationLogPanel.vue'
import * as moduleApi from '../api/module'
import {
  formatMoment,
  intervalLabel,
  MAX_INTERVAL_DAYS,
  normalizeIntervalDays,
} from '../utils/schedule'

const { refreshStatus } = useModuleState()
const { content, visible, pending, runWithLog, followAutoUpdate } = useOperationLog()

const options = [
  { label: '全部更新', description: 'Sub-Store 前后端 + HTTP-META', value: 'all', command: 'update-all', args: [] },
  { label: '更新前后端', description: 'Sub-Store 前端与后端', value: 'sub-store', command: 'update-sub-store', args: [] },
  { label: '仅后端', description: '只替换 Sub-Store 后端', value: 'backend', command: 'update-backend', args: [] },
  { label: '仅前端', description: '只替换 Sub-Store 前端', command: 'update-frontend', args: [], value: 'frontend' },
  { label: 'HTTP-META 全部', description: 'JS + 模板 + Mihomo 内核', value: 'http-meta-all', command: 'update-http-meta', args: ['all'] },
  { label: 'HTTP-META 脚本', description: '只更新 JS 与模板文件', value: 'http-meta-js', command: 'update-http-meta', args: ['js'] },
  { label: 'Mihomo 稳定版', description: '更新稳定版内核', value: 'http-meta-kernel', command: 'update-http-meta', args: ['kernel'] },
  { label: 'Mihomo Alpha', description: '更新预览版内核', value: 'http-meta-alpha', command: 'update-http-meta', args: ['kernel-alpha'] },
]

const selectedCommand = ref(options[0].value)
const selectedOption = computed(() => (
  options.find((option) => option.value === selectedCommand.value) || options[0]
))

const autoStatus = ref(null)
const autoLoading = ref(true)
const autoSaving = ref(false)
const autoRunPending = ref(false)
const autoError = ref('')
const formDirty = ref(false)
let autoTimer
let active = false

const form = reactive({
  enabled: false,
  intervalDays: 7,
  hour: 4,
  minute: 30,
})
const autoControlsDisabled = computed(() => autoLoading.value || autoSaving.value)

const timeValue = computed({
  get: () => `${String(form.hour).padStart(2, '0')}:${String(form.minute).padStart(2, '0')}`,
  set: (value) => {
    const [hour, minute] = String(value).split(':').map(Number)
    if (Number.isInteger(hour) && Number.isInteger(minute)) {
      form.hour = hour
      form.minute = minute
      formDirty.value = true
    }
  },
})

const scheduleLabel = computed(() => intervalLabel(form.intervalDays))
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

function hydrateForm(status, force = false) {
  if (!status || (!force && formDirty.value)) return
  const days = status.schedule === 'daily'
    ? 1
    : status.intervalDays ?? (status.schedule === 'weekly' ? 7 : 1)
  form.enabled = status.enabled === true
  form.intervalDays = normalizeIntervalDays(days)
  form.hour = Number.isInteger(Number(status.hour)) ? Number(status.hour) : 4
  form.minute = Number.isInteger(Number(status.minute)) ? Number(status.minute) : 30
  formDirty.value = false
}

function markFormDirty() {
  formDirty.value = true
}

function normalizeIntervalInput() {
  form.intervalDays = normalizeIntervalDays(form.intervalDays)
  formDirty.value = true
}

function stepInterval(delta) {
  form.intervalDays = normalizeIntervalDays(Number(form.intervalDays) + delta)
  formDirty.value = true
}

function stopAutoPolling() {
  if (autoTimer) {
    window.clearTimeout(autoTimer)
    autoTimer = undefined
  }
}

function scheduleAutoPolling() {
  stopAutoPolling()
  if (!active || (!autoStatus.value?.running && !autoRunPending.value)) return
  autoTimer = window.setTimeout(async () => {
    await loadAutoStatus({ silent: true })
    scheduleAutoPolling()
  }, 1800)
}

async function loadAutoStatus({ notify = false, silent = false } = {}) {
  if (!silent) autoLoading.value = true
  autoError.value = ''
  try {
    const status = await moduleApi.getAutoUpdateStatus()
    if (!active) return
    autoStatus.value = status
    hydrateForm(status)
    if (notify) showToast('自动更新状态已刷新')
    if (status.running) scheduleAutoPolling()
  } catch (err) {
    autoError.value = err?.message || '读取自动更新状态失败'
  } finally {
    if (!silent) autoLoading.value = false
  }
}

async function saveAutoPlan() {
  normalizeIntervalInput()
  autoSaving.value = true
  autoError.value = ''
  try {
    const status = await moduleApi.saveAutoUpdateConfig({
      enabled: form.enabled,
      schedule: 'interval_days',
      hour: form.hour,
      minute: form.minute,
      intervalDays: form.intervalDays,
    })
    autoStatus.value = status
    hydrateForm(status, true)
    showToast(form.enabled ? `自动更新已设为${scheduleLabel.value}` : '自动更新已关闭')
  } catch (err) {
    autoError.value = err?.message || '保存自动更新配置失败'
    showToast(autoError.value, { tone: 'error' })
  } finally {
    autoSaving.value = false
  }
}

async function handleManualUpdate() {
  const option = selectedOption.value
  const ok = await runWithLog(option.command, {}, option.args)
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
    scheduleAutoPolling()
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
    stopAutoPolling()
  }
}

onActivated(() => {
  active = true
  loadAutoStatus()
})

onDeactivated(() => {
  active = false
  stopAutoPolling()
})
</script>

<template>
  <div class="updates-page">
    <div class="section-heading">
      <div class="section-heading__copy">
        <h2 class="section-heading__title">手动更新</h2>
        <p class="section-heading__subtitle">选择组件范围后在后台执行</p>
      </div>
    </div>
    <div class="m3e-card m3e-card__body manual-update-card">
      <M3Select
        v-model="selectedCommand"
        label="更新项"
        :options="options"
        :disabled="pending"
      />
      <div class="update-action-row">
        <span>Alpha 内核需要手动选择</span>
        <button
          type="button"
          class="m3e-button"
          :class="{ 'is-loading': pending }"
          :disabled="pending"
          @click="handleManualUpdate"
        >
          <M3LoadingIndicator v-if="pending" :size="20" tone="inherit" />
          <RefreshCw v-else :size="18" />
          {{ pending ? '更新中' : '开始更新' }}
        </button>
      </div>
    </div>

    <div class="section-heading">
      <div class="section-heading__copy">
        <h2 class="section-heading__title">自动更新</h2>
        <p class="section-heading__subtitle">关闭面板后仍由模块后台执行</p>
      </div>
      <span
        class="m3e-chip"
        :class="formDirty ? 'm3e-chip--warning' : autoStatusTone"
      >
        {{ formDirty ? '待保存' : autoStatusText }}
      </span>
    </div>

    <div class="m3e-card auto-update-card">
      <div class="m3e-list">
        <label class="m3e-list-row auto-enable-row">
          <span class="m3e-list-row__icon">
            <CalendarClock :size="22" />
          </span>
          <span class="m3e-list-row__copy">
            <span class="m3e-list-row__title">定时执行全部更新</span>
            <span class="m3e-list-row__summary">
              {{ form.enabled ? `${scheduleLabel} · ${timeValue}` : '关闭时不会创建后台计划' }}
            </span>
          </span>
          <span class="m3e-switch" aria-label="启用自动更新">
            <input
              v-model="form.enabled"
              type="checkbox"
              :disabled="autoControlsDisabled"
              @change="markFormDirty"
            >
            <span class="m3e-switch__track">
              <span class="m3e-switch__thumb" />
            </span>
          </span>
        </label>

        <div class="m3e-list-row auto-setting-row">
          <span class="m3e-list-row__icon">
            <TimerReset :size="22" />
          </span>
          <span class="m3e-list-row__copy">
            <span class="m3e-list-row__title">执行周期</span>
            <span class="m3e-list-row__summary">{{ scheduleLabel }}执行一次</span>
          </span>
          <span class="interval-stepper">
            <button
              type="button"
              class="interval-stepper__button"
              aria-label="减少一天"
              :disabled="autoControlsDisabled || form.intervalDays <= 1"
              @click="stepInterval(-1)"
            >
              <Minus :size="18" />
            </button>
            <input
              v-model.number="form.intervalDays"
              type="number"
              inputmode="numeric"
              min="1"
              :max="MAX_INTERVAL_DAYS"
              aria-label="自动更新间隔天数"
              :disabled="autoControlsDisabled"
              @input="markFormDirty"
              @blur="normalizeIntervalInput"
              @change="normalizeIntervalInput"
            >
            <span>天</span>
            <button
              type="button"
              class="interval-stepper__button"
              aria-label="增加一天"
              :disabled="autoControlsDisabled || form.intervalDays >= MAX_INTERVAL_DAYS"
              @click="stepInterval(1)"
            >
              <Plus :size="18" />
            </button>
          </span>
        </div>

        <label class="m3e-list-row auto-setting-row">
          <span class="m3e-list-row__icon">
            <Clock3 :size="22" />
          </span>
          <span class="m3e-list-row__copy">
            <span class="m3e-list-row__title">执行时间</span>
            <span class="m3e-list-row__summary">按设备本地时间运行</span>
          </span>
          <input
            v-model="timeValue"
            class="row-time-input"
            type="time"
            step="60"
            aria-label="自动更新时间"
            :disabled="autoControlsDisabled"
          >
        </label>
      </div>
    </div>

    <div class="m3e-card auto-status-card">
      <div class="m3e-list">
        <div class="m3e-list-row auto-status-row">
          <span class="auto-status-row__label">
            <TimerReset :size="18" />
            下次执行
          </span>
          <strong>{{ formatMoment(autoStatus?.nextRun) }}</strong>
        </div>
        <div class="m3e-list-row auto-status-row">
          <span class="auto-status-row__label">
            <History :size="18" />
            上次执行
          </span>
          <strong>{{ formatMoment(autoStatus?.lastRun) }}</strong>
        </div>
        <div class="m3e-list-row auto-status-row">
          <span class="auto-status-row__label">
            <Clock3 :size="18" />
            上次结果
          </span>
          <span class="m3e-chip" :class="lastStatusTone">{{ lastStatusText }}</span>
        </div>
        <div
          v-if="autoStatus?.lastStatus && autoStatus.lastStatus !== 'never' && autoStatus.lastResult"
          class="m3e-list-row auto-result-row"
        >
          <span>结果说明</span>
          <strong>{{ autoStatus.lastResult }}</strong>
        </div>
      </div>
    </div>

    <div class="m3e-button-row auto-actions">
      <button
        type="button"
        class="m3e-button m3e-button--tonal"
        :class="{ 'is-loading': autoSaving }"
        :disabled="autoControlsDisabled"
        @click="saveAutoPlan"
      >
        <M3LoadingIndicator v-if="autoSaving" :size="19" tone="inherit" />
        <Save v-else :size="18" />
        {{ autoSaving ? '保存中' : '保存计划' }}
      </button>
      <button
        type="button"
        class="m3e-button m3e-button--outline"
        :class="{ 'is-loading': autoRunPending || autoStatus?.running }"
        :disabled="autoRunPending || pending || autoStatus?.running"
        @click="runAutoNow"
      >
        <M3LoadingIndicator
          v-if="autoRunPending || autoStatus?.running"
          :size="19"
          tone="inherit"
        />
        <Play v-else :size="18" />
        {{ autoRunPending || autoStatus?.running ? '执行中' : '立即测试' }}
      </button>
    </div>

    <div v-if="autoError" class="m3e-error">
      <CircleAlert :size="18" />
      <span>{{ autoError }}</span>
    </div>

    <OperationLogPanel
      :visible="visible"
      :content="content"
      :loading="pending || autoRunPending"
      title="更新日志"
      fill
    />
  </div>
</template>

<style scoped>
.manual-update-card,
.auto-update-card {
  background: var(--md-sys-color-surface-container-high);
}

.update-action-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-top: 18px;
  padding-top: 16px;
  border-top: 1px solid color-mix(in srgb, var(--md-sys-color-outline-variant) 44%, transparent);
}

.update-action-row span {
  color: var(--md-sys-color-on-surface-variant);
  font-size: 14px;
  line-height: 1.45;
}

.auto-enable-row {
  cursor: pointer;
}

.auto-setting-row {
  gap: 12px;
}

.interval-stepper {
  display: flex;
  flex: none;
  align-items: center;
  gap: 2px;
  min-height: 44px;
  padding: 2px;
  border-radius: var(--m3e-radius-full);
  background: var(--md-sys-color-surface-container-highest);
}

.interval-stepper__button {
  display: grid;
  width: 40px;
  height: 40px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  place-items: center;
  background: transparent;
  color: var(--md-sys-color-on-surface-variant);
  cursor: pointer;
}

.interval-stepper__button:hover {
  background: color-mix(in srgb, var(--md-sys-color-on-surface) 8%, transparent);
}

.interval-stepper__button:disabled {
  cursor: not-allowed;
  opacity: 0.32;
}

.interval-stepper input {
  width: 42px;
  height: 38px;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--md-sys-color-on-surface);
  font-size: 16px;
  font-weight: 650;
  text-align: center;
  outline: 0;
  appearance: textfield;
}

.interval-stepper input::-webkit-inner-spin-button,
.interval-stepper input::-webkit-outer-spin-button {
  margin: 0;
  appearance: none;
}

.interval-stepper > span {
  margin-right: 7px;
  color: var(--md-sys-color-on-surface-variant);
  font-size: 13px;
}

.row-time-input {
  flex: none;
  min-width: 112px;
  min-height: 44px;
  padding: 0 10px;
  border: 1px solid transparent;
  border-radius: var(--m3e-radius-sm);
  background: transparent;
  color: var(--md-sys-color-on-surface);
  font-size: 15px;
  font-weight: 600;
  text-align: center;
  outline: 0;
}

.row-time-input:hover,
.row-time-input:focus {
  border-color: var(--md-sys-color-outline-variant);
  background: var(--md-sys-color-surface-container);
}

.auto-status-card {
  margin-top: 12px;
}

.auto-status-row,
.auto-result-row {
  min-height: 58px;
  justify-content: space-between;
  gap: 16px;
}

.auto-status-row__label {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  color: var(--md-sys-color-on-surface-variant);
  font-size: 14px;
}

.auto-status-row__label svg {
  color: var(--md-sys-color-on-surface-variant);
}

.auto-status-row strong,
.auto-result-row strong {
  min-width: 0;
  color: var(--md-sys-color-on-surface);
  font-size: 14px;
  font-weight: 620;
  overflow-wrap: anywhere;
  text-align: right;
}

.auto-result-row > span {
  flex: none;
  color: var(--md-sys-color-on-surface-variant);
  font-size: 14px;
}

.auto-actions {
  margin-top: 12px;
}

@media (max-width: 420px) {
  .update-action-row {
    align-items: stretch;
    flex-direction: column;
  }

  .update-action-row .m3e-button {
    align-self: flex-end;
    width: auto;
  }

  .auto-setting-row {
    align-items: flex-start;
    flex-wrap: wrap;
  }

  .auto-setting-row .m3e-list-row__copy {
    flex-basis: calc(100% - 40px);
  }

  .interval-stepper,
  .row-time-input {
    margin-left: 40px;
  }

  .row-time-input {
    width: calc(100% - 40px);
  }
}

@media (max-width: 350px) {
  .auto-actions .m3e-button {
    flex-basis: 100%;
  }
}
</style>
