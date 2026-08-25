// isomorphic-mermaid 预接线了 svgdom（SVG 几何计算，弥补 jsdom 无布局的缺陷）
// 与 jsdom + dompurify，使 mermaid.render 在纯 Node 下可用——无需 Chrome/Puppeteer。
// 注意：依赖版本由 package.json 的 overrides 钉在 mermaid@11.12.1；
// 11.17+ 会在渲染时访问未定义的全局 CSSStyleSheet 而崩溃（svgdom 不提供）。
import mermaid from 'isomorphic-mermaid';

let initialized = false;
let counter = 0;

function ensureInitialized() {
  if (initialized) return;
  initialized = true;
  // 库的安全默认：startOnLoad:false / securityLevel:'strict' / htmlLabels:false
  mermaid.initialize({ startOnLoad: false });
}

/**
 * 批量渲染 mermaid 源码为 SVG 字符串。
 * @param {string[]} diagrams
 * @returns {Promise<string[]>} 与入参等长、顺序一致的 SVG 字符串数组
 * @throws {Error} 任意图渲染失败时抛出，message 含 1 基序号与原始错误信息
 */
export async function renderToSvg(diagrams) {
  ensureInitialized();
  const svgs = [];
  for (const code of diagrams) {
    counter += 1;
    try {
      const { svg } = await mermaid.render(`m2i-${counter}`, code);
      svgs.push(svg);
    } catch (err) {
      throw new Error(`第 ${svgs.length + 1} 个图表渲染失败: ${err?.message ?? String(err)}`);
    }
  }
  return svgs;
}
