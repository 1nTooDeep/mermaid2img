// 从 Markdown 源文本提取 mermaid 围栏代码块。
// 采用 CommonMark 围栏规则：起始围栏 ≤3 空格缩进 + ≥3 个反引号 + info 串首词为 mermaid
// （info 串不允许含反引号）；结束围栏整行仅有 ≥ 起始数量的反引号。
// 嵌套在更长围栏（如 ````text）内的 "```mermaid" 不会被误提取。

const OPEN_FENCE_RE = /^ {0,3}(`{3,})([^\r\n`]*)$/;
const CLOSE_FENCE_RE = /^ {0,3}(`{3,})[ \t]*$/;

/** 匹配结束围栏（去除行尾 CR 后）；返回反引号数量，非围栏行返回 -1 */
function closingFenceLength(line) {
  const m = CLOSE_FENCE_RE.exec(line.replace(/\r$/, ''));
  return m ? m[1].length : -1;
}

/**
 * @param {string} markdown Markdown 源文本
 * @returns {Array<{startLine: number, endLine: number, code: string}>}
 *          startLine/endLine 为 0 基行号（含起始/结束围栏行），按出现顺序升序
 */
export function extractMermaidBlocks(markdown) {
  const lines = markdown.split('\n');
  const blocks = [];
  let i = 0;
  while (i < lines.length) {
    const open = OPEN_FENCE_RE.exec(lines[i].replace(/\r$/, ''));
    if (!open) {
      i += 1;
      continue;
    }
    const fenceLength = open[1].length;
    let close = -1;
    for (let j = i + 1; j < lines.length; j++) {
      if (closingFenceLength(lines[j]) >= fenceLength) {
        close = j;
        break;
      }
    }
    const infoFirstWord = open[2].trim().split(/\s+/)[0];
    if (infoFirstWord === 'mermaid' && close !== -1) {
      blocks.push({
        startLine: i,
        endLine: close,
        code: lines.slice(i + 1, close).map((l) => l.replace(/\r$/, '')).join('\n'),
      });
    }
    i = close === -1 ? i + 1 : close + 1;
  }
  return blocks;
}
