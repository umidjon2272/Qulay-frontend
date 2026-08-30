import ts from "typescript";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { extname, join, relative } from "node:path";

const SRC_ROOT = process.argv[2] || "src";
const SKIP_DIRS = new Set(["node_modules", "dist", "test"]);
// aria-labelledby contains a DOM id, never user-facing copy.
const TEXT_ATTRS = new Set(["placeholder", "aria-label", "title", "alt", "description", "label", "confirmLabel", "cancelLabel", "text"]);
const CALL_TEXT_ARG0 = new Set(["showToast", "alert", "confirm"]); // window.alert/confirm also matched via property access name

function collectFiles(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const fullPath = join(dir, entry);
    const stats = statSync(fullPath);
    if (stats.isDirectory()) collectFiles(fullPath, files);
    else if ([".ts", ".tsx"].includes(extname(entry)) && !entry.endsWith(".test.ts") && !entry.endsWith(".test.tsx") && !entry.endsWith(".d.ts")) {
      files.push(fullPath);
    }
  }
  return files;
}

function hasLetters(s) {
  return /[A-Za-zА-Яа-яЁёʻʼ‘’]/.test(s);
}

function looksLikeTranslatableText(raw) {
  const s = raw.trim();
  if (!s) return false;
  if (!hasLetters(s)) return false;
  // Product/brand names and technical example values intentionally remain locale-neutral.
  if (/^(QULAY AI(?: ADMIN)?|Qulay AI(?: Admin)?|Telegram|Google|Google Drive|Amazon S3|OpenAI)$/i.test(s)) return false;
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s) || /^@[a-z0-9_]+$/i.test(s)) return false;
  // Short ALL-CAPS tokens (currency codes, acronyms) are usually fine to leave as-is.
  if (/^[A-Z0-9_./-]{1,6}$/.test(s)) return false;
  // Looks like a CSS color / hex / url / path / import specifier.
  if (/^#[0-9a-fA-F]{3,8}$/.test(s)) return false;
  if (/^\.{0,2}\//.test(s) || /^https?:\/\//.test(s)) return false;
  // Looks like an identifier/key (dotted, no spaces, lowercase) e.g. "nav.home".
  if (/^[a-zA-Z][a-zA-Z0-9_]*(\.[a-zA-Z][a-zA-Z0-9_]*)+$/.test(s)) return false;
  // Single emoji / punctuation only.
  if (!/[A-Za-zА-Яа-яЁё]{2,}/.test(s)) return false;
  return true;
}

function isTFunctionCall(node) {
  return ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === "t";
}

function stringLiteralText(node) {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  return null;
}

function templateHasTranslatableParts(node) {
  // For template literals with substitutions, just check the static text chunks.
  if (ts.isTemplateExpression(node)) {
    const head = node.head.text;
    const spans = node.templateSpans.map((s) => s.literal.text).join(" ");
    return looksLikeTranslatableText(head + " " + spans);
  }
  return false;
}

function scanFile(filePath) {
  const text = readFileSync(filePath, "utf8");
  const sourceFile = ts.createSourceFile(filePath, text, ts.ScriptTarget.Latest, true, filePath.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const findings = [];

  function report(node, kind, value) {
    const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
    findings.push({ line: line + 1, kind, value: value.length > 60 ? value.slice(0, 60) + "…" : value });
  }

  function visit(node) {
    // Skip both arguments of a literal t("key", "fallback") call entirely — that's
    // the established, intentional i18n convention, not hardcoded text to fix.
    if (isTFunctionCall(node)) {
      // Still recurse into any nested expressions inside extra args (e.g. params object) safely,
      // but skip the direct string-literal key/fallback arguments.
      for (const arg of node.arguments) {
        if (ts.isStringLiteral(arg) || ts.isNoSubstitutionTemplateLiteral(arg) || ts.isTemplateExpression(arg)) continue;
        visit(arg);
      }
      return;
    }

    if (ts.isJsxText(node)) {
      const value = node.getText();
      if (looksLikeTranslatableText(value)) report(node, "jsx-text", value);
    }

    if (ts.isJsxAttribute(node) && node.name && TEXT_ATTRS.has(node.name.getText())) {
      const init = node.initializer;
      if (init && ts.isStringLiteral(init) && looksLikeTranslatableText(init.text)) {
        report(node, `attr:${node.name.getText()}`, init.text);
      } else if (init && ts.isJsxExpression(init) && init.expression) {
        const expr = init.expression;
        const lit = stringLiteralText(expr);
        if (lit !== null && looksLikeTranslatableText(lit)) report(node, `attr:${node.name.getText()}`, lit);
        else if (ts.isTemplateExpression(expr) && templateHasTranslatableParts(expr)) report(node, `attr-template:${node.name.getText()}`, expr.getText());
        else if (ts.isConditionalExpression(expr)) {
          const branches = [expr.whenTrue, expr.whenFalse];
          for (const branch of branches) {
            const branchLit = stringLiteralText(branch);
            if (branchLit !== null && looksLikeTranslatableText(branchLit) && !isTFunctionCall(branch)) report(node, `attr-ternary:${node.name.getText()}`, branchLit);
          }
        }
      }
    }

    if (ts.isCallExpression(node)) {
      const callee = node.expression;
      let name = null;
      if (ts.isIdentifier(callee)) name = callee.text;
      else if (ts.isPropertyAccessExpression(callee) && ts.isIdentifier(callee.name)) name = callee.name.text;
      if (name && CALL_TEXT_ARG0.has(name) && node.arguments.length > 0) {
        const arg0 = node.arguments[0];
        const lit = stringLiteralText(arg0);
        if (lit !== null && looksLikeTranslatableText(lit)) report(node, `call:${name}`, lit);
        else if (ts.isTemplateExpression(arg0) && templateHasTranslatableParts(arg0)) report(node, `call-template:${name}`, arg0.getText());
        else if (ts.isConditionalExpression(arg0)) {
          for (const branch of [arg0.whenTrue, arg0.whenFalse]) {
            const branchLit = stringLiteralText(branch);
            if (branchLit !== null && looksLikeTranslatableText(branchLit)) report(node, `call-ternary:${name}`, branchLit);
          }
        }
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return findings;
}

const files = collectFiles(SRC_ROOT);
let total = 0;
const byFile = [];
for (const file of files) {
  const findings = scanFile(file);
  if (findings.length) {
    byFile.push({ file: relative(SRC_ROOT, file), findings });
    total += findings.length;
  }
}

byFile.sort((a, b) => b.findings.length - a.findings.length);
for (const { file, findings } of byFile) {
  console.log(`\n=== ${file} (${findings.length}) ===`);
  for (const f of findings) console.log(`  L${f.line} [${f.kind}] ${f.value}`);
}
console.log(`\nTOTAL FILES WITH FINDINGS: ${byFile.length}`);
console.log(`TOTAL FINDINGS: ${total}`);
