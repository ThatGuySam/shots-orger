#!/usr/bin/env bun

import type { Dirent, Stats as FsStats } from 'node:fs'
import { existsSync } from 'node:fs'
import { mkdir, readdir, rename, rmdir, stat } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import process from 'node:process'
import { assert } from '@sindresorhus/is'
import { z } from 'zod'

const MAX_OPS = 5000

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

// Validate process.argv using Zod
const validatedArgv = ProcessArgvSchema.parse(process.argv)
const targetDir = validatedArgv[2]
// Validate target directory using Zod
const validatedTargetDir: DirPath = DirectoryPathSchema.parse(targetDir)
const rootDir: DirPath = DirectoryPathSchema.parse(resolve(validatedTargetDir))

/**
 * String path that is guaranteed to be in the root directory
 */
const RootDirPathSchema = DirectoryPathSchema.startsWith(rootDir).brand('RootDirPath')
type RootDirPath = z.infer<typeof RootDirPathSchema>

const DestDirPathSchema = RootDirPathSchema
  // Has file extension
  .refine((path) => {
    const relativePath = path.replace(rootDir, '').replace(/^\//, '')
    const parts = relativePath.split('/')

    return parts[parts.length - 1].includes('.')
  }, 'DestDirPath must have a file extension')
  .refine((path) => {
    const relativePath = path.replace(rootDir, '').replace(/^\//, '')
    const parts = relativePath.split('/')

    // Has 2 or 3 parts after rootDir and the first part is a year
    return (
      parts.length === 2
      || (
        parts.length === 3
        && parts[0].startsWith('_')
      )
    )
  }, 'DestDirPath must be in the root directory and have 2 or 3 parts')
  .brand('DestDirPath')
type DestDirPath = z.infer<typeof DestDirPathSchema>

/**
 * Get date from file creation time
 */
function getFileDateFromCreationTime(fileStat: FsStats): ParsedDate {
  const creationDate = fileStat.birthtime || fileStat.mtime
  const year = creationDate.getFullYear()
  const month = creationDate.getMonth() + 1 // JS months are 0-based
  const day = creationDate.getDate()

  return ParsedDateSchema.parse({ year, month, day })
}

/**
 * Get target directory path for a file based on its date
 */
function getTargetPath(file: FileInfo): DestDirPath {
  const date = getFileDateFromCreationTime(file.stat)

  // Validate arguments using Zod
  const validatedDate = ParsedDateSchema.parse(date)

  const yearDirName = `_${validatedDate.year}`
  const monthDirName: NonEmptyString = NonEmptyStringSchema
    .parse(MONTH_NAMES[validatedDate.month - 1])

  const pathParts: string[] = [
    monthDirName,
    file.dirent.name,
  ]

  const isBeforeCurrentYear = validatedDate.year < new Date().getFullYear()

  // If the year is before the current year, then we put it in the year directory
  if (isBeforeCurrentYear) {
    pathParts.unshift(yearDirName)
  }

  // Prepend rootDir
  pathParts.unshift(rootDir)

  const path = DestDirPathSchema.parse(
    join(
      ...pathParts,
    ),
  )

  return path
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
    'mp3',
  ]

  return fileExts.some(ext => filename.toLowerCase().endsWith(ext))
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

interface FileInfo {
  stat: FsStats
  dirent: Dirent
}

/**
 * Collect file stats for all files in the root directory
 * so that we can plan operations
 */
async function collectFileStats(rootDir: string): Promise<FileInfo[]> {
  const validatedRootDir: DirPath = DirectoryPathSchema.parse(rootDir)
  const entries = await readdir(validatedRootDir, {
    withFileTypes: true,
    recursive: true,
  })

  /**
   * Get stats for all files and directories in parallel
   * Can include files and directories
   */
  const fileStats: FileInfo[] = await Promise.all(entries.map(async (entry) => {
    const fullPath = join(entry.parentPath, entry.name)
    const entryStat = await stat(fullPath)

    return { stat: entryStat, dirent: entry }
  }))

  return fileStats
}

interface MoveOp { type: 'move', src: RootDirPath, dest: DestDirPath }
interface RmdirOp { type: 'rmdir', dir: RootDirPath }
type Op = MoveOp | RmdirOp

interface PlanResults {
  plannedOps: Map<DestDirPath, Op>
  plannedMoves: Map<DestDirPath, MoveOp>
  plannedRmdirs: Map<DestDirPath, RmdirOp>
}

/**
 * Consolidate files from unorganized directories into proper month directories
 * Refactored: collect all operations, assert, then execute
 */
function planOperations(fileStats: FileInfo[]): PlanResults {
  const plannedOps: Map<DestDirPath, Op> = new Map()
  const plannedMoves: Map<DestDirPath, MoveOp> = new Map()
  const plannedRmdirs: Map<DestDirPath, RmdirOp> = new Map()

  const existingFileMap: Map<string, FileInfo> = new Map([
    ...fileStats
      .filter(f => f.dirent.isFile())
      .map((f): [string, FileInfo] => {
        const filePath = join(f.dirent.parentPath, f.dirent.name)
        return [
          filePath,
          f,
        ]
      }),
  ])

  /**
   * Collect all planned operations
   */
  for (const fileStat of fileStats) {
    // Skip directories
    if (fileStat.dirent.isDirectory())
      continue

    // Skip files that are not screenshots or recordings
    if (!shouldOrganizeFile(fileStat.dirent.name))
      continue

    // Skip files that already exist in the destination
    if (existingFileMap.has(fileStat.dirent.name))
      continue

    const srcPath: RootDirPath = RootDirPathSchema.parse(
      join(fileStat.dirent.parentPath, fileStat.dirent.name),
    )
    const destPath = getTargetPath(fileStat)

    // Skip files that are already in the destination
    if (existingFileMap.has(destPath))
      continue

    if (plannedOps.has(destPath)) {
      console.error('🚨 Duplicate destination planned:', { srcPath, destPath })
      throw new Error(`Duplicate destination planned: ${destPath}`)
    }

    plannedOps.set(destPath, { type: 'move', src: srcPath, dest: destPath })
    plannedMoves.set(destPath, { type: 'move', src: srcPath, dest: destPath })
  }

  // --- ASSERTIONS ---
  for (const [destPath, op] of plannedOps) {
    if (op.type === 'move') {
      if (existingFileMap.has(op.dest)) {
        console.error('🚨 Duplicate destination planned:', { srcPath: op.src, destPath })
        throw new Error(`Duplicate destination planned: ${destPath}`)
      }
    }
  }

  // --- PRINT PLAN ---
  console.log('Planned operations:')

  const movesSample = Array.from(plannedMoves.values()).slice(0, 5)
  const rmdirsSample = Array.from(plannedRmdirs.values()).slice(0, 5)

  console.log('Sample Moves:', movesSample.map(m => `${m.src} -> ${m.dest}`))
  console.log('Sample Rmdirs:', rmdirsSample.map(r => r.dir))

  console.log('---')

  return {
    plannedOps,
    plannedMoves,
    plannedRmdirs,
  }
}

async function executeOperations(operations: PlanResults): Promise<{ totalConsolidated: number }> {
  const { plannedOps } = operations

  let totalConsolidated = 0

  for (const op of Array.from(plannedOps.values()).slice(0, MAX_OPS)) {
    console.log('Executing operation:', op)

    if (op.type === 'move') {
      // Assert that both src and dest are in rootDir
      assert.truthy(
        op.src.startsWith(rootDir),
        `Source path ${op.src} is not in root directory ${rootDir}`,
      )
      assert.truthy(
        op.dest.startsWith(rootDir),
        `Destination path ${op.dest} is not in root directory ${rootDir}`,
      )

      await ensureDir(dirname(op.dest))
      await rename(op.src, op.dest)
      totalConsolidated++
      console.log(`📁 ${op.src} → ${op.dest}`)

      continue
    }

    if (op.type === 'rmdir') {
      await rmdir(op.dir)
      console.log(`🗑️  Removed empty directory: ${op.dir}`)

      continue
    }
  }

  return {
    totalConsolidated,
  }
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  if (!targetDir) {
    console.error('❌ Usage: bun main.ts ./path/to/dir')
    console.error('')
    console.error('📖 This script organizes screenshot and recording files into:')
    console.error('   • 2020-2023: _YEAR/MM MonthName/')
    console.error('   • 2024+: MM MonthName/')
    console.error('   • Based on file creation date')
    process.exit(1)
  }

  const dirExists = existsSync(rootDir)

  assert.truthy(dirExists, `❌ Directory does not exist: ${rootDir}`)

  console.log(`📂 Organizing files in: ${rootDir}`)
  console.log('')

  // Assert directory structure before making changes
  console.log('🔍 Validating directory structure...')
  await assertYearDirectoryStructure(rootDir)
  console.log('')

  const entries = await collectFileStats(rootDir)
  const operations = planOperations(entries)

  await executeOperations(operations)

  const totalOps = MAX_OPS || operations.plannedMoves.size

  // Log stats
  console.log('')
  console.log('Stats:')
  console.log(`  Total files: ${entries.length}`)
  console.log(`  Total ops: ${totalOps}`)
  console.log('')

  process.exit(0)
}

// Run if called directly
main().catch(console.error)
