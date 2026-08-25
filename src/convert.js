import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { extractMermaidBlocks } from './extract.js';
import { renderToSvg } from './render.js';

/**
 * 转换单个 Markdown 文件：提取 mermaid 块 → 渲染 SVG → 写入图片目录。
 * 原文件不做任何修改（mermaid 代码块原样保留，便于继续编辑）。
 * 所有渲染成功之前不写任何文件；渲染失败直接抛出，磁盘保持不变。
 *
 * @param {string} mdPath Markdown 文件路径
 * @param {{outputDir?: string, prefix?: string}} options
 *        outputDir：图片输出目录（相对路径基于 process.cwd()）；缺省为 md 同级 images/
 *        prefix：图片文件名前缀，缺省 'diagram'
 * @returns {Promise<{file: string, count: number, images: string[]}>}
 */
export async function convertFile(mdPath, options = {}) {
  const prefix = options.prefix ?? 'diagram';
  const markdown = await readFile(mdPath, 'utf8');
  const blocks = extractMermaidBlocks(markdown);
  if (blocks.length === 0) {
    return { file: mdPath, count: 0, images: [] };
  }

  const svgs = await renderToSvg(blocks.map((b) => b.code));

  const mdDir = path.dirname(mdPath);
  const imagesDir = options.outputDir
    ? path.resolve(options.outputDir)
    : path.join(mdDir, 'images');
  const plans = blocks.map((_, idx) => ({
    file: path.join(imagesDir, `${prefix}-${idx + 1}.svg`),
    svg: svgs[idx],
  }));

  await mkdir(imagesDir, { recursive: true });
  await Promise.all(plans.map((p) => writeFile(p.file, p.svg, 'utf8')));
  return { file: mdPath, count: blocks.length, images: plans.map((p) => p.file) };
}
