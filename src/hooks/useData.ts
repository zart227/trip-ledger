import { useState, useEffect, useCallback } from 'react'
import type { Trip } from '../types'
import * as db from '../lib/db'
import { syncWithSupabase, pullFromSupabase } from '../lib/sync'
import { isSupabaseConfigured } from '../lib/supabase'

export function useData() {
  const [trips, setTrips] = useState<Trip[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const t = await db.getAllTrips()
    setTrips(t)
    setLoading(false)
  }, [])

  const autoSync = useCallback(async () => {
    if (!isSupabaseConfigured()) return
    const t = await db.getAllTrips()
    await syncWithSupabase(t)
    await load()
  }, [load])

  useEffect(() => {
    ;(async () => {
      await load()
      if (isSupabaseConfigured()) {
        await autoSync()
      }
    })().catch((err) => console.error('Initial sync failed:', err))
  }, [load, autoSync])

  const autoPull = useCallback(async () => {
    if (!isSupabaseConfigured()) return
    const result = await pullFromSupabase()
    if (result.ok && result.trips) {
      await db.replaceAllTrips(result.trips)
      await load()
    }
  }, [load])

  useEffect(() => {
    if (!isSupabaseConfigured()) return
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        autoPull()
      }
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
    const onOnline = () => {
      autoSync().catch((err) => console.error('Sync on online failed:', err))
    }
    window.addEventListener('online', onOnline)
    return () => window.removeEventListener('online', onOnline)
  }, [autoSync])

  const recordEntry = useCallback(
    async (plateNumber: string, tonnage: number, groupName: string | null = null) => {
      const t: Trip = {
        id: crypto.randomUUID(),
        plateNumber: plateNumber.trim(),
        tonnage: Number(tonnage) || 0,
        groupName: groupName?.trim() || null,
        entryTime: new Date().toISOString(),
        exitTime: null,
        createdAt: new Date().toISOString(),
      }
      await db.saveTrip(t)
      setTrips((prev) => [...prev, t])
      if (isSupabaseConfigured()) {
        autoSync().catch((err) => console.error('Sync after entry failed:', err))
      }
      return t
    },
    [autoSync]
  )

  const recordExit = useCallback(async (tripId: string) => {
    const trip = trips.find((t) => t.id === tripId)
    if (!trip) return
    const updated: Trip = { ...trip, exitTime: new Date().toISOString() }
    await db.saveTrip(updated)
    setTrips((prev) => prev.map((t) => (t.id === tripId ? updated : t)))
    if (isSupabaseConfigured()) {
      autoSync().catch((err) => console.error('Sync after exit failed:', err))
    }
  }, [trips, autoSync])

  const updateTrip = useCallback(async (trip: Trip) => {
    await db.saveTrip(trip)
    setTrips((prev) => prev.map((t) => (t.id === trip.id ? trip : t)))
    if (isSupabaseConfigured()) {
      autoSync().catch((err) => console.error('Sync after updateTrip failed:', err))
    }
  }, [autoSync])

  const updateTrips = useCallback(async (tripsToUpdate: Trip[]) => {
    for (const trip of tripsToUpdate) await db.saveTrip(trip)
    setTrips((prev) =>
      prev.map((t) => tripsToUpdate.find((u) => u.id === t.id) ?? t)
    )
    if (isSupabaseConfigured()) {
      autoSync().catch((err) => console.error('Sync after updateTrips failed:', err))
    }
  }, [autoSync])

  const deleteTrip = useCallback(async (tripId: string) => {
    await db.deleteTrip(tripId)
    setTrips((prev) => prev.filter((t) => t.id !== tripId))
    if (isSupabaseConfigured()) {
      autoSync().catch((err) => console.error('Sync after deleteTrip failed:', err))
    }
  }, [autoSync])

  const sync = useCallback(async () => {
    const result = await syncWithSupabase(trips)
    if (result.ok) await load()
    return result
  }, [trips, load])

  const pull = useCallback(async () => {
    const result = await pullFromSupabase()
    if (result.ok && result.trips) {
      await db.replaceAllTrips(result.trips)
      await load()
    }
    return result
  }, [load])

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
