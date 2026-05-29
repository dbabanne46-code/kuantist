import OpenAI from 'openai';

type ImageStyle =
  | 'architecture'
  | 'cinematic'
  | 'product'
  | 'logo'
  | 'photoreal'
  | 'anime'
  | 'threeD'
  | 'interface';
type ImageAspect = 'square' | 'portrait' | 'landscape';
type ImageQuality = 'standard' | 'high' | 'ultra';
type ImageIntent = 'architectural_plan' | 'general_image';

const STYLE_PROMPTS: Record<ImageStyle, string> = {
  architecture:
    'architectural floor plan, technical drafting, top-down orthographic view, black and white blueprint, precise walls, doors, windows, columns, dimensions, scale bar, room labels',
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

function detectImageIntent(prompt: string): ImageIntent {
  const lower = prompt.toLocaleLowerCase('tr-TR');
  const architecturalSignals =
    /(\bkat plan[ıi]\b|\boturma plan[ıi]\b|\bvaziyet plan[ıi]\b|\bmimari\b|\bplan çiz\b|\bplan ciz\b|\bfloor plan\b|\bblueprint\b|\barchitectural\b|\byatak odas[ıi]\b|\bbanyo\b|\bamerikan mutfak\b|\bkolon\b|\bta[şs][ıi]y[ıi]c[ıi]\b|\bölçü\b|\bolcu\b|\bmetrekare\b|\bkesit\b|\bgörünüş\b|\bgorunus\b)/iu;

  return architecturalSignals.test(lower) ? 'architectural_plan' : 'general_image';
}

function extractArchitecturalRequirements(prompt: string) {
  const lower = prompt.toLocaleLowerCase('tr-TR');
  const requirements: string[] = [];

  const bedroomMatch = lower.match(/(\d+)\s*(yatak odal[ıi]|yatak odas[ıi]|oda)/iu);
  if (bedroomMatch) requirements.push(`exactly ${bedroomMatch[1]} bedrooms labelled "Yatak Odası"`);

  const bathroomMatch = lower.match(/(\d+)\s*(banyol[uu]|banyo)/iu);
  if (bathroomMatch) requirements.push(`exactly ${bathroomMatch[1]} bathrooms labelled "Banyo"`);

  if (/amerikan mutfak|açık mutfak|acik mutfak|open kitchen/iu.test(lower)) {
    requirements.push('an open American kitchen connected to the living and dining area');
  }

  if (/ta[şs][ıi]y[ıi]c[ıi]|kolon|column/iu.test(lower)) {
    requirements.push('visible load-bearing columns as dark filled square structural markers');
  }

  if (/modern|modern mimari/iu.test(lower)) {
    requirements.push('modern residential planning logic with clean circulation');
  }

  return requirements;
}

function buildArchitecturalPrompt(prompt: string, aspect: ImageAspect, quality: ImageQuality) {
  const requirements = extractArchitecturalRequirements(prompt);

  return [
    'TASK TYPE: ARCHITECTURAL FLOOR PLAN / TECHNICAL DRAWING.',
    'Create a top-down black and white architectural floor plan, not a decorative interior render.',
    `User request: ${prompt}`,
    requirements.length ? `Must satisfy: ${requirements.join('; ')}.` : '',
    `Frame: ${ASPECTS[aspect].label}.`,
    `Quality target: ${QUALITY_PROMPTS[quality]}.`,
    'Use Turkish room labels where possible: Salon, Amerikan Mutfak, Yatak Odası, Banyo, Ebeveyn Banyosu, Koridor, Giriş, Teras.',
    'Include wall thickness, door swings, windows, furniture symbols only as plan symbols, dimension lines, grid bubbles, north arrow, scale bar and title block.',
    'Show structural/load-bearing columns clearly as dark filled squares or circles aligned with walls or grid axes.',
    'STRICT NEGATIVE: no 3D perspective, no living room render, no showroom scene, no single room composition, no photoreal furniture scene, no colored interior decoration, no random house exterior.',
    'The output should look like a professional architectural drawing suitable for review, with readable layout hierarchy.',
  ]
    .filter(Boolean)
    .join('\n');
}

function buildGeneralImagePrompt(prompt: string, style: ImageStyle, aspect: ImageAspect, quality: ImageQuality) {
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

function buildImagePrompt(prompt: string, style: ImageStyle, aspect: ImageAspect, quality: ImageQuality) {
  const intent = detectImageIntent(prompt);
  if (intent === 'architectural_plan') {
    return {
      intent,
      style: 'architecture' as ImageStyle,
      aspect: 'landscape' as ImageAspect,
      prompt: buildArchitecturalPrompt(prompt, 'landscape', quality),
    };
  }

  return {
    intent,
    style,
    aspect,
    prompt: buildGeneralImagePrompt(prompt, style, aspect, quality),
  };
}

function createPollinationsUrl(prompt: string, aspect: ImageAspect) {
  const size = ASPECTS[aspect];
  const params = new URLSearchParams({
    width: String(size.width),
    height: String(size.height),
    model: 'flux',
    nologo: 'true',
    enhance: 'true',
    safe: 'true',
    private: 'true',
    seed: String(Date.now()),
  });

  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?${params.toString()}`;
}

function extractResponseImage(response: any) {
  const outputs = Array.isArray(response?.output) ? response.output : [];
  for (const output of outputs) {
    if (output?.type === 'image_generation_call' && typeof output.result === 'string') {
      return `data:image/png;base64,${output.result}`;
    }
    if (Array.isArray(output?.content)) {
      for (const content of output.content) {
        if (content?.type === 'output_image' && typeof content.image_base64 === 'string') {
          return `data:image/png;base64,${content.image_base64}`;
        }
      }
    }
  }

  return '';
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST requests are supported.' });
  }

  const body = parseBody(req.body);
  const prompt = typeof body.prompt === 'string' ? body.prompt.trim().slice(0, 2400) : '';
  const style = normalizeOption<ImageStyle>(
    body.style,
    ['architecture', 'cinematic', 'product', 'logo', 'photoreal', 'anime', 'threeD', 'interface'],
    'cinematic',
  );
  const aspect = normalizeOption<ImageAspect>(body.aspect, ['square', 'portrait', 'landscape'], 'square');
  const quality = normalizeOption<ImageQuality>(body.quality, ['standard', 'high', 'ultra'], 'high');

  if (!prompt) {
    return res.status(400).json({ error: 'Image prompt is required.' });
  }

  const planned = buildImagePrompt(prompt, style, aspect, quality);
  const finalPrompt = planned.prompt;
  const apiKey = process.env.OPENAI_API_KEY;
  const requestedModel = process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1.5';
  const modelCandidates = Array.from(new Set([requestedModel, 'gpt-image-1.5', 'gpt-image-1']));

  res.setHeader('Cache-Control', 'no-store');

  if (apiKey) {
    const client = new OpenAI({ apiKey });
    const reasoningModel = process.env.OPENAI_IMAGE_REASONING_MODEL || 'gpt-5';

    try {
      const response = await client.responses.create({
        model: reasoningModel,
        input: [
          finalPrompt,
          'Generate the image now. Follow the task type exactly. If this is an architectural plan, the output must be a top-down technical floor plan, not an interior render.',
        ].join('\n\n'),
        tools: [
          {
            type: 'image_generation',
            model: modelCandidates[0],
            size: ASPECTS[planned.aspect].openaiSize,
            quality: quality === 'standard' ? 'medium' : 'high',
          },
        ],
        tool_choice: { type: 'image_generation' },
      } as any);

      const imageUrl = extractResponseImage(response);
      if (imageUrl) {
        return res.status(200).json({
          imageUrl,
          prompt: finalPrompt,
          provider: 'openai-responses',
          model: `${reasoningModel}+${modelCandidates[0]}`,
          intent: planned.intent,
          aspect: planned.aspect,
          style: planned.style,
          quality,
        });
      }
    } catch (error) {
      console.error('OpenAI Responses image generation failed, falling back to Images API:', error);
    }

    for (const model of modelCandidates) {
      try {
        const response = await client.images.generate({
          model,
          prompt: finalPrompt,
          size: ASPECTS[planned.aspect].openaiSize,
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
            intent: planned.intent,
            aspect: planned.aspect,
            style: planned.style,
            quality,
          });
        }
      } catch (error) {
        console.error(`OpenAI image generation failed with ${model}:`, error);
      }
    }
  }

  return res.status(200).json({
    imageUrl: createPollinationsUrl(finalPrompt, planned.aspect),
    prompt: finalPrompt,
    provider: 'pollinations',
    model: 'pollinations-image',
    intent: planned.intent,
    aspect: planned.aspect,
    style: planned.style,
    quality,
  });
}
