import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../auth';
import { USE_MOCK, resetLocal } from '../api';

export function Settings({ onReset }: { onReset: () => void }) {
  const { logout } = useAuth();
  const [reset, setReset] = useState(false);

  const doReset = () => {
    resetLocal();
    setReset(true);
    onReset();
    setTimeout(() => setReset(false), 1600);
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
        <h2>How it works</h2>
      </div>
      <div className="card">
        <p style={{ margin: 0, color: 'var(--muted)', fontSize: 13.5, lineHeight: 1.6 }}>
          Add bets yourself or scan a slip photo — reading happens on your device. Tap any bet to
          pull its live game score and a research-based win-likelihood from ESPN.
        </p>
      </div>

      {USE_MOCK && (
        <>
          <div className="section-head">
            <h2>Demo data</h2>
          </div>
          <motion.button className="btn secondary" onClick={doReset} whileTap={{ scale: 0.97 }}>
            {reset ? 'Reset ✓' : 'Reset demo bets'}
          </motion.button>
          <p className="screen-sub" style={{ marginTop: 10 }}>
            This static build stores your bets in the browser. Reset restores the sample set.
          </p>
        </>
      )}

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
