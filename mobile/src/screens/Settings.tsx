import { ScrollView, Text, View, StyleSheet, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../lib/auth';
import { colors } from '../theme';
import { GradientButton } from '../components/ui';

export function Settings({ onCleared }: { onCleared: () => void }) {
  const insets = useSafeAreaInsets();
  const { logout } = useAuth();

  const clearBets = () => {
    Alert.alert('Clear all bets?', 'This permanently removes every saved bet on this device.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: async () => {
          await AsyncStorage.removeItem('pf-bets');
          onCleared();
        },
      },
    ]);
  };

  return (
    <ScrollView
      contentContainerStyle={{ paddingTop: insets.top + 20, paddingHorizontal: 18, paddingBottom: 28 }}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.title}>Settings</Text>

      <GradientButton label="Clear all bets" variant="secondary" onPress={clearBets} style={{ marginTop: 8 }} />
      <Text style={styles.sub}>Removes every saved bet from this device. This can't be undone.</Text>

      <GradientButton label="Log out" variant="secondary" onPress={logout} style={{ marginTop: 18 }} />

      <Text style={styles.footer}>BetFollow · mobile 0.1.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5, color: colors.text, marginBottom: 18 },
  sub: { color: colors.muted, fontSize: 13, marginTop: 8 },
  footer: { color: colors.muted, fontSize: 13, marginTop: 24, textAlign: 'center' },
});
