import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import type { V8CpuProfile, V8CpuProfileNode } from './types.js';

/**
 * Parse a .cpuprofile file from various input formats.
 * Handles:
 * - File path (string)
 * - Buffer (raw or gzipped)
 * - Raw JSON string
 * - Multiple .cpuprofile variants (head-based, parent field, Chromium trace)
 */
export function parseProfile(input: string | Buffer): V8CpuProfile {
  let data: Buffer;

  if (typeof input === 'string') {
    // Try to read as file path
    try {
      data = readFileSync(input);
    } catch {
      // If not a file, treat as JSON string
      data = Buffer.from(input, 'utf-8');
    }
  } else {
    data = input;
  }

  // Check if gzipped (magic bytes 0x1f 0x8b)
  if (data.length >= 2 && data[0] === 0x1f && data[1] === 0x8b) {
    data = gunzipSync(data);
  }

  const jsonStr = data.toString('utf-8');
  let parsed: any;

  try {
    parsed = JSON.parse(jsonStr);
  } catch (error) {
    throw new Error(`Invalid JSON in profile: ${(error as Error).message}`);
  }

  // Handle Chromium trace events format (wraps CpuProfile)
  if (Array.isArray(parsed)) {
    // Look for CpuProfile event
    const cpuProfileEvent = parsed.find(
      (event: any) => event.name === 'CpuProfile' || event.args?.data?.cpuProfile
    );
    if (cpuProfileEvent) {
      parsed = cpuProfileEvent.args?.data?.cpuProfile || cpuProfileEvent.args?.data;
    }
  } else if (parsed.traceEvents) {
    // Chromium trace with traceEvents array
    const cpuProfileEvent = parsed.traceEvents.find(
      (event: any) => event.name === 'CpuProfile' || event.args?.data?.cpuProfile
    );
    if (cpuProfileEvent) {
      parsed = cpuProfileEvent.args?.data?.cpuProfile || cpuProfileEvent.args?.data;
    }
  }

  // Handle "head"-based tree format (older Chrome format)
  if (parsed.head && !parsed.nodes) {
    parsed.nodes = linearizeHeadBasedTree(parsed.head);
  }

  // Validate required fields
  if (!parsed.nodes || !Array.isArray(parsed.nodes)) {
    throw new Error('Invalid profile: missing or invalid "nodes" array');
  }
  if (!parsed.samples || !Array.isArray(parsed.samples)) {
    throw new Error('Invalid profile: missing or invalid "samples" array');
  }
  if (!parsed.timeDeltas || !Array.isArray(parsed.timeDeltas)) {
    throw new Error('Invalid profile: missing or invalid "timeDeltas" array');
  }

  // Rebuild children arrays if missing but parent field exists
  const nodes = rebuildChildrenFromParent(parsed.nodes);

  return {
    startTime: parsed.startTime || 0,
    endTime: parsed.endTime || 0,
    nodes,
    samples: parsed.samples,
    timeDeltas: parsed.timeDeltas,
  };
}

/**
 * Convert head-based tree format to flat nodes array.
 * Older Chrome DevTools format used a single root "head" node with nested children.
 */
function linearizeHeadBasedTree(head: any): V8CpuProfileNode[] {
  const nodes: V8CpuProfileNode[] = [];
  let nextId = 1;

  function traverse(node: any, parentId?: number): number {
    const id = nextId++;
    const cpuNode: V8CpuProfileNode = {
      id,
      callFrame: node.callFrame || {
        functionName: node.functionName || '(unknown)',
        scriptId: '0',
        url: node.url || '',
        lineNumber: node.lineNumber || 0,
        columnNumber: node.columnNumber || 0,
      },
      hitCount: node.hitCount || 0,
      children: [],
    };

    if (parentId !== undefined) {
      cpuNode.parent = parentId;
    }

    if (node.children && Array.isArray(node.children)) {
      cpuNode.children = node.children.map((child: any) => traverse(child, id));
    }

    nodes.push(cpuNode);
    return id;
  }

  traverse(head);
  return nodes;
}

/**
 * Rebuild children arrays from parent field.
 * Some formats have parent field but missing or incomplete children arrays.
 */
function rebuildChildrenFromParent(nodes: V8CpuProfileNode[]): V8CpuProfileNode[] {
  const nodeMap = new Map<number, V8CpuProfileNode>();
  
  // First pass: create map and ensure children arrays exist
  for (const node of nodes) {
    nodeMap.set(node.id, { ...node, children: [] });
  }

  // Second pass: build children arrays from parent relationships
  for (const node of nodes) {
    if (node.parent !== undefined) {
      const parent = nodeMap.get(node.parent);
      if (parent && !parent.children!.includes(node.id)) {
        parent.children!.push(node.id);
      }
    }
  }

  // Third pass: preserve existing children if they exist and are valid
  for (const node of nodes) {
    const rebuilt = nodeMap.get(node.id)!;
    if (node.children && node.children.length > 0) {
      // Merge existing children with rebuilt ones
      const childSet = new Set([...rebuilt.children!, ...node.children]);
      rebuilt.children = Array.from(childSet);
    }
  }

  return Array.from(nodeMap.values());
}
