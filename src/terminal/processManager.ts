export interface ManagedProcess {
  id: string;
  dispose: () => void;
}

export class ProcessManager {
  private processes = new Map<string, ManagedProcess>();

  register(id: string, proc: ManagedProcess) {
    this.processes.set(id, proc);
  }

  remove(id: string) {
    this.processes.delete(id);
  }

  stop(id: string) {
    const proc = this.processes.get(id);
    if (proc) proc.dispose();
    this.remove(id);
  }

  stopAll() {
    this.processes.forEach((proc) => proc.dispose());
    this.processes.clear();
  }
}

export const processManager = new ProcessManager();
