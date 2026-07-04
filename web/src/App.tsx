import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from './auth';
import { Login } from './components/Login';
import { BottomNav, type Tab } from './components/BottomNav';
import { Home } from './pages/Home';
import { Bets } from './pages/Bets';
import { Stats } from './pages/Stats';
import { Settings } from './pages/Settings';
import { fetchBets } from './api';
import type { Bet, Filter } from './types';
import { EMPTY_FILTER } from './types';

export default function App() {
  const { isAuthed } = useAuth();
  return (
    <AnimatePresence mode="wait">
      {isAuthed ? <Shell key="shell" /> : <Login key="login" />}
    </AnimatePresence>
  );
}

function Shell() {
  const [tab, setTab] = useState<Tab>('home');
  const [bets, setBets] = useState<Bet[] | null>(null);
  const [filter, setFilter] = useState<Filter>(EMPTY_FILTER);

  const load = useCallback(() => {
    fetchBets()
      .then(setBets)
      .catch(() => setBets([]));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="app">
      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -16 }}
          transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
        >
          {bets === null ? (
            <div className="spinner" />
          ) : (
            <Page tab={tab} bets={bets} filter={filter} setFilter={setFilter} onNav={setTab} reload={load} />
          )}
        </motion.div>
      </AnimatePresence>

      <BottomNav active={tab} onChange={setTab} />
    </div>
  );
}

function Page({
  tab,
  bets,
  filter,
  setFilter,
  onNav,
  reload,
}: {
  tab: Tab;
  bets: Bet[];
  filter: Filter;
  setFilter: (f: Filter) => void;
  onNav: (t: Tab) => void;
  reload: () => void;
}) {
  switch (tab) {
    case 'home':
      return <Home bets={bets} onSeeAll={onNav} />;
    case 'bets':
      return <Bets bets={bets} filter={filter} setFilter={setFilter} />;
    case 'stats':
      return <Stats bets={bets} />;
    case 'settings':
      return <Settings onSynced={reload} />;
  }
}
