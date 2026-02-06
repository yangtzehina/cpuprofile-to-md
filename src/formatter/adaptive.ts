import type { AnalysisResult, FormatOptions } from '../types.ts';
import {
  formatDuration,
  formatTime,
  formatLocation,
  formatPercent,
  escapeMarkdown,
  generateAnchorId,
  formatTableRow,
  createTableSeparator,
} from './utils.ts';
import { resolveSource } from '../source-resolver.ts';

/**
 * Format analysis results as adaptive Markdown (default).
 * Combines summary with drill-down sections.
 */
export function formatAdaptive(result: AnalysisResult, options: FormatOptions = {}): string {
  const {
    profileName = 'CPU Profile',
    sourceDir,
    includeSource = false,
  } = options;
  
  const lines: string[] = [];

  // Header
  lines.push(`# ${profileName} - Performance Analysis`);
  lines.push('');

  // Executive summary
  lines.push('## Executive Summary');
  lines.push('');
  
  const summary = generateExecutiveSummary(result);
  lines.push(summary);
  lines.push('');

  // Quick stats
  lines.push('## Profile Overview');
  lines.push('');
  lines.push(`- **Duration**: ${formatDuration(result.totalTime)}`);
  lines.push(`- **Samples**: ${result.totalSamples}`);
  lines.push(`- **Sample Interval**: ${formatTime(result.sampleInterval)}`);
  lines.push('');

  // Top hotspots with drill-down links
  if (result.hotspots.length > 0) {
    lines.push('## Top Hotspots');
    lines.push('');
    
    // Table header
    lines.push(formatTableRow(['Rank', 'Function', 'Self%', 'Total%', 'Type', 'Details']));
    lines.push(createTableSeparator(6, ['right', 'left', 'right', 'right', 'left', 'center']));
    
    // Table rows with drill-down links
    result.hotspots.forEach((hotspot, index) => {
      const rank = (index + 1).toString();
      const name = escapeMarkdown(hotspot.name || '(anonymous)');
      const selfPercent = formatPercent(hotspot.selfPercent, 2);
      const totalPercent = formatPercent(hotspot.totalPercent, 2);
      const type = hotspot.type;
      const anchorId = generateAnchorId(`hotspot-${index + 1}-${hotspot.name}`);
      const link = `[→ Details](#${anchorId})`;
      
      lines.push(formatTableRow([rank, name, selfPercent, totalPercent, type, link]));
    });
    
    lines.push('');
  }

  // Critical paths
  if (result.criticalPaths.length > 0) {
    lines.push('## Critical Execution Paths');
    lines.push('');
    lines.push('The heaviest call paths from root to leaf:');
    lines.push('');
    
    result.criticalPaths.forEach((path, index) => {
      lines.push(`### Path ${index + 1}`);
      lines.push('');
      lines.push(`**Cumulative Impact**: ${formatPercent(path.cumulativePercent)}`);
      lines.push('');
      
      path.path.forEach((node, nodeIndex) => {
        const indent = '  '.repeat(nodeIndex);
        const arrow = nodeIndex > 0 ? '→ ' : '';
        lines.push(`${indent}${arrow}\`${escapeMarkdown(node.name)}\``);
        lines.push(`${indent}  *(self: ${formatPercent(node.selfPercent)}, total: ${formatPercent(node.totalPercent)})*`);
      });
      
      lines.push('');
    });
  }

  // Detailed analysis section
  lines.push('---');
  lines.push('');
  lines.push('## Detailed Analysis');
  lines.push('');

  if (result.hotspots.length > 0) {
    result.hotspots.forEach((hotspot, index) => {
      const anchorId = generateAnchorId(`hotspot-${index + 1}-${hotspot.name}`);
      
      lines.push(`<a id="${anchorId}"></a>`);
      lines.push('');
      lines.push(`### ${index + 1}. ${escapeMarkdown(hotspot.name || '(anonymous)')}`);
      lines.push('');

      // Metadata
      lines.push('**Metadata**:');
      lines.push(`- Location: \`${escapeMarkdown(formatLocation(hotspot.url, hotspot.line))}\``);
      lines.push(`- Type: ${hotspot.type}`);
      lines.push(`- Self Time: ${formatTime(hotspot.selfTime)} (${formatPercent(hotspot.selfPercent)})`);
      lines.push(`- Total Time: ${formatTime(hotspot.totalTime)} (${formatPercent(hotspot.totalPercent)})`);
      lines.push(`- Samples: ${hotspot.hitCount}`);
      lines.push('');

      // Call context
      if (hotspot.callers.length > 0 || hotspot.callees.length > 0) {
        lines.push('**Call Context**:');
        
        if (hotspot.callers.length > 0) {
          lines.push('');
          lines.push('*Called by*:');
          hotspot.callers.slice(0, 3).forEach((caller) => {
            const callerName = caller.split('@')[0];
            lines.push(`- \`${escapeMarkdown(callerName)}\``);
          });
          if (hotspot.callers.length > 3) {
            lines.push(`- *(and ${hotspot.callers.length - 3} more)*`);
          }
        }

        if (hotspot.callees.length > 0) {
          lines.push('');
          lines.push('*Calls*:');
          hotspot.callees.slice(0, 3).forEach((callee) => {
            const calleeName = callee.split('@')[0];
            lines.push(`- \`${escapeMarkdown(calleeName)}\``);
          });
          if (hotspot.callees.length > 3) {
            lines.push(`- *(and ${hotspot.callees.length - 3} more)*`);
          }
        }
        
        lines.push('');
      }

      // Source code context (if available)
      if (includeSource && sourceDir) {
        const sourceContext = resolveSource(hotspot.url, hotspot.line, sourceDir);
        if (sourceContext.found) {
          lines.push('**Source Code**:');
          lines.push('');
          lines.push('```');
          sourceContext.lines.forEach((line) => {
            lines.push(line);
          });
          lines.push('```');
          lines.push('');
        }
      }

      // Auto-generated insights
      const insights = generateHotspotInsights(hotspot, result);
      if (insights.length > 0) {
        lines.push('**Insights**:');
        insights.forEach((insight) => {
          lines.push(`- ${insight}`);
        });
        lines.push('');
      }

      lines.push('---');
      lines.push('');
    });
  }

  return lines.join('\n');
}

/**
 * Generate executive summary with primary/secondary bottlenecks.
 */
function generateExecutiveSummary(result: AnalysisResult): string {
  const lines: string[] = [];

  if (result.hotspots.length === 0) {
    return 'No significant performance hotspots detected in this profile.';
  }

  const primaryHotspot = result.hotspots[0];
  lines.push(
    `**Primary bottleneck**: \`${primaryHotspot.name}\` accounts for **${formatPercent(primaryHotspot.selfPercent)}** of execution time.`
  );

  if (result.hotspots.length > 1) {
    const secondaryHotspot = result.hotspots[1];
    lines.push(
      `**Secondary bottleneck**: \`${secondaryHotspot.name}\` accounts for **${formatPercent(secondaryHotspot.selfPercent)}** of execution time.`
    );
  }

  // Optimization potential
  const topFivePercent = result.hotspots
    .slice(0, Math.min(5, result.hotspots.length))
    .reduce((sum, h) => sum + h.selfPercent, 0);

  if (topFivePercent > 70) {
    lines.push(
      `\n**Optimization potential**: High - top ${Math.min(5, result.hotspots.length)} functions account for ${formatPercent(topFivePercent)} of execution time.`
    );
  } else if (topFivePercent > 40) {
    lines.push(
      `\n**Optimization potential**: Moderate - top ${Math.min(5, result.hotspots.length)} functions account for ${formatPercent(topFivePercent)} of execution time.`
    );
  } else {
    lines.push(
      `\n**Optimization potential**: Low - execution time is distributed across many functions (top ${Math.min(5, result.hotspots.length)}: ${formatPercent(topFivePercent)}).`
    );
  }

  return lines.join(' ');
}

/**
 * Generate insights for a specific hotspot.
 */
function generateHotspotInsights(hotspot: any, result: AnalysisResult): string[] {
  const insights: string[] = [];

  // High self-time relative to total
  if (hotspot.selfPercent / hotspot.totalPercent > 0.8 && hotspot.selfPercent > 5) {
    insights.push(
      'This function spends most of its time in self-execution rather than calling other functions. Focus optimization efforts here.'
    );
  }

  // Many callers (hot path)
  if (hotspot.callers.length > 10) {
    insights.push(
      `Called from ${hotspot.callers.length} different locations - this is a hot utility function. Optimizing it will have broad impact.`
    );
  }

  // GC-related
  if (
    hotspot.name.toLowerCase().includes('gc') ||
    hotspot.name.toLowerCase().includes('scavenge') ||
    hotspot.name.toLowerCase().includes('mark')
  ) {
    insights.push(
      'This is a garbage collection function. Consider reducing object allocations or adjusting heap size.'
    );
  }

  // Native function
  if (hotspot.type === 'native') {
    insights.push(
      'This is a native/built-in function. Optimization opportunities are limited - focus on reducing calls to it.'
    );
  }

  return insights;
}
