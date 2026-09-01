# mermaid2img

English | [简体中文](README.zh-CN.md)

Renders the mermaid code blocks in Markdown files into SVG/PNG images.
Pure Node.js rendering (svgdom + jsdom) — **no Chrome / Puppeteer / Playwright required**.

**Your Markdown files are never modified** — mermaid code blocks stay in place so you can keep editing them. The tool only renders each diagram into an image file, ready to reference in docs, slides, or anywhere else.

## Installation

```bash
git clone https://github.com/1nTooDeep/mermaid2img.git && cd mermaid2img
npm install
npm link   # makes the mermaid2img command globally available
```

## Usage

```bash
mermaid2img README.md                 # process a single file
mermaid2img "docs/**/*.md"            # glob batch (quote the pattern to prevent shell pre-expansion)
mermaid2img README.md -o ./assets     # custom image root directory
mermaid2img README.md -p arch         # custom filename prefix → arch-1.svg
```

## Options

| Option | Default | Description |
| --- | --- | --- |
| `-o, --output <dir>` | `images/<md filename>/` (next to the md file) | Root directory for image output; each md file's images are written to a subdirectory named after that file; relative paths resolve against the current working directory |
| `-p, --prefix <name>` | `diagram` | Prefix for image filenames; numbering starts at 1 |
| `-f, --format <format>` | `svg` | Output format: `svg` or `png` |
| `-t, --theme <theme>` | `default` | Mermaid rendering theme: `default` \| `dark` \| `forest` \| `neutral` |
| `-q, --quality <quality>` | `mid` | PNG quality tier: `low` (×1) \| `mid` (×2) \| `high` (×3) \| `max` (×4) |
| `-s, --scale <scale>` | none | Exact scale factor (takes precedence over `--quality`) |
| `-b, --bg <bg>` | `white` | PNG background: `white` or `transparent` |

## Examples

```bash
# SVG output (default)
mermaid2img README.md

# PNG output, default quality (mid)
mermaid2img README.md -f png

# PNG output, maximum quality
mermaid2img README.md -f png -q max

# Render with the dark theme
mermaid2img README.md -t dark

# Transparent-background PNG
mermaid2img README.md -f png -b transparent
```

## Behavior

- Two output formats are supported:
  - **SVG**: mermaid's native output, no rasterization needed — ideal when you need infinite scaling or further editing
  - **PNG**: rasterized via `@resvg/resvg-js`, with 4 quality tiers (low/mid/high/max) and theme support
- Theming: `--theme` accepts `default` (light) | `dark` | `forest` | `neutral`.
  For the dark theme, `--bg white` is recommended for the best contrast.
- Per-file numbering and directories: the Nth mermaid block in `README.md` becomes
  `images/README/diagram-N.svg` (or `.png`). Multiple md files in the same directory never overwrite each other.
- **Source files are read-only**: the Markdown and mermaid sources stay untouched. The command is
  safe to re-run — images are re-rendered and overwritten under the same names.
- **Fail-safe**: if a file fails to render, that file is skipped (no new files are written to disk
  for it), the CLI exits with code 1, and the remaining files are still processed. Note: when a
  single file contains multiple diagrams and writing fails midway through the write phase,
  images written earlier remain on disk (the render phase still guarantees all diagrams render
  successfully before anything is written).

## Known Limitations

- Mermaid is pinned to `11.12.1` via npm overrides in the dependency tree: newer 11.17.x crashes
  in browser-less environments due to a missing global `CSSStyleSheet` (`isomorphic-mermaid@0.1.1`
  hasn't adapted yet). Verify rendering in a browser-less environment before upgrading.
- svgdom computes text widths approximately, so dimensions can differ slightly from browser rendering.
- **Some diagram types are unavailable without a browser** (they rely on DOM/canvas APIs that
  svgdom/jsdom don't implement; verified against mermaid 11.12.1): `gantt` (missing `offsetWidth`),
  `mindmap` (missing `canvas.getContext`), `sankey-beta` (missing `compareDocumentPosition`),
  `block-beta` (crashes serializing a DOM loop structure). Other common types render fine
  (flowchart / sequence / class / state / er / journey / pie / timeline / quadrant / gitGraph /
  requirement, etc.).
- `quadrantChart` and `requirementDiagram` don't accept Chinese text in their text values
  (a mermaid lexer limitation) — use English text there; CJK labels work normally in mainstream
  types such as flowchart / sequence.
- Only backtick fences (```mermaid) are recognized; CommonMark tilde fences (~~~mermaid) are not supported.
- Globs don't match hidden directories by default: `.github/**/*.md` is not picked up by `**/*.md`.

## PNG Output

PNG output is rasterized via `@resvg/resvg-js` and supports these options:

| Option | Default | Description |
| --- | --- | --- |
| `--format png` | - | Output PNG instead of SVG |
| `--theme` | `default` | Rendering theme: `default` \| `dark` \| `forest` \| `neutral` |
| `--quality` | `mid` | Resolution tier: `low` (×1) \| `mid` (×2) \| `high` (×3) \| `max` (×4) |
| `--scale` | - | Exact scale factor (overrides `--quality`) |
| `--bg` | `white` | Background: `white` or `transparent` |

**Theme and background combinations:**
- `--theme default` + `--bg white`: light diagram on white — universal
- `--theme dark` + `--bg white`: dark diagram on white — best contrast
- `--bg transparent`: transparent background, ideal for embedding in dark-themed documents

## Development

```bash
npm test        # full vitest suite
```
