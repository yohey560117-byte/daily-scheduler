import { formatJapaneseDate, formatTime } from '../utils/timeUtils'

interface Props {
  now: Date
  endTime: string
  workStart: string
  onWorkStartChange: (value: string) => void
  onSettingsClick: () => void
}

function generateWorkStartOptions(): string[] {
  const options: string[] = []
  for (let min = 4 * 60; min <= 23 * 60 + 30; min += 30) {
    const h = String(Math.floor(min / 60)).padStart(2, '0')
    const m = String(min % 60).padStart(2, '0')
    options.push(`${h}:${m}`)
  }
  return options
}

const WORK_START_OPTIONS = generateWorkStartOptions()

export function Header({ now, endTime, workStart, onWorkStartChange, onSettingsClick }: Props) {
  return (
    <header className="bg-gradient-to-r from-blue-700 to-blue-500 text-white px-6 py-4 shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-wide">デイリースケジューラー</h1>
          <p className="text-blue-200 text-sm mt-0.5">{formatJapaneseDate(now)}</p>
        </div>

        <div className="flex items-center gap-6">
          {/* Work start selector */}
          <label className="flex items-center gap-2 text-sm text-blue-100">
            <span className="whitespace-nowrap">仕事開始</span>
            <select
              value={workStart}
              onChange={(e) => onWorkStartChange(e.target.value)}
              className="bg-blue-600 border border-blue-400 text-white rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            >
              {WORK_START_OPTIONS.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </label>

          <div className="text-right">
            <div className="text-3xl font-mono font-bold tracking-widest tabular-nums">
              {formatTime(now)}
            </div>
            {endTime ? (
              <div className="text-blue-200 text-sm mt-0.5">
                終了予定:{' '}
                <span className="font-semibold text-white">{endTime}</span>
              </div>
            ) : (
              <div className="text-blue-300 text-sm mt-0.5">終了時間未設定</div>
            )}
          </div>

          <button
            onClick={onSettingsClick}
            className="p-2 rounded-full hover:bg-blue-600 transition-colors"
            title="設定"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </button>
        </div>
      </div>
    </header>
  )
}
