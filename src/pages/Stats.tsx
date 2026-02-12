import { useState } from 'react'
import { useData } from '../hooks/useData'
import type { Trip } from '../types'
import { getShiftBounds, getCurrentShiftDate } from '../lib/export'

function PlateStats({ plate, trips }: { plate: string; trips: Trip[] }) {
  const plateTrips = trips.filter((t) => t.plateNumber === plate)
  const tonnage = plateTrips[0]?.tonnage ?? 0

  return (
    <div className="card stats-card">
      <div className="stats-header">
        <span className="plate">{plate}</span>
        <span className="muted">{tonnage} т</span>
      </div>
      <p className="stats-total">Всего рейсов: {plateTrips.length}</p>
      <ul className="trip-timeline">
        {plateTrips
          .sort((a, b) => new Date(b.entryTime).getTime() - new Date(a.entryTime).getTime())
          .slice(0, 20)
          .map((t) => (
            <li key={t.id} className="trip-timeline-item">
              <span className="time">
                {new Date(t.entryTime).toLocaleString('ru-RU', {
                  day: '2-digit',
                  month: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
              <span className="arrow">→</span>
              <span className="time">
                {t.exitTime
                  ? new Date(t.exitTime).toLocaleString('ru-RU', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : '—'}
              </span>
            </li>
          ))}
      </ul>
      {plateTrips.length > 20 && (
        <p className="muted small">Показаны последние 20 рейсов</p>
      )}
    </div>
  )
}

export function Stats() {
  const { trips } = useData()
  const [filter, setFilter] = useState('')
  const shiftDate = getCurrentShiftDate()
  const { start } = getShiftBounds(shiftDate)

  const tripsThisShift = trips.filter((t) => new Date(t.entryTime) >= start)
  const platesShift = [...new Set(tripsThisShift.map((t) => t.plateNumber))]
  const platesAll = [...new Set(trips.map((t) => t.plateNumber))]
  const plates = filter ? platesAll : platesShift
  const filtered = plates
    .filter((p) => !filter || p.toLowerCase().includes(filter.toLowerCase()))
    .sort()

  return (
    <div className="page">
      <h2>Статистика по машинам</h2>
      <p className="shift-date">
        {shiftDate.toLocaleDateString('ru-RU', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })} (смена 7:00–7:00)
      </p>

      <div className="form-row">
        <input
          type="text"
          placeholder="Поиск по номеру..."
          value={filter}
          onChange={(e) => setFilter(e.target.value.toUpperCase())}
          className="input"
        />
      </div>

      <div className="stats-grid">
        {filtered.map((p) => (
          <PlateStats key={p} plate={p} trips={trips} />
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="hint">Нет машин за смену или ничего не найдено</p>
      )}
    </div>
  )
}
