import { useState, useEffect, useCallback, useRef } from 'react'
import { DragDropContext, DropResult } from '@hello-pangea/dnd'
import { Header } from './components/Header'
import { StatusBar } from './components/StatusBar'
import { TaskList } from './components/TaskList'
import { RightPanel } from './components/RightPanel'
import { useGoogleCalendar } from './hooks/useGoogleCalendar'
import { useClock } from './hooks/useClock'
import { autoArrange } from './utils/autoArrange'
import { toDateString, addMinutes } from './utils/timeUtils'
import { Task, CompletedTask, StoredState } from './types'
import { GOOGLE_CLIENT_ID } from './config'

const STORAGE_KEY = 'daily-scheduler-v1'
const CLIENT_ID_KEY = 'gcal-client-id'

function loadState(today: string): Omit<StoredState, 'date'> | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed: StoredState = JSON.parse(raw)
    if (parsed.date !== today) return null
    return {
      tasks: parsed.tasks ?? [],
      completedTasks: parsed.completedTasks ?? [],
      tomorrowNotes: parsed.tomorrowNotes ?? '',
      dayAfterNotes: parsed.dayAfterNotes ?? '',
    }
  } catch {
    return null
  }
}

function saveState(state: StoredState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

let idCounter = Date.now()
function newId(prefix: string) {
  return `${prefix}-${++idCounter}`
}

export default function App() {
  const now = useClock(10_000)
  const today = toDateString(now)

  const [tasks, setTasks] = useState<Task[]>([])
  const [completedTasks, setCompletedTasks] = useState<CompletedTask[]>([])
  const [tomorrowNotes, setTomorrowNotes] = useState('')
  const [dayAfterNotes, setDayAfterNotes] = useState('')
  const [workStart, setWorkStart] = useState('09:00')
  const [showSettings, setShowSettings] = useState(false)
  const [clientId, setClientId] = useState(
    () => GOOGLE_CLIENT_ID || localStorage.getItem(CLIENT_ID_KEY) || ''
  )
  const [clientIdInput, setClientIdInput] = useState(clientId)

  const { fetchTodayEvents, isLoading, error: calError } = useGoogleCalendar(clientId)

  // Load from localStorage once on mount
  useEffect(() => {
    const saved = loadState(today)
    if (saved) {
      setTasks(saved.tasks)
      setCompletedTasks(saved.completedTasks)
      setTomorrowNotes(saved.tomorrowNotes)
      setDayAfterNotes(saved.dayAfterNotes)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Persist state whenever it changes
  useEffect(() => {
    saveState({ date: today, tasks, completedTasks, tomorrowNotes, dayAfterNotes })
  }, [today, tasks, completedTasks, tomorrowNotes, dayAfterNotes])

  // Skip autoArrange on initial mount when workStart hasn't changed yet
  const workStartInitialized = useRef(false)
  useEffect(() => {
    if (!workStartInitialized.current) {
      workStartInitialized.current = true
      return
    }
    setTasks((prev) => autoArrange(prev, workStart))
  }, [workStart])

  // --- Handlers ---

  const handleDragEnd = useCallback((result: DropResult) => {
    if (!result.destination) return
    setTasks((prev) => {
      const items = [...prev]
      const [moved] = items.splice(result.source.index, 1)
      items.splice(result.destination!.index, 0, moved)
      const reordered = items.map((t, i) => ({ ...t, order: i }))
      return autoArrange(reordered, workStart)
    })
  }, [workStart])

  const handleAddTask = useCallback((title: string) => {
    setTasks((prev) => {
      const latestEnd = prev
        .filter((t) => t.endTime)
        .reduce((max, t) => (t.endTime > max ? t.endTime : max), '')
      const startTime = latestEnd || workStart
      const task: Task = {
        id: newId('task'),
        title,
        startTime,
        endTime: addMinutes(startTime, 30),
        duration: 30,
        isFixed: false,
        isBreak: false,
        order: prev.length,
      }
      return [...prev, task]
    })
  }, [workStart])

  const handleAddBreak = useCallback(() => {
    const task: Task = {
      id: newId('break'),
      title: '休憩',
      startTime: '12:00',
      endTime: '13:00',
      duration: 60,
      isFixed: true,
      isBreak: true,
      order: 0,
    }
    setTasks((prev) => autoArrange(
      [...prev, { ...task, order: prev.length }],
      workStart
    ))
  }, [workStart])

  const handleComplete = useCallback((id: string) => {
    setTasks((prev) => {
      const task = prev.find((t) => t.id === id)
      if (!task) return prev
      const completed: CompletedTask = {
        id: task.id,
        title: task.title,
        startTime: task.startTime,
        endTime: task.endTime,
        duration: task.duration,
        isBreak: task.isBreak,
        completedAt: new Date().toISOString(),
      }
      setCompletedTasks((c) => c.some((t) => t.id === id) ? c : [...c, completed])
      return prev.filter((t) => t.id !== id).map((t, i) => ({ ...t, order: i }))
    })
  }, [])

  const handleRestoreTask = useCallback((id: string) => {
    setCompletedTasks((prev) => {
      const task = prev.find((t) => t.id === id)
      if (!task) return prev
      setTasks((tasks) => {
        if (tasks.some((t) => t.id === id)) return tasks
        const restored: Task = {
          id: task.id,
          title: task.title,
          startTime: task.startTime,
          endTime: task.endTime,
          duration: task.duration,
          isFixed: false,
          isBreak: task.isBreak,
          order: tasks.length,
        }
        return [...tasks, restored]
      })
      return prev.filter((t) => t.id !== id)
    })
  }, [])

  const handleUpdate = useCallback((id: string, updates: Partial<Task>) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)))
  }, [])

  const handleDelete = useCallback((id: string) => {
    setTasks((prev) =>
      prev.filter((t) => t.id !== id).map((t, i) => ({ ...t, order: i }))
    )
  }, [])

  const handleAutoArrange = useCallback(() => {
    setTasks((prev) => autoArrange(prev, workStart))
  }, [workStart])

  const handleExportToGCal = useCallback(() => {
    const targets = tasks.filter((t) => t.startTime)
    if (targets.length === 0) return

    function toGCalDate(date: string, time: string): string {
      return date.replace(/-/g, '') + 'T' + time.replace(':', '') + '00'
    }

    targets.forEach((task, i) => {
      setTimeout(() => {
        const start = toGCalDate(today, task.startTime)
        const end = task.endTime
          ? toGCalDate(today, task.endTime)
          : toGCalDate(today, task.startTime)
        const params = new URLSearchParams({
          action: 'TEMPLATE',
          text: task.title,
          dates: `${start}/${end}`,
        })
        window.open(
          `https://calendar.google.com/calendar/render?${params.toString()}`,
          '_blank'
        )
      }, i * 300)
    })
  }, [tasks, today])

  const handleFetchCalendar = useCallback(async () => {
    const events = await fetchTodayEvents()
    console.log('取得したevents:', events)
    if (events.length === 0) return
    setTasks((prev) => {
      const existingGIds = new Set(
        prev.flatMap((t) => (t.googleEventId ? [t.googleEventId] : []))
      )
      const newEvents = events.filter(
        (e) => !e.googleEventId || !existingGIds.has(e.googleEventId)
      )
      if (newEvents.length === 0) return prev
      const merged = [
        ...prev,
        ...newEvents.map((e, i) => ({ ...e, order: prev.length + i })),
      ].map((t, i) => ({ ...t, order: i }))
      return autoArrange(merged, workStart)
    })
  }, [fetchTodayEvents, workStart])

  function handleSaveClientId() {
    const trimmed = clientIdInput.trim()
    setClientId(trimmed)
    localStorage.setItem(CLIENT_ID_KEY, trimmed)
    setShowSettings(false)
  }

  // Latest end time among all tasks with endTime
  const endTime = tasks
    .filter((t) => t.endTime)
    .reduce((max, t) => (t.endTime > max ? t.endTime : max), '')

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Sticky top group: Header + StatusBar + Toolbar */}
      <div className="sticky top-0 z-40">
        <Header
          now={now}
          endTime={endTime}
          workStart={workStart}
          onWorkStartChange={setWorkStart}
          onSettingsClick={() => setShowSettings(true)}
        />
        <StatusBar tasks={tasks} now={now} />
        {/* Toolbar */}
        <div className="bg-gray-100 border-b border-gray-300 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 py-2 flex flex-wrap gap-2">
            <button
              onClick={handleFetchCalendar}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-4 py-2 bg-white border border-gray-300 hover:bg-blue-50 hover:border-blue-400 text-gray-700 text-sm font-medium rounded-lg shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-4 h-4 text-blue-500" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11z"/>
              </svg>
              {isLoading ? '取得中...' : 'Googleカレンダーから取得'}
            </button>

            <button
              onClick={handleAddBreak}
              className="flex items-center gap-1.5 px-4 py-2 bg-red-50 border border-red-200 hover:bg-red-100 text-red-700 text-sm font-medium rounded-lg shadow-sm transition-colors"
            >
              ☕ 休憩を追加
            </button>

            <button
              onClick={handleAutoArrange}
              className="flex items-center gap-1.5 px-4 py-2 bg-green-50 border border-green-200 hover:bg-green-100 text-green-700 text-sm font-medium rounded-lg shadow-sm transition-colors"
            >
              ⚡ 自動配置
            </button>

            <button
              onClick={handleExportToGCal}
              disabled={tasks.filter((t) => t.startTime).length === 0}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg shadow-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              title="startTimeが設定されているタスクをGoogleカレンダーに登録"
            >
              📅 Googleカレンダーに登録
            </button>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-4 flex gap-4">
        {/* Left: task list */}
        <div className="flex-1 min-w-0">

          {/* Error banner */}
          {calError && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
              <span className="shrink-0 mt-0.5">⚠️</span>
              <span>{calError}</span>
              <button
                onClick={() => setShowSettings(true)}
                className="ml-auto shrink-0 underline text-red-600 hover:text-red-800"
              >
                設定を開く
              </button>
            </div>
          )}

          {/* Client ID not set warning */}
          {!clientId && !calError && (
            <div className="flex items-center gap-2 bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg mb-4 text-sm">
              <span>📋 GoogleカレンダーのOAuth Client IDが未設定です。</span>
              <button
                onClick={() => setShowSettings(true)}
                className="ml-auto shrink-0 underline text-yellow-700 hover:text-yellow-900"
              >
                設定する
              </button>
            </div>
          )}

          {/* Card wrapping the task list */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-gray-700">
                本日のタスク
                {tasks.length > 0 && (
                  <span className="ml-2 text-xs font-normal text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                    {tasks.length}件
                  </span>
                )}
              </h2>
              <p className="text-xs text-gray-400">ドラッグで並び替え可能</p>
            </div>

            <DragDropContext onDragEnd={handleDragEnd}>
              <TaskList
                tasks={tasks}
                onAddTask={handleAddTask}
                onComplete={handleComplete}
                onUpdate={handleUpdate}
                onDelete={handleDelete}
                onAutoArrange={handleAutoArrange}
              />
            </DragDropContext>
          </div>

          {/* Legend */}
          <div className="flex gap-4 mt-3 px-1 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded bg-yellow-100 border border-yellow-300" />
              固定タスク
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded bg-red-100 border border-red-300" />
              休憩
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded bg-white border border-gray-200" />
              通常タスク
            </span>
          </div>
        </div>

        {/* Right panel */}
        <RightPanel
          completedTasks={completedTasks}
          tomorrowNotes={tomorrowNotes}
          dayAfterNotes={dayAfterNotes}
          onTomorrowNotesChange={setTomorrowNotes}
          onDayAfterNotesChange={setDayAfterNotes}
          onRestoreTask={handleRestoreTask}
          today={now}
        />
      </main>

      {/* Settings modal */}
      {showSettings && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
          onClick={() => setShowSettings(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold text-gray-800 mb-1">設定</h2>
            <p className="text-sm text-gray-500 mb-5">Google Calendar APIの認証情報を設定します</p>

            <label className="block mb-1 text-sm font-medium text-gray-700">
              OAuth 2.0 クライアントID
            </label>
            <input
              type="text"
              value={clientIdInput}
              onChange={(e) => setClientIdInput(e.target.value)}
              placeholder="xxxx.apps.googleusercontent.com"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 mb-2"
            />

            <div className="bg-blue-50 rounded-lg p-3 text-xs text-blue-700 mb-5 leading-relaxed">
              <strong>取得方法：</strong><br />
              1. <a href="https://console.cloud.google.com/" target="_blank" rel="noreferrer" className="underline">Google Cloud Console</a> でプロジェクトを作成<br />
              2. 「APIとサービス」→「ライブラリ」で <strong>Google Calendar API</strong> を有効化<br />
              3. 「認証情報を作成」→「OAuthクライアントID」→「ウェブアプリケーション」<br />
              4. 承認済みのJavaScript生成元に <code className="bg-blue-100 px-1 rounded">http://localhost:5173</code> を追加<br />
              5. 取得したクライアントIDを上に貼り付けて保存
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowSettings(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={handleSaveClientId}
                className="px-5 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-colors"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
