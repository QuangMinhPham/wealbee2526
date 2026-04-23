import React, { useState, useRef, useEffect } from 'react';
import { X, Sparkles, Send, TrendingUp, BarChart3, DollarSign, AlertCircle, Loader2 } from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { supabase } from '../lib/supabase/client';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface StockAISidebarProps {
  isOpen: boolean;
  onClose: () => void;
  stockData: {
    ticker: string;
    name: string;
    price: number;
    sector: string;
    marketCap: number;
    dividendYield: number;
    payoutRatio: number;
    pe: number;
    pb: number;
    roe: number;
    roa: number;
    debtToEquity: number;
    revenueYoY: number;
    netIncomeYoY: number;
    fcfYoY: number;
  };
}

export function StockAISidebar({ isOpen, onClose, stockData }: StockAISidebarProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Reset conversation when a different stock is opened
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      generateAutoAnalysis();
    }
  }, [isOpen]);

  const getAccessToken = async (): Promise<string> => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ?? publicAnonKey;
  };

  const generateAutoAnalysis = async () => {
    setIsAnalyzing(true);

    const analysisPrompt = `Hãy phân tích chuyên sâu cổ phiếu ${stockData.ticker} (${stockData.name}) dựa trên các thông tin sau:

📊 Thông tin cơ bản:
- Giá hiện tại: ${stockData.price.toLocaleString('vi-VN')} VND
- Vốn hóa: ${(stockData.marketCap / 1000000000000).toFixed(1)}T VND
- Ngành: ${stockData.sector}

💰 Chỉ số định giá:
- P/E: ${stockData.pe.toFixed(1)}
- P/B: ${stockData.pb.toFixed(1)}

📈 Hiệu quả hoạt động:
- ROE: ${stockData.roe}%
- ROA: ${stockData.roa}%

💵 Cổ tức:
- Tỷ suất cổ tức: ${stockData.dividendYield.toFixed(1)}%
- Payout Ratio: ${stockData.payoutRatio}%

📊 Tăng trưởng:
- Doanh thu YoY: ${stockData.revenueYoY.toFixed(1)}%
- Lợi nhuận ròng YoY: ${stockData.netIncomeYoY.toFixed(1)}%
- FCF YoY: ${stockData.fcfYoY.toFixed(1)}%

⚖️ Đòn bẩy:
- Debt/Equity: ${stockData.debtToEquity.toFixed(2)}

Hãy đưa ra phân tích chi tiết về:
1. 💎 Điểm mạnh của cổ phiếu này
2. ⚠️ Rủi ro cần lưu ý
3. 🎯 Định giá hiện tại (hợp lý/đắt/rẻ so với ngành)
4. 📊 Triển vọng tăng trưởng
5. 💰 Khả năng chi trả cổ tức bền vững
6. 🎬 Khuyến nghị hành động (mua/giữ/bán) với lý do cụ thể

Phân tích theo phong cách chuyên gia tài chính nhưng dễ hiểu, có cấu trúc rõ ràng với emoji và bullet points.`;

    try {
      const token = await getAccessToken();
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-aa51327d/pi-ai-chat`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            message: analysisPrompt,
            conversationId: null,
            contextType: 'stock_analysis',
            contextSymbol: stockData.ticker,
          })
        }
      );

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Server error: ${response.status}`);
      }

      const data = await response.json();

      if (data.conversationId) {
        setConversationId(data.conversationId);
      }

      const assistantMessage: Message = {
        id: data.messageId ?? crypto.randomUUID(),
        role: 'assistant',
        content: data.response,
        timestamp: new Date()
      };

      setMessages([assistantMessage]);
    } catch (error) {
      console.error('Error generating analysis:', error);

      const errorMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'Xin lỗi, đã xảy ra lỗi khi tạo phân tích. Vui lòng thử lại sau.',
        timestamp: new Date()
      };

      setMessages([errorMessage]);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const sendMessage = async () => {
    const textToSend = input.trim();
    if (!textToSend || isLoading) return;

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
      const token = await getAccessToken();
      const contextualPrompt = `Về cổ phiếu ${stockData.ticker}: ${textToSend}`;

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-aa51327d/pi-ai-chat`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            message: contextualPrompt,
            conversationId,
            contextType: 'stock_analysis',
            contextSymbol: stockData.ticker,
          })
        }
      );

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Server error: ${response.status}`);
      }

      const data = await response.json();

      if (!conversationId && data.conversationId) {
        setConversationId(data.conversationId);
      }

      const assistantMessage: Message = {
        id: data.messageId ?? crypto.randomUUID(),
        role: 'assistant',
        content: data.response,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error sending message:', error);

      const errorMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'Xin lỗi, đã xảy ra lỗi. Vui lòng thử lại.',
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

  const quickQuestions = [
    { icon: TrendingUp, text: "So sánh với cổ phiếu cùng ngành", color: "text-blue-600" },
    { icon: BarChart3, text: "Phân tích kỹ thuật hiện tại", color: "text-purple-600" },
    { icon: DollarSign, text: "Dự báo cổ tức năm tới", color: "text-emerald-600" },
    { icon: AlertCircle, text: "Rủi ro cần chú ý", color: "text-orange-600" }
  ];

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/20 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Sidebar */}
      <div className="fixed right-0 top-0 h-screen w-full md:w-[480px] bg-white shadow-2xl z-50 flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-white font-bold text-lg">Bee AI Analysis</h2>
              <p className="text-emerald-100 text-xs">{stockData.ticker} - {stockData.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-6 bg-slate-50">
          {isAnalyzing ? (
            <div className="flex flex-col items-center justify-center h-full">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mb-4 animate-pulse">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mb-3" />
              <p className="text-slate-700 font-medium">Đang phân tích {stockData.ticker}...</p>
              <p className="text-slate-500 text-sm mt-1">Bee AI đang xem xét các chỉ số tài chính</p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {message.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0">
                      <Sparkles className="w-5 h-5 text-white" />
                    </div>
                  )}

                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                      message.role === 'user'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-white border border-slate-200 text-slate-900 shadow-sm'
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
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <div className="bg-white border border-slate-200 rounded-2xl px-4 py-3 shadow-sm">
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

          {/* Quick Questions */}
          {!isAnalyzing && messages.length > 0 && (
            <div className="mt-6">
              <p className="text-xs font-semibold text-slate-700 mb-3">Câu hỏi gợi ý:</p>
              <div className="grid grid-cols-1 gap-2">
                {quickQuestions.map((q, index) => {
                  const Icon = q.icon;
                  return (
                    <button
                      key={index}
                      onClick={() => {
                        setInput(q.text);
                        inputRef.current?.focus();
                      }}
                      className="text-left p-3 bg-white rounded-lg border border-slate-200 hover:border-emerald-300 hover:shadow-md transition-all group"
                    >
                      <div className="flex items-center gap-2">
                        <Icon className={`w-4 h-4 ${q.color} group-hover:scale-110 transition-transform`} />
                        <span className="text-xs text-slate-700 group-hover:text-slate-900">
                          {q.text}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="bg-white border-t border-slate-200 px-4 py-4">
          <div className="flex gap-2 items-end">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={`Hỏi thêm về ${stockData.ticker}...`}
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none text-sm text-slate-900 placeholder-slate-400"
                rows={1}
                style={{
                  minHeight: '48px',
                  maxHeight: '100px'
                }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = '48px';
                  target.style.height = Math.min(target.scrollHeight, 100) + 'px';
                }}
                disabled={isAnalyzing}
              />
            </div>
            <button
              onClick={sendMessage}
              disabled={!input.trim() || isLoading || isAnalyzing}
              className="px-4 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 font-medium h-12"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
          <p className="text-xs text-slate-500 mt-2 text-center">
            Bee AI phân tích dựa trên dữ liệu có sẵn. Không phải lời khuyên đầu tư.
          </p>
        </div>
      </div>
    </>
  );
}
