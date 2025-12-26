# Quick Start Guide

## Installation

```bash
npm install
```

## Build

```bash
npm run build
```

## Run Demo

```bash
npm run demo
```

This will:
1. Process sample invoices
2. Show learning progression
3. Generate output JSON files in `./output/`
4. Create `memory.db` with learned patterns

## Inspect Database

```bash
npm run inspect-db
```

Shows all stored memories in readable format.

## Project Structure

- `src/` - Source code
- `README.md` - Complete documentation
- `PROJECT_EXPLANATION.md` - Detailed flow explanation
- `SETUP.md` - Setup instructions

## Key Files

- `src/memory.ts` - Core memory logic (Recall, Apply, Decide, Learn)
- `src/database.ts` - SQLite persistence
- `src/processor.ts` - Invoice processing pipeline
- `src/demo.ts` - Demo runner with sample data

