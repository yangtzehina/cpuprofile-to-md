/**
 * Basic tests for cpuprofile-to-md
 */

import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { parseProfile } from '../src/parser.ts';
import { analyzeProfile } from '../src/analyzer.ts';
import { convert } from '../src/index.ts';

test('parseProfile should parse a valid .cpuprofile', () => {
  const profileData = {
    startTime: 1000,
    endTime: 2000,
    nodes: [
      {
        id: 1,
        callFrame: {
          functionName: 'main',
          scriptId: '1',
          url: 'test.js',
          lineNumber: 1,
          columnNumber: 0,
        },
        hitCount: 10,
        children: [],
      },
    ],
    samples: [1, 1, 1, 1, 1],
    timeDeltas: [100, 100, 100, 100, 100],
  };

  const profile = parseProfile(JSON.stringify(profileData));
  
  assert.equal(profile.startTime, 1000);
  assert.equal(profile.endTime, 2000);
  assert.equal(profile.nodes.length, 1);
  assert.equal(profile.samples.length, 5);
  assert.equal(profile.timeDeltas.length, 5);
});

test('parseProfile should handle gzipped input', async () => {
  const { gzipSync } = await import('node:zlib');
  
  const profileData = {
    startTime: 1000,
    endTime: 2000,
    nodes: [
      {
        id: 1,
        callFrame: {
          functionName: 'main',
          scriptId: '1',
          url: 'test.js',
          lineNumber: 1,
          columnNumber: 0,
        },
        hitCount: 5,
        children: [],
      },
    ],
    samples: [1, 1, 1],
    timeDeltas: [100, 100, 100],
  };

  const gzipped = gzipSync(Buffer.from(JSON.stringify(profileData)));
  const profile = parseProfile(gzipped);
  
  assert.equal(profile.nodes.length, 1);
  assert.equal(profile.samples.length, 3);
});

test('parseProfile should throw on invalid JSON', () => {
  assert.throws(() => {
    parseProfile('invalid json');
  }, /Invalid JSON/);
});

test('parseProfile should throw on missing required fields', () => {
  assert.throws(() => {
    parseProfile(JSON.stringify({ startTime: 1000 }));
  }, /missing or invalid/);
});

test('analyzeProfile should compute statistics', () => {
  const profile = {
    startTime: 1000,
    endTime: 2000,
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
          functionName: 'testFunc',
          scriptId: '1',
          url: 'test.js',
          lineNumber: 10,
          columnNumber: 0,
        },
        hitCount: 10,
        children: [],
        parent: 1,
      },
    ],
    samples: [2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
    timeDeltas: [100, 100, 100, 100, 100, 100, 100, 100, 100, 100],
  };

  const result = analyzeProfile(profile);
  
  assert.equal(result.totalTime, 1000);
  assert.equal(result.totalSamples, 10);
  assert.equal(result.sampleInterval, 100);
  assert.ok(result.functionStats.size > 0);
  assert.ok(result.callTree);
  assert.ok(Array.isArray(result.hotspots));
  assert.ok(Array.isArray(result.criticalPaths));
});

test('convert should produce markdown output', () => {
  const profileData = {
    startTime: 1000,
    endTime: 2000,
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
          functionName: 'testFunc',
          scriptId: '1',
          url: 'test.js',
          lineNumber: 10,
          columnNumber: 0,
        },
        hitCount: 10,
        children: [],
        parent: 1,
      },
    ],
    samples: [2, 2, 2, 2, 2],
    timeDeltas: [100, 100, 100, 100, 100],
  };

  const markdown = convert(JSON.stringify(profileData));
  
  assert.ok(markdown.includes('#'));
  assert.ok(markdown.includes('Performance Analysis'));
  assert.ok(typeof markdown === 'string');
  assert.ok(markdown.length > 0);
});

test('convert should support different format levels', () => {
  const profileData = {
    startTime: 1000,
    endTime: 2000,
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
          functionName: 'testFunc',
          scriptId: '1',
          url: 'test.js',
          lineNumber: 10,
          columnNumber: 0,
        },
        hitCount: 10,
        children: [],
        parent: 1,
      },
    ],
    samples: [2, 2, 2, 2, 2],
    timeDeltas: [100, 100, 100, 100, 100],
  };

  const summary = convert(JSON.stringify(profileData), { format: 'summary' });
  const detailed = convert(JSON.stringify(profileData), { format: 'detailed' });
  const adaptive = convert(JSON.stringify(profileData), { format: 'adaptive' });
  
  // Summary format checks
  assert.ok(summary.includes('Summary'));
  assert.ok(summary.includes('## Top Hotspots'));
  assert.ok(summary.includes('| Rank | Function |'));
  
  // Detailed format checks
  assert.ok(detailed.includes('Detailed'));
  assert.ok(detailed.includes('## Call Tree'));
  assert.ok(detailed.includes('Text-based flame graph'));
  
  // Adaptive format checks
  assert.ok(adaptive.includes('Performance Analysis'));
  assert.ok(adaptive.includes('## Executive Summary'));
  assert.ok(adaptive.includes('→ Details'));
});
