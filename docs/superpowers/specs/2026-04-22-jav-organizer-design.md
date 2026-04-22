# JAV 整理工具设计文档

> **日期:** 2026-04-22
> **状态:** 已确认

## 1. 项目概述

JAV 整理工具是一个 Node.js CLI 程序，用于自动整理用户的 JAV 视频文件。

**核心功能:**
- 扫描源文件夹下所有子文件夹
- 从文件夹名和文件名中提取标准番号
- 识别额外信息（中文字幕 `-C`、无码 `-U`、中文无码 `-UC`）
- 重命名文件夹和视频文件为标准格式
- 将整理后的子文件夹移动到目标文件夹
- 并发处理多个子文件夹（默认并发度 5）

## 2. 技术栈

- **运行时:** Node.js (推荐 v20+)
- **CLI 框架:** commander.js
- **测试框架:** Node.js 内置 `node:test` + `node:assert`
- **并发控制:** p-limit

## 3. 文件结构

```
.
├── src/
│   ├── cli.js           # CLI 入口（解析命令行参数）
│   ├── index.js         # 主流程编排
│   ├── extractor.js     # 番号提取器（纯函数）
│   ├── fileProcessor.js # 文件分类与新文件名生成
│   └── mover.js         # 重命名、移动、冲突检测
├── test/
│   ├── extractor.test.js
│   ├── fileProcessor.test.js
│   ├── mover.test.js
│   └── integration.test.js
├── docs/
│   └── superpowers/
│       └── specs/
│           └── 2026-04-22-jav-organizer-design.md
├── package.json
└── 需求.md
```

## 4. 核心模块设计

### 4.1 extractor.js — 番号提取器

**职责:** 从字符串中提取标准番号，识别额外信息。

**函数签名:**
```javascript
/**
 * 从文件名中提取番号和额外信息
 * @param {string} name - 文件名（预处理后的）
 * @returns {object|null} - { code: string, extra: string|null }
 *   code: 标准番号格式 "ABC-123"
 *   extra: "C" | "U" | "UC" | null
 */
function extractCode(name) {}
```

**预处理规则:**
- 将文件名中的 `_` 替换为 `-`

**番号匹配规则:**
- 从后向前搜索正则表达式: `[A-Z]{2,5}-?\d{3,4}`
- 匹配到后统一格式化为 `字母-数字` 格式
- 仅取第一个匹配结果

**额外信息识别:**
- 检查文件名中是否包含 `-C`、`-U`、`-UC` 后缀
- 取第一个匹配结果，忽略大小写

### 4.2 fileProcessor.js — 文件处理器

**职责:** 扫描子文件夹，分类文件，生成新的文件命名方案。

**常量:**
- 支持的视频扩展名: `['.mp4', '.avi', '.mkv', '.wmv', '.mov', '.flv', '.ts', '.m2ts']`

**函数签名:**
```javascript
/**
 * 处理单个文件夹，生成重命名方案
 * @param {string} folderPath - 源文件夹路径
 * @returns {object} - 处理结果
 *   {
 *     sourcePath: string,      // 原始文件夹路径
 *     newFolderName: string,   // 新文件夹名
 *     files: [{
 *       sourceName: string,    // 原始文件名
 *       newName: string,       // 新文件名
 *       isVideo: boolean       // 是否视频文件
 *     }],
 *     extraInfo: string|null,  // 额外信息
 *     status: 'ok' | 'no_code' | 'error'
 *   }
 */
async function processFolder(folderPath) {}
```

**多视频文件处理:**
- 当文件夹内有多个视频文件且番号相同时
- 按原始文件名排序（正序）
- 追加 `-CD{n}` 到文件名，n 从 1 开始

### 4.3 mover.js — 移动与冲突检测

**职责:** 执行文件重命名、文件夹重命名、移动操作，处理目标文件夹冲突。

**函数签名:**
```javascript
/**
 * 将整理好的文件夹移动到目标位置
 * @param {string} sourcePath - 源文件夹路径（已重命名后）
 * @param {string} targetPath - 目标文件夹路径
 * @returns {object} - { status: 'moved' | 'deleted' | 'conflict', message: string }
 */
async function moveFolder(sourcePath, targetPath) {}

/**
 * 检查两个文件夹内容是否完全相同（文件名+大小）
 * @param {string} dirA - 文件夹A
 * @param {string} dirB - 文件夹B
 * @returns {boolean}
 */
async function isContentIdentical(dirA, dirB) {}
```

**冲突处理逻辑:**
1. 如果目标文件夹不存在 → 直接移动
2. 如果目标文件夹已存在 → 比较两个文件夹内所有文件
   - 文件名和大小完全相同 → 删除源文件夹
   - 存在差异 → 返回冲突状态，提示用户，不做移动

### 4.4 cli.js — CLI 入口

**职责:** 解析命令行参数和环境变量，启动主流程。

**支持的参数:**

| CLI 参数 | 环境变量 | 必填 | 默认值 | 说明 |
|---------|---------|------|--------|------|
| `-s, --source <path>` | `JAV_SOURCE` | 是 | - | 源文件夹路径 |
| `-t, --target <path>` | `JAV_TARGET` | 是 | - | 目标文件夹路径 |
| `-c, --concurrency <n>` | `JAV_CONCURRENCY` | 否 | 5 | 并行处理数 |

**优先级:** CLI 参数 > 环境变量

### 4.5 index.js — 主流程编排

**主流程:**
1. 验证源文件夹和目标文件夹是否存在
2. 扫描源文件夹下所有 **一级子文件夹**
3. 使用 `p-limit` 控制并发度
4. 对每个子文件夹:
   - 调用 `processFolder()` 生成重命名方案
   - 执行文件重命名
   - 重命名文件夹
   - 调用 `moveFolder()` 移动到目标位置
5. 输出每个子文件夹的处理状态

**输出格式示例:**
```
[OK]   sis.com@ABC-123 → ABC-123
  - ABC-123-1080P.mp4 → ABC-123.mp4
  - 封面.jpg → 封面.jpg
[SKIP] xxx-folder → 未找到番号
[CONFLICT] DEF-456 → 目标文件夹已存在且内容不同
```

## 5. 番号格式与文件名示例

### 番号提取示例

| 原始名称 | 提取结果 |
|---------|---------|
| `sis.com@ABC-123` | `ABC-123` |
| `HDD800@ABC123` | `ABC-123` |
| `abc_site_ABP-123_1080p` | `ABP-123` |
| `DEF-456-C` | `DEF-456` + `C` |
| `GHI-789-UC.mp4` | `GHI-789` + `UC` |

### 新文件名规则

| 场景 | 文件夹名 | 视频文件名 |
|------|---------|-----------|
| 单视频，无额外信息 | `ABC-123` | `ABC-123.mp4` |
| 单视频，中文字幕 | `ABC-123-C` | `ABC-123-C.mp4` |
| 多视频，无额外信息 | `DEF-456` | `DEF-456-CD1.mp4`, `DEF-456-CD2.mp4` |
| 多视频，中文无码 | `GHI-789-UC` | `GHI-789-UC-CD1.mp4` |

## 6. 错误处理

### 错误场景
- **源文件夹不存在** → 程序退出，返回错误码 1
- **目标文件夹不存在** → 尝试创建，创建失败则退出
- **子文件夹内无番号** → 跳过该文件夹，输出 SKIP 状态
- **目标文件夹冲突** → 跳过该文件夹，输出 CONFLICT 状态
- **文件系统错误** → 输出 ERROR 状态，继续处理其他文件夹

### 输出规则
每个子文件夹处理完成后立即输出一行状态，格式统一:
```
[STATUS] 原文件夹名 → 新文件夹名 | 详情
```

## 7. 测试策略

### 单元测试（TDD）

**extractor.test.js:**
- 各种格式番号提取
- 额外信息识别（-C, -U, -UC）
- 无番号情况
- 下划线转横线预处理

**fileProcessor.test.js:**
- 单视频文件重命名
- 多视频文件排序与 CD 编号
- 非视频文件保留
- 额外信息追加

**mover.test.js:**
- 正常移动
- 目标已存在且内容相同 → 删除源
- 目标已存在且内容不同 → 冲突

### 集成测试

**integration.test.js:**
- 完整流程：创建测试目录结构 → 运行整理 → 验证结果

## 8. Spec Self-Review

### 8.1 占位符扫描
- [x] 无 "TBD"、"TODO"、"实现 later" 等占位符
- [x] 所有函数签名完整

### 8.2 内部一致性
- [x] 模块职责无重叠
- [x] 文件名生成规则与需求一致

### 8.3 范围检查
- [x] 聚焦单一功能：JAV 文件整理
- [x] 无超出需求的额外功能

### 8.4 歧义检查
- [x] 并发度默认值为 5
- [x] CD 编号从 1 开始
- [x] 额外信息仅支持 C/U/UC
- [x] 冲突比较基于文件名+文件大小
