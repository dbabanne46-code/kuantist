import OpenAI from 'openai';

type ChatRole = 'user' | 'assistant';

type ChatMessage = {
  role: ChatRole;
  content: string;
};

const MAX_MESSAGES = 28;
const MAX_MESSAGE_CHARS = 6000;

const BASE_ASSISTANT_PROMPT = `
Sen Kuantist adli genel amacli bir yapay zeka yardimcisisin.
Turkce konusan kullaniciya dogal, acik, guvenilir ve uygulanabilir cevaplar verirsin.

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
`.trim();

const MODE_PROMPTS: Record<string, string> = {
  kuantist: 'Dengeli, analitik ve sakin anlatim kullan. Gerektiginde maddelerle yaz.',
  developer: 'Kidemli yazilim gelistirici gibi davran. Kodda temiz, uygulanabilir ve dogrudan ol.',
  writer: 'Yaratici metinlerde akici, canli ve hayal gucu yuksek bir dil kullan.',
  friend: 'Samimi ve destekleyici sohbet et. Konuyu dagitmadan hafif ve dogal kal.',
};

function createLocalAnswer(messages: ChatMessage[], mode: string) {
  const lastMessage = messages[messages.length - 1]?.content.trim() || '';
  const lower = lastMessage.toLocaleLowerCase('tr-TR');
  const intro =
    'Kuantist demo modunda calisiyorum. Gercek model anahtari baglaninca daha derin ve dogal cevap verebilirim; simdilik sana pratik bir baslangic cevabi hazirladim.';

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
      const role = item.role === 'assistant' ? 'assistant' : 'user';
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
  const mode = typeof body.mode === 'string' ? body.mode : 'kuantist';
  const searchContext =
    typeof body.searchContext === 'string' ? body.searchContext.slice(0, 5000) : '';

  if (!messages.length) {
    return res.status(400).json({ error: 'At least one message is required.' });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(200).json({
      answer: createLocalAnswer(messages, mode),
      model: 'local-demo',
    });
  }

  const client = new OpenAI({ apiKey });
  const model = process.env.OPENAI_MODEL || 'gpt-5.5';
  const modePrompt = MODE_PROMPTS[mode] ?? MODE_PROMPTS.kuantist;
  const instructions = [BASE_ASSISTANT_PROMPT, modePrompt, searchContext].filter(Boolean).join('\n\n');

  try {
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
    });
  } catch (error) {
    console.error(error);
    return res.status(200).json({
      answer: createLocalAnswer(messages, mode),
      model: 'local-demo',
    });
  }
}
