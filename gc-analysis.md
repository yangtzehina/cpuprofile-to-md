# test/gc-pressure.cpuprofile - Performance Analysis

## Executive Summary

**Primary bottleneck**: `GC` accounts for **35.71%** of execution time. **Secondary bottleneck**: `Scavenge` accounts for **28.57%** of execution time. 
**Optimization potential**: High - top 4 functions account for 100.00% of execution time.

## Profile Overview

- **Duration**: 70.00ms
- **Samples**: 70
- **Sample Interval**: 1.00ms

## Top Hotspots

| Rank | Function | Self% | Total% | Type | Details |
| ---: | :--- | ---: | ---: | :--- | :---: |
| 1 | GC | 35.71% | 64.29% | unknown | [→ Details](#hotspot-1-gc) |
| 2 | Scavenge | 28.57% | 28.57% | unknown | [→ Details](#hotspot-2-scavenge) |
| 3 | createArray | 21.43% | 21.43% | app | [→ Details](#hotspot-3-createarray) |
| 4 | allocateObjects | 14.29% | 35.71% | app | [→ Details](#hotspot-4-allocateobjects) |

## Critical Execution Paths

The heaviest call paths from root to leaf:

### Path 1

**Cumulative Impact**: 64.29%

`(root)`
  *(self: 0.00%, total: 100.00%)*
  → `GC`
    *(self: 35.71%, total: 64.29%)*
    → `Scavenge`
      *(self: 28.57%, total: 28.57%)*

### Path 2

**Cumulative Impact**: 35.71%

`(root)`
  *(self: 0.00%, total: 100.00%)*
  → `allocateObjects`
    *(self: 14.29%, total: 35.71%)*
    → `createArray`
      *(self: 21.43%, total: 21.43%)*

---

## Detailed Analysis

<a id="hotspot-1-gc"></a>

### 1. GC

**Metadata**:
- Location: `native:0`
- Type: unknown
- Self Time: 25.00ms (35.71%)
- Total Time: 45.00ms (64.29%)
- Samples: 25

**Call Context**:

*Called by*:
- `(root)`

*Calls*:
- `Scavenge`

**Insights**:
- This is a garbage collection function. Consider reducing object allocations or adjusting heap size.

---

<a id="hotspot-2-scavenge"></a>

### 2. Scavenge

**Metadata**:
- Location: `native:0`
- Type: unknown
- Self Time: 20.00ms (28.57%)
- Total Time: 20.00ms (28.57%)
- Samples: 20

**Call Context**:

*Called by*:
- `GC`

**Insights**:
- This function spends most of its time in self-execution rather than calling other functions. Focus optimization efforts here.
- This is a garbage collection function. Consider reducing object allocations or adjusting heap size.

---

<a id="hotspot-3-createarray"></a>

### 3. createArray

**Metadata**:
- Location: `memory.js:20`
- Type: app
- Self Time: 15.00ms (21.43%)
- Total Time: 15.00ms (21.43%)
- Samples: 15

**Call Context**:

*Called by*:
- `allocateObjects`

**Insights**:
- This function spends most of its time in self-execution rather than calling other functions. Focus optimization efforts here.

---

<a id="hotspot-4-allocateobjects"></a>

### 4. allocateObjects

**Metadata**:
- Location: `memory.js:15`
- Type: app
- Self Time: 10.00ms (14.29%)
- Total Time: 25.00ms (35.71%)
- Samples: 10

**Call Context**:

*Called by*:
- `(root)`

*Calls*:
- `createArray`

---
