import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing } from '../theme';

export type ActiveTab = 'dash' | 'activities' | 'pipelines' | 'sync';

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

function FlowIcon({ color }: { color: string }) {
  return (
    <View style={styles.iconFlow}>
      <View style={[styles.iconFlowDot, { backgroundColor: color }]} />
      <View style={[styles.iconFlowLine, { backgroundColor: color }]} />
      <View style={[styles.iconFlowDot, { backgroundColor: color }]} />
      <View style={[styles.iconFlowLine, { backgroundColor: color }]} />
      <View style={[styles.iconFlowDot, { backgroundColor: color }]} />
    </View>
  );
}

const TABS: { key: ActiveTab; label: string }[] = [
  { key: 'dash', label: 'DASH' },
  { key: 'activities', label: 'ACTIVITY' },
  { key: 'pipelines', label: 'PIPELINES' },
  { key: 'sync', label: 'SYNC' },
];

function TabIcon({ tab, color }: { tab: ActiveTab; color: string }) {
  switch (tab) {
    case 'dash': return <GridIcon color={color} />;
    case 'activities': return <ListIcon color={color} />;
    case 'pipelines': return <FlowIcon color={color} />;
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
  iconFlow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 22,
    height: 18,
    gap: 1,
  },
  iconFlowDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  iconFlowLine: {
    flex: 1,
    height: 1.5,
  },
});
