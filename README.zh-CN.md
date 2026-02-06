[English](./README.md) | 简体中文

# cpuprofile-to-md

将 V8 CPU 性能分析文件（`.cpuprofile`）转换为 LLM 友好的 Markdown 格式，便于 AI 辅助性能分析。

灵感来源于 [platformatic/pprof-to-md](https://github.com/platformatic/pprof-to-md)，但面向 Node.js（`--cpu-prof`）、Chrome DevTools 和 Chromium 性能追踪中使用的 V8 `.cpuprofile` JSON 格式。

## 特性

- **零依赖** - 纯 Node.js 实现
- **多种输出格式** - 摘要（Summary）、详细（Detailed）和自适应（Adaptive，默认）
- **智能分析** - 识别热点、关键路径和 GC 压力
- **源码上下文** - 可选在热点位置展示源码片段
- **原生 TypeScript** - 使用 Node.js 22.6+ 原生类型剥离
- **格式灵活** - 处理多种 `.cpuprofile` 变体（head-based 树、parent 字段、Chromium traces）

## 安装

```bash
npm install cpuprofile-to-md
```

或使用 `npx` 直接运行：

```bash
npx cpuprofile-to-md profile.cpuprofile
```

## 环境要求

- Node.js >= 22.6.0（需要原生 TypeScript 支持）

## 使用方法

### 命令行

```bash
# 基本用法（自适应格式输出到标准输出）
cpuprofile-to-md profile.cpuprofile

# 摘要格式
cpuprofile-to-md -f summary profile.cpuprofile

# 保存到文件
cpuprofile-to-md profile.cpuprofile -o analysis.md

# 包含源码上下文
cpuprofile-to-md -s ./src --include-source profile.cpuprofile

# 自定义热点阈值
cpuprofile-to-md --hotspot-threshold 2.0 profile.cpuprofile
```

#### 命令行选项

- `-f, --format <level>` - 输出格式：`summary`、`detailed` 或 `adaptive`（默认：`adaptive`）
- `-o, --output <file>` - 输出文件路径（默认：标准输出）
- `-s, --source-dir <dir>` - 源码目录，用于代码上下文解析
- `--include-source` - 在输出中包含源码片段
- `--max-hotspots <n>` - 最大热点数量（默认：20）
- `--max-paths <n>` - 最大关键路径数（默认：5）
- `--hotspot-threshold <n>` - 热点纳入的最低 self%（默认：1.0）
- `-h, --help` - 显示帮助信息

### 库 API

```typescript
import { convert, parseProfile, analyzeProfile, format } from 'cpuprofile-to-md';

// 一步转换
const markdown = convert('./profile.cpuprofile', {
  format: 'adaptive',
  maxHotspots: 10,
  sourceDir: './src',
  includeSource: true
});

// 分步操作以获得更多控制
const profile = parseProfile('./profile.cpuprofile');
const analysis = analyzeProfile(profile, {
  hotspotThreshold: 2.0,
  maxHotspots: 15
});
const markdown = format(analysis, 'detailed', {
  profileName: 'My App Profile'
});
```

## 输出格式

### 摘要（Summary）

紧凑的概览，适用于快速分流：
- 性能分析元数据（持续时间、采样数、采样间隔）
- 热点排行表
- 关键执行路径
- 自动生成的关键观察

### 详细（Detailed）

完整分析，包含：
- 完整元数据
- 带注释的调用树（文本火焰图）
- 每个热点的函数详情（调用者、被调用者）
- 所有函数的统计信息

### 自适应（Adaptive，默认）

结合摘要与深入分析：
- 执行摘要与优化评估
- 带有跳转链接的热点排行
- 关键路径
- 带锚点的详细分析区
- 每个热点的洞察和源码（如启用）

## 生成 CPU 性能分析文件

### Node.js

```bash
# 使用 --cpu-prof 标志
node --cpu-prof your-app.js

# 使用 --cpu-prof 并设置自定义采样间隔
node --cpu-prof --cpu-prof-interval 100 your-app.js
```

### Chrome DevTools

1. 打开开发者工具（F12）
2. 切换到"性能（Performance）"面板
3. 点击"录制"，执行操作后点击"停止"
4. 点击"保存性能分析文件..."

### 编程方式

```javascript
const { Session } = require('inspector');
const { writeFileSync } = require('fs');

const session = new Session();
session.connect();

session.post('Profiler.enable');
session.post('Profiler.start');

// 你的代码...

session.post('Profiler.stop', (err, { profile }) => {
  writeFileSync('profile.cpuprofile', JSON.stringify(profile));
  session.disconnect();
});
```

## 架构

该库采用四阶段流水线：

```
.cpuprofile (JSON) → 解析 → 分析 → 格式化 → Markdown 输出
```

1. **解析**（`src/parser.ts`）- 解析 `.cpuprofile` JSON，处理不同变体（head-based、parent 字段、Chromium trace）
2. **分析**（`src/analyzer.ts`）- 计算 self-time、total-time，汇总每个函数的统计信息，构建调用树，提取热点，查找关键路径
3. **格式化**（`src/formatter/`）- 路由到对应的格式化器并生成 Markdown
4. **输出** - 包含热点、洞察和可选源码上下文的 Markdown

## 开发

```bash
# 生成测试性能分析文件
npm run generate-profiles

# 运行测试
npm test

# 在本地使用 CLI
node --experimental-strip-types src/cli.ts test/simple.cpuprofile
```

## 许可证

Apache-2.0

## 贡献

欢迎贡献！请提交 Issue 或 PR。
