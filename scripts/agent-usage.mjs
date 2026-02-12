#!/usr/bin/env node

import { readdir, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const DEFAULT_STATE_DIR = ".long-agent";

function parseArgs(argv) {
  const args = {
    stateDir: DEFAULT_STATE_DIR,
    top: 10
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--state-dir") {
      args.stateDir = argv[++i];
    } else if (token === "--top") {
      args.top = Number.parseInt(argv[++i], 10);
    } else if (token === "-h" || token === "--help") {
      printHelp();
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${token}`);
    }
  }

  if (!Number.isFinite(args.top) || args.top <= 0) {
    throw new Error("--top must be a positive integer");
  }

  return args;
}

function printHelp() {
  const help = `
agent-usage - summarize long-agent token usage

Usage:
  node scripts/agent-usage.mjs [options]

Options:
  --state-dir <path>   State directory (default: ${DEFAULT_STATE_DIR})
  --top <n>            Show top N iterations by fresh tokens (default: 10)
  -h, --help           Show help
`;
  process.stdout.write(help);
}

function safeInt(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.floor(value));
  }
  return 0;
}

function pct(part, total) {
  if (!total) {
    return "0.00%";
  }
  return `${((part / total) * 100).toFixed(2)}%`;
}

function padRight(text, width) {
  const raw = String(text);
  if (raw.length >= width) {
    return raw;
  }
  return `${raw}${" ".repeat(width - raw.length)}`;
}

function padLeft(text, width) {
  const raw = String(text);
  if (raw.length >= width) {
    return raw;
  }
  return `${" ".repeat(width - raw.length)}${raw}`;
}

async function readReport(filePath) {
  const raw = await readFile(filePath, "utf8");
  const json = JSON.parse(raw);
  const usage = json.usage || {};

  const input = safeInt(usage.input_tokens);
  const cacheCreate = safeInt(usage.cache_creation_input_tokens);
  const cacheRead = safeInt(usage.cache_read_input_tokens);
  const output = safeInt(usage.output_tokens);
  const fresh = input + cacheCreate;
  const totalContext = fresh + cacheRead;

  return {
    file: path.basename(filePath),
    iteration: safeInt(json?.metadata?.iteration),
    feature: json?.metadata?.selectedFeature || "",
    input,
    cacheCreate,
    cacheRead,
    output,
    fresh,
    totalContext,
    reuseRate: totalContext ? cacheRead / totalContext : 0
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const cwd = process.cwd();
  const reportsDir = path.resolve(cwd, args.stateDir, "reports");

  if (!existsSync(reportsDir)) {
    throw new Error(`Reports directory not found: ${reportsDir}`);
  }

  const files = (await readdir(reportsDir))
    .filter((name) => /^iteration-\d+\.json$/.test(name))
    .sort();

  if (files.length === 0) {
    process.stdout.write(`[agent-usage] no iteration reports found in ${reportsDir}\n`);
    return;
  }

  const rows = [];
  for (const file of files) {
    const row = await readReport(path.join(reportsDir, file));
    rows.push(row);
  }

  const totals = rows.reduce(
    (acc, row) => {
      acc.input += row.input;
      acc.cacheCreate += row.cacheCreate;
      acc.cacheRead += row.cacheRead;
      acc.output += row.output;
      acc.fresh += row.fresh;
      acc.totalContext += row.totalContext;
      return acc;
    },
    { input: 0, cacheCreate: 0, cacheRead: 0, output: 0, fresh: 0, totalContext: 0 }
  );

  const avg = {
    input: Math.round(totals.input / rows.length),
    cacheCreate: Math.round(totals.cacheCreate / rows.length),
    cacheRead: Math.round(totals.cacheRead / rows.length),
    output: Math.round(totals.output / rows.length),
    fresh: Math.round(totals.fresh / rows.length),
    totalContext: Math.round(totals.totalContext / rows.length)
  };

  process.stdout.write(`[agent-usage] state dir: ${path.resolve(cwd, args.stateDir)}\n`);
  process.stdout.write(`[agent-usage] iterations: ${rows.length}\n\n`);

  process.stdout.write("Totals:\n");
  process.stdout.write(`  input_tokens:                ${totals.input}\n`);
  process.stdout.write(`  cache_creation_input_tokens: ${totals.cacheCreate}\n`);
  process.stdout.write(`  cache_read_input_tokens:     ${totals.cacheRead}\n`);
  process.stdout.write(`  output_tokens:               ${totals.output}\n`);
  process.stdout.write(`  fresh_context_tokens:        ${totals.fresh}\n`);
  process.stdout.write(`  total_context_tokens:        ${totals.totalContext}\n`);
  process.stdout.write(`  cache_reuse_ratio:           ${pct(totals.cacheRead, totals.totalContext)}\n`);
  process.stdout.write(`  fresh_context_ratio:         ${pct(totals.fresh, totals.totalContext)}\n\n`);

  process.stdout.write("Average per iteration:\n");
  process.stdout.write(`  input_tokens:                ${avg.input}\n`);
  process.stdout.write(`  cache_creation_input_tokens: ${avg.cacheCreate}\n`);
  process.stdout.write(`  cache_read_input_tokens:     ${avg.cacheRead}\n`);
  process.stdout.write(`  output_tokens:               ${avg.output}\n`);
  process.stdout.write(`  fresh_context_tokens:        ${avg.fresh}\n`);
  process.stdout.write(`  total_context_tokens:        ${avg.totalContext}\n\n`);

  const topRows = [...rows].sort((a, b) => b.fresh - a.fresh).slice(0, args.top);
  process.stdout.write(`Top ${topRows.length} iterations by fresh_context_tokens:\n`);
  process.stdout.write(
    `${padRight("iter", 6)} ${padRight("feature", 10)} ${padLeft("fresh", 10)} ${padLeft("cache_read", 12)} ${padLeft("reuse", 8)} ${padRight("file", 20)}\n`
  );
  for (const row of topRows) {
    process.stdout.write(
      `${padRight(row.iteration, 6)} ${padRight(row.feature || "-", 10)} ${padLeft(row.fresh, 10)} ${padLeft(row.cacheRead, 12)} ${padLeft(pct(row.cacheRead, row.totalContext), 8)} ${padRight(row.file, 20)}\n`
    );
  }
}

main().catch((error) => {
  process.stderr.write(`[agent-usage] fatal: ${error.message}\n`);
  process.exit(1);
});
