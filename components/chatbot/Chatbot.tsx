'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/context/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  MessageCircle, X, Send, Loader2, Bot, User, 
  Sparkles, Zap, BookOpen, HelpCircle, Globe, ChevronDown,
  Minimize2
} from 'lucide-react';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

interface Language {
  code: string;
  name: string;
  flag: string;
}

const languages: Language[] = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'ha', name: 'Hausa', flag: '🇳🇬' },
  { code: 'ar', name: 'العربية', flag: '🇸🇦' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' }
];

export default function Chatbot() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState<string>('en');
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const currentLang = languages.find(l => l.code === currentLanguage) || languages[0];

  // Check if mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Initialize greeting message
  useEffect(() => {
    if (messages.length === 0 && user) {
      const greetings: Record<string, string> = {
        en: `Hi ${user.name?.split(' ')[0] || 'there'}! 👋 I'm Shara AI, your learning assistant. Ask me anything about climate change, courses, or how to get certificates!`,
        ha: `Sannu ${user.name?.split(' ')[0] || 'dai'}! 👋 Ni Shara AI, mai taimakon karatun ku. Tambaye ni komai game da canjin yanayi, darussa, ko yadda ake samun takaddun shaida!`,
        ar: `مرحبًا ${user.name?.split(' ')[0] || 'هناك'}! 👋 أنا Shara AI، مساعد التعلم الخاص بك. اسألني أي شيء عن تغير المناخ أو الدورات أو كيفية الحصول على الشهادات!`,
        fr: `Salut ${user.name?.split(' ')[0] || 'vous'}! 👋 Je suis Shara AI, votre assistant d'apprentissage. Demandez-moi tout sur le changement climatique, les cours ou comment obtenir des certificats!`
      };
      setMessages([{
        id: '1',
        text: greetings[currentLanguage] || greetings.en,
        sender: 'bot',
        timestamp: new Date()
      }]);
    }
  }, [currentLanguage, user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isOpen && !isMinimized) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, isMinimized]);

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputValue,
      sender: 'user',
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);
    const userInput = inputValue;
    setInputValue('');
    setIsTyping(true);

    // Check for language switch
    let newLanguage = currentLanguage;
    const lowerInput = userInput.toLowerCase();
    if (lowerInput.includes('switch to hausa') || lowerInput === 'hausa') newLanguage = 'ha';
    else if (lowerInput.includes('switch to english') || lowerInput === 'english') newLanguage = 'en';
    else if (lowerInput.includes('switch to arabic') || lowerInput === 'arabic') newLanguage = 'ar';
    else if (lowerInput.includes('switch to french') || lowerInput === 'french') newLanguage = 'fr';
    
    if (newLanguage !== currentLanguage) {
      setCurrentLanguage(newLanguage);
    }

    try {
      const response = await fetch('/api/chat-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userInput,
          language: newLanguage,
          userName: user?.name?.split(' ')[0] || 'Student'
        }),
      });

      const data = await response.json();
      const botResponse = data.response || "I'm here to help! What would you like to know?";

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: botResponse,
        sender: 'bot',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: "Sorry, I'm having trouble connecting. Please try again! 🌟",
        sender: 'bot',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const changeLanguage = (langCode: string) => {
    setCurrentLanguage(langCode);
    setShowLanguageMenu(false);
  };

  // Chat button (when closed)
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 z-50 bg-green-600 hover:bg-green-700 text-white rounded-full p-3 md:p-4 shadow-lg transition-all duration-300 hover:scale-110"
      >
        <MessageCircle className="h-5 w-5 md:h-6 md:w-6" />
      </button>
    );
  }

  // Minimized view
  if (isMinimized) {
    return (
      <div 
        className="fixed z-50 bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl shadow-2xl cursor-pointer flex items-center justify-between p-3"
        style={{ bottom: '20px', right: '20px', width: '320px' }}
        onClick={() => setIsMinimized(false)}
      >
        <div className="flex items-center gap-2 text-white">
          <Bot className="h-5 w-5" />
          <span className="font-medium text-sm">AI Assistant</span>
          <span className="text-xs opacity-80">{currentLang.flag}</span>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}
          className="text-white hover:bg-white/20 rounded-lg p-1"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  // Full chat window
  return (
    <div 
      className="fixed z-50 bg-white dark:bg-gray-800 shadow-2xl flex flex-col overflow-hidden border border-gray-200 dark:border-gray-700"
      style={{
        width: isMobile ? '100vw' : '400px',
        height: isMobile ? '100vh' : '600px',
        bottom: isMobile ? 0 : '20px',
        right: isMobile ? 0 : '20px',
        borderRadius: isMobile ? 0 : '20px'
      }}
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-4 text-white">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            <div>
              <h3 className="font-semibold">AI Assistant</h3>
              <p className="text-xs opacity-90">Powered by Groq AI</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Language Selector */}
            <div className="relative">
              <button
                onClick={() => setShowLanguageMenu(!showLanguageMenu)}
                className="hover:bg-white/20 rounded-lg p-1.5 flex items-center gap-1"
              >
                <Globe className="h-4 w-4" />
                <ChevronDown className={`h-3 w-3 transition-transform ${showLanguageMenu ? 'rotate-180' : ''}`} />
              </button>
              {showLanguageMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowLanguageMenu(false)} />
                  <div className="absolute top-full right-0 mt-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden z-50 min-w-[160px]">
                    {languages.map((lang) => (
                      <button
                        key={lang.code}
                        onClick={() => changeLanguage(lang.code)}
                        className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 transition-colors ${
                          currentLanguage === lang.code
                            ? 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-400 font-medium'
                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                      >
                        <span className="text-lg">{lang.flag}</span>
                        <span>{lang.name}</span>
                        {currentLanguage === lang.code && (
                          <span className="ml-auto text-green-600 dark:text-green-400">✓</span>
                        )}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
            <button onClick={() => setIsMinimized(true)} className="hover:bg-white/20 rounded-lg p-1.5">
              <Minimize2 className="h-4 w-4" />
            </button>
            <button onClick={() => setIsOpen(false)} className="hover:bg-white/20 rounded-lg p-1.5">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50 dark:bg-gray-900">
        {messages.map((message) => (
          <div key={message.id} className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-lg p-3 ${
              message.sender === 'user'
                ? 'bg-green-600 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 shadow-sm border border-gray-200 dark:border-gray-700'
            }`}>
              <div className="flex items-center gap-2 mb-1">
                {message.sender === 'bot' ? <Bot className="h-3 w-3 text-green-600" /> : <User className="h-3 w-3 opacity-70" />}
                <span className="text-xs opacity-70">{message.sender === 'bot' ? 'AI' : 'You'}</span>
              </div>
              <p className="text-sm whitespace-pre-wrap">{message.text}</p>
              <p className="text-xs opacity-50 mt-1">
                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Questions */}
      {messages.length < 2 && !isMobile && (
        <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <p className="text-xs text-gray-500 mb-2">Quick questions:</p>
          <div className="flex gap-2 flex-wrap">
            {[
              { icon: BookOpen, text: "Tell me about courses" },
              { icon: Sparkles, text: "How to get certificate?" },
              { icon: Zap, text: "Climate change causes" },
              { icon: HelpCircle, text: "Payment methods" }
            ].map((q, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setInputValue(q.text);
                  setTimeout(() => handleSendMessage(), 100);
                }}
                className="text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center gap-1 text-gray-700 dark:text-gray-300"
              >
                <q.icon className="h-3 w-3" />
                {q.text}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask me anything..."
            className="flex-1 text-gray-900 dark:text-gray-100"
            disabled={isTyping}
          />
          <Button onClick={handleSendMessage} disabled={isTyping || !inputValue.trim()} className="bg-green-600 hover:bg-green-700">
            {isTyping ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}