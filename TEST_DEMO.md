# 🧪 Test Demo Script

Use these questions to demonstrate Sync.io's capabilities in order:

## 🎬 Demo Flow (5 minutes)

### 1. Introduction (30s)
**Question**: "hello"
- Shows help message
- Demonstrates friendly interface

### 2. General Repository Query (30s)
**Question**: "what is the sync.io repository about?"
- **Expected**: Shows GitHub repo info + Linear projects/teams/issues
- **Highlight**: Dual-source search, intelligent routing

### 3. User Work Status (30s)
**Question**: "what is aryan0821 currently working on?"
- **Expected**: GitHub issues, commits, Linear issues
- **Highlight**: Cross-platform visibility

### 4. Specific GitHub Issue (30s)
**Question**: "who is working on issue #4?"
- **Expected**: Issue details, assignees, related Linear issue
- **Highlight**: Deep integration, issue linking

### 5. Code Search (30s)
**Question**: "search for webhook in the codebase"
- **Expected**: Code search results
- **Highlight**: Codebase exploration

### 6. Linear Project Status (30s)
**Question**: "what is the current status of the syncio project?"
- **Expected**: Linear project details, progress
- **Highlight**: Linear integration depth

### 7. Recent Activity (30s)
**Question**: "show me recent commits"
- **Expected**: Recent commits with details
- **Highlight**: GitHub integration

### 8. Linear Issues (30s)
**Question**: "show me existing linear issues"
- **Expected**: All Linear issues with status/assignees
- **Highlight**: Linear issue management

### 9. Code Structure (30s)
**Question**: "what's the structure of src/index.ts?"
- **Expected**: Code structure analysis
- **Highlight**: Advanced code browsing

### 10. Conversation Memory (30s)
**Follow-up**: "who are they assigned to?"
- **Expected**: Uses context from previous question
- **Highlight**: Memory feature

### 11. Slash Commands (30s)
**Question**: "/github show recent commits"
- **Expected**: GitHub-only results
- **Highlight**: Explicit routing

## 🎯 Key Questions by Category

### Repository & General
- "what is the sync.io repository about?"
- "show me the repo stats"
- "what teams are working on this project?"

### Issues (GitHub)
- "what are the open issues?"
- "who is working on issue #4?"
- "show me issue #4"

### Issues (Linear)
- "show me existing linear issues"
- "what is the status of SYN-5?"
- "who are the issues assigned to?"

### User Work
- "what is aryan0821 currently working on?"
- "what is [username] working on?"

### Code & Files
- "search for webhook in the codebase"
- "show me package.json"
- "what's the structure of src/index.ts?"
- "find files that use express"
- "show directory tree"

### Commits
- "show me recent commits"
- "what are the recent changes?"

### Projects & Teams
- "show me recent linear projects"
- "what is the current status of the syncio project?"
- "show linear teams"

### Advanced
- "show me lines 10-50 of src/index.ts"
- "where is GitHubService used?"
- "list files in src/services"

## 🚨 Edge Cases to Test

1. **Ambiguous Questions**
   - "show me issues" (should show both GitHub and Linear)
   - "what's the status?" (needs context)

2. **Error Handling**
   - Invalid issue numbers
   - Non-existent files
   - API failures

3. **Memory**
   - Follow-up questions
   - Thread context
   - Multi-turn conversations

4. **Routing**
   - Questions with "linear" keyword
   - Questions with "github" keyword
   - General questions (should use both)

## 📊 Success Metrics

After demo, verify:
- ✅ All questions answered correctly
- ✅ Response time < 5 seconds
- ✅ Dual-source search works
- ✅ Memory works in threads
- ✅ Slash commands work
- ✅ Error handling graceful
- ✅ No hallucinations

## 🎤 Demo Tips

1. **Start simple** - Build up complexity
2. **Show the magic** - Dual-source search is the killer feature
3. **Demonstrate memory** - Follow-up questions show intelligence
4. **Handle errors gracefully** - Show robustness
5. **Be conversational** - Natural language is the differentiator

