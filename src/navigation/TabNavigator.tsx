import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { apiConfig } from '../config/environment';
import { WebAppScreen } from '../screens/WebAppScreen';
import { SyncScreen } from '../screens/SyncScreen';
import { colors, spacing } from '../theme';

export type TabParamList = {
  Dashboard: undefined;
  Activities: undefined;
  Pipelines: undefined;
  Sync: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();

// Minimal square icon using the BA/Brutal design language
function TabIcon({ color, shape }: { color: string; shape: 'grid' | 'list' | 'flow' | 'sync' }) {
  switch (shape) {
    case 'grid':
      return (
        <View style={[styles.iconGrid]}>
          <View style={[styles.iconGridRow]}>
            <View style={[styles.iconGridCell, { borderColor: color }]} />
            <View style={[styles.iconGridCell, { borderColor: color }]} />
          </View>
          <View style={[styles.iconGridRow]}>
            <View style={[styles.iconGridCell, { borderColor: color }]} />
            <View style={[styles.iconGridCell, { borderColor: color }]} />
          </View>
        </View>
      );
    case 'list':
      return (
        <View style={styles.iconList}>
          {[0, 1, 2].map(i => (
            <View key={i} style={[styles.iconListLine, { backgroundColor: color }]} />
          ))}
        </View>
      );
    case 'flow':
      return (
        <View style={[styles.iconFlow]}>
          <View style={[styles.iconFlowDot, { backgroundColor: color }]} />
          <View style={[styles.iconFlowLine, { backgroundColor: color }]} />
          <View style={[styles.iconFlowDot, { backgroundColor: color }]} />
          <View style={[styles.iconFlowLine, { backgroundColor: color }]} />
          <View style={[styles.iconFlowDot, { backgroundColor: color }]} />
        </View>
      );
    case 'sync':
      return (
        <Text style={[styles.iconSync, { color }]}>↺</Text>
      );
  }
}

// Wrapper components so each tab has its own screen instance.
// tabName is passed to WebAppScreen so push notification deep links can drive
// WebView navigation via the global webViewRegistry.
function DashboardTab() {
  return <WebAppScreen url={`${apiConfig.baseUrl}/app/`} tabName="Dashboard" />;
}

function ActivitiesTab() {
  return <WebAppScreen url={`${apiConfig.baseUrl}/app/activities`} tabName="Activities" />;
}

function PipelinesTab() {
  return <WebAppScreen url={`${apiConfig.baseUrl}/app/settings/pipelines`} tabName="Pipelines" />;
}

export function TabNavigator() {
  const TAB_BAR_HEIGHT = Platform.OS === 'ios' ? 84 : 60;

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.ink,
          borderTopColor: colors.hairline,
          borderTopWidth: 1.5,
          height: TAB_BAR_HEIGHT,
          paddingBottom: Platform.OS === 'ios' ? 28 : 8,
          paddingTop: spacing.xs,
        },
        tabBarActiveTintColor: colors.pink,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: {
          fontFamily: 'monospace',
          fontSize: 8,
          fontWeight: '700',
          textTransform: 'uppercase',
          letterSpacing: 1,
          marginTop: 2,
        },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardTab}
        options={{
          tabBarLabel: 'DASH',
          tabBarIcon: ({ color }) => <TabIcon color={color} shape="grid" />,
        }}
      />
      <Tab.Screen
        name="Activities"
        component={ActivitiesTab}
        options={{
          tabBarLabel: 'ACTIVITY',
          tabBarIcon: ({ color }) => <TabIcon color={color} shape="list" />,
        }}
      />
      <Tab.Screen
        name="Pipelines"
        component={PipelinesTab}
        options={{
          tabBarLabel: 'PIPELINES',
          tabBarIcon: ({ color }) => <TabIcon color={color} shape="flow" />,
        }}
      />
      <Tab.Screen
        name="Sync"
        component={SyncScreen}
        options={{
          tabBarLabel: 'SYNC',
          tabBarIcon: ({ color }) => <TabIcon color={color} shape="sync" />,
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
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
  iconSync: {
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 20,
  },
});
