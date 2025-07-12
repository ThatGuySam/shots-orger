#!/usr/bin/env bun

import { existsSync } from 'node:fs'
import { mkdir, readdir, rename, rmdir, stat } from 'node:fs/promises'
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
  const fileExts = [
    'png',
    'jpg',
    'jpeg',
    'mov',
    'mp4',
    'gif',
  ]

  return fileExts.some(ext => filename.toLowerCase().endsWith(ext))
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
 * Find unorganized directories in a year directory
 */
async function findUnorganizedDirectories(yearPath: string): Promise<string[]> {
  const entries = await readdir(yearPath)
  const unorganizedDirs: string[] = []

  for (const entry of entries) {
    const entryPath = join(yearPath, entry)
    const entryStat = await stat(entryPath)

    if (entryStat.isDirectory()) {
      // Check if this directory name is in our expected MONTH_NAMES
      const isExpectedMonth = MONTH_NAMES.includes(entry)

      if (!isExpectedMonth) {
        unorganizedDirs.push(entry)
      }
    }
  }

  return unorganizedDirs
}

/**
 * Assert year directory structure before making changes
 */
async function assertYearDirectoryStructure(rootDir: string): Promise<void> {
  const validatedRootDir: DirPath = DirectoryPathSchema.parse(rootDir)
  const entries = await readdir(validatedRootDir)

  // Find year directories (pattern: _YYYY)
  const yearDirs = []
  for (const entry of entries) {
    if (/^_\d{4}$/.test(entry)) {
      const entryPath = join(validatedRootDir, entry)
      const entryStat = await stat(entryPath)
      if (entryStat.isDirectory()) {
        yearDirs.push(entry)
      }
    }
  }

  console.log(`📊 Found ${yearDirs.length} year directories to validate`)

  for (const yearDir of yearDirs) {
    const year = Number.parseInt(yearDir.substring(1), 10)
    const yearPath = join(validatedRootDir, yearDir)

    console.log(`🔍 Validating ${yearDir}...`)

    // Find unorganized directories
    const unorganizedDirs = await findUnorganizedDirectories(yearPath)

    if (unorganizedDirs.length > 0) {
      console.log(`⚠️  Found ${unorganizedDirs.length} unorganized directories in ${yearDir}:`)
      for (const dir of unorganizedDirs) {
        console.log(`   - ${dir}`)
      }
    }

    // Find organized directories
    const monthEntries = await readdir(yearPath)
    const organizedDirs = []
    for (const entry of monthEntries) {
      const entryPath = join(yearPath, entry)
      const entryStat = await stat(entryPath)
      if (entryStat.isDirectory() && MONTH_NAMES.includes(entry)) {
        organizedDirs.push(entry)
      }
    }

    console.log(`✅ ${yearDir} has ${organizedDirs.length} properly organized directories`)
    console.log(`⚠️  ${yearDir} has ${unorganizedDirs.length} unorganized directories`)

    // Assert that we have some structure to work with
    const totalDirs = organizedDirs.length + unorganizedDirs.length
    assert.truthy(totalDirs > 0, `Year ${year} must contain at least one directory`)

    // Assert no more than 12 directories per month type
    assert.truthy(totalDirs <= 24, `Year ${year} has too many directories (${totalDirs}), expected max 24 (12 organized + 12 unorganized)`)
  }
}

/**
 * Consolidate files from unorganized directories into proper month directories
 */
async function consolidateUnorganizedDirectories(rootDir: string): Promise<{ consolidated: number, errors: number }> {
  const validatedRootDir: DirPath = DirectoryPathSchema.parse(rootDir)
  const entries = await readdir(validatedRootDir)

  let totalConsolidated = 0
  let totalErrors = 0

  // Process each year directory
  for (const entry of entries) {
    if (/^_\d{4}$/.test(entry)) {
      const yearPath = join(validatedRootDir, entry)
      const yearStat = await stat(yearPath)

      if (yearStat.isDirectory()) {
        console.log(`🔧 Consolidating unorganized directories in ${entry}...`)

        const unorganizedDirs = await findUnorganizedDirectories(yearPath)

        for (const unorganizedDir of unorganizedDirs) {
          const unorganizedPath = join(yearPath, unorganizedDir)

          try {
            // Get all files in the unorganized directory
            const files = await readdir(unorganizedPath)

            for (const filename of files) {
              const filePath = join(unorganizedPath, filename)
              const fileStat = await stat(filePath)

              if (fileStat.isFile() && shouldOrganizeFile(filename)) {
                // Get file creation date to determine correct month
                const fileDate = getFileDateFromCreationTime(fileStat)
                const expectedMonthName = MONTH_NAMES[fileDate.month - 1]
                const targetDir = join(yearPath, expectedMonthName)
                const targetFile = join(targetDir, filename)

                // Ensure target directory exists
                await ensureDir(targetDir)

                // Check if target file already exists
                if (existsSync(targetFile)) {
                  console.log(`⚠️  Skipped ${filename}: already exists in ${expectedMonthName}`)
                  continue
                }

                // Move file to correct directory
                await rename(filePath, targetFile)
                console.log(`📁 ${filename} (${fileDate.year}-${fileDate.month.toString().padStart(2, '0')}) → ${expectedMonthName}`)
                totalConsolidated++
              }
            }

            // Check if unorganized directory is now empty
            const remainingFiles = await readdir(unorganizedPath)
            if (remainingFiles.length === 0) {
              // Remove empty directory
              await rmdir(unorganizedPath)
              console.log(`🗑️  Removed empty directory: ${unorganizedDir}`)

              continue
            }

            // If there's anything left, we need to fix that before continuing
            throw new Error(`Directory ${unorganizedDir} is not empty`)
          }
          catch (error) {
            console.error(`❌ Error consolidating ${unorganizedDir}:`, error)
            totalErrors++
          }
        }
      }
    }
  }

  return { consolidated: totalConsolidated, errors: totalErrors }
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

  // Assert directory structure before making changes
  console.log('🔍 Validating directory structure...')
  await assertYearDirectoryStructure(resolvedDir)
  console.log('')

  // Consolidate unorganized directories first
  console.log('🔧 Consolidating unorganized directories...')
  const consolidationResults = await consolidateUnorganizedDirectories(resolvedDir)
  console.log(`✅ Consolidated ${consolidationResults.consolidated} files`)
  if (consolidationResults.errors > 0) {
    console.log(`⚠️  ${consolidationResults.errors} errors during consolidation`)
  }
  console.log('')

  // Then organize any remaining loose files
  const results = await organizeFiles(resolvedDir)

  // Display final summary
  console.log(`\n✅ Organization complete!`)
  console.log(`📁 Files consolidated: ${consolidationResults.consolidated}`)
  console.log(`📁 Files organized: ${results.processed}`)
  console.log(`⏭️  Files skipped: ${results.skipped}`)

  const totalFilesProcessed = consolidationResults.consolidated + results.processed + results.skipped
  console.log(`📊 Total files examined: ${totalFilesProcessed}`)
}

// Run if called directly
main().catch(console.error)
