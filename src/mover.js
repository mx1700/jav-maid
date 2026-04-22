import fs from 'node:fs/promises';
import path from 'node:path';

/**
 * 检查两个文件夹内容是否完全相同（文件名+大小）
 */
export async function isContentIdentical(dirA, dirB) {
  const filesA = await fs.readdir(dirA);
  const filesB = await fs.readdir(dirB);

  if (filesA.length !== filesB.length) {
    return false;
  }

  filesA.sort();
  filesB.sort();

  for (let i = 0; i < filesA.length; i++) {
    if (filesA[i] !== filesB[i]) {
      return false;
    }

    const fileAPath = path.join(dirA, filesA[i]);
    const fileBPath = path.join(dirB, filesB[i]);
    const statA = await fs.stat(fileAPath);
    const statB = await fs.stat(fileBPath);

    if (statA.size !== statB.size) {
      return false;
    }
  }

  return true;
}

/**
 * 将整理好的文件夹移动到目标位置
 * @param {string} sourcePath - 源文件夹路径
 * @param {string} targetPath - 目标文件夹路径
 * @param {string|null} conflictDir - 冲突文件夹路径（可选）
 */
export async function moveFolder(sourcePath, targetPath, conflictDir = null) {
  const targetExists = await fs.access(targetPath)
    .then(() => true)
    .catch(() => false);

  if (targetExists) {
    const identical = await isContentIdentical(sourcePath, targetPath);
    if (identical) {
      await fs.rm(sourcePath, { recursive: true, force: true });
      return { status: 'deleted', message: '目标已存在且内容相同，已删除源文件夹' };
    } else if (conflictDir) {
      // 目标存在且内容不同，移动到冲突文件夹
      const folderName = path.basename(sourcePath);
      const conflictPath = path.join(conflictDir, folderName);
      const conflictExists = await fs.access(conflictPath)
        .then(() => true)
        .catch(() => false);

      if (conflictExists) {
        const conflictIdentical = await isContentIdentical(sourcePath, conflictPath);
        if (conflictIdentical) {
          await fs.rm(sourcePath, { recursive: true, force: true });
          return { status: 'deleted', message: '冲突文件夹已存在且内容相同，已删除源文件夹' };
        } else {
          return { status: 'conflict', message: '冲突文件夹已存在且内容不同，无法移动' };
        }
      }

      await fs.mkdir(conflictDir, { recursive: true });
      await fs.rename(sourcePath, conflictPath);
      return { status: 'moved_to_conflict', message: `已移动到冲突文件夹: ${conflictPath}` };
    } else {
      return { status: 'conflict', message: '目标文件夹已存在且内容不同' };
    }
  }

  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  await fs.rename(sourcePath, targetPath);
  return { status: 'moved', message: '移动成功' };
}
