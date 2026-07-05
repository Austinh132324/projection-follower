import { Pressable, Text, View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, accentGradient } from '../theme';
import { HomeIcon, ListIcon, ChartIcon, GearIcon, ScoutIcon, PlusIcon } from './icons';

export type Tab = 'home' | 'bets' | 'scout' | 'stats' | 'settings';

type IconCmp = (p: { active?: boolean; color?: string }) => JSX.Element;

const LEFT: { id: Tab; label: string; icon: IconCmp }[] = [
  { id: 'home', label: 'Home', icon: HomeIcon },
  { id: 'bets', label: 'Bets', icon: ListIcon },
];
const RIGHT: { id: Tab; label: string; icon: IconCmp }[] = [
  { id: 'scout', label: 'Scout', icon: ScoutIcon },
  { id: 'stats', label: 'Stats', icon: ChartIcon },
  { id: 'settings', label: 'Settings', icon: GearIcon },
];

export function BottomNav({
  active,
  onChange,
  onAdd,
}: {
  active: Tab;
  onChange: (t: Tab) => void;
  onAdd: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.nav, { height: 68 + insets.bottom, paddingBottom: insets.bottom }]}>
      {LEFT.map((t) => (
        <NavItem key={t.id} {...t} active={active === t.id} onPress={() => onChange(t.id)} />
      ))}

      <View style={styles.fabSlot}>
        <Pressable onPress={onAdd} style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.92 : 1 }] })}>
          <LinearGradient colors={accentGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.fab}>
            <PlusIcon />
          </LinearGradient>
        </Pressable>
      </View>

      {RIGHT.map((t) => (
        <NavItem key={t.id} {...t} active={active === t.id} onPress={() => onChange(t.id)} />
      ))}
    </View>
  );
}

function NavItem({
  label,
  icon: Icon,
  active,
  onPress,
}: {
  label: string;
  icon: IconCmp;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.item}>
      {active && <View style={styles.pill} />}
      <Icon active={active} color={active ? colors.text : colors.faint} />
      <Text style={[styles.itemLabel, active && { color: colors.text }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#0c0c14',
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  item: {
    flex: 1,
    height: 68,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  itemLabel: { color: colors.faint, fontSize: 11, fontWeight: '600' },
  pill: {
    position: 'absolute',
    top: 6,
    bottom: 6,
    left: 6,
    right: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(124, 92, 255, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(124, 92, 255, 0.22)',
  },
  fabSlot: { flex: 1, height: 68, alignItems: 'center', justifyContent: 'center' },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginTop: -26,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: colors.bg,
  },
});
