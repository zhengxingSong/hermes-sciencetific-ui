<script setup lang="ts">
import { ref, onMounted, computed, h } from 'vue'
import { useI18n } from 'vue-i18n'
import { NDataTable, NTag, NCard, NSpin, NEmpty, NIcon, useMessage } from 'naive-ui'
import { request } from '@/api/client'

const { t } = useI18n()
const message = useMessage()

interface Project {
  name: string
  path: string
  is_git: boolean
  branch?: string
  dirty: boolean
  activity: 'active' | 'inactive'
  last_modified?: number
}

const loading = ref(false)
const projects = ref<Project[]>([])

onMounted(() => {
  loadProjects()
})

async function loadProjects() {
  loading.value = true
  try {
    const data = await request<{ projects: Project[] }>('/api/projects')
    projects.value = data.projects || []
  } catch (err: any) {
    message.error('Failed to load projects: ' + err.message)
  } finally {
    loading.value = false
  }
}

// Format last modified time
function formatTime(timestamp?: number): string {
  if (!timestamp) return '-'
  const date = new Date(timestamp)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000))

  if (diffDays === 0) {
    return 'Today'
  } else if (diffDays === 1) {
    return 'Yesterday'
  } else if (diffDays < 7) {
    return `${diffDays} days ago`
  } else if (diffDays < 30) {
    return `${Math.floor(diffDays / 7)} weeks ago`
  } else if (diffDays < 365) {
    return `${Math.floor(diffDays / 30)} months ago`
  } else {
    return date.toLocaleDateString()
  }
}

// Git branch icon component
const GitBranchIcon = {
  template: `
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
      <line x1="6" y1="3" x2="6" y2="15" />
      <circle cx="18" cy="18" r="3" />
      <circle cx="6" cy="18" r="3" />
      <path d="M18 9a9 9 0 0 0-9 9" />
    </svg>
  `
}

// Git dirty indicator icon
const GitDirtyIcon = {
  template: `
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="12" r="8" />
    </svg>
  `
}

// Folder icon for non-git projects
const FolderIcon = {
  template: `
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  `
}

// Table columns definition
const columns = computed(() => [
  {
    title: t('projects.title') === '项目' ? '项目' : 'Project',
    key: 'name',
    render(row: Project) {
      return row.name
    }
  },
  {
    title: 'Path',
    key: 'path',
    ellipsis: true,
    render(row: Project) {
      // Show shortened path
      const shortPath = row.path.replace(/^\/home\/[^\/]+/, '~')
      return shortPath
    }
  },
  {
    title: 'Git',
    key: 'is_git',
    width: 80,
    render(row: Project) {
      if (row.is_git) {
        return h(NIcon, { component: GitBranchIcon, style: { color: '#4ade80' } })
      }
      return h(NIcon, { component: FolderIcon, style: { color: '#888' } })
    }
  },
  {
    title: t('projects.branch') === '分支' ? '分支' : 'Branch',
    key: 'branch',
    width: 120,
    render(row: Project) {
      if (!row.is_git || !row.branch) {
        return h('span', { style: { color: '#888' } }, '-')
      }
      return h(NTag, {
        type: 'info',
        size: 'small',
        bordered: false
      }, { default: () => row.branch })
    }
  },
  {
    title: t('projects.dirty') === '有改动' ? '状态' : 'Status',
    key: 'dirty',
    width: 100,
    render(row: Project) {
      if (!row.is_git) {
        return h('span', { style: { color: '#888' } }, '-')
      }
      if (row.dirty) {
        return h(NTag, {
          type: 'warning',
          size: 'small',
          bordered: false
        }, {
          default: () => [
            h(NIcon, { component: GitDirtyIcon, style: { marginRight: '4px', color: '#f59e0b' } }),
            'Dirty'
          ]
        })
      }
      return h(NTag, {
        type: 'success',
        size: 'small',
        bordered: false
      }, { default: () => 'Clean' })
    }
  },
  {
    title: t('projects.active') === '活跃' ? '活跃度' : 'Activity',
    key: 'activity',
    width: 100,
    render(row: Project) {
      const isActive = row.activity === 'active'
      return h(NTag, {
        type: isActive ? 'success' : 'default',
        size: 'small',
        bordered: false,
        style: {
          backgroundColor: isActive ? 'rgba(74, 222, 128, 0.1)' : 'rgba(100, 100, 100, 0.1)'
        }
      }, { default: () => isActive ? 'Active' : 'Inactive' })
    }
  },
  {
    title: 'Last Modified',
    key: 'last_modified',
    width: 120,
    render(row: Project) {
      return h('span', {
        style: {
          color: row.activity === 'active' ? '#4ade80' : '#888',
          fontSize: '12px'
        }
      }, formatTime(row.last_modified))
    }
  }
])
</script>

<template>
  <div class="projects-view">
    <header class="projects-header">
      <h2 class="header-title">{{ t('projects.title') }}</h2>
    </header>

    <div class="projects-content">
      <NSpin :show="loading">
        <NCard v-if="projects.length > 0" class="projects-card">
          <NDataTable
            :columns="columns"
            :data="projects"
            :bordered="false"
            :single-line="true"
            :striped="true"
            :max-height="600"
          />
        </NCard>
        <NEmpty v-else description="No projects found in home directory" />
      </NSpin>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/variables' as *;

.projects-view {
  min-height: 100%;
  display: flex;
  flex-direction: column;
}

.projects-header {
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

.projects-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.projects-card {
  background-color: $bg-secondary;
  border: 1px solid $border-color;
}
</style>