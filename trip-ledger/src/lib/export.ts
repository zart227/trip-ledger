import type { Trip, ExportData } from '../types'

const SHIFT_START_HOUR = 7

export function getShiftBounds(date: Date): { start: Date; end: Date } {
  const start = new Date(date)
  start.setHours(SHIFT_START_HOUR, 0, 0, 0)
  const end = new Date(start)
  end.setDate(end.getDate() + 1)
  end.setMilliseconds(-1)
  return { start, end }
}

export function getCurrentShiftDate(): Date {
  const now = new Date()
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  if (now.getHours() >= SHIFT_START_HOUR) {
    return d
  }
  d.setDate(d.getDate() - 1)
  return d
}

export function exportToJson(trips: Trip[]): string {
  const data: ExportData = {
    version: 2,
    exportedAt: new Date().toISOString(),
    trips,
  }
  return JSON.stringify(data, null, 2)
}

export function importFromJson(json: string): ExportData | null {
  try {
    const data = JSON.parse(json) as ExportData
    if (data.version !== 2 || !Array.isArray(data.trips)) return null
    return data
  } catch {
    return null
  }
}

export function formatShiftReport(trips: Trip[], shiftDate: Date): string {
  const { start, end } = getShiftBounds(shiftDate)
  const dateStr = shiftDate.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })

  const tripsForShift = trips.filter((t) => {
    const entry = new Date(t.entryTime)
    return entry >= start && entry < end
  })

  const platesByGroup = new Map<string, Map<string, { count: number; tonnage: number }>>()
  for (const t of tripsForShift) {
    const group = t.groupName || 'Без группы'
    if (!platesByGroup.has(group)) {
      platesByGroup.set(group, new Map())
    }
    const plateCounts = platesByGroup.get(group)!
    const cur = plateCounts.get(t.plateNumber) ?? { count: 0, tonnage: t.tonnage }
    plateCounts.set(t.plateNumber, {
      count: cur.count + 1,
      tonnage: t.tonnage,
    })
  }

  const lines: string[] = [
    `📋 TripLedger — Смена ${dateStr} (7:00–7:00)`,
    '',
    'Рейсы по группам:',
  ]

  const sortedGroups = [...platesByGroup.keys()].sort((a, b) => {
    if (a === 'Без группы') return 1
    if (b === 'Без группы') return -1
    return a.localeCompare(b)
  })

  for (const group of sortedGroups) {
    lines.push('')
    lines.push(`${group}:`)
    const plateCounts = platesByGroup.get(group)!
    const sortedPlates = [...plateCounts.entries()].sort((a, b) =>
      a[0].localeCompare(b[0])
    )
    for (const [plate, { count, tonnage }] of sortedPlates) {
      lines.push(`  • ${plate} (${tonnage} т): ${count} рейсов`)
    }
  }

  lines.push('')
  lines.push(`Всего рейсов за смену: ${tripsForShift.length}`)

  return lines.join('\n')
}
