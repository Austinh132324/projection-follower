import { motion } from 'framer-motion';
import { useAuth } from '../auth';

export function Settings() {
  const { logout } = useAuth();
  return (
    <div className="screen">
      <div className="screen-header">
        <h1 className="screen-title">Settings</h1>
      </div>

      <motion.button className="btn secondary" onClick={logout} whileTap={{ scale: 0.97 }} style={{ marginTop: 8 }}>
        Log out
      </motion.button>

      <p className="screen-sub" style={{ marginTop: 24, textAlign: 'center' }}>
        Projection Follower
      </p>
    </div>
  );
}
