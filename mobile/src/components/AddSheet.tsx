import { Modal, Pressable, Text, View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { colors, radius } from '../theme';
import { ImagesIcon, CameraIcon, EditIcon } from './icons';

/**
 * The "add a bet" chooser. Two photo paths use expo-image-picker; the web app's
 * in-browser OCR (tesseract.js + canvas) has no on-device equivalent here, so a
 * picked photo opens the entry form tagged as a photo import for you to fill in
 * and confirm — the same "review before saving" flow as the web.
 */
export function AddSheet({
  onClose,
  onManual,
  onPhoto,
}: {
  onClose: () => void;
  onManual: () => void;
  onPhoto: (uri: string) => void;
}) {
  const insets = useSafeAreaInsets();

  const pickLibrary = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const res = await ImagePicker.launchImageLibraryAsync({ quality: 0.7 });
    if (!res.canceled && res.assets[0]) onPhoto(res.assets[0].uri);
  };

  const takePhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return;
    const res = await ImagePicker.launchCameraAsync({ quality: 0.7 });
    if (!res.canceled && res.assets[0]) onPhoto(res.assets[0].uri);
  };

  return (
    <Modal transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={[styles.sheet, { paddingBottom: 24 + insets.bottom }]} onPress={() => {}}>
          <View style={styles.handle} />
          <Text style={styles.title}>Add a bet</Text>
          <Text style={styles.sub}>Import a slip screenshot, or enter it yourself.</Text>

          <Choice
            icon={<ImagesIcon />}
            title="Photo Library"
            desc="Pick a screenshot to attach and review"
            onPress={pickLibrary}
          />
          <Choice
            icon={<CameraIcon />}
            title="Take a photo"
            desc="Snap the bet slip now"
            onPress={takePhoto}
          />
          <Choice
            icon={<EditIcon />}
            title="Enter manually"
            desc="Type the book, stake, odds, and legs"
            onPress={onManual}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function Choice({
  icon,
  title,
  desc,
  onPress,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.choice, { opacity: pressed ? 0.8 : 1 }]}
    >
      <View style={styles.choiceIc}>{icon}</View>
      <View style={{ flex: 1 }}>
        <Text style={styles.choiceTitle}>{title}</Text>
        <Text style={styles.choiceDesc}>{desc}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.bgElev,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 18,
    paddingTop: 10,
  },
  handle: { width: 40, height: 4, borderRadius: 999, backgroundColor: colors.borderStrong, alignSelf: 'center', marginTop: 6, marginBottom: 16 },
  title: { fontSize: 20, fontWeight: '800', letterSpacing: -0.4, color: colors.text, marginBottom: 4 },
  sub: { color: colors.muted, fontSize: 13, marginBottom: 18 },
  choice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
  },
  choiceIc: {
    width: 46,
    height: 46,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accentTint,
  },
  choiceTitle: { fontWeight: '700', fontSize: 16, color: colors.text },
  choiceDesc: { color: colors.muted, fontSize: 12.5, marginTop: 2 },
});
