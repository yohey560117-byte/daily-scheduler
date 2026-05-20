import { useState, useCallback, useRef } from 'react'
import { Task } from '../types'

declare global {
  interface Window {
    google: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string
            scope: string
            prompt?: string
            callback: (response: { error?: string; access_token: string }) => void
          }) => { requestAccessToken: () => void }
        }
      }
    }
  }
}

const SCOPE = 'https://www.googleapis.com/auth/calendar.readonly'

function waitForGoogleGIS(): Promise<void> {
  return new Promise((resolve) => {
    if (window.google?.accounts?.oauth2) {
      resolve()
      return
    }
    const id = setInterval(() => {
      if (window.google?.accounts?.oauth2) {
        clearInterval(id)
        resolve()
      }
    }, 200)
  })
}

interface GCalEvent {
  id: string
  summary?: string
  start: { dateTime?: string; date?: string }
  end: { dateTime?: string; date?: string }
}

interface CalendarListItem {
  id: string
  summary?: string
  backgroundColor?: string
}

interface GCalEventWithCal extends GCalEvent {
  calendarName: string
  calendarColor: string
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

function calendarOrder(name: string | undefined): number {
  if (!name) return Infinity
  const m = name.match(/^(\d+)/)
  return m ? parseInt(m[1], 10) : Infinity
}

function toHHMM(d: Date): string {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function useGoogleCalendar(clientId: string) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Token cache
  const cachedToken = useRef<string>('')
  const tokenExpiry = useRef<number>(0)

  // tokenClient cache — created once, reused across calls
  const tokenClientRef = useRef<{ requestAccessToken: () => void } | null>(null)

  // Per-call resolve/reject — updated before each requestAccessToken() call
  const resolveRef = useRef<((token: string) => void) | null>(null)
  const rejectRef = useRef<((err: Error) => void) | null>(null)

  const getAccessToken = useCallback(async (): Promise<string> => {
    // Return cached token if still valid (expires in 55 min)
    if (cachedToken.current && Date.now() < tokenExpiry.current) {
      return cachedToken.current
    }

    await waitForGoogleGIS()

    // Build tokenClient once; stable callback dispatches to current resolve/reject refs
    if (!tokenClientRef.current) {
      tokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: SCOPE,
        prompt: '',
        callback: (res) => {
          if (res.error) {
            rejectRef.current?.(new Error(res.error))
          } else {
            cachedToken.current = res.access_token
            tokenExpiry.current = Date.now() + 3_500_000 // 55 min
            resolveRef.current?.(res.access_token)
          }
        },
      })
    }

    return new Promise((resolve, reject) => {
      resolveRef.current = resolve
      rejectRef.current = reject
      tokenClientRef.current!.requestAccessToken()
    })
  }, [clientId])

  const fetchTodayEvents = useCallback(async (): Promise<Task[]> => {
    if (!clientId) {
      setError(
        'Google Client IDが未設定です。画面右上の設定アイコンからClient IDを入力してください。'
      )
      return []
    }

    setIsLoading(true)
    setError(null)

    try {
      const token = await getAccessToken()
      console.log('token取得成功')
      const authHeader = { Authorization: `Bearer ${token}` }

      // 1. 全カレンダー一覧を取得
      const calListRes = await fetch(
        'https://www.googleapis.com/calendar/v3/users/me/calendarList',
        { headers: authHeader }
      )
      if (!calListRes.ok) {
        const body = await calListRes.json().catch(() => ({}))
        throw new Error(body?.error?.message ?? `HTTP ${calListRes.status}`)
      }
      const calListData: { items: CalendarListItem[] } = await calListRes.json()
      console.log('カレンダー数:', calListData.items.length, calListData.items.map((c) => c.id))

      // 2. 日付範囲を構築
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)

      const params = new URLSearchParams({
        timeMin: today.toISOString(),
        timeMax: tomorrow.toISOString(),
        singleEvents: 'true',
        orderBy: 'startTime',
        maxResults: '50',
      })

      // 3. 全カレンダーから並列取得（カレンダー名・色をイベントに付与）
      const allResults = await Promise.all(
        calListData.items.map(async (cal) => {
          const res = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(cal.id)}/events?${params}`,
            { headers: authHeader }
          )
          if (!res.ok) return [] as GCalEventWithCal[]
          const data: { items: GCalEvent[] } = await res.json()
          return (data.items ?? []).map((e) => ({
            ...e,
            calendarName: cal.summary ?? '',
            calendarColor: cal.backgroundColor ?? '',
          })) as GCalEventWithCal[]
        })
      )

      // 4. マージ・重複除去（同一イベントIDが複数カレンダーに出る場合に対応）
      const seen = new Set<string>()
      const merged: GCalEventWithCal[] = []
      for (const calEvents of allResults) {
        for (const e of calEvents) {
          if (!seen.has(e.id)) {
            seen.add(e.id)
            merged.push(e)
          }
        }
      }

      const timedCount = merged.filter((e) => e.start?.dateTime).length
      console.log('取得イベント数:', merged.length,
        '(時刻付き:', timedCount, '/ 終日:', merged.length - timedCount, ')')

      // 5. 全イベントを Task に変換（終日イベントはデフォルト時刻を設定）
      return merged
        .sort((a, b) => {
          // 時刻付き同士は startTime で比較、終日は先頭に
          const ta = a.start?.dateTime ? new Date(a.start.dateTime).getTime() : 0
          const tb = b.start?.dateTime ? new Date(b.start.dateTime).getTime() : 0
          return ta - tb
        })
        .map((e, i) => {
          const isTimed = Boolean(e.start?.dateTime)

          if (isTimed) {
            const start = new Date(e.start.dateTime!)
            const endDt = e.end?.dateTime ?? e.start.dateTime!
            const end = new Date(endDt)
            const startTime = toHHMM(start)
            const endTime = toHHMM(end)
            const duration = Math.round((end.getTime() - start.getTime()) / 60_000)
            return {
              id: e.id || `gcal-${i}`,
              title: e.summary ?? '(タイトルなし)',
              startTime,
              endTime,
              duration,
              isFixed: true,
              isBreak: false,
              googleEventId: e.id,
              calendarName: e.calendarName,
              calendarColor: e.calendarColor,
              order: i,
            } satisfies Task
          } else {
            // 終日イベント：デフォルト時刻を設定して自動配置対象にする
            return {
              id: e.id || `gcal-${i}`,
              title: e.summary ?? '(タイトルなし)',
              startTime: '09:00',
              endTime: '09:30',
              duration: 30,
              isFixed: false,
              isBreak: false,
              googleEventId: e.id,
              calendarName: e.calendarName,
              calendarColor: e.calendarColor,
              order: i,
            } satisfies Task
          }
        })
        .sort((a, b) => calendarOrder(a.calendarName) - calendarOrder(b.calendarName))
        .map((t, i) => ({ ...t, order: i }))
    } catch (err) {
      console.error('エラー:', err)
      const msg = err instanceof Error ? err.message : String(err)
      setError(`カレンダー取得エラー: ${msg}`)
      return []
    } finally {
      setIsLoading(false)
    }
  }, [clientId, getAccessToken])

  return { fetchTodayEvents, isLoading, error }
}
