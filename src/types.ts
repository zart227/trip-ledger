export interface Trip {
  id: string
  plateNumber: string
  tonnage: number
  groupName: string | null
  entryTime: string
  exitTime: string | null
  createdAt: string
  updatedAt?: string
  /** Оплата налом: сумма в рублях */
  cashAmount?: number
}

export interface ExportData {
  version: 2
  exportedAt: string
  trips: Trip[]
}
