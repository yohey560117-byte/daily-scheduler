export interface Task {
  id: string
  title: string
  startTime: string  // "HH:MM" or ""
  endTime: string    // "HH:MM" or ""
  duration: number   // minutes
  isFixed: boolean
  isBreak: boolean
  googleEventId?: string
  calendarName?: string
  calendarColor?: string
  order: number
}

export interface CompletedTask {
  id: string
  title: string
  startTime: string
  endTime: string
  duration: number
  isBreak: boolean
  completedAt: string  // ISO string
}

export interface StoredState {
  date: string
  tasks: Task[]
  completedTasks: CompletedTask[]
  tomorrowNotes: string
  dayAfterNotes: string
}
