import type { AnalysisResult, FormatOptions, CallTreeNode } from '../types.ts';
import {
  formatDuration,
  formatTime,
  formatLocation,
  formatPercent,
  escapeMarkdown,
} from './utils.ts';

/**
 * Format analysis results as detailed Markdown with full analysis.
 */
export function formatDetailed(result: AnalysisResult, options: FormatOptions = {}): string {
  const { profileName = 'CPU Profile' } = options;
  const lines: string[] = [];

  // Header
  lines.push(`# ${profileName} - Detailed Analysis`);
  lines.push('');

  // Metadata section
  lines.push('## Profile Metadata');
  lines.push('');
  lines.push(`- **Duration**: ${formatDuration(result.totalTime)}`);
  lines.push(`- **Total Samples**: ${result.totalSamples}`);
  lines.push(`- **Average Sample Interval**: ${formatTime(result.sampleInterval)}`);
  lines.push(`- **Start Time**: ${result.startTime}µs`);
  lines.push(`- **End Time**: ${result.endTime}µs`);
  lines.push('');

  // Annotated call tree
  lines.push('## Call Tree');
  lines.push('');
  lines.push('Text-based flame graph (indented by call depth):');
  lines.push('');
  
  const hotspotKeys = new Set(result.hotspots.map(h => h.key));
  renderCallTree(result.callTree, lines, hotspotKeys, 0, false);
  lines.push('');

  // Hotspot analysis
  if (result.hotspots.length > 0) {
    lines.push('## Hotspot Analysis');
    lines.push('');

    result.hotspots.forEach((hotspot, index) => {
      lines.push(`### ${index + 1}. ${escapeMarkdown(hotspot.name || '(anonymous)')}`);
      lines.push('');
      
      lines.push(`- **Location**: ${escapeMarkdown(formatLocation(hotspot.url, hotspot.line))}`);
      lines.push(`- **Type**: ${hotspot.type}`);
      lines.push(`- **Self Time**: ${formatTime(hotspot.selfTime)} (${formatPercent(hotspot.selfPercent)})`);
      lines.push(`- **Total Time**: ${formatTime(hotspot.totalTime)} (${formatPercent(hotspot.totalPercent)})`);
      lines.push(`- **Hit Count**: ${hotspot.hitCount} samples`);
      lines.push('');

      if (hotspot.callers.length > 0) {
        lines.push('**Called by**:');
        hotspot.callers.slice(0, 5).forEach((caller) => {
          const callerName = caller.split('@')[0];
          lines.push(`- ${escapeMarkdown(callerName)}`);
        });
        if (hotspot.callers.length > 5) {
          lines.push(`- *(${hotspot.callers.length - 5} more...)*`);
        }
        lines.push('');
      }

      if (hotspot.callees.length > 0) {
        lines.push('**Calls**:');
        hotspot.callees.slice(0, 5).forEach((callee) => {
          const calleeName = callee.split('@')[0];
          lines.push(`- ${escapeMarkdown(calleeName)}`);
        });
        if (hotspot.callees.length > 5) {
          lines.push(`- *(${hotspot.callees.length - 5} more...)*`);
        }
        lines.push('');
      }
    });
  }

  // Function details
  lines.push('## All Functions');
  lines.push('');
  lines.push('Complete function statistics:');
  lines.push('');

  const sortedFunctions = Array.from(result.functionStats.values())
    .sort((a, b) => b.selfTime - a.selfTime)
    .slice(0, 50); // Limit to top 50

  sortedFunctions.forEach((func) => {
    lines.push(`- **${escapeMarkdown(func.name)}** @ ${escapeMarkdown(formatLocation(func.url, func.line))}: ${formatPercent(func.selfPercent)} self, ${formatPercent(func.totalPercent)} total`);
  });

  if (result.functionStats.size > 50) {
    lines.push(`- *(${result.functionStats.size - 50} more functions...)*`);
  }

  lines.push('');

  return lines.join('\n');
}

/**
 * Render call tree recursively as indented text.
 */
function renderCallTree(
  node: CallTreeNode,
  lines: string[],
  hotspotKeys: Set<string>,
  depth: number,
  isLast: boolean = true
): void {
  const indent = '  '.repeat(depth);
  const prefix = depth > 0 ? (isLast ? '└── ' : '├── ') : '';
  
  const nodeKey = `${node.name}@${node.url}:${node.line}:0`;
  const isHotspot = hotspotKeys.has(nodeKey);
  const hotspotMarker = isHotspot ? ' ◀ HOTSPOT' : '';
  
  const selfPercent = formatPercent(node.selfPercent, 1);
  const totalPercent = formatPercent(node.totalPercent, 1);
  const location = formatLocation(node.url, node.line);
  
  lines.push(
    `${indent}${prefix}[${selfPercent} | ${totalPercent}] ${escapeMarkdown(node.name)} @ ${escapeMarkdown(location)}${hotspotMarker}`
  );

  // Only show top children to avoid excessive output
  const childrenToShow = node.children.slice(0, 10);
  childrenToShow.forEach((child, index) => {
    const childIsLast = index === childrenToShow.length - 1 && node.children.length <= 10;
    renderCallTree(child, lines, hotspotKeys, depth + 1, childIsLast);
  });

  if (node.children.length > 10) {
    const remaining = node.children.length - 10;
    lines.push(`${'  '.repeat(depth + 1)}└── *(${remaining} more children...)*`);
  }
}
