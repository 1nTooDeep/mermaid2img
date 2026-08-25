import fg from 'fast-glob';

export async function expandInputs(patterns) {
  const files = await fg.glob(patterns, {
    onlyFiles: true,
    ignore: ['**/node_modules/**'],
  });
  return [...new Set(files)].sort();
}
