import { Pressable, Text, View, StyleSheet } from 'react-native';
import type { Bet } from '../lib/types';
import { BOOK_ACCENT, BOOK_LABELS, BET_TYPE_LABELS } from '../lib/types';
import { netProfit, signedMoney, money, formatDate } from '../lib/stats';
import { colors, radius } from '../theme';
import { BookDot, Pill } from './ui';

export function BetCard({ bet, onOpen }: { bet: Bet; onOpen: (b: Bet) => void }) {
  const accent = BOOK_ACCENT[bet.book];
  const headline = bet.legs[0]?.selection ?? BET_TYPE_LABELS[bet.betType];
  const subtitle =
    bet.legs.length > 1
      ? `${BET_TYPE_LABELS[bet.betType]} · ${bet.legs.length} legs`
      : bet.legs[0]?.market ?? BET_TYPE_LABELS[bet.betType];

  const net = netProfit(bet);
  const amountColor =
    bet.status === 'open'
      ? colors.text
      : bet.result === 'win'
        ? colors.pos
        : bet.result === 'loss'
          ? colors.neg
          : colors.push;
  const amountText =
    bet.status === 'open' ? `${money(bet.stake)} → ${money(bet.potentialPayout)}` : signedMoney(net);
  const pillKind = bet.status === 'open' ? 'open' : bet.result ?? 'push';
  const pillText = bet.status === 'open' ? 'Open' : bet.result ?? 'settled';

  return (
    <Pressable
      onPress={() => onOpen(bet)}
      style={({ pressed }) => [styles.card, { opacity: pressed ? 0.85 : 1 }]}
    >
      <BookDot color={accent} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.title} numberOfLines={1}>
          {headline}
        </Text>
        <Text style={styles.subtitle} numberOfLines={1}>
          {BOOK_LABELS[bet.book]} · {subtitle} · {formatDate(bet.placedAt)}
        </Text>
      </View>
      <View style={styles.right}>
        <Text style={[styles.amount, { color: amountColor }]}>{amountText}</Text>
        <Pill kind={pillKind} label={pillText} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingVertical: 14,
    paddingHorizontal: 15,
    marginBottom: 12,
  },
  title: { fontWeight: '700', fontSize: 15, color: colors.text },
  subtitle: { color: colors.muted, fontSize: 12, marginTop: 3 },
  right: { alignItems: 'flex-end', flexShrink: 0 },
  amount: { fontWeight: '800', fontSize: 15 },
});
