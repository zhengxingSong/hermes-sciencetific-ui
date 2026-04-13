<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useMessage, useDialog, NButton, NCard, NTag, NModal, NForm, NFormItem, NInput, NInputNumber, NSelect, NSwitch, NTabs, NTabPane, NSpin, NAlert, NEmpty, NCollapse, NCollapseItem } from 'naive-ui'
import { request } from '@/api/client'

const message = useMessage()
const dialog = useDialog()
const loading = ref(false)
const configLoading = ref(false)

// Profiles / Agents
const profiles = ref<any[]>([])
const activeProfile = ref('default')

// Create modal
const showCreateModal = ref(false)
const newProfileName = ref('')
const cloneFromProfile = ref('default')

// Edit modal
const showEditModal = ref(false)
const editingProfile = ref<any>(null)
const editingSoul = ref('')
const editActiveTab = ref('model')

// Available models from API
const availableModels = ref<{ default: string; groups: Array<{ provider: string; label: string; models: string[] }> }>({ default: '', groups: [] })

// Config data - comprehensive structure matching config.yaml
const configForm = ref({
  model: {
    default: '',
    provider: '',
    base_url: '',
  },
  agent: {
    max_turns: 90,
    gateway_timeout: 1800,
    restart_drain_timeout: 60,
    tool_use_enforcement: 'auto',
    gateway_timeout_warning: 900,
    verbose: false,
    reasoning_effort: 'medium',
  },
  terminal: {
    backend: 'local',
    timeout: 180,
    container_cpu: 1,
    container_memory: 5120,
    container_disk: 51200,
    container_persistent: true,
    persistent_shell: true,
    lifetime_seconds: 300,
  },
  browser: {
    inactivity_timeout: 120,
    command_timeout: 30,
    record_sessions: false,
  },
  display: {
    compact: false,
    personality: 'helpful',
    streaming: true,
    show_reasoning: false,
    show_cost: false,
    inline_diffs: true,
    bell_on_complete: false,
  },
  memory: {
    memory_enabled: true,
    user_profile_enabled: true,
    memory_char_limit: 2200,
    user_char_limit: 1375,
    nudge_interval: 10,
    flush_min_turns: 6,
  },
  compression: {
    enabled: true,
    threshold: 0.5,
    target_ratio: 0.2,
    protect_last_n: 20,
    summary_model: 'google/gemini-3-flash-preview',
  },
  checkpoints: {
    enabled: true,
    max_snapshots: 50,
  },
  file_read_max_chars: 100000,
  privacy: {
    redact_pii: false,
  },
  security: {
    redact_secrets: true,
    tirith_enabled: true,
    tirith_timeout: 5,
    tirith_fail_open: true,
  },
  session_reset: {
    mode: 'both',
    idle_minutes: 1440,
    at_hour: 4,
  },
  approvals: {
    mode: 'manual',
    timeout: 60,
  },
})

const BUILTIN_PERSONALITIES = [
  { name: 'helpful', label: 'Helpful', emoji: '😊' },
  { name: 'concise', label: 'Concise', emoji: '⚡' },
  { name: 'technical', label: 'Technical', emoji: '🔧' },
  { name: 'creative', label: 'Creative', emoji: '💡' },
  { name: 'teacher', label: 'Teacher', emoji: '📚' },
  { name: 'kawaii', label: 'Kawaii', emoji: '✨' },
  { name: 'catgirl', label: 'Catgirl', emoji: '🐱' },
  { name: 'pirate', label: 'Pirate', emoji: '🏴‍☠️' },
  { name: 'shakespeare', label: 'Shakespeare', emoji: '🎭' },
  { name: 'surfer', label: 'Surfer', emoji: '🏄' },
  { name: 'noir', label: 'Noir', emoji: '🔍' },
  { name: 'uwu', label: 'UwU', emoji: '🌸' },
  { name: 'philosopher', label: 'Philosopher', emoji: '🤔' },
  { name: 'hype', label: 'Hype', emoji: '🔥' },
]

const personalityOptions = computed(() =>
  BUILTIN_PERSONALITIES.map(p => ({ label: `${p.emoji} ${p.label}`, value: p.name }))
)

const reasoningEffortOptions = [
  { label: 'Low', value: 'low' },
  { label: 'Medium', value: 'medium' },
  { label: 'High', value: 'high' },
]

const toolEnforcementOptions = [
  { label: 'Auto', value: 'auto' },
  { label: 'Always', value: 'always' },
  { label: 'Never', value: 'never' },
]

const terminalBackendOptions = [
  { label: 'Local', value: 'local' },
  { label: 'Docker', value: 'docker' },
  { label: 'Modal', value: 'modal' },
]

const sessionResetModeOptions = [
  { label: 'Both (Idle + Scheduled)', value: 'both' },
  { label: 'Idle Only', value: 'idle' },
  { label: 'Scheduled Only', value: 'hourly' },
]

const approvalsModeOptions = [
  { label: 'Manual', value: 'manual' },
  { label: 'Auto', value: 'auto' },
  { label: 'Disabled', value: 'disabled' },
]

const profileOptions = computed(() =>
  profiles.value.map(p => ({ label: p.name, value: p.name }))
)

const activePersonality = computed(() => configForm.value.display.personality)

// Model select options - grouped by provider
const modelSelectOptions = computed(() => {
  return availableModels.value.groups.map(group => ({
    label: group.label || group.provider,
    children: group.models.map(m => ({
      label: m,
      value: m,
    })),
  }))
})

// Provider select options
const providerSelectOptions = computed(() => {
  return availableModels.value.groups.map(g => ({
    label: g.label || g.provider,
    value: g.provider,
  }))
})

onMounted(() => {
  loadProfiles()
})

async function loadProfiles() {
  loading.value = true
  try {
    const data = await request<{ agents: any[] }>('/api/agents')
    profiles.value = data.agents || []
    const active = profiles.value.find(p => p.isActive)
    if (active) {
      activeProfile.value = active.name
    }
  } catch (err: any) {
    message.error('Failed to load profiles: ' + err.message)
  } finally {
    loading.value = false
  }
}

async function loadProfileConfigForEdit(name: string) {
  configLoading.value = true
  try {
    const data = await request<{ profile: any; soul: string; config: string }>(`/api/agents/${name}`)
    editingSoul.value = data.soul || ''
    parseConfigToForm(data.config || '')

    // Load available models from API
    const modelsData = await request<{ default: string; groups: any[] }>('/api/available-models')
    availableModels.value = modelsData
  } catch (err: any) {
    message.error('Failed to load profile config: ' + err.message)
  } finally {
    configLoading.value = false
  }
}

// Watch model selection to auto-match provider
watch(() => configForm.value.model.default, (newModel) => {
  if (!newModel) return
  for (const group of availableModels.value.groups) {
    if (group.models.includes(newModel)) {
      configForm.value.model.provider = group.provider
      break
    }
  }
})

function parseConfigToForm(yaml: string) {
  // Model
  const modelMatch = yaml.match(/default:\s*(\S+)/m)
  const providerMatch = yaml.match(/provider:\s*(\S+)/m)
  const baseUrlMatch = yaml.match(/base_url:\s*(\S+)/m)
  if (modelMatch) configForm.value.model.default = modelMatch[1]
  if (providerMatch) configForm.value.model.provider = providerMatch[1]
  if (baseUrlMatch) configForm.value.model.base_url = baseUrlMatch[1]

  // Agent
  const maxTurnsMatch = yaml.match(/max_turns:\s*(\d+)/)
  const gatewayTimeoutMatch = yaml.match(/gateway_timeout:\s*(\d+)/)
  const restartDrainMatch = yaml.match(/restart_drain_timeout:\s*(\d+)/)
  const toolEnforcementMatch = yaml.match(/tool_use_enforcement:\s*(\S+)/)
  const reasoningEffortMatch = yaml.match(/reasoning_effort:\s*(\S+)/)
  const verboseMatch = yaml.match(/verbose:\s*(true|false)/)
  const gatewayWarningMatch = yaml.match(/gateway_timeout_warning:\s*(\d+)/)

  if (maxTurnsMatch) configForm.value.agent.max_turns = parseInt(maxTurnsMatch[1])
  if (gatewayTimeoutMatch) configForm.value.agent.gateway_timeout = parseInt(gatewayTimeoutMatch[1])
  if (restartDrainMatch) configForm.value.agent.restart_drain_timeout = parseInt(restartDrainMatch[1])
  if (toolEnforcementMatch) configForm.value.agent.tool_use_enforcement = toolEnforcementMatch[1]
  if (reasoningEffortMatch) configForm.value.agent.reasoning_effort = reasoningEffortMatch[1]
  if (verboseMatch) configForm.value.agent.verbose = verboseMatch[1] === 'true'
  if (gatewayWarningMatch) configForm.value.agent.gateway_timeout_warning = parseInt(gatewayWarningMatch[1])

  // Terminal
  const terminalBackendMatch = yaml.match(/backend:\s*(\S+)/)
  const terminalTimeoutMatch = yaml.match(/timeout:\s*(\d+)/)
  const containerCpuMatch = yaml.match(/container_cpu:\s*(\d+)/)
  const containerMemoryMatch = yaml.match(/container_memory:\s*(\d+)/)
  const containerDiskMatch = yaml.match(/container_disk:\s*(\d+)/)
  const containerPersistentMatch = yaml.match(/container_persistent:\s*(true|false)/)
  const persistentShellMatch = yaml.match(/persistent_shell:\s*(true|false)/)
  const lifetimeMatch = yaml.match(/lifetime_seconds:\s*(\d+)/)

  if (terminalBackendMatch) configForm.value.terminal.backend = terminalBackendMatch[1]
  if (terminalTimeoutMatch) configForm.value.terminal.timeout = parseInt(terminalTimeoutMatch[1])
  if (containerCpuMatch) configForm.value.terminal.container_cpu = parseInt(containerCpuMatch[1])
  if (containerMemoryMatch) configForm.value.terminal.container_memory = parseInt(containerMemoryMatch[1])
  if (containerDiskMatch) configForm.value.terminal.container_disk = parseInt(containerDiskMatch[1])
  if (containerPersistentMatch) configForm.value.terminal.container_persistent = containerPersistentMatch[1] === 'true'
  if (persistentShellMatch) configForm.value.terminal.persistent_shell = persistentShellMatch[1] === 'true'
  if (lifetimeMatch) configForm.value.terminal.lifetime_seconds = parseInt(lifetimeMatch[1])

  // Browser
  const browserInactivityMatch = yaml.match(/inactivity_timeout:\s*(\d+)/)
  const browserCommandMatch = yaml.match(/command_timeout:\s*(\d+)/)
  const browserRecordMatch = yaml.match(/record_sessions:\s*(true|false)/)
  if (browserInactivityMatch) configForm.value.browser.inactivity_timeout = parseInt(browserInactivityMatch[1])
  if (browserCommandMatch) configForm.value.browser.command_timeout = parseInt(browserCommandMatch[1])
  if (browserRecordMatch) configForm.value.browser.record_sessions = browserRecordMatch[1] === 'true'

  // Display
  const compactMatch = yaml.match(/compact:\s*(true|false)/)
  const personalityMatch = yaml.match(/personality:\s*(\S+)/)
  const streamingMatch = yaml.match(/streaming:\s*(true|false)/)
  const showReasoningMatch = yaml.match(/show_reasoning:\s*(true|false)/)
  const showCostMatch = yaml.match(/show_cost:\s*(true|false)/)
  const inlineDiffsMatch = yaml.match(/inline_diffs:\s*(true|false)/)
  const bellMatch = yaml.match(/bell_on_complete:\s*(true|false)/)
  if (compactMatch) configForm.value.display.compact = compactMatch[1] === 'true'
  if (personalityMatch) configForm.value.display.personality = personalityMatch[1]
  if (streamingMatch) configForm.value.display.streaming = streamingMatch[1] === 'true'
  if (showReasoningMatch) configForm.value.display.show_reasoning = showReasoningMatch[1] === 'true'
  if (showCostMatch) configForm.value.display.show_cost = showCostMatch[1] === 'true'
  if (inlineDiffsMatch) configForm.value.display.inline_diffs = inlineDiffsMatch[1] === 'true'
  if (bellMatch) configForm.value.display.bell_on_complete = bellMatch[1] === 'true'

  // Memory
  const memoryEnabledMatch = yaml.match(/memory_enabled:\s*(true|false)/)
  const userProfileMatch = yaml.match(/user_profile_enabled:\s*(true|false)/)
  const memoryCharMatch = yaml.match(/memory_char_limit:\s*(\d+)/)
  const userCharMatch = yaml.match(/user_char_limit:\s*(\d+)/)
  const nudgeMatch = yaml.match(/nudge_interval:\s*(\d+)/)
  const flushMatch = yaml.match(/flush_min_turns:\s*(\d+)/)
  if (memoryEnabledMatch) configForm.value.memory.memory_enabled = memoryEnabledMatch[1] === 'true'
  if (userProfileMatch) configForm.value.memory.user_profile_enabled = userProfileMatch[1] === 'true'
  if (memoryCharMatch) configForm.value.memory.memory_char_limit = parseInt(memoryCharMatch[1])
  if (userCharMatch) configForm.value.memory.user_char_limit = parseInt(userCharMatch[1])
  if (nudgeMatch) configForm.value.memory.nudge_interval = parseInt(nudgeMatch[1])
  if (flushMatch) configForm.value.memory.flush_min_turns = parseInt(flushMatch[1])

  // Compression
  const compressionEnabledMatch = yaml.match(/enabled:\s*(true|false)/)
  const thresholdMatch = yaml.match(/threshold:\s*([0-9.]+)/)
  const targetRatioMatch = yaml.match(/target_ratio:\s*([0-9.]+)/)
  const protectMatch = yaml.match(/protect_last_n:\s*(\d+)/)
  const summaryModelMatch = yaml.match(/summary_model:\s*(\S+)/)
  if (compressionEnabledMatch) configForm.value.compression.enabled = compressionEnabledMatch[1] === 'true'
  if (thresholdMatch) configForm.value.compression.threshold = parseFloat(thresholdMatch[1])
  if (targetRatioMatch) configForm.value.compression.target_ratio = parseFloat(targetRatioMatch[1])
  if (protectMatch) configForm.value.compression.protect_last_n = parseInt(protectMatch[1])
  if (summaryModelMatch) configForm.value.compression.summary_model = summaryModelMatch[1]

  // Checkpoints
  const checkpointsEnabledMatch = yaml.match(/checkpoints:\s*\n\s+enabled:\s*(true|false)/)
  const maxSnapshotsMatch = yaml.match(/max_snapshots:\s*(\d+)/)
  if (checkpointsEnabledMatch) configForm.value.checkpoints.enabled = checkpointsEnabledMatch[1] === 'true'
  if (maxSnapshotsMatch) configForm.value.checkpoints.max_snapshots = parseInt(maxSnapshotsMatch[1])

  // File read
  const fileReadMatch = yaml.match(/file_read_max_chars:\s*(\d+)/)
  if (fileReadMatch) configForm.value.file_read_max_chars = parseInt(fileReadMatch[1])

  // Privacy
  const piiMatch = yaml.match(/redact_pii:\s*(true|false)/)
  if (piiMatch) configForm.value.privacy.redact_pii = piiMatch[1] === 'true'

  // Security
  const redactSecretsMatch = yaml.match(/redact_secrets:\s*(true|false)/)
  const tirithEnabledMatch = yaml.match(/tirith_enabled:\s*(true|false)/)
  const tirithTimeoutMatch = yaml.match(/tirith_timeout:\s*(\d+)/)
  const tirithFailOpenMatch = yaml.match(/tirith_fail_open:\s*(true|false)/)
  if (redactSecretsMatch) configForm.value.security.redact_secrets = redactSecretsMatch[1] === 'true'
  if (tirithEnabledMatch) configForm.value.security.tirith_enabled = tirithEnabledMatch[1] === 'true'
  if (tirithTimeoutMatch) configForm.value.security.tirith_timeout = parseInt(tirithTimeoutMatch[1])
  if (tirithFailOpenMatch) configForm.value.security.tirith_fail_open = tirithFailOpenMatch[1] === 'true'

  // Session reset
  const resetModeMatch = yaml.match(/mode:\s*(\S+)/)
  const idleMinutesMatch = yaml.match(/idle_minutes:\s*(\d+)/)
  const atHourMatch = yaml.match(/at_hour:\s*(\d+)/)
  if (resetModeMatch) configForm.value.session_reset.mode = resetModeMatch[1]
  if (idleMinutesMatch) configForm.value.session_reset.idle_minutes = parseInt(idleMinutesMatch[1])
  if (atHourMatch) configForm.value.session_reset.at_hour = parseInt(atHourMatch[1])

  // Approvals
  const approvalsModeMatch = yaml.match(/approvals:\s*\n\s+mode:\s*(\S+)/)
  const approvalsTimeoutMatch = yaml.match(/approvals:\s*\n(?:.*\n)*?\s+timeout:\s*(\d+)/)
  if (approvalsModeMatch) configForm.value.approvals.mode = approvalsModeMatch[1]
  if (approvalsTimeoutMatch) configForm.value.approvals.timeout = parseInt(approvalsTimeoutMatch[1])
}

function generateYamlFromForm(): string {
  const lines: string[] = []

  // Model section
  lines.push('model:')
  lines.push(`  default: ${configForm.value.model.default}`)
  lines.push(`  provider: ${configForm.value.model.provider}`)
  lines.push(`  base_url: ${configForm.value.model.base_url}`)

  // Providers (empty placeholders)
  lines.push('providers: {}')
  lines.push('fallback_providers: []')
  lines.push('credential_pool_strategies: {}')

  // Toolsets
  lines.push('toolsets:')
  lines.push('- hermes-cli')

  // Agent section
  lines.push('agent:')
  lines.push(`  max_turns: ${configForm.value.agent.max_turns}`)
  lines.push(`  gateway_timeout: ${configForm.value.agent.gateway_timeout}`)
  lines.push(`  restart_drain_timeout: ${configForm.value.agent.restart_drain_timeout}`)
  lines.push(`  service_tier: ''`)
  lines.push(`  tool_use_enforcement: ${configForm.value.agent.tool_use_enforcement}`)
  lines.push(`  gateway_timeout_warning: ${configForm.value.agent.gateway_timeout_warning}`)
  lines.push(`  verbose: ${configForm.value.agent.verbose}`)
  lines.push(`  reasoning_effort: ${configForm.value.agent.reasoning_effort}`)

  // Terminal section
  lines.push('terminal:')
  lines.push(`  backend: ${configForm.value.terminal.backend}`)
  lines.push(`  modal_mode: auto`)
  lines.push(`  cwd: .`)
  lines.push(`  timeout: ${configForm.value.terminal.timeout}`)
  lines.push(`  env_passthrough: []`)
  lines.push(`  docker_image: nikolaik/python-nodejs:python3.11-nodejs20`)
  lines.push(`  docker_forward_env: []`)
  lines.push(`  docker_env: {}`)
  lines.push(`  singularity_image: docker://nikolaik/python-nodejs:python3.11-nodejs20`)
  lines.push(`  modal_image: nikolaik/python-nodejs:python3.11-nodejs20`)
  lines.push(`  daytona_image: nikolaik/python-nodejs:python3.11-nodejs20`)
  lines.push(`  container_cpu: ${configForm.value.terminal.container_cpu}`)
  lines.push(`  container_memory: ${configForm.value.terminal.container_memory}`)
  lines.push(`  container_disk: ${configForm.value.terminal.container_disk}`)
  lines.push(`  container_persistent: ${configForm.value.terminal.container_persistent}`)
  lines.push(`  docker_volumes: []`)
  lines.push(`  docker_mount_cwd_to_workspace: false`)
  lines.push(`  persistent_shell: ${configForm.value.terminal.persistent_shell}`)
  lines.push(`  lifetime_seconds: ${configForm.value.terminal.lifetime_seconds}`)

  // Browser section
  lines.push('browser:')
  lines.push(`  inactivity_timeout: ${configForm.value.browser.inactivity_timeout}`)
  lines.push(`  command_timeout: ${configForm.value.browser.command_timeout}`)
  lines.push(`  record_sessions: ${configForm.value.browser.record_sessions}`)
  lines.push(`  allow_private_urls: false`)
  lines.push('  camofox:')
  lines.push('    managed_persistence: false')

  // Checkpoints
  lines.push('checkpoints:')
  lines.push(`  enabled: ${configForm.value.checkpoints.enabled}`)
  lines.push(`  max_snapshots: ${configForm.value.checkpoints.max_snapshots}`)

  // File read
  lines.push(`file_read_max_chars: ${configForm.value.file_read_max_chars}`)

  // Compression
  lines.push('compression:')
  lines.push(`  enabled: ${configForm.value.compression.enabled}`)
  lines.push(`  threshold: ${configForm.value.compression.threshold}`)
  lines.push(`  target_ratio: ${configForm.value.compression.target_ratio}`)
  lines.push(`  protect_last_n: ${configForm.value.compression.protect_last_n}`)
  lines.push(`  summary_model: ${configForm.value.compression.summary_model}`)
  lines.push(`  summary_provider: auto`)
  lines.push(`  summary_base_url: null`)

  // Smart model routing
  lines.push('smart_model_routing:')
  lines.push(`  enabled: false`)
  lines.push(`  max_simple_chars: 160`)
  lines.push(`  max_simple_words: 28`)
  lines.push('  cheap_model: {}')

  // Display section
  lines.push('display:')
  lines.push(`  compact: ${configForm.value.display.compact}`)
  lines.push(`  personality: ${configForm.value.display.personality}`)
  lines.push(`  resume_display: full`)
  lines.push(`  busy_input_mode: interrupt`)
  lines.push(`  bell_on_complete: ${configForm.value.display.bell_on_complete}`)
  lines.push(`  show_reasoning: ${configForm.value.display.show_reasoning}`)
  lines.push(`  streaming: ${configForm.value.display.streaming}`)
  lines.push(`  inline_diffs: ${configForm.value.display.inline_diffs}`)
  lines.push(`  show_cost: ${configForm.value.display.show_cost}`)
  lines.push(`  skin: default`)
  lines.push(`  interim_assistant_messages: true`)
  lines.push(`  tool_progress_command: false`)
  lines.push(`  tool_progress_overrides: {}`)
  lines.push(`  tool_preview_length: 0`)

  // Privacy
  lines.push('privacy:')
  lines.push(`  redact_pii: ${configForm.value.privacy.redact_pii}`)

  // Memory
  lines.push('memory:')
  lines.push(`  memory_enabled: ${configForm.value.memory.memory_enabled}`)
  lines.push(`  user_profile_enabled: ${configForm.value.memory.user_profile_enabled}`)
  lines.push(`  memory_char_limit: ${configForm.value.memory.memory_char_limit}`)
  lines.push(`  user_char_limit: ${configForm.value.memory.user_char_limit}`)
  lines.push(`  provider: ''`)
  lines.push(`  nudge_interval: ${configForm.value.memory.nudge_interval}`)
  lines.push(`  flush_min_turns: ${configForm.value.memory.flush_min_turns}`)

  // Security
  lines.push('security:')
  lines.push(`  redact_secrets: ${configForm.value.security.redact_secrets}`)
  lines.push(`  tirith_enabled: ${configForm.value.security.tirith_enabled}`)
  lines.push(`  tirith_path: tirith`)
  lines.push(`  tirith_timeout: ${configForm.value.security.tirith_timeout}`)
  lines.push(`  tirith_fail_open: ${configForm.value.security.tirith_fail_open}`)
  lines.push('  website_blocklist:')
  lines.push('    enabled: false')
  lines.push('    domains: []')
  lines.push('    shared_files: []')

  // Session reset
  lines.push('session_reset:')
  lines.push(`  mode: ${configForm.value.session_reset.mode}`)
  lines.push(`  idle_minutes: ${configForm.value.session_reset.idle_minutes}`)
  lines.push(`  at_hour: ${configForm.value.session_reset.at_hour}`)

  // Approvals
  lines.push('approvals:')
  lines.push(`  mode: ${configForm.value.approvals.mode}`)
  lines.push(`  timeout: ${configForm.value.approvals.timeout}`)

  // Other settings
  lines.push('command_allowlist: []')
  lines.push('quick_commands: {}')
  lines.push('_config_version: 16')

  return lines.join('\n')
}

async function switchProfile(name: string) {
  try {
    await request(`/api/agents/${name}/switch`, { method: 'POST' })
    activeProfile.value = name
    message.success(`Switched to profile: ${name}`)
    await loadProfiles()
  } catch (err: any) {
    message.error('Failed to switch: ' + err.message)
  }
}

async function createProfile() {
  if (!newProfileName.value.trim()) {
    message.error('Please enter profile name')
    return
  }
  try {
    await request('/api/agents', {
      method: 'POST',
      body: JSON.stringify({ name: newProfileName.value, cloneFrom: cloneFromProfile.value }),
    })
    message.success('Profile created successfully')
    showCreateModal.value = false
    newProfileName.value = ''
    await loadProfiles()
  } catch (err: any) {
    message.error('Failed to create: ' + err.message)
  }
}

async function deleteProfile(profile: any) {
  dialog.warning({
    title: 'Delete Profile',
    content: `Are you sure you want to delete "${profile.name}"?`,
    positiveText: 'Delete',
    negativeText: 'Cancel',
    onPositiveClick: async () => {
      try {
        await request(`/api/agents/${profile.name}`, { method: 'DELETE' })
        message.success('Profile deleted')
        await loadProfiles()
      } catch (err: any) {
        message.error('Failed to delete: ' + err.message)
      }
    },
  })
}

function openEditModal(profile: any) {
  editingProfile.value = profile
  editActiveTab.value = 'soul'
  loadProfileConfigForEdit(profile.name)
  showEditModal.value = true
}

async function saveProfileChanges() {
  if (!editingProfile.value) return
  try {
    const configYaml = generateYamlFromForm()
    await request(`/api/agents/${editingProfile.value.name}`, {
      method: 'PUT',
      body: JSON.stringify({
        soul: editingSoul.value,
        config: configYaml,
      }),
    })
    message.success('Profile updated')
    showEditModal.value = false
  } catch (err: any) {
    message.error('Failed to save: ' + err.message)
  }
}

async function switchPersonality(name: string) {
  configForm.value.display.personality = name
}
</script>

<template>
  <div class="agents-view">
    <header class="agents-header">
      <h2 class="header-title">Agents (Profiles)</h2>
      <NButton type="primary" @click="showCreateModal = true">
        + New Profile
      </NButton>
    </header>

    <NSpin :show="loading">
      <!-- Profiles Section -->
      <NCard title="Profiles" class="profiles-card">
        <div class="profiles-list" v-if="profiles.length > 0">
          <div
            v-for="profile in profiles"
            :key="profile.name"
            :class="['profile-item', { active: profile.isActive }]"
          >
            <div class="profile-header">
              <div class="profile-info">
                <NTag v-if="profile.isActive" type="success" size="small">Active</NTag>
                <span class="profile-name">{{ profile.name }}</span>
              </div>
              <div class="profile-actions">
                <NButton v-if="!profile.isActive" size="small" @click="switchProfile(profile.name)">
                  Switch
                </NButton>
                <NButton size="small" type="primary" @click="openEditModal(profile)">
                  Edit
                </NButton>
                <NButton
                  v-if="profile.name !== 'default'"
                  size="small"
                  type="error"
                  @click="deleteProfile(profile)"
                >
                  Delete
                </NButton>
              </div>
            </div>
            <div class="profile-details">
              <div class="detail-row">
                <span class="label">Model:</span>
                <span class="value">{{ profile.model || '-' }}</span>
              </div>
              <div class="detail-row">
                <span class="label">Gateway:</span>
                <NTag :type="profile.gateway === 'running' ? 'success' : 'default'" size="small">
                  {{ profile.gateway }}
                </NTag>
              </div>
            </div>
          </div>
        </div>
        <NEmpty v-else description="No profiles found" />
      </NCard>

      <!-- Personality Quick Select -->
      <NCard title="Personality (人格)" class="personality-card">
        <NAlert type="info" style="margin-bottom: 16px">
          当前激活: <strong>{{ BUILTIN_PERSONALITIES.find(p => p.name === activePersonality)?.label || 'Helpful' }}</strong>
        </NAlert>
        <div class="personality-grid">
          <div
            v-for="p in BUILTIN_PERSONALITIES"
            :key="p.name"
            :class="['personality-item', { active: activePersonality === p.name }]"
            @click="switchPersonality(p.name)"
          >
            <div class="p-emoji">{{ p.emoji }}</div>
            <div class="p-name">{{ p.label }}</div>
            <NTag v-if="activePersonality === p.name" type="success" size="small">Active</NTag>
          </div>
        </div>
      </NCard>
    </NSpin>

    <!-- Create Modal -->
    <NModal
      v-model:show="showCreateModal"
      title="Create New Profile"
      preset="card"
      style="width: 500px"
    >
      <NForm>
        <NFormItem label="Profile Name" required>
          <NInput v-model:value="newProfileName" placeholder="e.g., coder, writer" />
        </NFormItem>
        <NFormItem label="Clone From">
          <NSelect v-model:value="cloneFromProfile" :options="profileOptions" />
        </NFormItem>
      </NForm>
      <template #footer>
        <div style="display: flex; gap: 8px; justify-content: end">
          <NButton @click="showCreateModal = false">Cancel</NButton>
          <NButton type="primary" @click="createProfile">Create</NButton>
        </div>
      </template>
    </NModal>

    <!-- Edit Modal - Visual Form -->
    <NModal
      v-model:show="showEditModal"
      :title="`Edit Profile: ${editingProfile?.name}`"
      preset="card"
      style="width: 900px"
    >
      <div class="modal-scroll-content">
        <NSpin :show="configLoading">
        <NTabs v-model:value="editActiveTab" type="line" animated>
          <!-- SOUL.md Tab -->
          <NTabPane name="soul" tab="SOUL.md">
            <NFormItem label="Agent Personality Description">
              <NInput
                v-model:value="editingSoul"
                type="textarea"
                :rows="15"
                placeholder="Define the agent's personality in markdown..."
              />
            </NFormItem>
          </NTabPane>

          <!-- Model Tab -->
          <NTabPane name="model" tab="Model">
            <NForm label-placement="left" label-width="100px">
              <NFormItem label="Default Model">
                <NSelect
                  v-model:value="configForm.model.default"
                  :options="modelSelectOptions"
                  placeholder="Select model..."
                  filterable
                  clearable
                />
              </NFormItem>
              <NFormItem label="Provider">
                <NSelect
                  v-model:value="configForm.model.provider"
                  :options="providerSelectOptions"
                  placeholder="Auto-matched..."
                  clearable
                />
              </NFormItem>
              <NFormItem label="Base URL (Optional)">
                <NInput v-model:value="configForm.model.base_url" placeholder="Custom endpoint..." />
              </NFormItem>
            </NForm>
          </NTabPane>

          <!-- Agent Tab -->
          <NTabPane name="agent" tab="Agent">
            <NForm label-placement="left" label-width="160px">
              <NFormItem label="Max Turns">
                <NInputNumber v-model:value="configForm.agent.max_turns" :min="1" :max="200" />
                <span class="hint">最大交互轮数</span>
              </NFormItem>
              <NFormItem label="Gateway Timeout">
                <NInputNumber v-model:value="configForm.agent.gateway_timeout" :min="60" :max="3600" />
                <span class="hint">秒</span>
              </NFormItem>
              <NFormItem label="Restart Drain Timeout">
                <NInputNumber v-model:value="configForm.agent.restart_drain_timeout" :min="10" :max="300" />
                <span class="hint">秒</span>
              </NFormItem>
              <NFormItem label="Gateway Warning">
                <NInputNumber v-model:value="configForm.agent.gateway_timeout_warning" :min="60" :max="1800" />
                <span class="hint">秒</span>
              </NFormItem>
              <NFormItem label="Tool Enforcement">
                <NSelect v-model:value="configForm.agent.tool_use_enforcement" :options="toolEnforcementOptions" />
              </NFormItem>
              <NFormItem label="Reasoning Effort">
                <NSelect v-model:value="configForm.agent.reasoning_effort" :options="reasoningEffortOptions" />
              </NFormItem>
              <NFormItem label="Verbose">
                <NSwitch v-model:value="configForm.agent.verbose" />
              </NFormItem>
            </NForm>
          </NTabPane>

          <!-- Display Tab -->
          <NTabPane name="display" tab="Display">
            <NForm label-placement="left" label-width="140px">
              <NFormItem label="Personality">
                <NSelect v-model:value="configForm.display.personality" :options="personalityOptions" />
              </NFormItem>
              <NFormItem label="Compact Mode">
                <NSwitch v-model:value="configForm.display.compact" />
                <span class="hint">紧凑显示</span>
              </NFormItem>
              <NFormItem label="Streaming">
                <NSwitch v-model:value="configForm.display.streaming" />
                <span class="hint">实时显示回复</span>
              </NFormItem>
              <NFormItem label="Show Reasoning">
                <NSwitch v-model:value="configForm.display.show_reasoning" />
                <span class="hint">展示思考过程</span>
              </NFormItem>
              <NFormItem label="Show Cost">
                <NSwitch v-model:value="configForm.display.show_cost" />
                <span class="hint">显示 token 费用</span>
              </NFormItem>
              <NFormItem label="Inline Diffs">
                <NSwitch v-model:value="configForm.display.inline_diffs" />
                <span class="hint">内联显示差异</span>
              </NFormItem>
              <NFormItem label="Bell on Complete">
                <NSwitch v-model:value="configForm.display.bell_on_complete" />
                <span class="hint">完成时响铃</span>
              </NFormItem>
            </NForm>
          </NTabPane>

          <!-- Memory Tab -->
          <NTabPane name="memory" tab="Memory">
            <NForm label-placement="left" label-width="160px">
              <NFormItem label="Memory Enabled">
                <NSwitch v-model:value="configForm.memory.memory_enabled" />
                <span class="hint">启用记忆</span>
              </NFormItem>
              <NFormItem label="User Profile">
                <NSwitch v-model:value="configForm.memory.user_profile_enabled" />
                <span class="hint">记住用户偏好</span>
              </NFormItem>
              <NFormItem label="Memory Char Limit">
                <NInputNumber v-model:value="configForm.memory.memory_char_limit" :min="500" :max="10000" />
                <span class="hint">字符</span>
              </NFormItem>
              <NFormItem label="User Char Limit">
                <NInputNumber v-model:value="configForm.memory.user_char_limit" :min="500" :max="5000" />
                <span class="hint">字符</span>
              </NFormItem>
              <NFormItem label="Nudge Interval">
                <NInputNumber v-model:value="configForm.memory.nudge_interval" :min="1" :max="30" />
                <span class="hint">轮次</span>
              </NFormItem>
              <NFormItem label="Flush Min Turns">
                <NInputNumber v-model:value="configForm.memory.flush_min_turns" :min="1" :max="20" />
                <span class="hint">最小轮次</span>
              </NFormItem>
            </NForm>
          </NTabPane>

          <!-- Terminal Tab -->
          <NTabPane name="terminal" tab="Terminal">
            <NForm label-placement="left" label-width="160px">
              <NFormItem label="Backend">
                <NSelect v-model:value="configForm.terminal.backend" :options="terminalBackendOptions" />
              </NFormItem>
              <NFormItem label="Timeout">
                <NInputNumber v-model:value="configForm.terminal.timeout" :min="30" :max="600" />
                <span class="hint">秒</span>
              </NFormItem>
              <NFormItem label="Lifetime">
                <NInputNumber v-model:value="configForm.terminal.lifetime_seconds" :min="60" :max="1800" />
                <span class="hint">秒</span>
              </NFormItem>
              <NFormItem label="Container CPU">
                <NInputNumber v-model:value="configForm.terminal.container_cpu" :min="1" :max="8" />
                <span class="hint">核</span>
              </NFormItem>
              <NFormItem label="Container Memory">
                <NInputNumber v-model:value="configForm.terminal.container_memory" :min="1024" :max="16384" />
                <span class="hint">MB</span>
              </NFormItem>
              <NFormItem label="Container Disk">
                <NInputNumber v-model:value="configForm.terminal.container_disk" :min="10240" :max="102400" />
                <span class="hint">MB</span>
              </NFormItem>
              <NFormItem label="Persistent Shell">
                <NSwitch v-model:value="configForm.terminal.persistent_shell" />
              </NFormItem>
              <NFormItem label="Container Persistent">
                <NSwitch v-model:value="configForm.terminal.container_persistent" />
              </NFormItem>
            </NForm>
          </NTabPane>

          <!-- Compression Tab -->
          <NTabPane name="compression" tab="Compression">
            <NForm label-placement="left" label-width="140px">
              <NFormItem label="Enabled">
                <NSwitch v-model:value="configForm.compression.enabled" />
              </NFormItem>
              <NFormItem label="Threshold">
                <NInputNumber v-model:value="configForm.compression.threshold" :min="0.1" :max="1" :step="0.1" />
                <span class="hint">触发压缩阈值比例</span>
              </NFormItem>
              <NFormItem label="Target Ratio">
                <NInputNumber v-model:value="configForm.compression.target_ratio" :min="0.1" :max="0.5" :step="0.1" />
                <span class="hint">目标压缩比例</span>
              </NFormItem>
              <NFormItem label="Protect Last N">
                <NInputNumber v-model:value="configForm.compression.protect_last_n" :min="5" :max="50" />
                <span class="hint">保护最近消息数</span>
              </NFormItem>
              <NFormItem label="Summary Model">
                <NInput v-model:value="configForm.compression.summary_model" placeholder="google/gemini-3-flash-preview" />
              </NFormItem>
            </NForm>
          </NTabPane>

          <!-- Security Tab -->
          <NTabPane name="security" tab="Security">
            <NForm label-placement="left" label-width="140px">
              <NFormItem label="Redact Secrets">
                <NSwitch v-model:value="configForm.security.redact_secrets" />
                <span class="hint">隐藏敏感信息</span>
              </NFormItem>
              <NFormItem label="Tirith Enabled">
                <NSwitch v-model:value="configForm.security.tirith_enabled" />
                <span class="hint">启用 Tirith 安全检查</span>
              </NFormItem>
              <NFormItem label="Tirith Timeout">
                <NInputNumber v-model:value="configForm.security.tirith_timeout" :min="1" :max="30" />
                <span class="hint">秒</span>
              </NFormItem>
              <NFormItem label="Tirith Fail Open">
                <NSwitch v-model:value="configForm.security.tirith_fail_open" />
                <span class="hint">检查失败时继续执行</span>
              </NFormItem>
            </NForm>
          </NTabPane>

          <!-- Session Tab -->
          <NTabPane name="session" tab="Session">
            <NForm label-placement="left" label-width="140px">
              <NFormItem label="Reset Mode">
                <NSelect v-model:value="configForm.session_reset.mode" :options="sessionResetModeOptions" />
              </NFormItem>
              <NFormItem label="Idle Minutes">
                <NInputNumber v-model:value="configForm.session_reset.idle_minutes" :min="30" :max="2880" />
                <span class="hint">空闲重置时间</span>
              </NFormItem>
              <NFormItem label="At Hour">
                <NInputNumber v-model:value="configForm.session_reset.at_hour" :min="0" :max="23" />
                <span class="hint">定时重置时间点</span>
              </NFormItem>
            </NForm>
          </NTabPane>

          <!-- Other Tab -->
          <NTabPane name="other" tab="Other">
            <NCollapse>
              <NCollapseItem title="Browser Settings">
                <NForm label-placement="left" label-width="160px">
                  <NFormItem label="Inactivity Timeout">
                    <NInputNumber v-model:value="configForm.browser.inactivity_timeout" :min="30" :max="300" />
                    <span class="hint">秒</span>
                  </NFormItem>
                  <NFormItem label="Command Timeout">
                    <NInputNumber v-model:value="configForm.browser.command_timeout" :min="10" :max="120" />
                    <span class="hint">秒</span>
                  </NFormItem>
                  <NFormItem label="Record Sessions">
                    <NSwitch v-model:value="configForm.browser.record_sessions" />
                  </NFormItem>
                </NForm>
              </NCollapseItem>

              <NCollapseItem title="Checkpoints">
                <NForm label-placement="left" label-width="140px">
                  <NFormItem label="Enabled">
                    <NSwitch v-model:value="configForm.checkpoints.enabled" />
                  </NFormItem>
                  <NFormItem label="Max Snapshots">
                    <NInputNumber v-model:value="configForm.checkpoints.max_snapshots" :min="10" :max="100" />
                  </NFormItem>
                </NForm>
              </NCollapseItem>

              <NCollapseItem title="Approvals">
                <NForm label-placement="left" label-width="140px">
                  <NFormItem label="Mode">
                    <NSelect v-model:value="configForm.approvals.mode" :options="approvalsModeOptions" />
                  </NFormItem>
                  <NFormItem label="Timeout">
                    <NInputNumber v-model:value="configForm.approvals.timeout" :min="30" :max="300" />
                    <span class="hint">秒</span>
                  </NFormItem>
                </NForm>
              </NCollapseItem>

              <NCollapseItem title="Privacy & File Read">
                <NForm label-placement="left" label-width="160px">
                  <NFormItem label="Redact PII">
                    <NSwitch v-model:value="configForm.privacy.redact_pii" />
                    <span class="hint">脱敏敏感信息</span>
                  </NFormItem>
                  <NFormItem label="File Read Max">
                    <NInputNumber v-model:value="configForm.file_read_max_chars" :min="10000" :max="500000" />
                    <span class="hint">字符</span>
                  </NFormItem>
                </NForm>
              </NCollapseItem>
            </NCollapse>
          </NTabPane>
        </NTabs>
      </NSpin>
      </div>
      <template #footer>
        <div style="display: flex; gap: 8px; justify-content: end">
          <NButton @click="showEditModal = false">Cancel</NButton>
          <NButton type="primary" @click="saveProfileChanges">Save All Changes</NButton>
        </div>
      </template>
    </NModal>
  </div>
</template>

<style scoped lang="scss">
.agents-view {
  padding: 24px;
  max-width: 1000px;
  margin: 0 auto;
  min-height: 100%;
}

.agents-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.header-title {
  font-size: 24px;
  font-weight: 600;
  margin: 0;
}

.profiles-card {
  margin-bottom: 20px;
}

.profiles-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.profile-item {
  padding: 16px;
  border: 1px solid #333;
  border-radius: 8px;
  transition: all 0.2s;

  &:hover {
    background: rgba(255, 255, 255, 0.03);
  }

  &.active {
    border-color: #4ade80;
    background: rgba(74, 222, 128, 0.08);
  }
}

.profile-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.profile-info {
  display: flex;
  align-items: center;
  gap: 8px;

  .profile-name {
    font-size: 16px;
    font-weight: 600;
  }
}

.profile-actions {
  display: flex;
  gap: 8px;
}

.profile-details {
  display: flex;
  gap: 24px;
}

.detail-row {
  display: flex;
  align-items: center;
  gap: 8px;

  .label {
    color: #888;
    font-size: 13px;
  }

  .value {
    font-size: 13px;
    font-weight: 500;
  }
}

.personality-card {
  margin-bottom: 20px;

  .personality-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(90px, 1fr));
    gap: 8px;
  }

  .personality-item {
    padding: 12px 8px;
    border: 1px solid #333;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s;
    text-align: center;

    &:hover {
      background: rgba(255, 255, 255, 0.05);
      border-color: #555;
    }

    &.active {
      border-color: #4ade80;
      background: rgba(74, 222, 128, 0.1);
    }

    .p-emoji {
      font-size: 20px;
      margin-bottom: 4px;
    }

    .p-name {
      font-size: 12px;
      font-weight: 600;
    }
  }
}

.hint {
  margin-left: 8px;
  color: #888;
  font-size: 12px;
}

.n-form-item {
  margin-bottom: 16px;
}

.modal-scroll-content {
  max-height: calc(85vh - 80px);
  overflow-y: auto;
  padding-right: 8px;
}
</style>