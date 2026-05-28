import { rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
rmSync(join(root, "dist"), { recursive: true, force: true });
console.log("Clean complete");
