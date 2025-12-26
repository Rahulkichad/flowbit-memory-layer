# Setup Instructions

## Quick Start

1. **Fix npm permissions** (if needed):
   ```bash
   sudo chown -R $(whoami) ~/.npm
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Build the project**:
   ```bash
   npm run build
   ```

4. **Run the demo**:
   ```bash
   npm run demo
   ```

## Troubleshooting

### Permission Errors
If you encounter permission errors with npm:
```bash
sudo chown -R $(whoami) ~/.npm
```

### TypeScript Errors
If you see TypeScript errors about missing modules, make sure you've run:
```bash
npm install
```

### Database Errors
The system creates a SQLite database file (`memory.db`) in the project root. Make sure you have write permissions in the project directory.

## Project Structure

```
Flowbit/
├── src/
│   ├── types.ts          # Type definitions
│   ├── database.ts       # SQLite persistence
│   ├── memory.ts         # Core memory logic
│   ├── processor.ts      # Invoice processor
│   ├── demo.ts           # Demo runner
│   └── index.ts          # Main entry point
├── dist/                 # Compiled JavaScript (after build)
├── output/               # Demo output JSON files
├── memory.db             # SQLite database (created at runtime)
├── package.json
├── tsconfig.json
└── README.md
```

## Verification

After installation, verify the setup:
```bash
# Should compile without errors
npm run build

# Should run the demo successfully
npm run demo
```

The demo will:
1. Process sample invoices
2. Show learning over time
3. Generate output JSON files in `./output/`
4. Create a `memory.db` file with learned patterns

