import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import './sionUiPatches';
import './homePremium.css';
import App from './App';
import { initializeMemoryReminderEngine } from './services/memoryReminder';
import { initializeReadingRoomEnhancements } from './readingRoomEnhancements';
import { initializeDataBackup } from './dataBackup';
import { initializeReadingRoomHelp } from './readingRoomHelp';
import { initializeAiExperience } from './aiExperience';
import { initializeReadingUiUnification } from './readingUiUnification';
import { initializeDesignConsistency } from './designConsistency';

initializeDesignConsistency();
initializeAiExperience();
initializeMemoryReminderEngine();
initializeReadingRoomEnhancements();
initializeDataBackup();
initializeReadingRoomHelp();
initializeReadingUiUnification();

function handleLaunchIntent() {
  const params = new URLSearchParams(window.location.search);
  if (params.get('open') !== 'memory') return;

  let attempts = 0;
  const openMemoryTab = () => {
    attempts += 1;
    const button = [...document.querySelectorAll<HTMLButtonElement>('nav button')]
      .find((item) => {
        const label = `${item.getAttribute('aria-label') || ''} ${item.textContent || ''}`;
        return label.includes('암송');
      });

    if (button) {
      button.click();
      params.delete('open');
      const query = params.toString();
      window.history.replaceState({}, '', `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`);
      return;
    }

    if (attempts < 40) window.setTimeout(openMemoryTab, 50);
  };

  window.setTimeout(openMemoryTab, 0);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

handleLaunchIntent();
