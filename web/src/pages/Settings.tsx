import { motion } from 'framer-motion';
import { useAuth } from '../auth';

export function Settings() {
  const { logout } = useAuth();

  return (
    <div className="screen">
      <div className="screen-header">
        <h1 className="screen-title">Settings</h1>
      </div>

      <motion.button
        className="btn secondary"
        onClick={() => window.location.reload()}
        whileTap={{ scale: 0.97 }}
        style={{ marginTop: 8 }}
      >
        Reset view
      </motion.button>
      <p className="screen-sub" style={{ marginTop: 8 }}>
        Fixes the layout if the bottom bar shifts on mobile.
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
        BetFollow
      </p>
    </div>
  );
}
