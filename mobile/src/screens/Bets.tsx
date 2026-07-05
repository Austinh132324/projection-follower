import { ScrollView, Text, View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Bet, Filter, Book, BetType, BetStatus } from '../lib/types';
import { BOOK_LABELS, BET_TYPE_LABELS } from '../lib/types';
import { applyFilter, aggregate, signedMoney } from '../lib/stats';
import { colors } from '../theme';
import { BetCard } from '../components/BetCard';
import { Chip, Eyebrow } from '../components/ui';

const BOOKS: Book[] = ['draftkings', 'fanduel', 'prizepicks', 'other'];
const STATUSES: (BetStatus | 'all')[] = ['all', 'open', 'settled'];
const TYPES: (BetType | 'all')[] = ['all', 'single', 'parlay', 'prop', 'dfs_entry'];

export function Bets({
  bets,
  filter,
  setFilter,
  onOpen,
}: {
  bets: Bet[];
  filter: Filter;
  setFilter: (f: Filter) => void;
  onOpen: (b: Bet) => void;
}) {
  const insets = useSafeAreaInsets();
  const filtered = applyFilter(bets, filter);
  const stats = aggregate(filtered);

  const toggleBook = (book: Book) => {
    const books = filter.books.includes(book)
      ? filter.books.filter((b) => b !== book)
      : [...filter.books, book];
    setFilter({ ...filter, books });
  };

  return (
    <ScrollView
      contentContainerStyle={{ paddingTop: insets.top + 20, paddingHorizontal: 18, paddingBottom: 28 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={{ marginBottom: 18 }}>
        <Eyebrow>
          {filtered.length} bets · {signedMoney(stats.netProfit)}
        </Eyebrow>
        <Text style={styles.title}>Bets</Text>
      </View>

      <Text style={styles.filterLabel}>Book</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
        <Chip label="All" active={filter.books.length === 0} onPress={() => setFilter({ ...filter, books: [] })} />
        {BOOKS.map((b) => (
          <Chip key={b} label={BOOK_LABELS[b]} active={filter.books.includes(b)} onPress={() => toggleBook(b)} />
        ))}
      </ScrollView>

      <Text style={styles.filterLabel}>Status</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
        {STATUSES.map((s) => (
          <Chip
            key={s}
            label={s === 'all' ? 'All' : s === 'open' ? 'Open' : 'Settled'}
            active={filter.status === s}
            onPress={() => setFilter({ ...filter, status: s })}
          />
        ))}
      </ScrollView>

      <Text style={styles.filterLabel}>Type</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
        {TYPES.map((t) => (
          <Chip
            key={t}
            label={t === 'all' ? 'All' : BET_TYPE_LABELS[t]}
            active={filter.betType === t}
            onPress={() => setFilter({ ...filter, betType: t })}
          />
        ))}
      </ScrollView>

      <View style={{ height: 18 }} />

      {filtered.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyBig}>🎯</Text>
          <Text style={styles.emptyText}>No bets match these filters.</Text>
        </View>
      ) : (
        filtered.map((bet) => <BetCard bet={bet} onOpen={onOpen} key={`${bet.book}-${bet.betId}`} />)
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5, color: colors.text },
  filterLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: colors.faint,
    marginTop: 14,
    marginBottom: 8,
    marginHorizontal: 2,
  },
  chipRow: { gap: 8, paddingVertical: 4 },
  empty: { alignItems: 'center', paddingVertical: 50 },
  emptyBig: { fontSize: 40, marginBottom: 10 },
  emptyText: { color: colors.muted },
});
