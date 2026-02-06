import type { AnalysisResult, FormatLevel, FormatOptions } from '../types.ts';
import { formatSummary } from './summary.ts';
import { formatDetailed } from './detailed.ts';
import { formatAdaptive } from './adaptive.ts';

/**
 * Format analysis results to Markdown based on format level.
 */
export function format(
  result: AnalysisResult,
  formatLevel: FormatLevel = 'adaptive',
  options: FormatOptions = {}
): string {
  switch (formatLevel) {
    case 'summary':
      return formatSummary(result, options);
    case 'detailed':
      return formatDetailed(result, options);
    case 'adaptive':
      return formatAdaptive(result, options);
    default:
      throw new Error(`Unknown format level: ${formatLevel}`);
  }
}

export { formatSummary, formatDetailed, formatAdaptive };
