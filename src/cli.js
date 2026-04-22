#!/usr/bin/env node
import { Command } from 'commander';
import { organize } from './index.js';
import { startServer } from './server.js';
import fs from 'node:fs/promises';

const program = new Command();

program
  .name('jav-organizer')
  .description('JAV 文件整理工具')
  .version('1.0.0')
  .requiredOption('-s, --source <path>', '源文件夹路径', process.env.JAV_SOURCE)
  .requiredOption('-t, --target <path>', '目标文件夹路径', process.env.JAV_TARGET)
  .option('-c, --concurrency <n>', '并行处理数', process.env.JAV_CONCURRENCY || '5')
  .option('--server', '启用 server 模式')
  .option('-i, --interval <n>', 'server 模式执行间隔（分钟）', process.env.JAV_INTERVAL || '15')
  .parse();

const options = program.opts();
const source = options.source;
const target = options.target;
const concurrency = parseInt(options.concurrency, 10);
const interval = parseInt(options.interval, 10);

async function main() {
  // 验证源文件夹存在
  try {
    const sourceStat = await fs.stat(source);
    if (!sourceStat.isDirectory()) {
      console.error(`错误: 源路径不是文件夹: ${source}`);
      process.exit(1);
    }
  } catch (err) {
    console.error(`错误: 源文件夹不存在: ${source}`);
    process.exit(1);
  }

  // 检查目标文件夹是否存在
  try {
    const targetStat = await fs.stat(target);
    if (!targetStat.isDirectory()) {
      console.error(`错误: 目标路径不是文件夹: ${target}`);
      process.exit(1);
    }
  } catch (err) {
    console.error(`错误: 目标文件夹不存在: ${target}`);
    process.exit(1);
  }

  console.log(`开始整理...\n源文件夹: ${source}\n目标文件夹: ${target}\n并发数: ${concurrency}\n`);

  const statusMap = {
    moved: ' [移动成功]',
    deleted: ' [已删除]',
    conflict: ' [冲突]',
    skipped: ' [跳过]'
  };

  const progressCallback = (result) => {
    const arrow = result.newFolderName ? ` → ${result.newFolderName}` : '';
    console.log(`${result.sourceName}${arrow}${statusMap[result.status] || ''}`);
    if (result.message) {
      console.log(`  └─ ${result.message}`);
    }
  };

  if (options.server) {
    console.log(`Server 模式已启动，间隔: ${interval} 分钟\n`);
    await startServer(source, target, concurrency, interval, progressCallback);
    return;
  }

  const results = await organize(source, target, concurrency, progressCallback);

  const summary = results.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1;
    return acc;
  }, {});

  console.log(`\n总计: ${results.length} 个文件夹`);
  console.log(`  移动成功: ${summary.moved || 0}`);
  console.log(`  已删除: ${summary.deleted || 0}`);
  console.log(`  冲突: ${summary.conflict || 0}`);
  console.log(`  跳过: ${summary.skipped || 0}`);
}

main().catch(err => {
  console.error('发生错误:', err.message);
  process.exit(1);
});
