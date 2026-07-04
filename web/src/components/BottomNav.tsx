import { motion } from 'framer-motion';
import { HomeIcon, ListIcon, ChartIcon, GearIcon } from './icons';
import type { ReactNode } from 'react';

export type Tab = 'home' | 'bets' | 'stats' | 'settings';

const TABS: { id: Tab; label: string; icon: (p: { active?: boolean }) => ReactNode }[] = [
  { id: 'home', label: 'Home', icon: HomeIcon },
  { id: 'bets', label: 'Bets', icon: ListIcon },
  { id: 'stats', label: 'Stats', icon: ChartIcon },
  { id: 'settings', label: 'Settings', icon: GearIcon },
];

export function BottomNav({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
  return (
    <nav className="bottom-nav">
      {TABS.map(({ id, label, icon: Icon }) => {
        const isActive = active === id;
        return (
          <motion.button
            key={id}
            className={`nav-item ${isActive ? 'active' : ''}`}
            onClick={() => onChange(id)}
            whileTap={{ scale: 0.86 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          >
            {isActive && (
              // Shared-element pill glides between tabs (PrizePicks-style).
              <motion.span
                layoutId="nav-pill"
                className="nav-pill"
                transition={{ type: 'spring', stiffness: 500, damping: 34 }}
              />
            )}
            <motion.span
              animate={{ y: isActive ? -1 : 0, scale: isActive ? 1.05 : 1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 28 }}
              style={{ display: 'flex' }}
            >
              <Icon active={isActive} />
            </motion.span>
            <span>{label}</span>
          </motion.button>
        );
      })}
    </nav>
  );
}
