import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import sharp from "sharp";

const sizes = [16, 32, 48, 128];
const root = resolve(".");
const svgPath = resolve(root, "public", "assets", "icon.svg");

const svg = await readFile(svgPath);

await Promise.all(
  sizes.map(async (size) => {
    const outPath = resolve(root, "public", "assets", `icon-${size}.png`);
    const png = await sharp(svg).resize(size, size).png().toBuffer();
    await writeFile(outPath, png);
  })
);

console.log("Exported PNG icons to public/assets");
