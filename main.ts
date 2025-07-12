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
 * Based on file creation date, not filename parsing
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
 * Get date from file creation time
 */
function getFileDateFromCreationTime(fileStat: import('fs').Stats): ParsedDate {
  const creationDate = fileStat.birthtime || fileStat.mtime
  const year = creationDate.getFullYear()
  const month = creationDate.getMonth() + 1 // JS months are 0-based
  const day = creationDate.getDate()

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
function shouldOrganizeFile(filename: string): boolean {
  // Validate filename using Zod
  const validatedFilename: Filename = FilenameSchema.parse(filename)

  const lowerName = validatedFilename.toLowerCase()

  // Screenshot and screen recording files
  const isScreenCapture = lowerName.includes('screenshot')
    || lowerName.includes('screen recording')
    || lowerName.includes('simulator screenshot')

  // Common media extensions
  const hasMediaExtension = /\.(?:png|jpg|jpeg|mov|mp4|gif)$/i.test(validatedFilename)

  // Timestamp pattern files
  const hasTimestampPattern = /^\d{4}-\d{2}-\d{2}_/.test(validatedFilename)

  return (isScreenCapture && hasMediaExtension) || hasTimestampPattern
}

/**
 * Check if file is already in an organized directory
 */
function isFileInOrganizedDirectory(filePath: string, rootDir: string): boolean {
  const relativePath = filePath.replace(rootDir, '').replace(/^\//, '')

  // Check if file is in a year directory pattern (_YYYY/MM MonthName/)
  const yearDirPattern = /^_\d{4}\/\d{2} \w+\//

  // Check if file is in a month directory at root (MM MonthName/)
  const monthDirPattern = /^\d{2} \w+\//

  return yearDirPattern.test(relativePath) || monthDirPattern.test(relativePath)
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
 * Recursively find all files in directory and subdirectories
 */
async function findAllFiles(dirPath: string, allFiles: string[] = []): Promise<string[]> {
  const entries = await readdir(dirPath)

  for (const entry of entries) {
    const fullPath = join(dirPath, entry)
    const entryStat = await stat(fullPath)

    if (entryStat.isDirectory()) {
      await findAllFiles(fullPath, allFiles)
    }
    else {
      allFiles.push(fullPath)
    }
  }

  return allFiles
}

/**
 * Organize files based on creation date
 */
async function organizeFiles(rootDir: string): Promise<{ processed: number, skipped: number }> {
  const validatedRootDir: DirPath = DirectoryPathSchema.parse(rootDir)

  // Find all files recursively
  console.log('🔍 Finding all files...')
  const allFiles = await findAllFiles(validatedRootDir)
  console.log(`📊 Found ${allFiles.length} total files`)

  let processed = 0
  let skipped = 0

  for (const filePath of allFiles) {
    const filename = dirname(filePath) !== validatedRootDir
      ? filePath.split('/').pop() || ''
      : filePath.split('/').pop() || ''

    // Skip if not a file we want to organize
    if (!shouldOrganizeFile(filename)) {
      skipped++
      continue
    }

    // Skip if already in organized directory
    if (isFileInOrganizedDirectory(filePath, validatedRootDir)) {
      skipped++
      continue
    }

    try {
      const fileStat = await stat(filePath)
      const fileDate = getFileDateFromCreationTime(fileStat)
      const targetPath = getTargetPath(validatedRootDir, fileDate)
      const targetFile = join(targetPath, filename)

      // Skip if already in target location
      if (dirname(filePath) === targetPath) {
        skipped++
        continue
      }

      // Ensure target directory exists
      await ensureDir(targetPath)

      // Check if target file already exists
      if (existsSync(targetFile)) {
        console.log(`⚠️  Skipped ${filename}: target already exists`)
        skipped++
        continue
      }

      // Move file
      await rename(filePath, targetFile)
      console.log(`📁 ${filename} (${fileDate.year}-${fileDate.month.toString().padStart(2, '0')}) → ${targetPath.replace(`${validatedRootDir}/`, '')}`)
      processed++
    }
    catch (error) {
      console.error(`❌ Failed to process ${filename}:`, error)
      skipped++
    }
  }

  return OrganizeResultsSchema.parse({ processed, skipped })
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
    console.error('   • Based on file creation date')
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

  console.log(`📂 Organizing files in: ${resolvedDir}`)
  console.log('')

  const results = await organizeFiles(resolvedDir)

  // Display final summary
  console.log(`\n✅ Organization complete!`)
  console.log(`📁 Total processed: ${results.processed} files`)
  console.log(`⏭️  Total skipped: ${results.skipped} files`)

  const totalFiles = results.processed + results.skipped
  console.log(`📊 Total files examined: ${totalFiles}`)
}

// Run if called directly
main().catch(console.error)
