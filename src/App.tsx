import React, { useState, useEffect, useRef } from 'react';
import {
  Plus,
  Send,
  Image as ImageIcon,
  Mic,
  Menu,
  X,
  MessageSquare,
  Trash2,
  Monitor,
  Sparkles,
  User,
  Palette,
  SlidersHorizontal,
  ImagePlus,
  Search,
  Terminal,
  Brush
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'framer-motion';
import { v4 as uuidv4 } from 'uuid';
import { cn } from './utils/cn';

// API anahtarlarini Vite ortam degiskenlerinden okuyoruz.
// .env dosyaniza VITE_GROQ_API_KEY ve VITE_TAVILY_API_KEY ekleyebilirsiniz.
const GROQ_API_KEY = (import.meta as any).env.VITE_GROQ_API_KEY as string | undefined;
const TAVILY_API_KEY = (import.meta as any).env.VITE_TAVILY_API_KEY as string | undefined;

// ------------ TIPLER ------------
type Role = 'user' | 'assistant';

type Message = {
  id: string;
  role: Role;
  content: string;
  type?: 'text' | 'image';
  imageUrl?: string;
  createdAt: number;
};

type ChatSession = {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
};

type ThemeId = 'indigo' | 'emerald' | 'violet' | 'amber' | 'rose' | 'cyan';

interface Personality {
  id: string;
  label: string;
  description: string;
  systemPrompt: string;
}

// ------------ SABITLER ------------

const PERSONALITIES: Personality[] = [
  {
    id: 'kuantist',
    label: 'Kuantist Klasik',
    description: 'Dengeli, analitik, sakin anlatım',
    systemPrompt:
      'Senin adın Kuantist V.2.0. Türkçe konuşan, analitik, sakin ve net açıklamalar yapan bir yapay zeka asistanısın. Gereksiz uzatma, ama önemli yerleri kaçırma. Gerektiğinde madde madde yaz.',
  },
  {
    id: 'developer',
    label: 'Geliştirici Modu',
    description: 'Teknik, örnek odaklı, doğrudan',
    systemPrompt:
      'Sen kıdemli bir yazılım geliştiricisin. Kod yazarken kısa, net ve doğrudan ol. Örnek kodlar ver, ama gereksiz açıklamalardan kaçın. Türkçe cevap ver, kodu mümkün olduğunca temiz tut.',
  },
  {
    id: 'writer',
    label: 'Yazar Modu',
    description: 'Yaratıcı, hikâye odaklı',
    systemPrompt:
      'Sen yaratıcı bir yazar asistansın. Metinleri akıcı, etkileyici ve hikâye tadında yeniden yazabilir, fikir üretebilirsin. Türkçe konuş ve dozunda süslü bir dil kullan.',
  },
  {
    id: 'friend',
    label: 'Sohbet Modu',
    description: 'Samimi, hafif esprili',
    systemPrompt:
      'Sen arkadaş canlısı, samimi bir sohbet asistanısın. Türkçe konuş, arada hafif espriler yap ama konuyu dağıtma. Kullanıcıyı yargılama, destekleyici ol.',
  },
];

const THEMES: Record<ThemeId, { primary: string; chip: string; softBg: string; gradient: string }> = {
  indigo: {
    primary: 'bg-indigo-600',
    chip: 'text-indigo-700 bg-indigo-50 border-indigo-100',
    softBg: 'from-slate-50 to-indigo-50',
    gradient: 'from-indigo-500/10 via-slate-50 to-sky-500/10',
  },
  emerald: {
    primary: 'bg-emerald-600',
    chip: 'text-emerald-700 bg-emerald-50 border-emerald-100',
    softBg: 'from-slate-50 to-emerald-50',
    gradient: 'from-emerald-500/10 via-slate-50 to-teal-500/10',
  },
  violet: {
    primary: 'bg-violet-600',
    chip: 'text-violet-700 bg-violet-50 border-violet-100',
    softBg: 'from-slate-50 to-violet-50',
    gradient: 'from-violet-500/10 via-slate-50 to-fuchsia-500/10',
  },
  amber: {
    primary: 'bg-amber-500',
    chip: 'text-amber-700 bg-amber-50 border-amber-100',
    softBg: 'from-slate-50 to-amber-50',
    gradient: 'from-amber-400/10 via-slate-50 to-orange-500/10',
  },
  rose: {
    primary: 'bg-rose-600',
    chip: 'text-rose-700 bg-rose-50 border-rose-100',
    softBg: 'from-slate-50 to-rose-50',
    gradient: 'from-rose-500/10 via-slate-50 to-red-500/10',
  },
  cyan: {
    primary: 'bg-cyan-600',
    chip: 'text-cyan-700 bg-cyan-50 border-cyan-100',
    softBg: 'from-slate-50 to-cyan-50',
    gradient: 'from-cyan-500/10 via-slate-50 to-sky-500/10',
  },
};

// Basit sistem log tipi
interface SystemLog {
  id: string;
  message: string;
  time: string;
}

// ------------ ANA BILESEN ------------

const App: React.FC = () => {
  // Durumlar
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    const saved = localStorage.getItem('kuantist_sessions_v2');
    if (saved) return JSON.parse(saved);
    return [
      {
        id: uuidv4(),
        title: 'Yeni Sohbet',
        messages: [],
        createdAt: Date.now(),
      },
    ];
  });

  const [activeId, setActiveId] = useState<string>(() => sessions[0]?.id);
  const [input, setInput] = useState('');
  const [theme, setTheme] = useState<ThemeId>('indigo');
  const [personality, setPersonality] = useState<Personality>(PERSONALITIES[0]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [imageMode, setImageMode] = useState(false);

  const activeSession = sessions.find((s) => s.id === activeId) ?? sessions[0];
  const chatScrollRef = useRef<HTMLDivElement | null>(null);

  // Persist sohbetler
  useEffect(() => {
    localStorage.setItem('kuantist_sessions_v2', JSON.stringify(sessions));
  }, [sessions]);

  // Otomatik scroll
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [activeSession?.messages.length, isProcessing]);

  const themeConf = THEMES[theme];

  // Yardimci: log ekle
  const addLog = (message: string) => {
    setLogs((prev) => [
      {
        id: uuidv4(),
        message,
        time: new Date().toLocaleTimeString('tr-TR', {
          hour: '2-digit',
          minute: '2-digit',
        }),
      },
      ...prev.slice(0, 40),
    ]);
  };

  // Yardimci: aktif sohbette mesaj guncelle
  const updateActiveMessages = (updater: (prev: Message[]) => Message[]) => {
    setSessions((prev) =>
      prev.map((s) => {
        if (s.id !== activeId) return s;
        const newMessages = updater(s.messages);
        const newTitle =
          s.messages.length === 0 && newMessages[0]
            ? newMessages[0].content.slice(0, 32) + (newMessages[0].content.length > 32 ? '…' : '')
            : s.title;
        return { ...s, messages: newMessages, title: newTitle };
      }),
    );
  };

  // Yeni sohbet
  const handleNewChat = () => {
    const next: ChatSession = {
      id: uuidv4(),
      title: 'Yeni Sohbet',
      messages: [],
      createdAt: Date.now(),
    };
    setSessions((prev) => [next, ...prev]);
    setActiveId(next.id);
    if (window.innerWidth < 768) setIsSidebarOpen(false);
  };

  // Sohbet sil
  const handleDeleteChat = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSessions((prev) => prev.filter((s) => s.id !== id));
    if (id === activeId) {
      const remaining = sessions.filter((s) => s.id !== id);
      if (remaining.length === 0) {
        const fresh: ChatSession = {
          id: uuidv4(),
          title: 'Yeni Sohbet',
          messages: [],
          createdAt: Date.now(),
        };
        setSessions([fresh]);
        setActiveId(fresh.id);
      } else {
        setActiveId(remaining[0].id);
      }
    }
  };

  // Ana istek: mesaj gonder
  const sendMessage = async () => {
    if (!input.trim() || !activeSession) return;

    const content = input.trim();
    setInput('');

    const userMsg: Message = {
      id: uuidv4(),
      role: 'user',
      content,
      createdAt: Date.now(),
      type: 'text',
    };
    updateActiveMessages((prev) => [...prev, userMsg]);

    // Görsel modu aktifse direkt görsel isteği olarak yorumla
    const wantsImage =
      imageMode ||
      content.toLowerCase().includes('resim çiz') ||
      content.toLowerCase().includes('görsel oluştur') ||
      content.toLowerCase().startsWith('/img');

    setIsProcessing(true);

    try {
      if (wantsImage) {
        addLog('🎨 Görsel oluşturma isteği alındı');
        const prompt = content
          .replace(/^\/img/i, '')
          .replace(/resim çiz/gi, '')
          .replace(/görsel oluştur/gi, '')
          .trim() || 'detaylı, sinematik bir illüstrasyon';

        // Pollinations ile görsel
        const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(
          prompt,
        )}?width=1024&height=1024&nologo=true`;

        // Küçük bir bekleme efekti
        await new Promise((r) => setTimeout(r, 1600));

        const aiMsg: Message = {
          id: uuidv4(),
          role: 'assistant',
          type: 'image',
          content: `İstediğin tarza uygun bir görsel oluşturdum. İstersen komutu biraz daha detaylandırarak tekrar deneyebilirsin.`,
          imageUrl,
          createdAt: Date.now(),
        };
        updateActiveMessages((prev) => [...prev, aiMsg]);
        addLog('✅ Görsel hazır');
        return;
      }

      // İnternet araması gerektiriyor mu?
      const needsSearch = content.toLowerCase().startsWith('ara ') || /\b202[4-9]|202\d|fiyat|güncel|hava durumu|son durum\b/iu.test(content);
      let searchContext = '';

      if (needsSearch && TAVILY_API_KEY) {
        addLog('🔍 Tavily ile arama yapılıyor…');
        try {
          const tavilyRes = await fetch('https://api.tavily.com/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              api_key: TAVILY_API_KEY,
              query: content,
              search_depth: 'advanced',
              max_results: 4,
            }),
          });

          const data = await tavilyRes.json();
          if (Array.isArray(data.results) && data.results.length) {
            searchContext =
              '\n\n[İNTERNET VERİSİ]\n' +
              data.results
                .map((r: any, i: number) => `(${i + 1}) ${r.title}\n${r.content}`)
                .join('\n---\n');
            addLog(`✅ Tavily ${data.results.length} sonuç döndürdü`);
          }
        } catch (err) {
          addLog('⚠️ Tavily isteği başarısız oldu');
        }
      }

      if (!GROQ_API_KEY) {
        addLog('❗ GROQ API anahtarı ortamda bulunamadı');
        const fallback: Message = {
          id: uuidv4(),
          role: 'assistant',
          content:
            'Sunucu tarafında Groq API anahtarı tanımlı değil gibi görünüyor. Lütfen geliştirici ortamında VITE_GROQ_API_KEY değişkenini ayarla.',
          createdAt: Date.now(),
        };
        updateActiveMessages((prev) => [...prev, fallback]);
        return;
      }

      addLog('🤖 Groq ile yanıt hazırlanıyor…');

      const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          temperature: 0.4,
          messages: [
            { role: 'system', content: personality.systemPrompt + searchContext },
            ...activeSession.messages.map((m) => ({ role: m.role, content: m.content })),
            { role: 'user', content },
          ],
        }),
      });

      const groqJson = await groqRes.json();
      const answer = groqJson.choices?.[0]?.message?.content || 'Bir şeyler ters gitti, yanıt oluşturulamadı.';

      const aiMsg: Message = {
        id: uuidv4(),
        role: 'assistant',
        content: answer,
        createdAt: Date.now(),
        type: 'text',
      };
      updateActiveMessages((prev) => [...prev, aiMsg]);
      addLog('✅ Yanıt gönderildi');
    } catch (err) {
      console.error(err);
      addLog('❌ Beklenmeyen bir hata oluştu');
      const fail: Message = {
        id: uuidv4(),
        role: 'assistant',
        content: 'Bir hata oluştu, kısa bir süre sonra tekrar dener misin?',
        createdAt: Date.now(),
      };
      updateActiveMessages((prev) => [...prev, fail]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isProcessing) sendMessage();
    }
  };

  const isEmpty = !activeSession?.messages.length;

  // ------------ ARAYUZ ------------

  return (
    <div
      className={cn(
        'h-screen w-full flex overflow-hidden bg-gradient-to-br text-slate-900',
        themeConf.gradient,
      )}
    >
      {/* SOL MENU */}
      <AnimatePresence initial={false}>
        {isSidebarOpen && (
          <motion.aside
            initial={{ x: -40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -40, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 24 }}
            className="relative z-20 flex h-full w-72 flex-col border-r border-slate-200/70 bg-white/90 backdrop-blur-xl shadow-xl"
          >
            {/* Logo alanı */}
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-2xl text-white shadow-md',
                    themeConf.primary,
                  )}
                >
                  <Monitor size={18} />
                </div>
                <div>
                  <div className="text-sm font-semibold leading-tight">Kuantist Panel</div>
                  <div className="text-[11px] text-slate-400">Akıllı sohbet & görsel stüdyo</div>
                </div>
              </div>

              <button
                onClick={() => setIsSidebarOpen(false)}
                className="inline-flex rounded-xl p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 md:hidden"
              >
                <X size={18} />
              </button>
            </div>

            {/* Yeni sohbet butonu */}
            <div className="border-b border-slate-100 px-4 py-3">
              <button
                onClick={handleNewChat}
                className={cn(
                  'flex w-full items-center justify-center gap-2 rounded-2xl px-3 py-2.5 text-sm font-medium text-white shadow-md transition',
                  themeConf.primary,
                  'hover:opacity-90',
                )}
              >
                <Plus size={16} />
                Yeni sohbet
              </button>
            </div>

            {/* Sohbet listesi */}
            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1 scrollbar-thin">
              <div className="px-1 pb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                Sohbetler
              </div>

              {sessions.map((s) => {
                const isActive = s.id === activeId;
                return (
                  <button
                    key={s.id}
                    onClick={() => {
                      setActiveId(s.id);
                      if (window.innerWidth < 768) setIsSidebarOpen(false);
                    }}
                    className={cn(
                      'group flex w-full items-center justify-between rounded-2xl px-3 py-2 text-left text-xs transition',
                      isActive
                        ? 'bg-slate-900 text-slate-50 shadow-sm'
                        : 'text-slate-600 hover:bg-slate-100',
                    )}
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      <div
                        className={cn(
                          'flex h-7 w-7 items-center justify-center rounded-xl text-[11px]',
                          isActive ? 'bg-slate-800 text-slate-50' : 'bg-slate-100 text-slate-500',
                        )}
                      >
                        <MessageSquare size={14} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[12px] font-medium">{s.title}</div>
                        <div className="truncate text-[10px] text-slate-400">
                          {new Date(s.createdAt).toLocaleDateString('tr-TR', {
                            day: '2-digit',
                            month: '2-digit',
                          })}
                        </div>
                      </div>
                    </div>

                    {sessions.length > 1 && (
                      <button
                        onClick={(e) => handleDeleteChat(e, s.id)}
                        className="ml-1 hidden rounded-xl p-1 text-slate-400 transition hover:bg-slate-800/10 hover:text-red-500 group-hover:inline-flex"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Tema ve kişilik seçimi */}
            <div className="border-t border-slate-100 bg-slate-50/60 px-4 py-3 space-y-3">
              {/* Tema */}
              <div>
                <div className="mb-1 flex items-center justify-between text-[11px] text-slate-500">
                  <span className="inline-flex items-center gap-1 font-semibold">
                    <Palette size={11} /> Tema
                  </span>
                </div>
                <div className="flex gap-2">
                  {(Object.keys(THEMES) as ThemeId[]).map((t) => (
                    <button
                      key={t}
                      onClick={() => setTheme(t)}
                      className={cn(
                        'h-6 w-6 rounded-full border-2 transition hover:scale-110',
                        THEMES[t].primary,
                        theme === t ? 'border-slate-900' : 'border-white/80',
                      )}
                    />
                  ))}
                </div>
              </div>

              {/* Kişilik */}
              <button
                onClick={() => setIsSettingsOpen(true)}
                className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-3 py-2 text-left text-xs text-slate-600 shadow-sm transition hover:border-slate-300"
              >
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-slate-900 text-slate-50 text-[11px]">
                    <User size={14} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[11px] font-semibold">Kişilik</span>
                    <span className="truncate text-[10px] text-slate-400">{personality.label}</span>
                  </div>
                </div>
                <SlidersHorizontal size={14} className="text-slate-400" />
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* ANA ALAN */}
      <div className="relative flex min-w-0 flex-1 flex-col">
        {/* Üst bar */}
        <header className="flex h-14 items-center justify-between border-b border-slate-200/70 bg-white/80 px-3 shadow-sm backdrop-blur-md md:px-6">
          <div className="flex items-center gap-2">
            {!isSidebarOpen && (
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="mr-1 inline-flex rounded-xl p-1.5 text-slate-500 transition hover:bg-slate-100 md:hidden"
              >
                <Menu size={18} />
              </button>
            )}

            <div className="flex flex-col">
              <span className="text-[13px] font-semibold text-slate-800">
                {activeSession?.title || 'Sohbet'}
              </span>
              <span className="flex items-center gap-1 text-[11px] text-slate-400">
                <span
                  className={cn(
                    'h-1.5 w-1.5 rounded-full',
                    isProcessing ? 'bg-amber-400 animate-pulse' : 'bg-emerald-500',
                  )}
                />
                {isProcessing ? 'Yanıt hazırlanıyor…' : 'Hazır'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setImageMode((m) => !m)}
              className={cn(
                'inline-flex items-center gap-1 rounded-2xl border px-2.5 py-1.5 text-[11px] font-medium transition',
                imageMode
                  ? 'border-slate-800 bg-slate-900 text-slate-50'
                  : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300',
              )}
            >
              <Brush size={13} />
              Görsel modu
            </button>

            <button
              onClick={() => setIsSettingsOpen(true)}
              className="inline-flex items-center gap-1 rounded-2xl border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-medium text-slate-600 shadow-sm transition hover:border-slate-300"
            >
              <Sparkles size={13} />
              Panel
            </button>
          </div>
        </header>

        {/* İçerik */}
        <div className="flex min-h-0 flex-1 flex-col md:flex-row">
          {/* Sohbet paneli */}
          <section className="flex min-w-0 flex-1 flex-col border-slate-100/80 bg-gradient-to-b from-white/70 to-slate-50/80">
            {/* Hoşgeldin / Mesaj listesi */}
            <div
              ref={chatScrollRef}
              className="flex-1 space-y-4 overflow-y-auto px-3 py-4 scrollbar-thin md:px-8 md:py-6"
            >
              {isEmpty ? (
                <div className="flex h-full flex-col items-center justify-center gap-6 text-center text-slate-500">
                  <div
                    className={cn(
                      'rounded-3xl border px-6 py-5 shadow-sm',
                      themeConf.chip,
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-900 text-slate-50">
                        <Monitor size={20} />
                      </div>
                      <div className="text-left">
                        <div className="text-sm font-semibold text-slate-800">Kuantist hazır</div>
                        <div className="text-xs text-slate-500">
                          Sohbet başlat, kod sor, metin yazdır, görsel iste…
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid w-full max-w-2xl gap-3 md:grid-cols-2">
                    {[
                      {
                        icon: <ImagePlus size={16} />,
                        text: 'Geleceğin şehri stilinde bir görsel oluştur',
                      },
                      {
                        icon: <Search size={16} />,
                        text: 'Ara: Bugün döviz piyasasında son durum ne?',
                      },
                      {
                        icon: <User size={16} />,
                        text: 'Kısa ve profesyonel bir e-posta taslağı yaz',
                      },
                      {
                        icon: <Sparkles size={16} />,
                        text: 'Beni bugün motive edecek 3 cümle yazar mısın?',
                      },
                    ].map((s, i) => (
                      <button
                        key={i}
                        onClick={() => setInput(s.text)}
                        className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-3 text-left text-[12px] text-slate-600 shadow-sm transition hover:border-slate-300 hover:shadow-md"
                      >
                        <div className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-2xl bg-slate-900 text-slate-50">
                          {s.icon}
                        </div>
                        <span>{s.text}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="mx-auto flex w-full max-w-3xl flex-col gap-3">
                  {activeSession.messages.map((m) => (
                    <motion.div
                      key={m.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.18 }}
                      className={cn('flex w-full gap-2 md:gap-3', m.role === 'user' && 'flex-row-reverse')}
                    >
                      <div
                        className={cn(
                          'mt-1 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-2xl text-[12px] shadow-sm',
                          m.role === 'user' ? 'bg-slate-900 text-slate-50' : themeConf.primary + ' text-white',
                        )}
                      >
                        {m.role === 'user' ? <User size={14} /> : <Monitor size={14} />}
                      </div>

                      <div
                        className={cn(
                          'max-w-[80%] md:max-w-[75%]',
                          m.role === 'user' ? 'items-end text-right' : 'items-start text-left',
                          'flex flex-col gap-1',
                        )}
                      >
                        <div
                          className={cn(
                            'rounded-3xl px-3 py-2.5 text-[13px] leading-relaxed shadow-sm md:px-4 md:py-3 md:text-sm',
                            m.role === 'user'
                              ? 'bg-slate-900 text-slate-50'
                              : 'border border-slate-200 bg-white text-slate-800',
                          )}
                        >
                          {m.type === 'image' && m.imageUrl ? (
                            <div className="space-y-2">
                              <p className="text-xs md:text-[13px] text-slate-200 md:text-slate-800">
                                {m.content}
                              </p>
                              <div className="overflow-hidden rounded-2xl border border-slate-800/40 md:border-slate-200">
                                <img
                                  src={m.imageUrl}
                                  alt="Üretilen görsel"
                                  className="h-auto max-h-[360px] w-full object-cover"
                                  loading="lazy"
                                />
                              </div>
                            </div>
                          ) : (
                            <div className="prose prose-sm max-w-none prose-p:my-1 prose-headings:my-2 prose-pre:bg-slate-900/90 prose-pre:p-3 prose-pre:text-xs prose-pre:text-slate-50">
                              <ReactMarkdown>{m.content}</ReactMarkdown>
                            </div>
                          )}
                        </div>
                        <span className="px-1 text-[10px] text-slate-400">
                          {new Date(m.createdAt).toLocaleTimeString('tr-TR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </motion.div>
                  ))}

                  {isProcessing && (
                    <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-400">
                      <div className="h-6 w-6 rounded-full border border-slate-300 p-1">
                        <div className="h-full w-full animate-spin rounded-full border-2 border-slate-400 border-t-transparent" />
                      </div>
                      Kuantist düşünüyor…
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Girdi alanı */}
            <div className="border-t border-slate-200/70 bg-white/90 px-3 py-3 backdrop-blur-md md:px-8 md:py-4">
              <div className="mx-auto flex w-full max-w-3xl items-end gap-2 rounded-3xl border border-slate-200 bg-slate-50/80 px-2 py-1 shadow-inner">
                <button
                  className="inline-flex h-9 w-9 items-center justify-center rounded-2xl text-slate-400 transition hover:bg-slate-200/80 hover:text-slate-700"
                  title="Resim dosyası ekle (demosal)"
                >
                  <ImageIcon size={18} />
                </button>

                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  rows={1}
                  placeholder={
                    imageMode
                      ? 'Nasıl bir görsel istiyorsun? (Örn: Gece vakti siberpunk İstanbul manzarası)'
                      : 'Soru, komut veya metnini yaz… Enter ile gönder, Shift+Enter ile satır ekle.'
                  }
                  className="max-h-32 min-h-[44px] flex-1 resize-none border-0 bg-transparent px-1 py-2 text-[13px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-0 md:text-sm"
                />

                <button
                  className="inline-flex h-9 w-9 items-center justify-center rounded-2xl text-slate-400 transition hover:bg-slate-200/80 hover:text-slate-700"
                  title="Sesli giriş (arayüzsel)"
                >
                  <Mic size={18} />
                </button>

                <button
                  onClick={sendMessage}
                  disabled={!input.trim() || isProcessing}
                  className={cn(
                    'inline-flex h-9 w-9 items-center justify-center rounded-2xl text-white shadow-md transition',
                    themeConf.primary,
                    !input.trim() || isProcessing ? 'opacity-40' : 'hover:scale-105 hover:shadow-lg',
                  )}
                >
                  <Send size={17} />
                </button>
              </div>
              <div className="mx-auto mt-1 flex max-w-3xl items-center justify-between text-[10px] text-slate-400">
                <span>
                  Kuantist; Groq, Tavily ve dahili görsel motoru ile çalışır. Yanıtlar hata içerebilir.
                </span>
              </div>
            </div>
          </section>

          {/* Sağ panel – kişilik & loglar */}
          <aside className="hidden w-72 flex-col border-l border-slate-200/70 bg-white/80 px-4 py-4 md:flex">
            {/* Kişilik kartı */}
            <div className="mb-4 rounded-3xl border border-slate-200 bg-slate-50/80 p-3 shadow-sm">
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-2xl bg-slate-900 text-slate-50">
                    <User size={16} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[12px] font-semibold text-slate-800">Kişilik</span>
                    <span className="text-[11px] text-slate-500">{personality.label}</span>
                  </div>
                </div>
                <button
                  onClick={() => setIsSettingsOpen(true)}
                  className="inline-flex rounded-xl border border-slate-200 bg-white px-2 py-1 text-[10px] text-slate-500 hover:border-slate-300"
                >
                  Değiştir
                </button>
              </div>
              <p className="text-[11px] leading-snug text-slate-500">{personality.description}</p>
            </div>

            {/* Hızlı aksiyonlar */}
            <div className="mb-4 space-y-2 text-[11px]">
              <div className="text-[11px] font-semibold text-slate-500">Hızlı ayarlar</div>

              <button
                onClick={() => setImageMode((m) => !m)}
                className={cn(
                  'flex w-full items-center justify-between rounded-2xl border px-3 py-2 text-left transition',
                  imageMode
                    ? 'border-slate-800 bg-slate-900 text-slate-50'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300',
                )}
              >
                <span className="inline-flex items-center gap-2">
                  <ImagePlus size={14} /> Görsel modu
                </span>
                <span className="text-[10px] text-slate-400">{imageMode ? 'Aktif' : 'Pasif'}</span>
              </button>

              <button
                onClick={handleNewChat}
                className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-3 py-2 text-left text-slate-600 transition hover:border-slate-300"
              >
                <span className="inline-flex items-center gap-2">
                  <MessageSquare size={14} /> Yeni konu başlat
                </span>
              </button>
            </div>

            {/* Sistem logları */}
            <div className="flex min-h-0 flex-1 flex-col rounded-3xl border border-slate-200 bg-slate-50/80 p-3 text-[11px]">
              <div className="mb-2 flex items-center justify-between text-slate-500">
                <span className="inline-flex items-center gap-1 font-semibold">
                  <Terminal size={12} /> Sistem akışı
                </span>
                <span className="text-[10px] text-slate-400">Son {logs.length || 0} olay</span>
              </div>
              <div className="flex-1 overflow-y-auto rounded-2xl bg-slate-900 p-2 text-[10px] text-emerald-300 scrollbar-thin">
                {logs.length === 0 ? (
                  <div className="text-slate-500">Henüz log yok. İlk isteğini gönder.</div>
                ) : (
                  logs.map((l) => (
                    <div
                      key={l.id}
                      className="mb-1.5 border-b border-slate-800 pb-1 last:border-0 last:pb-0"
                    >
                      <span className="text-slate-500">[{l.time}] </span>
                      <span>{l.message}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* Kişilik / panel ayarları modalı */}
      <AnimatePresence>
        {isSettingsOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-30 flex items-center justify-center bg-slate-900/30 backdrop-blur-sm"
            onClick={() => setIsSettingsOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 22 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white shadow-2xl"
            >
              <div
                className={cn(
                  'flex items-center justify-between border-b border-slate-100 px-5 py-3',
                  'bg-gradient-to-r',
                  themeConf.softBg,
                )}
              >
                <div>
                  <div className="text-sm font-semibold text-slate-900">Panel ayarları</div>
                  <div className="text-[11px] text-slate-500">Kişilik ve görünüm tercihler</div>
                </div>
                <button
                  onClick={() => setIsSettingsOpen(false)}
                  className="inline-flex rounded-xl p-1.5 text-slate-500 transition hover:bg-slate-100"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="max-h-[60vh] space-y-5 overflow-y-auto px-5 py-4 scrollbar-thin">
                {/* Kişilik seçimi */}
                <div>
                  <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold text-slate-600">
                    <User size={13} /> Aktif kişilik
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {PERSONALITIES.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => setPersonality(p)}
                        className={cn(
                          'flex flex-col gap-0.5 rounded-2xl border px-3 py-2 text-left text-[11px] transition',
                          personality.id === p.id
                            ? 'border-slate-900 bg-slate-900 text-slate-50 shadow-sm'
                            : 'border-slate-200 bg-slate-50 hover:border-slate-300',
                        )}
                      >
                        <span className="text-[11px] font-semibold">{p.label}</span>
                        <span
                          className={cn(
                            'text-[10px]',
                            personality.id === p.id ? 'text-slate-200' : 'text-slate-500',
                          )}
                        >
                          {p.description}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tema önizleme */}
                <div>
                  <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold text-slate-600">
                    <Palette size={13} /> Renk teması
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-[11px]">
                    {(Object.keys(THEMES) as ThemeId[]).map((t) => (
                      <button
                        key={t}
                        onClick={() => setTheme(t)}
                        className={cn(
                          'flex items-center gap-2 rounded-2xl border px-2 py-1.5 text-left transition',
                          theme === t
                            ? 'border-slate-900 bg-slate-900 text-slate-50'
                            : 'border-slate-200 bg-slate-50 hover:border-slate-300',
                        )}
                      >
                        <span
                          className={cn('h-4 w-4 rounded-full border-2 border-white shadow', THEMES[t].primary)}
                        />
                        <span className="capitalize">{t}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Bilgi notu */}
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-[11px] text-slate-500">
                  <p>
                    API anahtarları bu arayüzde gösterilmez ve buradan düzenlenmez. Güvenlik için yalnızca
                    sunucu / geliştirme ortamında VITE_GROQ_API_KEY ve VITE_TAVILY_API_KEY şeklinde tanımlanmalıdır.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end border-t border-slate-100 bg-slate-50 px-5 py-3 text-[11px] text-slate-500">
                <span>Değişiklikler anında uygulanır.</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default App;
