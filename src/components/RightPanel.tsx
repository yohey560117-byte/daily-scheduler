import { useState } from 'react'
import { CompletedTask } from '../types'
import { formatCompletedAt, formatDateLabel, addDays } from '../utils/timeUtils'

interface Props {
  completedTasks: CompletedTask[]
  tomorrowNotes: string
  dayAfterNotes: string
  onTomorrowNotesChange: (v: string) => void
  onDayAfterNotesChange: (v: string) => void
  onRestoreTask: (id: string) => void
  today: Date
}

const DOW_LABELS = ['月', '火', '水', '木', '金', '土', '日']

function buildCalendarDays(year: number, month: number): (number | null)[] {
  const firstDow = new Date(year, month, 1).getDay() // 0=Sun
  const startOffset = (firstDow + 6) % 7             // Mon=0 … Sun=6
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const days: (number | null)[] = [
    ...Array<null>(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  while (days.length % 7 !== 0) days.push(null)
  return days
}

export function RightPanel({
  completedTasks,
  tomorrowNotes,
  dayAfterNotes,
  onTomorrowNotesChange,
  onDayAfterNotesChange,
  onRestoreTask,
  today,
}: Props) {
  const [calYear, setCalYear] = useState(() => today.getFullYear())
  const [calMonth, setCalMonth] = useState(() => today.getMonth())

  const tomorrow = addDays(today, 1)
  const dayAfter = addDays(today, 2)

  const totalMinutes = completedTasks.reduce((sum, t) => sum + (t.duration || 0), 0)
  const totalH = Math.floor(totalMinutes / 60)
  const totalM = totalMinutes % 60

  const calendarDays = buildCalendarDays(calYear, calMonth)

  function prevMonth() {
    if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11) }
    else setCalMonth(m => m - 1)
  }
  function nextMonth() {
    if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0) }
    else setCalMonth(m => m + 1)
  }

  return (
    <div className="w-72 shrink-0 flex flex-col gap-4">
      {/* Mini Calendar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Calendar header */}
        <div className="bg-blue-50 border-b border-blue-100 px-3 py-2 flex items-center justify-between">
          <button
            onClick={prevMonth}
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-blue-100 text-blue-600 text-base leading-none"
          >
            ‹
          </button>
          <span className="text-sm font-semibold text-blue-900">
            {calYear}年{calMonth + 1}月
          </span>
          <button
            onClick={nextMonth}
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-blue-100 text-blue-600 text-base leading-none"
          >
            ›
          </button>
        </div>

        {/* Day-of-week header */}
        <div className="grid grid-cols-7 border-b border-gray-100 bg-gray-50">
          {DOW_LABELS.map((label, i) => (
            <div
              key={label}
              className={`text-center text-xs py-1 font-medium ${
                i === 5 ? 'text-blue-500' : i === 6 ? 'text-red-500' : 'text-gray-500'
              }`}
            >
              {label}
            </div>
          ))}
        </div>

        {/* Date grid */}
        <div className="grid grid-cols-7 px-1 py-1 gap-y-0.5">
          {calendarDays.map((day, i) => {
            if (day === null) return <div key={`e-${i}`} className="h-6" />
            const col = i % 7
            const isToday =
              calYear === today.getFullYear() &&
              calMonth === today.getMonth() &&
              day === today.getDate()
            return (
              <div
                key={`${calYear}-${calMonth}-${day}`}
                className={`flex items-center justify-center h-6 text-xs rounded-full select-none ${
                  isToday
                    ? 'bg-blue-500 text-white font-bold'
                    : col === 5
                    ? 'text-blue-500'
                    : col === 6
                    ? 'text-red-500'
                    : 'text-gray-700'
                }`}
              >
                {day}
              </div>
            )
          })}
        </div>
      </div>

      {/* Completion history */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="bg-green-50 border-b border-green-100 px-4 py-3 flex items-center justify-between">
          <h2 className="font-semibold text-green-800 text-sm">完了履歴</h2>
          {completedTasks.length > 0 && (
            <span className="text-xs text-green-600 bg-green-100 px-2 py-0.5 rounded-full">
              {completedTasks.length}件 /{' '}
              {totalH > 0 ? `${totalH}h ` : ''}
              {totalM}m
            </span>
          )}
        </div>

        <div className="divide-y divide-gray-100 max-h-64 overflow-y-auto">
          {completedTasks.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-6">
              完了したタスクがここに表示されます
            </p>
          ) : (
            [...completedTasks].reverse().map((task) => (
              <div
                key={task.id}
                className={`px-4 py-2.5 ${task.isBreak ? 'bg-red-50/50' : ''}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm text-gray-700 leading-snug flex-1 min-w-0 break-words">
                    {task.isBreak ? '☕ ' : '✓ '}
                    {task.title}
                  </span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => onRestoreTask(task.id)}
                      className="text-xs text-blue-500 hover:text-blue-700 hover:bg-blue-50 px-1.5 py-0.5 rounded transition-colors"
                      title="本日のタスクに戻す"
                    >
                      ↩ 戻す
                    </button>
                    <span className="text-xs text-gray-400 tabular-nums">
                      {formatCompletedAt(task.completedAt)}
                    </span>
                  </div>
                </div>
                {(task.startTime || task.endTime) && (
                  <p className="text-xs text-gray-400 mt-0.5">
                    {task.startTime}〜{task.endTime}
                    {task.duration > 0 && ` (${task.duration}分)`}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Tomorrow notes */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="bg-indigo-50 border-b border-indigo-100 px-4 py-3">
          <h2 className="font-semibold text-indigo-800 text-sm">明日の予定メモ</h2>
          <p className="text-indigo-400 text-xs mt-0.5">{formatDateLabel(tomorrow)}</p>
        </div>
        <textarea
          value={tomorrowNotes}
          onChange={(e) => onTomorrowNotesChange(e.target.value)}
          placeholder="明日やることをメモ..."
          className="w-full px-4 py-3 text-sm text-gray-700 resize-none focus:outline-none focus:ring-1 focus:ring-inset focus:ring-indigo-300 min-h-[100px] placeholder-gray-300"
        />
      </div>

      {/* Day after tomorrow notes */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="bg-purple-50 border-b border-purple-100 px-4 py-3">
          <h2 className="font-semibold text-purple-800 text-sm">明後日の予定メモ</h2>
          <p className="text-purple-400 text-xs mt-0.5">{formatDateLabel(dayAfter)}</p>
        </div>
        <textarea
          value={dayAfterNotes}
          onChange={(e) => onDayAfterNotesChange(e.target.value)}
          placeholder="明後日やることをメモ..."
          className="w-full px-4 py-3 text-sm text-gray-700 resize-none focus:outline-none focus:ring-1 focus:ring-inset focus:ring-purple-300 min-h-[100px] placeholder-gray-300"
        />
      </div>
    </div>
  )
}
