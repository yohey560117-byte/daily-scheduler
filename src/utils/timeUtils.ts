export function timeToMinutes(time: string): number {
  if (!time) return 0
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

export function minutesToTime(minutes: number): string {
  const clamped = Math.max(0, Math.min(1439, minutes))
  const h = Math.floor(clamped / 60)
  const m = clamped % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export function getDuration(startTime: string, endTime: string): number {
  if (!startTime || !endTime) return 0
  return Math.max(0, timeToMinutes(endTime) - timeToMinutes(startTime))
}

export function addMinutes(time: string, minutes: number): string {
  return minutesToTime(timeToMinutes(time) + minutes)
}

export function formatJapaneseDate(date: Date): string {
  const days = ['日', '月', '火', '水', '木', '金', '土']
  const y = date.getFullYear()
  const mo = date.getMonth() + 1
  const d = date.getDate()
  const dow = days[date.getDay()]
  return `${y}年${mo}月${d}日（${dow}）`
}

export function formatTime(date: Date): string {
  const h = String(date.getHours()).padStart(2, '0')
  const m = String(date.getMinutes()).padStart(2, '0')
  const s = String(date.getSeconds()).padStart(2, '0')
  return `${h}:${m}:${s}`
}

export function formatHHMM(date: Date): string {
  const h = String(date.getHours()).padStart(2, '0')
  const m = String(date.getMinutes()).padStart(2, '0')
  return `${h}:${m}`
}

export function toDateString(date: Date): string {
  const y = date.getFullYear()
  const mo = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${mo}-${d}`
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

export function formatDateLabel(date: Date): string {
  const days = ['日', '月', '火', '水', '木', '金', '土']
  const mo = date.getMonth() + 1
  const d = date.getDate()
  const dow = days[date.getDay()]
  return `${mo}月${d}日（${dow}）`
}

export function formatCompletedAt(isoString: string): string {
  const d = new Date(isoString)
  const h = String(d.getHours()).padStart(2, '0')
  const m = String(d.getMinutes()).padStart(2, '0')
  return `${h}:${m}`
}
