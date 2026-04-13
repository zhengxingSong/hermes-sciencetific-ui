import Router from '@koa/router'
import * as hermesCli from '../services/hermes-cli'

export interface TimelineEvent {
  id: string
  event_type: 'session' | 'memory' | 'skill' | 'milestone'
  timestamp: number
  title: string
  detail?: string
  icon: string
}

export const timelineRoutes = new Router()

// Milestone thresholds
const MILESTONE_THRESHOLDS = {
  firstSession: 1,
  session10: 10,
  session50: 50,
  session100: 100,
  message100: 100,
  message500: 500,
  message1000: 1000,
}

timelineRoutes.get('/api/timeline', async (ctx) => {
  const since = ctx.query.since ? parseInt(ctx.query.since as string, 10) : undefined
  const until = ctx.query.until ? parseInt(ctx.query.until as string, 10) : undefined
  const limit = ctx.query.limit ? parseInt(ctx.query.limit as string, 10) : 100

  try {
    const sessions = await hermesCli.listSessions(undefined, 500)
    const events: TimelineEvent[] = []

    // Track milestone counters
    let totalSessions = 0
    let totalMessages = 0
    let milestonesDetected: Set<string> = new Set()

    // Process sessions and generate events
    for (const session of sessions) {
      // Filter by date range
      if (since && session.started_at < since) continue
      if (until && session.started_at > until) continue

      // Session start event
      events.push({
        id: `session-start-${session.id}`,
        event_type: 'session',
        timestamp: session.started_at,
        title: session.title || 'New Session',
        detail: `Model: ${session.model}`,
        icon: 'session',
      })

      // Session end event
      if (session.ended_at && session.end_reason) {
        events.push({
          id: `session-end-${session.id}`,
          event_type: 'session',
          timestamp: session.ended_at,
          title: 'Session Ended',
          detail: `Reason: ${session.end_reason}, Messages: ${session.message_count}`,
          icon: 'session-end',
        })
      }

      // Track totals for milestones
      totalSessions++
      totalMessages += session.message_count
    }

    // Generate milestone events based on totals
    // First session milestone
    if (totalSessions >= MILESTONE_THRESHOLDS.firstSession && !milestonesDetected.has('firstSession')) {
      const firstSession = sessions[sessions.length - 1] // Oldest session
      if (firstSession) {
        events.push({
          id: 'milestone-first-session',
          event_type: 'milestone',
          timestamp: firstSession.started_at,
          title: 'First Session',
          detail: 'Started your journey with Hermes Agent',
          icon: 'rocket',
        })
        milestonesDetected.add('firstSession')
      }
    }

    // 10 sessions milestone
    if (totalSessions >= MILESTONE_THRESHOLDS.session10 && !milestonesDetected.has('session10')) {
      events.push({
        id: 'milestone-session-10',
        event_type: 'milestone',
        timestamp: Date.now(),
        title: '10 Sessions Milestone',
        detail: 'Completed 10 conversations with Hermes Agent',
        icon: 'trophy',
      })
      milestonesDetected.add('session10')
    }

    // 100 messages milestone
    if (totalMessages >= MILESTONE_THRESHOLDS.message100 && !milestonesDetected.has('message100')) {
      events.push({
        id: 'milestone-message-100',
        event_type: 'milestone',
        timestamp: Date.now(),
        title: '100 Messages Milestone',
        detail: 'Exchanged 100 messages with Hermes Agent',
        icon: 'chat',
      })
      milestonesDetected.add('message100')
    }

    // 500 messages milestone
    if (totalMessages >= MILESTONE_THRESHOLDS.message500 && !milestonesDetected.has('message500')) {
      events.push({
        id: 'milestone-message-500',
        event_type: 'milestone',
        timestamp: Date.now(),
        title: '500 Messages Milestone',
        detail: 'Exchanged 500 messages with Hermes Agent',
        icon: 'star',
      })
      milestonesDetected.add('message500')
    }

    // 50 sessions milestone
    if (totalSessions >= MILESTONE_THRESHOLDS.session50 && !milestonesDetected.has('session50')) {
      events.push({
        id: 'milestone-session-50',
        event_type: 'milestone',
        timestamp: Date.now(),
        title: '50 Sessions Milestone',
        detail: 'Completed 50 conversations with Hermes Agent',
        icon: 'award',
      })
      milestonesDetected.add('session50')
    }

    // 1000 messages milestone
    if (totalMessages >= MILESTONE_THRESHOLDS.message1000 && !milestonesDetected.has('message1000')) {
      events.push({
        id: 'milestone-message-1000',
        event_type: 'milestone',
        timestamp: Date.now(),
        title: '1000 Messages Milestone',
        detail: 'Exchanged 1000 messages with Hermes Agent',
        icon: 'crown',
      })
      milestonesDetected.add('message1000')
    }

    // 100 sessions milestone
    if (totalSessions >= MILESTONE_THRESHOLDS.session100 && !milestonesDetected.has('session100')) {
      events.push({
        id: 'milestone-session-100',
        event_type: 'milestone',
        timestamp: Date.now(),
        title: '100 Sessions Milestone',
        detail: 'Completed 100 conversations with Hermes Agent',
        icon: 'legend',
      })
      milestonesDetected.add('session100')
    }

    // Sort events by timestamp descending (most recent first)
    events.sort((a, b) => b.timestamp - a.timestamp)

    // Apply limit
    const limitedEvents = events.slice(0, limit)

    ctx.body = {
      events: limitedEvents,
      stats: {
        totalSessions,
        totalMessages,
        milestones: Array.from(milestonesDetected),
      },
    }
  } catch (err: any) {
    ctx.status = 500
    ctx.body = { error: 'Failed to get timeline' }
    console.error('[Timeline] Get failed:', err.message)
  }
})