# mermaid2img

将 Markdown 文件中的 mermaid 代码块渲染为 SVG 图片，并用图片引用替换原代码块。
纯 Node.js 渲染（svgdom + jsdom），**不需要 Chrome / Puppeteer / Playwright**。

## 安装

```bash
# 本地开发
git clone <repo> && cd mermaid2img
npm install
npm link   # 使 mermaid2img 命令全局可用
```

## 使用

```bash
mermaid2img README.md                 # 转换单个文件
mermaid2img "docs/**/*.md"            # glob 批量（建议加引号，防止 shell 预展开）
mermaid2img README.md -o ./assets     # 自定义图片目录
mermaid2img README.md -p arch         # 自定义文件名前缀 → arch-1.svg
```

## 选项

| 选项 | 默认值 | 说明 |
| --- | --- | --- |
| `-o, --output <dir>` | `images/`（与 md 文件同级） | 图片输出目录；相对路径基于当前工作目录 |
| `-p, --prefix <name>` | `diagram` | 图片文件名前缀，编号从 1 开始 |

## 行为说明

- 输出格式为 **SVG**（mermaid 原生输出，无需光栅化）；PNG 支持属后续增强。
- 每个文件独立编号：`diagram-1.svg`、`diagram-2.svg`…；alt 文本为文件名去扩展名。
- 替换结果形如 `![diagram-1](./images/diagram-1.svg)`。
- **失败安全**：某个文件渲染失败时，该文件与磁盘保持原样，CLI 以退出码 1 结束并继续处理其余文件。
- 对已转换的文件再次运行是安全的（无 mermaid 块 → no-op）。
- 注意：多个文件共用 `-o` 同一目录时，`diagram-1.svg` 等文件名会互相覆盖。

## 已知限制

- 依赖树中 mermaid 被 npm overrides 钉在 `11.12.1`：更新的 11.17.x 在无浏览器环境下会因
  全局 `CSSStyleSheet` 缺失而崩溃（`isomorphic-mermaid@0.1.1` 尚未适配）。升级前先在
  无浏览器环境验证渲染。
- svgdom 的文字宽度为近似计算，与浏览器渲染存在细微尺寸差异。

## 开发

```bash
npm test        # vitest 全量测试
```
