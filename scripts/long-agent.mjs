#!/usr/bin/env node

import { spawn } from "node:child_process";
import { chmod, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_PLAN_PATH = "docs/development-plan.md";
const DEFAULT_STATE_DIR = ".long-agent";
const DEFAULT_VERIFY_COMMAND = "pnpm lint && pnpm type-check";

const INIT_SCHEMA = {
  type: "object",
  required: ["project_summary", "features", "init_script", "next_action"],
  additionalProperties: false,
  properties: {
    project_summary: { type: "string", minLength: 20 },
    next_action: { type: "string", minLength: 5 },
    init_script: { type: "string", minLength: 20 },
    features: {
      type: "array",
      minItems: 20,
      items: {
        type: "object",
        required: ["id", "title", "description", "acceptance", "priority", "category"],
        additionalProperties: false,
        properties: {
          id: { type: "string", minLength: 3 },
          title: { type: "string", minLength: 5 },
          description: { type: "string", minLength: 10 },
          acceptance: {
            type: "array",
            minItems: 2,
            items: { type: "string", minLength: 5 }
          },
          priority: {
            type: "string",
            enum: ["P0", "P1", "P2", "P3"]
          },
          category: {
            type: "string",
            enum: ["foundation", "backend", "admin-ui", "frontend", "quality", "ops"]
          },
          depends_on: {
            type: "array",
            items: { type: "string", minLength: 1 }
          }
        }
      }
    }
  }
};

const LOOP_SCHEMA = {
  type: "object",
  required: ["feature_id", "status", "summary", "changed_files", "checks", "next_step"],
  additionalProperties: false,
  properties: {
    feature_id: { type: "string", minLength: 1 },
    status: { type: "string", enum: ["done", "blocked", "needs_human"] },
    summary: { type: "string", minLength: 10 },
    changed_files: {
      type: "array",
      items: { type: "string" }
    },
    checks: {
      type: "array",
      items: {
        type: "object",
        required: ["command", "passed", "notes"],
        additionalProperties: false,
        properties: {
          command: { type: "string", minLength: 1 },
          passed: { type: "boolean" },
          notes: { type: "string", minLength: 1 }
        }
      }
    },
    commit: {
      type: "object",
      required: ["created", "message"],
      additionalProperties: false,
      properties: {
        created: { type: "boolean" },
        message: { type: "string" }
      }
    },
    next_step: { type: "string", minLength: 5 }
  }
};

function parseArgs(argv) {
  const args = {
    plan: DEFAULT_PLAN_PATH,
    stateDir: DEFAULT_STATE_DIR,
    maxIterations: 3,
    delaySeconds: 3,
    verifyCommand: DEFAULT_VERIFY_COMMAND,
    model: "",
    maxBudgetUsd: "",
    initOnly: false,
    workspace: process.cwd()
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--plan") {
      args.plan = argv[++i];
    } else if (token === "--state-dir") {
      args.stateDir = argv[++i];
    } else if (token === "--max-iterations") {
      args.maxIterations = Number.parseInt(argv[++i], 10);
    } else if (token === "--delay-seconds") {
      args.delaySeconds = Number.parseInt(argv[++i], 10);
    } else if (token === "--verify-command") {
      args.verifyCommand = argv[++i];
    } else if (token === "--model") {
      args.model = argv[++i];
    } else if (token === "--max-budget-usd") {
      args.maxBudgetUsd = argv[++i];
    } else if (token === "--init-only") {
      args.initOnly = true;
    } else if (token === "--workspace") {
      args.workspace = argv[++i];
    } else if (token === "-h" || token === "--help") {
      printHelp();
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${token}`);
    }
  }

  if (!Number.isFinite(args.maxIterations) || args.maxIterations < 0) {
    throw new Error("--max-iterations must be a non-negative integer");
  }
  if (!Number.isFinite(args.delaySeconds) || args.delaySeconds < 0) {
    throw new Error("--delay-seconds must be a non-negative integer");
  }

  return args;
}

function printHelp() {
  const help = `\nlong-agent - two-phase long-running agent harness\n\nUsage:\n  node scripts/long-agent.mjs [options]\n\nOptions:\n  --plan <path>            Development plan markdown file (default: ${DEFAULT_PLAN_PATH})\n  --state-dir <path>       State directory for feature list/logs (default: ${DEFAULT_STATE_DIR})\n  --max-iterations <n>     Coding iterations per run, after init (default: 3)\n  --delay-seconds <n>      Delay between coding iterations (default: 3)\n  --verify-command <cmd>   Verification command run by coding agent\n  --model <name>           Claude model alias/name (optional)\n  --max-budget-usd <num>   Budget cap passed to Claude CLI (optional)\n  --init-only              Run initializer phase only, then exit\n  --workspace <path>       Target repository root (default: cwd)\n  -h, --help               Show help\n`;
  process.stdout.write(help);
}

async function readText(filePath) {
  return readFile(filePath, "utf8");
}

async function writeJson(filePath, value) {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function readJson(filePath) {
  const content = await readText(filePath);
  return JSON.parse(content);
}

function timestamp() {
  return new Date().toISOString();
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function countFeatureStatus(features) {
  const counts = {
    total: features.length,
    todo: 0,
    in_progress: 0,
    done: 0,
    blocked: 0,
    needs_human: 0
  };

  for (const feature of features) {
    const status = feature.status || "todo";
    if (Object.hasOwn(counts, status)) {
      counts[status] += 1;
    } else {
      counts.todo += 1;
    }
  }

  return counts;
}

function getNextFeature(features) {
  const doneIds = new Set(
    features.filter((feature) => feature.status === "done").map((feature) => feature.id)
  );

  for (const feature of features) {
    if (feature.status === "done") {
      continue;
    }

    const dependencies = Array.isArray(feature.depends_on) ? feature.depends_on : [];
    const dependencyReady = dependencies.every((id) => doneIds.has(id));
    if (dependencyReady) {
      return feature;
    }
  }

  return features.find((feature) => feature.status !== "done") || null;
}

function renderTemplate(template, replacements) {
  let rendered = template;
  for (const [key, value] of Object.entries(replacements)) {
    rendered = rendered.replaceAll(`{{${key}}}`, value);
  }
  return rendered;
}

function extractResultJson(rawOutput) {
  const trimmed = rawOutput.trim();
  if (!trimmed) {
    throw new Error("Claude returned empty output");
  }

  const lines = trimmed.split(/\n+/);
  let parsed = null;

  for (let i = lines.length - 1; i >= 0; i -= 1) {
    const line = lines[i].trim();
    if (!line.startsWith("{")) {
      continue;
    }

    try {
      parsed = JSON.parse(line);
      break;
    } catch (_error) {
      // Continue scanning upward.
    }
  }

  if (!parsed) {
    throw new Error(`Failed to parse Claude JSON output: ${trimmed.slice(0, 300)}`);
  }

  if (parsed.subtype !== "success" || parsed.is_error) {
    throw new Error(`Claude execution failed: ${JSON.stringify(parsed)}`);
  }

  if (parsed.structured_output) {
    return {
      sessionId: parsed.session_id || "",
      structured: parsed.structured_output,
      rawResult: parsed.result || "",
      usage: parsed.usage || {}
    };
  }

  throw new Error("Claude did not return structured_output. Ensure --json-schema is supported.");
}

async function runClaude({ prompt, schema, workspace, model, maxBudgetUsd }) {
  const args = [
    "-p",
    "-",
    "--output-format",
    "json",
    "--permission-mode",
    "bypassPermissions",
    "--add-dir",
    workspace,
    "--json-schema",
    JSON.stringify(schema)
  ];

  if (model) {
    args.push("--model", model);
  }

  if (maxBudgetUsd) {
    args.push("--max-budget-usd", String(maxBudgetUsd));
  }

  const result = await new Promise((resolve, reject) => {
    const child = spawn("claude", args, {
      cwd: workspace,
      env: process.env,
      stdio: ["pipe", "pipe", "pipe"]
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    child.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    child.on("error", (error) => {
      reject(error);
    });

    child.on("exit", (code) => {
      if (code !== 0) {
        reject(new Error(`Claude exited with code ${code}: ${stderr || stdout}`));
        return;
      }
      resolve({ stdout, stderr });
    });

    child.stdin.write(prompt);
    child.stdin.end();
  });

  return extractResultJson(result.stdout);
}

async function appendProgress(progressFile, entry) {
  const block = [
    `## ${timestamp()}`,
    `- Session: ${entry.sessionType}`,
    `- Iteration: ${entry.iteration}`,
    `- Feature: ${entry.featureId || "N/A"}`,
    `- Status: ${entry.status}`,
    `- Summary: ${entry.summary}`,
    `- Next: ${entry.nextStep}`,
    ""
  ].join("\n");

  const prior = existsSync(progressFile) ? await readText(progressFile) : "";
  await writeFile(progressFile, `${prior}${block}`, "utf8");
}

async function ensureStateFiles(stateDir, stateFile, progressFile) {
  await mkdir(stateDir, { recursive: true });
  await mkdir(path.join(stateDir, "reports"), { recursive: true });
  await mkdir(path.join(stateDir, "logs"), { recursive: true });

  if (!existsSync(stateFile)) {
    await writeJson(stateFile, {
      createdAt: timestamp(),
      initialized: false,
      iteration: 0,
      lastFeatureId: ""
    });
  }

  if (!existsSync(progressFile)) {
    await writeFile(progressFile, "# Long Agent Progress\n\n", "utf8");
  }
}

function normalizeFeatures(features) {
  const ids = new Set();
  return features.map((feature, index) => {
    const id = String(feature.id || `F-${index + 1}`).trim();
    const safeId = ids.has(id) ? `${id}-${index + 1}` : id;
    ids.add(safeId);

    return {
      id: safeId,
      title: feature.title,
      description: feature.description,
      acceptance: feature.acceptance,
      priority: feature.priority,
      category: feature.category,
      depends_on: Array.isArray(feature.depends_on) ? feature.depends_on : [],
      status: "todo"
    };
  });
}

async function loadTail(filePath, maxChars = 6000) {
  if (!existsSync(filePath)) {
    return "";
  }

  const content = await readText(filePath);
  if (content.length <= maxChars) {
    return content;
  }
  return content.slice(content.length - maxChars);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const workspace = path.resolve(args.workspace);
  const planPath = path.resolve(workspace, args.plan);
  const stateDir = path.resolve(workspace, args.stateDir);
  const featurePath = path.join(stateDir, "feature_list.json");
  const progressPath = path.join(stateDir, "agent-progress.md");
  const statePath = path.join(stateDir, "state.json");
  const initScriptPath = path.join(stateDir, "init.sh");

  const initializerPromptPath = path.resolve(__dirname, "../long-agent/prompts/initializer.md");
  const codingPromptPath = path.resolve(__dirname, "../long-agent/prompts/coding.md");

  const planStats = await stat(planPath).catch(() => null);
  if (!planStats) {
    throw new Error(`Plan file not found: ${planPath}`);
  }

  const initializerTemplate = await readText(initializerPromptPath);
  const codingTemplate = await readText(codingPromptPath);

  await ensureStateFiles(stateDir, statePath, progressPath);
  const state = await readJson(statePath);

  const baseRunMeta = {
    workspace,
    plan: path.relative(workspace, planPath),
    stateDir: path.relative(workspace, stateDir),
    maxIterations: args.maxIterations,
    verifyCommand: args.verifyCommand,
    model: args.model || "default"
  };

  process.stdout.write(`\n[long-agent] workspace: ${workspace}\n`);
  process.stdout.write(`[long-agent] plan: ${baseRunMeta.plan}\n`);
  process.stdout.write(`[long-agent] state dir: ${baseRunMeta.stateDir}\n`);

  if (!existsSync(featurePath)) {
    const planContent = await readText(planPath);
    const prompt = renderTemplate(initializerTemplate, {
      PROJECT_ROOT: workspace,
      PLAN_FILE: baseRunMeta.plan,
      PLAN_CONTENT: planContent,
      VERIFY_COMMAND: args.verifyCommand
    });

    process.stdout.write("\n[long-agent] phase=initializer running...\n");
    const initResponse = await runClaude({
      prompt,
      schema: INIT_SCHEMA,
      workspace,
      model: args.model,
      maxBudgetUsd: args.maxBudgetUsd
    });

    const normalizedFeatures = normalizeFeatures(initResponse.structured.features);
    await writeJson(featurePath, normalizedFeatures);

    const initScript = `${initResponse.structured.init_script.trim()}\n`;
    await writeFile(initScriptPath, initScript, "utf8");
    await chmod(initScriptPath, 0o755);

    state.initialized = true;
    state.initializedAt = timestamp();
    state.lastFeatureId = "";
    state.summary = initResponse.structured.project_summary;
    await writeJson(statePath, state);

    await appendProgress(progressPath, {
      sessionType: "initializer",
      iteration: state.iteration,
      featureId: "",
      status: "done",
      summary: initResponse.structured.project_summary,
      nextStep: initResponse.structured.next_action
    });

    await writeJson(path.join(stateDir, "reports", "initializer.json"), {
      metadata: baseRunMeta,
      createdAt: timestamp(),
      response: initResponse.structured
    });

    process.stdout.write(`[long-agent] initializer complete. features=${normalizedFeatures.length}\n`);
  }

  if (args.initOnly) {
    process.stdout.write("[long-agent] --init-only enabled, stopping after initializer.\n");
    return;
  }

  for (let localIteration = 1; localIteration <= args.maxIterations; localIteration += 1) {
    const features = await readJson(featurePath);
    const countsBefore = countFeatureStatus(features);
    if (countsBefore.todo + countsBefore.in_progress + countsBefore.blocked + countsBefore.needs_human === 0) {
      process.stdout.write("\n[long-agent] all features are done.\n");
      break;
    }

    const nextFeature = getNextFeature(features);
    if (!nextFeature) {
      process.stdout.write("\n[long-agent] no selectable feature found, exiting.\n");
      break;
    }

    nextFeature.status = "in_progress";
    await writeJson(featurePath, features);

    const progressTail = await loadTail(progressPath);
    const prompt = renderTemplate(codingTemplate, {
      PROJECT_ROOT: workspace,
      PLAN_FILE: baseRunMeta.plan,
      FEATURE_LIST: JSON.stringify(features, null, 2),
      CURRENT_FEATURE: JSON.stringify(nextFeature, null, 2),
      PROGRESS_NOTES: progressTail,
      VERIFY_COMMAND: args.verifyCommand
    });

    const iterationNumber = state.iteration + 1;
    process.stdout.write(`\n[long-agent] phase=coding iteration=${iterationNumber} feature=${nextFeature.id}\n`);

    const loopResponse = await runClaude({
      prompt,
      schema: LOOP_SCHEMA,
      workspace,
      model: args.model,
      maxBudgetUsd: args.maxBudgetUsd
    });

    const latestFeatures = await readJson(featurePath);
    const targetFeature = latestFeatures.find((item) => item.id === nextFeature.id);

    if (!targetFeature) {
      throw new Error(`Feature disappeared unexpectedly: ${nextFeature.id}`);
    }

    if (loopResponse.structured.status === "done") {
      targetFeature.status = "done";
    } else if (loopResponse.structured.status === "blocked") {
      targetFeature.status = "blocked";
    } else {
      targetFeature.status = "needs_human";
    }

    await writeJson(featurePath, latestFeatures);

    const reportPath = path.join(
      stateDir,
      "reports",
      `iteration-${String(iterationNumber).padStart(4, "0")}.json`
    );

    await writeJson(reportPath, {
      metadata: {
        ...baseRunMeta,
        iteration: iterationNumber,
        selectedFeature: nextFeature.id
      },
      createdAt: timestamp(),
      response: loopResponse.structured,
      usage: loopResponse.usage
    });

    state.iteration = iterationNumber;
    state.lastFeatureId = nextFeature.id;
    state.lastStatus = loopResponse.structured.status;
    state.lastUpdatedAt = timestamp();
    await writeJson(statePath, state);

    await appendProgress(progressPath, {
      sessionType: "coding",
      iteration: iterationNumber,
      featureId: nextFeature.id,
      status: loopResponse.structured.status,
      summary: loopResponse.structured.summary,
      nextStep: loopResponse.structured.next_step
    });

    const countsAfter = countFeatureStatus(await readJson(featurePath));
    process.stdout.write(
      `[long-agent] done iteration=${iterationNumber}; done=${countsAfter.done}/${countsAfter.total}; blocked=${countsAfter.blocked}; needs_human=${countsAfter.needs_human}\n`
    );

    if (loopResponse.structured.status === "needs_human") {
      process.stdout.write("[long-agent] model requested human input. stopping now.\n");
      break;
    }

    if (localIteration < args.maxIterations && args.delaySeconds > 0) {
      process.stdout.write(`[long-agent] sleep ${args.delaySeconds}s before next iteration...\n`);
      await sleep(args.delaySeconds * 1000);
    }
  }

  const finalFeatures = await readJson(featurePath);
  const finalCounts = countFeatureStatus(finalFeatures);
  process.stdout.write(
    `\n[long-agent] finished. total=${finalCounts.total}, done=${finalCounts.done}, todo=${finalCounts.todo}, blocked=${finalCounts.blocked}, needs_human=${finalCounts.needs_human}\n`
  );
}

main().catch((error) => {
  process.stderr.write(`\n[long-agent] fatal: ${error.message}\n`);
  process.exit(1);
});
