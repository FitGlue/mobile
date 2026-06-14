import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing } from '../theme';

export type ActiveTab = 'dash' | 'activities' | 'more' | 'sync';

interface Props {
  activeTab: ActiveTab;
  onTabPress: (tab: ActiveTab) => void;
}

function GridIcon({ color }: { color: string }) {
  return (
    <View style={[styles.iconGrid]}>
      <View style={styles.iconGridRow}>
        <View style={[styles.iconGridCell, { borderColor: color }]} />
        <View style={[styles.iconGridCell, { borderColor: color }]} />
      </View>
      <View style={styles.iconGridRow}>
        <View style={[styles.iconGridCell, { borderColor: color }]} />
        <View style={[styles.iconGridCell, { borderColor: color }]} />
      </View>
    </View>
  );
}

function ListIcon({ color }: { color: string }) {
  return (
    <View style={styles.iconList}>
      {[0, 1, 2].map(i => (
        <View key={i} style={[styles.iconListLine, { backgroundColor: color }]} />
      ))}
    </View>
  );
}

function MenuIcon({ color }: { color: string }) {
  return (
    <View style={styles.iconMenu}>
      {[0, 1, 2].map(i => (
        <View key={i} style={[styles.iconMenuLine, { backgroundColor: color }, i === 2 && styles.iconMenuLineShort]} />
      ))}
    </View>
  );
}

const TABS: { key: ActiveTab; label: string }[] = [
  { key: 'dash', label: 'DASH' },
  { key: 'activities', label: 'ACTIVITY' },
  { key: 'more', label: 'MORE' },
  { key: 'sync', label: 'SYNC' },
];

function TabIcon({ tab, color }: { tab: ActiveTab; color: string }) {
  switch (tab) {
    case 'dash': return <GridIcon color={color} />;
    case 'activities': return <ListIcon color={color} />;
    case 'more': return <MenuIcon color={color} />;
    case 'sync': return <Text style={[styles.syncIcon, { color }]}>↺</Text>;
  }
}

export function BottomTabBar({ activeTab, onTabPress }: Props): JSX.Element {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom || (Platform.OS === 'ios' ? 20 : 8) }]}>
      {TABS.map(({ key, label }) => {
        const isActive = activeTab === key;
        const color = isActive ? colors.pink : colors.textMuted;
        return (
          <TouchableOpacity
            key={key}
            style={styles.tab}
            onPress={() => onTabPress(key)}
            activeOpacity={0.7}
          >
            <TabIcon tab={key} color={color} />
            <Text style={[styles.label, { color }]}>{label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.ink,
    borderTopWidth: 1.5,
    borderTopColor: colors.hairline,
    paddingTop: spacing.xs,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingTop: spacing.xs,
  },
  label: {
    fontFamily: 'monospace',
    fontSize: 8,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  syncIcon: {
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 20,
  },
  iconGrid: {
    width: 18,
    height: 18,
    flexDirection: 'column',
    gap: 2,
  },
  iconGridRow: {
    flexDirection: 'row',
    flex: 1,
    gap: 2,
  },
  iconGridCell: {
    flex: 1,
    borderWidth: 1.5,
  },
  iconList: {
    width: 18,
    height: 18,
    justifyContent: 'space-between',
    paddingVertical: 1,
  },
  iconListLine: {
    height: 1.5,
    width: '100%',
  },
  iconMenu: {
    width: 18,
    height: 18,
    justifyContent: 'space-between',
    paddingVertical: 1,
  },
  iconMenuLine: {
    height: 1.5,
    width: '100%',
  },
  iconMenuLineShort: {
    width: '65%',
  },
});
