import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { extractMermaidBlocks } from './extract.js';
import { renderToSvg, rasterizeSvg } from './render.js';

/**
 * 转换单个 Markdown 文件：提取 mermaid 块 → 渲染 → 写入图片目录。
 * 原文件不做任何修改（mermaid 代码块原样保留，便于继续编辑）。
 * 所有渲染成功之前不写任何文件；渲染失败直接抛出，磁盘保持不变。
 *
 * @param {string} mdPath Markdown 文件路径
 * @param {{
 *   outputDir?: string,
 *   prefix?: string,
 *   format?: 'svg' | 'png',
 *   theme?: 'default' | 'dark' | 'forest' | 'neutral',
 *   quality?: 'low' | 'mid' | 'high' | 'max',
 *   scale?: number,
 *   background?: 'white' | 'transparent'
 * }} options
 *        outputDir：图片输出目录（相对路径基于 process.cwd()），图片写入其下以 md 文件名命名的子目录；
 *        缺省为 md 同级 images/<md 文件名>/
 *        prefix：图片文件名前缀，缺省 'diagram'
 *        format：输出格式，'svg'（默认）或 'png'
 *        theme：mermaid 主题，'default'（默认）| 'dark' | 'forest' | 'neutral'
 *        quality：PNG 质量档位，'low' | 'mid'（默认）| 'high' | 'max'，对应 scale 1/2/3/4
 *        scale：精确缩放倍数（优先于 quality），默认由 quality 映射
 *        background：PNG 背景色，'white'（默认）或 'transparent'；dark 主题推荐 'white'
 * @returns {Promise<{file: string, count: number, images: string[]}>}
 */
export async function convertFile(mdPath, options = {}) {
  const prefix = options.prefix ?? 'diagram';
  const format = options.format ?? 'svg';
  const theme = options.theme ?? 'default';
  const quality = options.quality ?? 'mid';
  const background = options.background ?? (theme === 'dark' ? 'white' : 'transparent');

  // quality → scale 映射（可被 options.scale 覆盖）
  const scaleMap = { low: 1, mid: 2, high: 3, max: 4 };
  const scale = options.scale ?? scaleMap[quality] ?? 2;

  const markdown = await readFile(mdPath, 'utf8');
  const blocks = extractMermaidBlocks(markdown);
  if (blocks.length === 0) {
    return { file: mdPath, count: 0, images: [] };
  }

  const svgs = await renderToSvg(blocks.map((b) => b.code), { theme });

  const mdDir = path.dirname(mdPath);
  const mdStem = path.basename(mdPath, path.extname(mdPath));
  const imagesDir = options.outputDir
    ? path.resolve(options.outputDir, mdStem)
    : path.join(mdDir, 'images', mdStem);

  const plans = await Promise.all(
    blocks.map(async (_, idx) => {
      let fileContent;
      if (format === 'png') {
        fileContent = await rasterizeSvg(svgs[idx], { scale, background });
      } else {
        fileContent = svgs[idx];
      }
      const ext = format === 'png' ? 'png' : 'svg';
      return {
        file: path.join(imagesDir, `${prefix}-${idx + 1}.${ext}`),
        content: fileContent,
      };
    }),
  );

  await mkdir(imagesDir, { recursive: true });
  await Promise.all(plans.map((p) => writeFile(p.file, p.content)));
  return { file: mdPath, count: blocks.length, images: plans.map((p) => p.file) };
}
