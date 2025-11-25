/**
 * Terminal Integration - Type Definitions
 */

/**
 * Status of a terminal command
 */
export enum CommandStatus {
    PENDING = 'pending',
    RUNNING = 'running',
    COMPLETED = 'completed',
    FAILED = 'failed',
    STOPPED = 'stopped'
}

/**
 * Location where the command should be executed
 */
export enum TerminalLocation {
    CHAT = 'chat',
    MAIN = 'main'
}

/**
 * Risk level of a command
 */
export enum CommandRiskLevel {
    SAFE = 'safe',
    MODERATE = 'moderate',
    DANGEROUS = 'dangerous'
}

/**
 * A terminal command instance
 */
export interface TerminalCommand {
    /** Unique identifier for the command */
    id: string;

    /** The command string to execute */
    command: string;

    /** Working directory for command execution */
    cwd: string;

    /** Current status of the command */
    status: CommandStatus;

    /** Timestamp when command started */
    startTime: number;

    /** Timestamp when command ended (if applicable) */
    endTime?: number;

    /** Exit code of the command (if completed) */
    exitCode?: number;

    /** Output lines from the command */
    output: TerminalOutputLine[];

    /** Where the command is being executed */
    location: TerminalLocation;

    /** Process ID (if running) */
    pid?: number;

    /** Risk level of the command */
    riskLevel?: CommandRiskLevel;
}

/**
 * A single line of terminal output
 */
export interface TerminalOutputLine {
    /** Line content (may include ANSI codes) */
    content: string;

    /** Type of output */
    type: 'stdout' | 'stderr';

    /** Timestamp when line was received */
    timestamp: number;
}

/**
 * Message types for terminal communication
 */
export enum TerminalMessageType {
    EXECUTE_COMMAND = 'executeTerminalCommand',
    STOP_COMMAND = 'stopTerminalCommand',
    OUTPUT = 'terminalOutput',
    STATUS = 'terminalStatus',
    COMPLETE = 'terminalComplete',
    GET_STATUS = 'getTerminalStatus',
    GET_RUNNING_COMMANDS = 'getRunningCommands'
}

/**
 * Base terminal message
 */
export interface TerminalMessage {
    type: TerminalMessageType;
    commandId: string;
}

/**
 * Message to execute a terminal command
 */
export interface ExecuteCommandMessage extends TerminalMessage {
    type: TerminalMessageType.EXECUTE_COMMAND;
    command: string;
    cwd?: string;
    location: TerminalLocation;
}

/**
 * Message to stop a running command
 */
export interface StopCommandMessage extends TerminalMessage {
    type: TerminalMessageType.STOP_COMMAND;
}

/**
 * Message containing terminal output
 */
export interface TerminalOutputMessage extends TerminalMessage {
    type: TerminalMessageType.OUTPUT;
    output: TerminalOutputLine;
}

/**
 * Message with command status update
 */
export interface TerminalStatusMessage extends TerminalMessage {
    type: TerminalMessageType.STATUS;
    status: CommandStatus;
    pid?: number;
}

/**
 * Message when command completes
 */
export interface TerminalCompleteMessage extends TerminalMessage {
    type: TerminalMessageType.COMPLETE;
    exitCode: number;
    duration: number;
    status: CommandStatus;
}

/**
 * Options for command execution
 */
export interface CommandExecutionOptions {
    /** Working directory */
    cwd?: string;

    /** Environment variables */
    env?: Record<string, string>;

    /** Terminal location */
    location: TerminalLocation;

    /** Whether to require user confirmation */
    requireConfirmation?: boolean;

    /** Timeout in milliseconds */
    timeout?: number;

    /** Optional ID to use for the command */
    id?: string;
}

/**
 * Result of command execution
 */
export interface CommandExecutionResult {
    /** Whether command executed successfully */
    success: boolean;

    /** Command ID */
    commandId: string;

    /** Exit code (if completed) */
    exitCode?: number;

    /** Error message (if failed) */
    error?: string;

    /** Final status */
    status: CommandStatus;
}
