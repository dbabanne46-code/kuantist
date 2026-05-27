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

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: 'OPENAI_API_KEY is not configured on the server.',
    });
  }

  const body = parseBody(req.body);
  const messages = normalizeMessages(body.messages);
  const mode = typeof body.mode === 'string' ? body.mode : 'kuantist';
  const searchContext =
    typeof body.searchContext === 'string' ? body.searchContext.slice(0, 5000) : '';

  if (!messages.length) {
    return res.status(400).json({ error: 'At least one message is required.' });
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
    return res.status(500).json({
      error: 'The assistant could not generate a response.',
    });
  }
}
