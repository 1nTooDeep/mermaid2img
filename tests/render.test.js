import { vi, describe, it, expect } from 'vitest';
import { renderToSvg } from '../src/render.js';

// 首次渲染包含 svgdom/jsdom 初始化与 mermaid 解析，放宽超时
vi.setConfig({ testTimeout: 30000 });

describe('renderToSvg', () => {
  it('把 flowchart 渲染为包含节点与中文标签的 SVG', async () => {
    const [svg] = await renderToSvg(['flowchart LR\n    A[开始] --> B[结束]']);
    expect(svg).toContain('<svg');
    expect(svg).toContain('开始');
    expect(svg).toMatch(/class="node/);
  });

  it('一次渲染多个图，结果与入参顺序一致', async () => {
    const svgs = await renderToSvg([
      'flowchart LR\n    A --> B',
      'sequenceDiagram\n    Alice->>Bob: hi',
    ]);
    expect(svgs).toHaveLength(2);
    expect(svgs[1]).toContain('Alice');
  });

  it('非法图源抛出含 1 基序号的错误', async () => {
    await expect(renderToSvg(['this is not any diagram'])).rejects.toThrow('第 1 个图表');
  });
});
