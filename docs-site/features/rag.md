---
title: "RAG Knowledge Base — Xiajiao (虾饺) IM"
description: "BM25 + vector hybrid retrieval, RRF fusion, LLM reranking, hierarchical chunks—upload docs and Agents become domain experts."
---

# RAG knowledge base

Xiajiao (虾饺) includes a production-style RAG (Retrieval-Augmented Generation) stack. Upload documents, indexing runs automatically, and questions hit `rag_query` from [Tool Calling](/features/tool-calling)—your docs become the Agent’s grounding layer. Pair with [Agent persistent memory](/features/agent-memory): RAG for document facts; memory for user prefs and history.

<p align="center">
  <img src="/images/demo.png" alt="RAG retrieval" style="max-width: 100%; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);" />
</p>
<p align="center" style="color: var(--vp-c-text-2);">
  <em>An Agent retrieves from the knowledge base and answers in a structured way.</em>
</p>

## Why RAG?

LLMs are limited by:

1. **Knowledge cutoff** — no brand-new facts after training  
2. **Private data** — no access to your internal API docs or manuals  

RAG fixes this: retrieve relevant chunks first, then generate grounded answers.

| Without RAG | With RAG |
|-------------|----------|
| “I don’t know your API shape” | “Per your API doc, auth uses Bearer Token…” |
| Higher hallucination risk | Grounded in real docs |
| No citations | Can point to source docs |

## Three-stage retrieval pipeline

Layers of filtering keep only relevant context for the LLM:

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│  User question                                      │
│     ↓                                               │
│  ┌──── Stage 1: dual retrieval ────┐                │
│  │                                 │                │
│  │  BM25           Vector search   │                │
│  │  (keywords)     (semantics)     │                │
│  │     ↓              ↓            │                │
│  │   set A         set B          │                │
│  └──────────┬─────────────────────┘                │
│             ↓                                       │
│  ┌──── Stage 2: RRF fusion ─────┐                  │
│  │  Merge lists, dedupe          │                  │
│  └──────────┬───────────────────┘                  │
│             ↓                                       │
│  ┌──── Stage 3: LLM rerank ─────┐                  │
│  │  Score Top-N, reorder        │                  │
│  │  Take Top-K for context       │                  │
│  └──────────┬───────────────────┘                  │
│             ↓                                       │
│  Inject into Agent → answer                         │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### Stage 1: dual retrieval

**BM25 (lexical)**

```
Query: "API authentication"
→ Matches chunks containing "API" and "auth"
→ Good for exact terms, symbols, identifiers
```

**Vector (semantic)**

```
Query: "how do we authorize requests"
→ Embedding similarity to "auth", "token", "Bearer" passages
→ Good for paraphrases and intent
```

::: info Why both?
BM25 alone misses synonyms; vectors alone can drift on symbols like `getUserById`. Together you get precision and recall.
:::

### Stage 2: RRF fusion

[Reciprocal Rank Fusion](https://plg.uwaterloo.ca/~gvcormac/cormacksigir09-rrf.pdf):

```
RRF score = Σ 1 / (k + rank_i)
```

`k` is a constant (often 60); `rank_i` is the rank in list *i*.  
Chunks strong in **both** lists rise to the top after fusion.

### Stage 3: LLM reranking

Take Top-N fused candidates; have the LLM score relevance:

```
System: Score each passage 0–10 for relevance to the query.
Query: "API authentication"

Passage 1: "All API calls must send Bearer Token in Header..." → 9
Passage 2: "API returns JSON..." → 3
Passage 3: "Auth module uses JWT, 24h expiry..." → 8
```

Inject the highest-scoring Top-K into the Agent context.

## Hierarchical chunking

Quality depends on chunking. Xiajiao (虾饺) uses parent/child chunks:

### Two-tier design

```
┌────────────────────────────────────┐
│  Parent chunk (~800 chars)         │
│                                    │
│  ┌──────────┐  ┌──────────┐       │
│  │ Child    │  │ Child    │  ...  │
│  │ ~200 ch  │  │ ~200 ch  │       │
│  └──────────┘  └──────────┘       │
│                                    │
└────────────────────────────────────┘
```

- **Child (~200)**: retrieval granularity—tighter focus, better hits  
- **Parent (~800)**: context for the model—full surrounding text  

**Flow**: search children → map to parents → send parents to the LLM.

::: tip Why not retrieve on parents only?
Large parents mix topics; one embedding averages everything and hurts precision. Small children retrieve accurately; parents restore context.
:::

## Supported formats

| Format | Notes | Parsing |
|--------|-------|---------|
| **PDF** | Common | pdf-parse |
| **TXT** | Plain text | Direct read |
| **Markdown** | Docs | Direct read, structure kept |
| Other text | `.log`, `.csv`, etc. | Direct read |

## Usage

### Upload

In the web UI, open Agent settings and upload into the knowledge area:

1. Open Agent settings  
2. Upload in the KB section  
3. System parses → chunks → embeds → indexes  

### Query

The Agent uses `rag_query` (see [Tool Calling](/features/tool-calling)):

```
You: @Code assistant How do we call the payment API?
Code assistant: [rag_query: "payment API usage"]
→ pulls from your uploaded API doc
→ answers from retrieved text
```

## Compared to other RAG stacks

| | Xiajiao (虾饺) RAG | Dify RAG | LangChain RAG |
|---|-------------------|----------|---------------|
| Retrieval | BM25 + vector + LLM rerank | Vector + keywords | Configurable |
| Chunking | Hierarchical | Fixed size | Configurable |
| Vector store | SQLite (zero extra services) | Qdrant / Weaviate | FAISS / Pinecone |
| Deploy | `npm start` | Docker Compose | Bring your own |
| External deps | None for vectors | Vector DB usually required | Often vector DB |

Less flexible than a bespoke stack, but **zero external vector DB**—everything in one Node process with SQLite.

## Tuning tips

### 1. Document quality

- Clear structure: headings, lists, paragraphs—not walls of text  
- High signal, low fluff  
- Consistent terminology  

### 2. Chunk sizes

Defaults are 200/800. Very long native paragraphs may need code-level tuning.

### 3. Embedding model

Default `text-embedding-3-small`. With providers like Qwen, the matching provider embedding is used. For Chinese-heavy corpora, a Chinese-optimized embedding model helps.

### 4. Query wording

BM25 is lexical. If “how do I pay” fails, try the doc’s exact term `payment API`.

### 5. What works well / poorly

| Works well | Works poorly |
|------------|--------------|
| API docs (structured, crisp terms) | Scanned PDFs (bad OCR) |
| Specs with clear sections | Dense Excel exports |
| Q&A style manuals | Image-only slide decks |
| Markdown notes | Long nested legal prose |

## Example trace

```
User: @Code assistant What order statuses exist?

Internal:
├─ BM25 (FTS5): "order status"
│  hit 1: "Statuses: pending, paid, shipped, completed, cancelled" (8.2)
│  hit 2: "POST /api/orders" (3.1)
│
├─ Vector: embed("what order statuses")
│  hit 1: "enum OrderStatus { PENDING, PAID, ... }" (0.89)
│  hit 2: "Flow: pending→paid→shipped→completed" (0.85)
│
├─ RRF → Top 5
│
└─ LLM rerank → inject top 3 chunks

Assistant:
"Per your docs there are five statuses:
1. pending
2. paid
3. shipped
4. completed
5. cancelled

Flow: pending → paid → shipped → completed; any → cancelled.

Source: API doc v2.3 §4.2"
```

## Related docs

- [Tool Calling](/features/tool-calling) — `rag_query` details and ACLs  
- [Agent persistent memory](/features/agent-memory) — personalization  
- [Security & privacy](/guide/security)  
- [Collaboration flow](/features/collaboration-flow)  
- [Recipes](/guide/recipes) — private KB assistant, support bots  
- [Architecture](/guide/architecture) — RAG implementation  
