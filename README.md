# Kuantist

Kuantist, React ve Vite ile geliştirilmiş Türkçe odaklı bir yapay zeka sohbet arayüzüdür. Metin sohbeti, kişilik modları, web arama bağlamı, görsel üretim ve yedek model akışı içerir.

## Özellikler

- OpenAI destekli güvenli Vercel API rotası: `/api/chat`
- Bytez tabanlı yedek sohbet motoru
- Tavily ile güncel arama bağlamı
- Pollinations tabanlı görsel üretim modu
- Çoklu sohbet geçmişi ve kişilik modları
- Tema seçenekleri ve sistem akışı paneli

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
VITE_BYTEZ_API_KEY=
VITE_TAVILY_API_KEY=
```

Vercel üretim ortamında gerçek yapay zeka sohbeti için `OPENAI_API_KEY` tanımlı olmalı. Key yoksa uygulama kilitlenmez; `/api/chat` demo yardımcı cevabı döndürür. `VITE_BYTEZ_API_KEY` yedek motor için, `VITE_TAVILY_API_KEY` ise internet araması için kullanılır.

## Komutlar

```powershell
npm run dev
npm run build
npm run preview
```

## Güvenlik Notu

OpenAI anahtarı frontend tarafına konulmaz; `/api/chat` Vercel fonksiyonu üzerinden sunucu tarafında kullanılır. Daha önce repoda `.env` dosyası tutulduysa ilgili anahtarları yenilemek iyi olur.
