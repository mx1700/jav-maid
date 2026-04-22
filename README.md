# jav-organizer

JAV 文件整理工具

## 技术栈

Node.js CLI 程序

## 功能特点

- 支持主流番号格式提取
- 支持从后向前部分匹配
- 自动识别中文字幕 (-C)、无码 (-U)、中文无码 (-UC)
- 多视频文件识别CD顺序
- 并行处理多个文件夹
- 目标文件夹已存在时自动检测冲突

## 使用方法

```bash
# 基本用法
jav-organizer -s <源文件夹> -t <目标文件夹>

# 指定并发数
jav-organizer -s /path/to/source -t /path/to/target -c 10
```

也支持环境变量:
- `JAV_SOURCE`: 源文件夹路径
- `JAV_TARGET`: 目标文件夹路径
- `JAV_CONCURRENCY`: 并发数 (默认 5)

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

# 运行
docker run -v /path/to/source:/source -v /path/to/target:/target jav-organizer -s /source -t /target
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