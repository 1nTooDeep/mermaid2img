# mermaid2img

将 Markdown 文件中的 mermaid 代码块渲染为 SVG 图片。
纯 Node.js 渲染（svgdom + jsdom），**不需要 Chrome / Puppeteer / Playwright**。

**原 Markdown 文件不做任何修改**——mermaid 代码块原样保留，便于继续编辑；
工具只负责把每块图表渲染成图片文件，方便在文档、演示或其他场合直接引用。

## 安装

```bash
# 本地开发
git clone <repo> && cd mermaid2img
npm install
npm link   # 使 mermaid2img 命令全局可用
```

## 使用

```bash
mermaid2img README.md                 # 处理单个文件
mermaid2img "docs/**/*.md"            # glob 批量（建议加引号，防止 shell 预展开）
mermaid2img README.md -o ./assets     # 自定义图片根目录
mermaid2img README.md -p arch         # 自定义文件名前缀 → arch-1.svg
```

## 选项

| 选项 | 默认值 | 说明 |
| --- | --- | --- |
| `-o, --output <dir>` | `images/<md 文件名>/`（与 md 文件同级） | 图片输出根目录；每个 md 文件的图片写入以其文件名命名的子目录；相对路径基于当前工作目录 |
| `-p, --prefix <name>` | `diagram` | 图片文件名前缀，编号从 1 开始 |
| `-f, --format <format>` | `svg` | 输出格式：`svg` 或 `png` |
| `-t, --theme <theme>` | `default` | mermaid 渲染主题：`default` \| `dark` \| `forest` \| `neutral` |
| `-q, --quality <quality>` | `mid` | PNG 质量档位：`low` (×1) \| `mid` (×2) \| `high` (×3) \| `max` (×4) |
| `-s, --scale <scale>` | 无 | 精确缩放倍数（优先于 `--quality`） |
| `-b, --bg <bg>` | `white` | PNG 背景色：`white` 或 `transparent` |

## 使用示例

```bash
# SVG 输出（默认）
mermaid2img README.md

# PNG 输出，默认质量 (mid)
mermaid2img README.md -f png

# PNG 输出，最高质量
mermaid2img README.md -f png -q max

# 深色主题渲染
mermaid2img README.md -t dark

# 透明背景 PNG
mermaid2img README.md -f png -b transparent
```

## 行为说明

- 支持 **SVG** 和 **PNG** 两种输出格式：
  - SVG：mermaid 原生输出，无需光栅化，适合需要无限缩放或进一步编辑的场景
  - PNG：通过 `@resvg/resvg-js` 光栅化输出，支持 4 档质量（low/mid/high/max）和主题切换
- 主题切换：`--theme` 参数支持 `default`（浅色）| `dark` | `forest` | `neutral`，
  深色主题推荐搭配 `--bg white` 以获得最佳对比度
- 每个文件的图片独立编号并写入独立子目录：`README.md` 的第 N 个 mermaid 块 →
  `images/README/diagram-N.svg`（或 `.png`）。同目录下多个 md 文件互不覆盖。
- **原文件只读**：Markdown 与 mermaid 源码保持不变；可重复运行，
  每次重新渲染并覆盖同名图片。
- **失败安全**：某个文件渲染失败时该文件跳过（磁盘不产生任何新文件），CLI 以
  退出码 1 结束并继续处理其余文件。注意：一个文件包含多个图表时，若写盘阶段
  中途失败，先写入的图片会留在磁盘上（渲染阶段仍保证先全部成功）。

## 已知限制

- 依赖树中 mermaid 被 npm overrides 钉在 `11.12.1`：更新的 11.17.x 在无浏览器环境下会因
  全局 `CSSStyleSheet` 缺失而崩溃（`isomorphic-mermaid@0.1.1` 尚未适配）。升级前先在
  无浏览器环境验证渲染。
- svgdom 的文字宽度为近似计算，与浏览器渲染存在细微尺寸差异。
- **部分图型在无浏览器环境不可用**（依赖 svgdom/jsdom 未实现的 DOM/canvas API，实测
  于 mermaid 11.12.1）：`gantt`（缺 `offsetWidth`）、`mindmap`（缺 `canvas.getContext`）、
  `sankey-beta`（缺 `compareDocumentPosition`）、`block-beta`（DOM 循环结构序列化崩溃）。
  其余常见图型（flowchart / sequence / class / state / er / journey / pie / timeline /
  quadrant / gitGraph / requirement 等）实测可渲染。
- `quadrantChart` 与 `requirementDiagram` 的文本值不接受中文（mermaid lexer 限制），
  需用英文文本；flowchart / sequence 等主流图型的中文标签正常。
- 仅识别反引号围栏（\`\`\`mermaid）；CommonMark 的波浪线围栏（\~\~\~mermaid）不支持。
- glob 默认不匹配隐藏目录：`.github/**/*.md` 等不会被 `**/*.md` 命中。

## PNG 输出说明

PNG 格式通过 `@resvg/resvg-js` 进行光栅化，支持以下选项：

| 选项 | 默认值 | 说明 |
| --- | --- | --- |
| `--format png` | - | 输出 PNG 而非 SVG |
| `--theme` | `default` | 渲染主题：`default` \| `dark` \| `forest` \| `neutral` |
| `--quality` | `mid` | 分辨率档位：`low`(×1) \| `mid`(×2) \| `high`(×3) \| `max`(×4) |
| `--scale` | - | 精确缩放倍数（覆盖 `--quality`） |
| `--bg` | `white` | 背景：`white` 或 `transparent` |

**主题与背景搭配建议：**
- `--theme default` + `--bg white`：浅色图 + 白底，通用
- `--theme dark` + `--bg white`：深色图 + 白底，对比度最佳
- `--bg transparent`：透明底，适合嵌入深色背景文档

## 开发

```bash
npm test        # vitest 全量测试
```
