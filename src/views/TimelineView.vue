<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { NButton, NTag, NDatePicker, NSelect, useMessage } from 'naive-ui'
import { useI18n } from 'vue-i18n'
import { fetchTimeline, type TimelineEvent, type TimelineStats } from '@/api/timeline'

const { t } = useI18n()
const message = useMessage()
const loading = ref(false)
const events = ref<TimelineEvent[]>([])
const stats = ref<TimelineStats | null>(null)
const dateRange = ref<[number, number] | null>(null)
const selectedEventType = ref<string | undefined>(undefined)

// Date filter presets
const dateFilterOptions = [
  { label: 'All', value: 'all' },
  { label: 'Last 7 days', value: '7d' },
  { label: 'Last 30 days', value: '30d' },
  { label: 'Last 90 days', value: '90d' },
]
const dateFilterValue = ref('all')

// Event type filter options
const eventTypeOptions = [
  { label: 'All Types', value: '' },
  { label: t('timeline.eventTypes.session'), value: 'session' },
  { label: t('timeline.eventTypes.memory'), value: 'memory' },
  { label: t('timeline.eventTypes.skill'), value: 'skill' },
  { label: t('timeline.eventTypes.milestone'), value: 'milestone' },
]

onMounted(loadTimeline)

async function loadTimeline() {
  loading.value = true
  try {
    const since = dateRange.value?.[0]
    const until = dateRange.value?.[1]
    const response = await fetchTimeline(since, until, 200)
    events.value = response.events
    stats.value = response.stats
  } catch (err: any) {
    console.error('Failed to load timeline:', err)
    message.error('Failed to load timeline')
  } finally {
    loading.value = false
  }
}

function handleDateFilterChange(value: string) {
  dateFilterValue.value = value
  const now = Date.now()
  const dayMs = 24 * 60 * 60 * 1000

  switch (value) {
    case '7d':
      dateRange.value = [now - 7 * dayMs, now]
      break
    case '30d':
      dateRange.value = [now - 30 * dayMs, now]
      break
    case '90d':
      dateRange.value = [now - 90 * dayMs, now]
      break
    default:
      dateRange.value = null
  }
  loadTimeline()
}

function handleDatePickerChange(value: [number, number] | null) {
  dateRange.value = value
  dateFilterValue.value = 'all'
  loadTimeline()
}

// Filtered events based on selected type
const filteredEvents = computed(() => {
  if (!selectedEventType.value) return events.value
  return events.value.filter(e => e.event_type === selectedEventType.value)
})

// Format timestamp
function formatTime(ts: number): string {
  return new Date(ts).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatRelativeTime(ts: number): string {
  const now = Date.now()
  const diff = now - ts
  const minute = 60 * 1000
  const hour = 60 * minute
  const day = 24 * hour

  if (diff < minute) return 'Just now'
  if (diff < hour) return `${Math.floor(diff / minute)} min ago`
  if (diff < day) return `${Math.floor(diff / hour)} hours ago`
  if (diff < 7 * day) return `${Math.floor(diff / day)} days ago`

  return formatTime(ts)
}

// Icon SVGs based on event type and icon name
function getEventIcon(event: TimelineEvent): string {
  switch (event.icon) {
    case 'session':
      return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>`
    case 'session-end':
      return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <circle cx="12" cy="12" r="10"/>
        <line x1="15" y1="9" x2="9" y2="15"/>
        <line x1="9" y1="9" x2="15" y2="15"/>
      </svg>`
    case 'rocket':
      return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.5-3.5-1.27-1.22-2.67-1.2-2.5-.5z"/>
        <path d="M12 12l-8.5 8.5"/>
        <path d="M9.5 4.5c3.5-3.5 9-3 9-3s.5 5.5-3 9l-6.5 6.5"/>
      </svg>`
    case 'trophy':
      return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/>
        <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/>
        <path d="M4 22h16"/>
        <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/>
        <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/>
        <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>
      </svg>`
    case 'chat':
      return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
      </svg>`
    case 'star':
      return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
      </svg>`
    case 'award':
      return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <circle cx="12" cy="8" r="6"/>
        <path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/>
      </svg>`
    case 'crown':
      return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <path d="M2 17l3-7 5 4 4-9 4 9 5-4 3 7"/>
        <path d="M2 17l2 4h16l2-4"/>
      </svg>`
    case 'legend':
      return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <path d="M12 2L2 7l10 5 10-5-10-5z"/>
        <path d="M2 17l10 5 10-5"/>
        <path d="M2 12l10 5 10-5"/>
      </svg>`
    default:
      return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>`
  }
}

// Event type badge color
function getEventTagType(event: TimelineEvent): 'default' | 'success' | 'warning' | 'info' | 'error' {
  switch (event.event_type) {
    case 'milestone':
      return 'success'
    case 'session':
      return 'info'
    case 'memory':
      return 'warning'
    case 'skill':
      return 'default'
    default:
      return 'default'
  }
}
</script>

<template>
  <div class="timeline-view">
    <header class="timeline-header">
      <h2 class="header-title">{{ t('timeline.title') }}</h2>
      <div class="header-actions">
        <NSelect
          v-model:value="dateFilterValue"
          :options="dateFilterOptions"
          size="small"
          style="width: 120px"
          @update:value="handleDateFilterChange"
        />
        <NDatePicker
          v-model:value="dateRange"
          type="daterange"
          size="small"
          clearable
          @update:value="handleDatePickerChange"
        />
        <NButton size="small" quaternary @click="loadTimeline">
          <template #icon>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
          </template>
          {{ t('logs.refresh') }}
        </NButton>
      </div>
    </header>

    <!-- Stats summary -->
    <div v-if="stats" class="stats-bar">
      <div class="stat-item">
        <span class="stat-value">{{ stats.totalSessions }}</span>
        <span class="stat-label">{{ t('dashboard.sessions') }}</span>
      </div>
      <div class="stat-item">
        <span class="stat-value">{{ stats.totalMessages }}</span>
        <span class="stat-label">{{ t('dashboard.messages') }}</span>
      </div>
      <div class="stat-item">
        <span class="stat-value">{{ stats.milestones.length }}</span>
        <span class="stat-label">{{ t('timeline.milestones') }}</span>
      </div>
    </div>

    <div class="timeline-content">
      <div v-if="loading && events.length === 0" class="timeline-loading">{{ t('common.loading') }}</div>

      <!-- Event type filter -->
      <div class="filter-bar">
        <NSelect
          v-model:value="selectedEventType"
          :options="eventTypeOptions"
          size="small"
          style="width: 140px"
          placeholder="Filter by type"
        />
      </div>

      <!-- Timeline events -->
      <div v-if="filteredEvents.length > 0" class="timeline-list">
        <div v-for="event in filteredEvents" :key="event.id" class="timeline-item">
          <div class="timeline-marker">
            <span
              class="marker-icon"
              :class="`marker-${event.event_type}`"
              v-html="getEventIcon(event)"
            ></span>
          </div>
          <div class="timeline-card">
            <div class="card-header">
              <NTag :type="getEventTagType(event)" size="small" round>
                {{ t(`timeline.eventTypes.${event.event_type}`) }}
              </NTag>
              <span class="card-time">{{ formatRelativeTime(event.timestamp) }}</span>
            </div>
            <div class="card-title">{{ event.title }}</div>
            <div v-if="event.detail" class="card-detail">{{ event.detail }}</div>
          </div>
        </div>
      </div>

      <div v-else-if="!loading" class="timeline-empty">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" opacity="0.2">
          <circle cx="12" cy="12" r="10"/>
          <polyline points="12 6 12 12 16 14"/>
        </svg>
        <span>{{ t('common.noData') }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/variables' as *;

.timeline-view {
  min-height: 100%;
  display: flex;
  flex-direction: column;
}

.timeline-header {
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

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.stats-bar {
  display: flex;
  gap: 24px;
  padding: 12px 20px;
  background: $bg-secondary;
  border-bottom: 1px solid $border-color;
}

.stat-item {
  display: flex;
  align-items: baseline;
  gap: 6px;
}

.stat-value {
  font-size: 18px;
  font-weight: 600;
  color: $accent-primary;
}

.stat-label {
  font-size: 12px;
  color: $text-secondary;
}

.timeline-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px 20px;
}

.timeline-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  font-size: 13px;
  color: $text-muted;
}

.filter-bar {
  margin-bottom: 16px;
}

.timeline-list {
  position: relative;
  padding-left: 24px;

  // Vertical line
  &::before {
    content: '';
    position: absolute;
    left: 11px;
    top: 0;
    bottom: 0;
    width: 2px;
    background: $border-color;
  }
}

.timeline-item {
  position: relative;
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
}

.timeline-marker {
  position: relative;
  z-index: 1;
  flex-shrink: 0;
}

.marker-icon {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: $bg-card;
  border: 2px solid $border-color;
  display: flex;
  align-items: center;
  justify-content: center;
  color: $text-secondary;

  &.marker-milestone {
    background: $accent-50;
    border-color: $accent-500;
    color: $accent-500;
  }

  &.marker-session {
    background: $secondary-50;
    border-color: $secondary-500;
    color: $secondary-500;
  }

  &.marker-memory {
    background: $primary-50;
    border-color: $primary-500;
    color: $primary-500;
  }

  svg {
    width: 14px;
    height: 14px;
  }
}

.timeline-card {
  flex: 1;
  background: $bg-card;
  border: 1px solid $border-color;
  border-radius: $radius-md;
  padding: 12px 16px;
  transition: border-color $transition-fast;

  &:hover {
    border-color: $accent-muted;
  }
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.card-time {
  font-size: 11px;
  color: $text-muted;
}

.card-title {
  font-size: 14px;
  font-weight: 500;
  color: $text-primary;
}

.card-detail {
  font-size: 12px;
  color: $text-secondary;
  margin-top: 4px;
}

.timeline-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  height: 200px;
  color: $text-muted;
  font-size: 13px;
}
</style>