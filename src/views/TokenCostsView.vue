<script setup lang="ts">
import { ref, onMounted, computed, h } from 'vue'
import { NCard, NDataTable, NDescriptions, NDescriptionsItem, NTag, NSpin, NButton, useMessage } from 'naive-ui'
import { useI18n } from 'vue-i18n'
import { request } from '@/api/client'
import type { DataTableColumns } from 'naive-ui'

const { t } = useI18n()
const message = useMessage()

// Data interfaces
interface TodayStats {
  date: string
  session_count: number
  tokens: number
  cost_usd: number
}

interface AllTimeStats {
  session_count: number
  total_tokens: number
  cost_usd: number
}

interface ModelBreakdown {
  model: string
  sessions: number
  input_tokens: number
  output_tokens: number
  cost_usd: number
}

interface DailyTrend {
  date: string
  cost: number
  tokens: number
}

interface PricingInfo {
  input: number
  output: number
}

interface TokenCostsData {
  today: TodayStats
  all_time: AllTimeStats
  by_model: ModelBreakdown[]
  daily_trend: DailyTrend[]
  pricing_table: Record<string, PricingInfo>
}

const loading = ref(false)
const data = ref<TokenCostsData | null>(null)

// Format helpers
function formatCost(cost: number): string {
  if (cost === 0) return '$0.00'
  return `$${cost.toFixed(2)}`
}

function formatTokens(tokens: number): string {
  if (tokens === 0) return '0'
  if (tokens >= 1_000_000) {
    return `${(tokens / 1_000_000).toFixed(1)}M`
  }
  if (tokens >= 1_000) {
    return `${(tokens / 1_000).toFixed(1)}K`
  }
  return tokens.toString()
}

function formatNumber(num: number): string {
  return num.toLocaleString()
}

function getCostLabel(cost: number): string {
  if (cost === 0) return 'Free'
  return formatCost(cost)
}

// Model breakdown table columns
const modelColumns: DataTableColumns<ModelBreakdown> = [
  {
    title: t('tokenCosts.model'),
    key: 'model',
    sorter: (a, b) => a.model.localeCompare(b.model),
  },
  {
    title: t('tokenCosts.sessions'),
    key: 'sessions',
    sorter: (a, b) => a.sessions - b.sessions,
    render: (row) => formatNumber(row.sessions),
  },
  {
    title: t('tokenCosts.inputTokens'),
    key: 'input_tokens',
    sorter: (a, b) => a.input_tokens - b.input_tokens,
    render: (row) => h('span', { class: 'tabular-nums' }, formatTokens(row.input_tokens)),
  },
  {
    title: t('tokenCosts.outputTokens'),
    key: 'output_tokens',
    sorter: (a, b) => a.output_tokens - b.output_tokens,
    render: (row) => h('span', { class: 'tabular-nums' }, formatTokens(row.output_tokens)),
  },
  {
    title: t('tokenCosts.cost'),
    key: 'cost_usd',
    defaultSortOrder: 'descend',
    sorter: (a, b) => a.cost_usd - b.cost_usd,
    render: (row) => {
      const label = getCostLabel(row.cost_usd)
      if (row.cost_usd === 0) {
        return h(NTag, { type: 'success', size: 'small' }, { default: () => label })
      }
      if (row.cost_usd > 10) {
        return h(NTag, { type: 'warning', size: 'small' }, { default: () => label })
      }
      return h('span', { class: 'cost-value tabular-nums' }, label)
    },
  },
]

// Daily trend table columns
const trendColumns: DataTableColumns<DailyTrend> = [
  {
    title: t('tokenCosts.date'),
    key: 'date',
    sorter: (a, b) => a.date.localeCompare(b.date),
  },
  {
    title: t('tokenCosts.tokens'),
    key: 'tokens',
    sorter: (a, b) => a.tokens - b.tokens,
    render: (row) => h('span', { class: 'tabular-nums' }, formatTokens(row.tokens)),
  },
  {
    title: t('tokenCosts.cost'),
    key: 'cost',
    defaultSortOrder: 'descend',
    sorter: (a, b) => a.cost - b.cost,
    render: (row) => h('span', { class: 'cost-value tabular-nums' }, formatCost(row.cost)),
  },
]

// Pricing table computed
const pricingList = computed(() => {
  if (!data.value?.pricing_table) return []
  return Object.entries(data.value.pricing_table).map(([model, pricing]) => ({
    model,
    inputPerM: pricing.input,
    outputPerM: pricing.output,
  }))
})

const pricingColumns: DataTableColumns<{ model: string; inputPerM: number; outputPerM: number }> = [
  {
    title: t('tokenCosts.model'),
    key: 'model',
  },
  {
    title: t('tokenCosts.inputPerM'),
    key: 'inputPerM',
    render: (row) => h('span', { class: 'cost-value tabular-nums' }, `$${row.inputPerM.toFixed(2)}`),
  },
  {
    title: t('tokenCosts.outputPerM'),
    key: 'outputPerM',
    render: (row) => h('span', { class: 'cost-value tabular-nums' }, `$${row.outputPerM.toFixed(2)}`),
  },
]

async function fetchData() {
  loading.value = true
  try {
    data.value = await request<TokenCostsData>('/api/token-costs')
  } catch (e: any) {
    message.error(e.message || t('tokenCosts.loadFailed'))
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchData()
})
</script>

<template>
  <div class="token-costs-view">
    <header class="costs-header">
      <h2 class="header-title">{{ t('tokenCosts.title') }}</h2>
      <NButton size="small" :loading="loading" @click="fetchData">
        {{ t('common.fetch') }}
      </NButton>
    </header>

    <div class="costs-content">
      <NSpin :show="loading">
        <div v-if="data" class="content-grid">
          <!-- Today's Stats Card -->
          <NCard class="stats-card" :title="t('tokenCosts.todayStats')">
            <NDescriptions label-placement="left" :column="2">
              <NDescriptionsItem :label="t('tokenCosts.date')">
                <span class="tabular-nums">{{ data.today.date }}</span>
              </NDescriptionsItem>
              <NDescriptionsItem :label="t('tokenCosts.sessions')">
                <span class="tabular-nums">{{ formatNumber(data.today.session_count) }}</span>
              </NDescriptionsItem>
              <NDescriptionsItem :label="t('tokenCosts.tokens')">
                <span class="tabular-nums">{{ formatTokens(data.today.tokens) }}</span>
              </NDescriptionsItem>
              <NDescriptionsItem :label="t('tokenCosts.cost')">
                <span class="cost-value tabular-nums">{{ formatCost(data.today.cost_usd) }}</span>
              </NDescriptionsItem>
            </NDescriptions>
          </NCard>

          <!-- All-Time Stats Card -->
          <NCard class="stats-card" :title="t('tokenCosts.allTimeStats')">
            <NDescriptions label-placement="left" :column="1">
              <NDescriptionsItem :label="t('tokenCosts.totalSessions')">
                <span class="tabular-nums">{{ formatNumber(data.all_time.session_count) }}</span>
              </NDescriptionsItem>
              <NDescriptionsItem :label="t('tokenCosts.totalTokens')">
                <span class="tabular-nums">{{ formatTokens(data.all_time.total_tokens) }}</span>
              </NDescriptionsItem>
              <NDescriptionsItem :label="t('tokenCosts.totalCost')">
                <span class="cost-value tabular-nums">{{ formatCost(data.all_time.cost_usd) }}</span>
              </NDescriptionsItem>
            </NDescriptions>
          </NCard>

          <!-- Model Breakdown Table -->
          <NCard class="table-card" :title="t('tokenCosts.modelBreakdown')">
            <NDataTable
              :columns="modelColumns"
              :data="data.by_model"
              :pagination="{ pageSize: 10 }"
              :bordered="false"
              size="small"
            />
          </NCard>

          <!-- Daily Trend -->
          <NCard class="table-card" :title="t('tokenCosts.dailyTrend')">
            <NDataTable
              :columns="trendColumns"
              :data="data.daily_trend"
              :pagination="{ pageSize: 7 }"
              :bordered="false"
              size="small"
            />
          </NCard>

          <!-- Pricing Reference -->
          <NCard class="pricing-card" :title="t('tokenCosts.pricingReference')">
            <NDataTable
              :columns="pricingColumns"
              :data="pricingList"
              :pagination="false"
              :bordered="false"
              size="small"
            />
          </NCard>
        </div>

        <div v-else-if="!loading" class="empty-state">
          {{ t('common.noData') }}
        </div>
      </NSpin>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/variables' as *;

.token-costs-view {
  min-height: 100%;
  display: flex;
  flex-direction: column;
}

.costs-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  border-bottom: 1px solid $border-color;
  flex-shrink: 0;
  gap: 12px;
  flex-wrap: wrap;

  .header-title {
    font-size: 16px;
    font-weight: 600;
    color: $text-primary;
    white-space: nowrap;
  }
}

.costs-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.content-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
}

.stats-card {
  background: $bg-card;
  border: 1px solid $border-color;
  border-radius: $radius-md;

  :deep(.n-card-header) {
    padding: 12px 16px;
    border-bottom: 1px solid $border-color;

    .n-card-header__main {
      font-family: 'Exo', sans-serif;
      font-size: 14px;
      font-weight: 600;
      color: $text-primary;
    }
  }

  :deep(.n-card__content) {
    padding: 16px;
  }

  :deep(.n-descriptions) {
    .n-descriptions-label {
      font-size: 13px;
      color: $text-muted;
    }

    .n-descriptions-content {
      font-size: 13px;
      color: $text-primary;
    }
  }
}

.table-card {
  background: $bg-card;
  border: 1px solid $border-color;
  border-radius: $radius-md;
  grid-column: span 2;

  @media (max-width: 900px) {
    grid-column: span 1;
  }

  :deep(.n-card-header) {
    padding: 12px 16px;
    border-bottom: 1px solid $border-color;

    .n-card-header__main {
      font-family: 'Exo', sans-serif;
      font-size: 14px;
      font-weight: 600;
      color: $text-primary;
    }
  }

  :deep(.n-card__content) {
    padding: 12px 16px;
  }

  :deep(.n-data-table) {
    .n-data-table-th {
      font-family: 'Exo', sans-serif;
      font-size: 12px;
      font-weight: 600;
      color: $text-muted;
      background: transparent;
      border-bottom: 1px solid $border-color;
    }

    .n-data-table-td {
      font-size: 13px;
      color: $text-primary;
      border-bottom: 1px solid $border-light;
    }

    .n-data-table-tr:hover .n-data-table-td {
      background: rgba($accent-primary, 0.03);
    }
  }
}

.pricing-card {
  background: $bg-card;
  border: 1px solid $border-color;
  border-radius: $radius-md;
  grid-column: span 2;

  @media (max-width: 900px) {
    grid-column: span 1;
  }

  :deep(.n-card-header) {
    padding: 12px 16px;
    border-bottom: 1px solid $border-color;

    .n-card-header__main {
      font-family: 'Exo', sans-serif;
      font-size: 14px;
      font-weight: 600;
      color: $text-primary;
    }
  }

  :deep(.n-card__content) {
    padding: 12px 16px;
  }

  :deep(.n-data-table) {
    .n-data-table-th {
      font-family: 'Exo', sans-serif;
      font-size: 12px;
      font-weight: 600;
      color: $text-muted;
      background: transparent;
      border-bottom: 1px solid $border-color;
    }

    .n-data-table-td {
      font-size: 13px;
      color: $text-primary;
    }
  }
}

.cost-value {
  font-family: $font-code;
  font-weight: 500;
}

.tabular-nums {
  font-variant-numeric: tabular-nums;
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: $text-muted;
  font-size: 13px;
}

:deep(.n-tag) {
  font-family: $font-code;
  font-size: 12px;
}
</style>