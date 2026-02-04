import { useState, useRef, useEffect } from 'react'
import { useData } from '../hooks/useData'
import { getShiftBounds, getCurrentShiftDate } from '../lib/export'
import { pluralize } from '../lib/plural'
import type { Trip } from '../types'

export function Home() {
  const { trips, recordEntry, recordExit, updateTrips, deleteTrip } = useData()
  const [plate, setPlate] = useState('')
  const [tonnage, setTonnage] = useState('')
  const [groupName, setGroupName] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [highlightedIdx, setHighlightedIdx] = useState(0)
  const [showGroupSuggestions, setShowGroupSuggestions] = useState(false)
  const [highlightedGroupIdx, setHighlightedGroupIdx] = useState(0)
  const [showEditGroupSuggestions, setShowEditGroupSuggestions] = useState(false)
  const [highlightedEditGroupIdx, setHighlightedEditGroupIdx] = useState(0)
  const [editingPlate, setEditingPlate] = useState<string | null>(null)
  const [editPlate, setEditPlate] = useState('')
  const [editTonnage, setEditTonnage] = useState('')
  const [editGroup, setEditGroup] = useState('')
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [editingPaymentPlate, setEditingPaymentPlate] = useState<string | null>(null)
  const [editCashAmount, setEditCashAmount] = useState('')
  const [editTripsCovered, setEditTripsCovered] = useState<number | 'all'>('all')
  const inputRef = useRef<HTMLInputElement>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)
  const justAppliedSuggestionRef = useRef(false)
  const groupInputRef = useRef<HTMLInputElement>(null)
  const groupSuggestionsRef = useRef<HTMLDivElement>(null)
  const justAppliedGroupSuggestionRef = useRef(false)
  const editGroupInputRef = useRef<HTMLInputElement>(null)
  const editGroupSuggestionsRef = useRef<HTMLDivElement>(null)
  const justAppliedEditGroupSuggestionRef = useRef(false)

  const shiftDate = getCurrentShiftDate()
  const { start } = getShiftBounds(shiftDate)
  const tripsThisShift = trips.filter((t) => new Date(t.entryTime) >= start)
  const recentPlates = [...new Set(tripsThisShift.map((t) => t.plateNumber))]
  const plateToTonnage = new Map(tripsThisShift.map((t) => [t.plateNumber, t.tonnage]))
  const allPlatesWithTonnage = new Map<string, number>()
  const allPlatesWithGroup = new Map<string, string>()
  for (const t of [...trips].reverse()) {
    if (!allPlatesWithTonnage.has(t.plateNumber)) {
      allPlatesWithTonnage.set(t.plateNumber, t.tonnage)
    }
    if (!allPlatesWithGroup.has(t.plateNumber)) {
      allPlatesWithGroup.set(t.plateNumber, t.groupName ?? '')
    }
  }
  const plateToTripCount = new Map<string, number>()
  const plateToGroup = new Map<string, string>()
  for (const t of [...tripsThisShift].sort((a, b) => new Date(b.entryTime).getTime() - new Date(a.entryTime).getTime())) {
    plateToTripCount.set(t.plateNumber, (plateToTripCount.get(t.plateNumber) ?? 0) + 1)
    if (!plateToGroup.has(t.plateNumber)) {
      plateToGroup.set(t.plateNumber, t.groupName ?? '')
    }
  }
  const totalTripsThisShift = tripsThisShift.length

  const platesByGroup = new Map<string, string[]>()
  for (const p of recentPlates) {
    const group = plateToGroup.get(p) || 'Без группы'
    if (!platesByGroup.has(group)) platesByGroup.set(group, [])
    platesByGroup.get(group)!.push(p)
  }
  const sortedGroups = [...platesByGroup.keys()].sort((a, b) => {
    if (a === 'Без группы') return 1
    if (b === 'Без группы') return -1
    return a.localeCompare(b)
  })

  const allGroups = [...new Set(trips.map((t) => t.groupName).filter(Boolean))] as string[]

  const plateSearch = plate.trim().toUpperCase()
  const suggestions = plateSearch.length >= 1
    ? [...allPlatesWithTonnage.keys()].filter((p) =>
        p.toUpperCase().includes(plateSearch)
      ).slice(0, 8)
    : []

  const groupSearch = groupName.trim()
  const groupSuggestions = groupSearch.length >= 1
    ? allGroups.filter((g) =>
        g.toLowerCase().includes(groupSearch.toLowerCase())
      ).slice(0, 8)
    : []

  const editGroupSearch = editGroup.trim()
  const editGroupSuggestions = editGroupSearch.length >= 1
    ? allGroups.filter((g) =>
        g.toLowerCase().includes(editGroupSearch.toLowerCase())
      ).slice(0, 8)
    : []

  useEffect(() => {
    setHighlightedIdx(0)
  }, [plate, suggestions.length])

  useEffect(() => {
    setHighlightedGroupIdx(0)
  }, [groupName, groupSuggestions.length])

  useEffect(() => {
    setHighlightedEditGroupIdx(0)
  }, [editGroup, editGroupSuggestions.length])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(target) &&
        inputRef.current &&
        !inputRef.current.contains(target)
      ) {
        setShowSuggestions(false)
      }
      if (
        groupSuggestionsRef.current &&
        !groupSuggestionsRef.current.contains(target) &&
        groupInputRef.current &&
        !groupInputRef.current.contains(target)
      ) {
        setShowGroupSuggestions(false)
      }
      if (
        editGroupSuggestionsRef.current &&
        !editGroupSuggestionsRef.current.contains(target) &&
        editGroupInputRef.current &&
        !editGroupInputRef.current.contains(target)
      ) {
        setShowEditGroupSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const activeTrips = trips.filter((t) => !t.exitTime)
  const platesOnTerritory = new Set(activeTrips.map((t) => t.plateNumber))

  const applySuggestion = (p: string) => {
    setPlate(p)
    setTonnage(String(allPlatesWithTonnage.get(p) ?? ''))
    setGroupName(allPlatesWithGroup.get(p) ?? '')
    setShowSuggestions(false)
    justAppliedSuggestionRef.current = true
    inputRef.current?.focus()
  }

  const applyGroupSuggestion = (g: string) => {
    setGroupName(g)
    setShowGroupSuggestions(false)
    justAppliedGroupSuggestionRef.current = true
    groupInputRef.current?.focus()
  }

  const applyEditGroupSuggestion = (g: string) => {
    setEditGroup(g)
    setShowEditGroupSuggestions(false)
    justAppliedEditGroupSuggestionRef.current = true
    editGroupInputRef.current?.focus()
  }

  const handleQuickEntry = async (p: string) => {
    const activeTripForPlate = [...activeTrips]
      .filter((t) => t.plateNumber === p && new Date(t.entryTime) >= start)
      .sort((a, b) => new Date(b.entryTime).getTime() - new Date(a.entryTime).getTime())[0]
    if (activeTripForPlate) {
      await recordExit(activeTripForPlate.id)
    } else {
      const ton = plateToTonnage.get(p) ?? (tonnage ? Number(tonnage) : 0)
      const group = (plateToGroup.get(p) || groupName || '').trim() || null
      await recordEntry(p, ton, group)
    }
    setPlate('')
  }

  const handleFormEntry = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!plate.trim()) return
    const p = plate.trim()
    const ton = Number(tonnage) || (allPlatesWithTonnage.get(p) ?? 0)
    await recordEntry(p, ton, groupName.trim() || null)
    setPlate('')
    setTonnage('')
    setGroupName('')
    setShowSuggestions(false)
    setShowGroupSuggestions(false)
  }

  const handlePlateKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightedIdx((i) => Math.min(i + 1, suggestions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightedIdx((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && suggestions[highlightedIdx]) {
      e.preventDefault()
      applySuggestion(suggestions[highlightedIdx])
    } else if (e.key === 'Escape') {
      setShowSuggestions(false)
    }
  }

  const handleGroupKeyDown = (e: React.KeyboardEvent) => {
    if (!showGroupSuggestions || groupSuggestions.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightedGroupIdx((i) => Math.min(i + 1, groupSuggestions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightedGroupIdx((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && groupSuggestions[highlightedGroupIdx]) {
      e.preventDefault()
      applyGroupSuggestion(groupSuggestions[highlightedGroupIdx])
    } else if (e.key === 'Escape') {
      setShowGroupSuggestions(false)
    }
  }

  const handleEditGroupKeyDown = (e: React.KeyboardEvent) => {
    if (!showEditGroupSuggestions || editGroupSuggestions.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightedEditGroupIdx((i) => Math.min(i + 1, editGroupSuggestions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightedEditGroupIdx((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && editGroupSuggestions[highlightedEditGroupIdx]) {
      e.preventDefault()
      applyEditGroupSuggestion(editGroupSuggestions[highlightedEditGroupIdx])
    } else if (e.key === 'Escape') {
      setShowEditGroupSuggestions(false)
    }
  }

  const startEditByPlate = (plate: string) => {
    setEditingPlate(plate)
    setEditPlate(plate)
    setEditTonnage(String(plateToTonnage.get(plate) ?? 0))
    setEditGroup(plateToGroup.get(plate) ?? '')
    setShowEditGroupSuggestions(false)
  }

  const saveEdit = async () => {
    if (!editingPlate) return
    const newPlate = editPlate.trim()
    const newTonnage = Number(editTonnage) || 0
    const newGroup = editGroup.trim() || null
    const toUpdate = trips
      .filter((x) => x.plateNumber === editingPlate)
      .map((trip) => ({
        ...trip,
        plateNumber: newPlate,
        tonnage: newTonnage,
        groupName: newGroup,
      }))
    await updateTrips(toUpdate)
    setEditingPlate(null)
    setShowEditGroupSuggestions(false)
  }

  const handleDelete = async (id: string) => {
    await deleteTrip(id)
    setDeleteConfirmId(null)
  }

  const getUnpaidTripsForPlate = (plateNum: string) =>
    tripsThisShift
      .filter((t) => t.plateNumber === plateNum && t.exitTime && t.cashAmount == null)
      .sort((a, b) => new Date(a.exitTime!).getTime() - new Date(b.exitTime!).getTime())

  const getPlatePaymentStats = (plateNum: string) => {
    const allPlateTrips = tripsThisShift.filter((t) => t.plateNumber === plateNum)
    const completed = allPlateTrips.filter((t) => t.exitTime)
    const active = allPlateTrips.filter((t) => !t.exitTime)
    const paid = completed.filter((t) => t.cashAmount != null)
    return {
      total: completed.length,
      paid: paid.length,
      unpaid: completed.length - paid.length,
      active: active.length,
      cashSum: paid.reduce((s, t) => s + (t.cashAmount ?? 0), 0),
    }
  }

  const startEditPayment = (plateNum: string) => {
    setEditingPaymentPlate(plateNum)
    setEditCashAmount('')
    const unpaid = getUnpaidTripsForPlate(plateNum)
    setEditTripsCovered(unpaid.length > 0 ? 'all' : 1)
  }

  const savePayment = async () => {
    if (!editingPaymentPlate) return
    const amount = Number(editCashAmount.trim())
    if (!amount || amount <= 0) return

    const unpaid = getUnpaidTripsForPlate(editingPaymentPlate)
    if (unpaid.length === 0) return

    const n = editTripsCovered === 'all' ? unpaid.length : Math.min(editTripsCovered, unpaid.length)
    const amountPerTrip = Math.round((amount / n) * 100) / 100
    const toUpdate = unpaid.slice(0, n).map((t) => ({ ...t, cashAmount: amountPerTrip }))

    await updateTrips(toUpdate)
    setEditingPaymentPlate(null)
  }

  const renderTripItem = (t: Trip, isActive: boolean) => (
    <li key={t.id} className="trip-item">
      <span className="plate">{t.plateNumber}</span>
      <span className="muted">{t.tonnage} т</span>
      {t.groupName && <span className="badge">{t.groupName}</span>}
      {t.exitTime && t.cashAmount != null && (
        <span className="payment-badge payment-badge-cash">
          Наличные {t.cashAmount.toLocaleString('ru-RU')} ₽
        </span>
      )}
      <span className="muted">
        {new Date(t.entryTime).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
        {t.exitTime && ` → ${new Date(t.exitTime).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`}
      </span>
      <div className="trip-item-actions">
        {isActive && (
          <button
            onClick={() => recordExit(t.id)}
            className="btn btn-sm btn-exit"
          >
            Завершить
          </button>
        )}
        {deleteConfirmId === t.id ? (
            <>
              <button
                onClick={() => handleDelete(t.id)}
                className="btn btn-sm btn-danger"
              >
                Да, удалить
              </button>
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="btn btn-sm btn-secondary"
              >
                Отмена
              </button>
            </>
          ) : (
            <button
              onClick={() => setDeleteConfirmId(t.id)}
              className="btn btn-sm btn-danger"
            >
              Удалить
            </button>
          )}
      </div>
    </li>
  )

  return (
    <div className="page">
      <h2>Учёт рейсов</h2>
      <p className="shift-date">
        {shiftDate.toLocaleDateString('ru-RU', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })} (смена 7:00–7:00)
      </p>

      {activeTrips.length > 0 && (
        <div className="card vehicles-on-territory-card">
          <h3>Машины на территории</h3>
          <p className="muted small">Клик — завершить рейс</p>
          <div className="vehicles-on-territory-grid">
            {[...activeTrips]
              .sort((a, b) => new Date(b.entryTime).getTime() - new Date(a.entryTime).getTime())
              .map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className="vehicle-on-territory-card"
                  onClick={() => recordExit(t.id)}
                >
                  <div className="vehicle-on-territory-header">
                    <span className="plate">{t.plateNumber}</span>
                    <span className="vehicle-on-territory-trip-count">
                      {`${plateToTripCount.get(t.plateNumber) ?? 0} ${pluralize(plateToTripCount.get(t.plateNumber) ?? 0, ['рейс', 'рейса', 'рейсов'])}`}
                    </span>
                  </div>
                  <span className="muted">{t.tonnage} т</span>
                  <span className="vehicle-on-territory-group">
                    {t.groupName ? <span className="badge">{t.groupName}</span> : null}
                  </span>
                  <span className="muted entry-time">
                    с {new Date(t.entryTime).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span className="vehicle-on-territory-action">Завершить →</span>
                </button>
              ))}
          </div>
        </div>
      )}

      <form onSubmit={handleFormEntry} className="card form-card">
        <h3>Начать рейс</h3>
        <div className="form-row form-row-inputs">
          <div className="plate-input-wrap">
            <input
              ref={inputRef}
              type="text"
              placeholder="Госномер (начните вводить для поиска)"
              value={plate}
              onChange={(e) => {
                setPlate(e.target.value)
                setShowSuggestions(true)
              }}
              onFocus={() => {
                if (justAppliedSuggestionRef.current) {
                  justAppliedSuggestionRef.current = false
                  return
                }
                suggestions.length > 0 && setShowSuggestions(true)
              }}
              onKeyDown={handlePlateKeyDown}
              className="input"
              autoComplete="off"
            />
            {showSuggestions && suggestions.length > 0 && (
              <div ref={suggestionsRef} className="suggestions-dropdown">
                {suggestions.map((p, i) => (
                  <button
                    key={p}
                    type="button"
                    className={`suggestion-item ${i === highlightedIdx ? 'highlighted' : ''}`}
                    onPointerDown={(e) => {
                      e.preventDefault()
                      applySuggestion(p)
                    }}
                  >
                    <span className="plate">{p}</span>
                    <span className="muted">{allPlatesWithTonnage.get(p) ?? 0} т</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <input
            type="number"
            placeholder="Тонаж (т)"
            value={tonnage}
            onChange={(e) => setTonnage(e.target.value)}
            className="input input-tonnage"
            min={0}
            step={0.1}
          />
          <div className="group-input-wrap">
            <input
              ref={groupInputRef}
              type="text"
              placeholder="Группа (начните вводить для поиска)"
              value={groupName}
              onChange={(e) => {
                setGroupName(e.target.value)
                setShowGroupSuggestions(true)
              }}
              onFocus={() => {
                if (justAppliedGroupSuggestionRef.current) {
                  justAppliedGroupSuggestionRef.current = false
                  return
                }
                groupSuggestions.length > 0 && setShowGroupSuggestions(true)
              }}
              onKeyDown={handleGroupKeyDown}
              className="input"
              autoComplete="off"
            />
            {showGroupSuggestions && groupSuggestions.length > 0 && (
              <div ref={groupSuggestionsRef} className="suggestions-dropdown">
                {groupSuggestions.map((g, i) => (
                  <button
                    key={g}
                    type="button"
                    className={`suggestion-item ${i === highlightedGroupIdx ? 'highlighted' : ''}`}
                    onPointerDown={(e) => {
                      e.preventDefault()
                      applyGroupSuggestion(g)
                    }}
                  >
                    {g}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="form-row form-row-submit">
          <button type="submit" className="btn btn-primary">
            Начать рейс
          </button>
        </div>
      </form>

      {recentPlates.length > 0 && (
        <div className="card">
          <h3>Быстрый выбор (смена)</h3>
          <p className="muted small">Клик по карточке — въезд/выезд, «Изменить» — номер/тонаж, «Оплата» — налом</p>
          {sortedGroups.map((groupName) => (
            <div key={groupName} className="vehicle-group">
              <h4 className="group-title">{groupName}</h4>
              <div className="vehicle-grid">
                {platesByGroup.get(groupName)!.map((p) =>
                  editingPaymentPlate === p ? (
                    <div key={p} className="vehicle-card vehicle-card-payment">
                      <span className="plate">{p}</span>
                      {(() => {
                        const unpaid = getUnpaidTripsForPlate(p)
                        return unpaid.length === 0 ? (
                          <span className="muted small">Все рейсы оплачены</span>
                        ) : (
                          <>
                            <input
                              type="number"
                              placeholder="Сумма (₽)"
                              value={editCashAmount}
                              onChange={(e) => setEditCashAmount(e.target.value)}
                              className="input input-amount"
                              min={0}
                              step={1}
                            />
                            <span className="payment-edit-for">за</span>
                            <select
                              value={editTripsCovered === 'all' ? 'all' : String(editTripsCovered)}
                              onChange={(e) =>
                                setEditTripsCovered(e.target.value === 'all' ? 'all' : Number(e.target.value))
                              }
                              className="input input-trips"
                            >
                              <option value="all">все ({unpaid.length})</option>
                              {Array.from({ length: unpaid.length }, (_, i) => i + 1).map((k) => (
                                <option key={k} value={k}>
                                  {k} {pluralize(k, ['рейс', 'рейса', 'рейсов'])}
                                </option>
                              ))}
                            </select>
                          </>
                        )
                      })()}
                      <div className="vehicle-card-payment-actions">
                        {getUnpaidTripsForPlate(p).length > 0 && (
                          <button onClick={savePayment} className="btn btn-sm btn-primary">
                            OK
                          </button>
                        )}
                        <button
                          onClick={() => setEditingPaymentPlate(null)}
                          className="btn btn-sm btn-secondary"
                        >
                          {getUnpaidTripsForPlate(p).length === 0 ? 'Закрыть' : 'Отмена'}
                        </button>
                      </div>
                    </div>
                  ) : editingPlate === p ? (
                    <div key={p} className="vehicle-card vehicle-card-edit">
                      <input
                        value={editPlate}
                        onChange={(e) => setEditPlate(e.target.value)}
                        className="input"
                        placeholder="Госномер"
                      />
                      <input
                        type="number"
                        value={editTonnage}
                        onChange={(e) => setEditTonnage(e.target.value)}
                        className="input"
                        placeholder="Тонаж"
                      />
                      <div className="group-input-wrap">
                        <input
                          ref={editGroupInputRef}
                          type="text"
                          value={editGroup}
                          onChange={(e) => {
                            setEditGroup(e.target.value)
                            setShowEditGroupSuggestions(true)
                          }}
                          onFocus={() => {
                          if (justAppliedEditGroupSuggestionRef.current) {
                            justAppliedEditGroupSuggestionRef.current = false
                            return
                          }
                          editGroupSuggestions.length > 0 && setShowEditGroupSuggestions(true)
                        }}
                          onKeyDown={handleEditGroupKeyDown}
                          className="input"
                          placeholder="Группа (начните вводить для поиска)"
                          autoComplete="off"
                        />
                        {showEditGroupSuggestions && editGroupSuggestions.length > 0 && (
                          <div ref={editGroupSuggestionsRef} className="suggestions-dropdown">
                            {editGroupSuggestions.map((g, i) => (
                              <button
                                key={g}
                                type="button"
                                className={`suggestion-item ${i === highlightedEditGroupIdx ? 'highlighted' : ''}`}
                                onPointerDown={(e) => {
                                  e.preventDefault()
                                  applyEditGroupSuggestion(g)
                                }}
                              >
                                {g}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="vehicle-card-edit-actions">
                        <button onClick={saveEdit} className="btn btn-sm btn-primary">
                          Сохранить
                        </button>
                        <button
                          onClick={() => {
                            setEditingPlate(null)
                            setShowEditGroupSuggestions(false)
                          }}
                          className="btn btn-sm btn-secondary"
                        >
                          Отмена
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      key={p}
                      role="button"
                      tabIndex={0}
                      className={`vehicle-card ${platesOnTerritory.has(p) ? 'vehicle-card-on-territory' : ''}`}
                      onClick={() => handleQuickEntry(p)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') handleQuickEntry(p)
                      }}
                    >
                      <span className="plate">{p}</span>
                      <span className="tonnage">{plateToTonnage.get(p) ?? 0} т</span>
                      <span className="trip-count">
                        {`${plateToTripCount.get(p) ?? 0} ${pluralize(plateToTripCount.get(p) ?? 0, ['рейс', 'рейса', 'рейсов'])}`}
                      </span>
                      {(() => {
                        const stats = getPlatePaymentStats(p)
                        if (stats.paid === 0) return null
                        if (stats.paid === stats.total && stats.active === 0) {
                          return (
                            <span className="vehicle-card-payment-status vehicle-card-payment-full">
                              ✓ оплачено
                            </span>
                          )
                        }
                        const parts: string[] = []
                        if (stats.total > 0) parts.push(`${stats.paid}/${stats.total} оплачено`)
                        if (stats.active > 0) parts.push(`${stats.active} в пути`)
                        return (
                          <span className="vehicle-card-payment-status vehicle-card-payment-partial">
                            {parts.join(', ')}
                          </span>
                        )
                      })()}
                      {platesOnTerritory.has(p) && (
                        <span className="vehicle-card-territory-badge">На территории</span>
                      )}
                      <div className="vehicle-card-actions">
                        <button
                          type="button"
                          className="vehicle-card-edit-btn"
                          onClick={(e) => {
                            e.stopPropagation()
                            e.preventDefault()
                            startEditByPlate(p)
                          }}
                          title="Изменить номер/тонаж"
                        >
                          Изменить
                        </button>
                        {getUnpaidTripsForPlate(p).length > 0 && (
                          <button
                            type="button"
                            className="vehicle-card-payment-btn"
                            onClick={(e) => {
                              e.stopPropagation()
                              e.preventDefault()
                              startEditPayment(p)
                            }}
                            title="Оплата налом"
                          >
                            Оплата
                          </button>
                        )}
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {tripsThisShift.length > 0 && (
        <section className="shift-trips">
          <h3>
            Рейсы смены
            {activeTrips.length > 0 && (
              <span className="muted"> — на территории: {activeTrips.length}</span>
            )}
          </h3>
          <p className="muted small">Удалить рейс при ошибке</p>
          <ul className="trip-list">
            {[...tripsThisShift]
              .sort((a, b) => new Date(b.entryTime).getTime() - new Date(a.entryTime).getTime())
              .map((t) => renderTripItem(t, !t.exitTime))}
          </ul>
        </section>
      )}

      <p className="total-trips">
        Всего рейсов за смену: <strong>{totalTripsThisShift}</strong>
      </p>

      {(() => {
        const cashTrips = tripsThisShift.filter((t) => t.cashAmount != null)
        if (cashTrips.length === 0) return null
        const cashSum = cashTrips.reduce((s, t) => s + (t.cashAmount ?? 0), 0)
        return (
          <div className="payment-summary">
            <p className="payment-summary-item payment-summary-cash">
              Наличные: <strong>{cashSum.toLocaleString('ru-RU')} ₽</strong> за {cashTrips.length} {pluralize(cashTrips.length, ['рейс', 'рейса', 'рейсов'])}
            </p>
          </div>
        )
      })()}
    </div>
  )
}
