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
    const maxResults = 100; // Adjust as needed, max is usually 1000

    try {
      while (true) {

        // Access all Jira issues via issues = response.issues
        const response = await axios.get(`${this.JIRA_BASE_URL}/rest/api/3/search`, {
          auth: { username: this.JIRA_USERNAME, password: this.JIRA_API_TOKEN, },
          params: {
            jql: 'ORDER BY created ASC', fields: 'id',
            startAt: startAt, maxResults: maxResults,
          },
        });
        const issues = response.data.issues;


        if (issues.length === 0) {
          break; // No more issues to fetch
        }

        // Concat all Jira issues together into one array called currentIssueIds
        const currentIssueIds = issues.map((issue: any) => issue.id);
        allIssueIds = allIssueIds.concat(currentIssueIds);

        startAt += issues.length;

        if (startAt >= response.data.total) {
          break; // All issues fetched
        }

        // Endwhile
      }
      return allIssueIds;
    }

    catch (error: any) {
      console.error('Error fetching Jira issue IDs:', error.message);
      if (error.response) {
        console.error('Jira API error response:', error.response.data);
      }
      return [];
    }

  }

}