import { useState, useRef, useEffect } from 'react'
import { useData } from '../hooks/useData'
import { getShiftBounds, getCurrentShiftDate } from '../lib/export'
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
  const inputRef = useRef<HTMLInputElement>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)
  const groupInputRef = useRef<HTMLInputElement>(null)
  const groupSuggestionsRef = useRef<HTMLDivElement>(null)
  const editGroupInputRef = useRef<HTMLInputElement>(null)
  const editGroupSuggestionsRef = useRef<HTMLDivElement>(null)

  const shiftDate = getCurrentShiftDate()
  const { start } = getShiftBounds(shiftDate)
  const tripsThisShift = trips.filter((t) => new Date(t.entryTime) >= start)
  const recentPlates = [...new Set(tripsThisShift.map((t) => t.plateNumber))].slice(0, 12)
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
    inputRef.current?.focus()
  }

  const applyGroupSuggestion = (g: string) => {
    setGroupName(g)
    setShowGroupSuggestions(false)
    groupInputRef.current?.focus()
  }

  const applyEditGroupSuggestion = (g: string) => {
    setEditGroup(g)
    setShowEditGroupSuggestions(false)
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

  const renderTripItem = (t: Trip, isActive: boolean) => (
    <li key={t.id} className="trip-item">
      <span className="plate">{t.plateNumber}</span>
      <span className="muted">{t.tonnage} т</span>
      {t.groupName && <span className="badge">{t.groupName}</span>}
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
              onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
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
                    onClick={() => applySuggestion(p)}
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
              onFocus={() => groupSuggestions.length > 0 && setShowGroupSuggestions(true)}
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
                    onClick={() => applyGroupSuggestion(g)}
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
          <p className="muted small">Клик по карточке — въезд/выезд, кнопка «Изменить» — номер/тонаж</p>
          {sortedGroups.map((groupName) => (
            <div key={groupName} className="vehicle-group">
              <h4 className="group-title">{groupName}</h4>
              <div className="vehicle-grid">
                {platesByGroup.get(groupName)!.map((p) =>
                  editingPlate === p ? (
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
                          onFocus={() => editGroupSuggestions.length > 0 && setShowEditGroupSuggestions(true)}
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
                                onClick={() => applyEditGroupSuggestion(g)}
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
                      <span className="trip-count">{plateToTripCount.get(p) ?? 0} рейсов</span>
                      {platesOnTerritory.has(p) && (
                        <span className="vehicle-card-territory-badge">На территории</span>
                      )}
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
          {(() => {
            const sorted = [...tripsThisShift].sort((a, b) => new Date(b.entryTime).getTime() - new Date(a.entryTime).getTime())
            const tripsByGroup = new Map<string, Trip[]>()
            for (const t of sorted) {
              const g = t.groupName || 'Без группы'
              if (!tripsByGroup.has(g)) tripsByGroup.set(g, [])
              tripsByGroup.get(g)!.push(t)
            }
            const tripGroupNames = [...tripsByGroup.keys()].sort((a, b) => {
              if (a === 'Без группы') return 1
              if (b === 'Без группы') return -1
              return a.localeCompare(b)
            })
            return tripGroupNames.map((g) => (
              <div key={g} className="trip-group">
                <h4 className="group-title">{g}</h4>
                <ul className="trip-list">
                  {tripsByGroup.get(g)!.map((t) => renderTripItem(t, !t.exitTime))}
                </ul>
              </div>
            ))
          })()}
        </section>
      )}

      <p className="total-trips">
        Всего рейсов за смену: <strong>{totalTripsThisShift}</strong>
      </p>
    </div>
  )
}
