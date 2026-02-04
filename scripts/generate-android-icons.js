/**
 * Generates Android launcher icons from assets/icon.png
 * Adaptive icon foreground: full size, white/light-gray→transparent (background shows through)
 * Run: node scripts/generate-android-icons.js
 */
import { Jimp } from 'jimp'
import { mkdir, rm } from 'fs/promises'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const srcIcon = join(root, 'assets', 'icon.png')

// Remove white and light-gray (border) - threshold 220 keeps light-blue truck intact
const LIGHT_THRESHOLD = 220

const sizes = {
  'mipmap-mdpi': 48,
  'mipmap-hdpi': 72,
  'mipmap-xhdpi': 96,
  'mipmap-xxhdpi': 144,
  'mipmap-xxxhdpi': 192,
}

function makeLightPixelsTransparent(img) {
  img.scan(0, 0, img.bitmap.width, img.bitmap.height, function (x, y, idx) {
    const r = this.bitmap.data[idx]
    const g = this.bitmap.data[idx + 1]
    const b = this.bitmap.data[idx + 2]
    // White, near-white, light-gray → transparent (background #0f172a shows through)
    if (r >= LIGHT_THRESHOLD && g >= LIGHT_THRESHOLD && b >= LIGHT_THRESHOLD) {
      this.bitmap.data[idx + 3] = 0
    }
  })
}

async function main() {
  // Remove erroneous nested folder (trip-ledger/trip-ledger) if created by wrong path
  const erroneousDir = join(root, 'trip-ledger')
  try {
    await rm(erroneousDir, { recursive: true })
    console.log('Removed erroneous trip-ledger/ folder')
  } catch {
    /* folder does not exist, ignore */
  }

  const image = await Jimp.read(srcIcon)
  const resDir = join(root, 'android', 'app', 'src', 'main', 'res')

  for (const [folder, size] of Object.entries(sizes)) {
    const dir = join(resDir, folder)
    await mkdir(dir, { recursive: true })

    // Legacy icons: full size
    const resized = image.clone().resize({ w: size, h: size })
    await resized.write(join(dir, 'ic_launcher.png'))
    await resized.write(join(dir, 'ic_launcher_round.png'))

    // Adaptive icon foreground: full size, remove white/light border → transparent
    const foreground = image.clone().resize({ w: size, h: size })
    makeLightPixelsTransparent(foreground)
    await foreground.write(join(dir, 'ic_launcher_foreground.png'))
    console.log(`Generated ${folder}: ${size}x${size}`)
  }
  console.log('Done.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
