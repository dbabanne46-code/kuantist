import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

type InstallPromptChoice = {
  outcome: 'accepted' | 'dismissed';
  platform: string;
};

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<InstallPromptChoice>;
}

let deferredInstallPrompt: BeforeInstallPromptEvent | null = null;
let installButton: HTMLButtonElement | null = null;

const isStandaloneMode = () =>
  window.matchMedia('(display-mode: standalone)').matches || Boolean((navigator as any).standalone);

const showInstallHelp = () => {
  window.alert(
    'Kuvin AI kurulumu:\n\nBilgisayar: Chrome/Edge adres cubugundaki yukle simgesine basin.\nAndroid: Chrome menusunden "Uygulamayi yukle" veya "Ana ekrana ekle" secin.\niPhone: Safari Paylas menusunden "Ana Ekrana Ekle" secin.',
  );
};

const ensureInstallButton = () => {
  if (isStandaloneMode() || installButton) return;

  installButton = document.createElement('button');
  installButton.type = 'button';
  installButton.textContent = "Kuvin AI'ı yükle";
  installButton.setAttribute('aria-label', 'Kuvin AI uygulamasını yükle');
  installButton.style.cssText = [
    'position:fixed',
    'right:14px',
    'bottom:76px',
    'z-index:50',
    'border:1px solid rgba(34,211,238,.34)',
    'background:linear-gradient(135deg,rgba(8,47,73,.96),rgba(15,23,42,.96))',
    'color:#ecfeff',
    'border-radius:999px',
    'box-shadow:0 18px 45px rgba(8,145,178,.28)',
    'font:600 12px system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
    'padding:11px 15px',
    'cursor:pointer',
    'backdrop-filter:blur(12px)',
  ].join(';');

  installButton.addEventListener('click', async () => {
    if (!deferredInstallPrompt) {
      showInstallHelp();
      return;
    }

    await deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    installButton?.remove();
    installButton = null;
  });

  document.body.appendChild(installButton);
};

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((error) => {
      console.warn('Kuvin AI service worker could not be registered:', error);
    });
    ensureInstallButton();
  });
}

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  deferredInstallPrompt = event as BeforeInstallPromptEvent;
  ensureInstallButton();
});

window.addEventListener('appinstalled', () => {
  deferredInstallPrompt = null;
  installButton?.remove();
  installButton = null;
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
