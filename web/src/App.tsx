import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from './auth';
import { Login } from './components/Login';
import { BottomNav, type Tab } from './components/BottomNav';
import { FullscreenToggle } from './components/FullscreenToggle';
import { AddSheet } from './components/AddSheet';
import { BetForm } from './components/BetForm';
import { PhotoImport } from './components/PhotoImport';
import { BetDetail } from './components/BetDetail';
import { Home } from './pages/Home';
import { Bets } from './pages/Bets';
import { Stats } from './pages/Stats';
import { Settings } from './pages/Settings';
import { loadBets, saveBet, removeBet } from './api';
import { emptyDraft } from './betDraft';
import type { Bet, Filter } from './types';
import { EMPTY_FILTER } from './types';

type Overlay =
  | { kind: 'none' }
  | { kind: 'add' }
  | { kind: 'manual' }
  | { kind: 'photo'; files: File[] }
  | { kind: 'detail'; bet: Bet };

export default function App() {
  const { isAuthed } = useAuth();
  // Plain conditional render (no AnimatePresence here): the auth components
  // aren't motion elements, and mode="wait" would stall the logout swap.
  return isAuthed ? <Shell /> : <Login />;
}

function Shell() {
  const [tab, setTab] = useState<Tab>('home');
  const [bets, setBets] = useState<Bet[] | null>(null);
  const [filter, setFilter] = useState<Filter>(EMPTY_FILTER);
  const [overlay, setOverlay] = useState<Overlay>({ kind: 'none' });

  const reload = useCallback(() => {
    loadBets()
      .then(setBets)
      .catch(() => setBets([]));
  }, []);

  useEffect(() => reload(), [reload]);

  // Persist without closing the overlay (photo review saves several in a row).
  const persist = useCallback(
    async (bet: Bet) => {
      await saveBet(bet);
      reload();
    },
    [reload],
  );

  const handleSave = async (bet: Bet) => {
    await persist(bet);
    setOverlay({ kind: 'none' });
  };

  const handleDelete = async (bet: Bet) => {
    await removeBet(bet.book, bet.betId);
    reload();
    setOverlay({ kind: 'none' });
  };

  const openDetail = (bet: Bet) => setOverlay({ kind: 'detail', bet });
  const close = () => setOverlay({ kind: 'none' });

  return (
    <div className="app">
      <FullscreenToggle />
      <div className="app-scroll">
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
              <Page
                tab={tab}
                bets={bets}
                filter={filter}
                setFilter={setFilter}
                onNav={setTab}
                onOpen={openDetail}
                onAdd={() => setOverlay({ kind: 'add' })}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <BottomNav active={tab} onChange={setTab} onAdd={() => setOverlay({ kind: 'add' })} />

      <AnimatePresence>
        {overlay.kind === 'add' && (
          <AddSheet
            key="add"
            onClose={close}
            onManual={() => setOverlay({ kind: 'manual' })}
            onPhotoFiles={(files) => setOverlay({ kind: 'photo', files })}
          />
        )}
        {overlay.kind === 'manual' && (
          <BetForm key="manual" initial={emptyDraft('manual')} title="New bet" onSave={handleSave} onClose={close} />
        )}
        {overlay.kind === 'photo' && (
          <PhotoImport key="photo" files={overlay.files} onSave={persist} onClose={close} />
        )}
        {overlay.kind === 'detail' && (
          <BetDetail key="detail" bet={overlay.bet} onClose={close} onDelete={handleDelete} />
        )}
      </AnimatePresence>
    </div>
  );
}

function Page({
  tab,
  bets,
  filter,
  setFilter,
  onNav,
  onOpen,
  onAdd,
}: {
  tab: Tab;
  bets: Bet[];
  filter: Filter;
  setFilter: (f: Filter) => void;
  onNav: (t: Tab) => void;
  onOpen: (b: Bet) => void;
  onAdd: () => void;
}) {
  switch (tab) {
    case 'home':
      return <Home bets={bets} onSeeAll={onNav} onOpen={onOpen} onAdd={onAdd} />;
    case 'bets':
      return <Bets bets={bets} filter={filter} setFilter={setFilter} onOpen={onOpen} />;
    case 'stats':
      return <Stats bets={bets} />;
    case 'settings':
      return <Settings />;
  }
}
