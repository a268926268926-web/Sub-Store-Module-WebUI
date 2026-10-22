<script setup>
import { ref } from 'vue'
import {
  ChevronRight,
  Copy,
  ExternalLink,
  GitFork,
  Heart,
  PackageOpen,
  Scale,
  Sparkles,
  X,
} from '@lucide/vue'
import { showToast } from '../composables/useToast'

const relatedProjects = [
  { name: '模块仓库', url: 'https://github.com/lanyi233/Sub-Store-Module', icon: PackageOpen },
  { name: 'WebUI 仓库', url: 'https://github.com/Delusions6515/Sub-Store-Module-WebUI', icon: Sparkles },
  { name: 'Sub-Store', url: 'https://github.com/sub-store-org/Sub-Store', icon: GitFork },
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
      <h2 class="brand-story__title">Sub-Store for Android</h2>
      <p class="brand-story__copy">
        以系统级服务运行 Sub-Store 与 HTTP-META，并把服务、组件更新和配置入口放进一个原生风格的 WebUI。
      </p>
    </div>
  </section>

  <div class="section-heading">
    <div class="section-heading__copy">
      <h2 class="section-heading__title">相关项目</h2>
      <p class="section-heading__subtitle">源代码与上游依赖</p>
    </div>
    <GitFork :size="20" color="var(--md-sys-color-primary)" />
  </div>
  <div class="m3e-card">
    <div class="m3e-list">
      <button
        v-for="project in relatedProjects"
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
          <p class="m3e-list-row__summary">{{ project.url }}</p>
        </span>
        <ExternalLink :size="18" color="var(--md-sys-color-on-surface-variant)" />
      </button>
    </div>
  </div>

  <div class="section-heading">
    <div class="section-heading__copy">
      <h2 class="section-heading__title">赞助我们</h2>
      <p class="section-heading__subtitle">支持模块和上游项目的持续维护</p>
    </div>
    <Heart :size="20" color="var(--md-sys-color-error)" />
  </div>
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

  <div class="section-heading">
    <div class="section-heading__copy">
      <h2 class="section-heading__title">许可</h2>
      <p class="section-heading__subtitle">遵循上游项目许可分发</p>
    </div>
    <Scale :size="20" color="var(--md-sys-color-primary)" />
  </div>
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
  margin: 4px 4px 28px;
  padding: 22px 0 24px;
  border-top: 1px solid var(--md-sys-color-outline-variant);
  border-bottom: 1px solid var(--md-sys-color-outline-variant);
}

.brand-story__icon {
  display: grid;
  flex: none;
  place-items: center;
  width: 72px;
  height: 72px;
  border-radius: 26px 14px 24px 16px;
  background: var(--md-sys-color-primary-container);
  color: var(--md-sys-color-on-primary-container);
}

.brand-story__kicker {
  margin: 2px 0 5px;
  color: var(--md-sys-color-primary);
  font-size: 11px;
  font-weight: 750;
}

.brand-story__title {
  margin: 0;
  font-size: 24px;
  font-weight: 780;
  line-height: 1.15;
}

.brand-story__copy {
  max-width: 58ch;
  margin: 9px 0 0;
  color: var(--md-sys-color-on-surface-variant);
  font-size: 14px;
  line-height: 1.65;
}

@media (max-width: 420px) {
  .brand-story {
    gap: 14px;
  }

  .brand-story__icon {
    width: 58px;
    height: 58px;
    border-radius: 22px 12px 20px 14px;
  }

  .brand-story__title {
    font-size: 21px;
  }
}
</style>
