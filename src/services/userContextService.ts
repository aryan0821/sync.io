/**
 * User Context Service
 * Loads and manages user-specific context from JSON files
 */

import * as fs from 'fs';
import * as path from 'path';

export interface UserContext {
  name: string;
  issue?: string;
  solution_approach?: {
    problem?: string;
    approach?: string;
    implementation_steps?: string[];
    features?: string[];
    current_status?: string;
    next_steps?: string[];
    challenges?: string[];
    notes_in_first_person?: string[];
  };
  related_issues?: Array<{
    platform: string;
    issue_number?: number | null;
    issue_identifier?: string | null;
    description?: string;
  }>;
  technologies_used?: string[];
  last_updated?: string;
}

export class UserContextService {
  private contexts: Map<string, UserContext> = new Map();
  private dataDirectory: string;

  constructor(dataDirectory: string = process.cwd()) {
    this.dataDirectory = dataDirectory;
    this.loadContexts();
  }

  /**
   * Load all user context JSON files from the data directory
   */
  private loadContexts(): void {
    try {
      // First, try to load the specific Beatriz file
      const beatrizFile = path.join(this.dataDirectory, 'beatriz-standup-notes.json');
      if (fs.existsSync(beatrizFile)) {
        try {
          const content = fs.readFileSync(beatrizFile, 'utf-8');
          const data = JSON.parse(content);
          
          // Extract user name from the data structure
          for (const [userName, userData] of Object.entries(data)) {
            if (userName && typeof userData === 'object' && userData !== null) {
              this.contexts.set(userName.toLowerCase(), userData as UserContext);
              console.log(`✅ Loaded context for user: ${userName} from beatriz-standup-notes.json`);
            }
          }
        } catch (error) {
          console.error(`⚠️  Error loading beatriz-standup-notes.json:`, error);
        }
      }
      
      // Also look for other JSON files matching pattern: *-*.json or specific user files
      const files = fs.readdirSync(this.dataDirectory);
      
      for (const file of files) {
        // Skip beatriz file as we already loaded it
        if (file === 'beatriz-standup-notes.json') continue;
        
        if (file.endsWith('.json') && (file.includes('-') || file.match(/^[a-z]+\.json$/i))) {
          try {
            const filePath = path.join(this.dataDirectory, file);
            const content = fs.readFileSync(filePath, 'utf-8');
            const data = JSON.parse(content);
            
            // Extract user name from the data structure
            for (const [userName, userData] of Object.entries(data)) {
              if (userName && typeof userData === 'object' && userData !== null) {
                // Only add if not already loaded (beatriz takes precedence)
                if (!this.contexts.has(userName.toLowerCase())) {
                  this.contexts.set(userName.toLowerCase(), userData as UserContext);
                  console.log(`✅ Loaded context for user: ${userName}`);
                }
              }
            }
          } catch (error) {
            console.error(`⚠️  Error loading context file ${file}:`, error);
          }
        }
      }
    } catch (error) {
      console.error('⚠️  Error loading user contexts:', error);
    }
  }

  /**
   * Get context for a specific user
   */
  getUserContext(userName: string): UserContext | null {
    const normalizedName = userName.toLowerCase();
    return this.contexts.get(normalizedName) || null;
  }

  /**
   * Check if we have context for a user
   */
  hasUserContext(userName: string): boolean {
    return this.contexts.has(userName.toLowerCase());
  }

  /**
   * Get all available user contexts
   */
  getAllUserNames(): string[] {
    return Array.from(this.contexts.keys());
  }

  /**
   * Reload contexts (useful if files are updated)
   */
  reload(): void {
    this.contexts.clear();
    this.loadContexts();
  }
}

