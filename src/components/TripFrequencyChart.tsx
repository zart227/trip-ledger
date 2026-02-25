import { useMemo, useState } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import type { Trip } from '../types'

const SHIFT_START_HOUR = 7

/** Час смены 0..23: 0 = 7:00–7:59, 1 = 8:00–8:59, ... 23 = 6:00–6:59 след. дня */
function getShiftHourIndex(entryTime: Date, shiftStart: Date): number {
  const ms = entryTime.getTime() - shiftStart.getTime()
  const hourIndex = Math.floor(ms / (60 * 60 * 1000))
  return Math.max(0, Math.min(23, hourIndex))
}

function getShiftHourLabel(hourIndex: number): string {
  const h = (SHIFT_START_HOUR + hourIndex) % 24
  return `${h.toString().padStart(2, '0')}:00`
}

interface TripFrequencyChartProps {
  /** Поездки текущей смены */
  trips: Trip[]
  /** Начало текущей смены (7:00) */
  shiftStart: Date
}

export function TripFrequencyChart({ trips, shiftStart }: TripFrequencyChartProps) {
  const chartData = useMemo(() => {
    const countByHour = new Map<number, number>()
    for (let i = 0; i < 24; i++) countByHour.set(i, 0)
    for (const t of trips) {
      const idx = getShiftHourIndex(new Date(t.entryTime), shiftStart)
      countByHour.set(idx, (countByHour.get(idx) ?? 0) + 1)
    }
    return [...countByHour.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([hourIndex, count]) => ({
        key: hourIndex,
        count,
        label: getShiftHourLabel(hourIndex),
      }))
  }, [trips, shiftStart])

  const maxCount = Math.max(...chartData.map((d) => d.count), 1)

  return (
    <div className="card stats-card chart-card">
      <h3>Рейсы по часам (текущая смена)</h3>
      <p className="muted small chart-subtitle">Смена 7:00–7:00, по въездам</p>
      <div className="chart-wrap">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart
            data={chartData}
            margin={{ top: 8, right: 8, left: 0, bottom: 32 }}
          >
            <XAxis
              dataKey="label"
              tick={(props: { x?: number; y?: number; payload?: { value?: string; label?: string } }) => {
                const label = props.payload?.value ?? props.payload?.label ?? ''
                return (
                  <text
                    x={props.x}
                    y={props.y}
                    fill="#94a3b8"
                    fontSize={10}
                    textAnchor="end"
                    transform={`rotate(-45 ${props.x ?? 0} ${props.y ?? 0})`}
                  >
                    {label}
                  </text>
                )
              }}
              tickLine={{ stroke: 'rgba(148,163,184,0.3)' }}
              axisLine={{ stroke: 'rgba(148,163,184,0.2)' }}
              interval={0}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              tickLine={{ stroke: 'rgba(148,163,184,0.3)' }}
              axisLine={{ stroke: 'rgba(148,163,184,0.2)' }}
              width={24}
            />
            <Tooltip
              contentStyle={{
                background: 'rgba(30, 41, 59, 0.98)',
                border: '1px solid rgba(148, 163, 184, 0.25)',
                borderRadius: '8px',
                color: '#e2e8f0',
              }}
              labelFormatter={(_: unknown, payload?: Array<{ payload?: { label?: string } }>) =>
                payload?.[0]?.payload?.label ?? ''
              }
              formatter={(value: number) => [`${value} рейсов`, 'Въездов']}
              labelStyle={{ color: '#94a3b8' }}
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={32}>
              {chartData.map((entry) => (
                <Cell
                  key={entry.key}
                  fill={
                    entry.count === maxCount && maxCount > 0
                      ? 'rgba(56, 189, 248, 0.9)'
                      : 'rgba(56, 189, 248, 0.5)'
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

/** Уникальные машины за последние N часов (по въездам) */
type UniquePeriod = 1 | 2 | 3

export function UniqueMachinesCard({ trips }: { trips: Trip[] }) {
  const [period, setPeriod] = useState<UniquePeriod>(2)

  const { uniqueCount, totalTrips } = useMemo(() => {
    const now = Date.now()
    const from = now - period * 60 * 60 * 1000
    const recent = trips.filter(
      (t) => new Date(t.entryTime).getTime() >= from
    )
    const plates = new Set(recent.map((t) => t.plateNumber))
    return { uniqueCount: plates.size, totalTrips: recent.length }
  }, [trips, period])

  return (
    <div className="card stats-card unique-machines-card">
      <h3>Активность «на сейчас»</h3>
      <p className="muted small chart-subtitle">
        Уникальных машин за последние:
      </p>
      <div className="unique-period-toggle">
        {([1, 2, 3] as const).map((h) => (
          <button
            key={h}
            type="button"
            className={period === h ? 'active' : ''}
            onClick={() => setPeriod(h)}
          >
            {h} ч
          </button>
        ))}
      </div>
      <div className="unique-stats">
        <span className="unique-number">{uniqueCount}</span>
        <span className="muted"> машин</span>
        <span className="unique-trips"> · {totalTrips} рейсов</span>
      </div>
    </div>
  )
}
