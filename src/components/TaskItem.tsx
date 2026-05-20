import { useRef } from 'react'
import { Draggable } from '@hello-pangea/dnd'
import { Task } from '../types'
import { addMinutes } from '../utils/timeUtils'

interface Props {
  task: Task
  index: number
  onComplete: (id: string) => void
  onUpdate: (id: string, updates: Partial<Task>) => void
  onDelete: (id: string) => void
  onAutoArrange: () => void
}

export function TaskItem({ task, index, onComplete, onUpdate, onDelete, onAutoArrange }: Props) {
  const completingRef = useRef(false)

  const bg = task.isFixed
    ? 'bg-yellow-50 border-yellow-300'
    : task.isBreak
    ? 'bg-red-50 border-red-300'
    : 'bg-white border-gray-200'

  function handleStartChange(value: string) {
    if (value && task.duration > 0) {
      onUpdate(task.id, { startTime: value, endTime: addMinutes(value, task.duration) })
    } else {
      onUpdate(task.id, { startTime: value })
    }
    onAutoArrange()
  }

  function handleDurationChange(raw: string) {
    const dur = Math.max(0, parseInt(raw, 10) || 0)
    if (task.startTime) {
      onUpdate(task.id, { duration: dur, endTime: addMinutes(task.startTime, dur) })
    } else {
      onUpdate(task.id, { duration: dur })
    }
    if (dur > 0) onAutoArrange()
  }

  const inputCls = 'border border-gray-200 rounded px-1 py-0 text-gray-700 bg-white/60 focus:outline-none focus:border-blue-400'
  const DURATION_OPTIONS = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 90, 120]
  const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'))
  const MINUTE_OPTIONS = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55']

  const [startH, startM] = task.startTime ? task.startTime.split(':') : ['', '00']

  function handleStartHourChange(h: string) {
    handleStartChange(h ? `${h}:${startM || '00'}` : '')
  }
  function handleStartMinuteChange(m: string) {
    handleStartChange(`${startH || '00'}:${m}`)
  }

  return (
    <Draggable draggableId={task.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          className={`border rounded px-2 py-2 mb-0.5 flex items-center gap-1.5 text-xs transition-shadow ${bg} ${
            snapshot.isDragging ? 'shadow-xl ring-2 ring-blue-300' : 'shadow-sm'
          }`}
        >
          {/* Complete */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              if (completingRef.current) return
              completingRef.current = true
              onComplete(task.id)
            }}
            className="w-4 h-4 rounded-full border-2 border-green-400 hover:bg-green-400 flex-shrink-0 transition-colors"
            title="完了"
          />

          {/* Drag handle */}
          <div
            {...provided.dragHandleProps}
            className="drag-handle text-gray-300 hover:text-gray-500 select-none leading-none flex-shrink-0"
            title="ドラッグして並び替え"
          >
            ⠿
          </div>

          {/* Title */}
          <input
            type="text"
            value={task.title}
            onChange={(e) => onUpdate(task.id, { title: e.target.value })}
            className="flex-1 bg-transparent font-medium text-gray-800 focus:outline-none placeholder-gray-300 min-w-0"
            placeholder="タスク名"
          />

          {/* Right fixed block — ml-auto pushes it to the far right */}
          <div className="flex items-center gap-1.5 flex-shrink-0 w-[420px]">

            {/* Duration */}
            <div className="flex items-center gap-0.5">
              <select
                value={task.duration || 30}
                onChange={(e) => handleDurationChange(e.target.value)}
                className={`${inputCls} w-12`}
              >
                {DURATION_OPTIONS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
              <span className="text-[10px] text-gray-400">分</span>
            </div>

            {/* Time — fixed-width so isFixed selects and plain text occupy identical space */}
            <div className="w-[140px] flex-shrink-0 flex items-center">
              {task.isFixed ? (
                <div className="flex items-center gap-0.5">
                  <select
                    value={startH}
                    onChange={(e) => handleStartHourChange(e.target.value)}
                    className={`${inputCls} w-9 font-medium text-gray-700`}
                  >
                    <option value="">--</option>
                    {HOUR_OPTIONS.map((h) => <option key={h} value={h}>{h}</option>)}
                  </select>
                  <span className="text-gray-400">:</span>
                  <select
                    value={startM}
                    onChange={(e) => handleStartMinuteChange(e.target.value)}
                    className={`${inputCls} w-9 font-medium text-gray-700`}
                  >
                    {MINUTE_OPTIONS.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                  <span className="mx-0.5 text-gray-300">–</span>
                  <span className="font-medium text-gray-700 tabular-nums">
                    {task.endTime || '--:--'}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <span className="font-medium text-gray-700 tabular-nums">
                    {task.startTime || '--:--'}
                  </span>
                  <span className="mx-0.5 text-gray-300">–</span>
                  <span className="font-medium text-gray-700 tabular-nums">
                    {task.endTime || '--:--'}
                  </span>
                </div>
              )}
            </div>

            {/* Lock */}
            <button
              onClick={() => onUpdate(task.id, { isFixed: !task.isFixed })}
              title={task.isFixed ? '固定解除' : '時間を固定'}
              className={`flex items-center leading-none transition-opacity ${
                task.isFixed ? 'opacity-100' : 'opacity-25 hover:opacity-60'
              }`}
            >
              🔒
            </button>

            {task.isBreak && (
              <span className="flex items-center leading-none text-red-400">☕</span>
            )}
            {task.googleEventId
              ? <span className="flex items-center leading-none text-blue-400" title="Googleカレンダー">📅</span>
              : <span className="flex items-center leading-none text-gray-400" title="手動追加">✏️</span>
            }

            {/* Calendar name chip — fixed-width container so × stays aligned */}
            <div className="w-24 text-left">
              {task.calendarName ? (
                <span
                  className="inline-block self-center max-w-full truncate px-1.5 py-0 text-[10px] text-white rounded-full leading-5"
                  style={{ backgroundColor: task.calendarColor || '#4285f4' }}
                >
                  {task.calendarName}
                </span>
              ) : !task.googleEventId && (
                <span className="inline-block max-w-full truncate px-1.5 py-0 text-[10px] text-white rounded-full leading-5 bg-gray-400">
                  追加タスク
                </span>
              )}
            </div>

            {/* Delete */}
            <button
              onClick={() => onDelete(task.id)}
              className="w-4 flex items-center justify-center leading-none text-gray-300 hover:text-red-400 transition-colors"
              title="削除"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </Draggable>
  )
}
