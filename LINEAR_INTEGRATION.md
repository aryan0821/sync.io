# Linear Integration Guide

## Option 1: Use MCP Linear (Complex)

To use the official MCP Linear server, you'd need to:

1. **Install MCP Client SDK:**
```bash
npm install @modelcontextprotocol/sdk
```

2. **Run MCP Linear Server:**
```bash
npm install -g @tacticlaunch/mcp-linear
export LINEAR_API_TOKEN=your_token
mcp-linear
```

3. **Integrate MCP Client in your bot:**
- Connect to MCP server via stdio or HTTP
- Handle MCP protocol messages
- Call Linear tools through MCP

**Pros:**
- Official, maintained by community
- Standardized MCP protocol

**Cons:**
- Requires MCP client setup
- More complex architecture
- Additional process to manage

## Option 2: Direct Linear Integration (Recommended)

Build a `LinearService` similar to your `GitHubService`:

### 1. Install Linear SDK
```bash
npm install @linear/sdk
```

### 2. Create LinearService
Similar structure to `GitHubService`:
- `getIssues()` - Get Linear issues
- `createIssue()` - Create new issue
- `updateIssue()` - Update issue status
- `assignIssue()` - Assign to team member
- `addComment()` - Add comment to issue
- `getProjects()` - Get projects
- `getTeams()` - Get teams

### 3. Add Linear Intent to LLM
Add new intent types:
- `linear_issues` - Get Linear issues
- `linear_create` - Create Linear issue
- `linear_update` - Update Linear issue

### 4. Integrate into QuestionHandler
Add Linear context gathering similar to GitHub.

**Pros:**
- Consistent with your current architecture
- Simpler - no MCP protocol overhead
- Direct control over Linear API calls
- Easier to debug and maintain

**Cons:**
- You maintain the Linear integration code
- Need to handle Linear API changes

## Recommendation

**Go with Option 2** - Direct Linear Integration because:
1. ✅ Matches your existing pattern (GitHubService)
2. ✅ Simpler architecture
3. ✅ Easier to debug
4. ✅ More control
5. ✅ No additional processes to manage

## Getting Linear API Token

1. Go to linear.app
2. Click organization avatar (top-left)
3. Select **Settings**
4. Navigate to **Security & access**
5. Under **Personal API Keys** click **New API Key**
6. Copy the token

## Example Usage

Once integrated, users could ask:
- "Show me my Linear issues"
- "Create a Linear issue titled 'Fix login bug' in Frontend team"
- "Update issue FE-123 to In Progress"
- "Assign issue BE-456 to John"
- "Add comment to issue UI-789: 'Needs review'"

