#!/usr/bin/env bun

import { existsSync } from 'node:fs'
import { mkdir, readdir, rename, stat } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import process from 'node:process'

/**
 * Screenshot/Recording file organizer
 * Organizes files according to the pattern:
 * - 2020-2023: _YEAR/MM MonthName/
 * - 2024+: MM MonthName/
 */

// Month names mapping to match existing structure
const MONTH_NAMES = [
  '01 January',
  '02 February',
  '03 March',
  '04 April',
  '05 May',
  '06 June',
  '07 July',
  '08 August',
  '09 September',
  '10 October',
  '11 November',
  '12 December',
]

interface ParsedDate {
  year: number
  month: number
  day: number
}

/**
 * Parse date from various filename patterns
 */
function parseFileDate(filename: string): ParsedDate | null {
  // Pattern 1: Screenshot 2025-MM-DD at H.MM.SS AM.png
  // Pattern 2: Screen Recording 2025-MM-DD at H.MM.SS AM.mov
  const standardPattern = /(?:Screenshot|Screen Recording) (\d{4})-(\d{2})-(\d{2}) at/

  // Pattern 3: 2025-MM-DD_HH-MM-SS.mov
  const timestampPattern = /^(\d{4})-(\d{2})-(\d{2})_/

  // Pattern 4: Simulator Screenshot - Device - 2025-MM-DD at HH.MM.SS.png
  const simulatorPattern = /Simulator Screenshot.*?(\d{4})-(\d{2})-(\d{2}) at/

  const match = filename.match(standardPattern)
    || filename.match(timestampPattern)
    || filename.match(simulatorPattern)

  if (!match)
    return null

  const [, yearStr, monthStr, dayStr] = match
  const year = Number.parseInt(yearStr, 10)
  const month = Number.parseInt(monthStr, 10)
  const day = Number.parseInt(dayStr, 10)

  if (year < 2020 || year > 2030 || month < 1 || month > 12 || day < 1 || day > 31) {
    return null
  }

  return { year, month, day }
}

/**
 * Get target directory path for a file based on its date
 */
function getTargetPath(baseDir: string, date: ParsedDate): string {
  const monthName = MONTH_NAMES[date.month - 1]

  // Files from 2020-2023 go into _YEAR folders
  if (date.year >= 2020 && date.year <= 2023) {
    return join(baseDir, `_${date.year}`, monthName)
  }

  // Files from 2024+ go into month folders at root
  return join(baseDir, monthName)
}

/**
 * Check if file should be organized (is a screenshot/recording)
 */
function shouldOrganizeFile(filename: string): boolean {
  const lowerName = filename.toLowerCase()

  // Screenshot and screen recording files
  const isScreenCapture = lowerName.includes('screenshot')
    || lowerName.includes('screen recording')
    || lowerName.includes('simulator screenshot')

  // Common media extensions
  const hasMediaExtension = /\.(?:png|jpg|jpeg|mov|mp4|gif)$/i.test(filename)

  // Timestamp pattern files
  const hasTimestampPattern = /^\d{4}-\d{2}-\d{2}_/.test(filename)

  return (isScreenCapture && hasMediaExtension) || hasTimestampPattern
}

/**
 * Ensure directory exists, create if it doesn't
 */
async function ensureDir(dirPath: string): Promise<void> {
  if (!existsSync(dirPath)) {
    await mkdir(dirPath, { recursive: true })
    console.log(`📁 Created directory: ${dirPath}`)
  }
}

/**
 * Main organization function
 */
async function organizeFiles(targetDir: string): Promise<void> {
  const resolvedDir = resolve(targetDir)

  try {
    const files = await readdir(resolvedDir)
    let processedCount = 0
    let skippedCount = 0

    for (const filename of files) {
      const fullPath = join(resolvedDir, filename)
      const fileStat = await stat(fullPath)

      // Skip directories
      if (fileStat.isDirectory()) {
        continue
      }

      // Skip files that shouldn't be organized
      if (!shouldOrganizeFile(filename)) {
        skippedCount++
        continue
      }

      // Parse date from filename
      const date = parseFileDate(filename)
      if (!date) {
        console.log(`⚠️  Could not parse date from: ${filename}`)
        skippedCount++
        continue
      }

      // Get target directory
      const targetPath = getTargetPath(resolvedDir, date)
      const targetFile = join(targetPath, filename)

      // Skip if file is already in the right place
      if (dirname(fullPath) === targetPath) {
        skippedCount++
        continue
      }

      // Ensure target directory exists
      await ensureDir(targetPath)

      // Move file
      try {
        await rename(fullPath, targetFile)
        console.log(`📁 ${filename} → ${targetPath.replace(`${resolvedDir}/`, '')}`)
        processedCount++
      }
      catch (error) {
        console.error(`❌ Failed to move ${filename}:`, error)
      }
    }

    console.log(`\n✅ Organization complete!`)
    console.log(`📁 Processed: ${processedCount} files`)
    console.log(`⏭️  Skipped: ${skippedCount} files`)
  }
  catch (error) {
    console.error('❌ Error reading directory:', error)
    process.exit(1)
  }
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  const targetDir = process.argv[2]

  if (!targetDir) {
    console.error('❌ Usage: bun main.ts ./path/to/dir')
    console.error('')
    console.error('📖 This script organizes screenshot and recording files into:')
    console.error('   • 2020-2023: _YEAR/MM MonthName/')
    console.error('   • 2024+: MM MonthName/')
    process.exit(1)
  }

  const resolvedDir = resolve(targetDir)

  if (!existsSync(resolvedDir)) {
    console.error(`❌ Directory does not exist: ${resolvedDir}`)
    process.exit(1)
  }

  console.log(`📂 Organizing files in: ${resolvedDir}`)
  console.log('')

  await organizeFiles(resolvedDir)
}

// Run if called directly
main().catch(console.error)
