const axios = require('axios');

const JIRA_BASE_URL = 'YOUR_JIRA_INSTANCE_URL'; // e.g., 'https://your-domain.atlassian.net'
const JIRA_USERNAME = 'YOUR_JIRA_EMAIL';
const JIRA_API_TOKEN = 'YOUR_JIRA_API_TOKEN';


export class JiraService {
  private JIRA_BASE_URL: string;
  private JIRA_USERNAME: string;
  private JIRA_API_TOKEN: string;

  constructor(url: string, user: string, token: string) {
    this.JIRA_BASE_URL = url;
    this.JIRA_USERNAME = user;
    this.JIRA_API_TOKEN = token;
  }

  async getAllIssueIds() {
    let allIssueIds: any[] = [];
    let startAt = 0;
    const maxResults = 100;

    try {
      while (true) {
        const response = await axios.get(`${this.JIRA_BASE_URL}/rest/api/3/search`, {
          auth: { username: this.JIRA_USERNAME, password: this.JIRA_API_TOKEN },
          params: {
            jql: 'ORDER BY created DESC',
            fields: 'id',
            startAt: startAt,
            maxResults: maxResults,
          },
        });
        const issues = response.data.issues;

        if (issues.length === 0) break;

        const currentIssueIds = issues.map((issue: any) => issue.id);
        allIssueIds = allIssueIds.concat(currentIssueIds);

        startAt += issues.length;

        if (startAt >= response.data.total) break;
      }

      console.log(`✅ Successfully fetched ${allIssueIds.length} Jira issue IDs`);
      return allIssueIds;
    } catch (error: any) {
      console.error('Error fetching Jira issue IDs:', error.message);
      if (error.response) {
        console.error('Jira API error response:', error.response.data);
      }
      return [];
    }
  }

  async getIssueDetails(issueIdOrKey: string) {
    try {
      const response = await axios.get(
        `${this.JIRA_BASE_URL}/rest/api/3/issue/${issueIdOrKey}`,
        {
          auth: {
            username: this.JIRA_USERNAME,
            password: this.JIRA_API_TOKEN
          }
        }
      );
      return response.data;
    } catch (error: any) {
      console.error(`Error fetching Jira issue ${issueIdOrKey}:`, error.message);
      return null;
    }
  }

  async getIssues(maxResults: number = 20) {
    try {
      const response = await axios.get(`${this.JIRA_BASE_URL}/rest/api/3/search`, {
        auth: { username: this.JIRA_USERNAME, password: this.JIRA_API_TOKEN },
        params: {
          jql: 'ORDER BY updated DESC',
          fields: 'summary,status,assignee,priority,created,updated,description,issuetype',
          maxResults: maxResults,
        },
      });

      console.log(`✅ Fetched ${response.data.issues.length} Jira issues with details`);
      return response.data.issues;
    } catch (error: any) {
      console.error('Error fetching Jira issues:', error.message);
      return [];
    }
  }

  async searchIssues(jql: string, maxResults: number = 20) {
    try {
      const response = await axios.get(`${this.JIRA_BASE_URL}/rest/api/3/search`, {
        auth: { username: this.JIRA_USERNAME, password: this.JIRA_API_TOKEN },
        params: {
          jql: jql,
          fields: 'summary,status,assignee,priority,created,updated,description,issuetype',
          maxResults: maxResults,
        },
      });

      console.log(`✅ Found ${response.data.issues.length} Jira issues for JQL: ${jql}`);
      return response.data.issues;
    } catch (error: any) {
      console.error('Error searching Jira issues:', error.message);
      return [];
    }
  }

  async searchIssuesByText(searchTerm: string, maxResults: number = 20) {
    const jql = `text ~ "${searchTerm}" ORDER BY updated DESC`;
    return this.searchIssues(jql, maxResults);
  }

  async getIssuesByStatus(status: string, maxResults: number = 20) {
    const jql = `status = "${status}" ORDER BY updated DESC`;
    return this.searchIssues(jql, maxResults);
  }

  async getMyIssues(maxResults: number = 20) {
    const jql = `assignee = currentUser() ORDER BY updated DESC`;
    return this.searchIssues(jql, maxResults);
  }

  async getProjects() {
    try {
      const response = await axios.get(`${this.JIRA_BASE_URL}/rest/api/3/project`, {
        auth: { username: this.JIRA_USERNAME, password: this.JIRA_API_TOKEN }
      });

      console.log(`✅ Fetched ${response.data.length} Jira projects`);
      return response.data;
    } catch (error: any) {
      console.error('Error fetching Jira projects:', error.message);
      return [];
    }
  }

}