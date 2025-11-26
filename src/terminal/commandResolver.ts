
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { detectProjectStack } from './stackDetector';
import { logger } from '../utils/logger';

export interface ResolvedCommand {
    command: string;
    description?: string;
    requiresConfirmation?: boolean;
    isDangerous?: boolean;
}

interface ProjectScripts {
    [key: string]: string;
}

export class CommandResolver {
    private static instance: CommandResolver;
    private scriptsCache: Map<string, { scripts: ProjectScripts; timestamp: number }> = new Map();
    private readonly CACHE_TTL = 60000;

    private constructor() { }

    public static getInstance(): CommandResolver {
        if (!CommandResolver.instance) {
            CommandResolver.instance = new CommandResolver();
        }
        return CommandResolver.instance;
    }

    /**
     * Resolve natural language to executable command
     */
    public async resolveCommand(input: string): Promise<ResolvedCommand | null> {
        const lowerInput = input.toLowerCase().trim();

        // Detect current stack
        const stackInfo = await detectProjectStack();

        // Check for dangerous commands first
        const isDangerous = this.isDangerousCommand(input);

        // Try to resolve based on intent
        if (this.isInstallIntent(lowerInput)) {
            return this.resolveInstallCommand(stackInfo, isDangerous);
        }

        if (this.isBuildIntent(lowerInput)) {
            return await this.resolveBuildCommand(stackInfo, isDangerous);
        }

        if (this.isDevIntent(lowerInput)) {
            return await this.resolveDevCommand(stackInfo, isDangerous);
        }

        if (this.isTestIntent(lowerInput)) {
            return await this.resolveTestCommand(stackInfo, isDangerous);
        }

        if (this.isScriptIntent(lowerInput)) {
            return await this.resolveScriptCommand(lowerInput, stackInfo, isDangerous);
        }

        // File manipulation operations via shell commands
        if (this.isReadFileIntent(lowerInput)) {
            return this.resolveReadFile(input, isDangerous);
        }

        if (this.isCreateFileIntent(lowerInput)) {
            return this.resolveCreateFile(input, isDangerous);
        }

        if (this.isEditFileIntent(lowerInput)) {
            return this.resolveEditFile(input, isDangerous);
        }

        if (this.isDeleteFileIntent(lowerInput)) {
            return this.resolveDeleteFile(input, true); // Always dangerous
        }

        if (this.isMoveFileIntent(lowerInput)) {
            return this.resolveMoveFile(input, isDangerous);
        }

        if (this.isCopyFileIntent(lowerInput)) {
            return this.resolveCopyFile(input, isDangerous);
        }

        if (this.isSearchFileIntent(lowerInput)) {
            return this.resolveSearchFile(input, isDangerous);
        }

        if (this.isListFilesIntent(lowerInput)) {
            return this.resolveListFiles(input, isDangerous);
        }

        if (lowerInput.includes('create folder') || lowerInput.includes('mkdir')) {
            return this.resolveMkdir(input, isDangerous);
        }

        if (this.isDeleteFolderIntent(lowerInput)) {
            return this.resolveDeleteFolder(input, true);
        }

        if (lowerInput.includes('create file') || lowerInput.includes('touch')) {
            return this.resolveFileCreation(input, isDangerous);
        }

        if (this.isScaffoldIntent(lowerInput)) {
            return this.resolveScaffoldCommand(lowerInput, isDangerous);
        }

        return {
            command: input,
            isDangerous,
            requiresConfirmation: isDangerous
        };
    }

    /**
     * Read package.json scripts dynamically
     */
    private async getPackageJsonScripts(): Promise<ProjectScripts> {
        const workspaceRoot = this.getWorkspaceRoot();
        if (!workspaceRoot) return {};

        const cacheKey = 'package.json';
        const cached = this.scriptsCache.get(cacheKey);

        if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
            return cached.scripts;
        }

        try {
            const packageJsonPath = path.join(workspaceRoot, 'package.json');
            const content = await fs.promises.readFile(packageJsonPath, 'utf-8');
            const packageJson = JSON.parse(content);
            const scripts = packageJson.scripts || {};

            this.scriptsCache.set(cacheKey, { scripts, timestamp: Date.now() });
            logger.info(`Found ${Object.keys(scripts).length} npm scripts`);

            return scripts;
        } catch (error) {
            logger.error('Failed to read package.json scripts:', error as Error);
            return {};
        }
    }

    /**
     * Read Maven pom.xml goals
     */
    private async getMavenGoals(): Promise<string[]> {
        const workspaceRoot = this.getWorkspaceRoot();
        if (!workspaceRoot) return [];

        try {
            const pomPath = path.join(workspaceRoot, 'pom.xml');
            await fs.promises.access(pomPath);

            // Return common Maven goals
            return ['clean', 'compile', 'test', 'package', 'install', 'deploy', 'verify'];
        } catch (error) {
            return [];
        }
    }

    /**
     * Read Python pyproject.toml scripts
     */
    private async getPythonScripts(): Promise<ProjectScripts> {
        const workspaceRoot = this.getWorkspaceRoot();
        if (!workspaceRoot) return {};

        try {
            const pyprojectPath = path.join(workspaceRoot, 'pyproject.toml');
            const content = await fs.promises.readFile(pyprojectPath, 'utf-8');

            // Simple TOML parsing for [tool.poetry.scripts] section
            const scriptsMatch = content.match(/\[tool\.poetry\.scripts\]([\s\S]*?)(\[|$)/);
            if (scriptsMatch) {
                const scriptsSection = scriptsMatch[1];
                const scripts: ProjectScripts = {};

                const lines = scriptsSection.split('\n');
                for (const line of lines) {
                    const match = line.match(/^(\w+)\s*=\s*"(.+)"$/);
                    if (match) {
                        scripts[match[1]] = match[2];
                    }
                }
                return scripts;
            }
        } catch (error) {
            // pyproject.toml doesn't exist or can't be read
        }

        return {};
    }

    /**
     * Read composer.json scripts (PHP)
     */
    private async getComposerScripts(): Promise<ProjectScripts> {
        const workspaceRoot = this.getWorkspaceRoot();
        if (!workspaceRoot) return {};

        try {
            const composerPath = path.join(workspaceRoot, 'composer.json');
            const content = await fs.promises.readFile(composerPath, 'utf-8');
            const composerJson = JSON.parse(content);
            return composerJson.scripts || {};
        } catch (error) {
            return {};
        }
    }

    /**
     * Resolve build command based on actual scripts
     */
    private async resolveBuildCommand(stackInfo: any, isDangerous: boolean): Promise<ResolvedCommand> {
        if (stackInfo.primary === 'node' || stackInfo.primary === 'next' || stackInfo.primary === 'react') {
            const scripts = await this.getPackageJsonScripts();

            // Check if build script exists
            if (scripts.build) {
                const pm = stackInfo.packageManager || 'npm';
                return {
                    command: `${pm} run build`,
                    description: `Build project using ${pm} (script: ${scripts.build})`,
                    isDangerous,
                    requiresConfirmation: isDangerous
                };
            }
        }

        if (stackInfo.primary === 'maven') {
            return {
                command: 'mvn package',
                description: 'Build Maven project',
                isDangerous,
                requiresConfirmation: isDangerous
            };
        }

        if (stackInfo.primary === 'python') {
            return {
                command: 'python -m build',
                description: 'Build Python package',
                isDangerous,
                requiresConfirmation: isDangerous
            };
        }

        return {
            command: 'npm run build',
            description: 'Build project (fallback)',
            isDangerous,
            requiresConfirmation: isDangerous
        };
    }

    /**
     * Resolve dev command based on actual scripts
     */
    private async resolveDevCommand(stackInfo: any, isDangerous: boolean): Promise<ResolvedCommand> {
        if (stackInfo.primary === 'node' || stackInfo.primary === 'next' || stackInfo.primary === 'react') {
            const scripts = await this.getPackageJsonScripts();

            // Check for dev, start, or serve scripts in priority order
            if (scripts.dev) {
                const pm = stackInfo.packageManager || 'npm';
                return {
                    command: `${pm} run dev`,
                    description: `Start development server (${scripts.dev})`,
                    isDangerous,
                    requiresConfirmation: isDangerous
                };
            } else if (scripts.start) {
                const pm = stackInfo.packageManager || 'npm';
                return {
                    command: `${pm} start`,
                    description: `Start application (${scripts.start})`,
                    isDangerous,
                    requiresConfirmation: isDangerous
                };
            } else if (scripts.serve) {
                const pm = stackInfo.packageManager || 'npm';
                return {
                    command: `${pm} run serve`,
                    description: `Serve application (${scripts.serve})`,
                    isDangerous,
                    requiresConfirmation: isDangerous
                };
            }
        }

        if (stackInfo.primary === 'python') {
            // Check for manage.py (Django)
            const workspaceRoot = this.getWorkspaceRoot();
            if (workspaceRoot) {
                const managePyPath = path.join(workspaceRoot, 'manage.py');
                try {
                    await fs.promises.access(managePyPath);
                    return {
                        command: 'python manage.py runserver',
                        description: 'Start Django development server',
                        isDangerous,
                        requiresConfirmation: isDangerous
                    };
                } catch {
                    // Not Django
                }
            }

            // Check pyproject.toml for scripts
            const pythonScripts = await this.getPythonScripts();
            if (pythonScripts.dev || pythonScripts.start) {
                return {
                    command: `poetry run ${pythonScripts.dev ? 'dev' : 'start'}`,
                    description: 'Start development server',
                    isDangerous,
                    requiresConfirmation: isDangerous
                };
            }
        }

        if (stackInfo.primary === 'php' || stackInfo.primary === 'laravel') {
            return {
                command: 'php artisan serve',
                description: 'Start Laravel development server',
                isDangerous,
                requiresConfirmation: isDangerous
            };
        }

        return {
            command: 'npm run dev',
            description: 'Start development server (fallback)',
            isDangerous,
            requiresConfirmation: isDangerous
        };
    }

    /**
     * Resolve test command based on actual scripts
     */
    private async resolveTestCommand(stackInfo: any, isDangerous: boolean): Promise<ResolvedCommand> {
        if (stackInfo.primary === 'node' || stackInfo.primary === 'next' || stackInfo.primary === 'react') {
            const scripts = await this.getPackageJsonScripts();

            if (scripts.test) {
                const pm = stackInfo.packageManager || 'npm';
                return {
                    command: `${pm} test`,
                    description: `Run tests (${scripts.test})`,
                    isDangerous,
                    requiresConfirmation: isDangerous
                };
            }
        }

        if (stackInfo.primary === 'maven') {
            return {
                command: 'mvn test',
                description: 'Run Maven tests',
                isDangerous,
                requiresConfirmation: isDangerous
            };
        }

        if (stackInfo.primary === 'python') {
            return {
                command: 'pytest',
                description: 'Run Python tests with pytest',
                isDangerous,
                requiresConfirmation: isDangerous
            };
        }

        if (stackInfo.primary === 'php' || stackInfo.primary === 'laravel') {
            return {
                command: 'php artisan test',
                description: 'Run Laravel tests',
                isDangerous,
                requiresConfirmation: isDangerous
            };
        }

        return {
            command: 'npm test',
            description: 'Run tests (fallback)',
            isDangerous,
            requiresConfirmation: isDangerous
        };
    }

    /**
     * Resolve any script by name from actual project files
     */
    private async resolveScriptCommand(input: string, stackInfo: any, isDangerous: boolean): Promise<ResolvedCommand | null> {
        const scriptMatch = input.match(/(?:run|execute|start)\s+(\w+)/i);
        if (!scriptMatch) return null;

        const scriptName = scriptMatch[1];

        if (stackInfo.primary === 'node' || stackInfo.primary === 'next' || stackInfo.primary === 'react') {
            const scripts = await this.getPackageJsonScripts();

            if (scripts[scriptName]) {
                const pm = stackInfo.packageManager || 'npm';
                return {
                    command: `${pm} run ${scriptName}`,
                    description: `Run '${scriptName}' script: ${scripts[scriptName]}`,
                    isDangerous,
                    requiresConfirmation: isDangerous
                };
            }
        }

        if (stackInfo.primary === 'php' || stackInfo.primary === 'laravel') {
            const composerScripts = await this.getComposerScripts();

            if (composerScripts[scriptName]) {
                return {
                    command: `composer run-script ${scriptName}`,
                    description: `Run composer script: ${composerScripts[scriptName]}`,
                    isDangerous,
                    requiresConfirmation: isDangerous
                };
            }
        }

        if (stackInfo.primary === 'python') {
            const pythonScripts = await this.getPythonScripts();

            if (pythonScripts[scriptName]) {
                return {
                    command: `poetry run ${scriptName}`,
                    description: `Run Python script: ${pythonScripts[scriptName]}`,
                    isDangerous,
                    requiresConfirmation: isDangerous
                };
            }
        }

        return null;
    }

    /**
     * Resolve install command based on stack
     */
    private resolveInstallCommand(stackInfo: any, isDangerous: boolean): ResolvedCommand {
        const pm = stackInfo.packageManager || 'npm';

        if (stackInfo.primary === 'python') {
            return {
                command: 'pip install -r requirements.txt',
                description: 'Install Python dependencies',
                isDangerous,
                requiresConfirmation: isDangerous
            };
        }

        if (stackInfo.primary === 'maven') {
            return {
                command: 'mvn install',
                description: 'Install Maven dependencies',
                isDangerous,
                requiresConfirmation: isDangerous
            };
        }

        if (stackInfo.primary === 'php' || stackInfo.primary === 'laravel') {
            return {
                command: 'composer install',
                description: 'Install Composer dependencies',
                isDangerous,
                requiresConfirmation: isDangerous
            };
        }

        return {
            command: `${pm} install`,
            description: `Install dependencies using ${pm}`,
            isDangerous,
            requiresConfirmation: isDangerous
        };
    }

    // File manipulation operations via shell commands

    /**
     * Read file contents
     */
    private resolveReadFile(input: string, isDangerous: boolean): ResolvedCommand {
        const fileMatch = input.match(/(?:read|show|display|cat|view)\s+(?:file\s+)?(.+)/i);
        const filePath = fileMatch ? fileMatch[1].trim() : '';

        return {
            command: `cat ${filePath}`,
            description: `Read file: ${filePath}`,
            isDangerous,
            requiresConfirmation: isDangerous
        };
    }

    /**
     * Create file with content
     */
    private resolveCreateFile(input: string, isDangerous: boolean): ResolvedCommand {
        // Try to extract file path and content
        const match = input.match(/create\s+(?:file\s+)?(.+?)\s+(?:with\s+)?(?:content\s+)?(.+)/i);

        if (match) {
            const filePath = match[1].trim();
            const content = match[2].trim().replace(/^["']|["']$/g, ''); // Remove quotes

            return {
                command: `echo "${content}" > ${filePath}`,
                description: `Create file ${filePath} with content`,
                isDangerous,
                requiresConfirmation: isDangerous
            };
        }

        // Just create empty file
        const fileMatch = input.match(/create\s+(?:file\s+)?(.+)/i);
        const filePath = fileMatch ? fileMatch[1].trim() : 'newfile.txt';

        return {
            command: `touch ${filePath}`,
            description: `Create empty file: ${filePath}`,
            isDangerous,
            requiresConfirmation: isDangerous
        };
    }

    /**
     * Edit file (find and replace)
     */
    private resolveEditFile(input: string, isDangerous: boolean): ResolvedCommand {
        // Pattern: edit file X replace Y with Z
        const match = input.match(/edit\s+(?:file\s+)?(.+?)\s+replace\s+(.+?)\s+with\s+(.+)/i);

        if (match) {
            const filePath = match[1].trim();
            const oldText = match[2].trim().replace(/^["']|["']$/g, '');
            const newText = match[3].trim().replace(/^["']|["']$/g, '');

            return {
                command: `sed -i '' 's/${oldText}/${newText}/g' ${filePath}`,
                description: `Replace "${oldText}" with "${newText}" in ${filePath}`,
                isDangerous: true,
                requiresConfirmation: true
            };
        }

        // Just mention file for editing
        const fileMatch = input.match(/edit\s+(?:file\s+)?(.+)/i);
        const filePath = fileMatch ? fileMatch[1].trim() : '';

        return {
            command: `cat ${filePath}`,
            description: `View ${filePath} for editing (use specific replace command)`,
            isDangerous,
            requiresConfirmation: isDangerous
        };
    }

    /**
     * Delete file
     */
    private resolveDeleteFile(input: string, isDangerous: boolean): ResolvedCommand {
        const fileMatch = input.match(/(?:delete|remove|rm)\s+(?:file\s+)?(.+)/i);
        const filePath = fileMatch ? fileMatch[1].trim() : '';

        return {
            command: `rm ${filePath}`,
            description: `⚠️ DELETE file: ${filePath}`,
            isDangerous: true,
            requiresConfirmation: true
        };
    }

    /**
     * Delete folder
     */
    private resolveDeleteFolder(input: string, isDangerous: boolean): ResolvedCommand {
        const folderMatch = input.match(/(?:delete|remove|rm)\s+(?:folder|directory|dir)\s+(.+)/i);
        const folderPath = folderMatch ? folderMatch[1].trim() : '';

        return {
            command: `rm -rf ${folderPath}`,
            description: `⚠️ DELETE folder recursively: ${folderPath}`,
            isDangerous: true,
            requiresConfirmation: true
        };
    }

    /**
     * Move/rename file or folder
     */
    private resolveMoveFile(input: string, isDangerous: boolean): ResolvedCommand {
        const match = input.match(/(?:move|mv|rename)\s+(.+?)\s+(?:to\s+)?(.+)/i);

        if (match) {
            const source = match[1].trim();
            const dest = match[2].trim();

            return {
                command: `mv ${source} ${dest}`,
                description: `Move/rename ${source} → ${dest}`,
                isDangerous,
                requiresConfirmation: isDangerous
            };
        }

        return { command: input, isDangerous, requiresConfirmation: isDangerous };
    }

    /**
     * Copy file or folder
     */
    private resolveCopyFile(input: string, isDangerous: boolean): ResolvedCommand {
        const match = input.match(/(?:copy|cp)\s+(.+?)\s+(?:to\s+)?(.+)/i);

        if (match) {
            const source = match[1].trim();
            const dest = match[2].trim();

            return {
                command: `cp -r ${source} ${dest}`,
                description: `Copy ${source} → ${dest}`,
                isDangerous,
                requiresConfirmation: isDangerous
            };
        }

        return { command: input, isDangerous, requiresConfirmation: isDangerous };
    }

    /**
     * Search files (grep or find)
     */
    private resolveSearchFile(input: string, isDangerous: boolean): ResolvedCommand {
        // Pattern: search for "text" in files
        const grepMatch = input.match(/(?:search|grep|find)\s+(?:for\s+)?["']?(.+?)["']?\s+in\s+(.+)/i);

        if (grepMatch) {
            const searchText = grepMatch[1].trim();
            const location = grepMatch[2].trim();

            return {
                command: `grep -r "${searchText}" ${location}`,
                description: `Search for "${searchText}" in ${location}`,
                isDangerous,
                requiresConfirmation: isDangerous
            };
        }

        // Pattern: find files named X
        const findMatch = input.match(/find\s+files?\s+(?:named|called)\s+(.+)/i);

        if (findMatch) {
            const pattern = findMatch[1].trim();

            return {
                command: `find . -name "${pattern}"`,
                description: `Find files matching: ${pattern}`,
                isDangerous,
                requiresConfirmation: isDangerous
            };
        }

        return { command: input, isDangerous, requiresConfirmation: isDangerous };
    }

    /**
     * List files
     */
    private resolveListFiles(input: string, isDangerous: boolean): ResolvedCommand {
        const dirMatch = input.match(/(?:list|ls|show)\s+(?:files\s+in\s+)?(.+)/i);
        const directory = dirMatch ? dirMatch[1].trim() : '.';

        return {
            command: `ls -lah ${directory}`,
            description: `List files in: ${directory}`,
            isDangerous,
            requiresConfirmation: isDangerous
        };
    }

    // Intent detection helpers
    private isReadFileIntent(input: string): boolean {
        return /(?:read|show|display|cat|view)\s+(?:file|content)/.test(input);
    }

    private isCreateFileIntent(input: string): boolean {
        return /create\s+(?:file|new\s+file)/.test(input) && !/folder/.test(input);
    }

    private isEditFileIntent(input: string): boolean {
        return /edit\s+(?:file|content)|replace\s+in\s+file/.test(input);
    }

    private isDeleteFileIntent(input: string): boolean {
        return /(?:delete|remove|rm)\s+(?:file|the\s+file)/.test(input);
    }

    private isDeleteFolderIntent(input: string): boolean {
        return /(?:delete|remove|rm)\s+(?:folder|directory|dir)/.test(input);
    }

    private isMoveFileIntent(input: string): boolean {
        return /(?:move|mv|rename)\s+/.test(input);
    }

    private isCopyFileIntent(input: string): boolean {
        return /(?:copy|cp)\s+/.test(input);
    }

    private isSearchFileIntent(input: string): boolean {
        return /(?:search|grep)\s+(?:for|in)|find\s+files/.test(input);
    }

    private isListFilesIntent(input: string): boolean {
        return /(?:list|ls|show)\s+files/.test(input);
    }

    private isInstallIntent(input: string): boolean {
        return /install|dependencies|deps/.test(input);
    }

    private isBuildIntent(input: string): boolean {
        return /build|compile/.test(input);
    }

    private isDevIntent(input: string): boolean {
        return /dev|start|serve|development|server/.test(input);
    }

    private isTestIntent(input: string): boolean {
        return /test|spec/.test(input);
    }

    private isScriptIntent(input: string): boolean {
        return /(?:run|execute|start)\s+\w+/.test(input);
    }

    private isScaffoldIntent(input: string): boolean {
        return /create|generate|scaffold|new\s+project/.test(input);
    }

    private resolveMkdir(input: string, isDangerous: boolean): ResolvedCommand {
        const pathMatch = input.match(/(?:create folder|mkdir)\s+(.+)/i);
        const folderPath = pathMatch ? pathMatch[1].trim() : 'newfolder';

        return {
            command: `mkdir -p ${folderPath}`,
            description: `Create folder: ${folderPath}`,
            isDangerous,
            requiresConfirmation: isDangerous
        };
    }

    private resolveFileCreation(input: string, isDangerous: boolean): ResolvedCommand {
        const pathMatch = input.match(/(?:create file|touch)\s+(.+)/i);
        const filePath = pathMatch ? pathMatch[1].trim() : 'newfile.txt';

        return {
            command: `touch ${filePath}`,
            description: `Create file: ${filePath}`,
            isDangerous,
            requiresConfirmation: isDangerous
        };
    }

    private resolveScaffoldCommand(input: string, isDangerous: boolean): ResolvedCommand {
        if (/next/.test(input)) {
            return {
                command: 'npx create-next-app@latest .',
                description: 'Create Next.js project',
                isDangerous,
                requiresConfirmation: true
            };
        }

        if (/nest/.test(input)) {
            return {
                command: 'npx @nestjs/cli new .',
                description: 'Create NestJS project',
                isDangerous,
                requiresConfirmation: true
            };
        }

        if (/react/.test(input)) {
            return {
                command: 'npx create-react-app .',
                description: 'Create React project',
                isDangerous,
                requiresConfirmation: true
            };
        }

        if (/vite/.test(input)) {
            return {
                command: 'npm create vite@latest .',
                description: 'Create Vite project',
                isDangerous,
                requiresConfirmation: true
            };
        }

        return {
            command: input,
            isDangerous,
            requiresConfirmation: isDangerous
        };
    }

    /**
     * Check if command is dangerous
     */
    private isDangerousCommand(command: string): boolean {
        const dangerousPatterns = [
            /\brm\b.*-rf/i,
            /\brm\b.*-fr/i,
            /\bdel\b/i,
            /\bformat\b/i,
            /\bdrop\s+database/i,
            /\btruncate\b/i,
            /sudo/i,
            />\s*\/dev\//i,
            /dd\s+if=/i
        ];

        return dangerousPatterns.some(pattern => pattern.test(command));
    }

    private getWorkspaceRoot(): string | undefined {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        return workspaceFolders && workspaceFolders.length > 0
            ? workspaceFolders[0].uri.fsPath
            : undefined;
    }

    /**
     * Clear cached scripts
     */
    public clearCache(): void {
        this.scriptsCache.clear();
    }
}

// Singleton export
export const commandResolver = CommandResolver.getInstance();
