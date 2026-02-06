import type { AnalysisResult, FormatOptions } from '../types.ts';
import {
  formatDuration,
  formatTime,
  formatLocation,
  formatPercent,
  escapeMarkdown,
  formatTableRow,
  createTableSeparator,
} from './utils.ts';

/**
 * Format analysis results as compact summary Markdown.
 */
export function formatSummary(result: AnalysisResult, options: FormatOptions = {}): string {
  const { profileName = 'CPU Profile' } = options;
  const lines: string[] = [];

  // Header
  lines.push(`# ${profileName} - Performance Summary`);
  lines.push('');

  // Metadata
  const duration = result.totalTime;
  const avgInterval = result.sampleInterval;
  
  lines.push('## Profile Metadata');
  lines.push('');
  lines.push(`- **Duration**: ${formatDuration(duration)}`);
  lines.push(`- **Samples**: ${result.totalSamples}`);
  lines.push(`- **Average Sample Interval**: ${formatTime(avgInterval)}`);
  lines.push('');

  // Hotspots table
  if (result.hotspots.length > 0) {
    lines.push('## Top Hotspots');
    lines.push('');
    
    // Table header
    lines.push(formatTableRow(['Rank', 'Function', 'Self%', 'Total%', 'Self Time', 'Location']));
    lines.push(createTableSeparator(6, ['right', 'left', 'right', 'right', 'right', 'left']));
    
    // Table rows
    result.hotspots.forEach((hotspot, index) => {
      const rank = (index + 1).toString();
      const name = escapeMarkdown(hotspot.name || '(anonymous)');
      const selfPercent = formatPercent(hotspot.selfPercent, 2);
      const totalPercent = formatPercent(hotspot.totalPercent, 2);
      const selfTime = formatTime(hotspot.selfTime);
      const location = escapeMarkdown(formatLocation(hotspot.url, hotspot.line));
      
      lines.push(formatTableRow([rank, name, selfPercent, totalPercent, selfTime, location]));
    });
    
    lines.push('');
  }

  // Critical paths
  if (result.criticalPaths.length > 0) {
    lines.push('## Critical Paths');
    lines.push('');
    
    result.criticalPaths.forEach((path, index) => {
      lines.push(`### Path ${index + 1} (${formatPercent(path.cumulativePercent)} cumulative)`);
      lines.push('');
      
      path.path.forEach((node, nodeIndex) => {
        const indent = '  '.repeat(nodeIndex);
        const arrow = nodeIndex > 0 ? '→ ' : '';
        lines.push(`${indent}${arrow}**${escapeMarkdown(node.name)}** (self: ${formatPercent(node.selfPercent)}, total: ${formatPercent(node.totalPercent)})`);
      });
      
      lines.push('');
    });
  }

  // Key observations
  lines.push('## Key Observations');
  lines.push('');
  
  const observations = generateObservations(result);
  observations.forEach((obs) => {
    lines.push(`- ${obs}`);
  });
  lines.push('');

  return lines.join('\n');
}

/**
 * Generate auto-generated insights from analysis.
 */
function generateObservations(result: AnalysisResult): string[] {
  const observations: string[] = [];

  if (result.hotspots.length === 0) {
    observations.push('No significant hotspots detected (all functions below threshold).');
    return observations;
  }

  // Top hotspot identification
  const topHotspot = result.hotspots[0];
  observations.push(
    `**Primary bottleneck**: \`${topHotspot.name}\` accounts for ${formatPercent(topHotspot.selfPercent)} of total execution time.`
  );

  // Native vs application code ratio
  const nativeTime = result.hotspots
    .filter((h) => h.type === 'native')
    .reduce((sum, h) => sum + h.selfTime, 0);
  const appTime = result.hotspots
    .filter((h) => h.type === 'app')
    .reduce((sum, h) => sum + h.selfTime, 0);
  
  const nativePercent = (nativeTime / result.totalTime) * 100;
  const appPercent = (appTime / result.totalTime) * 100;

  if (nativePercent > 50) {
    observations.push(
      `**Native code dominance**: ${formatPercent(nativePercent)} of time spent in native/built-in functions, suggesting limited optimization opportunities in application code.`
    );
  } else if (appPercent > 50) {
    observations.push(
      `**Application code focus**: ${formatPercent(appPercent)} of time spent in application code, suggesting optimization opportunities exist.`
    );
  }

  // GC pressure detection
  const gcHotspots = result.hotspots.filter((h) =>
    h.name.toLowerCase().includes('gc') ||
    h.name.toLowerCase().includes('scavenge') ||
    h.name.toLowerCase().includes('mark') ||
    h.name.toLowerCase().includes('sweep')
  );

  if (gcHotspots.length > 0) {
    const gcTime = gcHotspots.reduce((sum, h) => sum + h.selfTime, 0);
    const gcPercent = (gcTime / result.totalTime) * 100;
    observations.push(
      `**GC pressure detected**: Garbage collection functions account for ${formatPercent(gcPercent)} of execution time, indicating potential memory allocation issues.`
    );
  }

  // Optimization potential
  const topThreePercent = result.hotspots
    .slice(0, 3)
    .reduce((sum, h) => sum + h.selfPercent, 0);
  
  if (topThreePercent > 50) {
    observations.push(
      `**High optimization potential**: Top 3 functions account for ${formatPercent(topThreePercent)} of execution time, suggesting focused optimization could yield significant improvements.`
    );
  } else {
    observations.push(
      `**Distributed workload**: Top 3 functions account for only ${formatPercent(topThreePercent)} of execution time, suggesting workload is well-distributed across multiple functions.`
    );
  }

  return observations;
}
