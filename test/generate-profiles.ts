/**
 * Generate test CPU profile files for testing.
 * 
 * This script creates synthetic .cpuprofile files that can be used to test
 * the parser, analyzer, and formatter.
 */

import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Generate a simple CPU profile for testing.
 */
function generateSimpleProfile() {
  const profile = {
    startTime: 1000000,
    endTime: 2000000,
    nodes: [
      {
        id: 1,
        callFrame: {
          functionName: '(root)',
          scriptId: '0',
          url: '',
          lineNumber: 0,
          columnNumber: 0,
        },
        hitCount: 0,
        children: [2, 3],
      },
      {
        id: 2,
        callFrame: {
          functionName: 'main',
          scriptId: '1',
          url: 'file:///app/index.js',
          lineNumber: 10,
          columnNumber: 5,
        },
        hitCount: 5,
        children: [4, 5],
        parent: 1,
      },
      {
        id: 3,
        callFrame: {
          functionName: 'startup',
          scriptId: '1',
          url: 'file:///app/index.js',
          lineNumber: 1,
          columnNumber: 0,
        },
        hitCount: 2,
        children: [],
        parent: 1,
      },
      {
        id: 4,
        callFrame: {
          functionName: 'heavyComputation',
          scriptId: '2',
          url: 'file:///app/compute.js',
          lineNumber: 25,
          columnNumber: 10,
        },
        hitCount: 30,
        children: [6],
        parent: 2,
      },
      {
        id: 5,
        callFrame: {
          functionName: 'lightOperation',
          scriptId: '2',
          url: 'file:///app/compute.js',
          lineNumber: 50,
          columnNumber: 5,
        },
        hitCount: 3,
        children: [],
        parent: 2,
      },
      {
        id: 6,
        callFrame: {
          functionName: 'innerLoop',
          scriptId: '2',
          url: 'file:///app/compute.js',
          lineNumber: 30,
          columnNumber: 15,
        },
        hitCount: 20,
        children: [],
        parent: 4,
      },
    ],
    samples: [1, 2, 2, 2, 2, 2, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 5, 5, 5, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6],
    timeDeltas: Array(60).fill(1000),
  };

  return profile;
}

/**
 * Generate a profile with GC activity.
 */
function generateGCProfile() {
  const profile = {
    startTime: 2000000,
    endTime: 3000000,
    nodes: [
      {
        id: 1,
        callFrame: {
          functionName: '(root)',
          scriptId: '0',
          url: '',
          lineNumber: 0,
          columnNumber: 0,
        },
        hitCount: 0,
        children: [2, 3],
      },
      {
        id: 2,
        callFrame: {
          functionName: 'allocateObjects',
          scriptId: '1',
          url: 'file:///app/memory.js',
          lineNumber: 15,
          columnNumber: 0,
        },
        hitCount: 10,
        children: [4],
        parent: 1,
      },
      {
        id: 3,
        callFrame: {
          functionName: 'GC',
          scriptId: '0',
          url: 'native',
          lineNumber: 0,
          columnNumber: 0,
        },
        hitCount: 25,
        children: [5],
        parent: 1,
      },
      {
        id: 4,
        callFrame: {
          functionName: 'createArray',
          scriptId: '1',
          url: 'file:///app/memory.js',
          lineNumber: 20,
          columnNumber: 5,
        },
        hitCount: 15,
        children: [],
        parent: 2,
      },
      {
        id: 5,
        callFrame: {
          functionName: 'Scavenge',
          scriptId: '0',
          url: 'native',
          lineNumber: 0,
          columnNumber: 0,
        },
        hitCount: 20,
        children: [],
        parent: 3,
      },
    ],
    samples: [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5],
    timeDeltas: Array(70).fill(1000),
  };

  return profile;
}

/**
 * Generate a profile with native functions.
 */
function generateNativeProfile() {
  const profile = {
    startTime: 3000000,
    endTime: 4000000,
    nodes: [
      {
        id: 1,
        callFrame: {
          functionName: '(root)',
          scriptId: '0',
          url: '',
          lineNumber: 0,
          columnNumber: 0,
        },
        hitCount: 0,
        children: [2],
      },
      {
        id: 2,
        callFrame: {
          functionName: 'processData',
          scriptId: '1',
          url: 'file:///app/processor.js',
          lineNumber: 100,
          columnNumber: 0,
        },
        hitCount: 5,
        children: [3, 4],
        parent: 1,
      },
      {
        id: 3,
        callFrame: {
          functionName: 'JSON.parse',
          scriptId: '0',
          url: 'native',
          lineNumber: 0,
          columnNumber: 0,
        },
        hitCount: 20,
        children: [],
        parent: 2,
      },
      {
        id: 4,
        callFrame: {
          functionName: 'Buffer.from',
          scriptId: '0',
          url: 'native buffer',
          lineNumber: 0,
          columnNumber: 0,
        },
        hitCount: 15,
        children: [],
        parent: 2,
      },
    ],
    samples: [2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
    timeDeltas: Array(40).fill(1000),
  };

  return profile;
}

// Generate profiles
const testDir = new URL('.', import.meta.url).pathname;

try {
  const simpleProfile = generateSimpleProfile();
  writeFileSync(
    join(testDir, 'simple.cpuprofile'),
    JSON.stringify(simpleProfile, null, 2),
    'utf-8'
  );
  console.log('✓ Generated simple.cpuprofile');

  const gcProfile = generateGCProfile();
  writeFileSync(
    join(testDir, 'gc-pressure.cpuprofile'),
    JSON.stringify(gcProfile, null, 2),
    'utf-8'
  );
  console.log('✓ Generated gc-pressure.cpuprofile');

  const nativeProfile = generateNativeProfile();
  writeFileSync(
    join(testDir, 'native-calls.cpuprofile'),
    JSON.stringify(nativeProfile, null, 2),
    'utf-8'
  );
  console.log('✓ Generated native-calls.cpuprofile');

  console.log('\nTest profiles generated successfully!');
} catch (error) {
  console.error('Error generating profiles:', error);
  process.exit(1);
}
