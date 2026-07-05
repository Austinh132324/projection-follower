import { useCallback, useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './src/lib/auth';
import { colors } from './src/theme';
import { loadBets, saveBet, removeBet } from './src/lib/api';
import { emptyDraft, type BetDraft } from './src/lib/betDraft';
import type { Bet, Filter } from './src/lib/types';
import { EMPTY_FILTER } from './src/lib/types';
import { BottomNav, type Tab } from './src/components/BottomNav';
import { AddSheet } from './src/components/AddSheet';
import { BetForm } from './src/components/BetForm';
import { BetDetail } from './src/components/BetDetail';
import { Login } from './src/screens/Login';
import { Home } from './src/screens/Home';
import { Bets } from './src/screens/Bets';
import { Scout } from './src/screens/Scout';
import { Stats } from './src/screens/Stats';
import { Settings } from './src/screens/Settings';

type Overlay =
  | { kind: 'none' }
  | { kind: 'add' }
  | { kind: 'manual'; draft?: BetDraft }
  | { kind: 'detail'; bet: Bet };

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <AuthProvider>
        <Root />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

function Root() {
  const { ready, isAuthed } = useAuth();
  if (!ready) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );
  }
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

  const handleSave = async (bet: Bet) => {
    await saveBet(bet);
    reload();
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
    <View style={styles.app}>
      <View style={{ flex: 1 }}>
        {bets === null ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.accent} size="large" />
          </View>
        ) : (
          <Page
            tab={tab}
            bets={bets}
            filter={filter}
            setFilter={setFilter}
            onNav={setTab}
            onOpen={openDetail}
            onAdd={() => setOverlay({ kind: 'add' })}
            onTrack={(draft) => setOverlay({ kind: 'manual', draft })}
            onCleared={reload}
          />
        )}
      </View>

      <BottomNav active={tab} onChange={setTab} onAdd={() => setOverlay({ kind: 'add' })} />

      {overlay.kind === 'add' && (
        <AddSheet
          onClose={close}
          onManual={() => setOverlay({ kind: 'manual' })}
          onPhoto={() => setOverlay({ kind: 'manual', draft: emptyDraft('photo') })}
        />
      )}
      {overlay.kind === 'manual' && (
        <BetForm
          initial={overlay.draft ?? emptyDraft('manual')}
          title={overlay.draft ? 'Track bet' : 'New bet'}
          onSave={handleSave}
          onClose={close}
        />
      )}
      {overlay.kind === 'detail' && (
        <BetDetail bet={overlay.bet} onClose={close} onDelete={handleDelete} />
      )}
    </View>
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
  onTrack,
  onCleared,
}: {
  tab: Tab;
  bets: Bet[];
  filter: Filter;
  setFilter: (f: Filter) => void;
  onNav: (t: Tab) => void;
  onOpen: (b: Bet) => void;
  onAdd: () => void;
  onTrack: (draft: BetDraft) => void;
  onCleared: () => void;
}) {
  switch (tab) {
    case 'home':
      return <Home bets={bets} onSeeAll={onNav} onOpen={onOpen} onAdd={onAdd} />;
    case 'bets':
      return <Bets bets={bets} filter={filter} setFilter={setFilter} onOpen={onOpen} />;
    case 'scout':
      return <Scout onTrack={onTrack} />;
    case 'stats':
      return <Stats bets={bets} />;
    case 'settings':
      return <Settings onCleared={onCleared} />;
  }
}

const styles = StyleSheet.create({
  app: { flex: 1, backgroundColor: colors.bg },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
});
