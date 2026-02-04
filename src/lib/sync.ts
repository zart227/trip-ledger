import { supabase, isSupabaseConfigured } from './supabase'
import type { Trip } from '../types'
import * as db from './db'

function toDbTrip(t: Trip) {
  return {
    id: t.id,
    plate_number: t.plateNumber,
    tonnage: t.tonnage,
    group_name: t.groupName,
    entry_time: t.entryTime,
    exit_time: t.exitTime,
    created_at: t.createdAt,
  }
}

function fromDbTrip(r: {
  id: string
  plate_number: string
  tonnage: number
  group_name: string | null
  entry_time: string
  exit_time: string | null
  created_at: string
}): Trip {
  return {
    id: r.id,
    plateNumber: r.plate_number,
    tonnage: r.tonnage,
    groupName: r.group_name,
    entryTime: r.entry_time,
    exitTime: r.exit_time,
    createdAt: r.created_at,
  }
}

export async function pushToSupabase(trips: Trip[]): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseConfigured() || !supabase) {
    return { ok: false, error: 'Supabase не настроен' }
  }

  try {
    await supabase.from('trips').upsert(trips.map(toDbTrip), { onConflict: 'id' })
    return { ok: true }
  } catch (e) {
    return { ok: false, error: String(e) }
  }
}

export async function pullFromSupabase(): Promise<{
  ok: boolean
  trips?: Trip[]
  error?: string
}> {
  if (!isSupabaseConfigured() || !supabase) {
    return { ok: false, error: 'Supabase не настроен' }
  }

  try {
    const { data, error } = await supabase.from('trips').select('*')
    if (error) throw error
    const trips = (data ?? []).map(fromDbTrip)
    return { ok: true, trips }
  } catch (e) {
    return { ok: false, error: String(e) }
  }
}

export async function deleteFromSupabase(ids: string[]): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseConfigured() || !supabase || ids.length === 0) {
    return { ok: true }
  }
  try {
    const { error } = await supabase.from('trips').delete().in('id', ids)
    if (error) throw error
    return { ok: true }
  } catch (e) {
    return { ok: false, error: String(e) }
  }
}

export async function syncWithSupabase(trips: Trip[]): Promise<{ ok: boolean; error?: string }> {
  const pull = await pullFromSupabase()
  if (!pull.ok) {
    return pushToSupabase(trips)
  }

  const remote = pull.trips ?? []
  const localIds = new Set(trips.map((t) => t.id))

  // If local is empty, treat as "new device" — pull only, never delete remote
  if (trips.length === 0 && remote.length > 0) {
    for (const t of remote) await db.saveTrip(t)
    return { ok: true }
  }
  const getCreated = (t: Trip) => t.createdAt

  const mergeTrips = (local: Trip[], rem: Trip[]): Trip[] => {
    const map = new Map<string, Trip>()
    for (const t of [...local, ...rem]) {
      const existing = map.get(t.id)
      if (!existing) {
        map.set(t.id, t)
      } else if (t.exitTime && !existing.exitTime) {
        map.set(t.id, t)
      } else if (getCreated(t) > getCreated(existing)) {
        map.set(t.id, t)
      }
    }
    return Array.from(map.values())
  }

  const merged = mergeTrips(trips, remote)
  const toDeleteIds = remote.filter((r) => !localIds.has(r.id)).map((r) => r.id)
  if (toDeleteIds.length > 0) {
    const delResult = await deleteFromSupabase(toDeleteIds)
    if (!delResult.ok) return delResult
  }

  const mergedFiltered = merged.filter((t) => !toDeleteIds.includes(t.id))
  const pushResult = await pushToSupabase(mergedFiltered)
  if (!pushResult.ok) return pushResult

  for (const t of mergedFiltered) await db.saveTrip(t)
  for (const id of toDeleteIds) await db.deleteTrip(id)

  return { ok: true }
}
