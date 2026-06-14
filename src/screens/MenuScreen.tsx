import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing } from '../theme';

interface MenuScreenProps {
  onNavigate: (path: string) => void;
}

type NavItem = { label: string; path: string; badge?: string };
type Section = { title: string; items: NavItem[] };

const SECTIONS: Section[] = [
  {
    title: 'DATA',
    items: [
      { label: 'PIPELINES', path: '/settings/pipelines' },
      { label: 'CONNECTIONS', path: '/connections' },
      { label: 'PENDING INPUTS', path: '/inputs' },
      { label: 'RECIPES', path: '/recipes' },
    ],
  },
  {
    title: 'SHOWCASE',
    items: [
      { label: 'MY SHOWCASE', path: '/settings/showcase' },
    ],
  },
  {
    title: 'ACCOUNT',
    items: [
      { label: 'ACCOUNT SETTINGS', path: '/settings/account' },
      { label: 'SUBSCRIPTION', path: '/settings/subscription' },
      { label: 'ENRICHER DATA', path: '/settings/enricher-data' },
    ],
  },
];

export function MenuScreen({ onNavigate }: MenuScreenProps): JSX.Element {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar style="light" />

      <View style={styles.header}>
        <Text style={styles.headerLabel}>NAVIGATE</Text>
        <Text style={styles.headerTitle}>MENU</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {SECTIONS.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionLabel}>{section.title}</Text>
            {section.items.map(({ label, path }) => (
              <TouchableOpacity
                key={path}
                style={styles.row}
                onPress={() => onNavigate(path)}
                activeOpacity={0.7}
              >
                <Text style={styles.rowLabel}>{label}</Text>
                <Text style={styles.rowArrow}>›</Text>
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.ink,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.ink2,
    borderBottomWidth: 1.5,
    borderBottomColor: colors.hairline,
  },
  headerLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.textMuted,
    fontFamily: 'monospace',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.paper,
    textTransform: 'uppercase',
    letterSpacing: -0.5,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  section: {
    marginTop: spacing.lg,
    borderTopWidth: 1.5,
    borderTopColor: colors.hairline,
  },
  sectionLabel: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    fontSize: 9,
    fontWeight: '700',
    color: colors.textMuted,
    fontFamily: 'monospace',
    letterSpacing: 2,
    textTransform: 'uppercase',
    backgroundColor: colors.ink2,
    borderBottomWidth: 1,
    borderBottomColor: colors.hairline,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.ink2,
    borderBottomWidth: 1,
    borderBottomColor: colors.hairline,
  },
  rowLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.paper,
    fontFamily: 'monospace',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  rowArrow: {
    fontSize: 20,
    color: colors.textMuted,
    fontWeight: '300',
  },
});
