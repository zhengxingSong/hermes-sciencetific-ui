<script setup lang="ts">
import { computed } from 'vue'
import { NSelect } from 'naive-ui'
import { useAppStore } from '@/stores/app'

const appStore = useAppStore()

const options = computed(() =>
  appStore.modelGroups.map(g => ({
    label: `${g.label} (${g.provider})`,
    type: 'group' as const,
    key: g.provider,
    children: g.models.map(m => ({
      label: `${m} (${g.provider})`,
      value: m,
      provider: g.provider,
    })),
  })),
)

function handleChange(value: string | number | Array<string | number>, _option: any) {
  if (typeof value === 'string') {
    // Find the selected option to get provider
    const selectedOption = options.value
      .flatMap(g => g.children || [])
      .find(c => c.value === value)
    appStore.switchModel(value, selectedOption?.provider)
  }
}
</script>

<template>
  <div class="model-selector">
    <div class="model-label">Model</div>
    <NSelect
      :value="appStore.selectedModel"
      :options="options"
      size="small"
      @update:value="handleChange"
    />
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/variables' as *;

.model-selector {
  padding: 0 12px;
  margin-bottom: 8px;
}

.model-label {
  font-size: 11px;
  font-weight: 600;
  color: $text-muted;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 6px;
}
</style>
