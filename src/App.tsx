import React, { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  Brush,
  CheckCircle2,
  Code2,
  Compass,
  CreditCard,
  Download,
  ExternalLink,
  FileText,
  Globe2,
  GraduationCap,
  Image as ImageIcon,
  ImagePlus,
  Info,
  Layers3,
  Mail,
  Menu,
  MessageSquare,
  Mic,
  Palette,
  PenLine,
  Plus,
  Search,
  Send,
  ServerCog,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Terminal,
  Trash2,
  User,
  Wand2,
  X,
  type LucideIcon,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { AnimatePresence, motion } from 'framer-motion';
import { v4 as uuidv4 } from 'uuid';
import Bytez from 'bytez.js';
import { cn } from './utils/cn';

const BYTEZ_API_KEY = (import.meta as any).env.VITE_BYTEZ_API_KEY as string | undefined;
const bytez = BYTEZ_API_KEY ? new Bytez(BYTEZ_API_KEY) : null;
const bytezModel = bytez ? bytez.model('openai/gpt-oss-120b') : null;

type Role = 'user' | 'assistant';
type AssistantEngine = 'openai' | 'pollinations' | 'bytez' | 'offline';
type ThemeId = 'cyan' | 'emerald' | 'violet' | 'amber';
type AppearanceMode = 'midnight' | 'nebula' | 'focus';
type ImageStyleId = 'cinematic' | 'product' | 'logo' | 'photoreal' | 'anime' | 'threeD' | 'interface';
type ImageAspectId = 'square' | 'portrait' | 'landscape';
type ImageQualityId = 'standard' | 'high' | 'ultra';
type StudioView = 'home' | 'chat' | 'image' | 'prompts' | 'pricing' | 'about' | 'feedback';

type WebSource = {
  title: string;
  url: string;
  snippet?: string;
};

type Message = {
  id: string;
  role: Role;
  content: string;
  type?: 'text' | 'image';
  imageUrl?: string;
  imagePrompt?: string;
  imageProvider?: string;
  sources?: WebSource[];
  model?: string;
  usedWeb?: boolean;
  createdAt: number;
};

type ChatSession = {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
};

type Personality = {
  id: string;
  label: string;
  description: string;
  systemPrompt: string;
};

type PromptItem = {
  icon: LucideIcon;
  title: string;
  text: string;
  image?: boolean;
};

const STORAGE_KEY = 'kuvin_sessions_v1';

const PERSONALITIES: Personality[] = [
  {
    id: 'kuvin',
    label: 'Kuvin Core',
    description: 'Dengeli, analitik, sakin anlatım',
    systemPrompt:
      'Senin adın Kuvin AI. Think Beyond sloganıyla çalışan, Türkçe konuşan, analitik, net ve yaratıcı bir yapay zeka asistanısın. Kullanıcıya sohbet, görsel üretim, kod, ödev ve fikir üretiminde uygulanabilir destek ver.',
  },
  {
    id: 'developer',
    label: 'Kuvin Code',
    description: 'Teknik, örnek odaklı, doğrudan',
    systemPrompt:
      'Sen kıdemli bir yazılım geliştiricisin. Kod yazarken kısa, net ve doğrudan ol. Örnek kodlar ver, gereksiz açıklamalardan kaçın. Türkçe cevap ver.',
  },
  {
    id: 'writer',
    label: 'Kuvin Writer',
    description: 'Yaratıcı, akıcı, marka odaklı',
    systemPrompt:
      'Sen yaratıcı bir yazı asistanısın. Metinleri akıcı, etkileyici ve hikaye tadında yeniden yazabilir, fikir üretebilirsin. Türkçe konuş ve dozunda güçlü bir dil kullan.',
  },
  {
    id: 'friend',
    label: 'Kuvin Chat',
    description: 'Samimi, destekleyici, doğal',
    systemPrompt:
      'Sen arkadaş canlısı, samimi bir sohbet asistanısın. Türkçe konuş, konuyu dağıtma, destekleyici ve pratik kal.',
  },
];

const THEMES: Record<ThemeId, { label: string; button: string; dot: string; chip: string; glow: string }> = {
  cyan: {
    label: 'Cyan',
    button: 'bg-cyan-500 text-slate-950 hover:bg-cyan-300',
    dot: 'bg-cyan-400',
    chip: 'border-cyan-400/30 bg-cyan-400/10 text-cyan-100',
    glow: 'shadow-[0_18px_60px_rgba(34,211,238,.18)]',
  },
  emerald: {
    label: 'Emerald',
    button: 'bg-emerald-400 text-slate-950 hover:bg-emerald-300',
    dot: 'bg-emerald-400',
    chip: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-100',
    glow: 'shadow-[0_18px_60px_rgba(52,211,153,.16)]',
  },
  violet: {
    label: 'Violet',
    button: 'bg-violet-400 text-slate-950 hover:bg-violet-300',
    dot: 'bg-violet-400',
    chip: 'border-violet-400/30 bg-violet-400/10 text-violet-100',
    glow: 'shadow-[0_18px_60px_rgba(167,139,250,.16)]',
  },
  amber: {
    label: 'Amber',
    button: 'bg-amber-300 text-slate-950 hover:bg-amber-200',
    dot: 'bg-amber-300',
    chip: 'border-amber-300/30 bg-amber-300/10 text-amber-100',
    glow: 'shadow-[0_18px_60px_rgba(252,211,77,.14)]',
  },
};

const APPEARANCE_MODES: Record<
  AppearanceMode,
  { label: string; description: string; app: string; sidebar: string; header: string; composer: string }
> = {
  midnight: {
    label: 'Midnight',
    description: 'Premium koyu tema',
    app: 'bg-[linear-gradient(135deg,#020617_0%,#06111f_48%,#082f49_100%)]',
    sidebar: 'bg-slate-950/88',
    header: 'bg-slate-950/72',
    composer: 'bg-slate-950/86',
  },
  nebula: {
    label: 'Nebula',
    description: 'Daha parlak stüdyo',
    app: 'bg-[linear-gradient(135deg,#050816_0%,#111827_42%,#0e7490_100%)]',
    sidebar: 'bg-[#050816]/88',
    header: 'bg-[#050816]/72',
    composer: 'bg-[#050816]/88',
  },
  focus: {
    label: 'Focus',
    description: 'Sade ve okunaklı',
    app: 'bg-[linear-gradient(135deg,#020617_0%,#0f172a_60%,#111827_100%)]',
    sidebar: 'bg-slate-950/94',
    header: 'bg-slate-950/88',
    composer: 'bg-slate-950/94',
  },
};

const VIEWS: Array<{ id: StudioView; label: string; icon: LucideIcon }> = [
  { id: 'home', label: 'Home', icon: Compass },
  { id: 'chat', label: 'Chat', icon: MessageSquare },
  { id: 'image', label: 'Image Studio', icon: ImagePlus },
  { id: 'prompts', label: 'Prompt Library', icon: Layers3 },
  { id: 'pricing', label: 'Planlar', icon: CreditCard },
  { id: 'about', label: 'About', icon: Info },
  { id: 'feedback', label: 'Feedback', icon: Mail },
];

const CAPABILITIES = [
  { icon: FileText, title: 'Metin ve fikir', text: 'Blog, e-posta, kampanya, senaryo ve marka fikirleri.' },
  { icon: ImagePlus, title: 'Görsel üretim', text: 'Prompt gir, kare formatta hızlı konsept görseller oluştur.' },
  { icon: Code2, title: 'Kod yardımı', text: 'Hata ayıklama, açıklama, örnek kod ve proje planı.' },
  { icon: GraduationCap, title: 'Öğrenme desteği', text: 'Konu anlatımı, özet, çalışma planı ve soru çözümü.' },
  { icon: Globe2, title: 'Canlı web', text: 'Güncel konularda kaynaklı araştırma sonuçları.' },
  { icon: ShieldCheck, title: 'Güvenli kullanım', text: 'API anahtarı frontend içinde tutulmaz, hassas veri uyarısı görünür.' },
];

const PROMPTS: PromptItem[] = [
  {
    icon: Sparkles,
    title: 'Marka fikri',
    text: 'Yeni bir AI uygulaması için isim, slogan ve kısa marka hikayesi üret.',
  },
  {
    icon: ImagePlus,
    title: 'Logo promptu',
    text: 'Mavi-turkuaz neon ışıklı premium teknoloji logosu için görsel promptu oluştur.',
    image: true,
  },
  {
    icon: PenLine,
    title: 'Instagram postu',
    text: 'Yeni çıkan bir uygulama için kısa, etkileyici ve modern Instagram post metni yaz.',
  },
  {
    icon: Code2,
    title: 'Kod hatası',
    text: 'Bu kodu incele, hatayı bul, nedenini açıkla ve düzeltilmiş halini ver.',
  },
  {
    icon: Search,
    title: 'Güncel araştırma',
    text: 'Ara: Bugün yapay zeka alanında öne çıkan gelişmeleri kaynaklarıyla özetle.',
  },
  {
    icon: Wand2,
    title: 'Görsel sahne',
    text: 'Gece atmosferinde cam ve neon detaylı fütüristik AI çalışma masası görseli oluştur.',
    image: true,
  },
];

const IMAGE_STYLES: Array<{ id: ImageStyleId; label: string; description: string }> = [
  { id: 'cinematic', label: 'Cinematic', description: 'Işık, derinlik ve film hissi' },
  { id: 'photoreal', label: 'Realistic', description: 'Gerçekçi malzeme ve kamera' },
  { id: 'product', label: 'Product', description: 'Reklam ve ürün renderı' },
  { id: 'logo', label: 'Logo', description: 'Temiz marka sembolü' },
  { id: 'threeD', label: '3D Render', description: 'Parlak teknoloji estetiği' },
  { id: 'anime', label: 'Anime', description: 'İllüstratif karakter/sahne' },
  { id: 'interface', label: 'UI Mockup', description: 'Modern uygulama ekranı' },
];

const IMAGE_ASPECTS: Array<{ id: ImageAspectId; label: string; description: string }> = [
  { id: 'square', label: '1:1', description: 'Logo, avatar, post' },
  { id: 'portrait', label: '2:3', description: 'Telefon, poster, story' },
  { id: 'landscape', label: '3:2', description: 'Kapak, hero, sunum' },
];

const IMAGE_QUALITIES: Array<{ id: ImageQualityId; label: string; description: string }> = [
  { id: 'standard', label: 'Standard', description: 'Hızlı konsept' },
  { id: 'high', label: 'High', description: 'Daha net detay' },
  { id: 'ultra', label: 'Ultra', description: 'En güçlü prompt' },
];

const PLANS = [
  { name: 'Free Studio', price: '0 TL', text: 'Sohbet, prompt denemeleri ve temel görsel üretim akışı.' },
  { name: 'Creator', price: 'Yakında', text: 'Daha uzun sohbet geçmişi, gelişmiş görsel promptları ve hızlı yanıtlar.' },
  { name: 'Pro', price: 'Yakında', text: 'Marka üretimi, ekip kullanımı, özel modeller ve daha güçlü web araştırması.' },
];

type SystemLog = {
  id: string;
  message: string;
  time: string;
};

const createSession = (): ChatSession => ({
  id: uuidv4(),
  title: 'Yeni sohbet',
  messages: [],
  createdAt: Date.now(),
});

const readSessions = (): ChatSession[] => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length) return parsed;
    }
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
  return [createSession()];
};

const extractBytezText = (output: any): string => {
  if (!output) return 'Yanıt alınamadı.';
  if (typeof output === 'string') return output;

  if (Array.isArray(output)) {
    return output
      .map((item) => {
        if (typeof item === 'string') return item;
        if (item?.text) return item.text;
        if (item?.content) return item.content;
        return '';
      })
      .filter(Boolean)
      .join('\n');
  }

  if (output?.text) return output.text;
  if (output?.content) return output.content;
  return JSON.stringify(output, null, 2);
};

const KuvinLogo = ({ className }: { className?: string }) => (
  <span className={cn('inline-flex shrink-0 overflow-hidden rounded-lg bg-slate-950', className)}>
    <img src="/kuvin-logo.png" alt="Kuvin AI logosu" className="h-full w-full object-cover" />
  </span>
);

const callKuvinAssistant = async (
  messages: Array<{ role: Role; content: string }>,
  mode: string,
  searchContext: string,
  webEnabled: boolean,
) => {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, mode, searchContext, webEnabled }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data?.error || 'Kuvin API yanıt veremedi.');
  }

  if (typeof data?.answer !== 'string' || !data.answer.trim()) {
    throw new Error('Kuvin API boş yanıt döndürdü.');
  }

  const sources: WebSource[] = Array.isArray(data?.sources)
    ? data.sources
        .map((source: any) => ({
          title: String(source?.title || 'Kaynak'),
          url: String(source?.url || ''),
          snippet: typeof source?.snippet === 'string' ? source.snippet : undefined,
        }))
        .filter((source: WebSource) => source.url)
        .slice(0, 5)
    : [];

  return {
    answer: data.answer.trim(),
    model: typeof data?.model === 'string' ? data.model : 'unknown',
    sources,
    usedWeb: Boolean(data?.usedWeb || sources.length),
  };
};

const callKuvinImage = async (
  prompt: string,
  settings: { style: ImageStyleId; aspect: ImageAspectId; quality: ImageQualityId },
) => {
  const response = await fetch('/api/image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, ...settings }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok || typeof data?.imageUrl !== 'string') {
    throw new Error(data?.error || 'Kuvin Vision görsel oluşturamadı.');
  }

  return {
    imageUrl: data.imageUrl as string,
    prompt: typeof data.prompt === 'string' ? data.prompt : prompt,
    provider: typeof data.provider === 'string' ? data.provider : 'image',
    model: typeof data.model === 'string' ? data.model : 'unknown',
  };
};

const SectionShell = ({ children }: { children: ReactNode }) => (
  <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-3 py-4 md:px-8 md:py-6">{children}</div>
);

const App: React.FC = () => {
  const [sessions, setSessions] = useState<ChatSession[]>(readSessions);
  const [activeId, setActiveId] = useState<string>(() => readSessions()[0]?.id ?? '');
  const [input, setInput] = useState('');
  const [theme, setTheme] = useState<ThemeId>('cyan');
  const [appearance, setAppearance] = useState<AppearanceMode>('midnight');
  const [compactMode, setCompactMode] = useState(false);
  const [personality, setPersonality] = useState<Personality>(PERSONALITIES[0]);
  const [activeView, setActiveView] = useState<StudioView>('home');
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => window.innerWidth >= 768);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [imageMode, setImageMode] = useState(false);
  const [imageStyle, setImageStyle] = useState<ImageStyleId>('cinematic');
  const [imageAspect, setImageAspect] = useState<ImageAspectId>('square');
  const [imageQuality, setImageQuality] = useState<ImageQualityId>('high');
  const [isListening, setIsListening] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState<'idle' | 'listening' | 'unsupported'>('idle');
  const [assistantEngine, setAssistantEngine] = useState<AssistantEngine>('openai');
  const [webAssistEnabled, setWebAssistEnabled] = useState(true);
  const [lastSources, setLastSources] = useState<WebSource[]>([]);

  const activeSession = sessions.find((s) => s.id === activeId) ?? sessions[0];
  const chatScrollRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const recognitionRef = useRef<any>(null);
  const themeConf = THEMES[theme];
  const appearanceConf = APPEARANCE_MODES[appearance];
  const imageStyleInfo = IMAGE_STYLES.find((item) => item.id === imageStyle) ?? IMAGE_STYLES[0];
  const imageAspectInfo = IMAGE_ASPECTS.find((item) => item.id === imageAspect) ?? IMAGE_ASPECTS[0];
  const imageQualityInfo = IMAGE_QUALITIES.find((item) => item.id === imageQuality) ?? IMAGE_QUALITIES[1];

  const engineLabel = useMemo(() => {
    if (assistantEngine === 'openai') return 'OpenAI Core';
    if (assistantEngine === 'pollinations') return 'Ücretsiz AI';
    if (assistantEngine === 'bytez') return 'Bytez yedek';
    return 'Demo yardımcı';
  }, [assistantEngine]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  }, [sessions]);

  useEffect(() => {
    if (activeSession?.id && activeId !== activeSession.id) {
      setActiveId(activeSession.id);
    }
  }, [activeId, activeSession?.id]);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [activeSession?.messages.length, isProcessing, activeView]);

  useEffect(() => {
    const recentSources =
      [...(activeSession?.messages ?? [])].reverse().find((message) => message.sources?.length)?.sources ?? [];
    setLastSources(recentSources);
  }, [activeId, activeSession?.messages.length]);

  const addLog = (message: string) => {
    setLogs((prev) => [
      {
        id: uuidv4(),
        message,
        time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
      },
      ...prev.slice(0, 40),
    ]);
  };

  const updateActiveMessages = (updater: (prev: Message[]) => Message[]) => {
    const targetId = activeSession?.id;
    if (!targetId) return;

    setSessions((prev) =>
      prev.map((session) => {
        if (session.id !== targetId) return session;
        const nextMessages = updater(session.messages);
        const nextTitle =
          session.messages.length === 0 && nextMessages[0]
            ? nextMessages[0].content.slice(0, 34) + (nextMessages[0].content.length > 34 ? '…' : '')
            : session.title;
        return { ...session, title: nextTitle, messages: nextMessages };
      }),
    );
    setActiveView('chat');
  };

  const handleNewChat = () => {
    const next = createSession();
    setSessions((prev) => [next, ...prev]);
    setActiveId(next.id);
    setActiveView('chat');
    if (window.innerWidth < 768) setIsSidebarOpen(false);
  };

  const handleDeleteChat = (event: React.MouseEvent, id: string) => {
    event.stopPropagation();
    const remaining = sessions.filter((session) => session.id !== id);

    if (!remaining.length) {
      const fresh = createSession();
      setSessions([fresh]);
      setActiveId(fresh.id);
      return;
    }

    setSessions(remaining);
    if (id === activeId) setActiveId(remaining[0].id);
  };

  const selectPrompt = (prompt: string, image = false) => {
    setInput(prompt);
    setImageMode(image);
    setActiveView('chat');
    requestAnimationFrame(() => textareaRef.current?.focus());
    if (window.innerWidth < 768) setIsSidebarOpen(false);
  };

  const sendMessage = async (overrideContent?: string, forceImage = false) => {
    const rawContent = overrideContent ?? input;
    if (!rawContent.trim() || !activeSession) return;

    const content = rawContent.trim();
    setInput('');
    setActiveView('chat');
    requestAnimationFrame(() => textareaRef.current?.focus());

    const userMsg: Message = {
      id: uuidv4(),
      role: 'user',
      content,
      createdAt: Date.now(),
      type: 'text',
    };

    updateActiveMessages((prev) => [...prev, userMsg]);

    const lowerContent = content.toLocaleLowerCase('tr-TR');
    const wantsImage =
      forceImage ||
      imageMode ||
      lowerContent.includes('resim çiz') ||
      lowerContent.includes('görsel oluştur') ||
      lowerContent.startsWith('/img');

    setIsProcessing(true);

    try {
      if (wantsImage) {
        addLog(`Kuvin Vision hazırlanıyor: ${imageStyleInfo.label}, ${imageAspectInfo.label}, ${imageQualityInfo.label}`);

        const prompt =
          content
            .replace(/^\/img/i, '')
            .replace(/resim çiz/gi, '')
            .replace(/görsel oluştur/gi, '')
            .trim() || 'detaylı, sinematik bir AI stüdyo illüstrasyonu';

        const result = await callKuvinImage(prompt, {
          style: imageStyle,
          aspect: imageAspect,
          quality: imageQuality,
        });

        const aiMsg: Message = {
          id: uuidv4(),
          role: 'assistant',
          type: 'image',
          content: `Kuvin Vision görseli hazır. Stil: ${imageStyleInfo.label}, format: ${imageAspectInfo.label}, kalite: ${imageQualityInfo.label}.`,
          imageUrl: result.imageUrl,
          imagePrompt: result.prompt,
          imageProvider: result.provider,
          model: result.model,
          createdAt: Date.now(),
        };

        updateActiveMessages((prev) => [...prev, aiMsg]);
        addLog(`Görsel hazır: ${result.provider}`);
        return;
      }

      const searchContext = '';
      const textMessages = [
        ...activeSession.messages
          .filter((message) => message.type !== 'image')
          .map((message) => ({ role: message.role, content: message.content })),
        { role: 'user' as const, content },
      ];

      try {
        addLog(webAssistEnabled ? 'Kuvin canlı kaynaklarla düşünüyor' : 'Kuvin düşünüyor');
        const { answer, model, sources, usedWeb } = await callKuvinAssistant(
          textMessages,
          personality.id,
          searchContext,
          webAssistEnabled,
        );

        const aiMsg: Message = {
          id: uuidv4(),
          role: 'assistant',
          content: answer,
          createdAt: Date.now(),
          type: 'text',
          sources,
          model,
          usedWeb,
        };

        updateActiveMessages((prev) => [...prev, aiMsg]);
        if (sources.length) setLastSources(sources);
        setAssistantEngine(
          model === 'local-demo' ? 'offline' : model === 'pollinations' ? 'pollinations' : 'openai',
        );
        addLog(usedWeb ? 'Kaynaklı yanıt gönderildi' : 'Kuvin Core yanıtı gönderildi');
        return;
      } catch (error) {
        console.warn(error);
        addLog('Kuvin Core yoğun, yedek motor deneniyor');
      }

      if (!BYTEZ_API_KEY || !bytezModel) {
        setAssistantEngine('offline');
        addLog('Model anahtarı bulunamadı');
        updateActiveMessages((prev) => [
          ...prev,
          {
            id: uuidv4(),
            role: 'assistant',
            content:
              'Kuvin Core için Vercel ortamında OPENAI_API_KEY, yedek motor için VITE_BYTEZ_API_KEY tanımlı olmalı.',
            createdAt: Date.now(),
          },
        ]);
        return;
      }

      addLog('Bytez ile yanıt hazırlanıyor');
      const { error, output } = await bytezModel.run([
        { role: 'system', content: personality.systemPrompt + searchContext },
        ...textMessages,
      ] as any);

      if (error) {
        console.error(error);
        addLog('Bytez model hatası');
        updateActiveMessages((prev) => [
          ...prev,
          {
            id: uuidv4(),
            role: 'assistant',
            content: 'Bağlantı yoğun, tekrar deneyebilirsin.',
            createdAt: Date.now(),
            type: 'text',
          },
        ]);
        return;
      }

      updateActiveMessages((prev) => [
        ...prev,
        {
          id: uuidv4(),
          role: 'assistant',
          content: extractBytezText(output) || 'Bir şeyler ters gitti, yanıt oluşturulamadı.',
          createdAt: Date.now(),
          type: 'text',
        },
      ]);
      setAssistantEngine('bytez');
      addLog('Yanıt gönderildi');
    } catch (error) {
      console.error(error);
      addLog('Beklenmeyen bir hata oluştu');
      updateActiveMessages((prev) => [
        ...prev,
        {
          id: uuidv4(),
          role: 'assistant',
          content: 'Bağlantı yoğun, tekrar deneyebilirsin.',
          createdAt: Date.now(),
          type: 'text',
        },
      ]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      if (!isProcessing) sendMessage();
    }
  };

  const startVoiceImage = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setVoiceStatus('unsupported');
      addLog('Bu tarayıcı konuşarak görsel oluşturmayı desteklemiyor');
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop?.();
      return;
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.lang = 'tr-TR';
    recognition.interimResults = true;
    recognition.continuous = false;

    let finalTranscript = '';

    recognition.onstart = () => {
      setImageMode(true);
      setActiveView('chat');
      setIsListening(true);
      setVoiceStatus('listening');
      addLog('Konuşarak görsel komutu dinleniyor');
    };

    recognition.onresult = (event: any) => {
      let interimTranscript = '';
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const transcript = event.results[index][0]?.transcript ?? '';
        if (event.results[index].isFinal) finalTranscript += ` ${transcript}`;
        else interimTranscript += ` ${transcript}`;
      }

      const spokenPrompt = `${finalTranscript} ${interimTranscript}`.trim();
      if (spokenPrompt) setInput(spokenPrompt);
    };

    recognition.onerror = () => {
      setIsListening(false);
      setVoiceStatus('idle');
      addLog('Ses algılama tamamlanamadı');
    };

    recognition.onend = () => {
      setIsListening(false);
      setVoiceStatus('idle');
      const spokenPrompt = finalTranscript.trim();
      if (spokenPrompt) {
        void sendMessage(spokenPrompt, true);
      }
    };

    recognition.start();
  };

  const renderPromptGrid = (items = PROMPTS) => (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {items.map((prompt) => {
        const Icon = prompt.icon;
        return (
          <button
            key={prompt.title}
            onClick={() => selectPrompt(prompt.text, prompt.image)}
            className="group min-h-28 rounded-lg border border-white/10 bg-white/[0.045] p-4 text-left text-slate-200 shadow-sm transition hover:border-cyan-300/45 hover:bg-white/[0.075]"
          >
            <span className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-slate-950/70 text-cyan-200">
              <Icon size={18} />
            </span>
            <span className="block text-sm font-semibold text-white">{prompt.title}</span>
            <span className="mt-1 block text-xs leading-relaxed text-slate-400">{prompt.text}</span>
          </button>
        );
      })}
    </div>
  );

  const renderHome = () => (
    <SectionShell>
      <section className={cn('rounded-lg border border-white/10 bg-white/[0.045] p-5 md:p-7', themeConf.glow)}>
        <div className="grid gap-6 lg:grid-cols-[1.1fr_.9fr]">
          <div className="flex flex-col justify-center gap-5">
            <div className="inline-flex w-fit items-center gap-2 rounded-lg border border-cyan-300/25 bg-cyan-300/10 px-3 py-1.5 text-xs font-semibold text-cyan-100">
              <Sparkles size={14} /> Think Beyond
            </div>
            <div>
              <h1 className="max-w-3xl text-3xl font-semibold leading-tight text-white md:text-5xl">
                Kuvin AI ile düşün, üret, tasarla.
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 md:text-base">
                Akıllı sohbet, görsel üretim, canlı web araştırması ve yaratıcı asistan özelliklerini tek bir modern
                stüdyoda birleştir.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setActiveView('chat')}
                className={cn('inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition', themeConf.button)}
              >
                <MessageSquare size={16} /> Hemen başla
              </button>
              <button
                onClick={() => {
                  setImageMode(true);
                  setActiveView('image');
                }}
                className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/10 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:border-cyan-300/50"
              >
                <ImagePlus size={16} /> Görsel oluştur
              </button>
              <button
                onClick={() => setActiveView('prompts')}
                className="inline-flex items-center gap-2 rounded-lg border border-white/12 bg-transparent px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-white/30"
              >
                <Layers3 size={16} /> Prompt Library
              </button>
            </div>
          </div>

          <div className="rounded-lg border border-white/10 bg-slate-950/60 p-4">
            <KuvinLogo className="mx-auto aspect-square w-full max-w-[320px] shadow-[0_22px_80px_rgba(34,211,238,.2)]" />
            <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
              {['Chat', 'Vision', 'Studio'].map((label) => (
                <div key={label} className="rounded-lg border border-white/10 bg-white/[0.045] px-2 py-3 text-slate-300">
                  <span className="block font-semibold text-white">Kuvin</span>
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {CAPABILITIES.map((item) => {
          const Icon = item.icon;
          return (
            <article key={item.title} className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
              <Icon size={18} className="text-cyan-200" />
              <h2 className="mt-3 text-sm font-semibold text-white">{item.title}</h2>
              <p className="mt-1 text-xs leading-relaxed text-slate-400">{item.text}</p>
            </article>
          );
        })}
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-white">Örnek kullanımlar</h2>
          <button onClick={() => setActiveView('prompts')} className="text-xs font-semibold text-cyan-200">
            Tüm promptlar
          </button>
        </div>
        {renderPromptGrid(PROMPTS.slice(0, 3))}
      </section>
    </SectionShell>
  );

  const renderChat = () => {
    const isEmpty = !activeSession?.messages.length;

    return (
      <div
        ref={chatScrollRef}
        className="flex min-h-0 flex-1 flex-col overflow-y-auto px-3 py-4 pb-5 scrollbar-thin md:px-8 md:py-6"
      >
        {isEmpty ? (
          <div className="mx-auto flex min-h-full max-w-4xl flex-col justify-center gap-5">
            <div className="rounded-lg border border-white/10 bg-white/[0.045] p-5 text-left">
              <div className="flex items-start gap-3">
                <KuvinLogo className="h-12 w-12" />
                <div className="min-w-0 flex-1">
                  <div className="text-lg font-semibold text-white">Bugün ne üretmek istersin?</div>
                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    Kuvin AI; sohbet, kod, araştırma, marka fikri ve görsel üretim için hazır.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    <span className={cn('inline-flex items-center gap-1 rounded-lg border px-2 py-1', themeConf.chip)}>
                      <CheckCircle2 size={12} /> Canlı web {webAssistEnabled ? 'açık' : 'kapalı'}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.045] px-2 py-1 text-slate-300">
                      <ShieldCheck size={12} /> Kişisel veri paylaşma
                    </span>
                  </div>
                </div>
              </div>
            </div>
            {renderPromptGrid(PROMPTS.slice(0, 4))}
          </div>
        ) : (
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-3">
            {activeSession.messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.18 }}
                className={cn('flex w-full gap-2 md:gap-3', message.role === 'user' && 'flex-row-reverse')}
              >
                {message.role === 'user' ? (
                  <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cyan-400 text-slate-950 shadow-sm">
                    <User size={15} />
                  </div>
                ) : (
                  <KuvinLogo className="mt-1 h-8 w-8 shadow-sm" />
                )}

                <div
                  className={cn(
                    'flex max-w-[84%] flex-col gap-1 md:max-w-[76%]',
                    message.role === 'user' ? 'items-end text-right' : 'items-start text-left',
                  )}
                >
                  <div
                    className={cn(
                      'rounded-lg px-3 py-2.5 leading-relaxed shadow-sm md:px-4 md:py-3',
                      compactMode ? 'text-xs md:text-[13px]' : 'text-[13px] md:text-sm',
                      message.role === 'user'
                        ? 'bg-cyan-400 text-slate-950'
                        : 'border border-white/10 bg-white/[0.055] text-slate-100',
                    )}
                  >
                    {message.type === 'image' && message.imageUrl ? (
                      <div className="space-y-2">
                        <p>{message.content}</p>
                        <div className="overflow-hidden rounded-lg border border-white/10">
                          <img
                            src={message.imageUrl}
                            alt="Kuvin AI tarafından üretilen görsel"
                            className="h-auto max-h-[360px] w-full object-cover"
                            loading="lazy"
                          />
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <a
                            href={message.imageUrl}
                            target="_blank"
                            rel="noreferrer"
                            download="kuvin-ai-image.png"
                            className="inline-flex items-center gap-1 rounded-lg border border-cyan-300/25 bg-cyan-300/10 px-2 py-1 text-[11px] font-semibold text-cyan-100 transition hover:border-cyan-300/50"
                          >
                            <Download size={12} /> Aç / indir
                          </a>
                          {message.imageProvider ? (
                            <span className="inline-flex items-center rounded-lg border border-white/10 bg-slate-950/45 px-2 py-1 text-[11px] text-slate-400">
                              {message.imageProvider}
                            </span>
                          ) : null}
                        </div>
                        {message.imagePrompt ? (
                          <details className="rounded-lg border border-white/10 bg-slate-950/45 px-2 py-1 text-left text-[11px] text-slate-400">
                            <summary className="cursor-pointer font-semibold text-slate-300">Üretim promptu</summary>
                            <p className="mt-1 whitespace-pre-wrap leading-5">{message.imagePrompt}</p>
                          </details>
                        ) : null}
                      </div>
                    ) : (
                      <div className="prose prose-sm prose-invert max-w-none prose-p:my-1 prose-headings:my-2 prose-pre:bg-slate-950 prose-pre:p-3 prose-pre:text-xs">
                        <ReactMarkdown>{message.content}</ReactMarkdown>
                      </div>
                    )}

                    {message.role === 'assistant' && message.sources?.length ? (
                      <div className="mt-3 border-t border-white/10 pt-2">
                        <div className="mb-1.5 flex items-center gap-1 text-[10px] font-semibold uppercase text-slate-400">
                          <Globe2 size={12} /> Kaynaklar
                        </div>
                        <div className="grid gap-1.5">
                          {message.sources.map((source, index) => (
                            <a
                              key={`${source.url}-${index}`}
                              href={source.url}
                              target="_blank"
                              rel="noreferrer"
                              className="group flex items-start justify-between gap-2 rounded-lg border border-white/10 bg-slate-950/45 px-2 py-1.5 text-left text-[11px] leading-snug text-slate-300 transition hover:border-cyan-300/40"
                            >
                              <span className="min-w-0">
                                <span className="font-medium text-slate-100">
                                  {index + 1}. {source.title}
                                </span>
                                {source.snippet ? (
                                  <span className="mt-0.5 line-clamp-2 block text-[10px] text-slate-500">
                                    {source.snippet}
                                  </span>
                                ) : null}
                              </span>
                              <ExternalLink size={12} className="mt-0.5 shrink-0 text-slate-500 group-hover:text-cyan-200" />
                            </a>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                  <span className="px-1 text-[10px] text-slate-500">
                    {new Date(message.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </motion.div>
            ))}

            {isProcessing && (
              <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
                <div className="h-6 w-6 rounded-lg border border-cyan-300/30 p-1">
                  <div className="h-full w-full animate-spin rounded-full border-2 border-cyan-300 border-t-transparent" />
                </div>
                {imageMode ? 'Görsel hazırlanıyor...' : 'Kuvin düşünüyor...'}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderContent = () => {
    if (activeView === 'home') return renderHome();
    if (activeView === 'chat') return renderChat();
    if (activeView === 'image') {
      return (
        <SectionShell>
          <div className={cn('rounded-lg border border-white/10 bg-white/[0.045] p-5', themeConf.glow)}>
            <div className="grid gap-5 lg:grid-cols-[1.1fr_.9fr]">
              <div>
                <div className="inline-flex w-fit items-center gap-2 rounded-lg border border-cyan-300/25 bg-cyan-300/10 px-3 py-1.5 text-xs font-semibold text-cyan-100">
                  <Mic size={14} /> Konuşarak görsel oluştur
                </div>
                <h1 className="mt-4 text-3xl font-semibold text-white md:text-4xl">Kuvin Vision Pro</h1>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">
                  Görsel fikrini konuş veya yaz. Kuvin; stil, format ve kalite ayarlarını kullanarak promptu zenginleştirir,
                  OpenAI image modeli varsa onu, yoksa gelişmiş fallback motorunu çalıştırır.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    onClick={startVoiceImage}
                    disabled={isProcessing}
                    className={cn(
                      'inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition',
                      isListening ? 'bg-rose-400 text-slate-950' : themeConf.button,
                      isProcessing && 'cursor-not-allowed opacity-50',
                    )}
                  >
                    <Mic size={16} /> {isListening ? 'Dinliyorum...' : 'Konuş ve oluştur'}
                  </button>
                  <button
                    onClick={() => {
                      setImageMode(true);
                      setActiveView('chat');
                      requestAnimationFrame(() => textareaRef.current?.focus());
                    }}
                    className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.06] px-4 py-2 text-sm font-semibold text-slate-100 transition hover:border-cyan-300/50"
                  >
                    <Brush size={16} /> Yazıyla üret
                  </button>
                </div>
                {voiceStatus === 'unsupported' ? (
                  <p className="mt-3 text-xs text-amber-200">
                    Bu tarayıcı ses algılamayı desteklemiyor. Chrome veya Edge ile deneyebilirsin.
                  </p>
                ) : null}
              </div>

              <div className="rounded-lg border border-white/10 bg-slate-950/55 p-4">
                <div className="text-xs font-semibold uppercase text-slate-500">Aktif üretim ayarı</div>
                <div className="mt-3 grid gap-2 text-sm">
                  <div className="rounded-lg border border-white/10 bg-white/[0.045] p-3">
                    <span className="block text-xs text-slate-500">Stil</span>
                    <span className="font-semibold text-white">{imageStyleInfo.label}</span>
                    <span className="mt-1 block text-xs text-slate-400">{imageStyleInfo.description}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-lg border border-white/10 bg-white/[0.045] p-3">
                      <span className="block text-xs text-slate-500">Format</span>
                      <span className="font-semibold text-white">{imageAspectInfo.label}</span>
                    </div>
                    <div className="rounded-lg border border-white/10 bg-white/[0.045] p-3">
                      <span className="block text-xs text-slate-500">Kalite</span>
                      <span className="font-semibold text-white">{imageQualityInfo.label}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.1fr_.9fr]">
            <div className="rounded-lg border border-white/10 bg-white/[0.045] p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold text-white">Stil seç</h2>
                <span className="text-xs text-slate-500">Prompt otomatik güçlenir</span>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {IMAGE_STYLES.map((style) => (
                  <button
                    key={style.id}
                    onClick={() => setImageStyle(style.id)}
                    className={cn(
                      'min-h-20 rounded-lg border px-3 py-2 text-left transition',
                      imageStyle === style.id
                        ? 'border-cyan-300 bg-cyan-300 text-slate-950'
                        : 'border-white/10 bg-slate-950/45 text-slate-300 hover:border-cyan-300/40',
                    )}
                  >
                    <span className="block text-sm font-semibold">{style.label}</span>
                    <span className={cn('mt-1 block text-xs', imageStyle === style.id ? 'text-slate-800' : 'text-slate-500')}>
                      {style.description}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-lg border border-white/10 bg-white/[0.045] p-4">
                <h2 className="mb-3 text-sm font-semibold text-white">Format</h2>
                <div className="grid gap-2">
                  {IMAGE_ASPECTS.map((aspect) => (
                    <button
                      key={aspect.id}
                      onClick={() => setImageAspect(aspect.id)}
                      className={cn(
                        'flex items-center justify-between rounded-lg border px-3 py-2 text-left transition',
                        imageAspect === aspect.id
                          ? 'border-cyan-300 bg-cyan-300 text-slate-950'
                          : 'border-white/10 bg-slate-950/45 text-slate-300 hover:border-cyan-300/40',
                      )}
                    >
                      <span className="font-semibold">{aspect.label}</span>
                      <span className={cn('text-xs', imageAspect === aspect.id ? 'text-slate-800' : 'text-slate-500')}>
                        {aspect.description}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border border-white/10 bg-white/[0.045] p-4">
                <h2 className="mb-3 text-sm font-semibold text-white">Kalite</h2>
                <div className="grid gap-2">
                  {IMAGE_QUALITIES.map((quality) => (
                    <button
                      key={quality.id}
                      onClick={() => setImageQuality(quality.id)}
                      className={cn(
                        'flex items-center justify-between rounded-lg border px-3 py-2 text-left transition',
                        imageQuality === quality.id
                          ? 'border-cyan-300 bg-cyan-300 text-slate-950'
                          : 'border-white/10 bg-slate-950/45 text-slate-300 hover:border-cyan-300/40',
                      )}
                    >
                      <span className="font-semibold">{quality.label}</span>
                      <span className={cn('text-xs', imageQuality === quality.id ? 'text-slate-800' : 'text-slate-500')}>
                        {quality.description}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {renderPromptGrid(PROMPTS.filter((prompt) => prompt.image))}
        </SectionShell>
      );
    }
    if (activeView === 'prompts') {
      return (
        <SectionShell>
          <div>
            <h1 className="text-2xl font-semibold text-white">Prompt Library</h1>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              Hazır komutlarla daha hızlı başla; sohbet, görsel, kod ve marka üretimi için seç.
            </p>
          </div>
          {renderPromptGrid()}
        </SectionShell>
      );
    }
    if (activeView === 'pricing') {
      return (
        <SectionShell>
          <div>
            <h1 className="text-2xl font-semibold text-white">Planlar</h1>
            <p className="mt-2 text-sm text-slate-300">Kuvin AI şu anda test aşamasında; büyüdükçe planlar açılabilir.</p>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {PLANS.map((plan) => (
              <article key={plan.name} className="rounded-lg border border-white/10 bg-white/[0.045] p-4">
                <h2 className="text-sm font-semibold text-white">{plan.name}</h2>
                <div className="mt-2 text-2xl font-semibold text-cyan-100">{plan.price}</div>
                <p className="mt-3 text-xs leading-6 text-slate-400">{plan.text}</p>
              </article>
            ))}
          </div>
          <div className="rounded-lg border border-cyan-300/25 bg-cyan-300/10 p-4 text-sm leading-6 text-cyan-50">
            Marka için en güçlü alan adları: kuvin.ai, kuvin.app, kuvin.studio veya kuvinlabs.com.
          </div>
        </SectionShell>
      );
    }
    if (activeView === 'about') {
      return (
        <SectionShell>
          <article className="rounded-lg border border-white/10 bg-white/[0.045] p-5">
            <KuvinLogo className="h-14 w-14" />
            <h1 className="mt-4 text-2xl font-semibold text-white">Kuvin AI</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">
              Kuvin AI, sohbet ve görsel üretimi tek stüdyo akışında birleştiren modern bir yapay zeka platformudur.
              Think Beyond yaklaşımıyla hızlı düşünme, üretme, tasarlama ve araştırma desteği verir.
            </p>
          </article>
          <div className="grid gap-3 md:grid-cols-3">
            {['API anahtarları sunucuda saklanır.', 'Kişisel verilerini paylaşmaman önerilir.', 'Güncel yanıtlarda kaynaklar gösterilir.'].map(
              (text) => (
                <div key={text} className="rounded-lg border border-white/10 bg-white/[0.04] p-4 text-sm text-slate-300">
                  <ShieldCheck size={18} className="mb-3 text-cyan-200" />
                  {text}
                </div>
              ),
            )}
          </div>
        </SectionShell>
      );
    }
    return (
      <SectionShell>
        <div className="rounded-lg border border-white/10 bg-white/[0.045] p-5">
          <h1 className="text-2xl font-semibold text-white">Contact / Feedback</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
            Geri bildirim, hata raporu veya yeni özellik fikri için kısa notunu sohbete yazabilirsin. Kuvin bunu ürün
            planına çevirebilir.
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {['Hata bildir', 'Özellik öner', 'Tasarım fikri ver'].map((text) => (
              <button
                key={text}
                onClick={() => selectPrompt(`${text}: Kuvin AI için şu konuda destek istiyorum...`)}
                className="rounded-lg border border-white/10 bg-slate-950/45 px-3 py-3 text-left text-sm text-slate-200 transition hover:border-cyan-300/40"
              >
                {text}
              </button>
            ))}
          </div>
        </div>
      </SectionShell>
    );
  };

  return (
    <div className="h-[100dvh] w-screen max-w-full overflow-hidden overscroll-none bg-slate-950 text-slate-100">
      <div className={cn('flex h-full min-h-0', appearanceConf.app)}>
        <AnimatePresence initial={false}>
          {isSidebarOpen && (
            <motion.aside
              initial={{ x: -40, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -40, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 24 }}
              className={cn(
                'relative z-20 flex h-full w-72 shrink-0 flex-col border-r border-white/10 shadow-2xl backdrop-blur-xl',
                appearanceConf.sidebar,
              )}
            >
              <div className="flex items-center justify-between border-b border-white/10 px-4 py-4">
                <div className="flex items-center gap-3">
                  <KuvinLogo className="h-10 w-10 shadow-[0_10px_30px_rgba(34,211,238,.22)]" />
                  <div>
                    <div className="text-sm font-semibold leading-tight text-white">Kuvin AI</div>
                    <div className="text-[11px] text-cyan-100/75">Think Beyond</div>
                  </div>
                </div>
                <button
                  onClick={() => setIsSidebarOpen(false)}
                  className="inline-flex rounded-lg p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-white md:hidden"
                  aria-label="Menüyü kapat"
                >
                  <X size={18} />
                </button>
              </div>

              <nav className="space-y-1 px-3 py-3">
                {VIEWS.map((view) => {
                  const Icon = view.icon;
                  const active = activeView === view.id;
                  return (
                    <button
                      key={view.id}
                      onClick={() => {
                        setActiveView(view.id);
                        if (view.id === 'image') setImageMode(true);
                        if (window.innerWidth < 768) setIsSidebarOpen(false);
                      }}
                      className={cn(
                        'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold transition',
                        active ? 'bg-cyan-300 text-slate-950' : 'text-slate-400 hover:bg-white/10 hover:text-white',
                      )}
                    >
                      <Icon size={15} />
                      {view.label}
                    </button>
                  );
                })}
              </nav>

              <div className="border-y border-white/10 px-4 py-3">
                <button
                  onClick={handleNewChat}
                  className={cn('flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition', themeConf.button)}
                >
                  <Plus size={16} />
                  Yeni sohbet
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-3 py-3 scrollbar-thin">
                <div className="px-1 pb-2 text-[11px] font-semibold uppercase text-slate-500">Sohbetler</div>
                <div className="space-y-1">
                  {sessions.map((session) => {
                    const active = session.id === activeId && activeView === 'chat';
                    return (
                      <div
                        key={session.id}
                        className={cn(
                          'group flex items-center gap-2 rounded-lg px-2 py-2 transition',
                          active ? 'bg-white/10 text-white' : 'text-slate-400 hover:bg-white/10 hover:text-slate-100',
                        )}
                      >
                        <button
                          onClick={() => {
                            setActiveId(session.id);
                            setActiveView('chat');
                            if (window.innerWidth < 768) setIsSidebarOpen(false);
                          }}
                          className="flex min-w-0 flex-1 items-center gap-2 text-left"
                        >
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-cyan-100">
                            <MessageSquare size={14} />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-xs font-semibold">{session.title}</span>
                            <span className="block text-[10px] text-slate-500">
                              {new Date(session.createdAt).toLocaleDateString('tr-TR', {
                                day: '2-digit',
                                month: '2-digit',
                              })}
                            </span>
                          </span>
                        </button>
                        {sessions.length > 1 ? (
                          <button
                            onClick={(event) => handleDeleteChat(event, session.id)}
                            className="hidden rounded-lg p-1 text-slate-500 transition hover:bg-red-500/10 hover:text-red-300 group-hover:inline-flex"
                            aria-label="Sohbeti sil"
                          >
                            <Trash2 size={14} />
                          </button>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-3 border-t border-white/10 px-4 py-3">
                <div>
                  <div className="mb-2 text-[11px] font-semibold text-slate-500">Vurgu rengi</div>
                  <div className="flex gap-2">
                    {(Object.keys(THEMES) as ThemeId[]).map((item) => (
                      <button
                        key={item}
                        onClick={() => setTheme(item)}
                        className={cn(
                          'h-6 w-6 rounded-lg border transition hover:scale-105',
                          THEMES[item].dot,
                          theme === item ? 'border-white' : 'border-white/20',
                        )}
                        aria-label={`${THEMES[item].label} tema`}
                      />
                    ))}
                  </div>
                </div>
                <button
                  onClick={() => setCompactMode((value) => !value)}
                  className={cn(
                    'flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-xs transition',
                    compactMode
                      ? 'border-cyan-300 bg-cyan-300 text-slate-950'
                      : 'border-white/10 bg-white/[0.045] text-slate-300 hover:border-cyan-300/35',
                  )}
                >
                  <span className="flex items-center gap-2">
                    <Layers3 size={14} /> Sıkı chat modu
                  </span>
                  <span className="text-[10px]">{compactMode ? 'Açık' : 'Kapalı'}</span>
                </button>
                <button
                  onClick={() => setIsSettingsOpen(true)}
                  className="flex w-full items-center justify-between rounded-lg border border-white/10 bg-white/[0.045] px-3 py-2 text-left text-xs text-slate-300 transition hover:border-cyan-300/35"
                >
                  <span className="flex items-center gap-2">
                    <User size={14} /> {personality.label}
                  </span>
                  <SlidersHorizontal size={14} className="text-slate-500" />
                </button>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        <div className="relative flex h-full min-h-0 min-w-0 flex-1 flex-col">
          <header
            className={cn(
              'flex min-h-16 shrink-0 items-center justify-between gap-2 border-b border-white/10 px-3 backdrop-blur-xl md:px-6',
              appearanceConf.header,
            )}
          >
            <div className="flex min-w-0 items-center gap-2">
              {!isSidebarOpen && (
                <button
                  onClick={() => setIsSidebarOpen(true)}
                  className="mr-1 inline-flex rounded-lg p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-white"
                  aria-label="Menüyü aç"
                >
                  <Menu size={18} />
                </button>
              )}
              <KuvinLogo className="h-8 w-8 md:hidden" />
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-white">
                  {VIEWS.find((view) => view.id === activeView)?.label || 'Kuvin AI'}
                </div>
                <div className="flex min-w-0 items-center gap-1 text-[11px] text-slate-400">
                  <span className={cn('h-1.5 w-1.5 rounded-full', isProcessing ? 'animate-pulse bg-amber-300' : 'bg-emerald-400')} />
                  <span className="truncate">{isProcessing ? 'Kuvin hazırlanıyor...' : `Hazır · ${engineLabel}`}</span>
                </div>
              </div>
            </div>

            <div className="hidden items-center gap-2 sm:flex">
              <button
                onClick={() => setImageMode((value) => !value)}
                title="Görsel modu"
                className={cn(
                  'inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition',
                  imageMode
                    ? 'border-cyan-300 bg-cyan-300 text-slate-950'
                    : 'border-white/10 bg-white/[0.045] text-slate-300 hover:border-cyan-300/40',
                )}
              >
                <Brush size={13} />
                <span>Görsel modu</span>
              </button>
              <button
                onClick={() => setIsSettingsOpen(true)}
                title="Panel"
                className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.045] px-2.5 py-1.5 text-xs font-semibold text-slate-300 transition hover:border-cyan-300/40"
              >
                <Sparkles size={13} />
                <span>Panel</span>
              </button>
            </div>
          </header>

          <div className="flex min-h-0 flex-1 md:flex-row">
            <section className="flex h-full min-h-0 min-w-0 flex-1 flex-col bg-[linear-gradient(180deg,rgba(15,23,42,.44),rgba(2,6,23,.18))]">
              <div
                className={cn(
                  'min-h-0 flex-1 scrollbar-thin',
                  activeView === 'chat' ? 'flex flex-col overflow-hidden' : 'overflow-y-auto',
                )}
              >
                {renderContent()}
              </div>

              <div
                className={cn(
                  'shrink-0 border-t border-white/10 px-3 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur-xl md:px-8 md:py-4',
                  appearanceConf.composer,
                )}
              >
                <div className="mx-auto flex w-full max-w-[calc(100vw-2rem)] items-end gap-2 rounded-lg border border-white/10 bg-white/[0.055] px-2 py-1 shadow-inner md:max-w-3xl">
                  <button
                    className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white/10 hover:text-white"
                    title="Görsel dosyası"
                  >
                    <ImageIcon size={18} />
                  </button>

                  <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    onKeyDown={handleKeyDown}
                    rows={1}
                    placeholder={
                      isListening
                        ? 'Dinliyorum... Görseli anlat.'
                        : imageMode
                          ? 'Nasıl bir görsel istiyorsun?'
                          : 'Bugün ne üretmek istersin?'
                    }
                    className={cn(
                      'max-h-28 min-h-[46px] flex-1 resize-none border-0 bg-transparent px-1 py-2 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-0',
                      compactMode ? 'text-xs' : 'text-sm',
                    )}
                  />

                  <button
                    onClick={startVoiceImage}
                    disabled={isProcessing}
                    className={cn(
                      'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition',
                      isListening
                        ? 'bg-rose-400 text-slate-950'
                        : 'text-slate-400 hover:bg-white/10 hover:text-white',
                      isProcessing && 'cursor-not-allowed opacity-45',
                    )}
                    title={isListening ? 'Dinlemeyi durdur' : 'Konuşarak görsel oluştur'}
                  >
                    <Mic size={18} />
                  </button>

                  <button
                    onClick={() => sendMessage()}
                    disabled={!input.trim() || isProcessing}
                    className={cn(
                      'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg font-semibold shadow-md transition',
                      themeConf.button,
                      !input.trim() || isProcessing ? 'cursor-not-allowed opacity-40' : 'hover:scale-105',
                    )}
                    aria-label="Gönder"
                  >
                    <Send size={18} />
                  </button>
                </div>

                <div className="mx-auto mt-2 flex max-w-[calc(100vw-2rem)] items-center justify-between gap-2 text-[10px] leading-snug text-slate-500 md:max-w-3xl">
                  <span className="hidden sm:inline">
                    Kuvin AI; OpenAI Core, canlı web araştırması, yedek AI motoru ve görsel üretim akışıyla çalışır.
                  </span>
                  <span>Kişisel verilerini paylaşma.</span>
                </div>
              </div>
            </section>

            <aside
              className={cn(
                'hidden w-80 shrink-0 flex-col border-l border-white/10 px-4 py-4 backdrop-blur-xl md:flex',
                appearanceConf.sidebar,
              )}
            >
              <div className="mb-3 rounded-lg border border-white/10 bg-white/[0.045] p-3">
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-300 text-slate-950">
                      <User size={16} />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-white">Kişilik</span>
                      <span className="text-[11px] text-slate-400">{personality.label}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsSettingsOpen(true)}
                    className="rounded-lg border border-white/10 bg-slate-950 px-2 py-1 text-[10px] text-slate-300 transition hover:border-cyan-300/40"
                  >
                    Değiştir
                  </button>
                </div>
                <p className="text-[11px] leading-snug text-slate-400">{personality.description}</p>
              </div>

              <div className="mb-3 rounded-lg border border-white/10 bg-white/[0.045] p-3">
                <div className="mb-2 flex items-center gap-2">
                  <KuvinLogo className="h-8 w-8" />
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-white">Asistan çekirdeği</span>
                    <span className="text-[11px] text-slate-400">{engineLabel}</span>
                  </div>
                </div>
                <div className="grid gap-2 text-[11px] text-slate-400">
                  <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-slate-950/45 px-2 py-1.5">
                    <ServerCog size={13} className="text-cyan-200" />
                    <span>OpenAI anahtarı Vercel API tarafında saklanır.</span>
                  </div>
                  <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-slate-950/45 px-2 py-1.5">
                    <ShieldCheck size={13} className="text-cyan-200" />
                    <span>Yanıtlar hata içerebilir; hassas veri paylaşma.</span>
                  </div>
                </div>
              </div>

              <div className="mb-3 rounded-lg border border-white/10 bg-white/[0.045] p-3">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-cyan-200">
                      <Globe2 size={16} />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-white">Canlı web yardımı</span>
                      <span className="text-[11px] text-slate-400">
                        {webAssistEnabled ? 'Güncel sorularda kaynak arar' : 'Sadece model bilgisiyle yanıtlar'}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setWebAssistEnabled((enabled) => !enabled)}
                    className={cn(
                      'rounded-lg border px-2 py-1 text-[10px] font-semibold transition',
                      webAssistEnabled
                        ? 'border-emerald-300/35 bg-emerald-300/10 text-emerald-100'
                        : 'border-white/10 bg-slate-950 text-slate-400',
                    )}
                  >
                    {webAssistEnabled ? 'Açık' : 'Kapalı'}
                  </button>
                </div>

                <div className="rounded-lg border border-white/10 bg-slate-950/45 p-2">
                  <div className="mb-1.5 flex items-center justify-between text-[10px] font-semibold uppercase text-slate-500">
                    <span className="inline-flex items-center gap-1">
                      <Globe2 size={11} /> Son kaynaklar
                    </span>
                    <span>{lastSources.length || 0}/5</span>
                  </div>
                  {lastSources.length ? (
                    <div className="max-h-32 space-y-1 overflow-y-auto pr-1 scrollbar-thin">
                      {lastSources.map((source, index) => (
                        <a
                          key={`${source.url}-${index}`}
                          href={source.url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center justify-between gap-2 rounded-lg px-1.5 py-1 text-[11px] text-slate-400 transition hover:bg-white/10 hover:text-slate-100"
                        >
                          <span className="truncate">{source.title}</span>
                          <ExternalLink size={11} className="shrink-0 text-slate-500" />
                        </a>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] leading-snug text-slate-500">
                      Güncel sorularda kullanılan kaynaklar burada görünür.
                    </p>
                  )}
                </div>
              </div>

              <div className="mb-3 space-y-2 text-[11px]">
                <div className="font-semibold text-slate-500">Hızlı ayarlar</div>
                <button
                  onClick={() => setImageMode((value) => !value)}
                  className={cn(
                    'flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left transition',
                    imageMode
                      ? 'border-cyan-300 bg-cyan-300 text-slate-950'
                      : 'border-white/10 bg-white/[0.045] text-slate-300 hover:border-cyan-300/40',
                  )}
                >
                  <span className="inline-flex items-center gap-2">
                    <ImagePlus size={14} /> Görsel modu
                  </span>
                  <span className="text-[10px]">{imageMode ? 'Aktif' : 'Pasif'}</span>
                </button>
                <button
                  onClick={startVoiceImage}
                  disabled={isProcessing}
                  className={cn(
                    'flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left transition',
                    isListening
                      ? 'border-rose-300 bg-rose-300 text-slate-950'
                      : 'border-white/10 bg-white/[0.045] text-slate-300 hover:border-cyan-300/40',
                    isProcessing && 'cursor-not-allowed opacity-50',
                  )}
                >
                  <span className="inline-flex items-center gap-2">
                    <Mic size={14} /> Konuşarak görsel
                  </span>
                  <span className="text-[10px]">{isListening ? 'Dinliyor' : 'Başlat'}</span>
                </button>
                <div className="rounded-lg border border-white/10 bg-slate-950/45 p-3 text-slate-400">
                  <div className="mb-2 text-[10px] font-semibold uppercase text-slate-500">Vision ayarı</div>
                  <div className="grid gap-1.5 text-[11px]">
                    <div className="flex justify-between gap-2">
                      <span>Stil</span>
                      <span className="font-semibold text-slate-200">{imageStyleInfo.label}</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span>Format</span>
                      <span className="font-semibold text-slate-200">{imageAspectInfo.label}</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span>Kalite</span>
                      <span className="font-semibold text-slate-200">{imageQualityInfo.label}</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleNewChat}
                  className="flex w-full items-center justify-between rounded-lg border border-white/10 bg-white/[0.045] px-3 py-2 text-left text-slate-300 transition hover:border-cyan-300/40"
                >
                  <span className="inline-flex items-center gap-2">
                    <MessageSquare size={14} /> Yeni konu başlat
                  </span>
                </button>
              </div>

              <div className="flex min-h-0 flex-1 flex-col rounded-lg border border-white/10 bg-white/[0.045] p-3 text-[11px]">
                <div className="mb-2 flex items-center justify-between text-slate-400">
                  <span className="inline-flex items-center gap-1 font-semibold">
                    <Terminal size={12} /> Sistem akışı
                  </span>
                  <span className="text-[10px] text-slate-500">Son {logs.length || 0} olay</span>
                </div>
                <div className="flex-1 overflow-y-auto rounded-lg bg-slate-950 p-2 text-[10px] text-emerald-200 scrollbar-thin">
                  {logs.length === 0 ? (
                    <div className="text-slate-600">İlk isteğini bekliyor.</div>
                  ) : (
                    logs.map((log) => (
                      <div key={log.id} className="mb-1.5 border-b border-white/10 pb-1 last:border-0 last:pb-0">
                        <span className="text-slate-600">[{log.time}] </span>
                        <span>{log.message}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isSettingsOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-30 flex items-center justify-center bg-slate-950/70 px-4 backdrop-blur-sm"
            onClick={() => setIsSettingsOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.94, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.94, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 22 }}
              onClick={(event) => event.stopPropagation()}
              className="w-full max-w-lg rounded-lg border border-white/10 bg-slate-950 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
                <div>
                  <div className="text-sm font-semibold text-white">Kuvin panel</div>
                  <div className="text-[11px] text-slate-500">Kişilik ve görünüm tercihleri</div>
                </div>
                <button
                  onClick={() => setIsSettingsOpen(false)}
                  className="inline-flex rounded-lg p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-white"
                  aria-label="Paneli kapat"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="max-h-[60vh] space-y-5 overflow-y-auto px-5 py-4 scrollbar-thin">
                <div>
                  <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-slate-300">
                    <Sparkles size={13} /> Koyu tema stili
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-[11px]">
                    {(Object.keys(APPEARANCE_MODES) as AppearanceMode[]).map((item) => (
                      <button
                        key={item}
                        onClick={() => setAppearance(item)}
                        className={cn(
                          'min-h-20 rounded-lg border px-2 py-2 text-left transition',
                          appearance === item
                            ? 'border-cyan-300 bg-cyan-300 text-slate-950'
                            : 'border-white/10 bg-white/[0.045] text-slate-300 hover:border-cyan-300/40',
                        )}
                      >
                        <span className="block font-semibold">{APPEARANCE_MODES[item].label}</span>
                        <span className={cn('mt-1 block text-[10px]', appearance === item ? 'text-slate-800' : 'text-slate-500')}>
                          {APPEARANCE_MODES[item].description}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-slate-300">
                    <User size={13} /> Aktif kişilik
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {PERSONALITIES.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => setPersonality(item)}
                        className={cn(
                          'flex flex-col gap-0.5 rounded-lg border px-3 py-2 text-left text-[11px] transition',
                          personality.id === item.id
                            ? 'border-cyan-300 bg-cyan-300 text-slate-950'
                            : 'border-white/10 bg-white/[0.045] text-slate-300 hover:border-cyan-300/40',
                        )}
                      >
                        <span className="font-semibold">{item.label}</span>
                        <span className={cn('text-[10px]', personality.id === item.id ? 'text-slate-800' : 'text-slate-500')}>
                          {item.description}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-slate-300">
                    <Palette size={13} /> Vurgu rengi
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    {(Object.keys(THEMES) as ThemeId[]).map((item) => (
                      <button
                        key={item}
                        onClick={() => setTheme(item)}
                        className={cn(
                          'flex items-center gap-2 rounded-lg border px-2 py-2 text-left transition',
                          theme === item
                            ? 'border-cyan-300 bg-cyan-300 text-slate-950'
                            : 'border-white/10 bg-white/[0.045] text-slate-300 hover:border-cyan-300/40',
                        )}
                      >
                        <span className={cn('h-4 w-4 rounded-lg border border-white/40', THEMES[item].dot)} />
                        <span>{THEMES[item].label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-slate-300">
                    <Layers3 size={13} /> Chat yoğunluğu
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <button
                      onClick={() => setCompactMode(false)}
                      className={cn(
                        'rounded-lg border px-3 py-2 text-left transition',
                        !compactMode
                          ? 'border-cyan-300 bg-cyan-300 text-slate-950'
                          : 'border-white/10 bg-white/[0.045] text-slate-300 hover:border-cyan-300/40',
                      )}
                    >
                      <span className="block font-semibold">Rahat</span>
                      <span className={cn('text-[10px]', !compactMode ? 'text-slate-800' : 'text-slate-500')}>
                        Daha geniş okuma
                      </span>
                    </button>
                    <button
                      onClick={() => setCompactMode(true)}
                      className={cn(
                        'rounded-lg border px-3 py-2 text-left transition',
                        compactMode
                          ? 'border-cyan-300 bg-cyan-300 text-slate-950'
                          : 'border-white/10 bg-white/[0.045] text-slate-300 hover:border-cyan-300/40',
                      )}
                    >
                      <span className="block font-semibold">Sıkı</span>
                      <span className={cn('text-[10px]', compactMode ? 'text-slate-800' : 'text-slate-500')}>
                        Daha az ekran kaplar
                      </span>
                    </button>
                  </div>
                </div>

                <div className="rounded-lg border border-cyan-300/25 bg-cyan-300/10 p-3 text-[11px] leading-5 text-cyan-50">
                  API anahtarları frontend içinde tutulmaz. Kuvin AI yanıtları hata içerebilir; kişisel verilerini
                  sohbete yazmaman önerilir.
                </div>
              </div>

              <div className="flex items-center justify-end border-t border-white/10 px-5 py-3 text-[11px] text-slate-500">
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
