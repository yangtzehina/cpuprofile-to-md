import type {
  V8CpuProfile,
  V8CpuProfileNode,
  AnalysisResult,
  FunctionStats,
  Hotspot,
  CallTreeNode,
  CriticalPath,
  PathNode,
  FormatOptions,
} from './types.js';

interface AnalyzeOptions {
  hotspotThreshold?: number;
  maxHotspots?: number;
  maxPaths?: number;
}

/**
 * Analyze a V8 CPU profile and compute performance statistics.
 */
export function analyzeProfile(
  profile: V8CpuProfile,
  options: AnalyzeOptions = {}
): AnalysisResult {
  const { hotspotThreshold = 1.0, maxHotspots = 20, maxPaths = 5 } = options;

  // Build node map for fast lookup
  const nodeMap = new Map<number, V8CpuProfileNode>();
  for (const node of profile.nodes) {
    nodeMap.set(node.id, node);
  }

  // Compute self-time from samples and timeDeltas
  const selfTimeMap = new Map<number, number>();
  const hitCountMap = new Map<number, number>();

  for (let i = 0; i < profile.samples.length; i++) {
    const nodeId = profile.samples[i];
    const timeDelta = profile.timeDeltas[i];

    selfTimeMap.set(nodeId, (selfTimeMap.get(nodeId) || 0) + timeDelta);
    hitCountMap.set(nodeId, (hitCountMap.get(nodeId) || 0) + 1);
  }

  // Compute total time (sum of all time deltas)
  const totalTime = profile.timeDeltas.reduce((sum, delta) => sum + delta, 0);
  const totalSamples = profile.samples.length;

  // Estimate sample interval (average time delta)
  const sampleInterval = totalTime / totalSamples;

  // Compute total-time for each node (self + descendants)
  const totalTimeMap = computeTotalTime(profile.nodes, nodeMap, selfTimeMap);

  // Aggregate per-function stats
  const functionStats = aggregateFunctionStats(
    profile.nodes,
    selfTimeMap,
    totalTimeMap,
    hitCountMap,
    totalTime,
    nodeMap
  );

  // Build call tree
  const rootNode = profile.nodes[0];
  const callTree = buildCallTree(rootNode, nodeMap, selfTimeMap, totalTimeMap, totalTime);

  // Extract hotspots
  const hotspots = extractHotspots(
    functionStats,
    hotspotThreshold,
    maxHotspots
  );

  // Find critical paths
  const criticalPaths = findCriticalPaths(callTree, maxPaths);

  return {
    totalTime,
    totalSamples,
    sampleInterval,
    functionStats,
    callTree,
    hotspots,
    criticalPaths,
    startTime: profile.startTime,
    endTime: profile.endTime,
  };
}

/**
 * Compute total time for each node (self + all descendants).
 */
function computeTotalTime(
  nodes: V8CpuProfileNode[],
  nodeMap: Map<number, V8CpuProfileNode>,
  selfTimeMap: Map<number, number>
): Map<number, number> {
  const totalTimeMap = new Map<number, number>();
  const visited = new Set<number>();

  function computeNodeTotalTime(nodeId: number): number {
    if (visited.has(nodeId)) {
      return totalTimeMap.get(nodeId) || 0;
    }
    visited.add(nodeId);

    const node = nodeMap.get(nodeId);
    if (!node) return 0;

    let total = selfTimeMap.get(nodeId) || 0;

    if (node.children) {
      for (const childId of node.children) {
        total += computeNodeTotalTime(childId);
      }
    }

    totalTimeMap.set(nodeId, total);
    return total;
  }

  for (const node of nodes) {
    computeNodeTotalTime(node.id);
  }

  return totalTimeMap;
}

/**
 * Aggregate statistics per function (multiple nodes can map to same function).
 */
function aggregateFunctionStats(
  nodes: V8CpuProfileNode[],
  selfTimeMap: Map<number, number>,
  totalTimeMap: Map<number, number>,
  hitCountMap: Map<number, number>,
  totalTime: number,
  nodeMap: Map<number, V8CpuProfileNode>
): Map<string, FunctionStats> {
  const statsMap = new Map<string, FunctionStats>();

  for (const node of nodes) {
    const { functionName, url, lineNumber, columnNumber } = node.callFrame;
    const key = `${functionName}@${url}:${lineNumber}:${columnNumber}`;

    const selfTime = selfTimeMap.get(node.id) || 0;
    const totalTimeValue = totalTimeMap.get(node.id) || 0;
    const hitCount = hitCountMap.get(node.id) || 0;

    if (!statsMap.has(key)) {
      statsMap.set(key, {
        key,
        name: functionName,
        url,
        line: lineNumber,
        column: columnNumber,
        selfTime: 0,
        totalTime: 0,
        selfPercent: 0,
        totalPercent: 0,
        hitCount: 0,
        callers: new Set(),
        callees: new Set(),
      });
    }

    const stats = statsMap.get(key)!;
    stats.selfTime += selfTime;
    stats.totalTime += totalTimeValue;
    stats.hitCount += hitCount;

    // Track callers and callees
    if (node.parent !== undefined) {
      const parentNode = nodeMap.get(node.parent);
      if (parentNode) {
        const parentKey = `${parentNode.callFrame.functionName}@${parentNode.callFrame.url}:${parentNode.callFrame.lineNumber}:${parentNode.callFrame.columnNumber}`;
        stats.callers.add(parentKey);
      }
    }

    if (node.children) {
      for (const childId of node.children) {
        const childNode = nodeMap.get(childId);
        if (childNode) {
          const childKey = `${childNode.callFrame.functionName}@${childNode.callFrame.url}:${childNode.callFrame.lineNumber}:${childNode.callFrame.columnNumber}`;
          stats.callees.add(childKey);
        }
      }
    }
  }

  // Compute percentages
  for (const stats of statsMap.values()) {
    stats.selfPercent = totalTime > 0 ? (stats.selfTime / totalTime) * 100 : 0;
    stats.totalPercent = totalTime > 0 ? (stats.totalTime / totalTime) * 100 : 0;
  }

  return statsMap;
}

/**
 * Build a call tree starting from root node.
 */
function buildCallTree(
  rootNode: V8CpuProfileNode,
  nodeMap: Map<number, V8CpuProfileNode>,
  selfTimeMap: Map<number, number>,
  totalTimeMap: Map<number, number>,
  totalTime: number
): CallTreeNode {
  function buildNode(nodeId: number): CallTreeNode {
    const node = nodeMap.get(nodeId)!;
    const selfTime = selfTimeMap.get(nodeId) || 0;
    const totalTimeValue = totalTimeMap.get(nodeId) || 0;

    const treeNode: CallTreeNode = {
      name: node.callFrame.functionName,
      url: node.callFrame.url,
      line: node.callFrame.lineNumber,
      selfTime,
      totalTime: totalTimeValue,
      selfPercent: totalTime > 0 ? (selfTime / totalTime) * 100 : 0,
      totalPercent: totalTime > 0 ? (totalTimeValue / totalTime) * 100 : 0,
      children: [],
    };

    if (node.children) {
      treeNode.children = node.children
        .map(buildNode)
        .sort((a, b) => b.totalTime - a.totalTime);
    }

    return treeNode;
  }

  return buildNode(rootNode.id);
}

/**
 * Extract hotspots (functions with highest self-time).
 */
function extractHotspots(
  functionStats: Map<string, FunctionStats>,
  threshold: number,
  maxCount: number
): Hotspot[] {
  const hotspots: Hotspot[] = Array.from(functionStats.values())
    .filter((stats) => stats.selfPercent >= threshold)
    .sort((a, b) => b.selfTime - a.selfTime)
    .slice(0, maxCount)
    .map((stats) => ({
      ...stats,
      callers: Array.from(stats.callers),
      callees: Array.from(stats.callees),
      type: determineHotspotType(stats.url, stats.name),
    }));

  return hotspots;
}

/**
 * Determine if a function is native, application code, or unknown.
 */
function determineHotspotType(url: string, name: string): 'native' | 'app' | 'unknown' {
  if (!url || url === '' || url.startsWith('native ') || url.includes('(native)')) {
    return 'native';
  }
  if (url.includes('node_modules') || url.includes('internal/')) {
    return 'native';
  }
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('file://')) {
    return 'app';
  }
  if (url.includes('/') || url.includes('\\')) {
    return 'app';
  }
  return 'unknown';
}

/**
 * Find critical paths (heaviest paths from root to leaf).
 */
function findCriticalPaths(callTree: CallTreeNode, maxPaths: number): CriticalPath[] {
  const paths: CriticalPath[] = [];

  function traverse(node: CallTreeNode, path: PathNode[]): void {
    const pathNode: PathNode = {
      name: node.name,
      selfPercent: node.selfPercent,
      totalPercent: node.totalPercent,
    };

    const currentPath = [...path, pathNode];

    if (node.children.length === 0) {
      // Leaf node - record the path
      const cumulativePercent = currentPath.reduce(
        (sum, p) => sum + p.selfPercent,
        0
      );
      paths.push({ path: currentPath, cumulativePercent });
    } else {
      // Traverse children
      for (const child of node.children) {
        traverse(child, currentPath);
      }
    }
  }

  traverse(callTree, []);

  // Sort by cumulative percent and return top paths
  return paths
    .sort((a, b) => b.cumulativePercent - a.cumulativePercent)
    .slice(0, maxPaths);
}
