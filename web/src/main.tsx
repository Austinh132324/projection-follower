import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AuthProvider } from './auth';
import App from './App';
import './index.css';

// Lock the app shell to the real usable height. iOS standalone (home-screen)
// PWAs miscompute 100vh/100dvh — with a translucent status bar they subtract the
// safe areas, so the shell ends short and the bottom nav floats up off the
// bottom. window.innerHeight always reports the true screen height there, so we
// mirror it into --app-height (see .app in index.css). Kept in sync on rotate.
function lockAppHeight() {
  document.documentElement.style.setProperty('--app-height', `${window.innerHeight}px`);
}
lockAppHeight();
window.addEventListener('resize', lockAppHeight);
window.addEventListener('orientationchange', () => setTimeout(lockAppHeight, 120));

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
);
