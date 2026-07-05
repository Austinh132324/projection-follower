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
    if (!login(username, password)) setError('Incorrect username or password.');
  };

  return (
    <motion.form
      className="login"
      onSubmit={submit}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
    >
      <div className="login-brand" style={{ flexDirection: 'column', alignItems: 'center', gap: 16 }}>
        <div className="login-logo" style={{ width: 66, height: 66, borderRadius: 20 }}>
          <LogoMark size={34} />
        </div>
        <h1 style={{ fontSize: 24 }}>Projection Follower</h1>
      </div>

      <div className="field">
        <input
          id="username"
          autoCapitalize="none"
          autoCorrect="off"
          placeholder="Username"
          value={username}
          onChange={(e) => {
            setUsername(e.target.value);
            setError('');
          }}
        />
      </div>

      <div className="field">
        <input
          id="password"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setError('');
          }}
        />
      </div>

      {error && <div className="login-error">{error}</div>}

      <motion.button className="btn" type="submit" whileTap={{ scale: 0.97 }} style={{ marginTop: 6 }}>
        Sign in
      </motion.button>
    </motion.form>
  );
}
