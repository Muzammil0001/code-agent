import { useState, useEffect } from 'react';
import { useVSCode } from '../hooks/useVSCode';
import { useChatStore } from '../stores/chatStore';
import { useAgentStore } from '../stores/agentStore';
import { useModelStore } from '../stores/modelStore';
import { useNotificationStore } from '../stores/notificationStore';
import { useTerminalStore } from '../stores/terminalStore';
import { useFileStore } from '../stores/fileStore';
import { ChatHistory } from './ChatHistory';
import { InputArea, type AttachedItem } from './InputArea';
import { HistoryView } from './HistoryView';
import { Notification } from './Notification';
import { CommandConfirmDialog } from './CommandConfirmDialog';
import { Loader2 } from 'lucide-react';
import { formatLLMMessage } from '../utils/formatLLMMessage';
import { parsePackageJson, detectProjectContext, type CommandIntent, type ProjectScripts } from '../utils/commandDetection';
import { analyzeCommandWithAI, detectPlatform } from '../utils/commandAnalyzer';
import { buildContextualPrompt } from '../utils/contextBuilder';
import {
    GENERATE_SESSION_ID,
    CHAT_SAVE_DEBOUNCE,
    APP_READY_TIMEOUT,
    TITLE_PREVIEW_LENGTH,
    MESSAGE_PREVIEW_LENGTH,
} from '../constants/defaults';
import type { Message } from '../stores/chatStore';

export const MainApp = () => {
    const { postMessage } = useVSCode();

    // Chat Store
    const messages = useChatStore(state => state.messages);
    const addMessage = useChatStore(state => state.addMessage);
    const setMessages = useChatStore(state => state.setMessages);
    const sliceMessages = useChatStore(state => state.sliceMessages);
    const chatSessions = useChatStore(state => state.sessions);
    const setSessions = useChatStore(state => state.setSessions);
    const loading = useChatStore(state => state.isLoading);
    const setLoading = useChatStore(state => state.setLoading);
    const currentSessionId = useChatStore(state => state.currentSessionId);
    const setCurrentSessionId = useChatStore(state => state.switchSession); // Map switchSession to setCurrentSessionId
    const clearMessages = useChatStore(state => state.clearMessages);

    // Agent Store
    const agentStatus = useAgentStore(state => state.status);
    const setAgentStatus = useAgentStore(state => state.setStatus);

    // Model Store
    const selectedModel = useModelStore(state => state.selectedModel);
    const setSelectedModel = useModelStore(state => state.setSelectedModel);
    const providerStatus = useModelStore(state => state.providerStatus);
    const setAllProviderStatus = useModelStore(state => state.setProviderStatus);

    // Notification Store
    const showNotification = useNotificationStore(state => state.addNotification);

    // Terminal Store
    const executeCommand = (command: string) => {
        // TODO: Integrate with actual terminal execution logic or store
        // For now, we return a dummy ID as the actual execution happens in WebviewProvider via postMessage
        // But we can track it in the store
        useTerminalStore.getState().startCommand(command);
        return `cmd-${Date.now()}`;
    };
    const clearAllCommands = useTerminalStore(state => state.clear);

    // File Store
    const availableFiles = useFileStore(state => state.files);
    const setAvailableFiles = useFileStore(state => state.setFiles);

    // Local UI state
    const [isReady, setIsReady] = useState(false);
    const [editingMessage, setEditingMessage] = useState<string>('');
    const [showHistory, setShowHistory] = useState(false);
    const [sessionId, setSessionId] = useState<string>(currentSessionId || GENERATE_SESSION_ID());
    const [projectScripts, setProjectScripts] = useState<ProjectScripts>({});
    const [pendingCommand, setPendingCommand] = useState<CommandIntent | null>(null);

    // Sync sessionId with store
    useEffect(() => {
        if (currentSessionId) {
            setSessionId(currentSessionId);
        }
    }, [currentSessionId]);


    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            const message = event.data;

            switch (message.type) {
                case 'status':
                    if (message.data.files) setAvailableFiles(message.data.files);
                    if (message.data.activeModel) setSelectedModel(message.data.activeModel);
                    if (message.data.providers) setAllProviderStatus(new Map(message.data.providers));
                    setIsReady(true);
                    break;

                case 'queryResponse':
                    if (message.data.loading) {
                        setLoading(true);
                        setAgentStatus('thinking');
                    } else {
                        setLoading(false);
                        setAgentStatus('idle');

                        if (!message.data.success) {
                            showNotification(
                                message.data.response || 'An error occurred',
                                'error'
                            );
                        }

                        const formattedContent = message.data.success
                            ? formatLLMMessage(message.data.response)
                            : `Error: ${message.data.response}`;

                        addMessage({ role: 'ai', content: formattedContent });
                    }
                    break;

                case 'statusUpdate':
                    if (message.data.status) setAgentStatus(message.data.status);
                    break;

                case 'historyList':
                    setSessions(message.data);
                    break;

                case 'loadChat':
                    if (message.data) {
                        setSessionId(message.data.id);
                        setMessages(
                            (message.data.messages || []).map((msg: Message) => ({
                                ...msg,
                                content: msg.role === 'ai' ? formatLLMMessage(msg.content) : msg.content
                            }))
                        );
                        setShowHistory(false);
                    }
                    break;

                case 'fileContent':
                    if (message.path === 'package.json' && message.content) {
                        const scripts = parsePackageJson(message.content);
                        setProjectScripts(scripts);
                    }
                    break;
            }
        };

        window.addEventListener('message', handleMessage);
        postMessage({ type: 'getStatus' });
        setTimeout(() => setIsReady(true), APP_READY_TIMEOUT);

        return () => window.removeEventListener('message', handleMessage);
    }, [postMessage]);

    // Load package.json for script detection
    useEffect(() => {
        const packageJsonFile = availableFiles.find(f => f.path === 'package.json');
        if (packageJsonFile) {
            // Request package.json content
            postMessage({ type: 'readFile', path: 'package.json' });
        }
    }, [availableFiles, postMessage]);

    useEffect(() => {
        if (messages.length > 0) {
            const timeoutId = setTimeout(() => {
                const title = messages[0].content.slice(0, TITLE_PREVIEW_LENGTH) + (messages[0].content.length > TITLE_PREVIEW_LENGTH ? '...' : '');
                postMessage({
                    type: 'saveChat',
                    session: {
                        id: sessionId,
                        title: title,
                        timestamp: Date.now(),
                        messages,
                        preview: messages[messages.length - 1].content.slice(0, MESSAGE_PREVIEW_LENGTH)
                    }
                });
            }, CHAT_SAVE_DEBOUNCE);

            return () => clearTimeout(timeoutId);
        }
    }, [messages, sessionId, postMessage]);


    const handleSend = async (text: string, files: AttachedItem[]) => {
        const projectContext = detectProjectContext(availableFiles, projectScripts);
        const platform = detectPlatform();

        // Try AI-powered command analysis first
        try {
            const commandIntent = await analyzeCommandWithAI({
                userQuery: text,
                projectContext,
                availableFiles,
                platform
            });

            if (commandIntent) {
                if (commandIntent.requiresConfirmation) {
                    setPendingCommand(commandIntent);
                } else {
                    const commandId = executeCommand(commandIntent.command);
                    addMessage({ role: 'user', content: text });
                    addMessage({ role: 'ai', content: `Executing command: \`${commandIntent.command}\``, commandId });
                }
                return;
            }
        } catch (error) {
            console.error('AI command analysis failed, falling back to normal chat:', error);
            // Fall through to normal chat flow
        }

        // Build contextual prompt
        const contextualPrompt = buildContextualPrompt(text, messages, projectScripts);

        // Add user message
        addMessage({ role: 'user', content: text });
        setLoading(true);
        setAgentStatus('thinking');

        // Send with context
        postMessage({
            type: 'executeQuery',
            query: contextualPrompt.prompt,
            files,
            model: selectedModel,
            context: {
                originalQuery: text,
                references: contextualPrompt.references,
                summary: contextualPrompt.contextSummary
            }
        });
    };

    const handleStop = () => {
        setLoading(false);
        setAgentStatus('idle');
        postMessage({ type: 'stopQuery' });
    };

    const handleEdit = (index: number) => {
        const messageToEdit = messages[index];
        if (messageToEdit && messageToEdit.role === 'user') {
            sliceMessages(index);
            setEditingMessage(messageToEdit.content);
        }
    };

    const handleModelSelect = (model: string) => {
        setSelectedModel(model);

        let provider = '';
        if (model.startsWith('gemini')) provider = 'gemini';
        else if (model.startsWith('gpt')) provider = 'openai';
        else if (model.startsWith('claude')) provider = 'anthropic';
        else if (model.startsWith('deepseek')) provider = 'deepseek';

        if (provider && providerStatus.get(provider) === false) {
            showNotification(
                `Provider ${provider} is not configured or unavailable. Please check your API key.`,
                'error'
            );
        }

        postMessage({ type: 'selectModel', model });
    };

    const handleHistoryClick = () => {
        setShowHistory(!showHistory);
        if (!showHistory) postMessage({ type: 'getHistory' });
    };

    const handleSelectSession = (id: string) => postMessage({ type: 'loadChat', id });
    const handleDeleteSession = (id: string) => postMessage({ type: 'deleteChat', id });
    const handleNewChat = () => {
        clearMessages();
        clearAllCommands();
        const newSessionId = GENERATE_SESSION_ID();
        setSessionId(newSessionId);
        setCurrentSessionId(newSessionId);
        setShowHistory(false);
        setEditingMessage('');
    };

    const handleConfirmCommand = () => {
        if (pendingCommand) {
            const commandId = executeCommand(pendingCommand.command);
            addMessage({ role: 'user', content: pendingCommand.originalMessage });
            addMessage({ role: 'ai', content: `Executing command: \`${pendingCommand.command}\``, commandId });

            setPendingCommand(null);
        }
    };

    const handleCancelCommand = () => {
        setPendingCommand(null);
    };

    if (!isReady) {
        return (
            <div className="flex items-center justify-center h-screen bg-zinc-950">
                <div className="text-center">
                    <div className="relative mb-6">
                        <div className="absolute inset-0 bg-blue-500 blur-3xl opacity-30 animate-pulse" />
                        <Loader2 size={48} className="relative text-blue-500 animate-spin mx-auto" />
                    </div>
                    <h2 className="text-xl font-bold text-white mb-2">CodeMind AI</h2>
                    <p className="text-sm text-zinc-400">Initializing your workspace...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-screen bg-zinc-950 text-zinc-100 overflow-x-hidden relative">
            <Notification />

            {showHistory ? (
                <HistoryView
                    sessions={chatSessions}
                    onSelectSession={handleSelectSession}
                    onDeleteSession={handleDeleteSession}
                    onClose={() => setShowHistory(false)}
                />
            ) : (
                <>
                    <ChatHistory
                        messages={messages.filter(m => m.role !== 'system') as any}
                        agentStatus={agentStatus}
                        onEdit={handleEdit}
                        onHistoryClick={handleHistoryClick}
                        onNewChat={handleNewChat}
                    >
                        {/* Render terminal outputs inside chat history */}
                    </ChatHistory>
                    <InputArea
                        onSend={handleSend}
                        onStop={handleStop}
                        availableFiles={availableFiles}
                        onModelSelect={handleModelSelect}
                        isLoading={loading}
                        editingMessage={editingMessage}
                        onEditComplete={() => setEditingMessage('')}
                    />
                </>
            )}

            {/* Command confirmation dialog */}
            {pendingCommand && (
                <CommandConfirmDialog
                    command={pendingCommand.command}
                    riskLevel={pendingCommand.riskLevel}
                    onConfirm={handleConfirmCommand}
                    onCancel={handleCancelCommand}
                />
            )}
        </div>
    );
};
