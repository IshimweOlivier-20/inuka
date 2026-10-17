import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { FeedbackProvider } from './context/FeedbackContext';
import App from './App';
import './index.css';
import { InukaSkeletonTheme } from './components/ui/Skeletons';
import { applyA11y, loadA11y } from './utils/a11y';
import ReadAloud from './components/accessibility/ReadAloud';

// Accessibility settings saved on this device apply before the first paint.
applyA11y(loadA11y(), { save: false });

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <InukaSkeletonTheme>
          <FeedbackProvider>
            <App />
            <ReadAloud />
          </FeedbackProvider>
        </InukaSkeletonTheme>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);

// Installable app + offline lessons (spec §19.4). Only in the built site (npm run build / preview / production).
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => { navigator.serviceWorker.register('/sw.js').catch(() => {}); });
}
