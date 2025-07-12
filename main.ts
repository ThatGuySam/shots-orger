#!/usr/bin/env bun

import { existsSync } from 'node:fs'
import { mkdir, readdir, rename, stat } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import process from 'node:process'
import { assert } from '@sindresorhus/is'
import { z } from 'zod'

/**
 * Screenshot/Recording file organizer
 * Organizes files according to the pattern:
 * - 2020-2023: _YEAR/MM MonthName/
 * - 2024+: MM MonthName/
 */

// Zod schemas for validation and type safety
const FilenameSchema = z.string().min(1, 'filename cannot be empty').brand('Filename')
type Filename = z.infer<typeof FilenameSchema>

const ParsedDateSchema = z.object({
  year: z.number().int().min(2020),
  month: z.number().int().min(1).max(12),
  day: z.number().int().min(1).max(31),
})

const NonEmptyStringSchema = z.string().min(1, 'string cannot be empty').brand('NonEmptyString')
type NonEmptyString = z.infer<typeof NonEmptyStringSchema>

const DirectoryPathSchema = NonEmptyStringSchema.min(1, 'directory path cannot be empty').brand('DirPath')
type DirPath = z.infer<typeof DirectoryPathSchema>

const OrganizeResultsSchema = z.object({
  processed: z.number().int().nonnegative(),
  skipped: z.number().int().nonnegative(),
})

const ProcessArgvSchema = z.array(z.string()).min(2, 'process.argv must have at least 2 elements')

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

type ParsedDate = z.infer<typeof ParsedDateSchema>

/**
 * Parse date from various filename patterns
 */
function parseFileDate(rawFilename: string): ParsedDate | null {
  // Validate filename using Zod (for type safety and assertions)
  const filename: Filename = FilenameSchema.parse(rawFilename)

  // Pattern 1: Screenshot 2025-MM-DD at H.MM.SS AM.png
  // Pattern 2: Screen Recording 2025-MM-DD at H.MM.SS AM.mov
  const standardPattern = /(?:Screenshot|Screen Recording) (\d{4})-(\d{2})-(\d{2}) at/

  // Pattern 3: 2025-MM-DD_HH-MM-SS.mov
  const timestampPattern = /^(\d{4})-(\d{2})-(\d{2})_/

  // Pattern 4: Simulator Screenshot - Device - 2025-MM-DD at HH.MM.SS.png
  const simulatorPattern = /Simulator Screenshot.*?(\d{4})-(\d{2})-(\d{2}) at/

  /** Matching filename pattern */
  const match = filename.match(standardPattern)
    || filename.match(timestampPattern)
    || filename.match(simulatorPattern)

  if (!match) {
    return null
  }

  // Assert positive space - match found should have required groups
  assert.nonEmptyArray(match, 'match should be an array')
  assert.inRange(match.length, [4, Infinity], 'match should have at least 4 groups')

  const [, yearStr, monthStr, dayStr] = match

  // Assert extracted strings are valid
  assert.nonEmptyString(yearStr, 'year string cannot be empty')
  assert.nonEmptyString(monthStr, 'month string cannot be empty')
  assert.nonEmptyString(dayStr, 'day string cannot be empty')

  const year: number = Number.parseInt(yearStr, 10)
  const month: number = Number.parseInt(monthStr, 10)
  const day: number = Number.parseInt(dayStr, 10)

  // Use Zod to validate and return typed result
  return ParsedDateSchema.parse({ year, month, day })
}

/**
 * Get target directory path for a file based on its date
 */
function getTargetPath(baseDir: string, date: ParsedDate): string {
  // Validate arguments using Zod
  const validatedBaseDir: DirPath = DirectoryPathSchema.parse(baseDir)
  const validatedDate = ParsedDateSchema.parse(date)

  const monthName: NonEmptyString = NonEmptyStringSchema
    .parse(MONTH_NAMES[validatedDate.month - 1])

  let result: string

  // Files from 2020-2023 go into _YEAR folders
  if (validatedDate.year >= 2020 && validatedDate.year <= 2023) {
    result = join(validatedBaseDir, `_${validatedDate.year}`, monthName)
  }
  else {
    // Current years (2024+) go into month folders at root
    result = join(validatedBaseDir, monthName)
  }

  // Assert postcondition - return value contains expected parts
  assert.truthy(result.includes(monthName), 'result must contain month name')

  return result
}

/**
 * Check if file should be organized (is a screenshot/recording)
 */
function shouldOrganizeFile(rawFilename: string): boolean {
  // Validate filename using Zod
  const validatedFilename: Filename = FilenameSchema.parse(rawFilename)

  const lowerName = validatedFilename.toLowerCase()

  // Screenshot and screen recording files
  const isScreenCapture = lowerName.includes('screenshot')
    || lowerName.includes('screen recording')
    || lowerName.includes('simulator screenshot')

  // Common media extensions
  const hasMediaExtension = /\.(?:png|jpg|jpeg|mov|mp4|gif)$/i.test(validatedFilename)

  // Timestamp pattern files
  const hasTimestampPattern = /^\d{4}-\d{2}-\d{2}_/.test(validatedFilename)

  const result = (isScreenCapture && hasMediaExtension) || hasTimestampPattern

  return result
}

/**
 * Ensure directory exists, create if it doesn't
 */
async function ensureDir(dirPath: string): Promise<void> {
  // Validate directory path using Zod
  const validatedDirPath: DirPath = DirectoryPathSchema.parse(dirPath)

  const dirExists = existsSync(validatedDirPath)

  if (!dirExists) {
    await mkdir(validatedDirPath, { recursive: true })
    console.log(`📁 Created directory: ${validatedDirPath}`)

    // Assert postcondition - directory should exist after creation
    assert.truthy(existsSync(validatedDirPath), 'Directory must exist after creation')
  }
}

/**
 * Organize files recursively - returns counts for aggregation
 */
async function organizeFiles(targetDir: string, rootDir?: string): Promise<{ processed: number, skipped: number }> {
  // Validate target directory using Zod
  const validatedTargetDir: DirPath = DirectoryPathSchema.parse(targetDir)

  const resolvedDir = resolve(validatedTargetDir)
  const actualRootDir = rootDir || resolvedDir

  try {
    const files = await readdir(resolvedDir)

    // Assert directory reading result
    assert.array(files, undefined, 'files must be an array')

    let totalProcessedCount = 0
    let totalSkippedCount = 0

    for (const filename of files) {
      // Validate filename using Zod
      const validatedFilename = FilenameSchema.parse(filename)

      const fullPath = join(resolvedDir, validatedFilename)
      const fileStat = await stat(fullPath)

      // Assert file stat result - Stats object has the methods we need
      assert.truthy(fileStat, 'fileStat must exist')
      assert.function(fileStat.isDirectory, 'fileStat.isDirectory must be a function')
      assert.function(fileStat.isFile, 'fileStat.isFile must be a function')

      // Handle directories recursively
      if (fileStat.isDirectory()) {
        console.log(`📂 Recursively processing directory: ${fullPath.replace(`${actualRootDir}/`, '')}`)

        // Recursively process subdirectory
        const subResults = await organizeFiles(fullPath, actualRootDir)

        // Validate recursive results using Zod
        const validatedSubResults = OrganizeResultsSchema.parse(subResults)

        // Accumulate counts from recursive processing
        totalProcessedCount += validatedSubResults.processed
        totalSkippedCount += validatedSubResults.skipped
        continue
      }

      // Skip files that shouldn't be organized
      if (!shouldOrganizeFile(validatedFilename)) {
        totalSkippedCount++
        continue
      }

      // Parse date from filename
      const date = parseFileDate(validatedFilename)
      if (!date) {
        console.log(`⚠️  Could not parse date from: ${validatedFilename}`)
        totalSkippedCount++
        continue
      }

      // Get target directory (relative to root, not current subdirectory)
      const targetPath = getTargetPath(actualRootDir, date)
      const targetFile = join(targetPath, validatedFilename)

      // Skip if file is already in the right place
      if (dirname(fullPath) === targetPath) {
        totalSkippedCount++
        continue
      }

      // Ensure target directory exists
      await ensureDir(targetPath)

      // Check if target file already exists to avoid overwriting
      if (existsSync(targetFile)) {
        console.log(`⚠️  Skipped ${validatedFilename}: target already exists at ${targetPath.replace(`${actualRootDir}/`, '')}`)
        totalSkippedCount++
        continue
      }

      // Move file
      try {
        await rename(fullPath, targetFile)
        console.log(`📁 ${validatedFilename} → ${targetPath.replace(`${actualRootDir}/`, '')}`)
        totalProcessedCount++
      }
      catch (error) {
        console.error(`❌ Failed to move ${validatedFilename}:`, error)
        totalSkippedCount++
      }
    }

    const result = { processed: totalProcessedCount, skipped: totalSkippedCount }

    // Validate and return results using Zod for type safety
    return OrganizeResultsSchema.parse(result)
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
  // Validate process.argv using Zod
  const validatedArgv = ProcessArgvSchema.parse(process.argv)

  const targetDir = validatedArgv[2]

  if (!targetDir) {
    console.error('❌ Usage: bun main.ts ./path/to/dir')
    console.error('')
    console.error('📖 This script organizes screenshot and recording files into:')
    console.error('   • 2020-2023: _YEAR/MM MonthName/')
    console.error('   • 2024+: MM MonthName/')
    process.exit(1)
  }

  // Validate target directory using Zod
  const validatedTargetDir: DirPath = DirectoryPathSchema.parse(targetDir)
  const resolvedDir = resolve(validatedTargetDir)

  const dirExists = existsSync(resolvedDir)

  if (!dirExists) {
    console.error(`❌ Directory does not exist: ${resolvedDir}`)
    process.exit(1)
  }

  console.log(`📂 Organizing files recursively in: ${resolvedDir}`)
  console.log('')

  const results = await organizeFiles(resolvedDir)

  // Validate results using Zod
  const validatedResults = OrganizeResultsSchema.parse(results)

  // Display final summary
  console.log(`\n✅ Recursive organization complete!`)
  console.log(`📁 Total processed: ${validatedResults.processed} files`)
  console.log(`⏭️  Total skipped: ${validatedResults.skipped} files`)

  const totalFiles = validatedResults.processed + validatedResults.skipped
  console.log(`📊 Total files examined: ${totalFiles}`)
}

// Run if called directly
main().catch(console.error)
