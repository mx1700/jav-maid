import { extractCode } from './extractor.js';
import fs from 'node:fs/promises';
import path from 'node:path';

const VIDEO_EXTENSIONS = new Set([
  '.mp4', '.avi', '.mkv', '.wmv', '.mov', '.flv', '.ts', '.m2ts'
]);

function isVideoFile(filename) {
  const ext = path.extname(filename).toLowerCase();
  return VIDEO_EXTENSIONS.has(ext);
}

/**
 * 处理单个文件夹，生成重命名方案
 * @param {string} folderPath - 源文件夹路径
 * @returns {object} - 处理结果
 */
export async function processFolder(folderPath) {
  const folderName = path.basename(folderPath);
  const extracted = extractCode(folderName);

  if (!extracted) {
    return {
      sourcePath: folderPath,
      newFolderName: null,
      files: [],
      extraInfo: null,
      status: 'no_code'
    };
  }

  const entries = await fs.readdir(folderPath, { withFileTypes: true });
  const files = [];
  const videos = [];

  for (const entry of entries) {
    if (entry.isFile()) {
      const isVideo = isVideoFile(entry.name);
      files.push({
        sourceName: entry.name,
        newName: null,
        isVideo
      });
      if (isVideo) {
        videos.push({ name: entry.name, index: files.length - 1 });
      }
    }
  }

  const suffix = extracted.extra ? `-${extracted.extra}` : '';

  if (videos.length === 1) {
    const video = videos[0];
    const ext = path.extname(video.name);
    files[video.index].newName = `${extracted.code}${suffix}${ext}`;
  } else if (videos.length > 1) {
    // 多视频：按文件名排序，追加 CD 编号
    videos.sort((a, b) => a.name.localeCompare(b.name));
    videos.forEach((video, idx) => {
      const ext = path.extname(video.name);
      files[video.index].newName = `${extracted.code}${suffix}-CD${idx + 1}${ext}`;
    });
  }

  // 非视频文件保留原名
  for (const file of files) {
    if (!file.isVideo) {
      file.newName = file.sourceName;
    }
  }

  return {
    sourcePath: folderPath,
    newFolderName: `${extracted.code}${suffix}`,
    files,
    extraInfo: extracted.extra,
    status: 'ok'
  };
}
