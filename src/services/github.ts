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

export class GitHubService {
  private octokit: Octokit;
  private owner: string;
  private repo: string;

  constructor(token: string, owner: string, repo: string) {
    this.octokit = new Octokit({ auth: token });
    this.owner = owner;
    this.repo = repo;
  }

  /**
   * Get basic repository information
   */
  async getRepoInfo(): Promise<RepoInfo> {
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
  }

  /**
   * Get file content from repository
   */
  async getFileContent(path: string, branch?: string): Promise<FileContent | null> {
    try {
      const { data } = await this.octokit.repos.getContent({
        owner: this.owner,
        repo: this.repo,
        path: path,
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
    try {
      const { data } = await this.octokit.search.code({
        q: `${query} repo:${this.owner}/${this.repo}`,
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
    try {
      const { data } = await this.octokit.repos.getContent({
        owner: this.owner,
        repo: this.repo,
        path: path || '',
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
}

