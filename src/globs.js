// fast-glob v3 是 CJS 包：必须默认导入（`import fg from 'fast-glob'`），
// 具名导入 `glob` 不是函数。
import fg from 'fast-glob';

/**
 * 将 CLI 输入的模式数组展开为去重、排序后的 Markdown 文件路径列表。
 * fast-glob 默认不排除 node_modules，需显式忽略；也不匹配隐藏目录（dot: false）。
 *
 * @param {string[]} patterns glob 模式或字面文件路径
 * @returns {Promise<string[]>} 去重排序后的文件路径
 */
export async function expandInputs(patterns) {
  const files = await fg.glob(patterns, {
    onlyFiles: true,
    ignore: ['**/node_modules/**'],
  });
  return [...new Set(files)].sort();
}
