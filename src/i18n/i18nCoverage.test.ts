import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { extname, join } from "node:path";
import { RU } from "./useI18n";

const SRC_ROOT = join(__dirname, "..");
const KEY_PATTERN = /\bt\(\s*["']([a-zA-Z0-9_]+(?:\.[a-zA-Z0-9_]+)+)["']\s*,/g;
const SKIP_DIRS = new Set(["node_modules", "dist", "test"]);

function collectFiles(dir: string, files: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const fullPath = join(dir, entry);
    const stats = statSync(fullPath);
    if (stats.isDirectory()) {
      collectFiles(fullPath, files);
    } else if ([".ts", ".tsx"].includes(extname(entry)) && !entry.endsWith(".test.ts") && !entry.endsWith(".test.tsx")) {
      files.push(fullPath);
    }
  }
  return files;
}

describe("i18n coverage", () => {
  it("every literal t(key, fallback) call site has a Russian translation in RU", () => {
    const files = collectFiles(SRC_ROOT);
    const missing: string[] = [];
    for (const file of files) {
      const content = readFileSync(file, "utf8");
      if (!content.includes("useI18n")) continue;
      const pattern = new RegExp(KEY_PATTERN);
      let match: RegExpExecArray | null;
      while ((match = pattern.exec(content))) {
        const key = match[1];
        if (!(key in RU)) missing.push(`${file.replace(SRC_ROOT, "src")}: "${key}"`);
      }
    }
    expect(missing, `Missing Russian translations for these t() call sites:\n${missing.join("\n")}`).toEqual([]);
  });
});
