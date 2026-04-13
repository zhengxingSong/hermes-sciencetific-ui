<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { NCard, NStatistic, NSpin, NDataTable, NGrid, NGi, NEmpty } from 'naive-ui'
import type { DataTableColumns } from 'naive-ui'
import { request } from '@/api/client'

interface DashboardOverview {
  sessions_count: number
  messages_count: number
  tool_calls_count: number
  total_tokens: number
  input_tokens: number
  output_tokens: number
}

interface CurrentConfig {
  model: string
  provider: string
}

interface ModelUsage {
  model: string
  sessions: number
  tokens: number
}

interface DailyTrend {
  date: string
  sessions: number
  messages: number
}

interface TopTool {
  tool: string
  count: number
}

interface DashboardData {
  overview: DashboardOverview
  current_config: CurrentConfig
  model_usage: ModelUsage[]
  daily_trend: DailyTrend[]
  top_tools: TopTool[]
}

const loading = ref(true)
const dashboardData = ref<DashboardData | null>(null)
const error = ref<string | null>(null)

// Model usage table columns
const modelUsageColumns: DataTableColumns<ModelUsage> = [
  {
    title: 'Model',
    key: 'model',
    ellipsis: { tooltip: true }
  },
  {
    title: 'Sessions',
    key: 'sessions',
    width: 100,
    align: 'right'
  },
  {
    title: 'Tokens',
    key: 'tokens',
    width: 120,
    align: 'right',
    render(row) {
      return row.tokens.toLocaleString()
    }
  }
]

// Daily trend table columns
const dailyTrendColumns: DataTableColumns<DailyTrend> = [
  {
    title: 'Date',
    key: 'date',
    width: 120
  },
  {
    title: 'Sessions',
    key: 'sessions',
    width: 100,
    align: 'right'
  },
  {
    title: 'Messages',
    key: 'messages',
    width: 100,
    align: 'right'
  }
]

// Top tools table columns
const topToolsColumns: DataTableColumns<TopTool> = [
  {
    title: 'Tool',
    key: 'tool',
    ellipsis: { tooltip: true }
  },
  {
    title: 'Count',
    key: 'count',
    width: 100,
    align: 'right'
  }
]

// Computed values for formatted display
const formattedTotalTokens = computed(() => {
  if (!dashboardData.value?.overview.total_tokens) return '0'
  return dashboardData.value.overview.total_tokens.toLocaleString()
})

const formattedInputTokens = computed(() => {
  if (!dashboardData.value?.overview.input_tokens) return '0'
  return dashboardData.value.overview.input_tokens.toLocaleString()
})

const formattedOutputTokens = computed(() => {
  if (!dashboardData.value?.overview.output_tokens) return '0'
  return dashboardData.value.overview.output_tokens.toLocaleString()
})

async function fetchDashboardData() {
  loading.value = true
  error.value = null

  try {
    dashboardData.value = await request<DashboardData>('/api/dashboard')
  } catch (err: any) {
    error.value = err.message || 'Failed to load dashboard data'
    console.error('Failed to fetch dashboard data:', err)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchDashboardData()
})
</script>

<template>
  <div class="dashboard-view">
    <header class="dashboard-header">
      <h2 class="header-title">Dashboard</h2>
    </header>

    <div class="dashboard-content">
      <NSpin :show="loading">
        <div v-if="error" class="error-message">
          {{ error }}
        </div>

        <template v-else-if="dashboardData">
          <!-- Overview Cards -->
          <section class="overview-section">
            <NGrid :cols="4" :x-gap="16" :y-gap="16" responsive="screen" item-responsive>
              <NGi span="4 m:2 l:1">
                <NCard class="stat-card" :bordered="true">
                  <NStatistic label="Sessions" :value="dashboardData.overview.sessions_count">
                    <template #prefix>
                      <span class="stat-icon sessions-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                        </svg>
                      </span>
                    </template>
                  </NStatistic>
                </NCard>
              </NGi>

              <NGi span="4 m:2 l:1">
                <NCard class="stat-card" :bordered="true">
                  <NStatistic label="Messages" :value="dashboardData.overview.messages_count">
                    <template #prefix>
                      <span class="stat-icon messages-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <line x1="22" y1="2" x2="11" y2="13"></line>
                          <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                        </svg>
                      </span>
                    </template>
                  </NStatistic>
                </NCard>
              </NGi>

              <NGi span="4 m:2 l:1">
                <NCard class="stat-card" :bordered="true">
                  <NStatistic label="Total Tokens" :value="formattedTotalTokens">
                    <template #prefix>
                      <span class="stat-icon tokens-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <circle cx="12" cy="12" r="10"></circle>
                          <path d="M12 6v12"></path>
                          <path d="M8 10h8"></path>
                          <path d="M8 14h8"></path>
                        </svg>
                      </span>
                    </template>
                  </NStatistic>
                  <div class="stat-subtext">
                    Input: {{ formattedInputTokens }} / Output: {{ formattedOutputTokens }}
                  </div>
                </NCard>
              </NGi>

              <NGi span="4 m:2 l:1">
                <NCard class="stat-card" :bordered="true">
                  <NStatistic label="Tool Calls" :value="dashboardData.overview.tool_calls_count">
                    <template #prefix>
                      <span class="stat-icon tools-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>
                        </svg>
                      </span>
                    </template>
                  </NStatistic>
                </NCard>
              </NGi>
            </NGrid>
          </section>

          <!-- Current Config Section -->
          <section v-if="dashboardData.current_config" class="config-section">
            <NCard class="config-card" :bordered="true">
              <div class="config-header">
                <h3 class="section-title">Current Configuration</h3>
              </div>
              <div class="config-info">
                <div class="config-item">
                  <span class="config-label">Provider:</span>
                  <span class="config-value">{{ dashboardData.current_config.provider || 'N/A' }}</span>
                </div>
                <div class="config-item">
                  <span class="config-label">Model:</span>
                  <span class="config-value">{{ dashboardData.current_config.model || 'N/A' }}</span>
                </div>
              </div>
            </NCard>
          </section>

          <!-- Model Usage Section -->
          <section class="data-section">
            <NCard class="data-card" :bordered="true">
              <template #header>
                <h3 class="section-title">Model Usage</h3>
              </template>
              <NDataTable
                v-if="dashboardData.model_usage?.length > 0"
                :columns="modelUsageColumns"
                :data="dashboardData.model_usage"
                :bordered="false"
                size="small"
                :max-height="300"
              />
              <NEmpty v-else description="No model usage data available" />
            </NCard>
          </section>

          <!-- Daily Trend & Top Tools Section -->
          <section class="dual-section">
            <NGrid :cols="2" :x-gap="16" :y-gap="16" responsive="screen" item-responsive>
              <NGi span="2 m:1">
                <NCard class="data-card" :bordered="true">
                  <template #header>
                    <h3 class="section-title">Daily Trend</h3>
                  </template>
                  <NDataTable
                    v-if="dashboardData.daily_trend?.length > 0"
                    :columns="dailyTrendColumns"
                    :data="dashboardData.daily_trend"
                    :bordered="false"
                    size="small"
                    :max-height="300"
                  />
                  <NEmpty v-else description="No daily trend data available" />
                </NCard>
              </NGi>

              <NGi span="2 m:1">
                <NCard class="data-card" :bordered="true">
                  <template #header>
                    <h3 class="section-title">Top Tools</h3>
                  </template>
                  <NDataTable
                    v-if="dashboardData.top_tools?.length > 0"
                    :columns="topToolsColumns"
                    :data="dashboardData.top_tools"
                    :bordered="false"
                    size="small"
                    :max-height="300"
                  />
                  <NEmpty v-else description="No tools usage data available" />
                </NCard>
              </NGi>
            </NGrid>
          </section>
        </template>

        <template v-else-if="!loading">
          <NEmpty description="No dashboard data available" />
        </template>
      </NSpin>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/variables' as *;

.dashboard-view {
  min-height: 100%;
  display: flex;
  flex-direction: column;
}

.dashboard-header {
  display: flex;
  align-items: center;
  padding: 12px 20px;
  border-bottom: 1px solid $border-color;
  flex-shrink: 0;
}

.header-title {
  font-size: 16px;
  font-weight: 600;
  color: $text-primary;
}

.dashboard-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.error-message {
  padding: 16px;
  background: rgba(220, 38, 38, 0.1);
  border: 1px solid rgba(220, 38, 38, 0.3);
  border-radius: $radius-md;
  color: $error;
  text-align: center;
}

.overview-section {
  margin-bottom: 20px;
}

.stat-card {
  background: $bg-card;
  border: 1px solid $border-color;
  border-radius: $radius-md;
  transition: border-color $transition-fast;

  &:hover {
    border-color: $accent-muted;
  }
}

.stat-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: $radius-sm;
  margin-right: 8px;

  &.sessions-icon {
    background: rgba(30, 58, 95, 0.1);
    color: $accent-primary;
  }

  &.messages-icon {
    background: rgba(37, 99, 235, 0.1);
    color: $secondary-500;
  }

  &.tokens-icon {
    background: rgba(5, 150, 105, 0.1);
    color: $success;
  }

  &.tools-icon {
    background: rgba(217, 119, 6, 0.1);
    color: $warning;
  }
}

.stat-subtext {
  margin-top: 8px;
  font-size: 12px;
  color: $text-muted;
}

.config-section {
  margin-bottom: 20px;
}

.config-card {
  background: $bg-card;
  border: 1px solid $border-color;
  border-radius: $radius-md;
}

.config-header {
  margin-bottom: 12px;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: $text-primary;
  margin: 0;
}

.config-info {
  display: flex;
  gap: 24px;
}

.config-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.config-label {
  font-size: 13px;
  color: $text-muted;
}

.config-value {
  font-size: 13px;
  font-weight: 500;
  color: $text-primary;
  font-family: $font-code;
}

.data-section {
  margin-bottom: 20px;
}

.data-card {
  background: $bg-card;
  border: 1px solid $border-color;
  border-radius: $radius-md;
}

.dual-section {
  margin-bottom: 20px;
}

:deep(.n-card-header) {
  padding: 12px 16px;
  border-bottom: 1px solid $border-color;
}

:deep(.n-card__content) {
  padding: 16px;
}

:deep(.n-statistic) {
  .n-statistic-value__content {
    font-family: $font-code;
    font-size: 24px;
    font-weight: 600;
    color: $text-primary;
  }

  .n-statistic__label {
    font-size: 12px;
    color: $text-muted;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
}

:deep(.n-data-table) {
  .n-data-table-th {
    font-weight: 600;
    color: $text-secondary;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .n-data-table-td {
    font-size: 13px;
    color: $text-primary;
  }

  .n-data-table-tr:hover .n-data-table-td {
    background: $bg-secondary;
  }
}
</style>