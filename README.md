# jav-organizer

JAV 文件整理工具

## 功能特点

- 支持主流番号格式提取
- 支持从后向前部分匹配
- 自动识别中文字幕 (-C)、无码 (-U)、中文无码 (-UC)
- 多视频文件识别 CD 顺序
- 并行处理多个文件夹
- 目标文件夹已存在时自动检测冲突
- 支持 **Server 模式**：后台定时循环执行整理任务

## 使用方法

### 单次运行

```bash
# 基本用法
jav-organizer -s <源文件夹> -t <目标文件夹>

# 指定并发数
jav-organizer -s /path/to/source -t /path/to/target -c 10
```

### Server 模式

启动后不退出，按指定间隔循环执行整理任务。首次启动立即执行一次。

```bash
# Server 模式（默认间隔 15 分钟）
jav-organizer -s /path/to/source -t /path/to/target --server

# 自定义间隔（分钟）
jav-organizer -s /path/to/source -t /path/to/target --server --interval 10
```

### 环境变量

也支持通过环境变量配置：
- `JAV_SOURCE`: 源文件夹路径
- `JAV_TARGET`: 目标文件夹路径
- `JAV_CONCURRENCY`: 并发数 (默认 5)
- `JAV_INTERVAL`: Server 模式间隔分钟数 (默认 15)

### 进程信号

Server 模式下支持以下信号优雅退出（当前轮次完成后退出）：
- `SIGINT` (Ctrl+C)
- `SIGTERM`

## 单文件夹处理流程

```mermaid
flowchart TD
    A[开始] --> B[提取文件夹名中的番号]
    B --> C{是否提取到番号?}
    C -->|否| D[跳过该文件夹]
    C -->|是| E[扫描文件夹内所有文件]
    E --> F[识别视频文件]
    F --> G{视频文件数量?}
    G -->|0| H[保留所有文件原样]
    G -->|1| I[重命名为 番号.mp4]
    G -->|>1| J[按文件名排序后<br/>重命名为 番号-CD1.mp4, 番号-CD2.mp4...]
    H --> K[生成新文件夹名<br/>番号 / 番号-C / 番号-U / 番号-UC]
    I --> K
    J --> K
    K --> L{目标位置是否<br/>已存在同名文件夹?}
    L -->|否| M[移动文件夹到目标位置]
    L -->|是| N[对比源和目标<br/>文件夹内容]
    N --> O{内容是否完全相同?}
    O -->|是| P[删除源文件夹]
    O -->|否| Q[标记为冲突，保留源文件夹]
    D --> R[结束]
    M --> R
    P --> R
    Q --> R
```

## 本地开发

```bash
npm install
npm test
npm start -- -s <源文件夹> -t <目标文件夹>
```

## Docker 使用

```bash
# 构建镜像
docker build -t jav-organizer .

# 单次运行
docker run -v /path/to/source:/source -v /path/to/target:/target jav-organizer -s /source -t /target

# Server 模式
docker run -v /path/to/source:/source -v /path/to/target:/target jav-organizer -s /source -t /target --server --interval 15
```

## Docker 镜像

镜像发布在 GitHub Container Registry:
- `ghcr.io/{owner}/jav-organizer:latest`
- `ghcr.io/{owner}/jav-organizer:{version}`

## 发布流程

```bash
git tag v1.0.0
git push origin v1.0.0
```
