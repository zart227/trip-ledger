import { useState, useRef } from 'react'
import { useData } from '../hooks/useData'
import {
  formatShiftReport,
  exportToJson,
  importFromJson,
  getCurrentShiftDate,
} from '../lib/export'
import * as db from '../lib/db'
import { isSupabaseConfigured } from '../lib/supabase'

export function Reports() {
  const { trips, load, sync, pull } = useData()
  const [reportDate, setReportDate] = useState(() => {
    const d = new Date()
    if (d.getHours() >= 7) {
      return d.toISOString().slice(0, 10)
    }
    const yesterday = new Date(d)
    yesterday.setDate(yesterday.getDate() - 1)
    return yesterday.toISOString().slice(0, 10)
  })
  const [syncStatus, setSyncStatus] = useState<string | null>(null)
  const [reportText, setReportText] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const generateReport = () => {
    const date = new Date(reportDate)
    setReportText(formatShiftReport(trips, date))
  }

  const copyReport = async () => {
    await navigator.clipboard.writeText(reportText)
    setSyncStatus('Скопировано в буфер обмена')
    setTimeout(() => setSyncStatus(null), 2000)
  }

  const shareReport = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `TripLedger — Смена ${reportDate}`,
          text: reportText,
        })
        setSyncStatus('Отправлено')
        setTimeout(() => setSyncStatus(null), 2000)
      } catch (e) {
        setSyncStatus('Ошибка: ' + String(e))
      }
    } else {
      await copyReport()
    }
  }

  const handleExport = () => {
    const json = exportToJson(trips)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `trip-ledger-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const text = await file.text()
    const data = importFromJson(text)
    if (!data) {
      setSyncStatus('Ошибка: неверный формат JSON')
      return
    }
    for (const t of data.trips) await db.saveTrip(t)
    await load()
    setSyncStatus('Данные импортированы')
    e.target.value = ''
    setTimeout(() => setSyncStatus(null), 2000)
  }

  const handleSync = async () => {
    setSyncStatus('Синхронизация...')
    const result = await sync()
    setSyncStatus(result.ok ? 'Синхронизировано' : result.error ?? 'Ошибка')
    setTimeout(() => setSyncStatus(null), 3000)
  }

  const handlePull = async () => {
    setSyncStatus('Загрузка...')
    const result = await pull()
    setSyncStatus(result.ok ? 'Загружено' : result.error ?? 'Ошибка')
    setTimeout(() => setSyncStatus(null), 3000)
  }

  return (
    <div className="page">
      <h2>Отчёты и экспорт</h2>

      {syncStatus && <p className="status-msg">{syncStatus}</p>}

      {isSupabaseConfigured() && (
        <div className="card sync-card">
          <h3>Supabase</h3>
          <div className="btn-row">
            <button onClick={handleSync} className="btn btn-primary">
              Синхронизировать
            </button>
            <button onClick={handlePull} className="btn btn-secondary">
              Загрузить
            </button>
          </div>
        </div>
      )}

      <div className="card">
        <h3>Отчёт за смену (7:00–7:00)</h3>
        <p className="shift-date">
          Текущая смена: {getCurrentShiftDate().toLocaleDateString('ru-RU', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}
        </p>
        <p className="muted small">Выберите дату начала смены</p>
        <div className="form-row">
          <input
            type="date"
            value={reportDate}
            onChange={(e) => setReportDate(e.target.value)}
            className="input"
          />
          <button onClick={generateReport} className="btn btn-primary">
            Сформировать
          </button>
        </div>
        {reportText && (
          <div className="report-box">
            <pre>{reportText}</pre>
            <div className="btn-row">
              <button onClick={copyReport} className="btn btn-primary">
                Копировать
              </button>
              <button onClick={shareReport} className="btn btn-secondary">
                Поделиться
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="card">
        <h3>Экспорт / Импорт JSON</h3>
        <div className="btn-row">
          <button onClick={handleExport} className="btn btn-primary">
            Экспорт JSON
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleImport}
            style={{ display: 'none' }}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="btn btn-secondary"
          >
            Импорт JSON
          </button>
        </div>
      </div>
    </div>
  )
}
