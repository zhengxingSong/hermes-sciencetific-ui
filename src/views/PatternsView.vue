<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { NButton, NSpin, useMessage } from 'naive-ui'
import { useI18n } from 'vue-i18n'
import { fetchPatterns, type PatternsData } from '@/api/patterns'

const { t } = useI18n()
const message = useMessage()
const loading = ref(false)
const data = ref<PatternsData | null>(null)

onMounted(loadPatterns)

async function loadPatterns() {
  loading.value = true
  try {
    data.value = await fetchPatterns()
  } catch (err: any) {
    console.error('Failed to load patterns:', err)
    message.error(t('patterns.loadFailed'))
  } finally {
    loading.value = false
  }
}

// Format hour for display (0-23 to readable time)
function formatHour(hour: number): string {
  return `${hour.toString().padStart(2, '0')}:00`
}

// Calculate max count for bar chart scaling
const maxHourlyCount = computed(() => {
  if (!data.value?.hourly_activity.length) return 0
  return Math.max(...data.value.hourly_activity.map(h => h.count))
})

// Calculate bar width percentage
function barWidth(count: number): string {
  if (maxHourlyCount.value === 0) return '0%'
  return `${(count / maxHourlyCount.value) * 100}%`
}

// Bar color based on activity level
function barColor(count: number): string {
  const ratio = maxHourlyCount.value > 0 ? count / maxHourlyCount.value : 0
  if (ratio >= 0.7) return 'var(--accent-500)'
  if (ratio >= 0.4) return 'var(--accent-400)'
  return 'var(--accent-300)'
}

// Truncate long prompts
function truncatePrompt(prompt: string): string {
  return prompt.length > 60 ? prompt.slice(0, 60) + '...' : prompt
}
</script>

<template>
  <div class="patterns-view">
    <header class="patterns-header">
      <h2 class="header-title">{{ t('patterns.title') }}</h2>
      <NButton size="small" quaternary :loading="loading" @click="loadPatterns">
        <template #icon>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="23 4 23 10 17 10" />
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
          </svg>
        </template>
        {{ t('patterns.refresh') }}
      </NButton>
    </header>

    <div class="patterns-content">
      <NSpin :show="loading">
        <div v-if="!data && !loading" class="patterns-empty">{{ t('common.noData') }}</div>

        <div v-else-if="data" class="patterns-grid">
          <!-- Hourly Activity Chart -->
          <div class="patterns-section">
            <div class="section-header">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <span class="section-title">{{ t('patterns.hourlyActivity') }}</span>
            </div>
            <div class="hourly-chart">
              <div v-for="hour in data.hourly_activity" :key="hour.hour" class="hourly-bar-row">
                <span class="hour-label">{{ formatHour(hour.hour) }}</span>
                <div class="bar-container">
                  <div
                    class="bar-fill"
                    :style="{ width: barWidth(hour.count), background: barColor(hour.count) }"
                  ></div>
                </div>
                <span class="bar-count">{{ hour.count }}</span>
              </div>
            </div>
          </div>

          <!-- Similar Tasks -->
          <div class="patterns-section">
            <div class="section-header">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M21 16V8a2 2 0 0 1-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                <line x1="12" y1="22.08" x2="12" y2="12" />
              </svg>
              <span class="section-title">{{ t('patterns.similarTasks') }}</span>
            </div>
            <div class="similar-list">
              <div v-if="data.similar_tasks.length === 0" class="empty-list">{{ t('common.noData') }}</div>
              <div v-for="task in data.similar_tasks" :key="task.pattern" class="similar-item">
                <div class="task-pattern">{{ task.pattern }}</div>
                <div class="task-meta">
                  <span class="task-count">{{ task.sessions }} {{ t('patterns.sessions') }}</span>
                  <div class="task-examples">
                    <span v-for="(ex, i) in task.examples.slice(0, 2)" :key="i" class="example-tag">{{ ex.slice(0, 30) }}{{ ex.length > 30 ? '...' : '' }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Tool Sequences -->
          <div class="patterns-section">
            <div class="section-header">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <polyline points="12 2 2 7 12 12 22 7 12 2" />
                <polyline points="2 17 12 22 22 17" />
                <polyline points="2 12 12 17 22 12" />
              </svg>
              <span class="section-title">{{ t('patterns.toolSequences') }}</span>
            </div>
            <div class="sequences-table">
              <div v-if="data.tool_sequences.length === 0" class="empty-list">{{ t('common.noData') }}</div>
              <div v-for="(seq, i) in data.tool_sequences" :key="i" class="sequence-row">
                <div class="sequence-flow">
                  <span v-for="(tool, j) in seq.sequence" :key="j" class="tool-node">
                    {{ tool }}
                    <span v-if="j < seq.sequence.length - 1" class="arrow">-></span>
                  </span>
                </div>
                <span class="sequence-count">{{ seq.count }}x</span>
              </div>
            </div>
          </div>

          <!-- Prompt Frequency -->
          <div class="patterns-section">
            <div class="section-header">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <line x1="4" y1="9" x2="20" y2="9" />
                <line x1="4" y1="15" x2="20" y2="15" />
                <line x1="10" y1="3" x2="8" y2="21" />
                <line x1="16" y1="3" x2="14" y2="21" />
              </svg>
              <span class="section-title">{{ t('patterns.promptFrequency') }}</span>
            </div>
            <div class="prompts-list">
              <div v-if="data.prompt_frequency.length === 0" class="empty-list">{{ t('common.noData') }}</div>
              <div v-for="(prompt, i) in data.prompt_frequency" :key="i" class="prompt-item">
                <span class="prompt-text">{{ truncatePrompt(prompt.prompt) }}</span>
                <span class="prompt-count">{{ prompt.count }}x</span>
              </div>
            </div>
          </div>
        </div>
      </NSpin>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/variables' as *;

.patterns-view {
  min-height: 100%;
  display: flex;
  flex-direction: column;
}

.patterns-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  border-bottom: 1px solid $border-color;
  flex-shrink: 0;
}

.header-title {
  font-size: 16px;
  font-weight: 600;
  color: $text-primary;
}

.patterns-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.patterns-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: $text-muted;
  font-size: 13px;
}

.patterns-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.patterns-section {
  border: 1px solid $border-color;
  border-radius: $radius-md;
  overflow: hidden;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: $bg-secondary;
  border-bottom: 1px solid $border-color;
  color: $text-secondary;

  svg {
    flex-shrink: 0;
  }
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: $text-primary;
}

// Hourly chart styles
.hourly-chart {
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.hourly-bar-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.hour-label {
  font-size: 11px;
  color: $text-muted;
  width: 40px;
  font-variant-numeric: tabular-nums;
}

.bar-container {
  flex: 1;
  height: 16px;
  background: $bg-secondary;
  border-radius: 2px;
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  border-radius: 2px;
  transition: width 0.3s ease;
}

.bar-count {
  font-size: 11px;
  color: $text-secondary;
  width: 24px;
  text-align: right;
  font-variant-numeric: tabular-nums;
}

// Similar tasks styles
.similar-list {
  padding: 8px 16px;
  max-height: 240px;
  overflow-y: auto;
}

.empty-list {
  padding: 20px;
  text-align: center;
  color: $text-muted;
  font-size: 13px;
}

.similar-item {
  padding: 8px 0;
  border-bottom: 1px solid $border-light;

  &:last-child {
    border-bottom: none;
  }
}

.task-pattern {
  font-size: 13px;
  font-weight: 500;
  color: $text-primary;
}

.task-meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 4px;
}

.task-count {
  font-size: 11px;
  color: $accent-primary;
  font-weight: 500;
}

.task-examples {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.example-tag {
  font-size: 11px;
  padding: 2px 6px;
  background: $bg-secondary;
  border-radius: 3px;
  color: $text-muted;
}

// Tool sequences styles
.sequences-table {
  padding: 8px 16px;
  max-height: 240px;
  overflow-y: auto;
}

.sequence-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 0;
  border-bottom: 1px solid $border-light;

  &:last-child {
    border-bottom: none;
  }
}

.sequence-flow {
  display: flex;
  align-items: center;
  gap: 4px;
  flex: 1;
  min-width: 0;
}

.tool-node {
  font-size: 12px;
  font-family: $font-code;
  color: $text-primary;
  white-space: nowrap;
}

.arrow {
  color: $text-muted;
  font-size: 10px;
}

.sequence-count {
  font-size: 11px;
  color: $accent-primary;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

// Prompts list styles
.prompts-list {
  padding: 8px 16px;
  max-height: 240px;
  overflow-y: auto;
}

.prompt-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 0;
  border-bottom: 1px solid $border-light;

  &:last-child {
    border-bottom: none;
  }
}

.prompt-text {
  font-size: 13px;
  color: $text-secondary;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  min-width: 0;
}

.prompt-count {
  font-size: 11px;
  color: $accent-primary;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

@media (max-width: 900px) {
  .patterns-grid {
    grid-template-columns: 1fr;
  }
}
</style>