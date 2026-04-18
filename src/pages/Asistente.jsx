import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Send, Loader2, Bot, Sparkles, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import MessageBubble from '@/components/crm/MessageBubble';

const AGENT_NAME = 'asistente_dentalflow';

const SUGGESTED_QUESTIONS = [
  '¿Cómo muevo un paciente al siguiente estado?',
  '¿Qué pacientes requieren atención urgente?',
  '¿Cómo registro un cobro?',
  '¿Cómo invito a un nuevo usuario?',
  'Analiza mi pipeline y dame sugerencias',
];

export default function Asistente() {
  const [conversation, setConversation] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  // Load conversations list on mount
  useEffect(() => {
    loadConversations();
  }, []);

  // Subscribe to conversation updates
  useEffect(() => {
    if (!conversation?.id) return;
    const unsub = base44.agents.subscribeToConversation(conversation.id, (data) => {
      setMessages(data.messages || []);
    });
    return unsub;
  }, [conversation?.id]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadConversations = async () => {
    setLoading(true);
    const list = await base44.agents.listConversations({ agent_name: AGENT_NAME });
    setConversations(list || []);
    if (list?.length > 0) {
      await loadConversation(list[0].id);
    } else {
      await createNewConversation();
    }
    setLoading(false);
  };

  const loadConversation = async (id) => {
    const conv = await base44.agents.getConversation(id);
    setConversation(conv);
    setMessages(conv.messages || []);
  };

  const createNewConversation = async () => {
    const conv = await base44.agents.createConversation({
      agent_name: AGENT_NAME,
      metadata: { name: `Chat ${new Date().toLocaleDateString('es-ES')}` },
    });
    setConversation(conv);
    setMessages([]);
    setConversations(prev => [conv, ...prev]);
  };

  const handleSend = async (text) => {
    const content = text || input.trim();
    if (!content || sending) return;
    setInput('');
    setSending(true);
    await base44.agents.addMessage(conversation, { role: 'user', content });
    setSending(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  const isWaiting = sending || (messages.length > 0 && messages[messages.length - 1]?.role === 'user');

  return (
    <div className="flex h-[calc(100vh-64px)] lg:h-screen bg-gray-50">
      {/* Sidebar - conversation list */}
      <div className="hidden md:flex flex-col w-64 bg-white border-r border-gray-200">
        <div className="p-4 border-b">
          <div className="flex items-center gap-2 mb-3">
            <Bot className="w-5 h-5 text-blue-600" />
            <span className="font-semibold text-gray-800 text-sm">Asistente Dental Flow</span>
          </div>
          <Button size="sm" variant="outline" className="w-full gap-2" onClick={createNewConversation}>
            <Plus className="w-4 h-4" /> Nueva conversación
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {conversations.map(conv => (
            <button
              key={conv.id}
              onClick={() => loadConversation(conv.id)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                conversation?.id === conv.id
                  ? 'bg-blue-50 text-blue-700 font-medium'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {conv.metadata?.name || 'Conversación'}
            </button>
          ))}
        </div>
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="bg-white border-b px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center">
              <Bot className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="font-semibold text-gray-900 text-sm">Asistente Dental Flow</p>
              <p className="text-xs text-gray-500">Siempre disponible para ayudarte</p>
            </div>
          </div>
          <Button size="sm" variant="outline" className="gap-1 md:hidden" onClick={createNewConversation}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6 space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-12 space-y-4">
              <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto">
                <Sparkles className="w-8 h-8 text-blue-500" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-800">¿En qué puedo ayudarte?</h2>
                <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">
                  Pregúntame cualquier cosa sobre Dental Flow o pídeme que analice los datos de tu clínica.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 justify-center mt-4 max-w-lg mx-auto">
                {SUGGESTED_QUESTIONS.map(q => (
                  <button
                    key={q}
                    onClick={() => handleSend(q)}
                    className="px-3 py-2 rounded-full bg-white border border-gray-200 text-xs text-gray-700 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 transition-colors shadow-sm"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <MessageBubble key={i} message={msg} />
          ))}

          {isWaiting && (
            <div className="flex gap-3 justify-start">
              <div className="h-7 w-7 rounded-lg bg-slate-100 flex items-center justify-center mt-0.5">
                <div className="h-1.5 w-1.5 rounded-full bg-slate-400" />
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl px-4 py-3">
                <div className="flex gap-1 items-center">
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="bg-white border-t px-4 md:px-8 py-4">
          <div className="flex gap-3 max-w-3xl mx-auto">
            <Input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Escribe tu pregunta..."
              className="flex-1"
              disabled={sending}
            />
            <Button onClick={() => handleSend()} disabled={!input.trim() || sending} size="icon">
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
          <p className="text-center text-xs text-gray-400 mt-2">
            El asistente tiene acceso de lectura a los datos de tu clínica para darte sugerencias personalizadas.
          </p>
        </div>
      </div>
    </div>
  );
}