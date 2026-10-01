import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import App from './App';
import './index.css';
import { InukaSkeletonTheme } from './components/ui/Skeletons';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <InukaSkeletonTheme>
          <App />
        </InukaSkeletonTheme>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
