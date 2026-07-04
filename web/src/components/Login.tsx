import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../auth';
import { LogoMark } from './icons';

export function Login() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!login(username, password)) {
      setError('Incorrect username or password.');
    }
  };

  return (
    <motion.form
      className="login"
      onSubmit={submit}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
    >
      <div className="login-brand">
        <div className="login-logo">
          <LogoMark />
        </div>
        <div>
          <h1>Projection Follower</h1>
          <p>Your personal bet tracker</p>
        </div>
      </div>

      <h2>Welcome back</h2>
      <p className="lede">Sign in to see your W/L, ROI, and open exposure.</p>

      <div className="field">
        <label htmlFor="username">Username</label>
        <input
          id="username"
          autoCapitalize="none"
          autoCorrect="off"
          value={username}
          onChange={(e) => {
            setUsername(e.target.value);
            setError('');
          }}
          placeholder="austin"
        />
      </div>

      <div className="field">
        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setError('');
          }}
          placeholder="••••••"
        />
      </div>

      {error && <div className="login-error">{error}</div>}

      <motion.button className="btn" type="submit" whileTap={{ scale: 0.97 }} style={{ marginTop: 6 }}>
        Sign in
      </motion.button>

      {/* MOCK AUTH HINT — delete along with the mock auth for real deployment. */}
      <div className="login-hint">
        Demo build · use <b>austin</b> / <b>admin</b>. This is a static preview backed by mock
        data — no real accounts are touched.
      </div>
    </motion.form>
  );
}
