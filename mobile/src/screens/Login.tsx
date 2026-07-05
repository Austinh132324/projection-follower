import { useState } from 'react';
import { Text, View, TextInput, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useAuth } from '../lib/auth';
import { colors, radius } from '../theme';
import { LogoBadge } from '../components/icons';
import { GradientButton } from '../components/ui';

export function Login() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const submit = () => {
    if (!login(username, password)) setError('Incorrect username or password.');
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.wrap}
    >
      <View style={styles.brand}>
        <LogoBadge size={72} />
        <Text style={styles.brandName}>BetFollow</Text>
      </View>

      <TextInput
        style={styles.input}
        autoCapitalize="none"
        autoCorrect={false}
        placeholder="Username"
        placeholderTextColor={colors.faint}
        value={username}
        onChangeText={(t) => {
          setUsername(t);
          setError('');
        }}
      />
      <TextInput
        style={styles.input}
        secureTextEntry
        placeholder="Password"
        placeholderTextColor={colors.faint}
        value={password}
        onChangeText={(t) => {
          setPassword(t);
          setError('');
        }}
        onSubmitEditing={submit}
      />

      {!!error && <Text style={styles.error}>{error}</Text>}

      <GradientButton label="Sign in" onPress={submit} style={{ marginTop: 6 }} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, justifyContent: 'center', paddingHorizontal: 22, backgroundColor: colors.bg },
  brand: { alignItems: 'center', gap: 16, marginBottom: 32 },
  brandName: { fontSize: 24, fontWeight: '800', letterSpacing: -0.5, color: colors.text },
  input: {
    width: '100%',
    paddingVertical: 15,
    paddingHorizontal: 16,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    fontSize: 16,
    marginBottom: 14,
  },
  error: { color: colors.neg, fontSize: 13, fontWeight: '600', marginBottom: 14, marginTop: -4 },
});
