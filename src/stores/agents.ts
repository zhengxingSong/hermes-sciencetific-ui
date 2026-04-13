import { defineStore } from 'pinia'
import { ref } from 'vue'
import { request } from '@/api/client'

export interface Agent {
  name: string
  model: string
  gateway: string
  alias: string
  isActive: boolean
}

export interface AgentDetails {
  profile: Record<string, string>
  soul: string
  config: string
}

export const useAgentsStore = defineStore('agents', () => {
  const agents = ref<Agent[]>([])
  const loading = ref(false)

  async function loadAgents() {
    const res = await request<{ agents: Agent[] }>('/api/agents')
    agents.value = res.agents
  }

  async function getAgentDetails(name: string): Promise<AgentDetails> {
    return request<AgentDetails>(`/api/agents/${encodeURIComponent(name)}`)
  }

  async function createAgent(name: string, cloneFrom?: string) {
    await request('/api/agents', {
      method: 'POST',
      body: JSON.stringify({ name, cloneFrom }),
    })
  }

  async function updateAgent(name: string, data: { soul?: string; config?: string; model?: string; provider?: string }) {
    await request(`/api/agents/${encodeURIComponent(name)}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async function deleteAgent(name: string) {
    await request(`/api/agents/${encodeURIComponent(name)}`, {
      method: 'DELETE',
    })
  }

  async function switchAgent(name: string) {
    await request(`/api/agents/${encodeURIComponent(name)}/switch`, {
      method: 'POST',
    })
  }

  return {
    agents,
    loading,
    loadAgents,
    getAgentDetails,
    createAgent,
    updateAgent,
    deleteAgent,
    switchAgent,
  }
})
