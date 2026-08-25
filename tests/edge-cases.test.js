// 边界与反例：非法输入应正确失败（失败安全），提取边界应与 CommonMark 围栏规则一致。
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, readFile, writeFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { convertFile } from '../src/convert.js';

vi.setConfig({ testTimeout: 30000 });

let dir;
beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), 'm2i-edge-'));
});
afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

/** 把若干段 mermaid 源码各包进一个围栏，写入临时 md 文件 */
async function writeMd(codes) {
  const mdPath = path.join(dir, 'README.md');
  const md = codes.map((code) => ['```mermaid', code, '```'].join('\n')).join('\n\n');
  await writeFile(mdPath, md, 'utf8');
  return { mdPath, md };
}

/**
 * 失败安全断言：convertFile 抛出指认第 nth 个图表的错误，
 * 且 md 逐字节不变、磁盘未创建 images 目录。
 */
async function expectFailureAt(codes, nth) {
  const { mdPath, md } = await writeMd(codes);
  await expect(convertFile(mdPath)).rejects.toThrow(`第 ${nth} 个图表渲染失败`);
  expect(await readFile(mdPath, 'utf8')).toBe(md);
  expect(await readdir(dir)).not.toContain('images');
}

describe('反例：非法输入正确失败', () => {
  it('未知图型关键字', async () => {
    await expectFailureAt(['notadiagram\nfoo'], 1);
  });

  it('图型语法错误（classDiagram 缺右花括号）', async () => {
    await expectFailureAt(['classDiagram\nclass 动物 {\n  +名称'], 1);
  });

  it('空代码块', async () => {
    await expectFailureAt([''], 1);
  });

  it('纯空白内容的代码块', async () => {
    await expectFailureAt(['   \n\t\n'], 1);
  });

  it('合法块在前、非法块在后：错误指认第 2 个且磁盘零写入', async () => {
    await expectFailureAt(
      ['flowchart LR\n    A[开始] --> B[结束]', 'this is not any diagram'],
      2,
    );
  });
});

describe('提取边界', () => {
  it('未闭合的 mermaid 围栏被跳过（count=0 no-op）', async () => {
    const mdPath = path.join(dir, 'README.md');
    const md = ['# 标题', '', '```mermaid', 'flowchart LR', '    A --> B'].join('\n');
    await writeFile(mdPath, md, 'utf8');
    const result = await convertFile(mdPath);
    expect(result.count).toBe(0);
    expect(result.images).toEqual([]);
    expect(await readFile(mdPath, 'utf8')).toBe(md);
  });

  it('info 串变体 mermaid title=… 正常提取渲染', async () => {
    const mdPath = path.join(dir, 'README.md');
    const md = ['```mermaid title=演示', 'flowchart LR', '    A[开始] --> B[结束]', '```'].join('\n');
    await writeFile(mdPath, md, 'utf8');
    const result = await convertFile(mdPath);
    expect(result.count).toBe(1);
    const svg = await readFile(path.join(dir, 'images', 'README', 'diagram-1.svg'), 'utf8');
    expect(svg).toContain('<svg');
  });

  it('单文件混合 6 种图型：全部渲染且编号连续', async () => {
    const { mdPath } = await writeMd([
      'flowchart LR\n    A[开始] --> B[结束]',
      'sequenceDiagram\n    甲->>乙: 你好\n    乙-->>甲: 收到',
      'classDiagram\nclass 动物 {\n  +名称\n}\n动物 <|-- 狗',
      'stateDiagram-v2\n    [*] --> s1\n    s1 --> [*]',
      'pie showData\n    "甲" : 60\n    "乙" : 40',
      'journey\n    title 一天\n    section 上午\n      起床: 5: 我',
    ]);
    const result = await convertFile(mdPath);
    expect(result.count).toBe(6);
    expect(result.images).toEqual(
      [1, 2, 3, 4, 5, 6].map((n) => path.join(dir, 'images', 'README', `diagram-${n}.svg`)),
    );
    for (const file of result.images) {
      expect(await readFile(file, 'utf8')).toContain('<svg');
    }
  });
});
