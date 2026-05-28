import OpenAI from 'openai';

type ChatRole = 'user' | 'assistant';

type ChatMessage = {
  role: ChatRole;
  content: string;
};

type WebSource = {
  title: string;
  url: string;
  snippet: string;
};

const MAX_MESSAGES = 28;
const MAX_MESSAGE_CHARS = 6000;
const MAX_WEB_SOURCES = 5;

const BASE_ASSISTANT_PROMPT = `
Sen Kuvin AI adli genel amacli bir yapay zeka yardimcisisin.
Turkce konusan kullaniciya dogal, acik, guvenilir ve uygulanabilir cevaplar verirsin.
Kuvin AI markasinin ana fikri "Think Beyond": dusunmeyi, uretmeyi ve tasarlamayi tek modern asistanda birlestirirsin.

Davranis ilkelerin:
- Kullanici Turkce konusursa Turkce cevap ver.
- Kod, yazi, fikir, ogrenme, planlama, ozetleme ve problem cozmede somut yardim sun.
- Gerektiginde kisa soru sor, ama cogu durumda makul varsayimla ilerle.
- Emin olmadigin bilgiyi kesinmis gibi soyleme.
- Tibbi, hukuki, finansal veya guvenlik acisindan hassas konularda temkinli ol.
- Zararli, yasa disi veya baskalarina zarar verecek isteklerde yardimci olma; guvenli alternatif oner.
- Cevaplari gereksiz uzatma; kullanici ayrinti isterse derinles.
- Kullaniciya sadece fikir verme, mumkunse sonraki pratik adimi da goster.

Uslubun samimi, sakin, zeki, destekleyici ve net olsun.
Guncel bilgi veya internet verisi kullandiginda kaynaklara sadik kal, emin olmadigin yerde bunu belirt.
Web arastirma verisi varsa sadece kaynaklardan dogrulanabilen bilgileri kullan; kaynakta olmayan baslik, tarih, sayi veya isim uydurma.
`.trim();

const MODE_PROMPTS: Record<string, string> = {
  kuvin: 'Dengeli, analitik ve sakin anlatim kullan. Gerektiginde maddelerle yaz.',
  developer: 'Kidemli yazilim gelistirici gibi davran. Kodda temiz, uygulanabilir ve dogrudan ol.',
  writer: 'Yaratici metinlerde akici, canli ve hayal gucu yuksek bir dil kullan.',
  friend: 'Samimi ve destekleyici sohbet et. Konuyu dagitmadan hafif ve dogal kal.',
};

function createLocalAnswer(messages: ChatMessage[], mode: string) {
  const lastMessage = messages[messages.length - 1]?.content.trim() || '';
  const lower = lastMessage.toLocaleLowerCase('tr-TR');
  const intro =
    'Kuvin AI demo modunda calisiyor. Gercek model anahtari baglaninca daha derin ve dogal cevap verebilirim; simdilik sana pratik bir baslangic cevabi hazirladim.';

  if (!lastMessage) {
    return `${intro}\n\nBana ne yapmak istedigini yaz: kod, metin, plan, fikir veya ogrenmek istedigin konu.`;
  }

  if (lower.includes('kod') || lower.includes('site') || lower.includes('uygulama')) {
    return `${intro}\n\nBu is icin en mantikli yol:\n\n1. Ne yapacagini tek cumleyle netlestir.\n2. Gerekli ekranlari veya ozellikleri listele.\n3. Once calisan basit surumu kur.\n4. Sonra tasarim, hata kontrolleri ve yayina alma adimlarini ekle.\n\nSenin yazdigin istek: "${lastMessage}"\n\nIstersen bunu bir gorev planina veya dosya dosya kod taslagina cevirebilirim.`;
  }

  if (lower.includes('yaz') || lower.includes('metin') || mode === 'writer') {
    return `${intro}\n\nMetin icin taslak:\n\nBaslik: ${lastMessage.slice(0, 60)}\n\nGiris: Konuyu sade ve dikkat cekici bir cumleyle ac.\nGelisme: Ana fikri 2-3 net noktaya bol.\nSonuc: Okuyucuya ne yapmasi gerektigini soyleyen kisa bir kapanis yap.\n\nIstersen bunu daha samimi, resmi veya etkileyici bir dille yeniden yazabilirim.`;
  }

  if (lower.includes('plan') || lower.includes('ne yap')) {
    return `${intro}\n\nKisa plan:\n\n1. Hedefi belirle: Tam olarak ne sonuc istiyorsun?\n2. Gerekenleri ayir: Bilgi, arac, zaman ve dosyalar.\n3. En kucuk calisan adimi yap.\n4. Sonucu test et.\n5. Eksikleri duzeltip tekrar dene.\n\nBu istegi daha net bir is planina cevirmemi istersen hedefini ve elindeki imkanlari yaz.`;
  }

  return `${intro}\n\nAnladigim kadariyla sunu istiyorsun: "${lastMessage}"\n\nSana yardim etmek icin once bunu kucuk parcalara bolebiliriz:\n\n1. Amac: Ne elde etmek istiyorsun?\n2. Engel: Su an nerede takildin?\n3. Cikti: Cevap, kod, plan, metin veya fikir mi lazim?\n\nBunlardan birini yazarsan devamini daha net hazirlarim.`;
}

function buildPlainPrompt(messages: ChatMessage[], mode: string, searchContext: string) {
  const modePrompt = MODE_PROMPTS[mode] ?? MODE_PROMPTS.kuvin;
  const chat = messages
    .map((message) => `${message.role === 'assistant' ? 'Asistan' : 'Kullanici'}: ${message.content}`)
    .join('\n');

  return [
    BASE_ASSISTANT_PROMPT,
    modePrompt,
    searchContext,
    'Asagidaki sohbeti dogal Turkce ile cevapla. Sadece asistan cevabini yaz.',
    chat,
    'Asistan:',
  ]
    .filter(Boolean)
    .join('\n\n');
}

function getLastUserMessage(messages: ChatMessage[]) {
  return [...messages].reverse().find((message) => message.role === 'user')?.content.trim() || '';
}

function shouldUseWebSearch(messages: ChatMessage[], enabled: boolean) {
  if (!enabled) return false;

  const query = getLastUserMessage(messages);
  if (!query || query.length < 10) return false;

  const lower = query.toLocaleLowerCase('tr-TR');
  const casual = /^(selam|merhaba|naber|nasilsin|nasılsın|test|calisiyor musun|çalışıyor musun)[\s?!.,]*$/iu;
  if (casual.test(lower)) return false;

  return (
    lower.startsWith('ara ') ||
    /\b(guncel|güncel|bugun|bugün|son durum|son dakika|haber|fiyat|hava durumu|dolar|euro|altin|altın|borsa|kripto|kimdir|nerede|ne zaman|kac|kaç|202[4-9]|kaynak)\b/iu.test(
      lower,
    ) ||
    query.length > 36
  );
}

function decodeDuckDuckGoUrl(rawUrl: string) {
  try {
    const url = new URL(rawUrl);
    const encoded = url.searchParams.get('uddg');
    return encoded ? decodeURIComponent(encoded) : rawUrl;
  } catch {
    return rawUrl;
  }
}

function stripMarkdown(value: string) {
  return value
    .replace(/!\[[^\]]*]\([^)]+\)/g, '')
    .replace(/\[([^\]]+)]\([^)]+\)/g, '$1')
    .replace(/\*{4}/g, ' ')
    .replace(/\*\*/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseDuckDuckGoMarkdown(markdown: string): WebSource[] {
  const sources: WebSource[] = [];
  const blocks = markdown.split(/\n(?=## \[)/);

  for (const block of blocks) {
    if (sources.length >= MAX_WEB_SOURCES) break;

    const header = block.match(/^## \[([^\]]+)]\(([^)]+)\)/);
    if (!header) continue;

    const title = stripMarkdown(header[1]);
    const url = decodeDuckDuckGoUrl(header[2]);
    const body = block.replace(header[0], '');
    const cleanLines = body
      .split('\n')
      .map(stripMarkdown)
      .filter(
        (line) =>
          line.length > 40 &&
          !/duckduckgo|https?:\/\/|www\.|feedback|image \d+/iu.test(line) &&
          !/^\d{4}-\d{2}-\d{2}/u.test(line),
      );
    const snippet =
      cleanLines.find((line) => line.length > 70) ||
      cleanLines[0] ||
      stripMarkdown(body).slice(0, 320);

    if (!title || !url || url.includes('duckduckgo.com/feedback') || sources.some((source) => source.url === url)) {
      continue;
    }

    sources.push({ title, url, snippet: snippet.slice(0, 320) });
  }

  return sources;
}

async function searchWithTavily(query: string): Promise<WebSource[]> {
  const apiKey = process.env.TAVILY_API_KEY || process.env.VITE_TAVILY_API_KEY;
  if (!apiKey) return [];

  const response = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      search_depth: 'advanced',
      max_results: MAX_WEB_SOURCES,
    }),
  });

  if (!response.ok) return [];

  const data = (await response.json()) as any;
  if (!Array.isArray(data.results)) return [];

  return data.results
    .map((result: any) => ({
      title: String(result.title || result.url || 'Kaynak'),
      url: String(result.url || ''),
      snippet: String(result.content || '').slice(0, 320),
    }))
    .filter((source: WebSource) => source.url)
    .slice(0, MAX_WEB_SOURCES);
}

async function searchWithDuckDuckGo(query: string): Promise<WebSource[]> {
  const url = `https://duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  const readerUrl = `https://r.jina.ai/http://${url}`;
  const response = await fetch(readerUrl, {
    headers: { Accept: 'text/plain' },
  });

  if (!response.ok) return [];

  return parseDuckDuckGoMarkdown(await response.text());
}

async function collectWebContext(messages: ChatMessage[], enabled: boolean) {
  const query = getLastUserMessage(messages);
  if (!shouldUseWebSearch(messages, enabled)) {
    return { context: '', sources: [] as WebSource[] };
  }

  let sources: WebSource[] = [];
  try {
    sources = await searchWithTavily(query);
  } catch (error) {
    console.error('Tavily search failed:', error);
  }

  if (!sources.length) {
    try {
      sources = await searchWithDuckDuckGo(query);
    } catch (error) {
      console.error('DuckDuckGo search failed:', error);
    }
  }

  const context = sources.length
    ? [
        '[WEB ARASTIRMA VERILERI]',
        `Sorgu: ${query}`,
        `Tarih: ${new Date().toLocaleDateString('tr-TR')}`,
        ...sources.map(
          (source, index) => `${index + 1}. ${source.title}\nURL: ${source.url}\nOzet: ${source.snippet}`,
        ),
      ].join('\n\n')
    : '';

  return { context, sources };
}

async function createPollinationsAnswer(messages: ChatMessage[], mode: string, searchContext: string) {
  const prompt = buildPlainPrompt(messages, mode, searchContext).slice(0, 12000);
  const response = await fetch(`https://text.pollinations.ai/${encodeURIComponent(prompt)}`, {
    headers: {
      Accept: 'text/plain',
    },
  });

  if (!response.ok) {
    throw new Error(`Pollinations request failed with ${response.status}`);
  }

  const answer = (await response.text()).trim();
  if (!answer) {
    throw new Error('Pollinations returned an empty response');
  }

  return answer;
}

function parseBody(body: unknown): Record<string, unknown> {
  if (!body) return {};
  if (typeof body === 'string') {
    try {
      return JSON.parse(body);
    } catch {
      return {};
    }
  }
  if (typeof body === 'object') return body as Record<string, unknown>;
  return {};
}

function normalizeMessages(value: unknown): ChatMessage[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
    .map((item) => {
      const role: ChatRole = item.role === 'assistant' ? 'assistant' : 'user';
      const rawContent = typeof item.content === 'string' ? item.content : '';
      return {
        role,
        content: rawContent.slice(0, MAX_MESSAGE_CHARS),
      };
    })
    .filter((item) => item.content.trim().length > 0)
    .slice(-MAX_MESSAGES);
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST requests are supported.' });
  }

  const body = parseBody(req.body);
  const messages = normalizeMessages(body.messages);
  const mode = typeof body.mode === 'string' ? body.mode : 'kuvin';
  const webEnabled = body.webEnabled !== false;
  const searchContext =
    typeof body.searchContext === 'string' ? body.searchContext.slice(0, 6000) : '';

  if (!messages.length) {
    return res.status(400).json({ error: 'At least one message is required.' });
  }

  const model = process.env.OPENAI_MODEL || 'gpt-5.5';
  const modePrompt = MODE_PROMPTS[mode] ?? MODE_PROMPTS.kuvin;
  const webContext = await collectWebContext(messages, webEnabled);
  const combinedSearchContext = [searchContext, webContext.context].filter(Boolean).join('\n\n');
  const instructions = [
    BASE_ASSISTANT_PROMPT,
    modePrompt,
    `Bugunun tarihi: ${new Date().toLocaleDateString('tr-TR')}.`,
    combinedSearchContext,
  ]
    .filter(Boolean)
    .join('\n\n');
  const apiKey = process.env.OPENAI_API_KEY;

  if (apiKey) {
    try {
      const client = new OpenAI({ apiKey });
      const response = await client.responses.create({
        model,
        instructions,
        input: messages as any,
        store: false,
        reasoning: { effort: 'medium' },
      } as any);

      return res.status(200).json({
        answer: response.output_text,
        model,
        sources: webContext.sources,
        usedWeb: webContext.sources.length > 0,
      });
    } catch (error) {
      console.error('OpenAI request failed, falling back to Pollinations:', error);
    }
  }

  try {
    const answer = await createPollinationsAnswer(messages, mode, combinedSearchContext);
    return res.status(200).json({
      answer,
      model: 'pollinations',
      sources: webContext.sources,
      usedWeb: webContext.sources.length > 0,
    });
  } catch (error) {
    console.error('Pollinations request failed, falling back to local demo:', error);
    return res.status(200).json({
      answer: createLocalAnswer(messages, mode),
      model: 'local-demo',
      sources: webContext.sources,
      usedWeb: webContext.sources.length > 0,
    });
  }
}
