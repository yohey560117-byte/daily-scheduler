import { useState, useRef } from 'react'
import { Droppable } from '@hello-pangea/dnd'
import { Task } from '../types'
import { TaskItem } from './TaskItem'

interface Props {
  tasks: Task[]
  onAddTask: (title: string) => void
  onComplete: (id: string) => void
  onUpdate: (id: string, updates: Partial<Task>) => void
  onDelete: (id: string) => void
  onAutoArrange: () => void
}

export function TaskList({ tasks, onAddTask, onComplete, onUpdate, onDelete, onAutoArrange }: Props) {
  const [newTitle, setNewTitle] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  function handleAdd() {
    const title = newTitle.trim()
    if (!title) return
    onAddTask(title)
    setNewTitle('')
    inputRef.current?.focus()
  }

  return (
    <div>
      {/* Add task input */}
      <div className="flex gap-2 mb-3">
        <input
          ref={inputRef}
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          placeholder="タスク名を入力してEnterまたは追加ボタン"
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200"
        />
        <button
          onClick={handleAdd}
          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap"
        >
          + 追加
        </button>
      </div>

      {/* Drag & Drop list */}
      <Droppable droppableId="task-list">
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`min-h-[120px] rounded-lg transition-colors ${
              snapshot.isDraggingOver ? 'bg-blue-50/50' : ''
            }`}
          >
            {tasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-gray-400 text-sm gap-2">
                <svg className="w-10 h-10 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <span>タスクを追加してください</span>
              </div>
            ) : (
              tasks.map((task, i) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  index={i}
                  onComplete={onComplete}
                  onUpdate={onUpdate}
                  onDelete={onDelete}
                  onAutoArrange={onAutoArrange}
                />
              ))
            )}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  )
}
