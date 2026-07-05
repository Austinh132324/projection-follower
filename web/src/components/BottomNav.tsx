import { motion } from 'framer-motion';
import { HomeIcon, ListIcon, ChartIcon, GearIcon, PlusIcon } from './icons';
import type { ReactNode } from 'react';

export type Tab = 'home' | 'bets' | 'stats' | 'settings';

const LEFT: { id: Tab; label: string; icon: (p: { active?: boolean }) => ReactNode }[] = [
  { id: 'home', label: 'Home', icon: HomeIcon },
  { id: 'bets', label: 'Bets', icon: ListIcon },
];
const RIGHT: { id: Tab; label: string; icon: (p: { active?: boolean }) => ReactNode }[] = [
  { id: 'stats', label: 'Stats', icon: ChartIcon },
  { id: 'settings', label: 'Settings', icon: GearIcon },
];

export function BottomNav({
  active,
  onChange,
  onAdd,
}: {
  active: Tab;
  onChange: (t: Tab) => void;
  onAdd: () => void;
}) {
  return (
    <nav className="bottom-nav">
      {LEFT.map((t) => (
        <NavItem key={t.id} {...t} active={active === t.id} onClick={() => onChange(t.id)} />
      ))}

      <div className="nav-fab-slot">
        <motion.button
          className="nav-fab"
          onClick={onAdd}
          whileTap={{ scale: 0.9 }}
          whileHover={{ scale: 1.04 }}
          transition={{ type: 'spring', stiffness: 400, damping: 20 }}
          aria-label="Add bet"
        >
          <PlusIcon />
        </motion.button>
      </div>

      {RIGHT.map((t) => (
        <NavItem key={t.id} {...t} active={active === t.id} onClick={() => onChange(t.id)} />
      ))}
    </nav>
  );
}

function NavItem({
  label,
  icon: Icon,
  active,
  onClick,
}: {
  label: string;
  icon: (p: { active?: boolean }) => ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      className={`nav-item ${active ? 'active' : ''}`}
      onClick={onClick}
      whileTap={{ scale: 0.88 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
    >
      {active && (
        <motion.span
          layoutId="nav-pill"
          className="nav-pill"
          transition={{ type: 'spring', stiffness: 500, damping: 34 }}
        />
      )}
      <motion.span
        animate={{ y: active ? -1 : 0, scale: active ? 1.05 : 1 }}
        transition={{ type: 'spring', stiffness: 500, damping: 28 }}
        style={{ display: 'flex' }}
      >
        <Icon active={active} />
      </motion.span>
      <span>{label}</span>
    </motion.button>
  );
}
