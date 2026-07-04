import { useState } from 'react';
import { motion } from 'framer-motion';
import { BOOK_ACCENT, BOOK_LABELS, type Book } from '../types';
import { useAuth } from '../auth';
import { triggerSync, USE_MOCK } from '../api';
import { SyncIcon } from '../components/icons';

const BOOKS: { book: Book; implemented: boolean }[] = [
  { book: 'draftkings', implemented: true },
  { book: 'fanduel', implemented: false },
  { book: 'prizepicks', implemented: false },
];

export function Settings({ onSynced }: { onSynced: () => void }) {
  const { logout } = useAuth();
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);

  const doSync = async () => {
    setSyncing(true);
    try {
      await triggerSync();
      setLastSync(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      onSynced();
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="screen">
      <div className="screen-header">
        <div>
          <div className="eyebrow">Account</div>
          <h1 className="screen-title">Settings</h1>
        </div>
      </div>

      <div className="section-head" style={{ marginTop: 8 }}>
        <h2>Sync</h2>
      </div>
      <motion.button className="btn" onClick={doSync} disabled={syncing} whileTap={{ scale: 0.97 }}>
        <motion.span
          animate={syncing ? { rotate: 360 } : { rotate: 0 }}
          transition={syncing ? { repeat: Infinity, duration: 1, ease: 'linear' } : { duration: 0.2 }}
          style={{ display: 'flex' }}
        >
          <SyncIcon />
        </motion.span>
        {syncing ? 'Syncing…' : 'Sync now'}
      </motion.button>
      <p className="screen-sub" style={{ marginTop: 10 }}>
        {lastSync ? `Last synced at ${lastSync}. ` : ''}
        {USE_MOCK
          ? 'Demo build — sync is simulated against mock data.'
          : 'Pulls fresh bets from your connected books.'}
      </p>

      <div className="section-head">
        <h2>Books</h2>
      </div>
      {BOOKS.map(({ book, implemented }) => (
        <div className="book-row" key={book}>
          <span className="book-dot" style={{ background: BOOK_ACCENT[book] }} />
          <div>
            <div className="name">{BOOK_LABELS[book]}</div>
            <div className="sub">{implemented ? 'Connected' : 'Coming soon'}</div>
          </div>
          <div className="right">
            <span
              className="status-pill"
              style={{
                background: implemented ? 'rgba(52,211,153,0.15)' : 'var(--surface-2)',
                color: implemented ? 'var(--pos)' : 'var(--faint)',
              }}
            >
              {implemented ? 'Active' : 'Soon'}
            </span>
          </div>
        </div>
      ))}

      <div className="section-head">
        <h2>Session</h2>
      </div>
      <motion.button className="btn secondary" onClick={logout} whileTap={{ scale: 0.97 }}>
        Log out
      </motion.button>

      <p className="screen-sub" style={{ marginTop: 24, textAlign: 'center' }}>
        Projection Follower · personal build
      </p>
    </div>
  );
}
