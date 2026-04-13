import { request } from './client'

export interface Correction {
  id: string
  session_id: string
  timestamp: number
  original: string
  corrected: string
  type: 'edit' | 'reject'
}

export interface CorrectionStats {
  total: number
  edits: number
  rejects: number
  recent_24h: number
}

export interface CorrectionsResponse {
  corrections: Correction[]
  stats: CorrectionStats
}

export async function fetchCorrections(limit?: number): Promise<CorrectionsResponse> {
  const params = limit ? `?limit=${limit}` : ''
  return request<CorrectionsResponse>(`/api/corrections${params}`)
}

export async function fetchCorrectionStats(): Promise<{ stats: CorrectionStats }> {
  return request<{ stats: CorrectionStats }>('/api/corrections/stats')
}