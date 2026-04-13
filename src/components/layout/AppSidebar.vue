<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAppStore } from '@/stores/app'
import ModelSelector from './ModelSelector.vue'
import LanguageSwitch from './LanguageSwitch.vue'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const appStore = useAppStore()

const selectedKey = computed(() => route.name as string)

function handleNav(key: string) {
  router.push({ name: key })
}

// Navigation groups for better organization (scientist-oriented)
const navGroups = [
  {
    id: 'core',
    label: 'Core',
    items: [
      { key: 'chat', icon: 'chat', labelKey: 'sidebar.chat' },
      { key: 'jobs', icon: 'calendar', labelKey: 'sidebar.jobs' },
    ]
  },
  {
    id: 'tools',
    label: 'Tools',
    items: [
      { key: 'projects', icon: 'folder', labelKey: 'sidebar.projects' },
      { key: 'skills', icon: 'layers', labelKey: 'sidebar.skills' },
      { key: 'memory', icon: 'lightbulb', labelKey: 'sidebar.memory' },
      { key: 'timeline', icon: 'clock', labelKey: 'sidebar.timeline' },
    ]
  },
  {
    id: 'analytics',
    label: 'Analytics',
    items: [
      { key: 'patterns', icon: 'chart', labelKey: 'sidebar.patterns' },
      { key: 'corrections', icon: 'editCheck', labelKey: 'sidebar.corrections' },
      { key: 'tokenCosts', icon: 'coins', labelKey: 'sidebar.tokenCosts' },
    ]
  },
  {
    id: 'config',
    label: 'Configuration',
    items: [
      { key: 'models', icon: 'cpu', labelKey: 'sidebar.models' },
      { key: 'agents', icon: 'user', labelKey: 'sidebar.agents' },
      { key: 'channels', icon: 'moon', labelKey: 'sidebar.channels' },
    ]
  },
  {
    id: 'system',
    label: 'System',
    items: [
      { key: 'logs', icon: 'fileText', labelKey: 'sidebar.logs' },
      { key: 'settings', icon: 'settings', labelKey: 'sidebar.settings' },
    ]
  },
]
</script>

<template>
  <aside class="sidebar">
    <!-- Logo -->
    <div class="sidebar-logo" @click="router.push('/')">
      <img src="/assets/logo.png" alt="Hermes" class="logo-img" />
      <span class="logo-text">Hermes</span>
    </div>

    <!-- Navigation Groups -->
    <nav class="sidebar-nav">
      <div v-for="group in navGroups" :key="group.id" class="nav-group">
        <div class="nav-group-label">{{ group.label }}</div>
        <button
          v-for="item in group.items"
          :key="item.key"
          class="nav-item"
          :class="{ active: selectedKey === item.key }"
          @click="handleNav(item.key)"
        >
          <!-- Chat icon -->
          <svg v-if="item.icon === 'chat'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <!-- Calendar icon -->
          <svg v-else-if="item.icon === 'calendar'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          <!-- Layers icon -->
          <svg v-else-if="item.icon === 'layers'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="12 2 2 7 12 12 22 7 12 2" />
            <polyline points="2 17 12 22 22 17" />
            <polyline points="2 12 12 17 22 12" />
          </svg>
          <!-- Lightbulb icon -->
          <svg v-else-if="item.icon === 'lightbulb'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 18h6" />
            <path d="M10 22h4" />
            <path d="M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z" />
          </svg>
          <!-- CPU icon -->
          <svg v-else-if="item.icon === 'cpu'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M12 1v4" /><path d="M12 19v4" />
            <path d="M1 12h4" /><path d="M19 12h4" />
            <path d="M4.22 4.22l2.83 2.83" /><path d="M16.95 16.95l2.83 2.83" />
            <path d="M4.22 19.78l2.83-2.83" /><path d="M16.95 7.05l2.83-2.83" />
          </svg>
          <!-- User icon -->
          <svg v-else-if="item.icon === 'user'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          <!-- Moon icon -->
          <svg v-else-if="item.icon === 'moon'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
          <!-- File text icon -->
          <svg v-else-if="item.icon === 'fileText'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
          </svg>
          <!-- Settings icon -->
          <svg v-else-if="item.icon === 'settings'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
          <!-- Coins icon -->
          <svg v-else-if="item.icon === 'coins'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="8" cy="8" r="6" />
            <path d="M18.09 10.5A6 6 0 1 1 10.5 18.09" />
            <path d="M18 14a6 6 0 0 0-12 0" />
          </svg>
          <!-- Folder icon -->
          <svg v-else-if="item.icon === 'folder'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
          </svg>
          <!-- Clock icon -->
          <svg v-else-if="item.icon === 'clock'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          <!-- Chart icon -->
          <svg v-else-if="item.icon === 'chart'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="20" x2="18" y2="10" />
            <line x1="12" y1="20" x2="12" y2="4" />
            <line x1="6" y1="20" x2="6" y2="14" />
          </svg>
          <!-- Edit check icon -->
          <svg v-else-if="item.icon === 'editCheck'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            <polyline points="15 6 20 11" />
          </svg>
          <span>{{ t(item.labelKey) }}</span>
        </button>
      </div>
    </nav>

    <!-- Model Selector -->
    <ModelSelector />

    <!-- Footer -->
    <div class="sidebar-footer">
      <div class="status-row">
        <div class="status-indicator" :class="{ connected: appStore.connected, disconnected: !appStore.connected }">
          <span class="status-dot"></span>
          <span class="status-text">{{ appStore.connected ? t('sidebar.connected') : t('sidebar.disconnected') }}</span>
        </div>
        <LanguageSwitch />
      </div>
      <div class="version-info tabular-nums">Hermes {{ appStore.serverVersion || 'v0.1.0' }}</div>
    </div>
  </aside>
</template>

<style scoped lang="scss">
@use '@/styles/variables' as *;

.sidebar {
  width: $sidebar-width;
  height: 100vh;
  background-color: $bg-sidebar;
  border-right: 1px solid $border-color;
  display: flex;
  flex-direction: column;
  padding: 16px 10px;
  flex-shrink: 0;
  transition: width $transition-normal;
}

.logo-img {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  flex-shrink: 0;
}

.sidebar-logo {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px 16px;
  color: $accent-primary;
  cursor: pointer;
  border-radius: $radius-sm;
  transition: background-color $transition-fast;

  &:hover {
    background-color: rgba($accent-primary, 0.04);
  }

  .logo-text {
    font-family: 'Exo', sans-serif;
    font-size: 17px;
    font-weight: 600;
    letter-spacing: 0.03em;
  }
}

.sidebar-nav {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow-y: auto;
}

.nav-group {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.nav-group-label {
  font-family: 'Exo', sans-serif;
  font-size: 11px;
  font-weight: 500;
  color: $text-muted;
  padding: 8px 10px 4px;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border: none;
  background: none;
  color: $text-secondary;
  font-size: 13px;
  font-weight: 500;
  border-radius: $radius-sm;
  cursor: pointer;
  transition: all $transition-fast;
  width: 100%;
  text-align: left;

  &:hover {
    background-color: rgba($accent-primary, 0.06);
    color: $text-primary;
  }

  &.active {
    background-color: rgba($accent-primary, 0.10);
    color: $accent-primary;
    font-weight: 600;

    svg {
      stroke-width: 2;
    }
  }

  svg {
    flex-shrink: 0;
    opacity: 0.9;
  }
}

.sidebar-footer {
  padding-top: 12px;
  border-top: 1px solid $border-color;
  margin-top: 8px;
}

.status-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 10px;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 500;

  .status-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  &.connected .status-dot {
    background-color: $success;
    box-shadow: 0 0 4px rgba($success, 0.6);
  }

  &.disconnected .status-dot {
    background-color: $error;
  }

  .status-text {
    color: $text-secondary;
  }
}

.version-info {
  padding: 2px 10px 6px;
  font-size: 11px;
  font-weight: 500;
  color: $text-muted;
}
</style>