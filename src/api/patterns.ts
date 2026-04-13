import { request } from './client'

export interface HourlyActivity {
  hour: number
  count: number
}

export interface SimilarTask {
  pattern: string
  sessions: number
  examples: string[]
}

export interface ToolSequence {
  sequence: string[]
  count: number
}

export interface PromptFrequency {
  prompt: string
  count: number
}

export interface PatternsData {
  hourly_activity: HourlyActivity[]
  similar_tasks: SimilarTask[]
  tool_sequences: ToolSequence[]
  prompt_frequency: PromptFrequency[]
}

export async function fetchPatterns(): Promise<PatternsData> {
  return request<PatternsData>('/api/patterns')
}