import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { expandInputs } from '../src/globs.js';

let dir;
beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), 'm2i-glob-'));
  await mkdir(path.join(dir, 'sub'), { recursive: true });
  await writeFile(path.join(dir, 'a.md'), 'x', 'utf8');
  await writeFile(path.join(dir, 'sub', 'b.md'), 'x', 'utf8');
  await writeFile(path.join(dir, 'c.txt'), 'x', 'utf8');
});
afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe('expandInputs', () => {
  it('**/*.md 匹配根层与子目录的 md 文件', async () => {
    const files = await expandInputs([path.join(dir, '**', '*.md')]);
    expect(files).toEqual([path.join(dir, 'a.md'), path.join(dir, 'sub', 'b.md')]);
  });

  it('字面文件路径直接匹配', async () => {
    const files = await expandInputs([path.join(dir, 'a.md')]);
    expect(files).toEqual([path.join(dir, 'a.md')]);
  });

  it('排除非 md 文件；多模式结果去重且有序', async () => {
    const files = await expandInputs([
      path.join(dir, '*.md'),
      path.join(dir, 'sub', '*.md'),
      path.join(dir, 'sub', '*.md'),
    ]);
    expect(files).toEqual([path.join(dir, 'a.md'), path.join(dir, 'sub', 'b.md')]);
  });

  it('无匹配时返回空数组', async () => {
    expect(await expandInputs([path.join(dir, 'nope-*.md')])).toEqual([]);
  });
});
