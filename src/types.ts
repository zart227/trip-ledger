export interface Trip {
  id: string
  plateNumber: string
  tonnage: number
  groupName: string | null
  entryTime: string
  exitTime: string | null
  createdAt: string
}

export interface ExportData {
  version: 2
  exportedAt: string
  trips: Trip[]
}
