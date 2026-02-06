/**
 * Shared formatting utilities for Markdown output.
 */

/**
 * Format duration from microseconds to human-readable string.
 */
export function formatDuration(microseconds: number): string {
  if (microseconds < 1000) {
    return `${microseconds.toFixed(0)}µs`;
  }
  
  const milliseconds = microseconds / 1000;
  if (milliseconds < 1000) {
    return `${milliseconds.toFixed(2)}ms`;
  }
  
  const seconds = milliseconds / 1000;
  if (seconds < 60) {
    return `${seconds.toFixed(2)}s`;
  }
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds.toFixed(2)}s`;
}

/**
 * Format time value to appropriate unit (s/ms/µs).
 */
export function formatTime(microseconds: number): string {
  if (microseconds < 1000) {
    return `${microseconds.toFixed(0)}µs`;
  }
  
  const milliseconds = microseconds / 1000;
  if (milliseconds < 1000) {
    return `${milliseconds.toFixed(2)}ms`;
  }
  
  const seconds = milliseconds / 1000;
  return `${seconds.toFixed(3)}s`;
}

/**
 * Format location to shortened filename:line format.
 */
export function formatLocation(url: string, line: number): string {
  if (!url) {
    return `(unknown):${line}`;
  }

  // Extract filename from URL
  const parts = url.split('/');
  const filename = parts[parts.length - 1] || url;
  
  return `${filename}:${line}`;
}

/**
 * Escape Markdown special characters in strings.
 */
export function escapeMarkdown(str: string): string {
  return str
    .replace(/\|/g, '\\|')
    .replace(/`/g, '\\`')
    .replace(/\*/g, '\\*')
    .replace(/_/g, '\\_')
    .replace(/\[/g, '\\[')
    .replace(/\]/g, '\\]');
}

/**
 * Generate URL-safe anchor ID from function name.
 */
export function generateAnchorId(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Format percentage with fixed decimals.
 */
export function formatPercent(percent: number, decimals: number = 2): string {
  return `${percent.toFixed(decimals)}%`;
}

/**
 * Create a progress bar string.
 */
export function createProgressBar(percent: number, width: number = 20): string {
  const filled = Math.round((percent / 100) * width);
  const empty = width - filled;
  return '█'.repeat(filled) + '░'.repeat(empty);
}

/**
 * Truncate string to max length with ellipsis.
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength - 3) + '...';
}

/**
 * Format a table row with proper alignment.
 */
export function formatTableRow(cells: string[], alignments?: ('left' | 'right' | 'center')[]): string {
  return '| ' + cells.join(' | ') + ' |';
}

/**
 * Create table separator row.
 */
export function createTableSeparator(columnCount: number, alignments?: ('left' | 'right' | 'center')[]): string {
  const separators = Array(columnCount).fill('---');
  
  if (alignments) {
    for (let i = 0; i < alignments.length && i < columnCount; i++) {
      switch (alignments[i]) {
        case 'left':
          separators[i] = ':---';
          break;
        case 'right':
          separators[i] = '---:';
          break;
        case 'center':
          separators[i] = ':---:';
          break;
      }
    }
  }
  
  return '| ' + separators.join(' | ') + ' |';
}
