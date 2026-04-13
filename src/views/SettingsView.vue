<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { NTabs, NTabPane, NSpin, NSwitch, NInput, NInputNumber, NButton, NAlert, useMessage } from 'naive-ui'
import { useI18n } from 'vue-i18n'
import { useSettingsStore } from '@/stores/settings'
import DisplaySettings from '@/components/settings/DisplaySettings.vue'
import AgentSettings from '@/components/settings/AgentSettings.vue'
import MemorySettings from '@/components/settings/MemorySettings.vue'
import SessionSettings from '@/components/settings/SessionSettings.vue'
import PrivacySettings from '@/components/settings/PrivacySettings.vue'
import SettingRow from '@/components/settings/SettingRow.vue'
import { setApiKey, getApiKey as getStoredApiKey } from '@/api/client'

const settingsStore = useSettingsStore()
const message = useMessage()
const { t } = useI18n()

const webUiApiKey = ref(getStoredApiKey())
const authStatus = ref<'none' | 'configured' | 'saved'>('none')

onMounted(() => {
  settingsStore.fetchSettings()
  if (webUiApiKey.value) {
    authStatus.value = 'configured'
  }
})

async function saveApiServer(values: Record<string, any>) {
  try {
    await settingsStore.saveSection('platforms', { api_server: values })
    message.success(t('settings.saved'))
  } catch (err: any) {
    message.error(t('settings.saveFailed'))
  }
}

function saveWebUiApiKey() {
  if (webUiApiKey.value) {
    setApiKey(webUiApiKey.value)
    authStatus.value = 'saved'
    message.success(t('settings.saved'))
  }
}

function clearWebUiApiKey() {
  setApiKey('')
  webUiApiKey.value = ''
  authStatus.value = 'none'
  message.success(t('settings.webUi.keyCleared'))
}

function generateApiKey() {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  webUiApiKey.value = Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('')
}
</script>

<template>
  <div class="settings-view">
    <header class="settings-header">
      <h2 class="header-title">{{ t('settings.title') }}</h2>
    </header>

    <div class="settings-content">
      <NSpin :show="settingsStore.loading">
        <NTabs type="line" animated>
          <NTabPane name="webui" :tab="t('settings.tabs.webUi')">
            <section class="settings-section">
              <NAlert type="info" style="margin-bottom: 16px">
                {{ t('settings.webUi.authHint') }}
              </NAlert>

              <SettingRow :label="t('settings.webUi.authEnabled')" :hint="t('settings.webUi.authEnabledHint')">
                <div style="display: flex; align-items: center; gap: 8px;">
                  <span :class="['auth-badge', authStatus]">
                    {{ authStatus === 'configured' || authStatus === 'saved' ? t('common.configured') : t('common.notConfigured') }}
                  </span>
                  <span v-if="authStatus === 'saved'" style="font-size: 11px; color: $text-muted;">
                    {{ t('settings.webUi.keySaved') }}
                  </span>
                </div>
              </SettingRow>

              <SettingRow :label="t('settings.webUi.apiKey')" :hint="t('settings.webUi.apiKeyHint')">
                <div style="display: flex; gap: 8px; align-items: center;">
                  <NInput
                    v-model:value="webUiApiKey"
                    type="password"
                    show-password-on="click"
                    size="small"
                    style="width: 320px"
                    placeholder="sk-..."
                  />
                  <NButton size="small" @click="generateApiKey">
                    {{ t('settings.webUi.generate') }}
                  </NButton>
                </div>
              </SettingRow>

              <SettingRow label="">
                <div style="display: flex; gap: 8px;">
                  <NButton size="small" type="primary" @click="saveWebUiApiKey" :disabled="!webUiApiKey">
                    {{ t('common.save') }}
                  </NButton>
                  <NButton size="small" @click="clearWebUiApiKey" :disabled="!webUiApiKey">
                    {{ t('settings.webUi.clearKey') }}
                  </NButton>
                </div>
              </SettingRow>

              <div class="env-hint-box">
                <p class="hint-title">{{ t('settings.webUi.serverConfig') }}</p>
                <p class="hint-desc">{{ t('settings.webUi.envHint') }}</p>
                <code class="env-code">export HERMES_WEB_API_KEY="your-secret-key"</code>
                <p class="hint-desc" style="margin-top: 8px;">{{ t('settings.webUi.matchingHint') }}</p>
              </div>
            </section>
          </NTabPane>

          <NTabPane name="display" :tab="t('settings.tabs.display')">
            <DisplaySettings />
          </NTabPane>
          <NTabPane name="agent" :tab="t('settings.tabs.agent')">
            <AgentSettings />
          </NTabPane>
          <NTabPane name="memory" :tab="t('settings.tabs.memory')">
            <MemorySettings />
          </NTabPane>
          <NTabPane name="session" :tab="t('settings.tabs.session')">
            <SessionSettings />
          </NTabPane>
          <NTabPane name="privacy" :tab="t('settings.tabs.privacy')">
            <PrivacySettings />
          </NTabPane>
          <NTabPane name="api_server" :tab="t('settings.tabs.apiServer')">
            <section class="settings-section">
              <SettingRow :label="t('settings.apiServer.enable')" :hint="t('settings.apiServer.enableHint')">
                <NSwitch
                  :value="settingsStore.platforms?.api_server?.enabled"
                  @update:value="v => saveApiServer({ enabled: v })"
                />
              </SettingRow>
              <SettingRow :label="t('settings.apiServer.host')" :hint="t('settings.apiServer.hostHint')">
                <NInput
                  :value="settingsStore.platforms?.api_server?.host || ''"
                  size="small" style="width: 200px"
                  @update:value="v => saveApiServer({ host: v })"
                />
              </SettingRow>
              <SettingRow :label="t('settings.apiServer.port')" :hint="t('settings.apiServer.portHint')">
                <NInputNumber
                  :value="settingsStore.platforms?.api_server?.port"
                  :min="1024" :max="65535"
                  size="small" style="width: 120px"
                  @update:value="v => v != null && saveApiServer({ port: v })"
                />
              </SettingRow>
              <SettingRow :label="t('settings.apiServer.key')" :hint="t('settings.apiServer.keyHint')">
                <NInput
                  :value="settingsStore.platforms?.api_server?.key || ''"
                  type="password" show-password-on="click"
                  size="small" style="width: 200px"
                  @update:value="v => saveApiServer({ key: v })"
                />
              </SettingRow>
              <SettingRow :label="t('settings.apiServer.cors')" :hint="t('settings.apiServer.corsHint')">
                <NInput
                  :value="settingsStore.platforms?.api_server?.cors_origins || ''"
                  size="small" style="width: 200px"
                  @update:value="v => saveApiServer({ cors_origins: v })"
                />
              </SettingRow>
            </section>
          </NTabPane>
        </NTabs>
      </NSpin>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/variables' as *;

.settings-view {
  min-height: 100%;
  display: flex;
  flex-direction: column;
}

.settings-header {
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

.settings-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.settings-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.auth-badge {
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;

  &.none {
    background: rgba(255, 100, 100, 0.15);
    color: #ff6b6b;
  }

  &.configured, &.saved {
    background: rgba(100, 200, 100, 0.15);
    color: #4ade80;
  }
}

.env-hint-box {
  margin-top: 16px;
  padding: 16px;
  background: $bg-secondary;
  border: 1px solid $border-color;
  border-radius: $radius-md;

  .hint-title {
    font-family: 'Exo', sans-serif;
    font-size: 13px;
    font-weight: 600;
    color: $text-primary;
    margin-bottom: 8px;
  }

  .hint-desc {
    font-size: 12px;
    color: $text-muted;
    margin-bottom: 8px;
  }

  .env-code {
    font-family: $font-code;
    font-size: 12px;
    color: $accent-primary;
    background: $bg-code;
    padding: 8px 12px;
    border-radius: $radius-sm;
    display: block;
  }
}
</style>
