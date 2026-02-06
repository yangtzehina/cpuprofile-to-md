// V8 CpuProfile raw types (from .cpuprofile JSON format)

export interface V8CpuProfileCallFrame {
  functionName: string;
  scriptId: string;
  url: string;
  lineNumber: number;
  columnNumber: number;
}

export interface V8CpuProfilePositionTick {
  line: number;
  ticks: number;
}

export interface V8CpuProfileNode {
  id: number;
  callFrame: V8CpuProfileCallFrame;
  hitCount?: number;
  children?: number[];
  parent?: number;
  positionTicks?: V8CpuProfilePositionTick[];
}

export interface V8CpuProfile {
  startTime: number;
  endTime: number;
  nodes: V8CpuProfileNode[];
  samples: number[];
  timeDeltas: number[];
}

// Analysis result types

export interface FunctionStats {
  key: string;
  name: string;
  url: string;
  line: number;
  column: number;
  selfTime: number;
  totalTime: number;
  selfPercent: number;
  totalPercent: number;
  hitCount: number;
  callers: Set<string>;
  callees: Set<string>;
}

export interface Hotspot {
  key: string;
  name: string;
  url: string;
  line: number;
  column: number;
  selfTime: number;
  totalTime: number;
  selfPercent: number;
  totalPercent: number;
  hitCount: number;
  callers: string[];
  callees: string[];
  type: 'native' | 'app' | 'unknown';
}

export interface CallTreeNode {
  name: string;
  url: string;
  line: number;
  selfTime: number;
  totalTime: number;
  selfPercent: number;
  totalPercent: number;
  children: CallTreeNode[];
}

export interface PathNode {
  name: string;
  selfPercent: number;
  totalPercent: number;
}

export interface CriticalPath {
  path: PathNode[];
  cumulativePercent: number;
}

export interface AnalysisResult {
  totalTime: number;
  totalSamples: number;
  sampleInterval: number;
  functionStats: Map<string, FunctionStats>;
  callTree: CallTreeNode;
  hotspots: Hotspot[];
  criticalPaths: CriticalPath[];
  startTime: number;
  endTime: number;
}

// Config types

export type FormatLevel = 'summary' | 'detailed' | 'adaptive';

export interface FormatOptions {
  profileName?: string;
  maxHotspots?: number;
  maxPaths?: number;
  sourceDir?: string;
  includeSource?: boolean;
  hotspotThreshold?: number;
}

export interface ConvertOptions extends FormatOptions {
  format?: FormatLevel;
}
