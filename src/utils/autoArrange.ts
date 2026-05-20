import { Task } from '../types'
import { timeToMinutes, minutesToTime } from './timeUtils'

export function autoArrange(tasks: Task[], workStart = '09:00', workEnd = '22:00'): Task[] {
  const fixed = tasks
    .filter(t => t.isFixed && t.startTime && t.endTime)
    .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime))

  const free = tasks.filter(t => !t.isFixed).sort((a, b) => a.order - b.order)

  const startMin = timeToMinutes(workStart)
  const endMin = timeToMinutes(workEnd)

  // Build list of free slots between fixed tasks
  const slots: { start: number; end: number }[] = []
  let cursor = startMin

  for (const ft of fixed) {
    const fs = timeToMinutes(ft.startTime)
    const fe = timeToMinutes(ft.endTime)
    if (fs > cursor) {
      slots.push({ start: cursor, end: fs })
    }
    cursor = Math.max(cursor, fe)
  }
  if (cursor < endMin) {
    slots.push({ start: cursor, end: endMin })
  }

  // Assign free tasks into slots
  const placed: Task[] = []
  let taskIdx = 0

  for (const slot of slots) {
    let slotCursor = slot.start
    while (taskIdx < free.length) {
      const task = free[taskIdx]
      const dur = task.duration > 0 ? task.duration : 30
      if (slotCursor + dur > slot.end) break
      placed.push({
        ...task,
        startTime: minutesToTime(slotCursor),
        endTime: minutesToTime(slotCursor + dur),
      })
      slotCursor += dur
      taskIdx++
    }
  }

  // Tasks that didn't fit get appended without times
  while (taskIdx < free.length) {
    placed.push({ ...free[taskIdx], startTime: '', endTime: '' })
    taskIdx++
  }

  const all = [...fixed, ...placed]
  all.sort((a, b) => {
    if (!a.startTime && !b.startTime) return 0
    if (!a.startTime) return 1
    if (!b.startTime) return -1
    return timeToMinutes(a.startTime) - timeToMinutes(b.startTime)
  })

  return all.map((t, i) => ({ ...t, order: i }))
}
