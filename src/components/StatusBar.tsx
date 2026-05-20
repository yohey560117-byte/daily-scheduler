import { Task } from '../types'
import { timeToMinutes } from '../utils/timeUtils'

interface Props {
  tasks: Task[]
  now: Date
}

export function StatusBar({ tasks, now }: Props) {
  const currentMin = now.getHours() * 60 + now.getMinutes()

  const sorted = [...tasks]
    .filter((t) => t.startTime && t.endTime)
    .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime))

  const current = sorted.find(
    (t) =>
      timeToMinutes(t.startTime) <= currentMin &&
      timeToMinutes(t.endTime) > currentMin
  )

  const next = sorted.find((t) => timeToMinutes(t.startTime) > currentMin)

  if (!current && !next) {
    return (
      <div className="bg-gray-50 border-b border-gray-200 px-6 py-2 text-sm text-gray-400 text-center sticky top-0 z-40">
        スケジュールされたタスクがありません
      </div>
    )
  }

  if (current) {
    const startMin = timeToMinutes(current.startTime)
    const endMin = timeToMinutes(current.endTime)
    const total = endMin - startMin
    const elapsed = currentMin - startMin
    const progress = total > 0 ? Math.min(100, Math.round((elapsed / total) * 100)) : 0
    const remaining = endMin - currentMin

    const barColor = current.isBreak
      ? 'bg-red-400'
      : current.isFixed
      ? 'bg-yellow-400'
      : 'bg-blue-500'

    return (
      <div className="bg-blue-50 border-b border-blue-200 px-6 py-3 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-sm font-semibold text-blue-900">
              実行中:{' '}
              <span className={current.isBreak ? 'text-red-600' : 'text-blue-700'}>
                {current.title}
              </span>
            </span>
            <span className="text-sm text-blue-600 tabular-nums">
              残り <strong>{remaining}</strong>分 &nbsp;({current.startTime}〜{current.endTime})
            </span>
          </div>
          <div className="w-full bg-blue-200 rounded-full h-2.5">
            <div
              className={`${barColor} h-2.5 rounded-full transition-all duration-1000`}
              style={{ width: `${progress}%` }}
            />
          </div>
          {next && (
            <p className="text-xs text-gray-500 mt-1">
              次: {next.title}（{next.startTime}〜）
            </p>
          )}
        </div>
      </div>
    )
  }

  if (next) {
    const minutesUntil = timeToMinutes(next.startTime) - currentMin
    const urgent = minutesUntil <= 5
    const soon = minutesUntil <= 15

    const bg = urgent
      ? 'bg-red-50 border-red-200'
      : soon
      ? 'bg-yellow-50 border-yellow-200'
      : 'bg-green-50 border-green-200'

    const text = urgent
      ? 'text-red-800'
      : soon
      ? 'text-yellow-800'
      : 'text-green-800'

    return (
      <div className={`${bg} border-b px-6 py-2.5 sticky top-0 z-40`}>
        <div className="max-w-7xl mx-auto flex items-center gap-2">
          {urgent && <span className="text-red-500 font-bold animate-pulse">!</span>}
          <span className={`text-sm font-medium ${text}`}>
            次のタスク「{next.title}」まで{' '}
            <strong>{minutesUntil}</strong>分（{next.startTime} 開始）
          </span>
        </div>
      </div>
    )
  }

  return null
}
