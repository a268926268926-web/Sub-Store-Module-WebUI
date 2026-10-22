<script setup>
import { ref } from 'vue'
import {
  ChevronRight,
  Copy,
  ExternalLink,
  GitFork,
  Heart,
  PackageOpen,
  Cpu,
  Sparkles,
  X,
} from '@lucide/vue'
import { showToast } from '../composables/useToast'
import { MODULE_VERSION } from '../api/module'

const maintenanceProjects = [
  { name: '模块仓库', description: '模块脚本、构建与更新入口', url: 'https://github.com/a268926268926-web/Sub-Store-Module', icon: PackageOpen },
  { name: 'WebUI 仓库', description: 'M3E 界面、交互与主题系统', url: 'https://github.com/a268926268926-web/Sub-Store-Module-WebUI', icon: Sparkles },
  { name: 'Node Android 构建', description: 'arm64 Node 运行时与 release', url: 'https://github.com/a268926268926-web/node-android-build', icon: Cpu },
]

const upstreamProjects = [
  { name: 'Sub-Store 后端', description: '订阅转换与后端服务', url: 'https://github.com/sub-store-org/Sub-Store', icon: GitFork },
  { name: 'Sub-Store Front-End', description: '上游 Sub-Store 前端', url: 'https://github.com/sub-store-org/Sub-Store-Front-End', icon: Sparkles },
  { name: 'HTTP-META', description: 'JS、模板与内核更新源', url: 'https://github.com/xream/http-meta', icon: PackageOpen },
]

function openLink(url) {
  window.open(url, '_blank', 'noopener,noreferrer')
}

const sponsors = [
  {
    developer: 'Delusions6515',
    github: 'https://github.com/Delusions6515',
    methods: [
      { type: 'url', name: '爱发电', url: 'https://afdian.com/a/Delusions6515' },
      { type: 'crypto', name: 'Tron', address: 'TKqrs3bfRxNRiRNJtLG8XxvMgisBb495qb' },
    ],
  },
  {
    developer: 'lanyi233',
    github: 'https://github.com/lanyi233',
    methods: [
      { type: 'crypto', name: 'Tron (TRX only)', address: 'TXZUEEcJkzucYjYdYZv3wR4d6a3mYoWp77' },
    ],
  },
  {
    developer: 'xream',
    github: 'https://github.com/xream',
    methods: [
      { type: 'crypto', name: 'Tron', address: 'TLqQU7oKLXBcbFFTvLbnKsNf412m6PVH8J' },
    ],
  },
]

const sponsorDialogVisible = ref(false)
const sponsorDialogDeveloper = ref(null)

function openSponsorDialog(sponsor) {
  sponsorDialogDeveloper.value = sponsor
  sponsorDialogVisible.value = true
}

function closeSponsorDialog() {
  sponsorDialogVisible.value = false
  sponsorDialogDeveloper.value = null
}

async function openSponsor(method) {
  if (method.type === 'url') {
    openLink(method.url)
    return
  }
  try {
    await navigator.clipboard.writeText(method.address)
    showToast(`已复制 ${sponsorDialogDeveloper.value.developer} 的 ${method.name} 地址`)
  } catch {
    showToast('复制失败，请手动选择地址', { tone: 'error' })
  }
}
</script>

<template>
  <div class="about-page">
  <section class="brand-story">
    <div class="brand-story__icon">
      <PackageOpen :size="38" :stroke-width="1.8" />
    </div>
    <div>
      <p class="brand-story__kicker">MAGISK · KERNELSU · APATCH</p>
      <div class="brand-story__heading">
        <h2 class="brand-story__title">Sub-Store for Android</h2>
        <span v-if="MODULE_VERSION" class="brand-story__version">{{ MODULE_VERSION }}</span>
      </div>
      <p class="brand-story__copy">
        以系统级服务运行 Sub-Store 与 HTTP-META，并把服务、组件更新和配置入口放进一个原生风格的 WebUI。
      </p>
    </div>
  </section>

  <div class="section-heading"><h2 class="section-heading__title">维护项目</h2></div>
  <div class="m3e-card">
    <div class="m3e-list">
      <button
        v-for="project in maintenanceProjects"
        :key="project.name"
        type="button"
        class="m3e-list-row"
        @click="openLink(project.url)"
      >
        <span class="m3e-list-row__icon">
          <component :is="project.icon" :size="19" />
        </span>
        <span class="m3e-list-row__copy">
          <p class="m3e-list-row__title">{{ project.name }}</p>
          <p class="m3e-list-row__summary">{{ project.description }}</p>
        </span>
        <ExternalLink :size="18" color="var(--md-sys-color-on-surface-variant)" />
      </button>
    </div>
  </div>

  <div class="section-heading"><h2 class="section-heading__title">上游依赖</h2></div>
  <div class="m3e-card">
    <div class="m3e-list">
      <button
        v-for="project in upstreamProjects"
        :key="project.name"
        type="button"
        class="m3e-list-row"
        @click="openLink(project.url)"
      >
        <span class="m3e-list-row__icon">
          <component :is="project.icon" :size="21" />
        </span>
        <span class="m3e-list-row__copy">
          <p class="m3e-list-row__title">{{ project.name }}</p>
          <p class="m3e-list-row__summary">{{ project.description }}</p>
        </span>
        <ExternalLink :size="18" color="var(--md-sys-color-on-surface-variant)" />
      </button>
    </div>
  </div>

  <div class="section-heading"><h2 class="section-heading__title">赞助我们</h2></div>
  <div class="m3e-card">
    <div class="m3e-list">
      <button
        v-for="sponsor in sponsors"
        :key="sponsor.developer"
        type="button"
        class="m3e-list-row"
        @click="openSponsorDialog(sponsor)"
      >
        <span class="m3e-list-row__icon">
          <Heart :size="18" />
        </span>
        <span class="m3e-list-row__copy">
          <p class="m3e-list-row__title">{{ sponsor.developer }}</p>
          <p class="m3e-list-row__summary">{{ sponsor.github }}</p>
        </span>
        <ChevronRight :size="19" color="var(--md-sys-color-on-surface-variant)" />
      </button>
    </div>
  </div>

  <div class="section-heading"><h2 class="section-heading__title">许可</h2></div>
  <div class="m3e-card m3e-card__body">
    <strong>GPL-3.0</strong>
    <p style="margin: 5px 0 0; color: var(--md-sys-color-on-surface-variant); font-size: 13px">
      Sub-Store、HTTP-META 与 Mihomo 的版权归各自作者所有。
    </p>
  </div>

  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="sponsorDialogVisible"
        class="modal-backdrop"
        role="presentation"
        @click.self="closeSponsorDialog"
      >
        <section class="modal-sheet" role="dialog" aria-modal="true" :aria-label="`${sponsorDialogDeveloper?.developer} 的赞助方式`">
          <div class="modal-sheet__header">
            <h2 class="modal-sheet__title">{{ sponsorDialogDeveloper?.developer }} 的赞助方式</h2>
            <button type="button" class="icon-button" aria-label="关闭" @click="closeSponsorDialog">
              <X :size="21" />
            </button>
          </div>
          <div class="m3e-list" style="padding-bottom: 10px">
            <button
              v-for="method in sponsorDialogDeveloper?.methods"
              :key="method.name"
              type="button"
              class="m3e-list-row"
              @click="openSponsor(method)"
            >
              <span class="m3e-list-row__icon">
                <ExternalLink v-if="method.type === 'url'" :size="18" />
                <Copy v-else :size="18" />
              </span>
              <span class="m3e-list-row__copy">
                <p class="m3e-list-row__title">{{ method.name }}</p>
                <p class="m3e-list-row__summary">
                  {{ method.type === 'url' ? '打开赞助页面' : method.address }}
                </p>
              </span>
            </button>
          </div>
        </section>
      </div>
    </Transition>
  </Teleport>
  </div>
</template>

<style scoped>
.brand-story {
  display: flex;
  align-items: flex-start;
  gap: 18px;
  margin: 4px 0 24px;
  padding: 24px;
  border-radius: var(--m3e-radius-lg);
  background: var(--md-sys-color-surface-bright);
}

.brand-story__icon {
  display: grid;
  flex: none;
  place-items: center;
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: var(--md-sys-color-primary-container);
  color: var(--md-sys-color-on-primary-container);
}

.brand-story__kicker {
  margin: 2px 0 5px;
  color: var(--md-sys-color-primary);
  font-size: 12px;
  font-weight: 600;
}

.brand-story__title {
  margin: 0;
  font-size: 25px;
  font-weight: 600;
  line-height: 1.15;
}

.brand-story__heading {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 10px;
}

.brand-story__version {
  padding: 2px 8px;
  border-radius: var(--m3e-radius-full);
  background: var(--md-sys-color-secondary-container);
  color: var(--md-sys-color-on-secondary-container);
  font-size: 11px;
  font-weight: 600;
  line-height: 1.7;
}

.brand-story__copy {
  max-width: 58ch;
  margin: 9px 0 0;
  color: var(--md-sys-color-on-surface-variant);
  font-size: 15px;
  line-height: 1.65;
}

@media (max-width: 420px) {
  .brand-story {
    gap: 14px;
  }

  .brand-story__icon {
    width: 58px;
    height: 58px;
    border-radius: 50%;
  }

  .brand-story__title {
    font-size: 23px;
  }
}
</style>
