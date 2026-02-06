/**
 * cpuprofile-to-md - Convert V8 CPU profiles to LLM-friendly Markdown
 */

// Re-export types
export type {
  V8CpuProfile,
  V8CpuProfileNode,
  V8CpuProfileCallFrame,
  AnalysisResult,
  FunctionStats,
  Hotspot,
  CallTreeNode,
  CriticalPath,
  PathNode,
  FormatLevel,
  FormatOptions,
  ConvertOptions,
} from './types.js';

// Re-export core functions
export { parseProfile } from './parser.js';
export { analyzeProfile } from './analyzer.js';
export { format, formatSummary, formatDetailed, formatAdaptive } from './formatter/index.js';
export { resolveSource } from './source-resolver.js';

// Main API
import { parseProfile } from './parser.js';
import { analyzeProfile } from './analyzer.js';
import { format } from './formatter/index.js';
import type { ConvertOptions } from './types.js';

/**
 * Convert a .cpuprofile to Markdown in one call.
 * 
 * @param input - File path, Buffer, or JSON string
 * @param options - Conversion options
 * @returns Formatted Markdown string
 */
export function convert(input: string | Buffer, options: ConvertOptions = {}): string {
  const {
    format: formatLevel = 'adaptive',
    ...formatOptions
  } = options;

  // Parse
  const profile = parseProfile(input);

  // Analyze
  const result = analyzeProfile(profile, {
    hotspotThreshold: options.hotspotThreshold,
    maxHotspots: options.maxHotspots,
    maxPaths: options.maxPaths,
  });

  // Format
  return format(result, formatLevel, formatOptions);
}
