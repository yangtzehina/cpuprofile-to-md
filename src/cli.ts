#!/usr/bin/env node --experimental-strip-types

import { readFileSync, writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { convert } from './index.ts';

const usage = `
Usage: cpuprofile-to-md [options] <input.cpuprofile>

Convert V8 CPU profile to Markdown format for LLM analysis.

Options:
  -f, --format <level>       Output format: summary, detailed, adaptive (default: adaptive)
  -o, --output <file>        Output file path (default: stdout)
  -s, --source-dir <dir>     Source directory for code context resolution
  --include-source           Include source code snippets in output
  --max-hotspots <n>         Maximum number of hotspots to include (default: 20)
  --max-paths <n>            Maximum number of critical paths (default: 5)
  --hotspot-threshold <n>    Minimum self% for hotspot inclusion (default: 1.0)
  -h, --help                 Show this help message

Examples:
  cpuprofile-to-md profile.cpuprofile
  cpuprofile-to-md -f summary profile.cpuprofile -o analysis.md
  cpuprofile-to-md -s ./src --include-source profile.cpuprofile
`;

function main() {
  try {
    const { values, positionals } = parseArgs({
      options: {
        format: { type: 'string', short: 'f', default: 'adaptive' },
        output: { type: 'string', short: 'o' },
        'source-dir': { type: 'string', short: 's' },
        'include-source': { type: 'boolean', default: false },
        'max-hotspots': { type: 'string', default: '20' },
        'max-paths': { type: 'string', default: '5' },
        'hotspot-threshold': { type: 'string', default: '1.0' },
        help: { type: 'boolean', short: 'h', default: false },
      },
      allowPositionals: true,
    });

    if (values.help) {
      console.log(usage);
      process.exit(0);
    }

    if (positionals.length === 0) {
      console.error('Error: No input file specified\n');
      console.log(usage);
      process.exit(1);
    }

    const inputFile = positionals[0];
    const formatLevel = values.format as 'summary' | 'detailed' | 'adaptive';

    if (!['summary', 'detailed', 'adaptive'].includes(formatLevel)) {
      console.error(`Error: Invalid format level: ${formatLevel}`);
      console.error('Valid options: summary, detailed, adaptive');
      process.exit(1);
    }

    // Read input
    const input = readFileSync(inputFile);

    // Convert
    const markdown = convert(input, {
      format: formatLevel,
      profileName: inputFile,
      sourceDir: values['source-dir'] as string | undefined,
      includeSource: values['include-source'] as boolean,
      maxHotspots: parseInt(values['max-hotspots'] as string, 10),
      maxPaths: parseInt(values['max-paths'] as string, 10),
      hotspotThreshold: parseFloat(values['hotspot-threshold'] as string),
    });

    // Output
    if (values.output) {
      writeFileSync(values.output, markdown, 'utf-8');
      console.error(`✓ Analysis written to ${values.output}`);
    } else {
      console.log(markdown);
    }
  } catch (error) {
    console.error('Error:', (error as Error).message);
    process.exit(1);
  }
}

main();
