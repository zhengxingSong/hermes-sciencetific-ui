import { request } from './client'

export interface TimelineEvent {
  id: string
  event_type: 'session' | 'memory' | 'skill' | 'milestone'
  timestamp: number
  title: string
  detail?: string
  icon: string
}

export interface TimelineStats {
  totalSessions: number
  totalMessages: number
  milestones: string[]
}

export interface TimelineResponse {
  events: TimelineEvent[]
  stats: TimelineStats
}

export async function fetchTimeline(
  since?: number,
  until?: number,
  limit?: number
): Promise<TimelineResponse> {
  const params = new URLSearchParams()
  if (since) params.set('since', String(since))
  if (until) params.set('until', String(until))
  if (limit) params.set('limit', String(limit))

  const query = params.toString()
  const path = query ? `/api/timeline?${query}` : '/api/timeline'

  return request<TimelineResponse>(path)
}