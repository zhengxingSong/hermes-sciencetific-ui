<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { NButton, NSpin, NTag, useMessage } from 'naive-ui'
import { useI18n } from 'vue-i18n'
import { fetchCorrections, type Correction, type CorrectionStats } from '@/api/corrections'

const { t } = useI18n()
const message = useMessage()
const loading = ref(false)
const corrections = ref<Correction[]>([])
const stats = ref<CorrectionStats | null>(null)

onMounted(loadCorrections)

async function loadCorrections() {
  loading.value = true
  try {
    const response = await fetchCorrections(100)
    corrections.value = response.corrections
    stats.value = response.stats
  } catch (err: any) {
    console.error('Failed to load corrections:', err)
    message.error(t('corrections.loadFailed'))
  } finally {
    loading.value = false
  }
}

// Format timestamp to readable date
function formatTime(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Truncate content for display
function truncateContent(content: string): string {
  if (!content) return ''
  return content.length > 150 ? content.slice(0, 150) + '...' : content
}

// Calculate edit percentage
const editPercentage = computed(() => {
  if (!stats.value || stats.value.total === 0) return 0
  return Math.round((stats.value.edits / stats.value.total) * 100)
})

// Calculate reject percentage
const rejectPercentage = computed(() => {
  if (!stats.value || stats.value.total === 0) return 0
  return Math.round((stats.value.rejects / stats.value.total) * 100)
})
</script>

<template>
  <div class="corrections-view">
    <header class="corrections-header">
      <h2 class="header-title">{{ t('corrections.title') }}</h2>
      <NButton size="small" quaternary :loading="loading" @click="loadCorrections">
        <template #icon>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="23 4 23 10 17 10" />
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
          </svg>
        </template>
        {{ t('corrections.refresh') }}
      </NButton>
    </header>

    <div class="corrections-content">
      <!-- Statistics Summary -->
      <div v-if="stats" class="stats-summary">
        <div class="stat-card">
          <div class="stat-value">{{ stats.total }}</div>
          <div class="stat-label">{{ t('corrections.totalCorrections') }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-value stat-edits">{{ stats.edits }}</div>
          <div class="stat-label">{{ t('corrections.edits') }} ({{ editPercentage }}%)</div>
        </div>
        <div class="stat-card">
          <div class="stat-value stat-rejects">{{ stats.rejects }}</div>
          <div class="stat-label">{{ t('corrections.rejects') }} ({{ rejectPercentage }}%)</div>
        </div>
        <div class="stat-card">
          <div class="stat-value stat-recent">{{ stats.recent_24h }}</div>
          <div class="stat-label">{{ t('corrections.last24h') }}</div>
        </div>
      </div>

      <!-- Corrections List -->
      <div class="corrections-list-section">
        <div class="list-header">
          <span class="list-title">{{ t('corrections.history') }}</span>
        </div>

        <NSpin :show="loading">
          <div v-if="corrections.length === 0 && !loading" class="empty-list">
            {{ t('corrections.noCorrections') }}
          </div>

          <div v-else class="corrections-table">
            <div v-for="correction in corrections" :key="correction.id" class="correction-row">
              <div class="correction-meta">
                <NTag :type="correction.type === 'edit' ? 'info' : 'warning'" size="small">
                  {{ correction.type === 'edit' ? t('corrections.edit') : t('corrections.reject') }}
                </NTag>
                <span class="correction-time">{{ formatTime(correction.timestamp) }}</span>
                <span class="correction-session">Session: {{ correction.session_id.slice(0, 8) }}</span>
              </div>

              <div class="correction-content">
                <div class="content-block original">
                  <div class="content-label">{{ t('corrections.original') }}</div>
                  <div class="content-text">{{ truncateContent(correction.original) }}</div>
                </div>
                <div class="content-block corrected">
                  <div class="content-label">{{ t('corrections.corrected') }}</div>
                  <div class="content-text">{{ truncateContent(correction.corrected) }}</div>
                </div>
              </div>
            </div>
          </div>
        </NSpin>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/variables' as *;

.corrections-view {
  min-height: 100%;
  display: flex;
  flex-direction: column;
}

.corrections-header {
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

.corrections-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

// Stats summary styles
.stats-summary {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 20px;
}

.stat-card {
  background: $bg-card;
  border: 1px solid $border-color;
  border-radius: $radius-md;
  padding: 16px;
  text-align: center;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: $text-primary;
  font-variant-numeric: tabular-nums;
}

.stat-edits {
  color: $info;
}

.stat-rejects {
  color: $warning;
}

.stat-recent {
  color: $success;
}

.stat-label {
  font-size: 12px;
  color: $text-muted;
  margin-top: 4px;
}

// Corrections list styles
.corrections-list-section {
  border: 1px solid $border-color;
  border-radius: $radius-md;
  overflow: hidden;
}

.list-header {
  display: flex;
  align-items: center;
  padding: 10px 16px;
  background: $bg-secondary;
  border-bottom: 1px solid $border-color;
}

.list-title {
  font-size: 14px;
  font-weight: 600;
  color: $text-primary;
}

.empty-list {
  padding: 40px;
  text-align: center;
  color: $text-muted;
  font-size: 13px;
}

.corrections-table {
  max-height: 500px;
  overflow-y: auto;
}

.correction-row {
  padding: 16px;
  border-bottom: 1px solid $border-light;

  &:last-child {
    border-bottom: none;
  }
}

.correction-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.correction-time {
  font-size: 12px;
  color: $text-muted;
}

.correction-session {
  font-size: 11px;
  color: $text-muted;
  font-family: $font-code;
}

.correction-content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.content-block {
  padding: 12px;
  background: $bg-secondary;
  border-radius: $radius-sm;
}

.content-block.original {
  border-left: 3px solid $text-muted;
}

.content-block.corrected {
  border-left: 3px solid $accent-primary;
}

.content-label {
  font-size: 11px;
  font-weight: 600;
  color: $text-muted;
  margin-bottom: 6px;
}

.content-text {
  font-size: 13px;
  color: $text-secondary;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
}

@media (max-width: 900px) {
  .stats-summary {
    grid-template-columns: repeat(2, 1fr);
  }

  .correction-content {
    grid-template-columns: 1fr;
  }
}
</style>