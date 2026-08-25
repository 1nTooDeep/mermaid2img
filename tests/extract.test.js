import { describe, it, expect } from 'vitest';
import { extractMermaidBlocks } from '../src/extract.js';

describe('extractMermaidBlocks', () => {
  it('提取基本 mermaid 块，行号为 0 基且含围栏行', () => {
    const md = ['# 标题', '', '```mermaid', 'flowchart LR', '  A --> B', '```', '', '尾部'].join('\n');
    const blocks = extractMermaidBlocks(md);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].startLine).toBe(2);
    expect(blocks[0].endLine).toBe(5);
    expect(blocks[0].code).toBe('flowchart LR\n  A --> B');
  });

  it('提取多个块，按出现顺序排列', () => {
    const md = ['```mermaid', 'A --> B', '```', 'text', '```mermaid', 'C --> D', '```'].join('\n');
    const blocks = extractMermaidBlocks(md);
    expect(blocks).toHaveLength(2);
    expect(blocks[0].code).toBe('A --> B');
    expect(blocks[1].startLine).toBe(4);
  });

  it('没有 mermaid 块时返回空数组', () => {
    expect(extractMermaidBlocks('# hi\n\n```js\ncode\n```')).toEqual([]);
  });

  it('不提取嵌套在四反引号块内的 mermaid 围栏', () => {
    const md = ['````text', '```mermaid', 'flowchart LR', 'A --> B', '```', '````'].join('\n');
    expect(extractMermaidBlocks(md)).toEqual([]);
  });

  it('正确识别普通代码块之后的 mermaid 块', () => {
    const md = ['```js', 'const a = 1', '```', '', '```mermaid', 'A --> B', '```'].join('\n');
    const blocks = extractMermaidBlocks(md);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].startLine).toBe(4);
    expect(blocks[0].endLine).toBe(6);
  });

  it('未闭合的 mermaid 围栏不产生块', () => {
    const md = ['```mermaid', 'flowchart LR'].join('\n');
    expect(extractMermaidBlocks(md)).toEqual([]);
  });

  it('兼容 CRLF 行尾', () => {
    const md = '# t\r\n\r\n```mermaid\r\nflowchart LR\r\n```\r\n';
    const blocks = extractMermaidBlocks(md);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].code).toBe('flowchart LR');
  });

  it('info 串带额外参数仍识别（mermaid title=x）', () => {
    const md = ['```mermaid title=演示', 'flowchart LR', '```'].join('\n');
    const blocks = extractMermaidBlocks(md);
    expect(blocks).toHaveLength(1);
  });

  it('识别列表缩进（≤3 空格）内的 mermaid 块', () => {
    const md = ['- item', '', '  ```mermaid', '  A --> B', '  ```'].join('\n');
    const blocks = extractMermaidBlocks(md);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].code).toBe('  A --> B');
  });
});
