import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

vi.setConfig({ testTimeout: 30000 });

const execFileAsync = promisify(execFile);
const CLI = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'bin', 'cli.js');

let dir;
beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), 'm2i-cli-'));
});
afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

const MD = ['# 流程', '', '```mermaid', 'flowchart LR\n    A[开始] --> B[结束]', '```'].join('\n');

describe('mermaid2img CLI', () => {
  it('端到端冒烟：生成图片、原 Markdown 保持不变', async () => {
    const mdPath = path.join(dir, 'README.md');
    await writeFile(mdPath, MD, 'utf8');

    const { stdout } = await execFileAsync('node', [CLI, mdPath]);

    expect(stdout).toContain('README.md');
    expect(stdout).toContain('1 张图片');
    expect(stdout).toContain('完成');
    const svg = await readFile(path.join(dir, 'images', 'diagram-1.svg'), 'utf8');
    expect(svg).toContain('<svg');
    expect(await readFile(mdPath, 'utf8')).toBe(MD);
  });

  it('无匹配文件时以退出码 1 失败并提示', async () => {
    const err = await execFileAsync('node', [CLI, path.join(dir, 'nope-*.md')]).then(
      () => null,
      (e) => e,
    );
    expect(err).not.toBeNull();
    expect(err.code).toBe(1);
    expect(err.stderr).toContain('未匹配到任何 Markdown 文件');
  });
});
