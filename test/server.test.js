import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { startServer } from '../src/server.js';

async function createTempDir() {
  return await fs.mkdtemp(path.join(os.tmpdir(), 'jav-server-'));
}

describe('server', () => {
  it('should run organize at least once and stop on abort signal', async () => {
    const tempDir = await createTempDir();
    const sourceDir = path.join(tempDir, 'source');
    const targetDir = path.join(tempDir, 'target');

    await fs.mkdir(path.join(sourceDir, 'XYZ-999'), { recursive: true });
    await fs.writeFile(path.join(sourceDir, 'XYZ-999', 'XYZ-999.mp4'), 'v');
    await fs.mkdir(targetDir, { recursive: true });

    const controller = new AbortController();
    setTimeout(() => controller.abort(), 100);

    await startServer(sourceDir, targetDir, 1, 0.001, null, { signal: controller.signal });

    const targetFile = path.join(targetDir, 'XYZ-999', 'XYZ-999.mp4');
    const exists = await fs.access(targetFile).then(() => true).catch(() => false);
    assert.strictEqual(exists, true);

    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('should call organize multiple times', async () => {
    let callCount = 0;
    const mockOrganize = async () => {
      callCount++;
      return [];
    };

    const controller = new AbortController();
    // interval = 0.001 min = 60ms; abort after 250ms allows ~3-4 runs
    setTimeout(() => controller.abort(), 250);

    await startServer('/tmp/a', '/tmp/b', 1, 0.001, null, {
      signal: controller.signal,
      organize: mockOrganize
    });

    assert.ok(callCount >= 2, `Expected at least 2 calls, got ${callCount}`);
  });
});
