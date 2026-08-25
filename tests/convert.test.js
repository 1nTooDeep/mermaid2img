import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, readFile, writeFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { convertFile } from '../src/convert.js';

vi.setConfig({ testTimeout: 30000 });

let dir;
beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), 'm2i-'));
});
afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

// 一个 mermaid 块的标准输入
const MD = ['# 流程', '', '```mermaid', 'flowchart LR\n    A[开始] --> B[结束]', '```', '', '尾行'].join('\n');

describe('convertFile', () => {
  it('端到端：写 SVG 到 images/，原 Markdown 保持不变', async () => {
    const mdPath = path.join(dir, 'README.md');
    await writeFile(mdPath, MD, 'utf8');

    const result = await convertFile(mdPath);

    expect(result.count).toBe(1);
    const svg = await readFile(path.join(dir, 'images', 'diagram-1.svg'), 'utf8');
    expect(svg).toContain('<svg');
    expect(await readFile(mdPath, 'utf8')).toBe(MD);
  });

  it('无 mermaid 块时为 no-op，文件内容不变', async () => {
    const mdPath = path.join(dir, 'README.md');
    await writeFile(mdPath, '# 只有文字\n', 'utf8');
    const result = await convertFile(mdPath);
    expect(result.count).toBe(0);
    expect(result.images).toEqual([]);
    expect(await readFile(mdPath, 'utf8')).toBe('# 只有文字\n');
  });

  it('--prefix 改变图片文件名', async () => {
    const mdPath = path.join(dir, 'README.md');
    await writeFile(mdPath, MD, 'utf8');
    await convertFile(mdPath, { prefix: '架构' });
    await expect(readFile(path.join(dir, 'images', '架构-1.svg'), 'utf8')).resolves.toContain('<svg');
    expect(await readFile(mdPath, 'utf8')).toBe(MD);
  });

  it('--outputDir 指定目录时图片写往该目录', async () => {
    const mdPath = path.join(dir, 'README.md');
    await writeFile(mdPath, MD, 'utf8');
    await convertFile(mdPath, { outputDir: path.join(dir, 'assets') });
    await expect(readFile(path.join(dir, 'assets', 'diagram-1.svg'), 'utf8')).resolves.toContain('<svg');
    expect(await readFile(mdPath, 'utf8')).toBe(MD);
  });

  it('多个块依次编号', async () => {
    const mdPath = path.join(dir, 'README.md');
    const two = ['# t', '', '```mermaid', 'flowchart LR\n    A --> B', '```', '', '```mermaid', 'flowchart LR\n    C --> D', '```'].join('\n');
    await writeFile(mdPath, two, 'utf8');
    const result = await convertFile(mdPath);
    expect(result.count).toBe(2);
    expect(result.images).toEqual([
      path.join(dir, 'images', 'diagram-1.svg'),
      path.join(dir, 'images', 'diagram-2.svg'),
    ]);
    expect(await readFile(mdPath, 'utf8')).toBe(two);
  });

  it('渲染失败时抛出错误，md 与磁盘均保持不变', async () => {
    const mdPath = path.join(dir, 'README.md');
    const bad = ['```mermaid', 'this is not any diagram', '```'].join('\n');
    await writeFile(mdPath, bad, 'utf8');
    await expect(convertFile(mdPath)).rejects.toThrow('第 1 个图表渲染失败');
    expect(await readFile(mdPath, 'utf8')).toBe(bad);
    expect(await readdir(dir)).not.toContain('images');
  });
});
