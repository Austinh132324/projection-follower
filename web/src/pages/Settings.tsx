import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../auth';

/**
 * Force the freshest version of the app: unregister any service workers, clear
 * the Cache Storage API, then reload with a cache-busting query so the browser
 * (and a home-screen PWA) re-fetches index.html and the new hashed assets.
 * Does NOT touch localStorage, so your saved bets are kept.
 */
async function checkForUpdate() {
  try {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    }
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
  } catch {
    /* best effort */
  }
  const url = location.origin + location.pathname + '?v=' + Date.now();
  location.replace(url);
}

export function Settings() {
  const { logout } = useAuth();
  const [checking, setChecking] = useState(false);

  return (
    <div className="screen">
      <div className="screen-header">
        <h1 className="screen-title">Settings</h1>
      </div>

      <motion.button
        className="btn"
        onClick={() => {
          setChecking(true);
          checkForUpdate();
        }}
        whileTap={{ scale: 0.97 }}
        style={{ marginTop: 8 }}
      >
        {checking ? 'Updating…' : 'Check for update'}
      </motion.button>
      <p className="screen-sub" style={{ marginTop: 8 }}>
        Clears the cache and reloads to pick up the latest version. Your bets are kept.
      </p>

      <motion.button
        className="btn secondary"
        onClick={logout}
        whileTap={{ scale: 0.97 }}
        style={{ marginTop: 18 }}
      >
        Log out
      </motion.button>

      <p className="screen-sub" style={{ marginTop: 24, textAlign: 'center' }}>
        BetFollow · build {__BUILD_ID__}
      </p>
    </div>
  );
}
