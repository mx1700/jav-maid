import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { organize } from '../src/index.js';

async function createTempDir() {
  return await fs.mkdtemp(path.join(os.tmpdir(), 'jav-integ-'));
}

describe('integration', () => {
  it('should organize single folder with one video', async () => {
    const tempDir = await createTempDir();
    const sourceDir = path.join(tempDir, 'source');
    const targetDir = path.join(tempDir, 'target');

    await fs.mkdir(path.join(sourceDir, 'sis.com@ABC-123'), { recursive: true });
    await fs.writeFile(path.join(sourceDir, 'sis.com@ABC-123', 'ABC-123-1080P.mp4'), 'video');
    await fs.writeFile(path.join(sourceDir, 'sis.com@ABC-123', '封面.jpg'), 'img');

    const result = await organize(sourceDir, targetDir, 1);

    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].status, 'moved');
    assert.strictEqual(result[0].newFolderName, 'ABC-123');

    const targetFile = path.join(targetDir, 'ABC-123', 'ABC-123.mp4');
    const exists = await fs.access(targetFile).then(() => true).catch(() => false);
    assert.strictEqual(exists, true);

    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('should organize multiple folders concurrently', async () => {
    const tempDir = await createTempDir();
    const sourceDir = path.join(tempDir, 'source');
    const targetDir = path.join(tempDir, 'target');

    await fs.mkdir(path.join(sourceDir, 'DEF-456'), { recursive: true });
    await fs.writeFile(path.join(sourceDir, 'DEF-456', 'a.mp4'), 'v1');
    
    await fs.mkdir(path.join(sourceDir, 'GHI-789-C'), { recursive: true });
    await fs.writeFile(path.join(sourceDir, 'GHI-789-C', 'x.mp4'), 'v2');

    const result = await organize(sourceDir, targetDir, 2);

    assert.strictEqual(result.length, 2);
    const movedCount = result.filter(r => r.status === 'moved').length;
    assert.strictEqual(movedCount, 2);

    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('should skip folders without code', async () => {
    const tempDir = await createTempDir();
    const sourceDir = path.join(tempDir, 'source');
    const targetDir = path.join(tempDir, 'target');

    await fs.mkdir(path.join(sourceDir, 'random-folder'), { recursive: true });
    await fs.writeFile(path.join(sourceDir, 'random-folder', 'video.mp4'), 'v');

    const result = await organize(sourceDir, targetDir, 1);

    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].status, 'skipped');

    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('should handle conflict when target exists with different content', async () => {
    const tempDir = await createTempDir();
    const sourceDir = path.join(tempDir, 'source');
    const targetDir = path.join(tempDir, 'target');

    await fs.mkdir(path.join(sourceDir, 'JKL-012'), { recursive: true });
    await fs.writeFile(path.join(sourceDir, 'JKL-012', 'video.mp4'), 'source-content');

    await fs.mkdir(path.join(targetDir, 'JKL-012'), { recursive: true });
    await fs.writeFile(path.join(targetDir, 'JKL-012', 'video.mp4'), 'target-content');

    const result = await organize(sourceDir, targetDir, 1);

    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].status, 'conflict');

    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('should continue processing other folders when one folder throws error', async () => {
    const tempDir = await createTempDir();
    const sourceDir = path.join(tempDir, 'source');
    const targetDir = path.join(tempDir, 'target');

    // 创建一个会导致文件重命名失败的文件夹（设为只读）
    await fs.mkdir(path.join(sourceDir, 'BAD-001'), { recursive: true });
    await fs.writeFile(path.join(sourceDir, 'BAD-001', 'video.mp4'), 'v');
    await fs.chmod(path.join(sourceDir, 'BAD-001'), 0o555);

    // 创建一个正常文件夹
    await fs.mkdir(path.join(sourceDir, 'OK-002'), { recursive: true });
    await fs.writeFile(path.join(sourceDir, 'OK-002', 'video.mp4'), 'v2');

    const result = await organize(sourceDir, targetDir, 1);

    assert.strictEqual(result.length, 2);

    const badResult = result.find(r => r.sourceName === 'BAD-001');
    const okResult = result.find(r => r.sourceName === 'OK-002');

    assert.strictEqual(badResult.status, 'error');
    assert.ok(badResult.message.includes('错误') || badResult.message.length > 0);
    assert.strictEqual(okResult.status, 'moved');

    // 清理：先恢复权限
    await fs.chmod(path.join(sourceDir, 'BAD-001'), 0o755);
    await fs.rm(tempDir, { recursive: true, force: true });
  });
});
