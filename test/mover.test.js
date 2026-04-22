import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { moveFolder, isContentIdentical } from '../src/mover.js';

async function createTempDir() {
  return await fs.mkdtemp(path.join(os.tmpdir(), 'jav-test-'));
}

describe('mover', () => {
  it('should move folder to target', async () => {
    const tempDir = await createTempDir();
    const sourceDir = path.join(tempDir, 'source');
    const targetDir = path.join(tempDir, 'target');
    const folderPath = path.join(sourceDir, 'ABC-123');
    
    await fs.mkdir(folderPath, { recursive: true });
    await fs.writeFile(path.join(folderPath, 'video.mp4'), 'content');

    const result = await moveFolder(folderPath, path.join(targetDir, 'ABC-123'));

    assert.strictEqual(result.status, 'moved');
    const targetExists = await fs.access(path.join(targetDir, 'ABC-123', 'video.mp4'))
      .then(() => true).catch(() => false);
    assert.strictEqual(targetExists, true);

    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('should return conflict when target exists with different content', async () => {
    const tempDir = await createTempDir();
    const sourceDir = path.join(tempDir, 'source');
    const targetDir = path.join(tempDir, 'target');
    const sourceFolder = path.join(sourceDir, 'ABC-123');
    const targetFolder = path.join(targetDir, 'ABC-123');
    
    await fs.mkdir(sourceFolder, { recursive: true });
    await fs.writeFile(path.join(sourceFolder, 'video.mp4'), 'content-a');
    
    await fs.mkdir(targetFolder, { recursive: true });
    await fs.writeFile(path.join(targetFolder, 'video.mp4'), 'content-b');

    const result = await moveFolder(sourceFolder, targetFolder);

    assert.strictEqual(result.status, 'conflict');
    const sourceStillExists = await fs.access(sourceFolder)
      .then(() => true).catch(() => false);
    assert.strictEqual(sourceStillExists, true);

    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('should delete source when target exists with identical content', async () => {
    const tempDir = await createTempDir();
    const sourceDir = path.join(tempDir, 'source');
    const targetDir = path.join(tempDir, 'target');
    const sourceFolder = path.join(sourceDir, 'ABC-123');
    const targetFolder = path.join(targetDir, 'ABC-123');
    
    await fs.mkdir(sourceFolder, { recursive: true });
    await fs.writeFile(path.join(sourceFolder, 'video.mp4'), 'same-content');
    await fs.writeFile(path.join(sourceFolder, 'cover.jpg'), 'same-image');
    
    await fs.mkdir(targetFolder, { recursive: true });
    await fs.writeFile(path.join(targetFolder, 'video.mp4'), 'same-content');
    await fs.writeFile(path.join(targetFolder, 'cover.jpg'), 'same-image');

    const result = await moveFolder(sourceFolder, targetFolder);

    assert.strictEqual(result.status, 'deleted');
    const sourceExists = await fs.access(sourceFolder)
      .then(() => true).catch(() => false);
    assert.strictEqual(sourceExists, false);

    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('isContentIdentical should return true for identical folders', async () => {
    const tempDir = await createTempDir();
    const dirA = path.join(tempDir, 'a');
    const dirB = path.join(tempDir, 'b');
    
    await fs.mkdir(dirA, { recursive: true });
    await fs.mkdir(dirB, { recursive: true });
    await fs.writeFile(path.join(dirA, 'file.txt'), 'content');
    await fs.writeFile(path.join(dirB, 'file.txt'), 'content');

    const result = await isContentIdentical(dirA, dirB);
    assert.strictEqual(result, true);

    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('isContentIdentical should return false for different folders', async () => {
    const tempDir = await createTempDir();
    const dirA = path.join(tempDir, 'a');
    const dirB = path.join(tempDir, 'b');
    
    await fs.mkdir(dirA, { recursive: true });
    await fs.mkdir(dirB, { recursive: true });
    await fs.writeFile(path.join(dirA, 'file.txt'), 'content-a');
    await fs.writeFile(path.join(dirB, 'file.txt'), 'content-b');

    const result = await isContentIdentical(dirA, dirB);
    assert.strictEqual(result, false);

    await fs.rm(tempDir, { recursive: true, force: true });
  });
});
