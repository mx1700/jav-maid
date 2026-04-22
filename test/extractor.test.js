import { describe, it } from 'node:test';
import assert from 'node:assert';
import { extractCode } from '../src/extractor.js';

describe('extractor', () => {
  it('should extract standard code with dash', () => {
    const result = extractCode('ABC-123');
    assert.deepStrictEqual(result, { code: 'ABC-123', extra: null });
  });

  it('should extract code from filename with website prefix', () => {
    const result = extractCode('sis.com@ABC-123');
    assert.deepStrictEqual(result, { code: 'ABC-123', extra: null });
  });

  it('should extract code without dash', () => {
    const result = extractCode('ABC123');
    assert.deepStrictEqual(result, { code: 'ABC-123', extra: null });
  });

  it('should extract code from right side when multiple candidates exist', () => {
    const result = extractCode('HDD800@ABC123');
    assert.deepStrictEqual(result, { code: 'ABC-123', extra: null });
  });

  it('should handle underscore replacement', () => {
    const result = extractCode('abc_site_ABP-123_1080p');
    assert.deepStrictEqual(result, { code: 'ABP-123', extra: null });
  });

  it('should extract extra info -C', () => {
    const result = extractCode('ABC-123-C');
    assert.deepStrictEqual(result, { code: 'ABC-123', extra: 'C' });
  });

  it('should extract extra info -U', () => {
    const result = extractCode('DEF-456-U');
    assert.deepStrictEqual(result, { code: 'DEF-456', extra: 'U' });
  });

  it('should extract extra info -UC', () => {
    const result = extractCode('GHI-789-UC');
    assert.deepStrictEqual(result, { code: 'GHI-789', extra: 'UC' });
  });

  it('should return null for no match', () => {
    const result = extractCode('some-random-folder');
    assert.strictEqual(result, null);
  });

  it('should handle lowercase extra info', () => {
    const result = extractCode('ABC-123-c');
    assert.deepStrictEqual(result, { code: 'ABC-123', extra: 'C' });
  });

  it('should handle multiple letter code like ABP-12345', () => {
    const result = extractCode('ABP-12345');
    assert.deepStrictEqual(result, { code: 'ABP-12345', extra: null });
  });

  it('should prefer UC over C when both present', () => {
    const result = extractCode('ABC-123-UC-C');
    assert.deepStrictEqual(result, { code: 'ABC-123', extra: 'UC' });
  });

  it('should handle bracket website prefix with lowercase code and -C', () => {
    const result = extractCode('[acb.com]abc-123-c');
    assert.deepStrictEqual(result, { code: 'ABC-123', extra: 'C' });
  });

  it('should handle website prefix with file extension', () => {
    const result = extractCode('hhd800.com@MUDR-181.mp4');
    assert.deepStrictEqual(result, { code: 'MUDR-181', extra: null });
  });

  it('should extract real code when bracket contains similar pattern', () => {
    const result = extractCode('[FHD-1080P]MIGD-348');
    assert.deepStrictEqual(result, { code: 'MIGD-348', extra: null });
  });

  it('should not treat [c] as extra info', () => {
    const result = extractCode('[1080p]ABC-123[c]');
    assert.deepStrictEqual(result, { code: 'ABC-123', extra: null });
  });

  it('should handle parenthesis prefix', () => {
    const result = extractCode('(同人志)ABC-999');
    assert.deepStrictEqual(result, { code: 'ABC-999', extra: null });
  });

  it('should not treat -DVD as extra info', () => {
    const result = extractCode('ABC-123-DVD');
    assert.deepStrictEqual(result, { code: 'ABC-123', extra: null });
  });
});
