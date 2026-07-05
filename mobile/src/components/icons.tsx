// Stroke icons ported from web/src/components/icons.tsx to react-native-svg.

import { View } from 'react-native';
import Svg, { Path, Rect, Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { colors } from '../theme';

type P = { active?: boolean; color?: string; size?: number };
const sw = (active?: boolean) => (active ? 2.4 : 2);

export function HomeIcon({ active, color = 'currentColor', size = 23 }: P) {
  return (
    <Svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth={sw(active)} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M3 10.5 12 3l9 7.5" />
      <Path d="M5 9.5V20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9.5" />
    </Svg>
  );
}

export function ListIcon({ active, color = 'currentColor', size = 23 }: P) {
  return (
    <Svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth={sw(active)} strokeLinecap="round" strokeLinejoin="round">
      <Rect x="3.5" y="5" width="17" height="4.2" rx="1.4" />
      <Rect x="3.5" y="14.8" width="17" height="4.2" rx="1.4" />
    </Svg>
  );
}

export function ChartIcon({ active, color = 'currentColor', size = 23 }: P) {
  return (
    <Svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth={sw(active)} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M4 20V4" />
      <Path d="M4 20h16" />
      <Rect x="8" y="11" width="3.2" height="6" rx="1" />
      <Rect x="14" y="7" width="3.2" height="10" rx="1" />
    </Svg>
  );
}

export function ScoutIcon({ active, color = 'currentColor', size = 23 }: P) {
  return (
    <Svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth={sw(active)} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx="12" cy="12" r="8.2" />
      <Circle cx="12" cy="12" r="3.4" />
      <Path d="M12 1.6v3M12 19.4v3M22.4 12h-3M4.6 12h-3" />
    </Svg>
  );
}

export function GearIcon({ active, color = 'currentColor', size = 23 }: P) {
  return (
    <Svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth={active ? 1.9 : 1.6} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.24-.438.613-.43.992a7.7 7.7 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.5 6.5 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.5 6.5 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.9 6.9 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.281Z" />
      <Path d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
    </Svg>
  );
}

/** BetFollow mark: three ascending bars in purple. */
export function LogoMark({ size = 24 }: { size?: number }) {
  return (
    <Svg viewBox="0 0 24 24" width={size} height={size} fill="none">
      <Defs>
        <LinearGradient id="pf-bar" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#a78bfa" />
          <Stop offset="100%" stopColor="#7c3aed" />
        </LinearGradient>
      </Defs>
      <Rect x="4.6" y="13.4" width="3.7" height="6" rx="1.3" fill="#4c4270" />
      <Rect x="10.15" y="9.4" width="3.7" height="10" rx="1.3" fill="#6d5bb0" />
      <Rect x="15.7" y="5.4" width="3.7" height="14" rx="1.3" fill="url(#pf-bar)" />
    </Svg>
  );
}

/** The logo on its dark tile — matches the app / home-screen icon. */
export function LogoBadge({ size = 38 }: { size?: number }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.28),
        backgroundColor: '#150f22',
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <LogoMark size={Math.round(size * 0.66)} />
    </View>
  );
}

export function PlusIcon({ size = 26, color = '#fff' }: P) {
  return (
    <Svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth={2.6} strokeLinecap="round">
      <Path d="M12 5v14M5 12h14" />
    </Svg>
  );
}

export function ImagesIcon({ size = 22, color = colors.accent }: P) {
  return (
    <Svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Rect x="7" y="3" width="14" height="14" rx="2.5" />
      <Circle cx="11" cy="7.5" r="1.4" />
      <Path d="M21 12.5l-4-3.5-6 5.5" />
      <Path d="M17 21H5a2 2 0 0 1-2-2V8" />
    </Svg>
  );
}

export function CameraIcon({ size = 22, color = colors.accent }: P) {
  return (
    <Svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M4 8a2 2 0 0 1 2-2h1.2a2 2 0 0 0 1.6-.8l.8-1.1a1 1 0 0 1 .8-.4h3.2a1 1 0 0 1 .8.4l.8 1.1a2 2 0 0 0 1.6.8H18a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" />
      <Circle cx="12" cy="13" r="3.2" />
    </Svg>
  );
}

export function EditIcon({ size = 20, color = colors.accent }: P) {
  return (
    <Svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 20h9" />
      <Path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
    </Svg>
  );
}

export function TrashIcon({ size = 20, color = colors.neg }: P) {
  return (
    <Svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M6 6l1 14a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-14" />
    </Svg>
  );
}

export function CloseIcon({ size = 22, color = colors.text }: P) {
  return (
    <Svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round">
      <Path d="M6 6l12 12M18 6L6 18" />
    </Svg>
  );
}
