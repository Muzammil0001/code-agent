import * as vscode from 'vscode';

export async function createFile(path: string, content: string) {
  const wsFolder = vscode.workspace.workspaceFolders?.[0];
  if (!wsFolder) throw new Error('No workspace folder available');
  const uri = vscode.Uri.joinPath(wsFolder.uri, path);
  await vscode.workspace.fs.writeFile(uri, Buffer.from(content, 'utf-8'));
}

export async function createFolder(path: string) {
  const wsFolder = vscode.workspace.workspaceFolders?.[0];
  if (!wsFolder) throw new Error('No workspace folder available');
  const uri = vscode.Uri.joinPath(wsFolder.uri, path);
  await vscode.workspace.fs.createDirectory(uri);
}
