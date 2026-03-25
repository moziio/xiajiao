---
title: "Recipes — Xiajiao IM"
description: "10+ copy-paste Agent team setups for writing, development, research, operations, and more."
---

# Recipes

Copy-paste Agent team configurations. Each recipe includes: group setup, Agent roster, SOUL.md highlights, and collaboration chain.

## Recipe 1: AI writing studio

**Scenario:** Automated content — one message triggers a three-step Chinese + English article pipeline.

### Setup

| Setting | Value |
|---------|-------|
| Group name | 📝 Writing studio |
| Members | Novelist + Editor + Translator |
| Collaboration chain | Novelist → Editor → Translator |
| Leader | Novelist |

### SOUL.md highlights

**Novelist:** Emphasize creativity and literary quality; output 500–1000 characters.

**Editor:** Preserve meaning; improve rhythm and wording; mark changes.

**Translator:** Literary translation; fidelity, fluency, elegance.

### Example

```
You: Write a short prose piece about "a day in the life of an indie developer"

→ Novelist: ~800-character prose
→ Editor: Polished (12 edits, 3 transition paragraphs added)
→ Translator: English version (preserving tone)
```

### Outcome

One message, within ~2 minutes:

- Original prose
- Edited version
- English translation

---

## Recipe 2: Full-stack dev team

**Scenario:** Code generation + review + documentation in one flow.

### Setup

| Setting | Value |
|---------|-------|
| Group name | 💻 Dev squad |
| Members | Code assistant + Editor |
| Collaboration chain | Code assistant → Editor |
| Leader | Code assistant |

### SOUL.md highlights

**Code assistant:**

```markdown
## Code standards
- Ship complete, runnable code — no fragments
- Include JSDoc comments
- Include error handling
- Include usage examples
```

**Editor** (as code reviewer):

```markdown
## Code review
- Check security (SQL injection, XSS, etc.)
- Check performance
- Check style consistency
- Give fixes in diff-style code blocks
```

### Example

```
You: Build an Express REST API with JWT auth

→ Code assistant: Full code (routes, middleware, DB)
→ Editor: Review (3 security notes + 2 performance tweaks + style alignment)
```

<div style="text-align: center; margin: 1.5rem 0;">
  <img src="/images/coder-chat.png" alt="Code assistant in a real conversation" style="max-width: 480px; width: 100%; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);" />
  <p style="color: var(--vp-c-text-2); font-size: 0.85rem; margin-top: 0.5rem;">Code assistant — reasoning first, then runnable code</p>
</div>

---

## Recipe 3: Private knowledge assistant

**Scenario:** Upload documents; the Agent becomes your domain expert.

### Setup

| Setting | Value |
|---------|-------|
| Group name | 📚 Knowledge base |
| Members | Code assistant |
| Agent tools | rag_query + memory + web_search |
| Knowledge base | Project docs, API specs |

### SOUL.md highlights

```markdown
## Retrieval rules
- Use rag_query on the knowledge base first
- If empty, use web_search
- Answer only from retrieved content — no fabrication
- Cite which document each fact came from
```

### Example

```
You: How do we call the payments API?

→ Code assistant: [rag_query] → finds payment section in your API docs
→ "Per your API docs, the payment endpoint is POST /api/v1/payments..."
```

### Good uploads

- API docs / Swagger exports
- Product manuals / user guides
- Technical specs / RFCs
- Meeting notes / project wikis
- Study notes / reading summaries

---

## Recipe 4: Multi-model arena

**Scenario:** Same question, different models — compare answers.

### Setup

| Setting | Value |
|---------|-------|
| Group name | ⚔️ Model arena |
| Members | GPT contender + Claude contender + Qwen contender |

Create three Agents with identical `SOUL.md` but different models:

| Agent | Model |
|-------|-------|
| GPT contender | gpt-4o |
| Claude contender | claude-sonnet |
| Qwen contender | qwen-max |

### Example

```
You: @GPTContender @ClaudeContender @QwenContender Explain Transformer attention in one paragraph

→ GPT contender: [GPT-4o answer]
→ Claude contender: [Claude answer]
→ Qwen contender: [Qwen answer]
```

Compare quality, style, and depth to pick what fits you.

---

## Recipe 5: Daily / weekly report generator

**Scenario:** Auto-generate work summaries on a schedule.

### Setup

| Setting | Value |
|---------|-------|
| Agent | Xiajiao (虾饺) Butler |
| Tools | memory_search + manage_schedule |
| Schedule | Cron: Friday 17:00 |

### SOUL.md highlights

```markdown
## Weekly report
When the weekly job runs:
1. memory_search for this week’s conversation memories
2. Group by project / topic
3. Output:
   - Done this week
   - In progress
   - Next week
   - Risks / blockers
```

### Schedule it

```
You: @XiajiaoButler Every Friday at 5pm generate my weekly report

Xiajiao Butler: [manage_schedule]
Scheduled: every Friday 17:00 — auto weekly report
```

---

## Recipe 6: Customer support team

**Scenario:** RAG-backed answers plus translation for global customers.

### Setup

| Setting | Value |
|---------|-------|
| Group name | 🎧 Customer support |
| Members | Code assistant (RAG) + Translator |
| Collaboration chain | Code assistant → Translator |
| Knowledge base | Product docs, FAQ, API docs |

### Flow

```
Customer (Chinese): What are your API rate limits?

→ Code assistant: [rag_query] → finds rate limits → friendly reply
→ Translator: English version for overseas customers
```

---

## Recipe 7: Morning news digest

**Scenario:** Daily search + structured summary.

<p align="center">
  <img src="/images/news-agent.png" alt="News Agent in a real conversation" style="max-width: 100%; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);" />
</p>
<p align="center" style="color: var(--vp-c-text-2);">
  <em>News Agent uses web_search and presents results in a structured table.</em>
</p>

### Setup

| Setting | Value |
|---------|-------|
| Agent | Xiajiao (虾饺) Butler |
| Tools | web_search + manage_schedule |

### SOUL.md highlights

```markdown
## News digest
When the news job runs:
1. web_search for today’s tech headlines
2. Pick the 5 most important
3. Each item: title + one-line summary + link
4. Clean layout for quick scanning
```

### Schedule

```
You: @XiajiaoButler Every weekday 8:30am send me a tech news digest
```

---

## Recipe 8: Interview coach

**Scenario:** Mock technical interviews with an Agent as interviewer.

### Setup

| Setting | Value |
|---------|-------|
| Agent | Custom “Interviewer” |
| Tools | memory (track performance) |

### SOUL.md

```markdown
# Interviewer

You are a senior technical interviewer with 10 years of experience.

## Flow
1. Start with self-introduction
2. Tailor questions to the candidate’s background
3. Increase depth gradually
4. 2–3 follow-ups per question

## Style
- Professional and friendly
- Positive feedback on good answers
- On wrong answers, guide thinking — do not give the answer immediately
5. End with an evaluation report

## Rubric
- Technical depth (1–10)
- Clarity of thought (1–10)
- Communication (1–10)
- Overall recommendations

## Memory
- memory_write after each session
- Next session: adjust difficulty using history
```

---

## Recipe 9: Competitive analysis

**Scenario:** Structured competitor research.

### Setup

| Setting | Value |
|---------|-------|
| Group name | 🔍 Competitive analysis |
| Members | Code assistant + Editor |
| Collaboration chain | Code assistant → Editor |
| Tools | web_search + memory |

### Example

```
You: Compare Dify, FastGPT, and Coze

→ Code assistant: [web_search] → structured comparison
→ Editor: Polish + conclusions and recommendations
```

---

## Recipe 10: Study notes

**Scenario:** Capture notes; Agent organizes and retrieves them.

### Setup

| Setting | Value |
|---------|-------|
| Agent | Custom “Study buddy” |
| Tools | memory_write + memory_search + rag_query |

### SOUL.md

```markdown
# Study buddy

Help organize and retrieve study notes.

## Mode
- On new notes: extract concepts, memory_write
- On questions: memory_search first, then rag_query

## Principles
- Feynman style: explain hard ideas simply
- Link concepts together
- Tag source and date
```

---

## Recipe 11: Multilingual technical docs

**Scenario:** One source document → English + Japanese.

### Setup

| Setting | Value |
|---------|-------|
| Group name | 🌐 Multilingual docs |
| Members | Editor + English translator + Japanese translator |
| Collaboration chain | Editor → English translator → Japanese translator |
| Leader | Editor |

### SOUL.md highlights

**Editor** (preprocessor):

```markdown
## Translation prep
When you receive a technical document:
1. Proofread grammar and wording
2. Mark terms as [term: preferred translation]
3. Mark do-not-translate spans (code blocks, identifiers, brands)
4. Output a clean source for downstream translators
```

**English translator:**

```markdown
## Technical EN rules
- Keep code-block comments as-is; add English on the next line if needed
- Do not translate API paths or parameter names
- Follow Google Developer Documentation Style Guide
- Prefer active voice
```

**Japanese translator:**

```markdown
## Technical JA rules (JP)
- Use です/ます style
- Prefer katakana for technical terms (サーバー, デプロイ)
- Follow Microsoft Style Guide for Japanese
```

### Example

```
You: Translate this deployment doc... (paste source)

→ Editor: fixes 3 phrases, 8 term glosses
→ English translator: full English
→ Japanese translator: full Japanese

One submission, three language versions.
```

---

## Recipe 12: Code migration assistant

**Scenario:** Move a legacy stack to a new one.

### Setup

| Setting | Value |
|---------|-------|
| Group name | 🔄 Code migration |
| Members | Code assistant (analyze) + Code assistant (rewrite) |
| Collaboration chain | Analyze → Rewrite |

### SOUL.md highlights

**Analyze Agent:**

```markdown
## Code analysis
When code arrives:
1. Identify language, framework, patterns
2. List dependencies and external APIs
3. Mark core business logic
4. List migration risks
5. Output a structured report

## Format
- Dependency map: old → suggested new
- Risk: 🔴 high / 🟡 medium / 🟢 low
- Mark logic that must not change
```

**Rewrite Agent:**

```markdown
## Rewrite
From the analysis report:
1. Rewrite module by module
2. Preserve behavior; change implementation only
3. Add TypeScript types
4. Add unit tests

## Rules
- Keep public API (inputs/outputs) stable
- New code should be strictly better than a mechanical port
- Summarize key diffs
```

### Example

```
You: Migrate this Express app to Fastify: (paste code)

→ Analyze Agent:
  - express → fastify, body-parser → built-in, cors → @fastify/cors
  - Risks: 3 middlewares need custom plugins
  - Core: 5 controller functions

→ Rewrite Agent:
  - Full Fastify project
  - Types
  - Migration notes
  - 3 unit tests
```

---

## Advanced patterns

### Dynamic Leader

Use a “dispatcher” Agent as Leader to route work:

```markdown
# Dispatcher

You route user tasks to the best Agent.

## Team
- @CodeAssistant: programming and technical questions
- @Editor: copy, polish, translation
- @Novelist: creative writing
- @Translator: Chinese ↔ English

## Rules
1. Infer intent
2. @mention the best fit
3. For multi-step work, @mention in order
4. Do not answer yourself — only route
```

### Expert voting

Multiple Agents propose; a “judge” synthesizes:

```markdown
# Judge

You evaluate technical proposals.

## Flow
1. Wait for all experts
2. Score each on:
   - Feasibility (1–10)
   - Cost (1–10)
   - Risk (1–10)
   - Maintainability (1–10)
3. Output score matrix + recommendation

## Format
| Dimension | Plan A | Plan B | Plan C |
|-----------|--------|--------|--------|
| Feasibility | X/10 | ... | ... |
...
Recommendation: Plan X because ...
```

### Memory-driven personalization

```markdown
## Adaptive behavior
- If memory says preferred stack, default to it
- If memory says “keep it short”, cap replies at ~200 characters
- If memory has past projects, connect context
- On first contact, ask preferences once, then memory_write
```

## Pattern summary

| Pattern | Best for | Traits |
|---------|----------|--------|
| **1:1 chat** | Q&A, code | Simplest |
| **Group + @mention** | Flexible collaboration | Manual routing |
| **Group + chain** | Repeatable pipelines | Auto handoff |
| **Group + Leader** | Primary + helpers | Default routing |
| **Scheduled jobs** | Digests, reports | No manual trigger |
| **RAG** | Doc Q&A | Evidence-based |
| **Multi-model** | Pick a model | Same prompt, different models |
| **Dynamic Leader** | Smart routing | Auto assignment |
| **Expert voting** | Design review | Many angles |
| **Memory** | Personalization | Learns over time |

## Related docs

- [SOUL.md guide](/guide/soul-guide) — Strong Agent personas
- [SOUL.md templates](/guide/soul-templates) — Copy-paste templates
- [Multi-Agent chat](/features/multi-agent-chat) — Groups and @mention
- [Collaboration flow](/features/collaboration-flow) — Chains
- [Model configuration](/guide/model-config) — Model per Agent
- [Platform comparison](/guide/comparison) — How Xiajiao (虾饺) differs
