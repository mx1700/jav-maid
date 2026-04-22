import { setTimeout } from 'node:timers/promises';
import { organize as defaultOrganize } from './index.js';

export async function startServer(source, target, concurrency, intervalMinutes, onProgress = null, { signal, organize = defaultOrganize } = {}) {
  let round = 0;
  const controller = new AbortController();

  const handleExit = () => {
    console.log('\n收到退出信号，当前轮次完成后将退出...');
    controller.abort();
  };

  process.on('SIGINT', handleExit);
  process.on('SIGTERM', handleExit);

  if (signal) {
    signal.addEventListener('abort', handleExit);
  }

  try {
    while (true) {
      round++;
      const now = new Date().toLocaleString('zh-CN');
      console.log(`\n[${now}] 开始第 ${round} 轮整理...`);

      try {
        await organize(source, target, concurrency, onProgress);
      } catch (err) {
        console.error(`第 ${round} 轮整理发生错误:`, err.message);
      }

      console.log(`本轮整理完成，下次运行将在 ${intervalMinutes} 分钟后`);

      const delayMs = Math.max(0, intervalMinutes * 60 * 1000);
      try {
        await setTimeout(delayMs, undefined, { signal: controller.signal });
      } catch (err) {
        if (err.name === 'AbortError') break;
        throw err;
      }
    }
  } finally {
    process.off('SIGINT', handleExit);
    process.off('SIGTERM', handleExit);
  }

  console.log('Server 模式已停止');
}
