/**
 * Context Builder Utility
 * Builds contextual prompts from chat history for better AI responses
 */

import type { Message } from '../contexts/ChatContext';

export interface MessageContext {
    /** Recent messages for context */
    recentMessages: Message[];

    /** Referenced message IDs */
    referencedIds: string[];

    /** Generated code blocks */
    codeBlocks: CodeBlock[];

    /** File references */
    fileReferences: string[];

    /** Terminal commands executed */
    terminalCommands: string[];
}

export interface CodeBlock {
    language: string;
    code: string;
    messageId: string;
    timestamp: number;
}

export interface ContextualPrompt {
    /** Enhanced prompt with context */
    prompt: string;

    /** Context summary */
    contextSummary: string;

    /** Referenced message IDs */
    references: string[];
}

/**
 * Build contextual prompt from chat history
 */
export function buildContextualPrompt(
    userQuery: string,
    chatHistory: Message[],
    projectScripts?: Record<string, string>,
    maxContextMessages: number = 5
): ContextualPrompt {
    // Get recent messages
    const recentMessages = chatHistory.slice(-maxContextMessages);

    // Extract context elements
    const context = extractContext(recentMessages);

    // Check if this is a "continue" request
    if (isContinueRequest(userQuery)) {
        return buildContinuePrompt(recentMessages);
    }

    // Check if this references previous code
    if (referencePreviousCode(userQuery)) {
        return buildCodeReferencePrompt(userQuery, context);
    }

    // Build standard contextual prompt
    return buildStandardPrompt(userQuery, context, projectScripts);
}

/**
 * Extract context from messages
 */
function extractContext(messages: Message[]): MessageContext {
    const codeBlocks: CodeBlock[] = [];
    const fileReferences: string[] = [];
    const terminalCommands: string[] = [];
    const referencedIds: string[] = [];

    messages.forEach(msg => {
        // Extract code blocks
        const codeMatches = msg.content.matchAll(/```(\w+)?\n([\s\S]+?)```/g);
        for (const match of codeMatches) {
            codeBlocks.push({
                language: match[1] || 'text',
                code: match[2],
                messageId: msg.id,
                timestamp: Date.now()
            });
        }

        // Extract file references
        const fileMatches = msg.content.matchAll(/@([\w\/\.\-]+)/g);
        for (const match of fileMatches) {
            fileReferences.push(match[1]);
        }

        // Extract terminal commands
        const cmdMatches = msg.content.matchAll(/```(?:bash|sh|shell)\n([\s\S]+?)```/g);
        for (const match of cmdMatches) {
            terminalCommands.push(match[1].trim());
        }

        referencedIds.push(msg.id);
    });

    return {
        recentMessages: messages,
        referencedIds,
        codeBlocks,
        fileReferences,
        terminalCommands
    };
}

/**
 * Check if user is requesting to continue
 */
function isContinueRequest(query: string): boolean {
    const continuePatterns = [
        /^continue$/i,
        /^go on$/i,
        /^keep going$/i,
        /^continue (?:from|with)/i,
        /^finish/i,
        /^complete/i,
        /^more$/i,
        /^and\?$/i,
    ];

    return continuePatterns.some(pattern => pattern.test(query.trim()));
}

/**
 * Check if user is referencing previous code
 */
function referencePreviousCode(query: string): boolean {
    const referencePatterns = [
        /(?:the|that|this)\s+(?:code|component|function|class)/i,
        /(?:previous|last|earlier)\s+(?:code|response|message)/i,
        /(?:add|modify|update|change|enhance)\s+(?:the|that|this)/i,
        /(?:from|in)\s+(?:the|my)\s+previous/i,
    ];

    return referencePatterns.some(pattern => pattern.test(query));
}

/**
 * Build continue prompt
 */
function buildContinuePrompt(messages: Message[]): ContextualPrompt {
    const lastAIMessage = [...messages].reverse().find(m => m.role === 'ai');

    if (!lastAIMessage) {
        return {
            prompt: 'Could you please provide more context about what you\'d like me to continue?',
            contextSummary: 'No previous AI response found',
            references: []
        };
    }

    // Extract what was being discussed
    const lastContent = lastAIMessage.content;
    const lastCodeBlock = lastContent.match(/```[\s\S]+```$/);

    const prompt = `Continue from the previous response. 

Previous context:
${lastContent.slice(-500)} ${lastCodeBlock ? '\n\n[Code was being generated]' : ''}

Please continue where you left off.`;

    return {
        prompt,
        contextSummary: `Continuing from message ${lastAIMessage.id}`,
        references: [lastAIMessage.id]
    };
}

/**
 * Build code reference prompt
 */
function buildCodeReferencePrompt(userQuery: string, context: MessageContext): ContextualPrompt {
    const lastCodeBlock = context.codeBlocks[context.codeBlocks.length - 1];

    if (!lastCodeBlock) {
        return buildStandardPrompt(userQuery, context);
    }

    const prompt = `${userQuery}

Referring to this code from the previous conversation:
\`\`\`${lastCodeBlock.language}
${lastCodeBlock.code}
\`\`\`

Please provide your response based on this code.`;

    return {
        prompt,
        contextSummary: `Referencing ${lastCodeBlock.language} code from message ${lastCodeBlock.messageId}`,
        references: [lastCodeBlock.messageId]
    };
}

/**
 * Build standard contextual prompt
 */
function buildStandardPrompt(
    userQuery: string,
    context: MessageContext,
    projectScripts?: Record<string, string>
): ContextualPrompt {
    if (context.recentMessages.length === 0) {
        // If we have scripts, include them even without history
        if (projectScripts && Object.keys(projectScripts).length > 0) {
            const scriptsList = Object.keys(projectScripts).join(', ');
            return {
                prompt: `Project Scripts: ${scriptsList}\n\n${userQuery}`,
                contextSummary: 'Project scripts available',
                references: []
            };
        }

        return {
            prompt: userQuery,
            contextSummary: 'No previous context',
            references: []
        };
    }

    // Build context summary
    const contextParts: string[] = [];

    if (context.fileReferences.length > 0) {
        contextParts.push(`Files mentioned: ${context.fileReferences.join(', ')}`);
    }

    if (context.codeBlocks.length > 0) {
        contextParts.push(`${context.codeBlocks.length} code block(s) in history`);
    }

    if (context.terminalCommands.length > 0) {
        contextParts.push(`Commands executed: ${context.terminalCommands.join('; ')}`);
    }

    if (projectScripts && Object.keys(projectScripts).length > 0) {
        contextParts.push(`Available scripts: ${Object.keys(projectScripts).join(', ')}`);
    }

    // Build conversation summary
    const conversationSummary = context.recentMessages
        .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content.slice(0, 100)}...`)
        .join('\n');

    let prompt = `Based on our recent conversation:

${conversationSummary}

`;

    if (projectScripts && Object.keys(projectScripts).length > 0) {
        prompt += `Available Project Scripts:
${Object.entries(projectScripts).map(([name, cmd]) => `- ${name}: ${cmd}`).join('\n')}

`;
    }

    prompt += `Current question: ${userQuery}`;

    return {
        prompt,
        contextSummary: contextParts.join('; ') || 'General conversation context',
        references: context.referencedIds
    };
}

/**
 * Extract actionable items from AI response
 */
export function extractActionableItems(aiResponse: string): {
    codeBlocks: CodeBlock[];
    fileOperations: { operation: string; file: string }[];
    commands: string[];
} {
    const codeBlocks: CodeBlock[] = [];
    const fileOperations: { operation: string; file: string }[] = [];
    const commands: string[] = [];

    // Extract code blocks
    const codeMatches = aiResponse.matchAll(/```(\w+)?\n([\s\S]+?)```/g);
    for (const match of codeMatches) {
        codeBlocks.push({
            language: match[1] || 'text',
            code: match[2],
            messageId: '',
            timestamp: Date.now()
        });
    }

    // Extract file operations
    const createFileMatches = aiResponse.matchAll(/create\s+(?:file\s+)?(?:`)?([^\s`]+)(?:`)?/gi);
    for (const match of createFileMatches) {
        fileOperations.push({ operation: 'create', file: match[1] });
    }

    const modifyFileMatches = aiResponse.matchAll(/(?:modify|update|edit)\s+(?:file\s+)?(?:`)?([^\s`]+)(?:`)?/gi);
    for (const match of modifyFileMatches) {
        fileOperations.push({ operation: 'modify', file: match[1] });
    }

    // Extract commands
    const cmdMatches = aiResponse.matchAll(/```(?:bash|sh|shell)\n([\s\S]+?)```/g);
    for (const match of cmdMatches) {
        commands.push(match[1].trim());
    }

    return { codeBlocks, fileOperations, commands };
}

/**
 * Generate context summary for display
 */
export function generateContextSummary(context: MessageContext): string {
    const parts: string[] = [];

    if (context.recentMessages.length > 0) {
        parts.push(`${context.recentMessages.length} recent messages`);
    }

    if (context.codeBlocks.length > 0) {
        const languages = [...new Set(context.codeBlocks.map(cb => cb.language))];
        parts.push(`Code: ${languages.join(', ')}`);
    }

    if (context.fileReferences.length > 0) {
        parts.push(`Files: ${context.fileReferences.slice(0, 3).join(', ')}${context.fileReferences.length > 3 ? '...' : ''}`);
    }

    if (context.terminalCommands.length > 0) {
        parts.push(`${context.terminalCommands.length} command(s)`);
    }

    return parts.join(' • ') || 'No context';
}
