import { Octokit } from '@octokit/rest';

export interface RepoInfo {
  name: string;
  description: string | null;
  language: string | null;
  stars: number;
  forks: number;
  openIssues: number;
  defaultBranch: string;
  createdAt: string;
  updatedAt: string;
}

export interface FileContent {
  path: string;
  content: string;
  size: number;
}

export interface SearchResult {
  path: string;
  matches: string[];
}

export interface DirectoryTree {
  path: string;
  name: string;
  type: 'file' | 'directory';
  size?: number;
  children?: DirectoryTree[];
}

export interface CodeStructure {
  path: string;
  exports: string[];
  imports: string[];
  functions: Array<{ name: string; line: number }>;
  classes: Array<{ name: string; line: number }>;
  summary: string;
}

export interface FileChunk {
  path: string;
  startLine: number;
  endLine: number;
  content: string;
  totalLines: number;
}

export class GitHubService {
  private octokit: Octokit;
  private owner: string;
  private repo: string;

  constructor(token: string, owner: string, repo: string) {
    if (!token) {
      throw new Error('GitHub token is required');
    }
    if (!owner || !repo) {
      throw new Error(`GitHub owner and repo are required. Got: owner=${owner}, repo=${repo}`);
    }
    this.octokit = new Octokit({ auth: token });
    this.owner = owner;
    this.repo = repo;
    console.log(`✅ GitHubService initialized for ${owner}/${repo}`);
  }

  /**
   * Get basic repository information
   */
  async getRepoInfo(): Promise<RepoInfo> {
    try {
      const { data } = await this.octokit.repos.get({
        owner: this.owner,
        repo: this.repo,
      });

      return {
        name: data.name,
        description: data.description,
        language: data.language,
        stars: data.stargazers_count,
        forks: data.forks_count,
        openIssues: data.open_issues_count,
        defaultBranch: data.default_branch,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    } catch (error: any) {
      console.error('GitHub API Error in getRepoInfo:', {
        status: error?.status,
        message: error?.message,
        owner: this.owner,
        repo: this.repo,
        response: error?.response?.data
      });
      throw error;
    }
  }

  /**
   * Get file content from repository
   */
  async getFileContent(path: string, branch?: string): Promise<FileContent | null> {
    // Validate path
    if (!path || typeof path !== 'string' || path.trim().length === 0) {
      console.warn('⚠️  Invalid file path provided');
      return null;
    }

    const sanitizedPath = path.trim();
    
    // Basic security: prevent path traversal
    if (sanitizedPath.includes('..') || sanitizedPath.startsWith('/')) {
      console.warn('⚠️  Invalid file path (path traversal attempt):', sanitizedPath);
      return null;
    }

    try {
      const { data } = await this.octokit.repos.getContent({
        owner: this.owner,
        repo: this.repo,
        path: sanitizedPath,
        ref: branch,
      });

      if (Array.isArray(data)) {
        return null; // It's a directory
      }

      if (data.type === 'file' && 'content' in data) {
        const content = Buffer.from(data.content, 'base64').toString('utf-8');
        return {
          path: data.path,
          content: content,
          size: data.size,
        };
      }

      return null;
    } catch (error) {
      console.error(`Error getting file content for ${path}:`, error);
      return null;
    }
  }

  /**
   * Search code in the repository
   */
  async searchCode(query: string): Promise<SearchResult[]> {
    // Validate and sanitize query
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      console.warn('⚠️  Invalid search query provided');
      return [];
    }

    const sanitizedQuery = query.trim();
    
    // Limit query length to prevent API errors
    if (sanitizedQuery.length > 256) {
      console.warn('⚠️  Search query too long, truncating');
      const truncated = sanitizedQuery.substring(0, 256);
      return this.searchCode(truncated);
    }

    try {
      const { data } = await this.octokit.search.code({
        q: `${sanitizedQuery} repo:${this.owner}/${this.repo}`,
      });

      const results: SearchResult[] = [];
      for (const item of data.items.slice(0, 5)) { // Limit to 5 results
        try {
          const fileContent = await this.getFileContent(item.path);
          if (fileContent) {
            const lines = fileContent.content.split('\n');
            const matches = lines
              .map((line, index) => ({ line: line.toLowerCase(), number: index + 1 }))
              .filter(({ line }) => line.includes(query.toLowerCase()))
              .map(({ number }) => `Line ${number}`)
              .slice(0, 3); // Limit to 3 matches per file

            if (matches.length > 0) {
              results.push({
                path: item.path,
                matches: matches,
              });
            }
          }
        } catch (error) {
          console.error(`Error processing search result ${item.path}:`, error);
        }
      }

      return results;
    } catch (error) {
      console.error('Error searching code:', error);
      return [];
    }
  }

  /**
   * List files in a directory
   */
  async listDirectory(path: string = '', branch?: string): Promise<string[]> {
    // Validate and sanitize path
    const sanitizedPath = (path || '').trim();
    
    // Basic security: prevent path traversal
    if (sanitizedPath.includes('..') || sanitizedPath.startsWith('/')) {
      console.warn('⚠️  Invalid directory path (path traversal attempt):', sanitizedPath);
      return [];
    }

    try {
      const { data } = await this.octokit.repos.getContent({
        owner: this.owner,
        repo: this.repo,
        path: sanitizedPath,
        ref: branch,
      });

      if (Array.isArray(data)) {
        return data
          .filter(item => item.type === 'file')
          .map(item => item.name);
      }

      return [];
    } catch (error) {
      console.error(`Error listing directory ${path}:`, error);
      return [];
    }
  }

  /**
   * Get directory tree structure (recursive)
   */
  async getDirectoryTree(path: string = '', maxDepth: number = 3, currentDepth: number = 0, branch?: string): Promise<DirectoryTree[]> {
    if (currentDepth >= maxDepth) {
      return [];
    }

    const sanitizedPath = (path || '').trim();
    
    if (sanitizedPath.includes('..') || sanitizedPath.startsWith('/')) {
      return [];
    }

    try {
      const { data } = await this.octokit.repos.getContent({
        owner: this.owner,
        repo: this.repo,
        path: sanitizedPath,
        ref: branch,
      });

      if (!Array.isArray(data)) {
        return [];
      }

      const tree: DirectoryTree[] = [];

      for (const item of data) {
        if (item.type === 'file') {
          tree.push({
            path: item.path,
            name: item.name,
            type: 'file',
            size: item.size,
          });
        } else if (item.type === 'dir') {
          const children = await this.getDirectoryTree(item.path, maxDepth, currentDepth + 1, branch);
          tree.push({
            path: item.path,
            name: item.name,
            type: 'directory',
            children: children.length > 0 ? children : undefined,
          });
        }
      }

      return tree;
    } catch (error) {
      console.error(`Error getting directory tree for ${path}:`, error);
      return [];
    }
  }

  /**
   * Get file content with line numbers and chunking support
   */
  async getFileWithLines(path: string, startLine?: number, endLine?: number, branch?: string): Promise<FileChunk | null> {
    const file = await this.getFileContent(path, branch);
    if (!file) {
      return null;
    }

    const lines = file.content.split('\n');
    const totalLines = lines.length;

    let start = startLine ? Math.max(1, startLine) - 1 : 0;
    let end = endLine ? Math.min(endLine, totalLines) : totalLines;

    const chunk = lines.slice(start, end).join('\n');

    return {
      path: file.path,
      startLine: start + 1,
      endLine: end,
      content: chunk,
      totalLines,
    };
  }

  /**
   * Analyze code structure (exports, imports, functions, classes)
   */
  async getCodeStructure(path: string, branch?: string): Promise<CodeStructure | null> {
    const file = await this.getFileContent(path, branch);
    if (!file) {
      return null;
    }

    const lines = file.content.split('\n');
    const exports: string[] = [];
    const imports: string[] = [];
    const functions: Array<{ name: string; line: number }> = [];
    const classes: Array<{ name: string; line: number }> = [];

    // Simple regex-based extraction (works for TypeScript/JavaScript)
    lines.forEach((line, index) => {
      const lineNum = index + 1;
      const trimmed = line.trim();

      // Extract exports
      const exportMatch = trimmed.match(/export\s+(?:default\s+)?(?:const|function|class|interface|type|enum|async\s+function)?\s*([a-zA-Z_$][a-zA-Z0-9_$]*)/);
      if (exportMatch && exportMatch[1]) {
        exports.push(exportMatch[1]);
      }

      // Extract imports
      const importMatch = trimmed.match(/import\s+(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)\s+from\s+['"]([^'"]+)['"]/);
      if (importMatch && importMatch[1]) {
        imports.push(importMatch[1]);
      }

      // Extract functions
      const functionMatch = trimmed.match(/(?:export\s+)?(?:async\s+)?function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/);
      if (functionMatch && functionMatch[1]) {
        functions.push({ name: functionMatch[1], line: lineNum });
      }

      // Extract arrow functions (const/let assignments)
      const arrowMatch = trimmed.match(/(?:export\s+)?(?:const|let)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*[:=]\s*(?:async\s+)?\(/);
      if (arrowMatch && arrowMatch[1] && !imports.some(imp => imp.includes(arrowMatch[1]))) {
        functions.push({ name: arrowMatch[1], line: lineNum });
      }

      // Extract classes
      const classMatch = trimmed.match(/(?:export\s+)?class\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/);
      if (classMatch && classMatch[1]) {
        classes.push({ name: classMatch[1], line: lineNum });
      }
    });

    // Generate summary
    const summary = this.generateCodeSummary(file.content, exports, imports, functions, classes);

    return {
      path: file.path,
      exports: [...new Set(exports)],
      imports: [...new Set(imports)],
      functions,
      classes,
      summary,
    };
  }

  /**
   * Generate a code summary
   */
  private generateCodeSummary(
    content: string,
    exports: string[],
    imports: string[],
    functions: Array<{ name: string; line: number }>,
    classes: Array<{ name: string; line: number }>
  ): string {
    const parts: string[] = [];

    if (classes.length > 0) {
      parts.push(`${classes.length} class${classes.length > 1 ? 'es' : ''}: ${classes.map(c => c.name).join(', ')}`);
    }

    if (functions.length > 0) {
      parts.push(`${functions.length} function${functions.length > 1 ? 's' : ''}: ${functions.map(f => f.name).join(', ')}`);
    }

    if (exports.length > 0) {
      parts.push(`Exports: ${exports.join(', ')}`);
    }

    if (imports.length > 0) {
      parts.push(`Imports from ${imports.length} module${imports.length > 1 ? 's' : ''}`);
    }

    if (parts.length === 0) {
      return 'No structured code elements found';
    }

    return parts.join(' | ');
  }

  /**
   * Find files that import or use a specific module/function
   */
  async findFilesUsing(moduleOrFunction: string): Promise<string[]> {
    try {
      // Search for imports
      const importQuery = `import.*${moduleOrFunction}.*from repo:${this.owner}/${this.repo}`;
      const { data: importResults } = await this.octokit.search.code({
        q: importQuery,
      });

      // Search for usage
      const usageQuery = `${moduleOrFunction} repo:${this.owner}/${this.repo}`;
      const { data: usageResults } = await this.octokit.search.code({
        q: usageQuery,
      });

      const files = new Set<string>();
      
      importResults.items.forEach((item: any) => files.add(item.path));
      usageResults.items.forEach((item: any) => files.add(item.path));

      return Array.from(files).slice(0, 20); // Limit to 20 files
    } catch (error) {
      console.error(`Error finding files using ${moduleOrFunction}:`, error);
      return [];
    }
  }

  /**
   * Get file content summary (first and last N lines for large files)
   */
  async getFileSummary(path: string, previewLines: number = 50, branch?: string): Promise<string | null> {
    const file = await this.getFileContent(path, branch);
    if (!file) {
      return null;
    }

    const lines = file.content.split('\n');
    
    if (lines.length <= previewLines * 2) {
      // File is small enough to show entirely
      return file.content;
    }

    // Show first N lines, separator, and last N lines
    const firstPart = lines.slice(0, previewLines).join('\n');
    const lastPart = lines.slice(-previewLines).join('\n');
    
    return `${firstPart}\n\n... (${lines.length - previewLines * 2} lines omitted) ...\n\n${lastPart}`;
  }

  /**
   * Get all files of a specific type in the repository
   */
  async getFilesByExtension(extension: string, limit: number = 50): Promise<string[]> {
    try {
      const query = `extension:${extension} repo:${this.owner}/${this.repo}`;
      const { data } = await this.octokit.search.code({
        q: query,
      });

      return data.items.slice(0, limit).map((item: any) => item.path);
    } catch (error) {
      console.error(`Error getting files by extension ${extension}:`, error);
      return [];
    }
  }

  /**
   * Get recent commits
   */
  async getRecentCommits(limit: number = 5): Promise<any[]> {
    try {
      const { data } = await this.octokit.repos.listCommits({
        owner: this.owner,
        repo: this.repo,
        per_page: limit,
      });

      return data.map((commit: any) => ({
        sha: commit.sha.substring(0, 7),
        message: commit.commit.message.split('\n')[0],
        author: commit.commit.author?.name || 'Unknown',
        date: commit.commit.author?.date || '',
        url: commit.html_url,
      }));
    } catch (error) {
      console.error('Error getting commits:', error);
      return [];
    }
  }

  /**
   * Get open issues
   */
  async getOpenIssues(limit: number = 5): Promise<any[]> {
    try {
      const { data } = await this.octokit.issues.listForRepo({
        owner: this.owner,
        repo: this.repo,
        state: 'open',
        per_page: limit,
      });

      return data.map((issue: any) => ({
        number: issue.number,
        title: issue.title,
        state: issue.state,
        author: issue.user?.login || 'Unknown',
        createdAt: issue.created_at,
        url: issue.html_url,
      }));
    } catch (error) {
      console.error('Error getting issues:', error);
      return [];
    }
  }

  /**
   * Get repository collaborators
   */
  async getCollaborators(): Promise<any[]> {
    try {
      const { data } = await this.octokit.repos.listCollaborators({
        owner: this.owner,
        repo: this.repo,
      });

      return data.map((collab: any) => ({
        username: collab.login,
        type: collab.type,
        permissions: {
          admin: collab.permissions?.admin || false,
          maintain: collab.permissions?.maintain || false,
          push: collab.permissions?.push || false,
          triage: collab.permissions?.triage || false,
          pull: collab.permissions?.pull || false,
        },
        avatarUrl: collab.avatar_url,
      }));
    } catch (error) {
      console.error('Error getting collaborators:', error);
      return [];
    }
  }

  /**
   * Get repository contributors
   */
  async getContributors(limit: number = 10): Promise<any[]> {
    try {
      const { data } = await this.octokit.repos.listContributors({
        owner: this.owner,
        repo: this.repo,
        per_page: limit,
      });

      return data.map((contrib: any) => ({
        username: contrib.login,
        contributions: contrib.contributions,
        avatarUrl: contrib.avatar_url,
        profileUrl: contrib.html_url,
      }));
    } catch (error) {
      console.error('Error getting contributors:', error);
      return [];
    }
  }
}

