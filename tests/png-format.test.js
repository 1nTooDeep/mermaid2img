// PNG 格式、主题与分辨率档位测试
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { convertFile } from '../src/convert.js';

vi.setConfig({ testTimeout: 30000 });

let dir;
beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), 'm2i-png-'));
});
afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

const MD = ['# 流程', '', '```mermaid', 'flowchart LR\n    A[开始] --> B[结束]', '```'].join('\n');

describe('PNG 格式输出', () => {
  it('--format png：输出 PNG 而非 SVG', async () => {
    const mdPath = path.join(dir, 'README.md');
    await writeFile(mdPath, MD, 'utf8');
    const result = await convertFile(mdPath, { format: 'png' });
    expect(result.count).toBe(1);
    expect(result.images[0]).toMatch(/diagram-1\.png$/);
    // PNG 头部签名：89 50 4E 47
    const png = await readFile(result.images[0]);
    expect(png[0]).toBe(0x89);
    expect(png.toString('ascii', 1, 4)).toBe('PNG');
  });

  it('--theme default：浅色主题渲染', async () => {
    const mdPath = path.join(dir, 'README.md');
    await writeFile(mdPath, MD, 'utf8');
    const result = await convertFile(mdPath, { format: 'png', theme: 'default' });
    const png = await readFile(result.images[0]);
    expect(png.length).toBeGreaterThan(1000); // 合理大小
  });

  it('--theme dark：深色主题渲染', async () => {
    const mdPath = path.join(dir, 'README.md');
    await writeFile(mdPath, MD, 'utf8');
    const result = await convertFile(mdPath, { format: 'png', theme: 'dark' });
    const png = await readFile(result.images[0]);
    expect(png.length).toBeGreaterThan(1000);
  });
});

describe('PNG 分辨率档位', () => {
  async function getPngSize(mdPath, quality) {
    const result = await convertFile(mdPath, { format: 'png', quality });
    const png = await readFile(result.images[0]);
    return { bytes: png.length, result };
  }

  it('quality: low → scale×1，文件最小', async () => {
    const mdPath = path.join(dir, 'README.md');
    await writeFile(mdPath, MD, 'utf8');
    const { bytes } = await getPngSize(mdPath, 'low');
    expect(bytes).toBeGreaterThan(1000); // 简单图至少 1KB+
  });

  it('quality: mid → scale×2，默认档', async () => {
    const mdPath = path.join(dir, 'README.md');
    await writeFile(mdPath, MD, 'utf8');
    const low = await getPngSize(mdPath, 'low');
    const mid = await getPngSize(mdPath, 'mid');
    // mid 档应比 low 档大（或至少非缩小）
    expect(mid.bytes).toBeGreaterThanOrEqual(low.bytes);
  });

  it('quality: high → scale×3，文件较大', async () => {
    const mdPath = path.join(dir, 'README.md');
    await writeFile(mdPath, MD, 'utf8');
    const mid = await getPngSize(mdPath, 'mid');
    const high = await getPngSize(mdPath, 'high');
    // high 应 >= mid
    expect(high.bytes).toBeGreaterThanOrEqual(mid.bytes);
  });

  it('quality: max → scale×4，文件最大', async () => {
    const mdPath = path.join(dir, 'README.md');
    await writeFile(mdPath, MD, 'utf8');
    const low = await getPngSize(mdPath, 'low');
    const max = await getPngSize(mdPath, 'max');
    // max 应 >= low
    expect(max.bytes).toBeGreaterThanOrEqual(low.bytes);
  });

  it('--scale 精确倍数覆盖 quality', async () => {
    const mdPath = path.join(dir, 'README.md');
    await writeFile(mdPath, MD, 'utf8');
    const r1 = await convertFile(mdPath, { format: 'png', quality: 'low', scale: 2.5 });
    const r2 = await convertFile(mdPath, { format: 'png', quality: 'high', scale: 2.5 });
    // scale 相同时输出应接近（允许 PNG 压缩差异）
    const png1 = await readFile(r1.images[0]);
    const png2 = await readFile(r2.images[0]);
    expect(Math.abs(png1.length - png2.length)).toBeLessThan(5000);
  });
});

describe('PNG 背景色', () => {
  it('--bg white：白底（默认）', async () => {
    const mdPath = path.join(dir, 'README.md');
    await writeFile(mdPath, MD, 'utf8');
    const result = await convertFile(mdPath, { format: 'png', theme: 'dark', bg: 'white' });
    const png = await readFile(result.images[0]);
    expect(png.length).toBeGreaterThan(0);
  });

  it('--bg transparent：透明底（dark 主题时注意白字可能不可见）', async () => {
    const mdPath = path.join(dir, 'README.md');
    await writeFile(mdPath, MD, 'utf8');
    const result = await convertFile(mdPath, { format: 'png', theme: 'dark', bg: 'transparent' });
    const png = await readFile(result.images[0]);
    // 透明底 PNG 应仍有合理大小（允许小图小于阈值）
    expect(png.length).toBeGreaterThan(1000);
  });
});
