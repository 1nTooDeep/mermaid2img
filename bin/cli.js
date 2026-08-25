#!/usr/bin/env node
// mermaid2img CLI 入口：参数解析 → glob 展开 → 逐文件转换 → 汇总输出。
import { Command } from 'commander';
import { expandInputs } from '../src/globs.js';
import { convertFile } from '../src/convert.js';

const program = new Command();

program
  .name('mermaid2img')
  .description('将 Markdown 中的 mermaid 代码块渲染为 SVG/PNG 图片（原文件保持不变）')
  .version('0.1.0')
  .argument('<patterns...>', 'Markdown 文件路径或 glob 模式（如 "docs/**/*.md"）')
  .option('-o, --output <dir>', '图片输出目录（默认：每个 md 文件旁的 images/ 目录）')
  .option('-p, --prefix <name>', '图片文件名前缀', 'diagram')
  .option('-f, --format <format>', '输出格式：svg（默认）或 png', 'svg')
  .option('-t, --theme <theme>', 'mermaid 主题：default（默认）| dark | forest | neutral', 'default')
  .option('-q, --quality <quality>', 'PNG 质量档位：low | mid（默认）| high | max', 'mid')
  .option('-s, --scale <scale>', '精确缩放倍数（优先于 --quality）', parseFloat, undefined)
  .option('-b, --bg <bg>', 'PNG 背景色：white（默认）| transparent', 'white')
  .action(async (patterns, options) => {
    const files = await expandInputs(patterns);
    if (files.length === 0) {
      console.error(`错误：未匹配到任何 Markdown 文件（${patterns.join(' ')}）`);
      process.exitCode = 1;
      return;
    }

    let total = 0;
    let failed = 0;
    for (const file of files) {
      try {
        const result = await convertFile(file, {
          outputDir: options.output,
          prefix: options.prefix,
          format: options.format,
          theme: options.theme,
          quality: options.quality,
          scale: options.scale,
          background: options.bg,
        });
        total += result.count;
        console.log(
          `${file}: ${result.count > 0 ? `已生成 ${result.count} 张${options.format.toUpperCase()} 图片` : '未发现 mermaid 代码块'}`,
        );
      } catch (err) {
        failed += 1;
        console.error(`错误：处理 ${file} 失败 - ${err?.message ?? err}`);
        process.exitCode = 1;
      }
    }
    console.log(`完成：共生成 ${total} 张${options.format.toUpperCase()} 图片${failed > 0 ? `，${failed} 个文件失败` : ''}。`);
  });

program.parseAsync().catch((err) => {
  console.error(`错误：${err?.message ?? err}`);
  process.exitCode = 1;
});
