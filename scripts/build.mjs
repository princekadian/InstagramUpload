import { build, context } from "esbuild";
import { rmSync, mkdirSync, copyFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const distDir = join(root, "dist");
const watch = process.argv.includes("--watch");

const entryPoints = {
  "background/index": join(root, "src/background/index.ts"),
  "content/index": join(root, "src/content/index.ts"),
  "injected/page": join(root, "src/injected/page.ts")
};

function copyRecursive(src, dest) {
  const stats = statSync(src);
  if (stats.isDirectory()) {
    mkdirSync(dest, { recursive: true });
    for (const entry of readdirSync(src)) {
      copyRecursive(join(src, entry), join(dest, entry));
    }
  } else {
    mkdirSync(dirname(dest), { recursive: true });
    copyFileSync(src, dest);
  }
}

rmSync(distDir, { recursive: true, force: true });
mkdirSync(distDir, { recursive: true });

const buildOptions = {
  entryPoints,
  outdir: distDir,
  bundle: true,
  format: "esm",
  target: "es2020",
  sourcemap: true,
  splitting: false,
  platform: "browser",
  define: {
    __BUILD_TIME__: JSON.stringify(new Date().toISOString())
  }
};

if (watch) {
  const ctx = await context(buildOptions);
  await ctx.watch();
  console.log("Watching for changes...");
} else {
  await build(buildOptions);
}

copyRecursive(join(root, "public"), distDir);

console.log("Build complete");
