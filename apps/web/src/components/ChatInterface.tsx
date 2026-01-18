import { useState, useEffect, useRef } from 'react';
import { Send, ChevronLeft, Loader } from 'lucide-react';
import { sendChatMessage } from '../services/api';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatInterfaceProps {
  sessionId: string;
  onBack: () => void;
}

export function ChatInterface({ sessionId, onBack }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: 'Bonjour! Je suis votre analyste financier. Vous pouvez me poser des questions sur les données de cette entreprise. Par exemple:\n\n• "Montre-moi le P&L 2024"\n• "Pourquoi l\'EBITDA a baissé?"\n• "Quels sont les hotspots?"\n• "Quels sont les risques?"\n\nComment puis-je vous aider?',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setError(null);

    // Add user message to chat
    const newMessages: ChatMessage[] = [
      ...messages,
      { role: 'user', content: userMessage },
    ];
    setMessages(newMessages);

    // Send to API
    setLoading(true);
    try {
      const data = await sendChatMessage(sessionId, userMessage);

      // Add assistant response
      setMessages([
        ...newMessages,
        {
          role: 'assistant',
          content: data.content,
        },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get response');
      // Remove loading state by adding error message
      setMessages([
        ...newMessages,
        {
          role: 'assistant',
          content: `⚠️ Error: ${err instanceof Error ? err.message : 'Failed to process your request'}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-2 hover:bg-gray-100 rounded-lg transition-all"
            >
              <ChevronLeft size={24} className="text-gray-600" />
            </button>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Financial Analysis Chat</h2>
              <p className="text-sm text-gray-600">Ask questions about this company's finances</p>
            </div>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {messages.map((message, idx) => (
          <div
            key={idx}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xl lg:max-w-2xl ${
                message.role === 'user'
                  ? 'bg-blue-600 text-white rounded-2xl rounded-tr-sm'
                  : 'bg-white text-gray-900 rounded-2xl rounded-tl-sm border border-gray-200'
              } px-6 py-4`}
            >
              <p className="whitespace-pre-wrap text-sm leading-relaxed">
                {message.content}
              </p>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-white text-gray-900 rounded-2xl rounded-tl-sm border border-gray-200 px-6 py-4 flex items-center gap-2">
              <Loader className="animate-spin" size={18} />
              <span className="text-sm">Claude is thinking...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="bg-white border-t border-gray-200 sticky bottom-0">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          {error && (
            <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={loading}
              placeholder="Ask me anything about the financial data..."
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            />
            <button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              className="px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-all flex items-center gap-2"
            >
              {loading ? (
                <Loader className="animate-spin" size={20} />
              ) : (
                <Send size={20} />
              )}
            </button>
          </div>

          {/* Quick Suggestions */}
          <div className="mt-4 flex flex-wrap gap-2">
            <div className="text-xs text-gray-600 w-full mb-2">Suggested questions:</div>
            {[
              'Montre-moi le P&L 2024',
              'Pourquoi l\'EBITDA a baissé?',
              'Quels sont les hotspots?',
              'Analyse le BFR',
            ].map((suggestion, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setInput(suggestion);
                }}
                disabled={loading}
                className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 text-gray-700 rounded-full transition-all"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
