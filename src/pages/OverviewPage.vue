<script setup>
import { computed, onActivated, ref } from 'vue'
import {
  ChevronDown,
  CircleCheck,
  ExternalLink,
  Link2,
  LoaderCircle,
  Play,
  Power,
  RotateCw,
  Server,
  ShieldAlert,
  ShieldCheck,
  Square,
} from '@lucide/vue'
import { useModuleState } from '../composables/useModuleState'
import { useOperationLog } from '../composables/useOperationLog'
import { showToast } from '../composables/useToast'
import OperationLogPanel from '../components/OperationLogPanel.vue'
import * as moduleApi from '../api/module'
import {
  buildServiceAddresses,
  serviceModeText,
  serviceStateText,
} from '../utils/overview'

const { status, loading, busy, error, refreshStatus, runAction } = useModuleState()

onActivated(() => {
  refreshStatus(false)
})

const metricItems = computed(() => {
  if (!status.value) {
    const value = loading.value ? '读取中' : '不可用'
    return [
      { label: '开机自启', value, icon: Power },
      { label: '配置状态', value, icon: CircleCheck },
      { label: '运行用户', value, icon: ShieldAlert },
    ]
  }
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
  ]
})

const serviceActions = computed(() => {
  if (!status.value) return []
  if (status.value.serviceRunning) {
    return [
      { name: 'restart', title: '重启服务', icon: RotateCw, tone: 'tonal' },
      { name: 'stop', title: '停止服务', icon: Square, tone: 'outline' },
    ]
  }
  return [{ name: 'start', title: '启动服务', icon: Play, tone: 'filled', wide: true }]
})

const addresses = computed(() => buildServiceAddresses(status.value))

const { content, visible } = useOperationLog()
const currentAction = ref('')
const pendingAction = ref(false)
const expandedIssue = ref('')

const serviceStateLabel = computed(() => serviceStateText({
  status: status.value,
  loading: loading.value,
  pendingAction: pendingAction.value,
  currentAction: currentAction.value,
}))
const serviceMode = computed(() => serviceModeText(status.value, loading.value))

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function pollUntil(predicate, timeoutMs, intervalMs = 600, onPoll) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    await refreshStatus(false)
    if (onPoll) await onPoll()
    if (predicate()) return true
    await sleep(intervalMs)
  }
  return false
}

async function pollServiceState(name, onPoll) {
  if (name === 'restart') {
    const stopped = await pollUntil(() => status.value?.serviceRunning === false, 6000, 600, onPoll)
    if (!stopped) return false
    return pollUntil(() => status.value?.serviceRunning === true, 15000, 600, onPoll)
  } else if (name === 'start') {
    return pollUntil(() => status.value?.serviceRunning === true, 12000, 600, onPoll)
  }
  return pollUntil(() => status.value?.serviceRunning === false, 10000, 600, onPoll)
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
      const confirmed = await pollServiceState(name, async () => {
        const log = await moduleApi.getLog().catch(() => '')
        if (log) content.value = log
      })
      if (!confirmed) {
        const current = status.value == null
          ? '状态未知'
          : status.value.serviceRunning ? '运行中' : '已停止'
        throw new Error(`操作已发出，但服务状态未能确认（当前为${current}）`)
      }
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

function handleOpen(item) {
  if (item?.openValue && !busy.value) {
    runAction('open', () => moduleApi.openUrl(item.openValue))
  }
}

function toggleIssue(title) {
  expandedIssue.value = expandedIssue.value === title ? '' : title
}

const securityIssues = computed(() => {
  if (!status.value) return []
  const issues = []
  if (status.value.backendPathIsDefault) {
    issues.push({
      title: '访问路径仍为模块默认值',
      shortTitle: '默认访问路径',
      hint: '入口仍与默认值相同',
      text: '建议在配置页重新生成随机路径，避免不同安装实例使用同一入口。',
    })
  }
  if (status.value.backendPathIsEmpty && status.value.crosAllowedOriginsIsAll) {
    issues.push({
      title: '开放路径与跨域策略较宽',
      shortTitle: '跨域范围过宽',
      hint: '允许所有来源访问',
      text: '后端路径为根路径且允许所有来源，建议生成随机路径或限制可信来源。',
    })
  }
  if (status.value.runUserIsRoot) {
    issues.push({
      title: '服务正在以 root 运行',
      shortTitle: 'Root 运行',
      hint: '建议改用 shell',
      text: '除非确有权限需求，建议将 run_as_user 改为 shell，缩小服务被利用后的影响面。',
    })
  }
  return issues
})
</script>

<template>
  <div class="overview-page">
    <div class="overview-layout">
      <section class="overview-section overview-section--service" aria-labelledby="service-heading">
        <div class="overview-section__heading">
          <h2 id="service-heading">服务</h2>
          <span>{{ serviceMode }}</span>
        </div>

        <div class="service-panel m3e-card">
          <div class="service-header">
            <span class="service-header__icon">
              <Server :size="23" />
            </span>
            <div class="service-header__copy">
              <div class="service-header__title-line">
                <h3>Sub-Store</h3>
                <span
                  class="service-state"
                  :class="{
                    'is-running': status?.serviceRunning && !pendingAction,
                    'is-pending': pendingAction,
                    'is-unavailable': !status,
                  }"
                  aria-live="polite"
                >
                  <i aria-hidden="true" />
                  {{ serviceStateLabel }}
                </span>
              </div>
              <p>
                Android 订阅管理服务
                <template v-if="status"> · {{ status.runUserIsRoot ? 'ROOT' : 'SHELL' }}</template>
              </p>
            </div>
            <div class="service-actions">
              <button
                v-for="action in serviceActions"
                :key="action.name"
                type="button"
                class="m3e-button service-action-button"
                :class="{
                  'm3e-button--tonal': action.tone === 'tonal',
                  'm3e-button--outline': action.tone === 'outline',
                  'service-action-button--wide': action.wide,
                  'is-loading': pendingAction && currentAction === action.name,
                }"
                :title="action.title"
                :aria-label="action.title"
                :disabled="pendingAction"
                @click="handleServiceAction(action.name)"
              >
                <LoaderCircle
                  v-if="pendingAction && currentAction === action.name"
                  :size="18"
                  class="service-action-spinner"
                  aria-hidden="true"
                />
                <component :is="action.icon" v-else :size="18" />
                <span v-if="action.wide">
                  {{ pendingAction && currentAction === action.name ? '处理中' : '启动' }}
                </span>
              </button>
            </div>
          </div>

          <div class="service-metrics" aria-label="服务运行详情">
            <div v-for="item in metricItems" :key="item.label" class="service-metric">
              <span class="service-metric__icon">
                <component :is="item.icon" :size="17" />
              </span>
              <span class="service-metric__copy">
                <span>{{ item.label }}</span>
                <strong>{{ item.value }}</strong>
              </span>
            </div>
          </div>

          <template
            v-for="item in addresses"
            :key="item.label"
          >
            <button
              v-if="item.openValue"
              type="button"
              class="endpoint-row"
              :disabled="busy"
              :aria-label="`打开${item.label}`"
              @click="handleOpen(item)"
            >
              <Link2 :size="20" class="endpoint-row__icon" />
              <span class="endpoint-row__copy">
                <span>{{ item.label }}</span>
                <code>{{ item.displayValue }}</code>
              </span>
              <LoaderCircle
                v-if="busy"
                :size="18"
                class="endpoint-row__loading"
                aria-hidden="true"
              />
              <ExternalLink v-else :size="18" class="endpoint-row__arrow" />
            </button>
            <div v-else class="endpoint-row endpoint-row--static">
              <Link2 :size="20" class="endpoint-row__icon" />
              <span class="endpoint-row__copy">
                <span>{{ item.label }}</span>
                <code>{{ item.displayValue }}</code>
              </span>
            </div>
          </template>
          <div v-if="!status" class="endpoint-row endpoint-row--static">
            <Link2 :size="20" class="endpoint-row__icon" />
            <span class="endpoint-row__copy">
              <span>访问地址</span>
              <code>{{ loading ? '正在读取运行状态…' : '状态不可用' }}</code>
            </span>
          </div>
        </div>
      </section>

      <section class="overview-section overview-section--security" aria-labelledby="security-heading">
        <div class="overview-section__heading">
          <h2 id="security-heading">安全建议</h2>
          <span
            v-if="securityIssues.length"
            class="m3e-chip m3e-chip--warning"
          >{{ securityIssues.length }} 项</span>
          <span v-else-if="status">未发现风险</span>
          <span v-else>{{ loading ? '读取中' : '状态不可用' }}</span>
        </div>

        <div class="security-panel m3e-card">
          <template v-if="status && securityIssues.length">
            <button
              v-for="issue in securityIssues"
              :key="issue.title"
              type="button"
              class="security-row"
              :class="{ 'is-expanded': expandedIssue === issue.title }"
              :aria-expanded="expandedIssue === issue.title"
              @click="toggleIssue(issue.title)"
            >
              <span class="security-row__icon">
                <ShieldAlert :size="19" />
              </span>
              <span class="security-row__copy">
                <strong>{{ issue.shortTitle }}</strong>
                <small>{{ expandedIssue === issue.title ? issue.text : issue.hint }}</small>
              </span>
              <ChevronDown :size="18" class="security-row__chevron" aria-hidden="true" />
            </button>
          </template>
          <div v-else-if="status" class="security-safe">
            <span><ShieldCheck :size="21" /></span>
            <div>
              <strong>当前配置正常</strong>
              <small>没有发现需要处理的访问或权限风险。</small>
            </div>
          </div>
          <div v-else class="security-safe">
            <span>
              <LoaderCircle
                v-if="loading"
                :size="20"
                class="security-loading-spinner"
                aria-hidden="true"
              />
              <ShieldAlert v-else :size="20" />
            </span>
            <div>
              <strong>{{ loading ? '正在读取安全状态' : '安全状态不可用' }}</strong>
              <small>{{ loading ? '请稍候…' : (error || '请刷新后重试') }}</small>
            </div>
          </div>
        </div>
      </section>
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
.overview-layout {
  display: grid;
  gap: 26px;
}

.overview-section {
  min-width: 0;
}

.overview-section__heading {
  display: flex;
  min-height: 30px;
  align-items: center;
  gap: 9px;
  margin: 0 8px 9px;
}

.overview-section__heading h2 {
  margin: 0;
  font-size: 14px;
  font-weight: 610;
  line-height: 1.3;
}

.overview-section__heading > span:not(.m3e-chip) {
  min-width: 0;
  margin-left: auto;
  color: var(--md-sys-color-on-surface-variant);
  font-size: 12px;
}

.overview-section__heading .m3e-chip {
  margin-left: auto;
}

.service-panel {
  background: var(--md-sys-color-surface-container-high);
}

.service-header {
  display: flex;
  min-height: 90px;
  align-items: center;
  gap: 13px;
  padding: 18px 16px 16px 20px;
}

.service-header__icon {
  display: grid;
  flex: none;
  width: 30px;
  height: 30px;
  place-items: center;
  color: var(--md-sys-color-on-surface-variant);
}

.service-header__copy {
  min-width: 0;
  flex: 1;
}

.service-header__title-line {
  display: flex;
  min-width: 0;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.service-header h3 {
  overflow: hidden;
  margin: 0;
  font-size: 18px;
  font-weight: 630;
  line-height: 1.3;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.service-header p {
  overflow: hidden;
  margin: 3px 0 0;
  color: var(--md-sys-color-on-surface-variant);
  font-size: 13px;
  line-height: 1.4;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.service-state {
  display: inline-flex;
  flex: none;
  align-items: center;
  gap: 6px;
  color: var(--md-sys-color-on-surface-variant);
  font-size: 12px;
  font-weight: 610;
}

.service-state i {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--md-sys-color-error);
}

.service-state.is-running i {
  background: var(--md-sys-color-primary);
}

.service-state.is-pending i {
  background: var(--md-sys-color-tertiary);
}

.service-state.is-unavailable i {
  background: transparent;
  box-shadow: inset 0 0 0 1.5px var(--md-sys-color-outline);
}

.service-actions {
  display: flex;
  flex: none;
  align-items: center;
  gap: 6px;
  margin-left: auto;
}

.service-action-button {
  min-height: 42px;
  width: 42px;
  padding: 0;
}

.service-action-button--wide {
  width: auto;
  padding: 0 15px;
  font-size: 14px;
}

.service-action-button.is-loading:disabled {
  opacity: 1;
}

.service-action-spinner,
.endpoint-row__loading {
  animation: service-action-spin 720ms linear infinite;
}

@keyframes service-action-spin {
  to {
    transform: rotate(360deg);
  }
}

.service-metrics {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  border-top: 1px solid color-mix(in srgb, var(--md-sys-color-outline-variant) 32%, transparent);
}

.service-metric {
  display: flex;
  min-width: 0;
  min-height: 68px;
  align-items: center;
  gap: 9px;
  padding: 11px 13px;
  border-right: 1px solid color-mix(in srgb, var(--md-sys-color-outline-variant) 28%, transparent);
}

.service-metric:last-child {
  border-right: 0;
}

.service-metric__icon {
  display: grid;
  flex: none;
  width: 18px;
  height: 18px;
  place-items: center;
  color: var(--md-sys-color-on-surface-variant);
}

.service-metric__copy {
  display: grid;
  min-width: 0;
  gap: 2px;
}

.service-metric__copy > span {
  overflow: hidden;
  color: var(--md-sys-color-on-surface-variant);
  font-size: 11px;
  line-height: 1.3;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.service-metric strong {
  overflow-wrap: anywhere;
  color: var(--md-sys-color-on-surface);
  font-size: 14px;
  font-weight: 620;
  line-height: 1.35;
}

.endpoint-row {
  display: flex;
  width: 100%;
  min-height: 70px;
  align-items: center;
  gap: 12px;
  padding: 12px 16px 13px 20px;
  border: 0;
  border-top: 1px solid color-mix(in srgb, var(--md-sys-color-outline-variant) 32%, transparent);
  background: var(--md-sys-color-surface-container);
  color: inherit;
  text-align: left;
  cursor: pointer;
}

.endpoint-row:hover {
  background: var(--md-sys-color-surface-container-highest);
}

.endpoint-row--static {
  cursor: default;
}

.endpoint-row--static:hover {
  background: var(--md-sys-color-surface-container);
}

.endpoint-row:disabled {
  cursor: wait;
  opacity: 0.7;
}

.endpoint-row__icon {
  flex: none;
  color: var(--md-sys-color-on-surface-variant);
}

.endpoint-row__copy {
  display: grid;
  min-width: 0;
  flex: 1;
  gap: 3px;
}

.endpoint-row__copy > span {
  color: var(--md-sys-color-on-surface-variant);
  font-size: 11px;
  font-weight: 610;
}

.endpoint-row code {
  display: -webkit-box;
  overflow: hidden;
  color: var(--md-sys-color-on-surface);
  font-family: ui-monospace, 'SFMono-Regular', 'Cascadia Code', 'Roboto Mono', 'Noto Sans Mono', monospace;
  font-size: 12px;
  line-height: 1.5;
  overflow-wrap: anywhere;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.endpoint-row__arrow {
  flex: none;
  color: var(--md-sys-color-on-surface-variant);
}

.security-panel {
  overflow: hidden;
  background: var(--md-sys-color-surface-container-high);
}

.security-row {
  display: flex;
  width: 100%;
  min-height: 70px;
  align-items: flex-start;
  gap: 12px;
  padding: 15px 15px 15px 18px;
  border: 0;
  border-top: 1px solid color-mix(in srgb, var(--md-sys-color-outline-variant) 30%, transparent);
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
}

.security-row:first-child {
  border-top: 0;
}

.security-row:hover {
  background: color-mix(in srgb, var(--md-sys-color-on-surface) 4%, transparent);
}

.security-row__icon {
  display: grid;
  flex: none;
  width: 24px;
  height: 24px;
  place-items: center;
  color: var(--md-sys-color-tertiary);
}

.security-row__copy {
  display: grid;
  min-width: 0;
  flex: 1;
  gap: 3px;
}

.security-row__copy strong {
  font-size: 14px;
  font-weight: 610;
  line-height: 1.35;
}

.security-row__copy small {
  display: -webkit-box;
  overflow: hidden;
  color: var(--md-sys-color-on-surface-variant);
  font-size: 12px;
  line-height: 1.5;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 1;
}

.security-row.is-expanded .security-row__copy small {
  display: block;
  overflow: visible;
  -webkit-line-clamp: initial;
}

.security-row__chevron {
  flex: none;
  margin-top: 2px;
  color: var(--md-sys-color-on-surface-variant);
  transition: transform 150ms ease;
}

.security-row.is-expanded .security-row__chevron {
  transform: rotate(180deg);
}

.security-safe {
  display: flex;
  min-height: 90px;
  align-items: center;
  gap: 12px;
  padding: 16px 18px;
}

.security-safe > span {
  display: grid;
  flex: none;
  width: 28px;
  height: 28px;
  place-items: center;
  color: var(--md-sys-color-primary);
}

.security-safe div {
  display: grid;
  min-width: 0;
  gap: 3px;
}

.security-safe strong {
  font-size: 14px;
  font-weight: 610;
}

.security-safe small {
  color: var(--md-sys-color-on-surface-variant);
  font-size: 12px;
  line-height: 1.45;
}

.security-loading-spinner {
  animation: service-action-spin 720ms linear infinite;
}

@media (min-width: 850px) {
  .overview-layout {
    grid-template-columns: minmax(0, 1.55fr) minmax(250px, 0.85fr);
    align-items: start;
    gap: 16px;
  }
}

@media (max-width: 360px) {
  .service-header {
    flex-wrap: wrap;
    align-items: flex-start;
    gap: 10px;
    padding-right: 12px;
    padding-left: 16px;
  }

  .service-header__copy {
    flex-basis: calc(100% - 40px);
  }

  .service-actions {
    align-self: flex-end;
    margin-left: auto;
  }

  .service-metric {
    gap: 7px;
    padding-right: 9px;
    padding-left: 9px;
  }

  .endpoint-row {
    padding-right: 13px;
    padding-left: 16px;
  }
}
</style>
