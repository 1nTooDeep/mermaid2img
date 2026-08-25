// 图型覆盖矩阵：各 mermaid 图型走 convertFile 全链路（提取 → 渲染 → 落盘），
// 统一断言生成的 SVG 有效（<svg 开头、viewBox 四数字且宽高非零非塌缩）。
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { convertFile } from '../src/convert.js';

vi.setConfig({ testTimeout: 30000 });

let dir;
beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), 'm2i-types-'));
});
afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

/** 把 mermaid 源码包进单个围栏写入临时 md 文件，返回路径与原始内容 */
async function writeSingleBlockMd(code, name = 'README.md') {
  const mdPath = path.join(dir, name);
  const md = ['# 测试', '', '```mermaid', code, '```'].join('\n');
  await writeFile(mdPath, md, 'utf8');
  return { mdPath, md };
}

/** 断言 SVG 字符串有效，返回解析出的 viewBox */
function expectValidSvg(svg) {
  expect(svg).toContain('<svg');
  const m = /viewBox="([^"]+)"/.exec(svg);
  expect(m, 'SVG 应含 viewBox').not.toBeNull();
  const [x, y, w, h] = m[1].trim().split(/\s+/).map(Number);
  expect([x, y, w, h].every(Number.isFinite), 'viewBox 应为四个有限数字').toBe(true);
  expect(w, 'viewBox 宽度应为正（未塌缩）').toBeGreaterThan(0);
  expect(h, 'viewBox 高度应为正（未塌缩）').toBeGreaterThan(0);
  return { w, h };
}

// 各图型的最小可渲染 fixture（中文标签优先，贴近实际使用）
const CASES = [
  {
    name: 'flowchart LR（中文标签）',
    code: 'flowchart LR\n    A[开始] --> B[处理]\n    B --> C{判断}\n    C -->|是| D[结束]\n    C -->|否| B',
  },
  {
    name: 'flowchart TD + subgraph',
    code: 'flowchart TD\n    subgraph 前端\n        A[页面] --> B[组件]\n    end\n    subgraph 后端\n        C[API] --> D[(数据库)]\n    end\n    B --> C',
  },
  {
    name: 'sequenceDiagram（actor/note/loop）',
    code: 'sequenceDiagram\n    actor 用户\n    participant 服务\n    用户->>服务: 请求\n    activate 服务\n    服务-->>用户: 响应\n    deactivate 服务\n    loop 重试\n        用户->>服务: 再次请求\n        服务-->>用户: 完成\n    end\n    note over 用户,服务: 注释说明',
  },
  {
    name: 'classDiagram',
    code: 'classDiagram\n    class 动物 {\n        +String 名称\n        +发出声音() void\n    }\n    class 狗 {\n        +摇尾巴() void\n    }\n    动物 <|-- 狗\n    狗 "1" *-- "n" 玩具',
  },
  {
    name: 'stateDiagram-v2',
    code: 'stateDiagram-v2\n    [*] --> 待机\n    待机 --> 运行: 启动\n    运行 --> 待机: 停止\n    运行 --> 故障: 异常\n    故障 --> [*]',
  },
  {
    name: 'erDiagram',
    code: 'erDiagram\n    用户 ||--o{ 订单 : "创建"\n    订单 ||--|{ 订单项 : "包含"\n    用户 {\n        int id PK\n        string name\n    }',
  },
  {
    name: 'journey',
    code: 'journey\n    title 我的工作日\n    section 上午\n      起床: 5: 我\n      通勤: 3: 我\n      站会: 4: 我, 团队\n    section 下午\n      编码: 5: 我\n      评审: 4: 我, 团队',
  },
  {
    name: 'pie showData',
    code: 'pie showData\n    title 工时分布\n    "开发" : 45\n    "测试" : 30\n    "评审" : 15\n    "其他" : 10',
  },
  {
    name: 'timeline',
    code: 'timeline\n    title 版本演进\n    2024 年 : v0.1 原型\n    2025 年 : v1.0 发布\n    2026 年 : v2.0 重构',
  },
  {
    // quadrantChart 的 lexer 不接受非 ASCII 轴/象限文本，fixture 用英文
    name: 'quadrantChart（英文文本）',
    code: 'quadrantChart\n    title Priority\n    x-axis Low impact --> High impact\n    y-axis Cheap --> Costly\n    quadrant-1 Focus\n    quadrant-2 Plan\n    quadrant-3 Optimize\n    quadrant-4 Assess\n    featA: [0.75, 0.25]\n    featB: [0.3, 0.65]',
  },
  {
    name: 'gitGraph',
    code: 'gitGraph\n    commit id: "初始提交"\n    branch feature\n    commit id: "功能开发"\n    checkout main\n    commit id: "修复问题"\n    merge feature id: "合并功能"',
  },
  {
    // requirementDiagram 的 text 值不支持中文（lexer 报错），fixture 用英文文本
    name: 'requirementDiagram（英文 text）',
    code: 'requirementDiagram\nrequirement r1 {\nid: 1\ntext: the system requirement\nrisk: high\nverifymethod: inspection\n}\nelement e1 {\ntype: simulation\n}\nr1 - contains -> e1',
  },
];

describe('图型覆盖矩阵', () => {
  for (const { name, code } of CASES) {
    it(`渲染 ${name} 为有效 SVG`, async () => {
      const { mdPath, md } = await writeSingleBlockMd(code);
      const result = await convertFile(mdPath);
      expect(result.count).toBe(1);
      expect(result.images).toHaveLength(1);
      const svg = await readFile(result.images[0], 'utf8');
      expectValidSvg(svg);
      // 原文件保持不变
      expect(await readFile(mdPath, 'utf8')).toBe(md);
    });
  }

  // 探测确认：以下图型在无浏览器环境（svgdom/jsdom）因缺失 DOM/canvas API 无法渲染，
  // 属环境限制而非语法问题——详见 README 已知限制。
  it.skip('gantt（环境不支持：依赖元素 offsetWidth）', () => {});
  it.skip('mindmap（环境不支持：依赖 canvas.getContext）', () => {});
  it.skip('sankey-beta（环境不支持：node.compareDocumentPosition 缺失）', () => {});
  it.skip('block-beta（环境不支持：DOM 循环结构序列化崩溃）', () => {});
});

describe('CJK 与特殊字符', () => {
  it('标签含括号、单引号与引号实体', async () => {
    const { mdPath } = await writeSingleBlockMd(
      'flowchart LR\n    A["带(括号)的文本"] --> B["带 \'单引号\' 的文本"] --> C["带 #quot;引号#quot; 实体的文本"]',
    );
    const result = await convertFile(mdPath);
    expect(result.count).toBe(1);
    expectValidSvg(await readFile(result.images[0], 'utf8'));
  });

  it('标签含 emoji', async () => {
    const { mdPath } = await writeSingleBlockMd(
      'flowchart LR\n    A[😀 开始] --> B[🚀 运行] --> C[✅ 完成]',
    );
    const result = await convertFile(mdPath);
    expect(result.count).toBe(1);
    expectValidSvg(await readFile(result.images[0], 'utf8'));
  });

  it('超长中文标签宽度不塌缩', async () => {
    const longLabel = '这是一个包含三十个以上汉字的超长中文标签用于验证文本宽度近似计算的稳定性';
    const { mdPath } = await writeSingleBlockMd(`flowchart LR\n    A["${longLabel}"]`);
    const result = await convertFile(mdPath);
    const { w } = expectValidSvg(await readFile(result.images[0], 'utf8'));
    expect(w, '超长中文标签应得到可观宽度').toBeGreaterThan(100);
  });
});

describe('规模', () => {
  it('25+ 节点的流程图宽度可观', async () => {
    const lines = ['flowchart LR'];
    for (let n = 1; n <= 25; n++) lines.push(`    N${n}[节点${n}]`);
    for (let n = 1; n < 25; n++) lines.push(`    N${n} --> N${n + 1}`);
    const { mdPath } = await writeSingleBlockMd(lines.join('\n'));
    const result = await convertFile(mdPath);
    const { w } = expectValidSvg(await readFile(result.images[0], 'utf8'));
    expect(w, '25 节点横向链宽应显著').toBeGreaterThan(300);
  });

  it('12+ 消息的时序图高度可观', async () => {
    const lines = ['sequenceDiagram', '    participant A as 甲方', '    participant B as 乙方'];
    for (let n = 1; n <= 12; n++) lines.push(`    A->>B: 消息${n}`);
    const { mdPath } = await writeSingleBlockMd(lines.join('\n'));
    const result = await convertFile(mdPath);
    const { h } = expectValidSvg(await readFile(result.images[0], 'utf8'));
    expect(h, '12 条消息高度应显著').toBeGreaterThan(200);
  });
});
