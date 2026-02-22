import { useState, useEffect, useCallback, useRef } from 'react'
import type { Trip } from '../types'
import * as db from '../lib/db'
import {
  syncWithSupabase,
  pullAndMergeWithLocal,
  deleteFromSupabase,
  pushToSupabase,
  subscribeToTripsRealtime,
} from '../lib/sync'
import { isSupabaseConfigured } from '../lib/supabase'

export function useData() {
  const [trips, setTrips] = useState<Trip[]>([])
  const [loading, setLoading] = useState(true)
  const setTripsRef = useRef(setTrips)
  setTripsRef.current = setTrips

  const load = useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) setLoading(true)
    const t = await db.getAllTrips()
    setTripsRef.current(t)
    if (!options?.silent) setLoading(false)
  }, [])

  /** Один раз при монтировании: полная синхронизация с сервером, затем подписка на Realtime. */
  const runInitialSync = useCallback(async () => {
    if (!isSupabaseConfigured()) return
    const t = await db.getAllTrips()
    const result = await syncWithSupabase(t)
    if (result.ok && result.trips) {
      setTripsRef.current(result.trips)
    } else if (result.ok) {
      await load({ silent: true })
    }
  }, [load])

  useEffect(() => {
    let unsubscribeRealtime: (() => void) | null = null

    ;(async () => {
      await load()
      if (!isSupabaseConfigured()) return

      await runInitialSync()

      unsubscribeRealtime = subscribeToTripsRealtime({
        onInsert(trip) {
          db.saveTrip(trip).catch((e) => console.error('Realtime onInsert saveTrip:', e))
          setTripsRef.current((prev) =>
            prev.some((x) => x.id === trip.id) ? prev : [...prev, trip]
          )
        },
        onUpdate(trip) {
          db.saveTrip(trip).catch((e) => console.error('Realtime onUpdate saveTrip:', e))
          setTripsRef.current((prev) =>
            prev.map((x) => (x.id === trip.id ? trip : x))
          )
        },
        onDelete(id) {
          db.deleteTrip(id).catch((e) => console.error('Realtime onDelete deleteTrip:', e))
          setTripsRef.current((prev) => prev.filter((x) => x.id !== id))
        },
      })
    })().catch((err) => console.error('Initial load/sync failed:', err))

    return () => {
      if (unsubscribeRealtime) unsubscribeRealtime()
    }
  }, [load, runInitialSync])

  // При возврате на вкладку — один раз подтянуть изменения (офлайн мог быть долго)
  useEffect(() => {
    if (!isSupabaseConfigured()) return
    const onVisibilityChange = () => {
      if (document.visibilityState !== 'visible') return
      ;(async () => {
        const local = await db.getAllTrips()
        const result = await pullAndMergeWithLocal(local)
        if (result.ok && result.trips) {
          await db.replaceAllTrips(result.trips)
          setTripsRef.current(result.trips)
        }
      })().catch((e) => console.error('Visibility sync failed:', e))
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => document.removeEventListener('visibilitychange', onVisibilityChange)
  }, [])

  useEffect(() => {
    if (!isSupabaseConfigured()) return
    const onOnline = () => {
      runInitialSync().catch((err) => console.error('Sync on online failed:', err))
    }
    window.addEventListener('online', onOnline)
    return () => window.removeEventListener('online', onOnline)
  }, [runInitialSync])

  const recordEntry = useCallback(
    async (plateNumber: string, tonnage: number, groupName: string | null = null) => {
      const now = new Date().toISOString()
      const t: Trip = {
        id: crypto.randomUUID(),
        plateNumber: plateNumber.trim(),
        tonnage: Number(tonnage) || 0,
        groupName: groupName?.trim() || null,
        entryTime: now,
        exitTime: null,
        createdAt: now,
        updatedAt: now,
      }
      await db.saveTrip(t)
      setTrips((prev) => [...prev, t])
      if (isSupabaseConfigured()) {
        pushToSupabase([t]).catch((e) => console.error('Push new trip failed:', e))
      }
      return t
    },
    []
  )

  const recordExit = useCallback(async (tripId: string) => {
    const trip = trips.find((t) => t.id === tripId)
    if (!trip) return
    const now = new Date().toISOString()
    const updated: Trip = { ...trip, exitTime: now, updatedAt: now }
    await db.saveTrip(updated)
    setTrips((prev) => prev.map((t) => (t.id === tripId ? updated : t)))
    if (isSupabaseConfigured()) {
      pushToSupabase([updated]).catch((e) => console.error('Push exit failed:', e))
    }
  }, [trips])

  const updateTrip = useCallback(async (trip: Trip) => {
    const updated = { ...trip, updatedAt: new Date().toISOString() }
    await db.saveTrip(updated)
    setTrips((prev) => prev.map((t) => (t.id === trip.id ? updated : t)))
    if (isSupabaseConfigured()) {
      pushToSupabase([updated]).catch((e) => console.error('Push update failed:', e))
    }
  }, [])

  const updateTrips = useCallback(async (tripsToUpdate: Trip[]) => {
    const now = new Date().toISOString()
    const updated = tripsToUpdate.map((t) => ({ ...t, updatedAt: now }))
    for (const trip of updated) await db.saveTrip(trip)
    setTrips((prev) =>
      prev.map((t) => updated.find((u) => u.id === t.id) ?? t)
    )
    if (isSupabaseConfigured()) {
      pushToSupabase(updated).catch((e) => console.error('Push updates failed:', e))
    }
  }, [])

  const deleteTrip = useCallback(async (tripId: string) => {
    await db.deleteTrip(tripId)
    setTrips((prev) => prev.filter((t) => t.id !== tripId))
    if (isSupabaseConfigured()) {
      deleteFromSupabase([tripId]).catch((e) =>
        console.error('Delete from Supabase failed:', e)
      )
    }
  }, [])

  const sync = useCallback(async () => {
    const t = await db.getAllTrips()
    const result = await syncWithSupabase(t)
    if (result.ok && result.trips) {
      setTrips(result.trips)
    } else if (result.ok) {
      await load({ silent: true })
    }
    return result
  }, [load])

  const pull = useCallback(async () => {
    const local = await db.getAllTrips()
    const result = await pullAndMergeWithLocal(local)
    if (result.ok && result.trips) {
      await db.replaceAllTrips(result.trips)
      setTrips(result.trips)
    }
    return result
  }, [])

  return {
    trips,
    loading,
    load,
    recordEntry,
    recordExit,
    updateTrip,
    updateTrips,
    deleteTrip,
    sync,
    pull,
  }
}
