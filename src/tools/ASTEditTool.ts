/**
 * AST Edit Tool
 * Surgical code editing using AST manipulation with Recast and Babel
 */

import * as vscode from 'vscode';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as recast from 'recast';
import * as parser from '@babel/parser';
import traverse from '@babel/traverse';
import * as t from '@babel/types';
import type { BaseTool, ToolResult, ASTEditResult, ASTEditOptions } from './types';
import { logger } from '../utils/logger';

export class ASTEditTool implements BaseTool {
    name = 'ast_edit';
    description = 'Perform surgical code edits using AST manipulation';

    async execute(options: ASTEditOptions): Promise<ToolResult<ASTEditResult>> {
        try {
            const { filePath, operation, target, value, preserveFormatting = true } = options;

            const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
            if (!workspaceRoot) {
                throw new Error('No workspace folder open');
            }

            const fullPath = path.join(workspaceRoot, filePath);
            if (!await fs.pathExists(fullPath)) {
                throw new Error(`File not found: ${filePath}`);
            }

            const code = await fs.readFile(fullPath, 'utf-8');
            const ast = this.parseCode(code, filePath);
            const changes: string[] = [];

            // Perform operation
            switch (operation) {
                case 'rename':
                    this.renameIdentifier(ast, target, value);
                    changes.push(`Renamed ${target} to ${value}`);
                    break;
                case 'add-import':
                    this.addImport(ast, target, value); // target=source, value=specifiers
                    changes.push(`Added import from ${target}`);
                    break;
                case 'remove-import':
                    this.removeImport(ast, target);
                    changes.push(`Removed import from ${target}`);
                    break;
                case 'add-parameter':
                    // value should be { name: string, type?: string, defaultValue?: string }
                    this.addParameter(ast, target, value);
                    changes.push(`Added parameter to ${target}`);
                    break;
                default:
                    throw new Error(`Unsupported operation: ${operation}`);
            }

            // Generate code
            const newCode = recast.print(ast).code;

            // Write back
            await fs.writeFile(fullPath, newCode);

            return {
                success: true,
                data: {
                    success: true,
                    filePath,
                    changes,
                    ast: undefined // Don't return full AST
                }
            };

        } catch (error) {
            logger.error('AST edit failed', error as Error);
            return {
                success: false,
                error: (error as Error).message
            };
        }
    }

    private parseCode(code: string, filePath: string): any {
        const isTs = filePath.endsWith('.ts') || filePath.endsWith('.tsx');

        return recast.parse(code, {
            parser: {
                parse: (source: string) => parser.parse(source, {
                    sourceType: 'module',
                    plugins: [
                        'typescript',
                        'jsx',
                        'decorators-legacy',
                        'classProperties'
                    ],
                    tokens: true
                })
            }
        });
    }

    private renameIdentifier(ast: any, oldName: string, newName: string) {
        traverse(ast, {
            Identifier(path) {
                if (path.node.name === oldName) {
                    path.node.name = newName;
                }
            }
        });
    }

    private addImport(ast: any, source: string, specifiers: string[] | string) {
        // Check if import already exists
        let exists = false;
        traverse(ast, {
            ImportDeclaration(path) {
                if (path.node.source.value === source) {
                    exists = true;
                    // TODO: Merge specifiers if needed
                }
            }
        });

        if (exists) return;

        // Create import declaration
        // Note: This is a simplified implementation. 
        // In a real scenario, we'd need to handle default vs named imports properly based on 'specifiers'
        const importDecl = t.importDeclaration(
            Array.isArray(specifiers)
                ? specifiers.map(s => t.importSpecifier(t.identifier(s), t.identifier(s)))
                : [t.importDefaultSpecifier(t.identifier(specifiers))],
            t.stringLiteral(source)
        );

        // Add to top of file
        ast.program.body.unshift(importDecl);
    }

    private removeImport(ast: any, source: string) {
        traverse(ast, {
            ImportDeclaration(path) {
                if (path.node.source.value === source) {
                    path.remove();
                }
            }
        });
    }

    private addParameter(ast: any, functionName: string, paramConfig: any) {
        traverse(ast, {
            FunctionDeclaration(path) {
                if (path.node.id?.name === functionName) {
                    const param = t.identifier(paramConfig.name);
                    if (paramConfig.type) {
                        param.typeAnnotation = t.tsTypeAnnotation(
                            t.tsTypeReference(t.identifier(paramConfig.type))
                        );
                    }
                    path.node.params.push(param);
                }
            },
            // Handle arrow functions and methods similarly...
        });
    }
}
