import fs from 'node:fs/promises';
import path from 'node:path';
import pLimit from 'p-limit';
import { processFolder } from './fileProcessor.js';
import { moveFolder } from './mover.js';

export async function organize(sourceDir, targetDir, concurrency = 5, onProgress = null, conflictDir = null) {
  const results = [];
  const limit = pLimit(concurrency);

  // 扫描源文件夹下所有一级子文件夹
  const entries = await fs.readdir(sourceDir, { withFileTypes: true });
  const folders = entries
    .filter(entry => entry.isDirectory())
    .map(entry => path.join(sourceDir, entry.name));

  // 并行处理
  const tasks = folders.map(folderPath =>
    limit(async () => {
      const folderName = path.basename(folderPath);

      try {
        const processed = await processFolder(folderPath);

        if (processed.status === 'no_code') {
          const result = {
            sourceName: folderName,
            newFolderName: null,
            status: 'skipped',
            message: '未找到番号'
          };
          results.push(result);
          if (onProgress) onProgress(result);
          return;
        }

        // 重命名文件
        for (const file of processed.files) {
          if (file.newName && file.newName !== file.sourceName) {
            const oldPath = path.join(folderPath, file.sourceName);
            const newPath = path.join(folderPath, file.newName);
            await fs.rename(oldPath, newPath);
          }
        }

        // 重命名文件夹
        const newFolderPath = path.join(sourceDir, processed.newFolderName);
        if (newFolderPath !== folderPath) {
          await fs.rename(folderPath, newFolderPath);
        }

        // 移动到目标
        const targetPath = path.join(targetDir, processed.newFolderName);
        const moveResult = await moveFolder(newFolderPath, targetPath, conflictDir);

        const result = {
          sourceName: folderName,
          newFolderName: processed.newFolderName,
          status: moveResult.status,
          message: moveResult.message
        };
        results.push(result);

        if (onProgress) {
          onProgress(result);
        }
      } catch (err) {
        const result = {
          sourceName: folderName,
          newFolderName: null,
          status: 'error',
          message: err.message
        };
        results.push(result);
        if (onProgress) onProgress(result);
      }
    })
  );

  await Promise.all(tasks);
  return results;
}
