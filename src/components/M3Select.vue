<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { Check, ChevronDown, X } from '@lucide/vue'

const props = defineProps({
  modelValue: { type: String, required: true },
  options: { type: Array, required: true },
  label: { type: String, default: '' },
  disabled: { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue'])
const open = ref(false)
const triggerRef = ref(null)
const sheetRef = ref(null)

const selected = computed(() => (
  props.options.find((option) => option.value === props.modelValue) || props.options[0]
))

function choose(value) {
  emit('update:modelValue', value)
  close()
}

async function openSheet() {
  if (props.disabled) return
  open.value = true
  await nextTick()
  sheetRef.value?.querySelector('button[aria-selected="true"]')?.focus()
}

function close() {
  open.value = false
  nextTick(() => triggerRef.value?.focus())
}

function onKeydown(event) {
  if (event.key === 'Escape' && open.value) close()
}

function onSheetKeydown(event) {
  const focusable = [...(sheetRef.value?.querySelectorAll('button:not(:disabled)') || [])]
  const options = [...(sheetRef.value?.querySelectorAll('.m3-select__option:not(:disabled)') || [])]
  if (!focusable.length) return

  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault()
    if (!options.length) return
    const current = options.indexOf(document.activeElement)
    const offset = event.key === 'ArrowDown' ? 1 : -1
    const next = current < 0
      ? (offset > 0 ? 0 : options.length - 1)
      : (current + offset + options.length) % options.length
    options[next]?.focus()
    return
  }

  if (event.key === 'Home' || event.key === 'End') {
    event.preventDefault()
    options[event.key === 'Home' ? 0 : options.length - 1]?.focus()
    return
  }

  if (event.key === 'Tab') {
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last?.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first?.focus()
    }
  }
}

watch(open, (isOpen) => {
  if (isOpen) document.addEventListener('keydown', onKeydown)
  else document.removeEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <div class="m3-select">
    <span v-if="label" class="m3-field__label">{{ label }}</span>
    <button
      ref="triggerRef"
      type="button"
      class="m3-select__trigger"
      :disabled="disabled"
      aria-haspopup="listbox"
      :aria-expanded="open"
      @click="openSheet"
    >
      <span class="m3-select__copy">
        <strong>{{ selected?.label }}</strong>
        <small v-if="selected?.description">{{ selected.description }}</small>
      </span>
      <ChevronDown :size="20" />
    </button>

    <Teleport to="body">
      <Transition name="modal">
        <div
          v-if="open"
          class="modal-backdrop m3-select__backdrop"
          role="presentation"
          @click.self="close"
        >
          <section
            ref="sheetRef"
            class="modal-sheet m3-select__sheet"
            role="dialog"
            aria-modal="true"
            :aria-label="label || '选择项目'"
            @keydown="onSheetKeydown"
          >
            <div class="modal-sheet__header">
              <h2 class="modal-sheet__title">{{ label || '选择项目' }}</h2>
              <button type="button" class="icon-button" aria-label="关闭" @click="close">
                <X :size="21" />
              </button>
            </div>
            <div class="m3-select__options" role="listbox" :aria-label="label || '选项'">
              <button
                v-for="option in options"
                :key="option.value"
                type="button"
                class="m3-select__option"
                :class="{ 'is-selected': option.value === modelValue }"
                role="option"
                :aria-selected="option.value === modelValue"
                @click="choose(option.value)"
              >
                <span class="m3-select__option-copy">
                  <strong>{{ option.label }}</strong>
                  <small v-if="option.description">{{ option.description }}</small>
                </span>
                <Check v-if="option.value === modelValue" :size="20" />
              </button>
            </div>
          </section>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.m3-select {
  display: grid;
  gap: 6px;
  min-width: 0;
}

.m3-select__trigger {
  display: flex;
  align-items: center;
  gap: 14px;
  width: 100%;
  min-height: 58px;
  padding: 8px 16px;
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: var(--m3e-radius-md);
  background: var(--md-sys-color-surface-container-lowest);
  color: var(--md-sys-color-on-surface);
  text-align: left;
  cursor: pointer;
  transition: border-color 160ms ease, background-color 160ms ease, border-radius 220ms var(--m3e-ease-expressive);
}

.m3-select__trigger:hover {
  background: var(--md-sys-color-surface-container-low);
}

.m3-select__trigger[aria-expanded='true'] {
  border-color: var(--md-sys-color-primary);
  border-radius: 14px 22px 14px 22px;
}

.m3-select__trigger:disabled {
  cursor: not-allowed;
  opacity: 0.48;
}

.m3-select__copy {
  display: grid;
  flex: 1;
  min-width: 0;
  gap: 1px;
}

.m3-select__copy strong,
.m3-select__option strong {
  font-size: 15px;
  font-weight: 700;
}

.m3-select__copy small,
.m3-select__option small {
  overflow: hidden;
  color: var(--md-sys-color-on-surface-variant);
  font-size: 12px;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.m3-select__backdrop {
  z-index: 90;
}

.m3-select__sheet {
  max-height: min(78dvh, 680px);
}

.m3-select__options {
  display: grid;
  gap: 2px;
  padding: 0 10px 12px;
}

.m3-select__option {
  display: flex;
  align-items: center;
  gap: 14px;
  width: 100%;
  min-height: 58px;
  padding: 10px 14px;
  border: 0;
  border-radius: var(--m3e-radius-md);
  background: transparent;
  color: var(--md-sys-color-on-surface);
  text-align: left;
  cursor: pointer;
}

.m3-select__option:hover,
.m3-select__option:focus-visible {
  background: var(--md-sys-color-surface-container-high);
}

.m3-select__option.is-selected {
  background: var(--md-sys-color-secondary-container);
  color: var(--md-sys-color-on-secondary-container);
}

.m3-select__option-copy {
  display: grid;
  flex: 1;
  min-width: 0;
  gap: 2px;
}

@media (min-width: 700px) {
  .m3-select__backdrop {
    place-items: center;
    padding: calc(32px + var(--top-inset)) 32px calc(32px + var(--bottom-inset));
  }
}
</style>
