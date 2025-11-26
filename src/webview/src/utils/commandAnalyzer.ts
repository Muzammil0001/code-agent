/**
 * AI-Powered Command Analyzer
 * Uses AI models to intelligently detect and generate shell commands from natural language
 */

import type { CommandIntent, ProjectContext } from './commandDetection';

export interface CommandAnalysisRequest {
    userQuery: string;
    projectContext: ProjectContext;
    availableFiles: Array<{ path: string; type: 'file' | 'directory' }>;
    platform: 'windows' | 'macos' | 'linux';
}

export interface AICommandResponse {
    isCommand: boolean;
    command?: string;
    type?: CommandIntent['type'];
    requiresConfirmation?: boolean;
    riskLevel?: 'safe' | 'moderate' | 'dangerous';
    confidence?: number;
    reasoning?: string;
}

/**
 * Analyze user query with AI to detect command intent
 */
export async function analyzeCommandWithAI(
    request: CommandAnalysisRequest
): Promise<CommandIntent | null> {
    try {
        // Send message to backend for AI analysis
        const response = await sendMessageToBackend({
            type: 'analyzeCommand',
            data: request
        });

        if (!response || !response.isCommand) {
            return null;
        }

        // Convert AI response to CommandIntent
        return {
            type: response.type || 'file-op',
            command: response.command || '',
            requiresConfirmation: response.requiresConfirmation || false,
            riskLevel: response.riskLevel || 'safe',
            originalMessage: request.userQuery,
            confidence: response.confidence || 0.8
        };
    } catch (error) {
        console.error('AI command analysis failed:', error);
        return null;
    }
}

/**
 * Build specialized prompt for AI command analysis
 */
export function buildCommandAnalysisPrompt(request: CommandAnalysisRequest): string {
    const { userQuery, projectContext, availableFiles, platform } = request;

    const projectInfo = `
Project Type: ${projectContext.type}
Package Manager: ${projectContext.packageManager}
Available Scripts: ${Object.keys(projectContext.scripts || {}).join(', ') || 'None'}
Platform: ${platform}
`;

    const fileContext = availableFiles.length > 0
        ? `\nAvailable Files/Directories (sample):\n${availableFiles.slice(0, 20).map(f => `- ${f.path} (${f.type})`).join('\n')}`
        : '';

    return `You are a command analysis AI. Analyze the user's query and determine if it's a shell command request.

${projectInfo}${fileContext}

User Query: "${userQuery}"

Analyze this query and respond with a JSON object with the following structure:
{
    "isCommand": boolean,  // true if this is a command request, false if it's a chat/question
    "command": string,     // the actual shell command to execute (if isCommand is true)
    "type": string,        // one of: "build", "test", "dev", "install", "remove", "cat", "ls", "git", "script", "file-op"
    "requiresConfirmation": boolean,  // true if this is a dangerous operation
    "riskLevel": string,   // "safe", "moderate", or "dangerous"
    "confidence": number,  // 0.0 to 1.0, how confident you are
    "reasoning": string    // brief explanation of your analysis
}

Guidelines:
1. Detect commands from natural language (e.g., "run build" → "npm run build")
2. Use the project context to generate appropriate commands (e.g., use correct package manager)
3. For file operations, use platform-appropriate commands (e.g., "cat" on Unix, "type" on Windows)
4. Mark dangerous operations (delete, rm -rf, etc.) as requiresConfirmation: true
5. If it's a question or chat message (not a command), set isCommand: false
6. Be context-aware: "run frontend" in a monorepo should cd to frontend folder
7. Consider available scripts from package.json

Examples:
- "run build" → {"isCommand": true, "command": "npm run build", "type": "build", ...}
- "delete package.json" → {"isCommand": true, "command": "rm package.json", "type": "remove", "requiresConfirmation": true, "riskLevel": "dangerous", ...}
- "explain how auth works" → {"isCommand": false, ...}
- "show me main.ts" → {"isCommand": true, "command": "cat main.ts", "type": "cat", ...}

Respond ONLY with the JSON object, no additional text.`;
}

/**
 * Parse AI response into structured format
 */
export function parseAICommandResponse(aiResponse: string): AICommandResponse {
    try {
        // Try to extract JSON from response
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            return { isCommand: false };
        }

        const parsed = JSON.parse(jsonMatch[0]);
        return {
            isCommand: parsed.isCommand || false,
            command: parsed.command,
            type: parsed.type,
            requiresConfirmation: parsed.requiresConfirmation || false,
            riskLevel: parsed.riskLevel || 'safe',
            confidence: parsed.confidence || 0.8,
            reasoning: parsed.reasoning
        };
    } catch (error) {
        console.error('Failed to parse AI command response:', error);
        return { isCommand: false };
    }
}

/**
 * Send message to backend via VSCode API
 */
function sendMessageToBackend(message: any): Promise<any> {
    return new Promise((resolve, reject) => {
        // Get vscode API
        const vscode = (window as any).vscode;
        if (!vscode) {
            reject(new Error('VSCode API not available'));
            return;
        }

        // Create unique message ID
        const messageId = `cmd-analysis-${Date.now()}`;

        // Set up one-time listener for response
        const listener = (event: MessageEvent) => {
            const response = event.data;
            if (response.type === 'commandAnalysisResponse' && response.messageId === messageId) {
                window.removeEventListener('message', listener);
                resolve(response.data);
            }
        };

        window.addEventListener('message', listener);

        // Send message with ID
        vscode.postMessage({
            ...message,
            messageId
        });

        // Timeout after 10 seconds
        setTimeout(() => {
            window.removeEventListener('message', listener);
            reject(new Error('Command analysis timeout'));
        }, 10000);
    });
}

/**
 * Detect platform from navigator
 */
export function detectPlatform(): 'windows' | 'macos' | 'linux' {
    if (typeof navigator !== 'undefined') {
        const platform = navigator.platform.toLowerCase();
        if (platform.includes('win')) return 'windows';
        if (platform.includes('mac')) return 'macos';
    }
    return 'linux';
}
