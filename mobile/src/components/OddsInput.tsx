import { useState } from 'react';
import { Pressable, Text, TextInput, View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, radius, accentGradient } from '../theme';

/**
 * American-odds input with a −/+ sign toggle (the field itself is magnitude
 * only). Ported from web/src/components/OddsInput.tsx. Emits a signed number,
 * or null when empty.
 */
export function OddsInput({
  value,
  onChange,
  placeholder = 'Odds',
}: {
  value: number | null;
  onChange: (n: number | null) => void;
  placeholder?: string;
}) {
  const [sign, setSign] = useState<1 | -1>(value != null && value > 0 ? 1 : -1);
  const mag = value == null ? '' : String(Math.abs(value));

  const applySign = (s: 1 | -1) => {
    setSign(s);
    if (value != null) onChange(s * Math.abs(value));
  };
  const applyMag = (str: string) => {
    const clean = str.replace(/[^0-9]/g, '');
    if (clean === '') return onChange(null);
    onChange(sign * Math.abs(Number(clean)));
  };

  return (
    <View style={styles.row}>
      <View style={styles.signSeg}>
        <SignBtn label="−" on={sign < 0} onPress={() => applySign(-1)} />
        <SignBtn label="+" on={sign > 0} onPress={() => applySign(1)} />
      </View>
      <TextInput
        style={styles.input}
        keyboardType="number-pad"
        placeholder={placeholder}
        placeholderTextColor={colors.faint}
        value={mag}
        onChangeText={applyMag}
      />
    </View>
  );
}

function SignBtn({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  if (on) {
    return (
      <LinearGradient colors={accentGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.signBtn}>
        <Pressable onPress={onPress} style={styles.signPress}>
          <Text style={[styles.signText, { color: '#fff' }]}>{label}</Text>
        </Pressable>
      </LinearGradient>
    );
  }
  return (
    <Pressable onPress={onPress} style={[styles.signBtn, styles.signPress]}>
      <Text style={styles.signText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8, alignItems: 'stretch' },
  signSeg: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  signBtn: { width: 40 },
  signPress: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  signText: { fontSize: 20, fontWeight: '800', color: colors.muted },
  input: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    fontSize: 16,
  },
});
