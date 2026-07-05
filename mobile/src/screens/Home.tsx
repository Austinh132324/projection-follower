import { ScrollView, Text, View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import type { Bet } from '../lib/types';
import { BOOK_ACCENT, BOOK_LABELS } from '../lib/types';
import { aggregate, statsByBook, signedMoney, money, pct } from '../lib/stats';
import { colors, radius } from '../theme';
import { BetCard } from '../components/BetCard';
import { LogoBadge } from '../components/icons';
import { BookDot, Eyebrow, GradientButton, SectionHead } from '../components/ui';
import type { Tab } from '../components/BottomNav';

export function Home({
  bets,
  onSeeAll,
  onOpen,
  onAdd,
}: {
  bets: Bet[];
  onSeeAll: (t: Tab) => void;
  onOpen: (b: Bet) => void;
  onAdd: () => void;
}) {
  const insets = useSafeAreaInsets();
  const stats = aggregate(bets);
  const byBook = statsByBook(bets);
  const recent = [...bets].sort((a, b) => b.placedAt.localeCompare(a.placedAt)).slice(0, 4);

  return (
    <ScrollView
      contentContainerStyle={{ paddingTop: insets.top + 20, paddingHorizontal: 18, paddingBottom: 28 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <LogoBadge size={34} />
        <Text style={styles.screenTitle}>Dashboard</Text>
      </View>

      {bets.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyBig}>📈</Text>
          <Text style={styles.emptyTitle}>No bets yet</Text>
          <GradientButton label="Add a bet" onPress={onAdd} style={{ maxWidth: 220, marginTop: 18 }} />
        </View>
      ) : (
        <>
          <LinearGradient
            colors={[colors.surface2, colors.surface]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0.4, y: 1 }}
            style={styles.hero}
          >
            <Eyebrow>Net profit / loss</Eyebrow>
            <Text
              style={[styles.heroValue, { color: stats.netProfit >= 0 ? colors.pos : colors.neg }]}
            >
              {signedMoney(stats.netProfit)}
            </Text>
            <View style={styles.heroMeta}>
              <MetaCol k="ROI" v={pct(stats.roi)} />
              <MetaCol k="Win rate" v={pct(stats.winRate)} />
              <MetaCol k="Settled" v={String(stats.settledCount)} />
            </View>
          </LinearGradient>

          <View style={styles.tileGrid}>
            <Tile k="Total staked" v={money(stats.totalStaked)} />
            <Tile k="Open exposure" v={money(stats.openExposure)} />
            <Tile k="Open bets" v={String(stats.openCount)} />
            <Tile k="Total bets" v={String(stats.count)} />
          </View>

          <SectionHead title="By book" />
          {byBook.map(({ book, stats: s }) => (
            <View style={styles.bookRow} key={book}>
              <BookDot color={BOOK_ACCENT[book]} />
              <View>
                <Text style={styles.bookName}>{BOOK_LABELS[book]}</Text>
                <Text style={styles.bookSub}>
                  {s.count} bets · {pct(s.winRate)} win
                </Text>
              </View>
              <View style={styles.bookRight}>
                <Text style={[styles.bookAmt, { color: s.netProfit >= 0 ? colors.pos : colors.neg }]}>
                  {signedMoney(s.netProfit)}
                </Text>
                <Text style={styles.bookRoi}>{pct(s.roi)} ROI</Text>
              </View>
            </View>
          ))}

          <SectionHead
            title="Recent"
            action={
              <Text style={styles.link} onPress={() => onSeeAll('bets')}>
                See all
              </Text>
            }
          />
          {recent.map((bet) => (
            <BetCard bet={bet} onOpen={onOpen} key={`${bet.book}-${bet.betId}`} />
          ))}
        </>
      )}
    </ScrollView>
  );
}

function MetaCol({ k, v }: { k: string; v: string }) {
  return (
    <View>
      <Text style={styles.metaK}>{k}</Text>
      <Text style={styles.metaV}>{v}</Text>
    </View>
  );
}

function Tile({ k, v }: { k: string; v: string }) {
  return (
    <View style={styles.tile}>
      <Text style={styles.tileK}>{k}</Text>
      <Text style={styles.tileV}>{v}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 18 },
  screenTitle: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5, color: colors.text },

  empty: { alignItems: 'center', paddingTop: 90 },
  emptyBig: { fontSize: 40, marginBottom: 10 },
  emptyTitle: { fontWeight: '700', fontSize: 17, color: colors.text },

  hero: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 20,
  },
  heroValue: { fontSize: 42, fontWeight: '800', letterSpacing: -1, marginTop: 8, marginBottom: 4 },
  heroMeta: { flexDirection: 'row', gap: 24, marginTop: 14 },
  metaK: { color: colors.muted, fontSize: 12 },
  metaV: { fontWeight: '700', fontSize: 16, marginTop: 2, color: colors.text },

  tileGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 14 },
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

  bookRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingVertical: 13,
    paddingHorizontal: 15,
    marginBottom: 10,
  },
  bookName: { fontWeight: '700', fontSize: 15, color: colors.text },
  bookSub: { color: colors.muted, fontSize: 12, marginTop: 1 },
  bookRight: { marginLeft: 'auto', alignItems: 'flex-end' },
  bookAmt: { fontWeight: '800', fontSize: 16 },
  bookRoi: { color: colors.muted, fontSize: 12 },

  link: { color: colors.accent, fontSize: 13, fontWeight: '600' },
});
