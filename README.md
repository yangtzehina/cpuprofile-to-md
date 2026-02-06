# cpuprofile-to-md

Convert V8 CPU profiles (`.cpuprofile`) to LLM-friendly Markdown for AI-assisted performance analysis.

Inspired by [platformatic/pprof-to-md](https://github.com/platformatic/pprof-to-md), but targets the V8 `.cpuprofile` JSON format used by Node.js (`--cpu-prof`), Chrome DevTools, and Chromium performance traces.

## Features

- **Zero dependencies** - Pure Node.js implementation
- **Multiple output formats** - Summary, Detailed, and Adaptive (default)
- **Smart analysis** - Identifies hotspots, critical paths, and GC pressure
- **Source code context** - Optional source code snippets at hotspot locations
- **Native TypeScript** - Uses Node.js 22.6+ native type stripping
- **Format flexibility** - Handles multiple `.cpuprofile` variants (head-based trees, parent fields, Chromium traces)

## Installation

```bash
npm install cpuprofile-to-md
```

Or run directly with `npx`:

```bash
npx cpuprofile-to-md profile.cpuprofile
```

## Requirements

- Node.js >= 22.6.0 (for native TypeScript support)

## Usage

### CLI

```bash
# Basic usage (adaptive format to stdout)
cpuprofile-to-md profile.cpuprofile

# Summary format
cpuprofile-to-md -f summary profile.cpuprofile

# Save to file
cpuprofile-to-md profile.cpuprofile -o analysis.md

# Include source code context
cpuprofile-to-md -s ./src --include-source profile.cpuprofile

# Custom hotspot threshold
cpuprofile-to-md --hotspot-threshold 2.0 profile.cpuprofile
```

#### CLI Options

- `-f, --format <level>` - Output format: `summary`, `detailed`, or `adaptive` (default: `adaptive`)
- `-o, --output <file>` - Output file path (default: stdout)
- `-s, --source-dir <dir>` - Source directory for code context resolution
- `--include-source` - Include source code snippets in output
- `--max-hotspots <n>` - Maximum number of hotspots to include (default: 20)
- `--max-paths <n>` - Maximum number of critical paths (default: 5)
- `--hotspot-threshold <n>` - Minimum self% for hotspot inclusion (default: 1.0)
- `-h, --help` - Show help message

### Library API

```typescript
import { convert, parseProfile, analyzeProfile, format } from 'cpuprofile-to-md';

// One-step conversion
const markdown = convert('./profile.cpuprofile', {
  format: 'adaptive',
  maxHotspots: 10,
  sourceDir: './src',
  includeSource: true
});

// Step-by-step for more control
const profile = parseProfile('./profile.cpuprofile');
const analysis = analyzeProfile(profile, {
  hotspotThreshold: 2.0,
  maxHotspots: 15
});
const markdown = format(analysis, 'detailed', {
  profileName: 'My App Profile'
});
```

## Output Formats

### Summary

Compact overview for quick triage:
- Profile metadata (duration, samples, interval)
- Top hotspots table
- Critical execution paths
- Auto-generated key observations

### Detailed

Full analysis with:
- Complete metadata
- Annotated call tree (text-based flame graph)
- Function details for each hotspot (callers, callees)
- All function statistics

### Adaptive (Default)

Combines summary with drill-down:
- Executive summary with optimization assessment
- Top hotspots with drill-down links
- Critical paths
- Detailed analysis section with anchors
- Per-hotspot insights and source code (if enabled)

## Generating CPU Profiles

### Node.js

```bash
# Using --cpu-prof flag
node --cpu-prof your-app.js

# Using --cpu-prof with custom interval
node --cpu-prof --cpu-prof-interval 100 your-app.js
```

### Chrome DevTools

1. Open DevTools (F12)
2. Go to Performance tab
3. Click Record, perform actions, Stop
4. Click "Save profile..."

### Programmatically

```javascript
const { Session } = require('inspector');
const { writeFileSync } = require('fs');

const session = new Session();
session.connect();

session.post('Profiler.enable');
session.post('Profiler.start');

// Your code here...

session.post('Profiler.stop', (err, { profile }) => {
  writeFileSync('profile.cpuprofile', JSON.stringify(profile));
  session.disconnect();
});
```

## Architecture

The library follows a four-stage pipeline:

```
.cpuprofile (JSON) → Parse → Analyze → Format → Markdown output
```

1. **Parse** (`src/parser.ts`) - Parse `.cpuprofile` JSON with variant handling (head-based, parent field, Chromium trace)
2. **Analyze** (`src/analyzer.ts`) - Compute self-time, total-time, aggregate per-function stats, build call tree, extract hotspots, find critical paths
3. **Format** (`src/formatter/`) - Route to appropriate formatter and generate Markdown
4. **Output** - Markdown with hotspots, insights, and optional source context

## Development

```bash
# Generate test profiles
npm run generate-profiles

# Run tests
npm test

# Use the CLI locally
node --experimental-strip-types src/cli.ts test/simple.cpuprofile
```

## License

Apache-2.0

## Contributing

Contributions welcome! Please open an issue or PR.
