/**
 * Command Detection Utility
 * Detects and parses natural language commands from user input
 */

export interface CommandIntent {
    /** Type of command detected */
    type: 'build' | 'test' | 'dev' | 'install' | 'remove' | 'cat' | 'ls' | 'git' | 'script' | 'file-op';

    /** The actual command to execute */
    command: string;

    /** Whether this command requires user confirmation */
    requiresConfirmation: boolean;

    /** Risk level of the command */
    riskLevel: 'safe' | 'moderate' | 'dangerous';

    /** Original user message */
    originalMessage: string;

    /** Extracted arguments/parameters */
    args?: string[];

    /** Confidence score (0-1) */
    confidence: number;
}

export interface ProjectScripts {
    [scriptName: string]: string;
}

export type ProjectType = 'node' | 'python' | 'rust' | 'go' | 'unknown';
export type PackageManager = 'npm' | 'yarn' | 'pnpm' | 'bun' | 'pip' | 'poetry' | 'cargo' | 'go' | 'unknown';

export interface ProjectContext {
    type: ProjectType;
    packageManager: PackageManager;
    scripts?: ProjectScripts;
}

/**
 * Detect command intent from natural language
 * Now supports ANY command on any platform (Mac, Windows, Linux)
 */
export function detectCommandIntent(
    userMessage: string,
    context: ProjectContext
): CommandIntent | null {
    const message = userMessage.toLowerCase().trim();

    // Build commands - platform aware
    if (/(?:run|execute|start|do)\s+(?:the\s+)?build/i.test(message)) {
        return {
            type: 'build',
            command: findScriptCommand('build', context) || detectBuildCommand(context),
            requiresConfirmation: false,
            riskLevel: 'safe',
            originalMessage: userMessage,
            confidence: 0.95
        };
    }

    // Test commands
    if (/(?:run|execute)\s+(?:the\s+)?tests?/i.test(message)) {
        return {
            type: 'test',
            command: findScriptCommand('test', context) || detectTestCommand(context),
            requiresConfirmation: false,
            riskLevel: 'safe',
            originalMessage: userMessage,
            confidence: 0.95
        };
    }

    // Dev server commands
    if (/(?:start|run)\s+(?:dev|development)(?:\s+server)?/i.test(message)) {
        return {
            type: 'dev',
            command: findScriptCommand('dev', context) || detectDevCommand(context),
            requiresConfirmation: false,
            riskLevel: 'safe',
            originalMessage: userMessage,
            confidence: 0.95
        };
    }

    // Install commands - platform aware
    const installMatch = message.match(/(?:install|add)\s+(?:package\s+)?(.+)/i);
    if (installMatch) {
        const packageName = installMatch[1].replace(/^(?:dependencies|packages?)\s*/, '');
        return {
            type: 'install',
            command: packageName ? detectInstallCommand(packageName, context) : detectInstallCommand(undefined, context),
            requiresConfirmation: true,
            riskLevel: 'moderate',
            originalMessage: userMessage,
            args: packageName ? [packageName] : [],
            confidence: 0.9
        };
    }

    // Remove/delete file commands - cross-platform
    const removeMatch = message.match(/(?:remove|delete|rm)\s+(?:file\s+)?(.+)/i);
    if (removeMatch) {
        const target = removeMatch[1].trim();
        return {
            type: 'remove',
            command: detectRemoveCommand(target),
            requiresConfirmation: true,
            riskLevel: assessRemoveRisk(target),
            originalMessage: userMessage,
            args: [target],
            confidence: 0.85
        };
    }

    // Cat/show file commands - platform aware
    const catMatch = message.match(/(?:show|display|cat|read|view|type)\s+(?:file\s+)?(.+)/i);
    if (catMatch) {
        const fileName = catMatch[1].trim();
        return {
            type: 'cat',
            command: detectCatCommand(fileName),
            requiresConfirmation: false,
            riskLevel: 'safe',
            originalMessage: userMessage,
            args: [fileName],
            confidence: 0.9
        };
    }

    // List files commands - platform aware
    if (/(?:list|show|ls|dir)\s+(?:files?|directories?|folder)?/i.test(message)) {
        return {
            type: 'ls',
            command: detectListCommand(),
            requiresConfirmation: false,
            riskLevel: 'safe',
            originalMessage: userMessage,
            confidence: 0.85
        };
    }

    // Git commands - works on all platforms
    const gitMatch = message.match(/(?:git|run)\s+(status|log|diff|add|commit|push|pull|clone|init|branch)/i);
    if (gitMatch) {
        const gitCmd = gitMatch[1].toLowerCase();
        const isDangerous = ['push', 'commit', 'reset', 'rebase'].includes(gitCmd);
        return {
            type: 'git',
            command: `git ${gitCmd}`,
            requiresConfirmation: isDangerous,
            riskLevel: isDangerous ? 'moderate' : 'safe',
            originalMessage: userMessage,
            args: [gitCmd],
            confidence: 0.9
        };
    }

    // Custom script from package.json
    if (context.scripts) {
        const scriptMatch = message.match(/(?:run|execute)\s+(?:script\s+)?(\w+)/i);
        if (scriptMatch) {
            const scriptName = scriptMatch[1];
            if (context.scripts[scriptName]) {
                return {
                    type: 'script',
                    command: detectScriptCommand(scriptName, context),
                    requiresConfirmation: false,
                    riskLevel: 'safe',
                    originalMessage: userMessage,
                    args: [scriptName],
                    confidence: 0.8
                };
            }
        }
    }

    // Generic command detection patterns - works with ANY command
    const genericCommandPatterns = [
        /(?:run|execute|do)\s+(?:command\s+)?["']?([^"']+)["']?/i,
        /(?:please\s+)?(?:can you\s+)?(?:run|execute)\s+(.+)/i,
        /^\$\s*(.+)/,  // Commands starting with $
        /^>\s*(.+)/,   // Commands starting with >
    ];

    // Try generic command patterns LAST
    for (const pattern of genericCommandPatterns) {
        const match = message.match(pattern);
        if (match && match[1]) {
            const command = match[1].trim();
            return {
                type: 'file-op',
                command: command,
                requiresConfirmation: !isSafeCommand(command),
                riskLevel: assessCommandRisk(command),
                originalMessage: userMessage,
                confidence: 0.85
            };
        }
    }

    return null;
}

/**
 * Platform detection
 */
function getPlatform(): 'windows' | 'macos' | 'linux' {
    if (typeof navigator !== 'undefined') {
        const platform = navigator.platform.toLowerCase();
        if (platform.includes('win')) return 'windows';
        if (platform.includes('mac')) return 'macos';
    }
    return 'macos';
}

/**
 * Detect appropriate build command based on project
 */
function detectBuildCommand(context: ProjectContext): string {
    if (context.type === 'python') return 'python setup.py build';
    if (context.type === 'rust') return 'cargo build';
    if (context.type === 'go') return 'go build';

    // Node.js fallback
    switch (context.packageManager) {
        case 'yarn': return 'yarn build';
        case 'pnpm': return 'pnpm run build';
        case 'bun': return 'bun run build';
        default: return 'npm run build';
    }
}

/**
 * Detect appropriate test command
 */
function detectTestCommand(context: ProjectContext): string {
    if (context.type === 'python') return 'pytest';
    if (context.type === 'rust') return 'cargo test';
    if (context.type === 'go') return 'go test';

    switch (context.packageManager) {
        case 'yarn': return 'yarn test';
        case 'pnpm': return 'pnpm test';
        case 'bun': return 'bun test';
        default: return 'npm test';
    }
}

/**
 * Detect appropriate dev command
 */
function detectDevCommand(context: ProjectContext): string {
    if (context.type === 'python') return 'python app.py'; // Generic fallback
    if (context.type === 'rust') return 'cargo run';
    if (context.type === 'go') return 'go run .';

    switch (context.packageManager) {
        case 'yarn': return 'yarn dev';
        case 'pnpm': return 'pnpm run dev';
        case 'bun': return 'bun run dev';
        default: return 'npm run dev';
    }
}

/**
 * Detect appropriate install command based on platform
 */
function detectInstallCommand(packageName: string | undefined, context: ProjectContext): string {
    if (context.type === 'python') {
        return packageName ? `pip install ${packageName}` : 'pip install -r requirements.txt';
    }
    if (context.type === 'rust') {
        return packageName ? `cargo add ${packageName}` : 'cargo build';
    }
    if (context.type === 'go') {
        return packageName ? `go get ${packageName}` : 'go mod download';
    }

    if (packageName) {
        switch (context.packageManager) {
            case 'yarn': return `yarn add ${packageName}`;
            case 'pnpm': return `pnpm add ${packageName}`;
            case 'bun': return `bun add ${packageName}`;
            default: return `npm install ${packageName}`;
        }
    }

    switch (context.packageManager) {
        case 'yarn': return 'yarn install';
        case 'pnpm': return 'pnpm install';
        case 'bun': return 'bun install';
        default: return 'npm install';
    }
}

/**
 * Detect appropriate script runner command
 */
function detectScriptCommand(scriptName: string, context: ProjectContext): string {
    if (context.type === 'python') return `python ${scriptName}`;

    // Node.js
    switch (context.packageManager) {
        case 'yarn': return `yarn ${scriptName}`;
        case 'pnpm': return `pnpm run ${scriptName}`;
        case 'bun': return `bun run ${scriptName}`;
        default: return `npm run ${scriptName}`;
    }
}

/**
 * Detect appropriate remove command based on platform
 */
function detectRemoveCommand(target: string): string {
    const platform = getPlatform();

    if (platform === 'windows') {
        // Windows commands
        if (target.includes('*') || target.includes('-r')) {
            return `del /s /q ${target}`;
        }
        return `del ${target}`;
    }

    // Unix-like (Mac/Linux)
    return `rm ${target}`;
}

/**
 * Detect appropriate cat/type command based on platform
 */
function detectCatCommand(fileName: string): string {
    const platform = getPlatform();

    if (platform === 'windows') {
        return `type ${fileName}`;
    }

    // Unix-like (Mac/Linux)
    return `cat ${fileName}`;
}

/**
 * Detect appropriate list command based on platform
 */
function detectListCommand(): string {
    const platform = getPlatform();

    if (platform === 'windows') {
        return 'dir';
    }

    // Unix-like (Mac/Linux)
    return 'ls -la';
}

/**
 * Assess risk level for any command - cross-platform
 */
function assessCommandRisk(command: string): 'safe' | 'moderate' | 'dangerous' {
    if (isDangerousCommand(command)) {
        return 'dangerous';
    }

    if (isModerateRiskCommand(command)) {
        return 'moderate';
    }

    return 'safe';
}

/**
 * Assess remove command risk
 */
function assessRemoveRisk(target: string): 'safe' | 'moderate' | 'dangerous' {
    // Dangerous patterns
    if (target.includes('-rf') || target.includes('/s') ||
        target.includes('*') || target.includes('node_modules') ||
        target.includes('system') || target.includes('windows') ||
        target.includes('Program Files')) {
        return 'dangerous';
    }

    return 'moderate';
}

/**
 * Check if command is moderate risk - cross-platform
 */
function isModerateRiskCommand(command: string): boolean {
    const moderatePatterns = [
        /npm\s+install/,
        /yarn\s+add/,
        /pip\s+install/,
        /apt-get\s+install/,
        /brew\s+install/,
        /git\s+(push|commit|reset)/,
        /chmod/,
        /chown/,
        /mkdir/,
        /rmdir/,
        /move/,
        /mv/,
        /copy/,
        /cp/,
    ];

    return moderatePatterns.some(pattern => pattern.test(command));
}

/**
 * Detect project context from available files
 */
export function detectProjectContext(
    availableFiles: Array<{ path: string; type: 'file' | 'directory' }>,
    projectScripts: ProjectScripts = {}
): ProjectContext {
    let projectType: ProjectType = 'unknown';
    let packageManager: PackageManager = 'unknown';

    // Check for Node.js
    if (availableFiles.some(f => f.path === 'package.json')) {
        projectType = 'node';
        packageManager = 'npm'; // Default
        if (availableFiles.some(f => f.path === 'yarn.lock')) packageManager = 'yarn';
        else if (availableFiles.some(f => f.path === 'pnpm-lock.yaml')) packageManager = 'pnpm';
        else if (availableFiles.some(f => f.path === 'bun.lockb')) packageManager = 'bun';
    }
    // Check for Python
    else if (availableFiles.some(f => f.path === 'requirements.txt' || f.path === 'pyproject.toml' || f.path.endsWith('.py'))) {
        projectType = 'python';
        packageManager = 'pip';
        if (availableFiles.some(f => f.path === 'poetry.lock')) packageManager = 'poetry';
    }
    // Check for Rust
    else if (availableFiles.some(f => f.path === 'Cargo.toml')) {
        projectType = 'rust';
        packageManager = 'cargo';
    }
    // Check for Go
    else if (availableFiles.some(f => f.path === 'go.mod' || f.path.endsWith('.go'))) {
        projectType = 'go';
        packageManager = 'go';
    }

    return {
        type: projectType,
        packageManager,
        scripts: projectScripts
    };
}

/**
 * Find script command from package.json scripts
 */
function findScriptCommand(
    scriptType: string,
    context: ProjectContext
): string | null {
    if (!context.scripts) return null;

    const pm = context.packageManager;
    const runPrefix = pm === 'yarn' ? 'yarn' : pm === 'bun' ? 'bun run' : pm === 'pnpm' ? 'pnpm run' : 'npm run';

    // Try exact match first
    if (context.scripts[scriptType]) {
        return `${runPrefix} ${scriptType}`;
    }

    // Try common variations
    const variations: Record<string, string[]> = {
        build: ['build', 'compile', 'bundle'],
        test: ['test', 'tests', 'jest', 'mocha'],
        dev: ['dev', 'start', 'serve', 'develop'],
    };

    const alternatives = variations[scriptType] || [];
    for (const alt of alternatives) {
        if (context.scripts[alt]) {
            return `${runPrefix} ${alt}`;
        }
    }

    return null;
}

/**
 * Analyze project type from files and structure
 */
export interface ProjectAnalysis {
    type: 'typescript' | 'javascript' | 'python' | 'go' | 'rust' | 'java' | 'unknown';
    hasPackageJson: boolean;
    hasPyprojectToml: boolean;
    hasCargoToml: boolean;
    hasGoMod: boolean;
    scripts: ProjectScripts;
    buildCommand?: string;
    testCommand?: string;
    devCommand?: string;
}

/**
 * Parse package.json to extract scripts
 */
export function parsePackageJson(packageJsonContent: string): ProjectScripts {
    try {
        const pkg = JSON.parse(packageJsonContent);
        return pkg.scripts || {};
    } catch (error) {
        console.error('Failed to parse package.json:', error);
        return {};
    }
}

/**
 * Get suggested commands based on project type
 */
export function getSuggestedCommands(projectType: string, scripts: ProjectScripts): string[] {
    const suggestions: string[] = [];

    // Add common script commands
    if (scripts.build) suggestions.push('build');
    if (scripts.test) suggestions.push('test');
    if (scripts.dev || scripts.start) suggestions.push('dev server');
    if (scripts.lint) suggestions.push('lint');
    if (scripts.format) suggestions.push('format');

    // Add type-specific commands
    switch (projectType) {
        case 'typescript':
        case 'javascript':
            suggestions.push('install dependencies', 'show package.json');
            break;
        case 'python':
            suggestions.push('install requirements', 'show requirements.txt');
            break;
        case 'go':
            suggestions.push('go build', 'go test');
            break;
        case 'rust':
            suggestions.push('cargo build', 'cargo test');
            break;
    }

    return suggestions;
}

/**
 * Check if command is safe to auto-execute
 */
export function isSafeCommand(command: string): boolean {
    const safePatterns = [
        /^npm run (build|test|dev|start|lint|format)/,
        /^cat\s+/,
        /^ls\s*/,
        /^pwd$/,
        /^echo\s+/,
        /^git (status|log|diff)/,
        /^node\s+--version/,
        /^npm\s+--version/,
    ];

    return safePatterns.some(pattern => pattern.test(command));
}

/**
 * Check if command is dangerous
 */
export function isDangerousCommand(command: string): boolean {
    const dangerousPatterns = [
        /rm\s+-rf/,
        /sudo/,
        /chmod\s+777/,
        /shutdown/,
        /reboot/,
        /mkfs/,
        /dd\s+if=/,
        />\s*\/dev\//,
        /\|\s*sh/,
        /\|\s*bash/,
    ];

    return dangerousPatterns.some(pattern => pattern.test(command));
}
