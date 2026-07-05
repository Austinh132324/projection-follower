import { useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import type { Bet } from '../lib/types';
import { BOOK_LABELS, BOOK_ACCENT, BET_TYPE_LABELS } from '../lib/types';
import { netProfit, signedMoney, money, americanOdds, formatDate } from '../lib/stats';
import { assessBet, type EspnInsight } from '../lib/espn';
import { colors, radius, accentGradient } from '../theme';
import { CloseIcon, TrashIcon } from './icons';
import { BookDot, GradientButton, Note, SectionHead } from './ui';
import { KickoffCard, WinProbChart, LinescoreTable } from './GameViews';

export function BetDetail({
  bet,
  onClose,
  onDelete,
}: {
  bet: Bet;
  onClose: () => void;
  onDelete: (bet: Bet) => void;
}) {
  const insets = useSafeAreaInsets();
  const [insight, setInsight] = useState<EspnInsight | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    assessBet(bet)
      .then((i) => alive && setInsight(i))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [bet]);

  const net = netProfit(bet);
  const state = insight?.event?.state;

  const confirmDelete = () =>
    Alert.alert('Delete bet?', 'This removes the bet from this device.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => onDelete(bet) },
    ]);

  return (
    <Modal animationType="slide" onRequestClose={onClose}>
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.bg }}
        contentContainerStyle={{ paddingTop: insets.top + 8, paddingHorizontal: 18, paddingBottom: 40 + insets.bottom }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.head}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <BookDot color={BOOK_ACCENT[bet.book]} />
            <Text style={styles.headTitle}>{BOOK_LABELS[bet.book]}</Text>
          </View>
          <Pressable onPress={onClose} style={styles.iconBtn}>
            <CloseIcon />
          </Pressable>
        </View>

        {/* Bet summary */}
        <LinearGradient colors={[colors.surface2, colors.surface]} start={{ x: 0, y: 0 }} end={{ x: 0.4, y: 1 }} style={styles.hero}>
          <Text style={styles.eyebrow}>
            {BET_TYPE_LABELS[bet.betType]} · {formatDate(bet.placedAt)}
          </Text>
          {bet.status === 'open' ? (
            <>
              <Text style={styles.heroValue}>{money(bet.potentialPayout)}</Text>
              <Text style={[styles.eyebrow, { marginTop: 2 }]}>
                Potential payout · {money(bet.stake)} staked
              </Text>
            </>
          ) : (
            <>
              <Text style={[styles.heroValue, { color: net >= 0 ? colors.pos : colors.neg }]}>
                {signedMoney(net)}
              </Text>
              <Text style={[styles.eyebrow, { marginTop: 2 }]}>
                {bet.result?.toUpperCase()} · {money(bet.stake)} → {money(bet.payout ?? 0)}
              </Text>
            </>
          )}
        </LinearGradient>

        {/* Legs */}
        <View style={styles.legs}>
          {bet.legs.map((leg) => (
            <View style={styles.leg} key={leg.id}>
              <View style={[styles.legMarker, markerColor(leg.result)]} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.legSel}>{leg.selection}</Text>
                {!!(leg.market || leg.event) && (
                  <Text style={styles.legMkt}>{[leg.market, leg.event].filter(Boolean).join(' · ')}</Text>
                )}
              </View>
              {leg.oddsAmerican != null && <Text style={styles.legOdds}>{americanOdds(leg.oddsAmerican)}</Text>}
            </View>
          ))}
        </View>

        {/* ESPN insight */}
        <SectionHead
          title={`${state === 'pre' ? 'Matchup' : state === 'in' ? 'Live' : 'Game'} & research`}
          action={<Text style={styles.viaEspn}>via ESPN</Text>}
        />

        {loading && <ActivityIndicator color={colors.accent} style={{ marginVertical: 20 }} />}

        {!loading && insight && !insight.matched && <Note>{insight.error ?? 'No matching ESPN game found.'}</Note>}

        {!loading && insight?.matched && insight.event && (
          <>
            {insight.event.state === 'pre' ? (
              <KickoffCard event={insight.event} prediction={insight.prediction} />
            ) : (
              <>
                <Scorebug insight={insight} />
                {insight.event.state === 'in' && insight.winProbTimeline && (
                  <WinProbChart
                    timeline={insight.winProbTimeline}
                    homeAbbr={insight.event.competitors.find((c) => c.homeAway === 'home')?.abbreviation ?? 'HOME'}
                    awayAbbr={insight.event.competitors.find((c) => c.homeAway === 'away')?.abbreviation ?? 'AWAY'}
                  />
                )}
                <LinescoreTable event={insight.event} />
              </>
            )}
            {insight.prediction && <PredictionCard insight={insight} />}
            {insight.odds && <OddsCard insight={insight} />}
            <Note>Estimate for research — not betting advice.</Note>
          </>
        )}

        <GradientButton
          label="Delete bet"
          variant="danger"
          icon={<TrashIcon size={18} />}
          onPress={confirmDelete}
          style={{ marginTop: 22 }}
        />
      </ScrollView>
    </Modal>
  );
}

function markerColor(result: Bet['result']) {
  if (result === 'win') return { backgroundColor: colors.pos };
  if (result === 'loss') return { backgroundColor: colors.neg };
  if (result === 'push' || result === 'void') return { backgroundColor: colors.push };
  return { backgroundColor: colors.faint };
}

function Scorebug({ insight }: { insight: EspnInsight }) {
  const ev = insight.event!;
  const away = ev.competitors.find((c) => c.homeAway === 'away');
  const home = ev.competitors.find((c) => c.homeAway === 'home');
  const live = ev.state === 'in';
  return (
    <View style={styles.scorebug}>
      <View style={[styles.team, { justifyContent: 'flex-start' }]}>
        <Text style={styles.score}>{away?.score ?? '–'}</Text>
        <Text style={styles.abbr}>{away?.abbreviation}</Text>
      </View>
      <View style={styles.scoreMid}>
        <Text style={styles.scoreState}>
          {live ? '● ' : ''}
          {ev.state === 'pre' ? 'Upcoming' : ev.state === 'in' ? 'Live' : 'Final'}
        </Text>
        <Text style={styles.scoreDetail}>{ev.statusDetail || formatDate(ev.date)}</Text>
      </View>
      <View style={[styles.team, { justifyContent: 'flex-end' }]}>
        <Text style={styles.abbr}>{home?.abbreviation}</Text>
        <Text style={styles.score}>{home?.score ?? '–'}</Text>
      </View>
    </View>
  );
}

function OddsCard({ insight }: { insight: EspnInsight }) {
  const o = insight.odds!;
  const ev = insight.event!;
  const away = ev.competitors.find((c) => c.homeAway === 'away');
  const home = ev.competitors.find((c) => c.homeAway === 'home');
  const Row = ({ k, v }: { k: string; v: string }) => (
    <View style={styles.oddsRow}>
      <Text style={styles.oddsK}>{k}</Text>
      <Text style={styles.oddsV}>{v}</Text>
    </View>
  );
  return (
    <View style={styles.card}>
      <View style={styles.oddsRow}>
        <Text style={styles.oddsK}>Vegas odds</Text>
        <Text style={[styles.oddsV, { color: colors.muted, fontSize: 12 }]}>{o.provider}</Text>
      </View>
      {o.details && <Row k="Spread" v={o.details} />}
      {o.overUnder != null && <Row k="Total" v={String(o.overUnder)} />}
      {o.awayMoneyline != null && <Row k={`${away?.abbreviation} moneyline`} v={americanOdds(o.awayMoneyline)} />}
      {o.homeMoneyline != null && <Row k={`${home?.abbreviation} moneyline`} v={americanOdds(o.homeMoneyline)} />}
    </View>
  );
}

function PredictionCard({ insight }: { insight: EspnInsight }) {
  const p = insight.prediction!;
  const pctVal = p.researchWinPct;
  return (
    <LinearGradient colors={[colors.surface2, colors.surface]} start={{ x: 0, y: 0 }} end={{ x: 0.4, y: 1 }} style={styles.predict}>
      <View style={styles.predictHead}>
        <Text style={styles.predictTitle}>Win likelihood</Text>
        <ConfPill conf={p.confidence} />
      </View>

      {pctVal != null ? (
        <>
          <View style={styles.gauge}>
            <Text style={styles.gaugeBig}>{pctVal.toFixed(0)}%</Text>
            <Text style={styles.gaugeLbl}>
              {p.side ?? 'projected side'} to win
              {p.researchFairOdds != null && (
                <Text>
                  {'\n'}
                  <Text style={{ color: colors.text, fontWeight: '700' }}>≈ {americanOdds(p.researchFairOdds)} fair line</Text>
                </Text>
              )}
            </Text>
          </View>
          <View style={styles.meter}>
            <LinearGradient colors={accentGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.meterFill, { width: `${pctVal}%` }]} />
          </View>
        </>
      ) : (
        <Text style={[styles.gaugeLbl, { color: colors.muted }]}>No model projection available yet.</Text>
      )}

      {p.marketImpliedPct != null && (
        <View style={styles.edgeRow}>
          <EdgeBox k="Research" v={pctVal != null ? `${pctVal.toFixed(0)}%` : '—'} />
          <EdgeBox k="Market implied" v={`${p.marketImpliedPct.toFixed(0)}%`} />
          <EdgeBox
            k="Edge"
            v={p.edgePct != null ? `${p.edgePct >= 0 ? '+' : ''}${p.edgePct.toFixed(0)}%` : '—'}
            color={p.edgePct != null && p.edgePct >= 0 ? colors.pos : colors.neg}
          />
        </View>
      )}

      <View style={{ marginTop: 6 }}>
        {p.rationale.map((r, i) => (
          <View style={styles.rationale} key={i}>
            <View style={styles.rationaleDot} />
            <Text style={styles.rationaleText}>{r}</Text>
          </View>
        ))}
      </View>
    </LinearGradient>
  );
}

function ConfPill({ conf }: { conf: 'high' | 'medium' | 'low' }) {
  const map = {
    high: { bg: 'rgba(52,211,153,0.18)', fg: colors.pos },
    medium: { bg: 'rgba(240,184,73,0.18)', fg: colors.push },
    low: { bg: colors.surface2, fg: colors.muted },
  }[conf];
  return (
    <View style={[styles.confPill, { backgroundColor: map.bg }]}>
      <Text style={[styles.confText, { color: map.fg }]}>{conf.toUpperCase()} CONFIDENCE</Text>
    </View>
  );
}

function EdgeBox({ k, v, color }: { k: string; v: string; color?: string }) {
  return (
    <View style={styles.edgeBox}>
      <Text style={styles.edgeK}>{k}</Text>
      <Text style={[styles.edgeV, color ? { color } : null]}>{v}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  headTitle: { fontSize: 21, fontWeight: '800', letterSpacing: -0.4, color: colors.text },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },

  hero: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: 22, marginBottom: 14 },
  eyebrow: { textTransform: 'uppercase', letterSpacing: 1.5, fontSize: 11, fontWeight: '700', color: colors.faint },
  heroValue: { fontSize: 42, fontWeight: '800', letterSpacing: -1, marginTop: 8, marginBottom: 4, color: colors.text },

  legs: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, marginBottom: 14, paddingHorizontal: 14, paddingVertical: 4 },
  leg: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border, borderStyle: 'dashed' },
  legMarker: { width: 7, height: 7, borderRadius: 4, marginTop: 6 },
  legSel: { fontWeight: '600', fontSize: 14, color: colors.text },
  legMkt: { color: colors.muted, fontSize: 12, marginTop: 2 },
  legOdds: { marginLeft: 'auto', color: colors.muted, fontSize: 13, fontWeight: '600' },

  viaEspn: { color: colors.faint, fontSize: 11 },

  scorebug: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 14,
    marginBottom: 14,
  },
  team: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  abbr: { fontWeight: '800', fontSize: 15, color: colors.text },
  score: { fontSize: 26, fontWeight: '800', letterSpacing: -0.4, color: colors.text },
  scoreMid: { minWidth: 74, alignItems: 'center' },
  scoreState: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5, color: colors.muted, textTransform: 'uppercase' },
  scoreDetail: { fontSize: 11, color: colors.faint, marginTop: 2 },

  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, padding: 16, marginBottom: 14 },
  oddsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6 },
  oddsK: { color: colors.muted, fontSize: 14 },
  oddsV: { fontWeight: '700', color: colors.text },

  predict: { borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 16, marginBottom: 14 },
  predictHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  predictTitle: { fontWeight: '800', fontSize: 15, color: colors.text },
  confPill: { borderRadius: 999, paddingVertical: 4, paddingHorizontal: 9 },
  confText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.6 },
  gauge: { flexDirection: 'row', alignItems: 'baseline', gap: 10, marginBottom: 4 },
  gaugeBig: { fontSize: 38, fontWeight: '800', letterSpacing: -1, color: colors.text },
  gaugeLbl: { color: colors.muted, fontSize: 13, flex: 1 },
  meter: { height: 10, borderRadius: 999, backgroundColor: colors.surface2, overflow: 'hidden', marginTop: 8, marginBottom: 4 },
  meterFill: { height: '100%', borderRadius: 999 },
  edgeRow: { flexDirection: 'row', gap: 10, marginVertical: 12 },
  edgeBox: { flex: 1, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingVertical: 10, paddingHorizontal: 12, alignItems: 'center' },
  edgeK: { color: colors.muted, fontSize: 11, fontWeight: '600' },
  edgeV: { fontSize: 18, fontWeight: '800', marginTop: 3, color: colors.text },
  rationale: { flexDirection: 'row', gap: 8, marginBottom: 5 },
  rationaleDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.accent, marginTop: 7 },
  rationaleText: { color: colors.muted, fontSize: 13, lineHeight: 19, flex: 1 },
});
