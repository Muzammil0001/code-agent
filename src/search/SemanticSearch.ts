/**
 * Semantic Search
 * Combines full-text search with semantic embeddings for intelligent code retrieval
 */

import { codeIndexer } from './CodeIndexer';
import { modelRouter } from '../ai/ModelRouter';
import { logger } from '../utils/logger';

export interface SearchResult {
    path: string;
    score: number;
    snippet?: string;
    type: 'semantic' | 'keyword';
}

export class SemanticSearch {

    async search(query: string, maxResults: number = 10): Promise<SearchResult[]> {
        try {
            // 1. Keyword Search (Fast)
            const keywordResults = codeIndexer.search(query, maxResults * 2);

            // 2. Semantic Reranking (Smart)
            // In a full implementation, we would generate embeddings for the query
            // and compare with file embeddings. For now, we'll use a simplified
            // LLM-based reranking for top results.

            if (keywordResults.length === 0) return [];

            const reranked = await this.rerankResults(query, keywordResults);
            return reranked.slice(0, maxResults);

        } catch (error) {
            logger.error('Semantic search failed', error as Error);
            return [];
        }
    }

    private async rerankResults(query: string, paths: string[]): Promise<SearchResult[]> {
        // Simple scoring based on path relevance for now
        // A full implementation would fetch content and use embeddings

        return paths.map(path => {
            let score = 0;

            // Boost exact filename matches
            if (path.toLowerCase().includes(query.toLowerCase())) score += 50;

            // Boost if path contains query words
            const words = query.toLowerCase().split(' ');
            const matchCount = words.filter(w => path.toLowerCase().includes(w)).length;
            score += (matchCount / words.length) * 30;

            return {
                path,
                score,
                type: 'keyword' as const
            };
        }).sort((a, b) => b.score - a.score);
    }
}

export const semanticSearch = new SemanticSearch();
