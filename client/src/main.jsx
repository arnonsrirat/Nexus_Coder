import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import ErrorBoundary from './components/ErrorBoundary';
import { AppProvider } from './context/AppContext';

// Monaco is NOT imported here on purpose - it is several megabytes and is
// loaded lazily by the editor components, so the shell paints immediately.

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <AppProvider>
        <App />
      </AppProvider>
    </ErrorBoundary>
  </StrictMode>,
);

// Dismiss the inline boot screen once React has actually rendered.
requestAnimationFrame(() => {
  const boot = document.getElementById('boot');
  if (!boot) return;
  boot.dataset.done = '1';
  clearTimeout(window.__bootTimer);
  boot.style.transition = 'opacity .25s ease';
  boot.style.opacity = '0';
  setTimeout(() => boot.remove(), 260);
});
