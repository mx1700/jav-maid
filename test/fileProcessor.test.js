import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { processFolder } from '../src/fileProcessor.js';

async function createTempDir() {
  return await fs.mkdtemp(path.join(os.tmpdir(), 'jav-test-'));
}

describe('fileProcessor', () => {
  it('should process folder with single video', async () => {
    const tempDir = await createTempDir();
    const folderPath = path.join(tempDir, 'sis.com@ABC-123');
    await fs.mkdir(folderPath, { recursive: true });
    await fs.writeFile(path.join(folderPath, 'ABC-123-1080P.mp4'), 'fake-video-content');
    await fs.writeFile(path.join(folderPath, '封面.jpg'), 'fake-image-content');

    const result = await processFolder(folderPath);

    assert.strictEqual(result.newFolderName, 'ABC-123');
    assert.strictEqual(result.files.length, 2);
    const videoFile = result.files.find(f => f.isVideo);
    assert.strictEqual(videoFile.newName, 'ABC-123.mp4');
    assert.strictEqual(result.status, 'ok');

    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('should process folder with multiple videos', async () => {
    const tempDir = await createTempDir();
    const folderPath = path.join(tempDir, 'DEF-456');
    await fs.mkdir(folderPath, { recursive: true });
    await fs.writeFile(path.join(folderPath, 'DEF-456-B.mp4'), 'video2');
    await fs.writeFile(path.join(folderPath, 'DEF-456-A.mp4'), 'video1');

    const result = await processFolder(folderPath);

    assert.strictEqual(result.newFolderName, 'DEF-456');
    assert.strictEqual(result.files.length, 2);
    const videoA = result.files.find(f => f.sourceName === 'DEF-456-A.mp4');
    const videoB = result.files.find(f => f.sourceName === 'DEF-456-B.mp4');
    assert.strictEqual(videoA.newName, 'DEF-456-CD1.mp4');
    assert.strictEqual(videoB.newName, 'DEF-456-CD2.mp4');

    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('should handle extra info -C', async () => {
    const tempDir = await createTempDir();
    const folderPath = path.join(tempDir, 'ABC-123-C');
    await fs.mkdir(folderPath, { recursive: true });
    await fs.writeFile(path.join(folderPath, 'video.mp4'), 'v');

    const result = await processFolder(folderPath);

    assert.strictEqual(result.newFolderName, 'ABC-123-C');
    assert.strictEqual(result.extraInfo, 'C');
    const video = result.files.find(f => f.isVideo);
    assert.strictEqual(video.newName, 'ABC-123-C.mp4');

    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('should handle no code case', async () => {
    const tempDir = await createTempDir();
    const folderPath = path.join(tempDir, 'random-folder');
    await fs.mkdir(folderPath, { recursive: true });
    await fs.writeFile(path.join(folderPath, 'video.mp4'), 'v');

    const result = await processFolder(folderPath);

    assert.strictEqual(result.status, 'no_code');
    assert.strictEqual(result.newFolderName, null);

    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('should keep non-video files with original name', async () => {
    const tempDir = await createTempDir();
    const folderPath = path.join(tempDir, 'GHI-789');
    await fs.mkdir(folderPath, { recursive: true });
    await fs.writeFile(path.join(folderPath, 'movie.mp4'), 'v');
    await fs.writeFile(path.join(folderPath, '封面.jpg'), 'img');
    await fs.writeFile(path.join(folderPath, 'nfo.txt'), 'info');

    const result = await processFolder(folderPath);

    const jpgFile = result.files.find(f => f.sourceName === '封面.jpg');
    const txtFile = result.files.find(f => f.sourceName === 'nfo.txt');
    assert.strictEqual(jpgFile.newName, '封面.jpg');
    assert.strictEqual(txtFile.newName, 'nfo.txt');

    await fs.rm(tempDir, { recursive: true, force: true });
  });
});
