import React, { useState, useRef, useEffect } from 'react';
import { Send, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';

interface Message {
  id: string;
  text: string;
  isBot: boolean;
  timestamp: Date;
}

export const ChatInterface = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'Olá! 👋 Sou o assistente virtual do Ganha Tempo de Tarumã/SP. Como posso te ajudar hoje?',
      isBot: true,
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Mantém foco no textarea ao receber mensagens
  useEffect(() => {
    if (textareaRef.current) textareaRef.current.focus();
  }, [messages]);

  // 🔒 Bloqueia scroll do <body> em telas mobile enquanto o chat estiver montado
  useEffect(() => {
    const isMobile =
      typeof window !== 'undefined' &&
      window.matchMedia('(max-width: 767px)').matches;

    if (isMobile) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prevOverflow;
      };
    }
  }, []);

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputValue,
      isBot: false,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    const messageText = inputValue;
    setInputValue('');
    setIsTyping(true);

    try {
      const response = await fetch('https://hook.baofeng.com.br/webhook/ganhatempo-taruma', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageText,
          messageType: 'conversation',
          timestamp: new Date().toISOString(),
          user_id: 'user_' + Date.now(),
        }),
      });

      if (response.ok) {
        const data = await response.text();

        let responseText = 'Mensagem recebida com sucesso!';
        try {
          const jsonResponse = JSON.parse(data);
          let rawText = jsonResponse.messages || jsonResponse.output || jsonResponse.message || data;
          if (Array.isArray(rawText)) rawText = rawText.join('\n');
          responseText = String(rawText)
            .replace(/\*\*(.*?)\*\*/g, '$1')
            .replace(/\*(.*?)\*/g, '$1')
            .replace(/_{2,}(.*?)_{2,}/g, '$1')
            .trim();
        } catch {
          responseText = data;
        }

        const botResponse: Message = {
          id: (Date.now() + 1).toString(),
          text: responseText,
          isBot: true,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, botResponse]);
        setIsTyping(false);
      } else {
        throw new Error('Erro na comunicação');
      }
    } catch {
      const errorResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: 'Desculpe, estou com problemas de conexão. Tente novamente em alguns instantes.',
        isBot: true,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorResponse]);
      setIsTyping(false);
    }
  };

  return (
    // 📱 Mobile: usa 100dvh e bloqueia scroll da página; 🖥️ Desktop: mantém h-screen padrão
    <div className="flex flex-col h-[100dvh] max-h-[100dvh] overflow-hidden bg-background md:h-screen md:max-h-none md:overflow-visible">
      {/* Header fixo no topo */}
      <div className="flex items-center justify-between p-4 bg-primary text-primary-foreground shadow-md">
        <div className="flex items-center gap-3">
          <Avatar className="w-10 h-10">
            <AvatarImage src="/lovable-uploads/dc76459b-2ca9-4125-bf7f-fced7831231b.png" alt="Ganha Tempo Tarumã" />
            <AvatarFallback className="bg-primary-foreground text-primary font-bold">GT</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="font-semibold text-lg">Ganha Tempo</h1>
            <p className="text-sm opacity-90">Tarumã/SP • Online</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary-foreground/20">
            <MoreVertical className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* 📜 Mensagens — rolagem só aqui (não na página) */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4 pb-24">
        {messages.map((message) => (
          <div key={message.id} className={`flex ${message.isBot ? 'justify-start' : 'justify-end'}`}>
            <div
              className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                message.isBot
                  ? 'bg-card text-card-foreground border border-border'
                  : 'bg-primary text-primary-foreground'
              }`}
            >
              <p className="text-sm whitespace-pre-line">{message.text}</p>
              <span className="text-xs opacity-70 mt-1 block">
                {message.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-card text-card-foreground border border-border max-w-xs lg:max-w-md px-4 py-2 rounded-lg">
              <div className="flex items-center gap-1">
                <Skeleton className="w-2 h-2 rounded-full" />
                <Skeleton className="w-2 h-2 rounded-full" />
                <Skeleton className="w-2 h-2 rounded-full" />
                <span className="text-xs text-muted-foreground ml-2">Digitando...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ⌨️ Input “colado” no rodapé no mobile */}
      <div className="p-4 border-t border-border bg-card sticky bottom-0 md:static">
        <div className="flex items-end gap-2">
          <Textarea
            ref={textareaRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Digite sua mensagem..."
            className="flex-1 min-h-[40px] max-h-32 resize-none"
            rows={1}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = 'auto';
              target.style.height = target.scrollHeight + 'px';
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
          />
          <Button
            onClick={handleSendMessage}
            size="icon"
            className="bg-primary hover:bg-primary/90"
            disabled={isTyping || !inputValue.trim()}
            title="Enviar mensagem"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};
