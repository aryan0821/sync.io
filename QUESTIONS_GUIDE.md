# 🤖 Complete Questions Guide

This guide lists all the questions you can ask the Slackbot. The bot understands natural language, so you can phrase questions in different ways!

## 📋 Table of Contents
- [GitHub Questions](#github-questions)
- [Linear Questions](#linear-questions)
- [Commands](#commands)
- [Memory Features](#memory-features)

---

## 📦 GitHub Questions

### Repository Information
- "What is this repo about?"
- "Show me the repo stats"
- "What is this repository?"
- "Tell me about this repo"
- "Repository information"

### Files
- "Show me package.json"
- "Read src/index.ts"
- "Display package.json"
- "Get the contents of src/index.ts"
- "What's in src/handlers/questionHandler.ts?"

### Code Search
- "Search for authentication"
- "Where is the login function?"
- "Find authentication code"
- "Search for user login"
- "Where is the API handler?"

### Commits
- "Recent commits"
- "Show me recent commits"
- "Latest commits"
- "What are the recent changes?"
- "Show commit history"

### Issues
- "Open issues"
- "List open issues"
- "Show me GitHub issues"
- "What issues are open?"
- **Specific Issue:**
  - "Who is working on issue #4?"
  - "Who is assigned to issue #123?"
  - "Show me issue #789"
  - "What is the status of issue #42?"
  - "Give me more info about issue #4"
  - "Who is issue #1 assigned to?"

### Directories
- "List files in src"
- "Show directory tree"
- "What files are in src?"
- "Show me the directory structure"
- "List files in src/services"

### Code Browsing (Advanced)
- "What's the structure of src/index.ts?"
- "Show me lines 10-50 of src/index.ts"
- "Find files that use GitHubService"
- "Where is GitHubService used?"
- "Show me code structure of src/index.ts"
- "Browse lines 20-40 of package.json"
- "What files import LinearService?"

### Collaborators & Contributors
- "Who are the collaborators?"
- "Show me contributors"
- "List collaborators"
- "Who contributes to this repo?"

### User Work Status
- "What is aryan0821 currently working on?"
- "What is john working on?"
- "Show me what user123 is working on"
- "What are the current tasks for aryan0821?"

This shows:
- GitHub issues assigned to the user
- Recent commits by the user
- Linear issues assigned to the user (if Linear is configured)

### Work Conflict Check
- "Should I work on authentication?"
- "Should I work on the login feature?"
- "Is anyone working on webhooks?"
- "Should I start working on issue #4?"
- "Can I work on the sync feature?"

This checks:
- All team members' GitHub issues for overlaps
- All team members' Linear issues for overlaps
- Recent commits for related work
- Provides recommendations on whether to proceed or coordinate first

---

## 📋 Linear Questions

### Issues
- "Show me my Linear issues"
- "Show me existing Linear issues"
- "List all Linear issues"
- "What Linear issues are there?"
- "Who are the issues assigned to?"
- "Who are issues assigned to?"

**Specific Issue (use format: SYN-1, FE-123, etc.):**
- "What is the status of SYN-2?"
- "Status of SYN-2"
- "Who is assigned to SYN-2?"
- "Who is SYN-2 assigned to?"
- "Who's working on SYN-2?"
- "Show me details of SYN-2"
- "What's the status of FE-123?"

### Creating Issues
- "Create a Linear issue titled 'Fix bug' in Frontend team"
- "Create issue 'Add feature' in Backend team"
- "Make a new Linear issue 'Update docs' in Design team"

### Updating Issues
- "Update issue FE-123 to In Progress"
- "Change SYN-2 status to Done"
- "Move BE-456 to In Progress"

### Assigning Issues
- "Assign issue BE-456 to John"
- "Assign SYN-1 to Sarah"
- "Give FE-123 to Mike"

### Commenting on Issues
- "Add comment to issue UI-789: 'Needs review'"
- "Comment on SYN-2: 'This looks good'"
- "Add a comment to FE-123 saying 'Ready for testing'"

### Teams
- "Show Linear teams"
- "List Linear teams"
- "Who are my teammates on Linear?"
- "What teams are in Linear?"

### Projects
- "Show Linear projects"
- "Show me recent Linear projects"
- "List Linear projects"
- "What are my Linear projects?"
- "What is the current status of my Linear project?"
- "Status of my Linear project"

### Search & Filter
- "Search Linear issues for 'bug'"
- "Find Linear issues about authentication"
- "Show issues in In Progress state"
- "List issues with status Done"
- "Filter issues by state: Backlog"

---

## 🎯 Commands

### Slash Commands
- `/github <question>` - Search GitHub only
  - Example: `/github show recent commits`
  - Example: `/github what is issue #4 about?`

- `/linear <question>` - Search Linear only
  - Example: `/linear show my issues`
  - Example: `/linear search for bug`

### Direct Messages
Just DM the bot or mention it in a channel with your question!

---

## 💾 Memory Features

The bot now has **conversation memory**! This means:

### How It Works
- **Thread-based memory**: If you reply in a thread, the bot remembers the conversation
- **Channel memory**: In DMs or channels, the bot remembers recent messages
- **Context-aware**: The bot can reference previous questions and answers

### Examples
1. **First message**: "What is issue #4 about?"
2. **Follow-up** (in same thread): "Who is working on it?" ← Bot knows "it" refers to issue #4!

Or:
1. "Show me Linear issues"
2. "Who are they assigned to?" ← Bot knows "they" refers to the Linear issues

### Memory Duration
- Conversations are stored for **24 hours**
- Last **10 messages** are remembered per conversation
- Old conversations are automatically cleaned up

---

## 🔍 Tips for Best Results

1. **Be specific**: Instead of "show issues", try "show me open GitHub issues" or "list Linear issues"

2. **Use issue formats correctly**:
   - GitHub: `#123` or `issue #123`
   - Linear: `SYN-1`, `FE-123`, `BE-456` (letters-number format)

3. **Use threads**: Reply in threads to maintain conversation context

4. **Natural language**: The bot understands various phrasings:
   - "Show me..." = "List..." = "What are..."
   - "Who is working on..." = "Who is assigned to..." = "Who's handling..."

5. **Combine searches**: Ask general questions and the bot will search both GitHub and Linear by default (unless you use `/github` or `/linear`)

---

## 🚀 Quick Examples

### GitHub Examples
```
"What is this repo about?"
"Show me recent commits"
"Who is working on issue #4?"
"Search for authentication"
"Show directory tree"
"What's the structure of src/index.ts?"
```

### Linear Examples
```
"Show me my Linear issues"
"What is the status of SYN-2?"
"Create a Linear issue titled 'Fix bug' in Frontend team"
"Show Linear projects"
"Search Linear issues for 'bug'"
```

### Combined (searches both)
```
"What issues are there?" (searches both GitHub and Linear)
"Show me recent work" (searches both)
```

---

## ❓ Need Help?

Just say:
- "hello"
- "hi"
- "hey"
- "help"

The bot will show you a help message with all available commands!

