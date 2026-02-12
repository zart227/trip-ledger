import { supabase, isSupabaseConfigured } from './supabase'
import type { Trip } from '../types'
import * as db from './db'

const MAX_RETRIES = 3
const RETRY_DELAY_MS = 1500

function isRetryableNetworkError(e: unknown): boolean {
  const msg = String(e)
  return (
    msg.includes('Failed to fetch') ||
    msg.includes('ERR_HTTP2') ||
    msg.includes('NetworkError') ||
    msg.includes('Load failed')
  )
}

async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  let lastError: unknown
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      return await fn()
    } catch (e) {
      lastError = e
      if (attempt < MAX_RETRIES - 1 && isRetryableNetworkError(e)) {
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS))
        continue
      }
      throw e
    }
  }
  throw lastError
}

function toDbTrip(t: Trip) {
  return {
    id: t.id,
    plate_number: t.plateNumber,
    tonnage: t.tonnage,
    group_name: t.groupName,
    entry_time: t.entryTime,
    exit_time: t.exitTime,
    created_at: t.createdAt,
    updated_at: t.updatedAt ?? t.createdAt,
    payment_method: t.cashAmount != null ? 'cash' : null,
    amount: t.cashAmount ?? null,
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
  updated_at?: string | null
  payment_method?: string | null
  amount?: number | null
}): Trip {
  return {
    id: r.id,
    plateNumber: r.plate_number,
    tonnage: r.tonnage,
    groupName: r.group_name,
    entryTime: r.entry_time,
    exitTime: r.exit_time,
    createdAt: r.created_at,
    updatedAt: r.updated_at ?? r.created_at,
    cashAmount: typeof r.amount === 'number' && r.payment_method === 'cash' ? r.amount : undefined,
  }
}

export async function pushToSupabase(trips: Trip[]): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseConfigured() || !supabase) {
    return { ok: false, error: 'Supabase не настроен' }
  }

  try {
    await withRetry(async () => {
      const r = await supabase.from('trips').upsert(trips.map(toDbTrip), { onConflict: 'id' })
      if (r.error) throw r.error
    })
    return { ok: true }
  } catch (e) {
    console.error('[sync] ❌ pushToSupabase() failed:', e)
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
    const { data, error } = await withRetry(() => supabase.from('trips').select('*'))
    if (error) throw error
    const trips = (data ?? []).map(fromDbTrip)
    return { ok: true, trips }
  } catch (e) {
    console.error('[sync] ❌ pullFromSupabase() failed:', e)
    return { ok: false, error: String(e) }
  }
}

export async function deleteFromSupabase(ids: string[]): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseConfigured() || !supabase || ids.length === 0) {
    return { ok: true }
  }
  try {
    const { error } = await withRetry(() => supabase.from('trips').delete().in('id', ids))
    if (error) throw error
    return { ok: true }
  } catch (e) {
    console.error('[sync] ❌ deleteFromSupabase() failed:', e)
    return { ok: false, error: String(e) }
  }
}

const getUpdated = (t: Trip) => t.updatedAt ?? t.createdAt

function mergeTrips(local: Trip[], rem: Trip[]): Trip[] {
  const map = new Map<string, Trip>()
  for (const t of [...local, ...rem]) {
    const existing = map.get(t.id)
    if (!existing) {
      map.set(t.id, t)
    } else if (getUpdated(t) > getUpdated(existing)) {
      map.set(t.id, t)
    }
  }
  return Array.from(map.values())
}

/** Pull from Supabase and merge with local trips. Does not push or write. Used by autoPull to avoid overwriting local-only changes. */
export async function pullAndMergeWithLocal(localTrips: Trip[]): Promise<{
  ok: boolean
  trips?: Trip[]
  error?: string
}> {
  const pull = await pullFromSupabase()
  if (!pull.ok) return pull
  const remote = pull.trips ?? []
  const merged = mergeTrips(localTrips, remote)
  return { ok: true, trips: merged }
}

export async function syncWithSupabase(trips: Trip[]): Promise<{
  ok: boolean
  error?: string
  trips?: Trip[]
}> {
  const pull = await pullFromSupabase()
  if (!pull.ok) {
    const pushResult = await pushToSupabase(trips)
    return pushResult.ok ? { ok: true, trips } : pushResult
  }

  const remote = pull.trips ?? []

  // If local is empty, treat as "new device" — pull only, never touch remote
  if (trips.length === 0 && remote.length > 0) {
    for (const t of remote) await db.saveTrip(t)
    return { ok: true, trips: remote }
  }

  const merged = mergeTrips(trips, remote)
  const pushResult = await pushToSupabase(merged)
  if (!pushResult.ok) return pushResult

  // Re-read IDB: user may have added/updated trips while we were syncing — don't overwrite them
  const localNow = await db.getAllTrips()
  const final = mergeTrips(merged, localNow)
  for (const t of final) await db.saveTrip(t)
  return { ok: true, trips: final }
}
