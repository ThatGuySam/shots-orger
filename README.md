# shots-orger

Screenshot and screen recording file organizer that automatically sorts files into year/month folders.

## Usage

```bash
bun main.ts ./path/to/directory
```

## Organization Pattern

The script organizes files based on dates extracted from filenames:

### Archived Years (2020-2023)
Files are organized into `_YEAR/MM MonthName/` folders:
```
_2020/
  ├── 01 Jan/
  ├── 02 Feb/
  ├── 03 March/
  └── ...
_2021/
_2022/
_2023/
```

### Current Years (2024+)
Files are organized into `MM MonthName/` folders at the root level:
```
01 Jan/
02 Feb/
03 Mar/
04 Apr/
05 May/
06 Jun/
```

## Supported File Patterns

The script recognizes and organizes these filename patterns:

- `Screenshot 2025-MM-DD at H.MM.SS AM.png`
- `Screen Recording 2025-MM-DD at H.MM.SS AM.mov`
- `2025-MM-DD_HH-MM-SS.mov`
- `Simulator Screenshot - iPhone 15 - 2025-MM-DD at HH.MM.SS.png`

## Features

- ✅ Automatically creates directory structure
- ✅ Skips files already in correct locations
- ✅ Provides detailed progress output
- ✅ Handles various filename patterns
- ✅ Safe operation (moves files, doesn't copy)

## Example Output

```
📂 Organizing files in: /Users/user/Screenshots

📁 Created directory: /Users/user/Screenshots/01 Jan
📁 Screenshot 2025-01-15 at 3.45.12 PM.png → 01 Jan
📁 Screen Recording 2025-01-20 at 2.30.45 PM.mov → 01 Jan

✅ Organization complete!
📁 Processed: 25 files
⏭️  Skipped: 3 files
```

## Development

```bash
# Install dependencies
pnpm install

# Run the organizer
bun main.ts ./path/to/directory

# Development mode
pnpm dev

# Type checking
pnpm typecheck

# Linting
pnpm lint
```
