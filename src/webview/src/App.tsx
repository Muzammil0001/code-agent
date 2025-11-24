import { useState, useEffect } from 'react';
import { useVSCode } from './hooks/useVSCode';
import { ChatHistory } from './components/ChatHistory';
import { InputArea, type AttachedItem } from './components/InputArea';
import { HistoryView, type ChatSession } from './components/HistoryView';
import { Loader2, AlertCircle, X } from 'lucide-react';
import { formatLLMMessage } from './utils/formatLLMMessage';

interface Message {
  role: 'user' | 'ai';
  content: string;
  id?: string;
}

type AgentStatus = 'idle' | 'thinking' | 'planning' | 'running' | 'executing';

interface NotificationState {
  show: boolean;
  message: string;
  type: 'error' | 'info';
}

function App() {
  const { postMessage } = useVSCode();
  const [messages, setMessages] = useState<Message[]>([]);
  const [availableFiles, setAvailableFiles] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [agentStatus, setAgentStatus] = useState<AgentStatus>('idle');
  const [editingMessage, setEditingMessage] = useState<string>('');

  // History & Session State
  const [showHistory, setShowHistory] = useState(false);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [sessionId, setSessionId] = useState<string>(Date.now().toString());
  const [selectedModel, setSelectedModel] = useState<string>('gemini-1.5-flash'); // Default model

  // Notification State
  const [notification, setNotification] = useState<NotificationState>({ show: false, message: '', type: 'info' });

  // Provider Status
  const [providerStatus, setProviderStatus] = useState<Map<string, boolean>>(new Map());

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      switch (message.type) {
        case 'status':
          if (message.data.files) {
            setAvailableFiles(message.data.files);
          }
          if (message.data.activeModel) {
            setSelectedModel(message.data.activeModel);
          }
          if (message.data.providers) {
            setProviderStatus(new Map(message.data.providers));
          }
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
              setNotification({
                show: true,
                message: message.data.response || 'An error occurred',
                type: 'error'
              });
            }
            setMessages(prev => [...prev, {
              role: 'ai',
              content: message.data.success ? formatLLMMessage(message.data.response) : `Error: ${message.data.response}`,
              id: Date.now().toString()
            }]);
          }
          break;
        case 'statusUpdate':
          if (message.data.status) {
            setAgentStatus(message.data.status);
          }
          break;
        case 'historyList':
          setChatSessions(message.data);
          break;
        case 'loadChat':
          if (message.data) {
            setSessionId(message.data.id);
            setMessages(message.data.messages || []);
            setShowHistory(false);
          }
          break;
      }
    };

    window.addEventListener('message', handleMessage);
    postMessage({ type: 'getStatus' });

    setTimeout(() => setIsReady(true), 1000);

    return () => window.removeEventListener('message', handleMessage);
  }, [postMessage]);

  // Save chat when messages change (debounced)
  useEffect(() => {
    if (messages.length > 0) {
      const timeoutId = setTimeout(() => {
        const title = messages[0].content.slice(0, 50) + (messages[0].content.length > 50 ? '...' : '');
        postMessage({
          type: 'saveChat',
          session: {
            id: sessionId,
            title: title,
            timestamp: Date.now(),
            messages: messages,
            preview: messages[messages.length - 1].content.slice(0, 100)
          }
        });
      }, 1000);
      return () => clearTimeout(timeoutId);
    }
  }, [messages, sessionId, postMessage]);

  const handleSend = (text: string, files: AttachedItem[]) => {
    setMessages(prev => [...prev, { role: 'user', content: text, id: Date.now().toString() }]);
    setLoading(true);
    setAgentStatus('thinking');
    postMessage({
      type: 'executeQuery',
      query: text,
      files: files,
      model: selectedModel
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
      setMessages(prev => prev.slice(0, index));
      setEditingMessage(messageToEdit.content);
    }
  };

  const handleModelSelect = (model: string) => {
    setSelectedModel(model);

    // Simple heuristic to map model to provider
    let provider = '';
    if (model.startsWith('gemini')) provider = 'gemini';
    else if (model.startsWith('gpt')) provider = 'openai';
    else if (model.startsWith('claude')) provider = 'anthropic';
    else if (model.startsWith('deepseek')) provider = 'deepseek';

    if (provider && providerStatus.get(provider) === false) {
      setNotification({
        show: true,
        message: `Provider ${provider} is not configured or unavailable. Please check your API key.`,
        type: 'error'
      });
    }

    postMessage({
      type: 'selectModel',
      model: model
    });
  };

  const handleHistoryClick = () => {
    setShowHistory(!showHistory);
    if (!showHistory) {
      postMessage({ type: 'getHistory' });
    }
  };

  const handleSelectSession = (id: string) => {
    postMessage({ type: 'loadChat', id });
  };

  const handleDeleteSession = (id: string) => {
    postMessage({ type: 'deleteChat', id });
  };

  const handleNewChat = () => {
    setMessages([]);
    setSessionId(Date.now().toString());
    setShowHistory(false);
    setEditingMessage('');
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
      {/* Notification Popup */}
      {notification.show && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-md px-4">
          <div className={`flex items-center justify-between p-4 rounded-lg shadow-lg border ${notification.type === 'error' ? 'bg-red-900/90 border-red-700 text-red-100' : 'bg-blue-900/90 border-blue-700 text-blue-100'
            } backdrop-blur-sm`}>
            <div className="flex items-center gap-3">
              <AlertCircle size={20} />
              <p className="text-sm font-medium">{notification.message}</p>
            </div>
            <button
              onClick={() => setNotification({ ...notification, show: false })}
              className="p-1 hover:bg-white/10 rounded-full transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

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
            messages={messages}
            agentStatus={agentStatus}
            onEdit={handleEdit}
            onHistoryClick={handleHistoryClick}
            onNewChat={handleNewChat}
          />
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
    </div>
  );
}

export default App;
