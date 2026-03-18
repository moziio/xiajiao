# Agent Training Guide

## Overview

Xiajiao provides a complete Agent training system that enables you to turn any Agent into a domain-specific expert. Training is flexible and supports two modes: **Admin Panel Configuration** and **Progressive Training in Chat**.

---

## Core Principles

Xiajiao Agents acquire specialized capabilities through a **file injection** mechanism:

- Each Agent has its own workspace directory
- Markdown files in the directory are automatically injected into the system prompt when a session starts
- Key files:
  - `SOUL.md` — Role definition and expertise description
  - `USER.md` — User preference settings
  - `AGENTS.md` — Behavior rules
  - Other `.md` files — Domain knowledge documents

```
User creates knowledge files → Files stored in Agent workspace → Auto-injected into system prompt → LLM responds based on knowledge
```

---

## Method 1: Admin Panel Training

### Accessing the Training Panel

1. At the bottom of the left sidebar under **Contacts** or **Chat List**, click **"+ Add Agent"**
2. Enter the **Agent Management Panel**
3. Find the target Agent and click the **⚙ gear icon** on the right
4. Enter the **Training Panel** (4 tabs)

### Tab 1: Role Definition

- **Quick Templates**: Built-in expert templates (Parenting Expert, Project Management Assistant, Code Review Expert, Writing Assistant, Data Analyst). Selecting one auto-fills SOUL.md
- **Custom Edit**: Write or modify role definitions directly in the large text editor
- Click **"Save Role Definition"** to apply changes

### Tab 2: Knowledge Base

- **View Files**: Lists all knowledge files in the Agent workspace
- **Create File**: Click **"+ New File"**, enter a filename (e.g., `feeding-guide.md`)
- **Upload File**: Click **"Upload File"**, select `.md`/`.txt`/`.json` files
- **Edit Online**: Click a filename to open the editor, then click **"Save"** after making changes
- **Delete File**: Click the **×** button next to the file

### Tab 3: Model Configuration

- All available models are displayed as cards
- Shows model capability descriptions (language support, reasoning ability, context window size, etc.)
- Click a card to select a model, or check **"Use System Default Model"**
- Click **"Save Model Configuration"** to apply

### Tab 4: Project Binding

- Enter the full path to your local project (e.g., `C:\Projects\my-app`)
- The Agent's workspace will point to this directory
- The Agent can read files in the project to answer technical questions
- Click **"Save Workspace"** to apply

---

## Method 2: Progressive Training in Chat

You can train your Agent while chatting in a 1v1 conversation, gradually enriching its knowledge.

### Training Toolbar

When you open any Agent's 1v1 chat, a **Training Toolbar** appears at the top of the chat area (visible only to the owner), containing:

| Button | Function |
|--------|----------|
| 📂 Upload Knowledge | Select `.md`/`.txt`/`.json`/`.csv` files and save directly to the Agent knowledge base |
| 💾 Remember Conversation | Export the last 20 messages as a Markdown document and save to the knowledge base |
| ✏️ Edit Role | Quick jump to the training panel to edit SOUL.md |

### Message-Level Actions

Each chat message has two training buttons in its action bar:

- **📌 Remember** — Save the message content to the Agent's `notes.md` file in the knowledge base, supporting progressive accumulation
- **📚 Save to Knowledge Base** — Appears when the message contains a text file attachment (.md/.txt, etc.). Click to save the file content to the Agent workspace

### Chat Commands

Enter the following commands directly in the chat input box:

| Command | Description | Example |
|---------|-------------|---------|
| `/teach <content>` | Append content to the Agent's `notes.md` knowledge file | `/teach Infants under 6 months should not drink honey water` |
| `/remember` | Export recent conversation and save as a knowledge document | `/remember` |
| `/soul <content>` | Directly overwrite and update the Agent's SOUL.md role definition | `/soul You are a senior parenting expert...` |

---

## Practical Examples

### Example 1: Creating a Parenting Expert

1. **Create Agent**: Management Panel → Create Agent (ID: `parenting-expert`, Name: `Parenting Expert`)
2. **Select Template**: Click ⚙ → Role Definition tab → Choose "Parenting Expert" template
3. **Add Knowledge**: Knowledge Base tab → Upload parenting documents (e.g., `feeding-guide.md`, `vaccine-schedule.md`)
4. **Select Model**: Model Configuration tab → Choose a model with strong reasoning ability
5. **Save** → The Agent is now a parenting domain expert
6. **Continuous Training**: Use `/teach` in daily chats to add knowledge, click 📌 Remember for valuable answers

### Example 2: Creating a Project Management Assistant

1. **Create Agent**: Management Panel → Create Agent (ID: `project-helper`, Name: `Project Assistant`)
2. **Bind Project**: Click ⚙ → Project Binding tab → Enter project path `C:\Projects\my-app`
3. **Set Role**: Role Definition tab → Choose "Project Management Assistant" template
4. **Save** → The Agent's workspace points to the project directory and can read project files to answer questions

### Example 3: Progressive Training in Chat

```
User: /teach Our team's coding standard is to use TypeScript strict mode, and all functions must have return type annotations

System: 📝 Knowledge added to notes.md

User: Can you review this code for any issues?
Agent: Based on your team's standards, this code has the following issues... (responds using the newly learned knowledge)

User: /remember

System: 💾 Conversation saved to knowledge base
```

---

## Knowledge File Best Practices

1. **Structured Content**: Use Markdown headings to organize knowledge hierarchically for easier Agent retrieval
2. **Be Specific**: Avoid vague descriptions; provide concrete rules, data, and examples
3. **Progressive Accumulation**: Continuously enrich knowledge through `/teach` and 📌 Remember in daily chats
4. **Regular Organization**: Review and organize accumulated knowledge files in the Knowledge Base tab
5. **Model Matching**: Choose the appropriate model based on task complexity (large models for complex reasoning, faster models for everyday conversation)
