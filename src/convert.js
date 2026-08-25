import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { extractMermaidBlocks } from './extract.js';
import { replaceBlocks } from './replace.js';
import { renderToSvg } from './render.js';

/** 生成从 Markdown 文件指向图片文件、以 ./ 开头的 POSIX 风格相对路径 */
function relativeImagePath(mdPath, imagePath) {
  const rel = path
    .relative(path.dirname(path.resolve(mdPath)), path.resolve(imagePath))
    .split(path.sep)
    .join('/');
  return rel.startsWith('.') ? rel : `./${rel}`;
}

/**
 * 转换单个 Markdown 文件：提取 mermaid 块 → 渲染 SVG → 写入图片目录 → 用图片引用替换原代码块。
 * 所有渲染成功之前不写任何文件；渲染失败直接抛出，原文件与磁盘保持不变。
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
  const plans = blocks.map((_, idx) => {
    const name = `${prefix}-${idx + 1}.svg`;
    const file = path.join(imagesDir, name);
    return {
      file,
      svg: svgs[idx],
      link: `![${prefix}-${idx + 1}](${relativeImagePath(mdPath, file)})`,
    };
  });

  const newMarkdown = replaceBlocks(markdown, blocks, (_, idx) => plans[idx].link);

  await mkdir(imagesDir, { recursive: true });
  await Promise.all(plans.map((p) => writeFile(p.file, p.svg, 'utf8')));
  await writeFile(mdPath, newMarkdown, 'utf8');
  return { file: mdPath, count: blocks.length, images: plans.map((p) => p.file) };
}
