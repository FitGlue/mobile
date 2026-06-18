/**
 * Tests for the BottomTabBar. The safe-area inset hook is mocked.
 */

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 34, left: 0, right: 0 }),
}));

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { BottomTabBar } from '../BottomTabBar';

describe('BottomTabBar', () => {
  it('renders all four tab labels', () => {
    render(<BottomTabBar activeTab="dash" onTabPress={jest.fn()} />);
    ['DASH', 'ACTIVITY', 'MORE', 'SYNC'].forEach(label => {
      expect(screen.getByText(label)).toBeTruthy();
    });
  });

  it('fires onTabPress with the tapped tab key', () => {
    const onTabPress = jest.fn();
    render(<BottomTabBar activeTab="dash" onTabPress={onTabPress} />);

    fireEvent.press(screen.getByText('ACTIVITY'));
    expect(onTabPress).toHaveBeenCalledWith('activities');

    fireEvent.press(screen.getByText('SYNC'));
    expect(onTabPress).toHaveBeenCalledWith('sync');

    fireEvent.press(screen.getByText('MORE'));
    expect(onTabPress).toHaveBeenCalledWith('more');
  });

  it('renders the sync glyph for the sync tab', () => {
    render(<BottomTabBar activeTab="sync" onTabPress={jest.fn()} />);
    expect(screen.getByText('↺')).toBeTruthy();
  });
});
