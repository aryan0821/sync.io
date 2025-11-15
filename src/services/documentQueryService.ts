import * as fs from 'fs';
import * as path from 'path';

export interface DocumentQuery {
  pattern: string;
  keywords: string[];
  source: string;
  document_type: string;
  location?: string;
  summary?: string;
  key_points?: string[];
  status?: string;
  last_updated?: string;
  search_instructions?: string;
  search_sources?: string[];
  search_method?: string;
}

export interface DocumentQueriesData {
  name: string;
  description: string;
  queries: DocumentQuery[];
  document_sources?: any;
  query_handling?: any;
  integration_notes?: any;
}

export class DocumentQueryService {
  private documentQueries: DocumentQueriesData | null = null;
  private queriesMap: Map<string, DocumentQuery[]> = new Map();

  constructor() {
    this.loadDocumentQueries();
  }

  /**
   * Load document queries from JSON file
   */
  private loadDocumentQueries(): void {
    try {
      const filePath = path.join(process.cwd(), 'document-queries.json');
      if (fs.existsSync(filePath)) {
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        this.documentQueries = JSON.parse(fileContent) as DocumentQueriesData;
        this.buildQueriesMap();
        console.log(`✅ Loaded ${this.documentQueries.queries.length} document query patterns`);
      } else {
        console.warn('⚠️  document-queries.json not found');
      }
    } catch (error) {
      console.error('❌ Error loading document queries:', error);
    }
  }

  /**
   * Build a map of keywords to queries for fast lookup
   */
  private buildQueriesMap(): void {
    if (!this.documentQueries) return;

    this.queriesMap.clear();
    this.documentQueries.queries.forEach((query) => {
      query.keywords.forEach((keyword) => {
        const lowerKeyword = keyword.toLowerCase();
        if (!this.queriesMap.has(lowerKeyword)) {
          this.queriesMap.set(lowerKeyword, []);
        }
        this.queriesMap.get(lowerKeyword)!.push(query);
      });
    });
  }

  /**
   * Find matching document queries for a question
   */
  findMatchingQueries(question: string): DocumentQuery[] {
    if (!this.documentQueries) return [];

    const lowerQuestion = question.toLowerCase();
    const matches: DocumentQuery[] = [];
    const seen = new Set<string>();

    // Check each query pattern
    this.documentQueries.queries.forEach((query) => {
      // Check if pattern matches
      if (lowerQuestion.includes(query.pattern.toLowerCase())) {
        if (!seen.has(query.pattern)) {
          matches.push(query);
          seen.add(query.pattern);
        }
      }

      // Check if any keywords match
      query.keywords.forEach((keyword) => {
        if (lowerQuestion.includes(keyword.toLowerCase())) {
          if (!seen.has(query.pattern)) {
            matches.push(query);
            seen.add(query.pattern);
          }
        }
      });
    });

    return matches;
  }

  /**
   * Get document query by pattern
   */
  getQueryByPattern(pattern: string): DocumentQuery | null {
    if (!this.documentQueries) return null;

    return (
      this.documentQueries.queries.find(
        (q) => q.pattern.toLowerCase() === pattern.toLowerCase()
      ) || null
    );
  }

  /**
   * Get all document queries
   */
  getAllQueries(): DocumentQuery[] {
    return this.documentQueries?.queries || [];
  }

  /**
   * Get document sources information
   */
  getDocumentSources(): any {
    return this.documentQueries?.document_sources || {};
  }

  /**
   * Get query handling patterns
   */
  getQueryHandling(): any {
    return this.documentQueries?.query_handling || {};
  }

  /**
   * Check if a question is about documents
   */
  isDocumentQuery(question: string): boolean {
    const matches = this.findMatchingQueries(question);
    return matches.length > 0;
  }

  /**
   * Reload document queries (useful for hot-reloading)
   */
  reload(): void {
    this.loadDocumentQueries();
  }
}

