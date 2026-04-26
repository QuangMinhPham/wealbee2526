import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, TrendingUp, AlertCircle, Target, BarChart3, MessageSquare, Trash2, LogIn } from 'lucide-react';
import { useSearchParams, useNavigate } from 'react-router';
import { projectId } from '../utils/supabase/info';
import { useAuth } from '../lib/auth-context';
import { supabase } from '../lib/supabase/client';
import { validatePromptParam, validateChatMessage } from '../lib/validation';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatSession {
  id: string;
  title: string;
  lastMessageTime: Date;
  context_type?: string;
}

export function PiAI() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [remainingMessages, setRemainingMessages] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const safe = validatePromptParam(searchParams.get('prompt'));
    if (safe) {
      setInput(safe);
      setSearchParams({}, { replace: true });
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, []);

  const exampleQuestions = [
    {
      icon: TrendingUp,
      text: "VNM có điểm an toàn cổ tức là bao nhiêu?",
      color: "text-emerald-600 dark:text-emerald-400"
    },
    {
      icon: BarChart3,
      text: "Phân tích danh mục đầu tư hiện tại của tôi",
      color: "text-blue-600 dark:text-blue-400"
    },
    {
      icon: Target,
      text: "Chiến lược đầu tư nào phù hợp với mục tiêu của tôi?",
      color: "text-purple-600 dark:text-purple-400"
    },
    {
      icon: AlertCircle,
      text: "Những tin tức trên thị trường tác động tiêu cực đến danh mục của tôi",
      color: "text-orange-600 dark:text-orange-400"
    }
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load conversations from DB when user is authenticated
  useEffect(() => {
    if (user) {
      loadConversations();
    }
  }, [user]);

  const getAccessToken = async (): Promise<string | null> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      navigate('/login');
      return null;
    }
    return session.access_token;
  };

  const loadConversations = async () => {
    const token = await getAccessToken();
    if (!token) return;

    try {
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-aa51327d/conversations`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) return;
      const data = await res.json();
      setChatSessions(
        (data.conversations ?? []).map((c: any) => ({
          id: c.id,
          title: c.title,
          lastMessageTime: new Date(c.updated_at ?? c.created_at),
          context_type: c.context_type,
        }))
      );
    } catch (e) {
      console.error('Failed to load conversations:', e);
    }
  };

  const createNewSession = () => {
    setCurrentSessionId(null);
    setMessages([]);
  };

  const loadSession = async (sessionId: string) => {
    const token = await getAccessToken();
    if (!token) return;

    setCurrentSessionId(sessionId);
    setMessages([]);

    try {
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-aa51327d/messages/${sessionId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) return;
      const data = await res.json();
      setMessages(
        (data.messages ?? []).map((m: any) => ({
          id: m.id,
          role: m.role as 'user' | 'assistant',
          content: m.content,
          timestamp: new Date(m.created_at),
        }))
      );
    } catch (e) {
      console.error('Failed to load messages:', e);
    }
  };

  const deleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const token = await getAccessToken();
    if (!token) return;

    try {
      await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-aa51327d/conversations/${sessionId}`,
        { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }
      );
      setChatSessions(prev => prev.filter(s => s.id !== sessionId));
      if (currentSessionId === sessionId) {
        setCurrentSessionId(null);
        setMessages([]);
      }
    } catch (e) {
      console.error('Failed to delete conversation:', e);
    }
  };

  const sendMessage = async (messageText?: string) => {
    const raw = messageText || input.trim();
    if (!raw || isLoading) return;

    let textToSend: string;
    try {
      textToSend = validateChatMessage(raw);
    } catch {
      return;
    }

    const token = await getAccessToken();
    if (!token) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: textToSend,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-aa51327d/pi-ai-chat`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            message: textToSend,
            conversationId: currentSessionId,
            contextType: 'general',
          })
        }
      );

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Server error: ${res.status}`);
      }

      const data = await res.json();

      // Track returned conversationId for new sessions
      if (!currentSessionId && data.conversationId) {
        setCurrentSessionId(data.conversationId);
        // Add new session to sidebar
        const newSession: ChatSession = {
          id: data.conversationId,
          title: textToSend.substring(0, 40) + (textToSend.length > 40 ? '...' : ''),
          lastMessageTime: new Date(),
        };
        setChatSessions(prev => [newSession, ...prev]);
      } else {
        // Update lastMessageTime for existing session
        setChatSessions(prev =>
          prev.map(s =>
            s.id === currentSessionId ? { ...s, lastMessageTime: new Date() } : s
          )
        );
      }

      if (data.remainingMessages !== undefined) {
        setRemainingMessages(data.remainingMessages);
      }

      const assistantMessage: Message = {
        id: data.messageId ?? crypto.randomUUID(),
        role: 'assistant',
        content: data.response,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error sending message to Bee AI:', error);
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `Xin lỗi, đã xảy ra lỗi khi xử lý yêu cầu của bạn. Vui lòng thử lại sau. Lỗi: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Vừa xong';
    if (minutes < 60) return `${minutes} phút trước`;
    if (hours < 24) return `${hours} giờ trước`;
    return `${days} ngày trước`;
  };

  // Login required screen
  if (!user) {
    return (
      <div className="flex h-full bg-slate-50 dark:bg-slate-950 items-center justify-center">
        <div className="text-center max-w-md mx-auto px-6">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mx-auto mb-6">
            <Sparkles className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-3">Bee AI - Trợ lý đầu tư</h2>
          <p className="text-slate-600 mb-8">
            Vui lòng đăng nhập để sử dụng Bee AI và nhận phân tích danh mục cá nhân hóa của bạn.
          </p>
          <a
            href="/login"
            className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium"
          >
            <LogIn className="w-5 h-5" />
            Đăng nhập
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full bg-gray-50 dark:bg-slate-950">
      {/* Chat History Sidebar */}
      <div className="w-80 bg-white border-r border-slate-200 flex flex-col">
        <div className="p-4 border-b border-slate-200">
          <button
            onClick={createNewSession}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium"
          >
            <MessageSquare className="w-5 h-5" />
            Cuộc trò chuyện mới
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-3 px-2">Lịch sử Chat</h3>

          {chatSessions.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Chưa có cuộc trò chuyện nào</p>
            </div>
          ) : (
            <div className="space-y-2">
              {chatSessions.map(session => (
                <div
                  key={session.id}
                  className={`group relative w-full text-left p-3 rounded-lg transition-all cursor-pointer ${
                    currentSessionId === session.id
                      ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800'
                      : 'hover:bg-slate-50 border border-transparent'
                  }`}
                  onClick={() => loadSession(session.id)}
                >
                  <div className="font-medium text-sm text-slate-900 mb-1 line-clamp-2 pr-6">
                    {session.title}
                  </div>
                  <div className="text-xs text-slate-500">
                    {formatTime(session.lastMessageTime)}
                  </div>
                  <button
                    onClick={(e) => deleteSession(session.id, e)}
                    className="absolute top-3 right-2 p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-red-100 hover:text-red-600 dark:text-red-400 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white dark:bg-slate-800 border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Bee AI</h1>
              <p className="text-sm text-slate-600">Trợ lý đầu tư thông minh của bạn</p>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {messages.length === 0 ? (
            <div className="max-w-3xl mx-auto">
              {/* Welcome Message */}
              <div className="text-center mb-12">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mx-auto mb-6">
                  <Sparkles className="w-10 h-10 text-white" />
                </div>
                <h2 className="text-3xl font-bold text-slate-900 mb-3">
                  Xin chào! Tôi là Bee AI
                </h2>
                <p className="text-lg text-slate-600">
                  Trợ lý đầu tư được cá nhân hóa cho danh mục và mục tiêu của bạn
                </p>
              </div>

              {/* Example Questions */}
              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-4">
                  Bạn có thể hỏi tôi về:
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {exampleQuestions.map((question, index) => {
                    const Icon = question.icon;
                    return (
                      <button
                        key={index}
                        onClick={() => sendMessage(question.text)}
                        className="text-left p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 hover:border-emerald-300 hover:shadow-md transition-all group"
                      >
                        <div className="flex items-start gap-3">
                          <Icon className={`w-5 h-5 mt-0.5 ${question.color} group-hover:scale-110 transition-transform`} />
                          <span className="text-sm text-slate-700 group-hover:text-slate-900">
                            {question.text}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-6">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-4 ${
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {message.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0">
                      <Sparkles className="w-5 h-5 text-white" />
                    </div>
                  )}

                  <div
                    className={`max-w-[75%] rounded-2xl px-5 py-3 ${
                      message.role === 'user'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-white border border-slate-200 text-slate-900'
                    }`}
                  >
                    <div className="text-sm whitespace-pre-wrap leading-relaxed">
                      {message.content}
                    </div>
                    <div
                      className={`text-xs mt-2 ${
                        message.role === 'user' ? 'text-emerald-100' : 'text-slate-500'
                      }`}
                    >
                      {message.timestamp.toLocaleTimeString('vi-VN', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>

                  {message.role === 'user' && (
                    <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0 text-white text-sm font-semibold">
                      U
                    </div>
                  )}
                </div>
              ))}

              {isLoading && (
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <div className="bg-white border border-slate-200 rounded-2xl px-5 py-3">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="bg-white border-t border-slate-200 px-6 py-4">
          <div className="max-w-3xl mx-auto">
            <div className="flex gap-3 items-end">
              <div className="flex-1 relative">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Bạn tò mò về cổ phiếu nào? Hỏi tôi, tôi sẽ cung cấp insights!"
                  className="w-full px-4 py-3 pr-12 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400 focus:border-transparent resize-none text-slate-900 placeholder-slate-400"
                  rows={1}
                  style={{
                    minHeight: '48px',
                    maxHeight: '120px'
                  }}
                  onInput={(e) => {
                    const target = e.target as HTMLTextAreaElement;
                    target.style.height = '48px';
                    target.style.height = Math.min(target.scrollHeight, 120) + 'px';
                  }}
                />
              </div>
              <button
                onClick={() => sendMessage()}
                disabled={!input.trim() || isLoading}
                className="px-6 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 font-medium h-12"
              >
                <Send className="w-5 h-5" />
                Gửi
              </button>
            </div>
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-slate-500">
                Bee AI có thể mắc lỗi. Hãy kiểm tra thông tin quan trọng.
              </p>
              {remainingMessages !== null && (
                <p className="text-xs text-slate-500">
                  Còn {remainingMessages}/50 câu hỏi hôm nay
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
