import { useState, useEffect, useCallback, useRef } from 'react'
import type { Trip } from '../types'
import * as db from '../lib/db'
import { syncWithSupabase, pullAndMergeWithLocal, deleteFromSupabase } from '../lib/sync'
import { isSupabaseConfigured } from '../lib/supabase'

const SYNC_DEBOUNCE_MS = 400
const DEBUG = false // set true to trace setTrips/sync order
const log = (msg: string, extra?: Record<string, unknown>) => {
  if (DEBUG) console.log(`[useData] ${msg}`, extra ?? '')
}

export function useData() {
  const [trips, setTrips] = useState<Trip[]>([])
  const [loading, setLoading] = useState(true)
  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const load = useCallback(async (options?: { silent?: boolean }) => {
    log('load() start', { silent: options?.silent })
    if (!options?.silent) setLoading(true)
    const t = await db.getAllTrips()
    setTrips(t)
    log('load() setTrips', { count: t.length })
    if (!options?.silent) setLoading(false)
  }, [])

  const runSync = useCallback(async () => {
    if (!isSupabaseConfigured()) return
    log('runSync() start')
    const t = await db.getAllTrips()
    const result = await syncWithSupabase(t)
    log('runSync() result', { ok: result.ok, tripsCount: result.trips?.length })
    if (result.ok && result.trips) {
      setTrips(result.trips)
      log('runSync() setTrips(merged)', { count: result.trips.length })
    } else if (result.ok) {
      await load({ silent: true })
    }
  }, [load])

  const autoSync = useCallback(() => {
    if (!isSupabaseConfigured()) return
    if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current)
    log('autoSync() schedule', { ms: SYNC_DEBOUNCE_MS })
    syncTimeoutRef.current = setTimeout(() => {
      syncTimeoutRef.current = null
      runSync().catch((err) => console.error('AutoSync failed:', err))
    }, SYNC_DEBOUNCE_MS)
  }, [runSync])

  useEffect(() => {
    ;(async () => {
      await load()
      if (isSupabaseConfigured()) await runSync()
    })().catch((err) => console.error('Initial sync failed:', err))
  }, [load, runSync])

  const autoPull = useCallback(async () => {
    if (!isSupabaseConfigured()) return
    log('autoPull() start')
    const local = await db.getAllTrips()
    const result = await pullAndMergeWithLocal(local)
    if (result.ok && result.trips) {
      await db.replaceAllTrips(result.trips)
      setTrips(result.trips)
      log('autoPull() setTrips', { count: result.trips.length })
    }
  }, [])

  useEffect(() => {
    if (!isSupabaseConfigured()) return
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') autoPull()
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => document.removeEventListener('visibilitychange', onVisibilityChange)
  }, [autoPull])

  useEffect(() => {
    if (!isSupabaseConfigured()) return
    const interval = setInterval(autoPull, 60 * 1000)
    return () => clearInterval(interval)
  }, [autoPull])

  useEffect(() => {
    if (!isSupabaseConfigured()) return
    const onOnline = () => runSync().catch((err) => console.error('Sync on online failed:', err))
    window.addEventListener('online', onOnline)
    return () => window.removeEventListener('online', onOnline)
  }, [runSync])

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
      setTrips((prev) => {
        const next = [...prev, t]
        log('recordEntry setTrips', { count: next.length })
        return next
      })
      if (isSupabaseConfigured()) autoSync()
      return t
    },
    [autoSync]
  )

  const recordExit = useCallback(async (tripId: string) => {
    const trip = trips.find((t) => t.id === tripId)
    if (!trip) return
    const now = new Date().toISOString()
    const updated: Trip = { ...trip, exitTime: now, updatedAt: now }
    await db.saveTrip(updated)
    setTrips((prev) => {
      const next = prev.map((t) => (t.id === tripId ? updated : t))
      log('recordExit setTrips', { count: next.length })
      return next
    })
    if (isSupabaseConfigured()) autoSync()
  }, [trips, autoSync])

  const updateTrip = useCallback(async (trip: Trip) => {
    const updated = { ...trip, updatedAt: new Date().toISOString() }
    await db.saveTrip(updated)
    setTrips((prev) => {
      const next = prev.map((t) => (t.id === trip.id ? updated : t))
      log('updateTrip setTrips', { count: next.length })
      return next
    })
    if (isSupabaseConfigured()) autoSync()
  }, [autoSync])

  const updateTrips = useCallback(async (tripsToUpdate: Trip[]) => {
    const now = new Date().toISOString()
    const updated = tripsToUpdate.map(t => ({ ...t, updatedAt: now }))
    for (const trip of updated) await db.saveTrip(trip)
    setTrips((prev) => {
      const next = prev.map((t) => updated.find((u) => u.id === t.id) ?? t)
      log('updateTrips setTrips', { count: next.length })
      return next
    })
    if (isSupabaseConfigured()) autoSync()
  }, [autoSync])

  const deleteTrip = useCallback(async (tripId: string) => {
    await db.deleteTrip(tripId)
    setTrips((prev) => prev.filter((t) => t.id !== tripId))
    if (isSupabaseConfigured()) {
      deleteFromSupabase([tripId]).catch((err) =>
        console.error('Delete from Supabase failed:', err)
      )
    }
  }, [])

  const sync = useCallback(async () => {
    log('sync() start')
    const result = await syncWithSupabase(trips)
    if (result.ok && result.trips) {
      setTrips(result.trips)
      log('sync() setTrips', { count: result.trips.length })
    } else if (result.ok) {
      await load({ silent: true })
    }
    return result
  }, [trips, load])

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
