import OpenAI from 'openai';

type ImageStyle = 'cinematic' | 'product' | 'logo' | 'photoreal' | 'anime' | 'threeD' | 'interface';
type ImageAspect = 'square' | 'portrait' | 'landscape';
type ImageQuality = 'standard' | 'high' | 'ultra';

const STYLE_PROMPTS: Record<ImageStyle, string> = {
  cinematic:
    'cinematic lighting, premium composition, dramatic depth, refined color grading, realistic atmosphere',
  product:
    'premium product render, clean studio lighting, crisp edges, commercial advertising composition',
  logo:
    'minimal premium logo concept, strong silhouette, clean geometry, vector-like clarity, no mockup text',
  photoreal:
    'photorealistic detail, natural materials, realistic light behavior, high-end editorial look',
  anime:
    'high quality anime illustration, expressive lighting, detailed background, polished character art',
  threeD:
    'high-end 3D render, glossy materials, global illumination, smooth shapes, premium tech aesthetic',
  interface:
    'modern interface mockup, clean dashboard layout, glass panels, readable hierarchy, product design shot',
};

const ASPECTS: Record<ImageAspect, { openaiSize: string; width: number; height: number; label: string }> = {
  square: { openaiSize: '1024x1024', width: 1024, height: 1024, label: '1:1 square' },
  portrait: { openaiSize: '1024x1536', width: 1024, height: 1536, label: '2:3 portrait' },
  landscape: { openaiSize: '1536x1024', width: 1536, height: 1024, label: '3:2 landscape' },
};

const QUALITY_PROMPTS: Record<ImageQuality, string> = {
  standard: 'clean, coherent, production-ready quality',
  high: 'high detail, sharp focal point, polished premium quality',
  ultra:
    'ultra detailed, expert art direction, precise composition, refined lighting, professional production quality',
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

function normalizeOption<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === 'string' && allowed.includes(value as T) ? (value as T) : fallback;
}

function buildImagePrompt(prompt: string, style: ImageStyle, aspect: ImageAspect, quality: ImageQuality) {
  return [
    'Create a premium, production-ready image for Kuvin AI.',
    `User idea: ${prompt}`,
    `Style direction: ${STYLE_PROMPTS[style]}.`,
    `Frame: ${ASPECTS[aspect].label}.`,
    `Quality target: ${QUALITY_PROMPTS[quality]}.`,
    'Avoid low quality, blur, distorted anatomy, random text, watermark, logo artifacts, broken hands, messy layout.',
    'If text is requested, keep it short, clean and readable; otherwise do not add text.',
  ].join('\n');
}

function createPollinationsUrl(prompt: string, aspect: ImageAspect) {
  const size = ASPECTS[aspect];
  const params = new URLSearchParams({
    width: String(size.width),
    height: String(size.height),
    nologo: 'true',
    enhance: 'true',
    safe: 'true',
    seed: String(Date.now()),
  });

  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?${params.toString()}`;
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST requests are supported.' });
  }

  const body = parseBody(req.body);
  const prompt = typeof body.prompt === 'string' ? body.prompt.trim().slice(0, 2400) : '';
  const style = normalizeOption<ImageStyle>(
    body.style,
    ['cinematic', 'product', 'logo', 'photoreal', 'anime', 'threeD', 'interface'],
    'cinematic',
  );
  const aspect = normalizeOption<ImageAspect>(body.aspect, ['square', 'portrait', 'landscape'], 'square');
  const quality = normalizeOption<ImageQuality>(body.quality, ['standard', 'high', 'ultra'], 'high');

  if (!prompt) {
    return res.status(400).json({ error: 'Image prompt is required.' });
  }

  const finalPrompt = buildImagePrompt(prompt, style, aspect, quality);
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1';

  res.setHeader('Cache-Control', 'no-store');

  if (apiKey) {
    try {
      const client = new OpenAI({ apiKey });
      const response = await client.images.generate({
        model,
        prompt: finalPrompt,
        size: ASPECTS[aspect].openaiSize,
        n: 1,
        quality: quality === 'standard' ? 'medium' : 'high',
      } as any);

      const image = response.data?.[0] as any;
      const imageUrl = image?.b64_json ? `data:image/png;base64,${image.b64_json}` : image?.url;

      if (imageUrl) {
        return res.status(200).json({
          imageUrl,
          prompt: finalPrompt,
          provider: 'openai',
          model,
          aspect,
          style,
          quality,
        });
      }
    } catch (error) {
      console.error('OpenAI image generation failed, falling back to Pollinations:', error);
    }
  }

  return res.status(200).json({
    imageUrl: createPollinationsUrl(finalPrompt, aspect),
    prompt: finalPrompt,
    provider: 'pollinations',
    model: 'pollinations-image',
    aspect,
    style,
    quality,
  });
}
