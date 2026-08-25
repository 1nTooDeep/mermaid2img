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

## 行为说明

- 输出格式为 **SVG**（mermaid 原生输出，无需光栅化）；PNG 支持属后续增强。
- 每个文件的图片独立编号并写入独立子目录：`README.md` 的第 N 个 mermaid 块 →
  `images/README/diagram-N.svg`。同目录下多个 md 文件互不覆盖。
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
- 仅识别反引号围栏（\`\`\`mermaid）；CommonMark 的波浪线围栏（\~\~\~mermaid）不支持。
- glob 默认不匹配隐藏目录：`.github/**/*.md` 等不会被 `**/*.md` 命中。

## 开发

```bash
npm test        # vitest 全量测试
```
