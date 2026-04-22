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
 */
export async function moveFolder(sourcePath, targetPath) {
  const targetExists = await fs.access(targetPath)
    .then(() => true)
    .catch(() => false);

  if (targetExists) {
    const identical = await isContentIdentical(sourcePath, targetPath);
    if (identical) {
      await fs.rm(sourcePath, { recursive: true, force: true });
      return { status: 'deleted', message: '目标已存在且内容相同，已删除源文件夹' };
    } else {
      return { status: 'conflict', message: '目标文件夹已存在且内容不同' };
    }
  }

  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  await fs.rename(sourcePath, targetPath);
  return { status: 'moved', message: '移动成功' };
}
