import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, Bot, User, Loader2, MessageSquarePlus } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

import { chatWithAI } from '../services/aiService';
import { buildAIContext, ChatHistoryTurn } from '../services/aiContext';
import { useAuth } from '../AuthContext';
import { useDemoData } from '../DemoContext';

const MAX_HISTORY_TURNS = 8;

export default function AIChat() {
  const { profile } = useAuth();
  const { students, enquiries, appointments, notifications } = useDemoData();
  const [messages, setMessages] = useState<ChatHistoryTurn[]>([
    { role: 'ai', text: 'Hello! I am UniLink AI. I can help using the UniLink records currently available for your account.' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading || !profile) return;

    const userMsg = input.trim();
    const history = messages.slice(-MAX_HISTORY_TURNS);
    const context = buildAIContext({
      message: userMsg,
      profile,
      students,
      enquiries,
      appointments,
      notifications,
    });

    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setLoading(true);

    try {
      const text = await chatWithAI({
        message: userMsg,
        history,
        viewer: {
          uid: profile.uid,
          full_name: profile.full_name,
          email: profile.email,
          role: profile.role,
        },
        context,
      });

      setMessages(prev => [...prev, { role: 'ai', text }]);
    } catch (error) {
      console.error('Chat Error:', error);
      setMessages(prev => [...prev, { role: 'ai', text: 'Sorry, I encountered an error. Please try again later.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-12rem)] flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-teal-600 text-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-bold">UniLink AI Assistant</h2>
            <p className="text-xs text-teal-100">Always here to help</p>
          </div>
        </div>
        <button 
          onClick={() => navigate('/enquiries/new')}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-bold transition-all"
        >
          <MessageSquarePlus className="w-4 h-4" />
          Create Enquiry
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-4 ${msg.role === 'ai' ? 'flex-row' : 'flex-row-reverse'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'ai' ? 'bg-teal-100 text-teal-600' : 'bg-slate-100 text-slate-600'}`}>
              {msg.role === 'ai' ? <Bot className="w-5 h-5" /> : <User className="w-5 h-5" />}
            </div>
            <div className={`max-w-[80%] p-4 rounded-2xl text-sm leading-relaxed ${msg.role === 'ai' ? 'bg-slate-50 text-slate-800 rounded-tl-none' : 'bg-teal-600 text-white rounded-tr-none'}`}>
              <div className="markdown-body">
                <ReactMarkdown>{msg.text}</ReactMarkdown>
              </div>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-4">
            <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-600 flex items-center justify-center shrink-0">
              <Bot className="w-5 h-5" />
            </div>
            <div className="bg-slate-50 p-4 rounded-2xl rounded-tl-none">
              <Loader2 className="w-5 h-5 animate-spin text-teal-600" />
            </div>
          </div>
        )}
      </div>

      <form onSubmit={handleSend} className="p-6 border-t border-slate-100 bg-slate-50">
        <div className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question about university services..."
            className="w-full pl-6 pr-16 py-4 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all shadow-sm"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="absolute right-2 top-2 bottom-2 px-4 rounded-xl bg-teal-600 text-white hover:bg-teal-700 transition-all disabled:opacity-50"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
        <p className="text-[10px] text-center text-slate-400 mt-3 uppercase tracking-widest font-bold">
          AI responses are grounded in your current UniLink demo data. Final decisions require staff review.
        </p>
      </form>
    </div>
  );
}
