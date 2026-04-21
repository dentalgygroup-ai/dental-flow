import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Send, Loader2, Bot, Sparkles, Plus, Trash2, MessageSquare, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import MessageBubble from '@/components/crm/MessageBubble';

const AGENT_NAME = 'asistente_dentalflow';

const SUGGESTED_QUESTIONS = [
  { icon: '🗺️', text: '¿Cómo funciona el pipeline de pacientes?' },
  { icon: '💰', text: '¿Cómo registro un cobro?' },
  { icon: '📊', text: 'Analiza mi pipeline y dame sugerencias' },
  { icon: '👥', text: '¿Cómo invito a un nuevo usuario?' },
  { icon: '📅', text: '¿Cómo programo una próxima acción?' },
  { icon: '⚙️', text: '¿Qué puedo configurar en la app?' },
];

export default function Asistente() {
  const [conversation, setConversation] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    if (!conversation?.id) return;
    const unsub = base44.agents.subscribeToConversation(conversation.id, (data) => {
      setMessages(data.messages || []);
    });
    return unsub;
  }, [conversation?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadConversations = async () => {
    setLoading(true);
    try {
      const list = await base44.agents.listConversations({ agent_name: AGENT_NAME });
      const sorted = (list || []).sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
      setConversations(sorted);
      if (sorted.length > 0) {
        await openConversation(sorted[0].id);
      } else {
        await startNewConversation();
      }
    } catch (e) {
      await startNewConversation();
    }
    setLoading(false);
  };

  const openConversation = async (id) => {
    const conv = await base44.agents.getConversation(id);
    setConversation(conv);
    setMessages(conv.messages || []);
    setSidebarOpen(false);
  };

  const startNewConversation = async () => {
    const now = new Date();
    const label = now.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
    const conv = await base44.agents.createConversation({
      agent_name: AGENT_NAME,
      metadata: { name: `Chat ${label}` },
    });
    setConversation(conv);
    setMessages([]);
    setConversations(prev => [conv, ...prev]);
    setSidebarOpen(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleSend = async (text) => {
    const content = (text || input).trim();
    if (!content || sending || !conversation) return;
    setInput('');
    setSending(true);
    await base44.agents.addMessage(conversation, { role: 'user', content });
    setSending(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const isWaiting = sending || (messages.length > 0 && messages[messages.length - 1]?.role === 'user');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto">
            <Bot className="w-6 h-6 text-blue-600 animate-pulse" />
          </div>
          <p className="text-sm text-gray-500">Cargando asistente...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-0px)] bg-gray-50 overflow-hidden" style={{ height: 'calc(100dvh - 0px)' }}>

      {/* Sidebar overlay mobile */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/30 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <div className={`
        fixed md:relative inset-y-0 left-0 z-50 w-72 bg-white border-r border-gray-100 flex flex-col
        transition-transform duration-300 md:translate-x-0 md:flex
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Sidebar header */}
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-8 h-8 bg-blue-100 rounded-xl flex items-center justify-center">
              <Bot className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Asistente IA</p>
              <p className="text-xs text-gray-400">Dental Flow</p>
            </div>
          </div>
          <Button size="sm" className="w-full gap-2 bg-blue-600 hover:bg-blue-700 text-white" onClick={startNewConversation}>
            <Plus className="w-4 h-4" />
            Nueva conversación
          </Button>
        </div>

        {/* Conversations list */}
        <div className="flex-1 overflow-y-auto p-2">
          {conversations.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-6">Sin conversaciones anteriores</p>
          ) : (
            conversations.map(conv => (
              <button
                key={conv.id}
                onClick={() => openConversation(conv.id)}
                className={`w-full text-left px-3 py-2.5 rounded-xl text-sm transition-all flex items-center gap-2 group ${
                  conversation?.id === conv.id
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <MessageSquare className="w-4 h-4 flex-shrink-0 opacity-60" />
                <span className="truncate flex-1">{conv.metadata?.name || 'Conversación'}</span>
                {conversation?.id === conv.id && <ChevronRight className="w-3.5 h-3.5 opacity-40" />}
              </button>
            ))
          )}
        </div>

        {/* User info */}
        {currentUser && (
          <div className="p-3 border-t border-gray-100">
            <div className="flex items-center gap-2 px-2 py-1.5">
              <div className="w-7 h-7 bg-gray-200 rounded-full flex items-center justify-center text-xs font-medium text-gray-600">
                {currentUser.full_name?.charAt(0) || '?'}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-gray-700 truncate">{currentUser.full_name}</p>
                <p className="text-xs text-gray-400 truncate">{currentUser.email}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main chat */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Header */}
        <div className="bg-white border-b border-gray-100 px-4 md:px-6 py-3.5 flex items-center gap-3 flex-shrink-0">
          <button
            className="md:hidden p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            onClick={() => setSidebarOpen(true)}
          >
            <MessageSquare className="w-5 h-5 text-gray-500" />
          </button>
          <div className="w-8 h-8 bg-blue-100 rounded-xl flex items-center justify-center">
            <Bot className="w-4 h-4 text-blue-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 text-sm">Asistente Dental Flow</p>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
              <p className="text-xs text-gray-500">Siempre disponible · Acceso a tus datos</p>
            </div>
          </div>
          <Button size="sm" variant="outline" className="hidden md:flex gap-1.5 text-xs" onClick={startNewConversation}>
            <Plus className="w-3.5 h-3.5" /> Nueva
          </Button>
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6 space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-6 text-center">
              <div>
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-blue-200">
                  <Sparkles className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 mt-4">¿En qué puedo ayudarte?</h2>
                <p className="text-sm text-gray-500 mt-1 max-w-md mx-auto">
                  Soy tu asistente experto en Dental Flow. Pregúntame cómo funciona cualquier parte de la app o pídeme que analice los datos de tu clínica.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-xl">
                {SUGGESTED_QUESTIONS.map(q => (
                  <button
                    key={q.text}
                    onClick={() => handleSend(q.text)}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white border border-gray-200 text-left text-sm text-gray-700 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-800 transition-all shadow-sm group"
                  >
                    <span className="text-lg flex-shrink-0">{q.icon}</span>
                    <span className="flex-1">{q.text}</span>
                    <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-blue-400 flex-shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <MessageBubble key={`${msg.role}-${i}`} message={msg} />
          ))}

          {/* Typing indicator */}
          {isWaiting && (
            <div className="flex gap-3 justify-start">
              <div className="h-7 w-7 rounded-lg bg-slate-100 flex items-center justify-center mt-0.5 flex-shrink-0">
                <div className="h-1.5 w-1.5 rounded-full bg-slate-400" />
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl px-4 py-3">
                <div className="flex gap-1 items-center h-4">
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input bar */}
        <div className="bg-white border-t border-gray-100 px-4 md:px-8 py-4 flex-shrink-0">
          <div className="flex gap-2 max-w-3xl mx-auto">
            <Input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Escribe tu pregunta sobre Dental Flow..."
              className="flex-1 rounded-xl border-gray-200 focus:border-blue-400"
              disabled={sending}
              autoFocus
            />
            <Button
              onClick={() => handleSend()}
              disabled={!input.trim() || sending}
              className="rounded-xl bg-blue-600 hover:bg-blue-700 px-4"
              size="icon"
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
          <p className="text-center text-xs text-gray-400 mt-2">
            El asistente tiene acceso de lectura a los datos de tu clínica para sugerencias personalizadas.
          </p>
        </div>
      </div>
    </div>
  );
}