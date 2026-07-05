import { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Bet, Book, BetType, BetStatus } from '../lib/types';
import { BOOK_LABELS, BET_TYPE_LABELS } from '../lib/types';
import {
  type BetDraft,
  type DraftLeg,
  draftToBet,
  computePotentialPayout,
  BOOK_OPTIONS,
  BET_TYPES,
  RESULT_OPTIONS,
} from '../lib/betDraft';
import { LEAGUES } from '../lib/espn';
import { money, formatDate } from '../lib/stats';
import { colors, radius } from '../theme';
import { CloseIcon, TrashIcon } from './icons';
import { Chip, GradientButton, Segmented } from './ui';
import { OddsInput } from './OddsInput';

export function BetForm({
  initial,
  title,
  onSave,
  onClose,
}: {
  initial: BetDraft;
  title: string;
  onSave: (bet: Bet) => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState<BetDraft>(initial);
  const patch = (p: Partial<BetDraft>) => setDraft((d) => ({ ...d, ...p }));

  const setLeg = (i: number, p: Partial<DraftLeg>) =>
    setDraft((d) => ({ ...d, legs: d.legs.map((l, idx) => (idx === i ? { ...l, ...p } : l)) }));
  const addLeg = () =>
    setDraft((d) => ({
      ...d,
      legs: [...d.legs, { selection: '', market: '', event: '', oddsAmerican: null, result: null }],
      betType: d.legs.length >= 1 && d.betType === 'single' ? 'parlay' : d.betType,
    }));
  const removeLeg = (i: number) =>
    setDraft((d) => ({ ...d, legs: d.legs.filter((_, idx) => idx !== i) }));

  const canSave =
    draft.legs.some((l) => l.selection.trim()) &&
    (draft.stake > 0 || (draft.potentialPayout ?? 0) > 0);
  const projected = computePotentialPayout(draft);

  return (
    <Modal animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1, backgroundColor: colors.bg }}
      >
        <ScrollView
          contentContainerStyle={{ paddingTop: insets.top + 8, paddingHorizontal: 18, paddingBottom: 40 + insets.bottom }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.head}>
            <Text style={styles.headTitle}>{title}</Text>
            <Pressable onPress={onClose} style={styles.iconBtn}>
              <CloseIcon />
            </Pressable>
          </View>

          <Label>Book</Label>
          <ChipWrap>
            {BOOK_OPTIONS.map((b) => (
              <Chip key={b} label={BOOK_LABELS[b]} active={draft.book === b} onPress={() => patch({ book: b as Book })} />
            ))}
          </ChipWrap>

          <Label>Type</Label>
          <ChipWrap>
            {BET_TYPES.map((t) => (
              <Chip key={t} label={BET_TYPE_LABELS[t]} active={draft.betType === t} onPress={() => patch({ betType: t as BetType })} />
            ))}
          </ChipWrap>

          <Label>League — optional</Label>
          <ChipWrap>
            <Chip label="None" active={!draft.league} onPress={() => patch({ league: null })} />
            {LEAGUES.map((l) => (
              <Chip key={l.id} label={l.label} active={draft.league === l.id} onPress={() => patch({ league: l.id })} />
            ))}
          </ChipWrap>

          <View style={{ height: 14 }} />
          <Segmented
            options={['open', 'settled'] as BetStatus[]}
            value={draft.status}
            onChange={(s) => patch({ status: s })}
            labelOf={(s) => (s === 'open' ? 'Open' : 'Settled')}
          />

          {draft.status === 'settled' && (
            <Segmented
              style={{ marginTop: 12 }}
              options={RESULT_OPTIONS}
              value={(draft.result ?? 'win') as (typeof RESULT_OPTIONS)[number]}
              onChange={(r) => patch({ result: r })}
              labelOf={(r) => r[0].toUpperCase() + r.slice(1)}
            />
          )}

          <View style={styles.formRow}>
            <View style={{ flex: 1 }}>
              <Label>Stake $</Label>
              <TextInput
                style={styles.input}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor={colors.faint}
                value={draft.stake ? String(draft.stake) : ''}
                onChangeText={(v) => patch({ stake: Number(v.replace(/[^0-9.]/g, '')) || 0 })}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Label>Odds</Label>
              <OddsInput value={draft.oddsAmerican} onChange={(n) => patch({ oddsAmerican: n })} />
            </View>
          </View>

          <Label>{`Payout — to win ${money(projected)}`}</Label>
          <TextInput
            style={styles.input}
            keyboardType="decimal-pad"
            placeholder={`${projected}`}
            placeholderTextColor={colors.faint}
            value={draft.potentialPayout != null ? String(draft.potentialPayout) : ''}
            onChangeText={(v) =>
              patch({ potentialPayout: v === '' ? null : Number(v.replace(/[^0-9.]/g, '')) })
            }
          />

          <Text style={styles.placed}>Placed {formatDate(draft.placedAt)}</Text>

          <View style={styles.legsHead}>
            <Text style={styles.legsTitle}>Legs</Text>
            <Text style={styles.legsSub}>To win {money(projected)}</Text>
          </View>

          {draft.legs.map((leg, i) => (
            <View style={styles.legEdit} key={i}>
              {draft.legs.length > 1 && (
                <View style={styles.legTop}>
                  <Text style={styles.legNum}>{i + 1}</Text>
                  <Pressable onPress={() => removeLeg(i)} style={styles.legTrash}>
                    <TrashIcon size={16} />
                  </Pressable>
                </View>
              )}
              <TextInput
                style={[styles.input, styles.mini, { marginBottom: 8 }]}
                placeholder="Selection"
                placeholderTextColor={colors.faint}
                value={leg.selection}
                onChangeText={(t) => setLeg(i, { selection: t })}
              />
              <View style={styles.formRow}>
                <TextInput
                  style={[styles.input, styles.mini, { flex: 1 }]}
                  placeholder="Matchup"
                  placeholderTextColor={colors.faint}
                  value={leg.event}
                  onChangeText={(t) => setLeg(i, { event: t })}
                />
                <View style={{ width: 132 }}>
                  <OddsInput value={leg.oddsAmerican} onChange={(n) => setLeg(i, { oddsAmerican: n })} />
                </View>
              </View>
            </View>
          ))}

          <Pressable onPress={addLeg} hitSlop={8}>
            <Text style={styles.addLeg}>+ Add leg</Text>
          </Pressable>

          <GradientButton
            label="Save"
            onPress={() => onSave(draftToBet(draft))}
            disabled={!canSave}
            style={{ marginTop: 20 }}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <Text style={styles.label}>{children}</Text>;
}

function ChipWrap({ children }: { children: React.ReactNode }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipWrap}>
      {children}
    </ScrollView>
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
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.muted,
    marginTop: 14,
    marginBottom: 7,
  },
  chipWrap: { gap: 8, paddingVertical: 2 },
  formRow: { flexDirection: 'row', gap: 12 },
  input: {
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    fontSize: 16,
  },
  mini: { fontSize: 13, paddingVertical: 10, paddingHorizontal: 12 },
  placed: { color: colors.muted, fontSize: 12.5, marginTop: 12 },
  legsHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 18,
    marginBottom: 10,
    marginHorizontal: 2,
  },
  legsTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  legsSub: { color: colors.muted, fontSize: 12 },
  legEdit: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 12,
    marginBottom: 10,
  },
  legTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  legNum: { fontSize: 12, fontWeight: '700', color: colors.faint },
  legTrash: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface2,
  },
  addLeg: { color: colors.accent, fontWeight: '700', fontSize: 14, paddingVertical: 8 },
});
