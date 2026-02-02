import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'ru.tripledger.app',
  appName: 'TripLedger',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
}

export default config
