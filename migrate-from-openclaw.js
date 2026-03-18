#!/usr/bin/env node
/**
 * 迁移脚本：从 openclaw.json 导入 Agent 和 Model 数据到虾饺 IM 独立配置
 *
 * 用法：node migrate-from-openclaw.js [openclaw.json 路径]
 * 默认路径：~/.openclaw/openclaw.json
 */
const fs = require('fs');
const path = require('path');

const OPENCLAW_CONFIG = process.argv[2] || path.join(process.env.USERPROFILE || process.env.HOME || '', '.openclaw', 'openclaw.json');
const PROJECT_DIR = __dirname;
const AGENTS_FILE = path.join(PROJECT_DIR, 'agents.json');
const MODELS_FILE = path.join(PROJECT_DIR, 'models.json');
const DATA_DIR = path.join(PROJECT_DIR, 'data');

console.log(`\n=== 虾饺 IM 迁移工具 ===\n`);
console.log(`源文件: ${OPENCLAW_CONFIG}`);
console.log(`目标目录: ${PROJECT_DIR}\n`);

if (!fs.existsSync(OPENCLAW_CONFIG)) {
  console.error(`错误: 找不到 ${OPENCLAW_CONFIG}`);
  process.exit(1);
}

const config = JSON.parse(fs.readFileSync(OPENCLAW_CONFIG, 'utf8'));

// --- 迁移 Agents ---
const existingAgents = [];
try { existingAgents.push(...JSON.parse(fs.readFileSync(AGENTS_FILE, 'utf8')).agents); } catch {}
const existingIds = new Set(existingAgents.map(a => a.id));

const sourceAgents = config.agents?.list || [];
let migratedCount = 0;
let skippedCount = 0;

fs.mkdirSync(DATA_DIR, { recursive: true });

for (const agent of sourceAgents) {
  if (existingIds.has(agent.id)) {
    console.log(`  跳过 Agent "${agent.name}" (${agent.id}) - 已存在`);
    skippedCount++;
    continue;
  }

  const newWorkspace = path.join(DATA_DIR, `workspace-${agent.id}`);
  fs.mkdirSync(newWorkspace, { recursive: true });

  // 复制工作区文件
  const oldWorkspace = agent.workspace;
  if (oldWorkspace && fs.existsSync(oldWorkspace)) {
    try {
      const entries = fs.readdirSync(oldWorkspace, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isFile()) continue;
        const src = path.join(oldWorkspace, entry.name);
        const dst = path.join(newWorkspace, entry.name);
        if (!fs.existsSync(dst)) {
          fs.copyFileSync(src, dst);
          console.log(`    复制文件: ${entry.name}`);
        }
      }
    } catch (e) {
      console.warn(`    警告: 复制工作区文件失败 - ${e.message}`);
    }
  }

  const model = agent.model?.primary || '';
  existingAgents.push({
    id: agent.id,
    name: agent.name,
    model,
    workspace: newWorkspace,
    createdAt: Date.now()
  });
  console.log(`  迁移 Agent "${agent.name}" (${agent.id}) -> ${newWorkspace}`);
  migratedCount++;
}

fs.writeFileSync(AGENTS_FILE, JSON.stringify({ agents: existingAgents }, null, 2));
console.log(`\nAgent 迁移完成: ${migratedCount} 个新增, ${skippedCount} 个跳过\n`);

// --- 迁移 Models ---
const providers = {};
const models = [];
const sourceProviders = config.models?.providers || {};

for (const [provId, prov] of Object.entries(sourceProviders)) {
  providers[provId] = {
    baseUrl: prov.baseUrl || '',
    apiKey: `env:${provId.toUpperCase().replace(/-/g, '_')}_API_KEY`,
    api: prov.api || 'openai-completions'
  };

  for (const m of (prov.models || [])) {
    models.push({
      id: `${provId}/${m.id}`,
      name: m.name || m.id,
      provider: provId,
      reasoning: m.reasoning || false,
      input: m.input || ['text'],
      contextWindow: m.contextWindow,
      maxTokens: m.maxTokens
    });
  }
}

const modelsData = { providers, models };
fs.writeFileSync(MODELS_FILE, JSON.stringify(modelsData, null, 2));
console.log(`模型迁移完成: ${Object.keys(providers).length} 个 Provider, ${models.length} 个 Model\n`);

console.log('=== 迁移完成 ===\n');
console.log('请检查以下文件:');
console.log(`  ${AGENTS_FILE}`);
console.log(`  ${MODELS_FILE}`);
console.log(`  ${DATA_DIR}/\n`);
console.log('注意: models.json 中的 apiKey 使用了 env: 占位符,');
console.log('请根据需要配置对应的环境变量或直接修改 apiKey 值。\n');
