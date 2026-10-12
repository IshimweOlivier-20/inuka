import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { FeedbackProvider } from './context/FeedbackContext';
import App from './App';
import './index.css';
import { InukaSkeletonTheme } from './components/ui/Skeletons';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <InukaSkeletonTheme>
          <FeedbackProvider>
            <App />
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
