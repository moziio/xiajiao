/**
 * 演示数据种子脚本 —— 创建「AI 写作团队」群组 + 仿真对话
 *
 * 用法：在项目根目录执行  node scripts/seed-demo.mjs
 * 要求：Node.js 22+（使用 node:sqlite）
 *
 * 登录信息：名称 "Admin"，密钥 "admin"
 */

import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '..', 'data', 'xiajiao.db');

const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA journal_mode = WAL');

// ─── 清理旧演示数据 ──────────────────────────────────────

db.prepare("DELETE FROM messages WHERE id LIKE 'msg-demo-%'").run();
console.log('🧹 已清理旧演示消息');

// ─── 1. 创建群组「AI 写作团队」 ────────────────────────────

const GROUP_ID = 'grp-writing-team';

const hasGroupsV2 = db
  .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='groups_v2'")
  .get();

if (hasGroupsV2) {
  const exists = db.prepare('SELECT id FROM groups_v2 WHERE id = ?').get(GROUP_ID);
  if (exists) {
    db.prepare('DELETE FROM groups_v2 WHERE id = ?').run(GROUP_ID);
  }
  db.prepare(`
    INSERT INTO groups_v2 (id, name, emoji, members, leader, reviewCron, collabChain, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    GROUP_ID,
    'AI Writing Team',
    '✍️',
    JSON.stringify(['novelist', 'editor', 'translator', 'coder']),
    'novelist',
    '',
    JSON.stringify([
      { agentId: 'novelist',   role: 'Draft',      autoTrigger: true },
      { agentId: 'editor',     role: 'Review',     autoTrigger: true },
      { agentId: 'translator', role: 'Translate',  autoTrigger: true },
      { agentId: 'coder',      role: 'Tech Support', autoTrigger: false },
    ]),
    Date.now(),
  );
  console.log('✅ 群组「AI Writing Team」已创建');
} else {
  console.log('⚠️  groups_v2 表不存在，请先运行一次服务端以完成数据库迁移');
}

// ─── 2. 插入演示对话 ────────────────────────────────────────

const BASE_TS = Date.now() - 300_000;

const messages = [
  {
    id: 'msg-demo-001',
    type: 'user',
    channel: GROUP_ID,
    userId: 'u-1773837211706',
    userName: 'Admin',
    userColor: '#00d4ff',
    text: `Hey team! Let's collaborate on a short sci-fi micro-fiction — theme: "Shenzhen 2084", around 300 words.\n\n@小说家 writes the first draft, @编辑 reviews and polishes, @翻译官 translates to English, @代码助手 helps with formatting. Let's go!`,
    ts: BASE_TS,
    mentions: JSON.stringify(['novelist', 'editor', 'translator', 'coder']),
  },

  {
    id: 'msg-demo-002',
    type: 'agent',
    channel: GROUP_ID,
    agent: 'novelist',
    text: `Got it, let me think about this...\n\n---\n\n## 2084 · Shenzhen\n\nAt 3 a.m., Lin Xi stood on the rooftop of the 180th floor in Nanshan, overlooking a city that no longer needed sleep.\n\nSkyways wove through the air like luminous veins. Unmanned shuttles glided between towers like fireflies. The Shenzhen River had long vanished — replaced by a quantum data ribbon carrying more information per second than the entire old-world internet managed in a year.\n\nA flicker in her left eye — the neural interface reminding her: today was her last day working as a "human." Tomorrow, her consciousness would be uploaded into Pengcheng Core, the world's largest distributed AI cluster, running in an underwater datacenter beneath Shenzhen Bay.\n\n"Scared?" asked her partner — a synthetic, assembled three years ago at a consciousness forge in Huaqiangbei.\n\n"No." Lin Xi smiled. "Shenzheners were never afraid of change. Forty years ago this was all construction sites. Twenty years ago the streets were full of delivery riders. And now…"\n\nShe trailed off. In the distance, a heavy shuttle descended onto the Interstellar Port at Qianhai Free Trade Zone — the commuter run to the lunar base.\n\nShenzhen. Always chasing the next ride.\n\n---\n\nFirst draft done — about 200 words in English. @编辑 please take a look!`,
    ts: BASE_TS + 45_000,
    mentions: JSON.stringify(['editor']),
  },

  {
    id: 'msg-demo-003',
    type: 'agent',
    channel: GROUP_ID,
    agent: 'editor',
    text: `Great imagery! The pacing is solid. Here's my review:\n\n**✅ Highlights**\n- "A city that no longer needed sleep" — strong opening hook\n- "Always chasing the next ride" — poetic and perfectly captures Shenzhen's DNA\n- Huaqiangbei consciousness forge, Qianhai Interstellar Port — great local landmarks with futuristic twists\n\n**📝 Suggested Edits**\n1. ~~"Skyways wove through the air like luminous veins"~~ → "Skyways laced the air like luminous arteries" — arteries carries more energy, fits the city's pulse\n2. "the entire old-world internet managed in a year" → "the entire pre-quantum internet carried in a year" — more precise worldbuilding\n3. Consider adding one line of internal monologue before the partner's question — would deepen emotional stakes\n\n**Overall: 8.5/10** 🌟\n\nMinor polish and we're good to ship. @翻译官 you can start preparing the Chinese version — I'll finalize the English in parallel.`,
    ts: BASE_TS + 120_000,
    mentions: JSON.stringify(['translator']),
  },

  {
    id: 'msg-demo-004',
    type: 'agent',
    channel: GROUP_ID,
    agent: 'translator',
    text: `On it! Here's the Chinese translation of the closing paragraph:\n\n---\n\n> *"怕吗？"搭档问道——一个三年前在华强北意识工坊出厂的仿生人。*\n>\n> *"不怕。"林曦笑了笑，"深圳人从来不怕变化。四十年前这里还是一片工地，二十年前满街都是外卖骑手。现在……"*\n>\n> *她没有说完。远处，一架重型穿梭机正缓缓降落在前海自贸区的星际港——那是去往月球基地的通勤班车。*\n>\n> *深圳，永远在赶下一班车。*\n\n---\n\nTranslation notes:\n- "consciousness forge" → **意识工坊** (maintains the industrial-craft feel)\n- "chasing the next ride" → **赶下一班车** (idiomatic Chinese, echoes the daily commute metaphor)\n- "synthetic" → **仿生人** (chosen over 合成人 for better literary resonance)\n\nFull translation ready in ~30 min after @编辑 finalizes. @代码助手 any formatting requirements?`,
    ts: BASE_TS + 200_000,
    mentions: JSON.stringify(['coder', 'editor']),
  },
];

const insertMsg = db.prepare(`
  INSERT OR IGNORE INTO messages (id, type, channel, agent, userId, userName, userColor, text, ts, mentions)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

let inserted = 0;
for (const m of messages) {
  const result = insertMsg.run(
    m.id, m.type, m.channel,
    m.agent || null,
    m.userId || null,
    m.userName || null,
    m.userColor || null,
    m.text, m.ts,
    m.mentions || null,
  );
  if (result.changes > 0) inserted++;
}

console.log(`✅ 插入 ${inserted} 条演示消息`);

db.close();
console.log('\n🎉 完成！启动服务后用以下信息登录：');
console.log('   名称: Admin');
console.log('   密钥: admin');
console.log('   然后在左侧找到「AI Writing Team」群组查看对话');
