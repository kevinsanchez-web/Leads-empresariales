import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { AuthGate } from './components/AuthGate.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import { EmulatorBadge } from './components/EmulatorBadge.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <EmulatorBadge />
      <AuthGate>
        <App />
      </AuthGate>
    </ErrorBoundary>
  </StrictMode>,
);
