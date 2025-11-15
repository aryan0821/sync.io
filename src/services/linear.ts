/**
 * Linear Service - Direct integration with Linear GraphQL API
 * Similar structure to GitHubService for consistency
 */

export interface LinearIssue {
  id: string;
  identifier: string; // e.g., "FE-123"
  title: string;
  description: string | null;
  state: {
    name: string;
    type: string;
  };
  assignee: {
    name: string;
    email: string;
  } | null;
  team: {
    name: string;
    key: string;
  };
  priority: number;
  createdAt: string;
  updatedAt: string;
  url: string;
}

export interface LinearProject {
  id: string;
  name: string;
  description: string | null;
  state: string;
  progress: number;
  url: string;
}

export interface LinearTeam {
  id: string;
  name: string;
  key: string; // e.g., "FE" for Frontend
  description: string | null;
}

export interface LinearUser {
  id: string;
  name: string;
  email: string;
  displayName: string;
}

export class LinearService {
  private apiToken: string;
  private apiUrl = 'https://api.linear.app/graphql';

  constructor(token: string) {
    if (!token) {
      throw new Error('Linear API token is required');
    }
    // Linear API tokens should start with "lin_api_"
    if (!token.startsWith('lin_api_')) {
      console.warn('⚠️  Linear API token format may be incorrect (should start with "lin_api_")');
    }
    this.apiToken = token;
    console.log('✅ LinearService initialized');
  }

  /**
   * Execute a GraphQL query against Linear API
   */
  private async query<T>(query: string, variables?: any): Promise<T> {
    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': this.apiToken,
        },
        body: JSON.stringify({
          query,
          variables,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Linear API error: ${response.status} - ${errorText}`);
      }

      const result: any = await response.json();
      
      if (result.errors) {
        throw new Error(`Linear GraphQL errors: ${JSON.stringify(result.errors)}`);
      }

      return result.data as T;
    } catch (error: any) {
      console.error('Linear API Error:', error?.message);
      throw error;
    }
  }

  /**
   * Get issues assigned to the current user
   */
  async getMyIssues(limit: number = 10): Promise<LinearIssue[]> {
    const query = `
      query GetMyIssues($first: Int!) {
        viewer {
          assignedIssues(first: $first) {
            nodes {
              id
              identifier
              title
              description
              state {
                name
                type
              }
              assignee {
                name
                email
              }
              team {
                name
                key
              }
              priority
              createdAt
              updatedAt
              url
            }
          }
        }
      }
    `;

    try {
      const data = await this.query<any>(query, { first: limit });
      return data.viewer.assignedIssues.nodes.map((node: any) => ({
        id: node.id,
        identifier: node.identifier,
        title: node.title,
        description: node.description,
        state: {
          name: node.state.name,
          type: node.state.type,
        },
        assignee: node.assignee ? {
          name: node.assignee.name,
          email: node.assignee.email,
        } : null,
        team: {
          name: node.team.name,
          key: node.team.key,
        },
        priority: node.priority,
        createdAt: node.createdAt,
        updatedAt: node.updatedAt,
        url: node.url,
      }));
    } catch (error) {
      console.error('Error getting my issues:', error);
      return [];
    }
  }

  /**
   * Get all issues (optionally filtered by team)
   */
  async getIssues(teamKey?: string, limit: number = 10): Promise<LinearIssue[]> {
    const teamFilter = teamKey ? `team: { key: { eq: "${teamKey}" } }` : '';
    const query = `
      query GetIssues($first: Int!) {
        issues(first: $first, filter: { ${teamFilter} }) {
          nodes {
            id
            identifier
            title
            description
            state {
              name
              type
            }
            assignee {
              name
              email
            }
            team {
              name
              key
            }
            priority
            createdAt
            updatedAt
            url
          }
        }
      }
    `;

    try {
      const data = await this.query<any>(query, { first: limit });
      return data.issues.nodes.map((node: any) => ({
        id: node.id,
        identifier: node.identifier,
        title: node.title,
        description: node.description,
        state: {
          name: node.state.name,
          type: node.state.type,
        },
        assignee: node.assignee ? {
          name: node.assignee.name,
          email: node.assignee.email,
        } : null,
        team: {
          name: node.team.name,
          key: node.team.key,
        },
        priority: node.priority,
        createdAt: node.createdAt,
        updatedAt: node.updatedAt,
        url: node.url,
      }));
    } catch (error) {
      console.error('Error getting issues:', error);
      return [];
    }
  }

  /**
   * Create a new issue
   */
  async createIssue(
    title: string,
    teamId: string,
    description?: string,
    assigneeId?: string,
    priority?: number
  ): Promise<LinearIssue | null> {
    const query = `
      mutation CreateIssue($input: IssueCreateInput!) {
        issueCreate(input: $input) {
          success
          issue {
            id
            identifier
            title
            description
            state {
              name
              type
            }
            assignee {
              name
              email
            }
            team {
              name
              key
            }
            priority
            createdAt
            updatedAt
            url
          }
        }
      }
    `;

    const variables = {
      input: {
        title,
        teamId,
        description: description || null,
        assigneeId: assigneeId || null,
        priority: priority || null,
      },
    };

    try {
      const data = await this.query<any>(query, variables);
      if (data.issueCreate.success && data.issueCreate.issue) {
        const node = data.issueCreate.issue;
        return {
          id: node.id,
          identifier: node.identifier,
          title: node.title,
          description: node.description,
          state: {
            name: node.state.name,
            type: node.state.type,
          },
          assignee: node.assignee ? {
            name: node.assignee.name,
            email: node.assignee.email,
          } : null,
          team: {
            name: node.team.name,
            key: node.team.key,
          },
          priority: node.priority,
          createdAt: node.createdAt,
          updatedAt: node.updatedAt,
          url: node.url,
        };
      }
      return null;
    } catch (error) {
      console.error('Error creating issue:', error);
      return null;
    }
  }

  /**
   * Update issue status
   */
  async updateIssueStatus(issueId: string, stateId: string): Promise<boolean> {
    const query = `
      mutation UpdateIssue($id: String!, $input: IssueUpdateInput!) {
        issueUpdate(id: $id, input: $input) {
          success
        }
      }
    `;

    try {
      const data = await this.query<any>(query, {
        id: issueId,
        input: { stateId },
      });
      return data.issueUpdate.success;
    } catch (error) {
      console.error('Error updating issue status:', error);
      return false;
    }
  }

  /**
   * Assign issue to a user
   */
  async assignIssue(issueId: string, userId: string): Promise<boolean> {
    const query = `
      mutation UpdateIssue($id: String!, $input: IssueUpdateInput!) {
        issueUpdate(id: $id, input: $input) {
          success
        }
      }
    `;

    try {
      const data = await this.query<any>(query, {
        id: issueId,
        input: { assigneeId: userId },
      });
      return data.issueUpdate.success;
    } catch (error) {
      console.error('Error assigning issue:', error);
      return false;
    }
  }

  /**
   * Add comment to an issue
   */
  async addComment(issueId: string, body: string): Promise<boolean> {
    const query = `
      mutation CreateComment($input: CommentCreateInput!) {
        commentCreate(input: $input) {
          success
        }
      }
    `;

    try {
      const data = await this.query<any>(query, {
        input: {
          issueId,
          body,
        },
      });
      return data.commentCreate.success;
    } catch (error) {
      console.error('Error adding comment:', error);
      return false;
    }
  }

  /**
   * Get all teams
   */
  async getTeams(): Promise<LinearTeam[]> {
    const query = `
      query GetTeams {
        teams {
          nodes {
            id
            name
            key
            description
          }
        }
      }
    `;

    try {
      const data = await this.query<any>(query);
      return data.teams.nodes.map((node: any) => ({
        id: node.id,
        name: node.name,
        key: node.key,
        description: node.description,
      }));
    } catch (error) {
      console.error('Error getting teams:', error);
      return [];
    }
  }

  /**
   * Get all projects
   */
  async getProjects(): Promise<LinearProject[]> {
    const query = `
      query GetProjects {
        projects {
          nodes {
            id
            name
            description
            state
            progress
            url
          }
        }
      }
    `;

    try {
      const data = await this.query<any>(query);
      return data.projects.nodes.map((node: any) => ({
        id: node.id,
        name: node.name,
        description: node.description,
        state: node.state,
        progress: node.progress,
        url: node.url,
      }));
    } catch (error) {
      console.error('Error getting projects:', error);
      return [];
    }
  }

  /**
   * Search for a team by name or key
   */
  async findTeamByNameOrKey(searchTerm: string): Promise<LinearTeam | null> {
    const teams = await this.getTeams();
    const lowerSearch = searchTerm.toLowerCase();
    
    return teams.find(
      team => 
        team.name.toLowerCase().includes(lowerSearch) ||
        team.key.toLowerCase() === lowerSearch
    ) || null;
  }

  /**
   * Get issue by identifier (e.g., "FE-123")
   */
  async getIssueByIdentifier(identifier: string): Promise<LinearIssue | null> {
    const query = `
      query GetIssue($identifier: String!) {
        issue(id: $identifier) {
          id
          identifier
          title
          description
          state {
            id
            name
            type
          }
          assignee {
            id
            name
            email
          }
          team {
            id
            name
            key
          }
          priority
          createdAt
          updatedAt
          url
        }
      }
    `;

    try {
      // Linear uses the identifier directly as the ID in queries
      const data = await this.query<any>(query, { identifier });
      if (data.issue) {
        const node = data.issue;
        return {
          id: node.id,
          identifier: node.identifier,
          title: node.title,
          description: node.description,
          state: {
            name: node.state.name,
            type: node.state.type,
          },
          assignee: node.assignee ? {
            name: node.assignee.name,
            email: node.assignee.email,
          } : null,
          team: {
            name: node.team.name,
            key: node.team.key,
          },
          priority: node.priority,
          createdAt: node.createdAt,
          updatedAt: node.updatedAt,
          url: node.url,
        };
      }
      return null;
    } catch (error) {
      console.error('Error getting issue by identifier:', error);
      // Fallback: search through recent issues
      try {
        const issues = await this.getIssues(undefined, 100);
        const found = issues.find(issue => issue.identifier === identifier);
        return found || null;
      } catch (fallbackError) {
        return null;
      }
    }
  }

  /**
   * Get available workflow states for a team
   */
  async getTeamStates(teamId: string): Promise<Array<{ id: string; name: string; type: string }>> {
    const query = `
      query GetTeamStates($teamId: String!) {
        team(id: $teamId) {
          states {
            nodes {
              id
              name
              type
            }
          }
        }
      }
    `;

    try {
      const data = await this.query<any>(query, { teamId });
      if (data.team && data.team.states) {
        return data.team.states.nodes.map((node: any) => ({
          id: node.id,
          name: node.name,
          type: node.type,
        }));
      }
      return [];
    } catch (error) {
      console.error('Error getting team states:', error);
      return [];
    }
  }

  /**
   * Get issues assigned to a specific user
   */
  async getIssuesByAssignee(userEmail: string, limit: number = 10): Promise<LinearIssue[]> {
    const query = `
      query GetIssuesByAssignee($first: Int!, $userEmail: String!) {
        issues(
          filter: {
            assignee: { email: { eq: $userEmail } }
            state: { type: { neq: completed } }
          }
          first: $first
        ) {
          nodes {
            id
            identifier
            title
            description
            state {
              name
              type
            }
            assignee {
              name
              email
            }
            team {
              name
              key
            }
            priority
            createdAt
            updatedAt
            url
          }
        }
      }
    `;

    try {
      const data = await this.query<any>(query, { first: limit, userEmail });
      return data.issues.nodes.map((node: any) => ({
        id: node.id,
        identifier: node.identifier,
        title: node.title,
        description: node.description,
        state: {
          name: node.state.name,
          type: node.state.type,
        },
        assignee: node.assignee ? {
          name: node.assignee.name,
          email: node.assignee.email,
        } : null,
        team: {
          name: node.team.name,
          key: node.team.key,
        },
        priority: node.priority,
        createdAt: node.createdAt,
        updatedAt: node.updatedAt,
        url: node.url,
      }));
    } catch (error) {
      console.error('Error getting issues by assignee:', error);
      return [];
    }
  }

  /**
   * Search for users by name or email
   */
  async searchUsers(searchTerm: string): Promise<LinearUser[]> {
    const query = `
      query SearchUsers($after: String) {
        users(first: 20, after: $after) {
          nodes {
            id
            name
            email
            displayName
          }
        }
      }
    `;

    try {
      const data = await this.query<any>(query);
      const allUsers = data.users.nodes.map((node: any) => ({
        id: node.id,
        name: node.name,
        email: node.email,
        displayName: node.displayName,
      }));

      // Filter by search term
      const lowerSearch = searchTerm.toLowerCase();
      return allUsers.filter((user: LinearUser) =>
        user.name.toLowerCase().includes(lowerSearch) ||
        user.email.toLowerCase().includes(lowerSearch) ||
        user.displayName.toLowerCase().includes(lowerSearch)
      );
    } catch (error) {
      console.error('Error searching users:', error);
      return [];
    }
  }

  /**
   * Get issue details with full information
   */
  async getIssueDetails(issueId: string): Promise<LinearIssue | null> {
    const query = `
      query GetIssueDetails($id: String!) {
        issue(id: $id) {
          id
          identifier
          title
          description
          state {
            id
            name
            type
          }
          assignee {
            id
            name
            email
          }
          team {
            id
            name
            key
          }
          priority
          createdAt
          updatedAt
          url
          labels {
            nodes {
              id
              name
            }
          }
        }
      }
    `;

    try {
      const data = await this.query<any>(query, { id: issueId });
      if (data.issue) {
        const node = data.issue;
        return {
          id: node.id,
          identifier: node.identifier,
          title: node.title,
          description: node.description,
          state: {
            name: node.state.name,
            type: node.state.type,
          },
          assignee: node.assignee ? {
            name: node.assignee.name,
            email: node.assignee.email,
          } : null,
          team: {
            name: node.team.name,
            key: node.team.key,
          },
          priority: node.priority,
          createdAt: node.createdAt,
          updatedAt: node.updatedAt,
          url: node.url,
        };
      }
      return null;
    } catch (error) {
      console.error('Error getting issue details:', error);
      return null;
    }
  }

  /**
   * Find state by name for a team
   */
  async findStateByName(teamId: string, stateName: string): Promise<string | null> {
    const states = await this.getTeamStates(teamId);
    const lowerName = stateName.toLowerCase();
    
    const found = states.find(
      state => state.name.toLowerCase() === lowerName || 
               state.name.toLowerCase().includes(lowerName)
    );
    
    return found ? found.id : null;
  }

  /**
   * Get issues by state
   */
  async getIssuesByState(stateName: string, teamKey?: string, limit: number = 10): Promise<LinearIssue[]> {
    // First get a team to find the state
    let teamId: string | null = null;
    if (teamKey) {
      const team = await this.findTeamByNameOrKey(teamKey);
      if (team) {
        teamId = team.id;
      }
    } else {
      const teams = await this.getTeams();
      if (teams.length > 0) {
        teamId = teams[0].id;
      }
    }

    if (!teamId) {
      return [];
    }

    const stateId = await this.findStateByName(teamId, stateName);
    if (!stateId) {
      return [];
    }

    const query = `
      query GetIssuesByState($first: Int!, $filter: IssueFilter!) {
        issues(first: $first, filter: $filter) {
          nodes {
            id
            identifier
            title
            description
            state {
              name
              type
            }
            assignee {
              name
              email
            }
            team {
              name
              key
            }
            priority
            createdAt
            updatedAt
            url
          }
        }
      }
    `;

    const filter: any = { state: { id: { eq: stateId } } };
    if (teamKey) {
      filter.team = { key: { eq: teamKey } };
    }

    try {
      const data = await this.query<any>(query, { first: limit, filter });
      return data.issues.nodes.map((node: any) => ({
        id: node.id,
        identifier: node.identifier,
        title: node.title,
        description: node.description,
        state: {
          name: node.state.name,
          type: node.state.type,
        },
        assignee: node.assignee ? {
          name: node.assignee.name,
          email: node.assignee.email,
        } : null,
        team: {
          name: node.team.name,
          key: node.team.key,
        },
        priority: node.priority,
        createdAt: node.createdAt,
        updatedAt: node.updatedAt,
        url: node.url,
      }));
    } catch (error) {
      console.error('Error getting issues by state:', error);
      return [];
    }
  }
}

