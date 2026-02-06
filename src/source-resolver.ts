import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, resolve, basename } from 'node:path';

export interface SourceContext {
  found: boolean;
  lines: string[];
  hotLineIndex: number;
}

/**
 * Resolve source code context for a hotspot location.
 * 
 * @param url - URL or file path from the profile
 * @param line - Line number (1-indexed)
 * @param sourceDir - Directory to search for source files
 * @param contextLines - Number of lines before/after to include (default: 3)
 */
export function resolveSource(
  url: string,
  line: number,
  sourceDir?: string,
  contextLines: number = 3
): SourceContext {
  if (!sourceDir || !url) {
    return { found: false, lines: [], hotLineIndex: -1 };
  }

  // Extract filename from URL
  let filename = extractFilename(url);
  if (!filename) {
    return { found: false, lines: [], hotLineIndex: -1 };
  }

  // Try to find the file
  const filePath = findFile(filename, sourceDir);
  if (!filePath) {
    return { found: false, lines: [], hotLineIndex: -1 };
  }

  // Read the file
  let content: string;
  try {
    content = readFileSync(filePath, 'utf-8');
  } catch {
    return { found: false, lines: [], hotLineIndex: -1 };
  }

  const allLines = content.split('\n');
  const lineIndex = line - 1; // Convert to 0-indexed

  if (lineIndex < 0 || lineIndex >= allLines.length) {
    return { found: false, lines: [], hotLineIndex: -1 };
  }

  // Extract context
  const startLine = Math.max(0, lineIndex - contextLines);
  const endLine = Math.min(allLines.length - 1, lineIndex + contextLines);

  const lines: string[] = [];
  for (let i = startLine; i <= endLine; i++) {
    const isHotLine = i === lineIndex;
    const lineNum = i + 1;
    const lineContent = allLines[i];
    
    if (isHotLine) {
      lines.push(`${lineNum.toString().padStart(4, ' ')} | ${lineContent} // ← HOT`);
    } else {
      lines.push(`${lineNum.toString().padStart(4, ' ')} | ${lineContent}`);
    }
  }

  return {
    found: true,
    lines,
    hotLineIndex: lineIndex - startLine,
  };
}

/**
 * Extract filename from URL or file path.
 */
function extractFilename(url: string): string | null {
  if (!url) return null;

  // Remove protocol
  let path = url.replace(/^file:\/\//, '').replace(/^https?:\/\//, '');

  // Remove query params and hash
  path = path.split('?')[0].split('#')[0];

  // Get basename
  const name = basename(path);
  
  return name || null;
}

/**
 * Find a file in the source directory (recursive search).
 */
function findFile(filename: string, sourceDir: string): string | null {
  const resolvedDir = resolve(sourceDir);

  // Try direct path first
  const directPath = join(resolvedDir, filename);
  if (existsSync(directPath)) {
    return directPath;
  }

  // Try recursive search (simple implementation - could be optimized)
  function search(dir: string, depth: number = 0): string | null {
    if (depth > 10) return null; // Prevent infinite recursion

    try {
      const entries = readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.name === 'node_modules' || entry.name === '.git') {
          continue;
        }

        const fullPath = join(dir, entry.name);

        if (entry.isFile() && entry.name === filename) {
          return fullPath;
        }

        if (entry.isDirectory()) {
          const found = search(fullPath, depth + 1);
          if (found) return found;
        }
      }
    } catch {
      // Ignore permission errors
    }

    return null;
  }

  return search(resolvedDir);
}
