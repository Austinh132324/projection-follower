// Small reusable building blocks (button, pill, chip, section head, tiles)
// factored out so the screens read like the web components they mirror.

import type { ReactNode } from 'react';
import { Pressable, Text, View, StyleSheet, type ViewStyle, type TextStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, radius, accentGradient } from '../theme';

export function GradientButton({
  label,
  onPress,
  disabled,
  variant = 'primary',
  icon,
  style,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
  icon?: ReactNode;
  style?: ViewStyle;
}) {
  const content = (
    <View style={styles.btnRow}>
      {icon}
      <Text
        style={[
          styles.btnLabel,
          variant === 'secondary' && { color: colors.text },
          variant === 'danger' && { color: colors.neg },
        ]}
      >
        {label}
      </Text>
    </View>
  );

  if (variant === 'primary') {
    return (
      <Pressable
        onPress={onPress}
        disabled={disabled}
        style={({ pressed }) => [{ opacity: disabled ? 0.55 : pressed ? 0.9 : 1 }, style]}
      >
        <LinearGradient
          colors={accentGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.btn}
        >
          {content}
        </LinearGradient>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.btn,
        styles.btnSecondary,
        { opacity: disabled ? 0.55 : pressed ? 0.85 : 1 },
        style,
      ]}
    >
      {content}
    </Pressable>
  );
}

export function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active?: boolean;
  onPress: () => void;
}) {
  if (active) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}>
        <LinearGradient
          colors={accentGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.chip, { borderColor: 'transparent' }]}
        >
          <Text style={[styles.chipText, { color: '#fff' }]}>{label}</Text>
        </LinearGradient>
      </Pressable>
    );
  }
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.chip, styles.chipIdle, { opacity: pressed ? 0.7 : 1 }]}
    >
      <Text style={styles.chipText}>{label}</Text>
    </Pressable>
  );
}

/** A two-option (or N-option) segmented control, styled like the web `.seg`. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  labelOf,
  style,
}: {
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
  labelOf?: (v: T) => string;
  style?: ViewStyle;
}) {
  return (
    <View style={[styles.seg, style]}>
      {options.map((o) => {
        const on = o === value;
        const label = labelOf ? labelOf(o) : o;
        if (on) {
          return (
            <LinearGradient
              key={o}
              colors={accentGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.segItem}
            >
              <Pressable onPress={() => onChange(o)} style={styles.segPress}>
                <Text style={[styles.segText, { color: '#fff' }]}>{label}</Text>
              </Pressable>
            </LinearGradient>
          );
        }
        return (
          <Pressable key={o} onPress={() => onChange(o)} style={[styles.segItem, styles.segPress]}>
            <Text style={styles.segText}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function SectionHead({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <View style={styles.sectionHead}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action}
    </View>
  );
}

export function Pill({ kind, label }: { kind: string; label: string }) {
  const map: Record<string, { bg: string; fg: string }> = {
    open: { bg: colors.accentTint, fg: colors.accentText },
    win: { bg: colors.posTint, fg: colors.pos },
    loss: { bg: colors.negTint, fg: colors.neg },
    push: { bg: colors.pushTint, fg: colors.push },
    void: { bg: colors.pushTint, fg: colors.push },
    settled: { bg: colors.pushTint, fg: colors.push },
  };
  const c = map[kind] ?? map.settled;
  return (
    <View style={[styles.pill, { backgroundColor: c.bg }]}>
      <Text style={[styles.pillText, { color: c.fg }]}>{label.toUpperCase()}</Text>
    </View>
  );
}

export function BookDot({ color }: { color: string }) {
  return <View style={[styles.bookDot, { backgroundColor: color }]} />;
}

export function Eyebrow({ children, style }: { children: ReactNode; style?: TextStyle }) {
  return <Text style={[styles.eyebrow, style]}>{children}</Text>;
}

export function Note({ children }: { children: ReactNode }) {
  return (
    <View style={styles.note}>
      <Text style={styles.noteText}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  btn: {
    borderRadius: radius.md,
    paddingVertical: 14,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  btnSecondary: {
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  btnRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  btnLabel: { color: '#fff', fontWeight: '700', fontSize: 15 },

  chip: {
    borderRadius: radius.pill,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  chipIdle: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipText: { fontSize: 13, fontWeight: '600', color: colors.muted },

  seg: {
    flexDirection: 'row',
    gap: 6,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: 4,
  },
  segItem: { flex: 1, borderRadius: 9, overflow: 'hidden' },
  segPress: { paddingVertical: 9, paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center' },
  segText: { fontSize: 13, fontWeight: '700', color: colors.muted },

  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 26,
    marginBottom: 12,
    marginHorizontal: 2,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.text },

  pill: {
    borderRadius: radius.pill,
    paddingVertical: 3,
    paddingHorizontal: 8,
    alignSelf: 'flex-end',
    marginTop: 5,
  },
  pillText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },

  bookDot: { width: 10, height: 10, borderRadius: 5 },

  eyebrow: {
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    fontSize: 11,
    fontWeight: '700',
    color: colors.faint,
  },

  note: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderStyle: 'dashed',
    borderRadius: radius.sm,
    padding: 12,
    marginTop: 8,
  },
  noteText: { color: colors.muted, fontSize: 12.5, lineHeight: 18 },
});
