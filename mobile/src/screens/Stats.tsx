import { ScrollView, Text, View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Bet, BetType } from '../lib/types';
import { BOOK_ACCENT, BOOK_LABELS, BET_TYPE_LABELS } from '../lib/types';
import { aggregate, statsByBook, signedMoney, money, pct } from '../lib/stats';
import { colors, radius } from '../theme';
import { BookDot, SectionHead } from '../components/ui';

export function Stats({ bets }: { bets: Bet[] }) {
  const insets = useSafeAreaInsets();
  const overall = aggregate(bets);
  const byBook = statsByBook(bets);
  const maxAbs = Math.max(1, ...byBook.map((b) => Math.abs(b.stats.netProfit)));

  const types = Array.from(new Set(bets.map((b) => b.betType)));
  const byType = types
    .map((t) => ({ type: t as BetType, stats: aggregate(bets.filter((b) => b.betType === t)) }))
    .sort((a, b) => b.stats.count - a.stats.count);

  return (
    <ScrollView
      contentContainerStyle={{ paddingTop: insets.top + 20, paddingHorizontal: 18, paddingBottom: 28 }}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.title}>Stats</Text>

      <View style={styles.tileGrid}>
        <Tile k="Net profit" v={signedMoney(overall.netProfit)} color={overall.netProfit >= 0 ? colors.pos : colors.neg} />
        <Tile k="ROI" v={pct(overall.roi)} color={overall.roi >= 0 ? colors.pos : colors.neg} />
        <Tile k="Win rate" v={pct(overall.winRate)} />
        <Tile k="Total staked" v={money(overall.totalStaked)} />
      </View>

      <SectionHead title="Profit by book" />
      {byBook.map(({ book, stats }) => {
        const width = `${(Math.abs(stats.netProfit) / maxAbs) * 100}%` as const;
        const c = stats.netProfit >= 0 ? colors.pos : colors.neg;
        return (
          <View style={styles.card} key={book}>
            <View style={styles.rowBetween}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <BookDot color={BOOK_ACCENT[book]} />
                <Text style={styles.bookName}>{BOOK_LABELS[book]}</Text>
              </View>
              <Text style={[styles.amt, { color: c }]}>{signedMoney(stats.netProfit)}</Text>
            </View>
            <View style={styles.barTrack}>
              <View style={[styles.barFill, { width, backgroundColor: c }]} />
            </View>
            <Text style={styles.cardSub}>
              {stats.count} bets · {pct(stats.winRate)} win · {pct(stats.roi)} ROI
            </Text>
          </View>
        );
      })}

      <SectionHead title="By bet type" />
      <View style={styles.card}>
        {byType.map(({ type, stats }, i) => (
          <View key={type} style={[styles.typeRow, i > 0 && { borderTopWidth: 1, borderTopColor: colors.border }]}>
            <Text style={styles.typeK}>{BET_TYPE_LABELS[type]}</Text>
            <View style={{ flexDirection: 'row', gap: 12, alignItems: 'baseline' }}>
              <Text style={styles.typeCount}>{stats.count} bets</Text>
              <Text style={{ fontWeight: '700', color: stats.netProfit >= 0 ? colors.pos : colors.neg }}>
                {signedMoney(stats.netProfit)}
              </Text>
            </View>
          </View>
        ))}
        {byType.length === 0 && <Text style={styles.cardSub}>No bets yet.</Text>}
      </View>
    </ScrollView>
  );
}

function Tile({ k, v, color }: { k: string; v: string; color?: string }) {
  return (
    <View style={styles.tile}>
      <Text style={styles.tileK}>{k}</Text>
      <Text style={[styles.tileV, color ? { color } : null]}>{v}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5, color: colors.text, marginBottom: 18 },
  tileGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 4 },
  tile: {
    flexGrow: 1,
    flexBasis: '46%',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingVertical: 14,
    paddingHorizontal: 15,
  },
  tileK: { color: colors.muted, fontSize: 12, fontWeight: '600' },
  tileV: { fontSize: 22, fontWeight: '800', letterSpacing: -0.4, marginTop: 6, color: colors.text },

  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: 16,
    marginBottom: 12,
  },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  bookName: { fontWeight: '700', color: colors.text },
  amt: { fontWeight: '700' },
  barTrack: { height: 8, borderRadius: 999, backgroundColor: colors.surface2, overflow: 'hidden', marginTop: 8 },
  barFill: { height: '100%', borderRadius: 999 },
  cardSub: { color: colors.muted, fontSize: 12, marginTop: 8 },

  typeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10 },
  typeK: { color: colors.muted, fontSize: 14 },
  typeCount: { color: colors.muted, fontSize: 13, fontWeight: '600' },
});
