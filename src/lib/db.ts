import { openDB } from 'idb'
import type { Trip } from '../types'

const DB_NAME = 'trip-ledger-db'
const DB_VERSION = 2

export async function getDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion) {
      if (oldVersion < 2) {
        if (db.objectStoreNames.contains('vehicles')) db.deleteObjectStore('vehicles')
        if (db.objectStoreNames.contains('groups')) db.deleteObjectStore('groups')
        if (db.objectStoreNames.contains('trips')) db.deleteObjectStore('trips')
      }
      if (!db.objectStoreNames.contains('trips')) {
        const tripsStore = db.createObjectStore('trips', { keyPath: 'id' })
        tripsStore.createIndex('entryTime', 'entryTime')
        tripsStore.createIndex('plateNumber', 'plateNumber')
      }
    },
  })
}

export async function getAllTrips(): Promise<Trip[]> {
  const db = await getDB()
  return (await db.getAll('trips')) as Trip[]
}

export async function saveTrip(trip: Trip): Promise<void> {
  const db = await getDB()
  await db.put('trips', trip)
}

export async function deleteTrip(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('trips', id)
}

export async function replaceAllTrips(trips: Trip[]): Promise<void> {
  const database = await getDB()
  const tx = database.transaction('trips', 'readwrite')
  const store = tx.objectStore('trips')
  await store.clear()
  for (const t of trips) {
    await store.put(t)
  }
  await tx.done
}
