/**
 * 把 blocks 覆盖的行区间（含起止行）替换为 getReplacement 的返回值，其余行原样保留。
 * 纯函数：构建新行数组，不修改入参。
 *
 * @param {string} markdown Markdown 源文本
 * @param {Array<{startLine: number, endLine: number}>} blocks 升序、互不重叠的区间
 * @param {(block: {startLine: number, endLine: number}, index: number) => string} getReplacement
 * @returns {string} 替换后的 Markdown 文本
 */
export function replaceBlocks(markdown, blocks, getReplacement) {
  const lines = markdown.split('\n');
  const out = [];
  let i = 0;
  let next = 0;
  while (i < lines.length) {
    const block = blocks[next];
    if (block && block.startLine === i) {
      out.push(getReplacement(block, next));
      i = block.endLine + 1;
      next += 1;
    } else {
      out.push(lines[i]);
      i += 1;
    }
  }
  return out.join('\n');
}
