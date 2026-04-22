# Server 模式设计文档

## 背景

当前 `jav-organizer` 每次运行后立即退出。用户希望在后台持续运行，每隔一段时间自动扫描并整理源文件夹中的 JAV 文件。

## 目标

- 通过命令行参数启用 server 模式
- 启动后不退出，按可配置的时间间隔循环执行整理任务
- 默认间隔 15 分钟
- 首次启动立即执行一次
- 支持优雅退出（SIGINT / SIGTERM）

## 架构改动

```
┌─────────────┐      ┌──────────────┐      ┌─────────────┐
│  src/cli.js │─────▶│ src/server.js│─────▶│src/index.js │
│  参数解析    │      │ 调度循环      │      │ organize()  │
└─────────────┘      └──────────────┘      └─────────────┘
```

## CLI 参数

| 参数 | 类型 | 默认值 | 环境变量 | 说明 |
|------|------|--------|----------|------|
| `--server` | boolean | false | - | 启用 server 模式 |
| `--interval <n>` | number | 15 | `JAV_INTERVAL` | 执行间隔（分钟） |

示例：
```bash
node src/cli.js -s /source -t /target --server --interval 10
```

## `src/server.js` 详细设计

### 导出函数

```js
export async function startServer(source, target, concurrency, intervalMinutes, onProgress = null)
```

### 执行流程

1. 初始化 `shouldExit = false`，`round = 0`
2. 注册 `SIGINT` 和 `SIGTERM` 监听器：
   - 设置 `shouldExit = true`
   - 打印 "收到退出信号，当前轮次完成后将退出..."
3. 进入循环 `while (!shouldExit)`：
   - `round++`
   - 打印带时间戳的轮次开始日志：`[YYYY-MM-DD HH:mm:ss] 开始第 ${round} 轮整理...`
   - 调用 `organize(source, target, concurrency, onProgress)`
   - 捕获 organize 抛出的异常，打印错误但不终止循环
   - 打印轮次结束日志：`本轮整理完成，下次运行将在 ${intervalMinutes} 分钟后`
   - 如果 `shouldExit` 为 true，跳出循环
   - 否则 `await delay(intervalMinutes * 60 * 1000)`
4. 循环结束后打印退出日志：`Server 模式已停止`

### 防堆叠机制

使用 `while + setTimeout`（或 `node:timers/promises` 的 `setTimeout`）而非 `setInterval`，确保如果某次 `organize` 执行耗时超过间隔时间，也不会产生并发执行。

## `src/cli.js` 改动

1. 新增选项：
   ```js
   .option('--server', '启用 server 模式')
   .option('-i, --interval <n>', 'server 模式下的执行间隔（分钟）', process.env.JAV_INTERVAL || '15')
   ```
2. `main()` 函数中，文件夹验证逻辑之后：
   - 若 `options.server` 为 true：
     - 将 `interval` 解析为整数
     - 调用 `startServer(source, target, concurrency, interval, progressCallback)`
   - 否则保持现有单次运行逻辑

## 错误处理

- `organize` 内部已捕获单个文件夹的处理错误，不会抛出
- `server.js` 在调用 `organize` 外层再包一层 `try/catch`，防止不可预期的异常导致进程崩溃
- 源/目标文件夹验证仅在 server 启动时执行一次，运行期间若文件夹被删除，organize 会报错，server 继续等待下一轮

## 日志规范

Server 模式下每轮输出格式：

```
[2026-04-22 10:00:00] 开始第 1 轮整理...
开始整理...
源文件夹: /source
目标文件夹: /target
并发数: 5

...（原有 organize 输出）...

总计: 3 个文件夹
  移动成功: 2
  冲突: 1
本轮整理完成，下次运行将在 15 分钟后

[2026-04-22 10:15:00] 开始第 2 轮整理...
...
```

收到退出信号时：
```
收到退出信号，当前轮次完成后将退出...
```

## 测试策略

1. **server.js 单元测试**
   - 使用较短的间隔（如 100ms）模拟运行 3 轮
   - mock `organize` 函数，验证它被调用了 3 次
   - 验证传入的参数正确
   - 通过发送信号或设置标志位验证优雅退出逻辑

2. **CLI 集成测试**
   - 验证 `--server --interval 1` 能正确启动并运行至少 1 轮
   - 验证未加 `--server` 时仍为单次运行并立即退出

## 兼容性

- 不引入新的 npm 依赖
- Node.js >= 20
- 不影响现有单次运行行为
