export type AgentAction =
  | { action: 'runCommand'; command: string }
  | { action: 'stopCommand'; commandId: string }
  | { action: 'getProjectStack' }
  | { action: 'createFile'; path: string; content: string }
  | { action: 'createFolder'; path: string };

export function parseAgentAction(payload: any): AgentAction | null {
  if (!payload || typeof payload !== 'object' || !payload.action) return null;
  switch (payload.action) {
    case 'runCommand':
      if (typeof payload.command === 'string') return payload;
      break;
    case 'stopCommand':
      if (typeof payload.commandId === 'string') return payload;
      break;
    case 'getProjectStack':
      return { action: 'getProjectStack' };
    case 'createFile':
      if (typeof payload.path === 'string' && typeof payload.content === 'string') return payload;
      break;
    case 'createFolder':
      if (typeof payload.path === 'string') return payload;
      break;
    default:
      return null;
  }
  return null;
}
