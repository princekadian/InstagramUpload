import { execSync } from "node:child_process";

try {
  execSync("npx tsc -p tsconfig.json", { stdio: "inherit" });
} catch (error) {
  process.exit(1);
}
