# Kuvin AI

Kuvin AI, React ve Vite ile geliştirilmiş Türkçe odaklı bir AI sohbet ve görsel stüdyo uygulamasıdır. Marka vaadi: **Think Beyond**. Metin sohbeti, web kaynaklı araştırma, görsel üretim, hazır prompt kütüphanesi, PWA kurulumu ve yedek model akışı içerir.

## Özellikler

- OpenAI destekli güvenli Vercel API rotası: `/api/chat`
- OpenAI çalışmadığında anahtarsız Pollinations metin yedeği
- Bytez tabanlı eski yedek sohbet motoru
- Tavily ile güncel arama bağlamı
- OpenAI image modeli varsa sunucu taraflı görsel üretim, yoksa Pollinations fallback
- Konuşarak görsel oluşturma: Web Speech API ile prompt dikte edip otomatik üretim
- Stil, format ve kalite seçenekleriyle Kuvin Vision Pro akışı
- Çoklu sohbet geçmişi ve kişilik modları
- PWA kurulumu: bilgisayar ve mobilde uygulama gibi açılır
- Kuvin AI markalı SEO, paylaşım görseli ve favicon assetleri

## Kurulum

```powershell
npm install
npm run dev
```

## Ortam Değişkenleri

Lokal geliştirme için `.env.example` dosyasını `.env` olarak kopyalayabilirsin.

```env
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5.5
OPENAI_IMAGE_MODEL=gpt-image-1
VITE_BYTEZ_API_KEY=
VITE_TAVILY_API_KEY=
```

Vercel üretim ortamında en iyi sohbet kalitesi için `OPENAI_API_KEY` tanımlı olmalı. Key yoksa veya OpenAI hata verirse uygulama kilitlenmez; `/api/chat` anahtarsız Pollinations metin yedeğine düşer. `VITE_BYTEZ_API_KEY` eski yedek motor için, `VITE_TAVILY_API_KEY` ise internet araması için kullanılır.

## Komutlar

```powershell
npm run dev
npm run build
npm run preview
```

## Güvenlik Notu

OpenAI anahtarı frontend tarafına konulmaz; `/api/chat` Vercel fonksiyonu üzerinden sunucu tarafında kullanılır. Kullanıcılar kişisel bilgilerini paylaşmamalıdır.
