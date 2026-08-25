import { describe, it, expect } from 'vitest';
import { replaceBlocks } from '../src/replace.js';

describe('replaceBlocks', () => {
  const md = ['intro', '', '```mermaid', 'A --> B', '```', '', 'outro'].join('\n');
  const blocks = [{ startLine: 2, endLine: 4, code: 'A --> B' }];

  it('用替换文本覆盖整个围栏区间', () => {
    expect(replaceBlocks(md, blocks, () => '![img](./x.svg)')).toBe(
      ['intro', '', '![img](./x.svg)', '', 'outro'].join('\n'),
    );
  });

  it('块之外的行（含空行与缩进）原样保留', () => {
    const indented = ['  keep me', '```mermaid', 'A --> B', '```', '    keep too'].join('\n');
    const out = replaceBlocks(indented, [{ startLine: 1, endLine: 3 }], () => 'X');
    expect(out).toBe(['  keep me', 'X', '    keep too'].join('\n'));
  });

  it('多个块按索引回调', () => {
    const two = ['```mermaid', 'A', '```', '```mermaid', 'B', '```'].join('\n');
    const bs = [
      { startLine: 0, endLine: 2, code: 'A' },
      { startLine: 3, endLine: 5, code: 'B' },
    ];
    const calls = [];
    replaceBlocks(two, bs, (b, i) => {
      calls.push([b.code, i]);
      return `R${i}`;
    });
    expect(calls).toEqual([
      ['A', 0],
      ['B', 1],
    ]);
    expect(replaceBlocks(two, bs, (b, i) => `R${i}`)).toBe(['R0', 'R1'].join('\n'));
  });

  it('blocks 为空时返回原文', () => {
    expect(replaceBlocks(md, [], () => 'X')).toBe(md);
  });
});
