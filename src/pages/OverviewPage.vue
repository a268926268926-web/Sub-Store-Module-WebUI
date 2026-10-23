<script setup>
import { computed, onActivated } from 'vue'
import {
  ArrowUpRight,
  ChevronDown,
  ChevronRight,
  CircleAlert,
  LoaderCircle,
  Play,
  RefreshCw,
  RotateCw,
  Server,
  ShieldAlert,
  ShieldCheck,
  Square,
} from '@lucide/vue'
import { useModuleState } from '../composables/useModuleState'
import { useServiceControl } from '../composables/useServiceControl'
import OperationLogPanel from '../components/OperationLogPanel.vue'
import * as moduleApi from '../api/module'
import {
  buildServiceAddresses,
  serviceModeText,
  serviceStateText,
} from '../utils/overview'

const emit = defineEmits(['open-settings'])
const {
  status,
  loading,
  refreshing,
  stale,
  statusError,
  refreshedAt,
  busy,
  error,
  refreshStatus,
  runAction,
} = useModuleState()
const { pending, action, content, visible, run } = useServiceControl()

onActivated(() => {
  refreshStatus()
})

const addresses = computed(() => buildServiceAddresses(status.value))
const panelAddress = computed(() =>
  addresses.value.find((item) => item.openValue),
)
const backendAddress = computed(() =>
  addresses.value.find((item) => !item.openValue),
)
const controlsDisabled = computed(
  () => busy.value || stale.value || !status.value,
)
const stateLabel = computed(() =>
  serviceStateText({
    status: status.value,
    loading: loading.value,
    stale: stale.value,
    pendingAction: pending.value,
    currentAction: action.value,
  }),
)
const serviceContext = computed(() => {
  if (!status.value) return serviceModeText(null, loading.value)
  return `${serviceModeText(status.value)} · ${status.value.runUserIsRoot ? 'ROOT' : 'SHELL'}`
})

function openPanel() {
  if (
    panelAddress.value &&
    !controlsDisabled.value &&
    status.value?.serviceRunning
  ) {
    runAction('open', () => moduleApi.openUrl(panelAddress.value.openValue))
  }
}

const securityIssues = computed(() => {
  if (!status.value) return []
  const issues = []
  if (status.value.backendPathIsDefault)
    issues.push({
      title: '默认访问路径',
      text: '在配置中生成随机路径，避免不同安装实例使用相同入口。',
    })
  if (status.value.backendPathIsEmpty && status.value.crosAllowedOriginsIsAll)
    issues.push({
      title: '跨域范围过宽',
      text: '当前入口为根路径且允许所有来源，建议设置随机路径或限制可信来源。',
    })
  if (status.value.runUserIsRoot)
    issues.push({
      title: 'Root 运行',
      text: '如无额外权限需求，可将 sub_store.config 中的 run_as_user 改为 shell。',
    })
  return issues
})
const securitySummary = computed(() => {
  if (!status.value) return loading.value ? '正在读取配置' : '暂时无法检查'
  if (stale.value) return '上次检查结果，等待刷新'
  return securityIssues.value.length
    ? `${securityIssues.value.length} 项建议待查看`
    : '未发现配置提醒'
})
</script>

<template>
  <div class="overview-page">
    <div v-if="statusError" class="status-notice" role="status">
      <CircleAlert :size="20" aria-hidden="true" />
      <div>
        <strong>{{ stale ? '状态已过期' : '无法读取服务状态' }}</strong>
        <p>
          {{
            stale ? `上次读取 ${refreshedAt}，请刷新后再操作。` : statusError
          }}
        </p>
      </div>
      <button
        type="button"
        class="icon-button"
        aria-label="重试读取状态"
        title="重试读取状态"
        :disabled="refreshing"
        @click="refreshStatus()"
      >
        <RefreshCw :size="19" :class="{ 'is-spinning': refreshing }" />
      </button>
    </div>

    <div class="overview-layout">
      <section
        class="service-overview m3e-card"
        aria-labelledby="service-name"
        :aria-busy="pending || loading"
      >
        <div class="service-summary">
          <span class="service-symbol" aria-hidden="true"
            ><Server :size="25" :stroke-width="1.7"
          /></span>
          <div class="service-summary__copy">
            <span id="service-name" class="service-name">Sub-Store</span>
            <h2 class="service-status" aria-live="polite">
              <span
                class="status-dot"
                :class="{
                  'is-running': status?.serviceRunning && !stale && !pending,
                  'is-pending': pending,
                }"
                aria-hidden="true"
              />
              {{ stateLabel }}
            </h2>
          </div>
          <button
            type="button"
            class="icon-button service-refresh"
            aria-label="刷新服务状态"
            title="刷新服务状态"
            :disabled="refreshing || busy"
            @click="refreshStatus(true)"
          >
            <RefreshCw :size="19" :class="{ 'is-spinning': refreshing }" />
          </button>
        </div>
        <p class="service-context">{{ serviceContext }}</p>

        <div class="service-launch">
          <div class="service-address">
            <span>{{ backendAddress ? '前端地址' : '访问地址' }}</span>
            <code>{{
              panelAddress?.displayValue || (loading ? '正在读取…' : '暂不可用')
            }}</code>
          </div>
          <button
            type="button"
            class="m3e-button panel-open"
            :disabled="
              controlsDisabled || !status?.serviceRunning || !panelAddress
            "
            @click="openPanel"
          >
            打开面板 <ArrowUpRight :size="19" aria-hidden="true" />
          </button>
        </div>
        <div v-if="backendAddress" class="backend-address">
          <span>后端地址</span><code>{{ backendAddress.displayValue }}</code>
        </div>

        <dl class="service-facts">
          <div>
            <dt>开机自启</dt>
            <dd>
              {{ status ? (status.autostart ? '已启用' : '已关闭') : '—' }}
            </dd>
          </div>
          <div>
            <dt>配置状态</dt>
            <dd :class="{ 'needs-attention': status?.configModified }">
              {{
                status ? (status.configModified ? '待重启生效' : '已生效') : '—'
              }}
            </dd>
          </div>
        </dl>

        <div class="service-control-row">
          <span>服务控制</span>
          <div class="service-control-actions">
            <button
              v-if="!status?.serviceRunning"
              type="button"
              class="m3e-button m3e-button--text"
              :disabled="controlsDisabled"
              @click="run('start')"
            >
              <LoaderCircle
                v-if="pending && action === 'start'"
                :size="18"
                class="is-spinning"
              />
              <Play v-else :size="18" />
              {{ pending && action === 'start' ? '启动中' : '启动' }}
            </button>
            <template v-else>
              <button
                type="button"
                class="m3e-button m3e-button--text"
                :disabled="controlsDisabled"
                @click="run('restart')"
              >
                <LoaderCircle
                  v-if="pending && action === 'restart'"
                  :size="18"
                  class="is-spinning"
                />
                <RotateCw v-else :size="18" />
                {{ pending && action === 'restart' ? '重启中' : '重启' }}
              </button>
              <button
                type="button"
                class="m3e-button m3e-button--text service-stop"
                :disabled="controlsDisabled"
                @click="run('stop')"
              >
                <LoaderCircle
                  v-if="pending && action === 'stop'"
                  :size="18"
                  class="is-spinning"
                />
                <Square v-else :size="16" />
                {{ pending && action === 'stop' ? '停止中' : '停止' }}
              </button>
            </template>
          </div>
        </div>
      </section>

      <aside class="overview-secondary">
        <details class="security-disclosure">
          <summary class="security-summary">
            <span class="security-symbol" aria-hidden="true">
              <ShieldAlert
                v-if="securityIssues.length || !status"
                :size="23"
                :stroke-width="1.7"
              />
              <ShieldCheck v-else :size="23" :stroke-width="1.7" />
            </span>
            <span class="security-summary__copy">
              <strong>安全建议</strong>
              <span>{{ securitySummary }}</span>
            </span>
            <ChevronDown
              :size="18"
              class="security-chevron"
              aria-hidden="true"
            />
          </summary>
          <div class="security-content">
            <template v-if="status">
              <div
                v-for="issue in securityIssues"
                :key="issue.title"
                class="security-issue"
              >
                <h3>{{ issue.title }}</h3>
                <p>{{ issue.text }}</p>
              </div>
              <p v-if="!securityIssues.length" class="security-empty">
                已检查访问路径、跨域设置与运行权限。
              </p>
              <button
                type="button"
                class="security-settings"
                @click="emit('open-settings')"
              >
                前往配置 <ChevronRight :size="17" />
              </button>
            </template>
            <p v-else class="security-empty">
              {{
                loading ? '读取服务状态后进行检查。' : '请先重试读取服务状态。'
              }}
            </p>
          </div>
        </details>
      </aside>
    </div>

    <div v-if="error" class="m3e-error" role="status">
      <CircleAlert :size="18" /><span>{{ error }}</span>
    </div>
    <OperationLogPanel
      :visible="visible"
      :content="content"
      :loading="pending"
      title="本次操作日志"
    />
  </div>
</template>

<style scoped>
.overview-layout {
  display: grid;
  align-items: start;
  gap: 20px;
}
.service-overview {
  padding: 24px 22px 0;
  background: var(--md-sys-color-surface-container);
}
.service-summary {
  display: flex;
  align-items: center;
  gap: 14px;
}
.service-symbol {
  display: grid;
  flex: none;
  place-items: center;
  width: 44px;
  height: 44px;
  border-radius: 14px;
  background: var(--md-sys-color-surface-container-highest);
  color: var(--md-sys-color-on-surface-variant);
}
.service-summary__copy {
  min-width: 0;
  flex: 1;
}
.service-name {
  color: var(--md-sys-color-on-surface-variant);
  font-size: 13px;
  font-weight: 550;
}
.service-status {
  display: flex;
  align-items: center;
  gap: 9px;
  margin: 2px 0 0;
  font-size: 26px;
  font-weight: 620;
  line-height: 1.25;
}
.status-dot {
  flex: none;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--md-sys-color-outline);
}
.status-dot.is-running {
  background: var(--md-sys-color-primary);
}
.status-dot.is-pending {
  background: var(--md-sys-color-tertiary);
}
.service-refresh {
  width: 44px;
  height: 44px;
  align-self: flex-start;
  margin: -7px -10px 0 0;
}
.service-context {
  margin: 14px 0 0;
  color: var(--md-sys-color-on-surface-variant);
  font-size: 12px;
}
.service-launch {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-top: 20px;
}
.service-address {
  display: grid;
  min-width: 0;
  gap: 4px;
}
.service-address > span,
.backend-address > span {
  color: var(--md-sys-color-on-surface-variant);
  font-size: 12px;
}
.service-address code,
.backend-address code {
  font-family: ui-monospace, monospace;
  font-size: 13px;
  line-height: 1.5;
  overflow-wrap: anywhere;
}
.panel-open {
  min-height: 48px;
  padding: 0 18px;
  font-size: 14px;
  box-shadow: none;
}
.backend-address {
  display: grid;
  gap: 4px;
  margin-top: 14px;
}
.service-facts {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px;
  margin: 22px 0 20px;
}
.service-facts > div {
  min-width: 0;
}
.service-facts dt {
  color: var(--md-sys-color-on-surface-variant);
  font-size: 12px;
}
.service-facts dd {
  margin: 4px 0 0;
  font-size: 14px;
  font-weight: 580;
  overflow-wrap: anywhere;
}
.service-facts dd.needs-attention {
  color: var(--md-sys-color-tertiary);
}
.service-control-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-height: 62px;
  border-top: 1px solid
    color-mix(in srgb, var(--md-sys-color-outline-variant) 40%, transparent);
}
.service-control-row > span {
  color: var(--md-sys-color-on-surface-variant);
  font-size: 12px;
}
.service-control-actions {
  display: flex;
  gap: 2px;
  margin-right: -10px;
}
.service-stop {
  color: var(--md-sys-color-on-surface-variant);
}
.security-disclosure {
  padding: 0 4px;
}
.security-summary {
  display: flex;
  align-items: center;
  gap: 13px;
  min-height: 76px;
  padding: 12px 4px;
  cursor: pointer;
  list-style: none;
  border-radius: 8px;
}
.security-summary::-webkit-details-marker {
  display: none;
}
.security-summary:focus-visible {
  outline: 2px solid var(--md-sys-color-primary);
  outline-offset: 3px;
}
.security-symbol {
  display: grid;
  flex: none;
  place-items: center;
  width: 28px;
  color: var(--md-sys-color-on-surface-variant);
}
.security-summary__copy {
  display: grid;
  min-width: 0;
  flex: 1;
  gap: 4px;
}
.security-summary__copy strong {
  font-size: 15px;
  font-weight: 600;
}
.security-summary__copy > span {
  color: var(--md-sys-color-on-surface-variant);
  font-size: 12px;
}
.security-chevron {
  flex: none;
  color: var(--md-sys-color-on-surface-variant);
  transition: transform 150ms ease;
}
.security-disclosure[open] .security-chevron {
  transform: rotate(180deg);
}
.security-content {
  margin-left: 45px;
}
.security-issue {
  padding: 13px 0;
  border-top: 1px solid
    color-mix(in srgb, var(--md-sys-color-outline-variant) 36%, transparent);
}
.security-issue h3 {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
}
.security-issue p,
.security-empty {
  margin: 5px 0 0;
  color: var(--md-sys-color-on-surface-variant);
  font-size: 12px;
  line-height: 1.7;
}
.security-settings {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  min-height: 48px;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--md-sys-color-primary);
  font: inherit;
  font-size: 13px;
  cursor: pointer;
}
.status-notice {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 18px;
  padding: 12px 14px;
  border-radius: 12px;
  background: var(--md-sys-color-surface-container);
  color: var(--md-sys-color-on-surface-variant);
}
.status-notice > svg {
  flex: none;
}
.status-notice > div {
  flex: 1;
  min-width: 0;
}
.status-notice strong {
  font-size: 13px;
  color: var(--md-sys-color-on-surface);
}
.status-notice p {
  margin: 3px 0 0;
  font-size: 12px;
  overflow-wrap: anywhere;
}
@media (min-width: 1000px) {
  .overview-layout {
    grid-template-columns: minmax(0, 1.65fr) minmax(240px, 1fr);
    gap: 28px;
  }
  .security-summary {
    padding-top: 8px;
  }
}
@media (max-width: 360px) {
  .service-overview {
    padding: 20px 16px 0;
  }
  .service-status {
    font-size: 23px;
  }
  .service-launch {
    gap: 10px;
  }
  .panel-open {
    gap: 5px;
    padding: 0 12px;
    font-size: 13px;
  }
}
</style>
