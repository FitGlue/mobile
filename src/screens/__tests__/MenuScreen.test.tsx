/**
 * Tests for the MenuScreen navigation list.
 */

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('expo-status-bar', () => ({ StatusBar: () => null }));

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { MenuScreen } from '../MenuScreen';

describe('MenuScreen', () => {
  it('renders the section headers and a sampling of nav rows', () => {
    render(<MenuScreen onNavigate={jest.fn()} />);

    expect(screen.getByText('DATA')).toBeTruthy();
    expect(screen.getByText('SHOWCASE')).toBeTruthy();
    expect(screen.getByText('ACCOUNT')).toBeTruthy();
    expect(screen.getByText('PIPELINES')).toBeTruthy();
    expect(screen.getByText('SUBSCRIPTION')).toBeTruthy();
  });

  it('navigates to the row path when a row is pressed', () => {
    const onNavigate = jest.fn();
    render(<MenuScreen onNavigate={onNavigate} />);

    fireEvent.press(screen.getByText('CONNECTIONS'));
    expect(onNavigate).toHaveBeenCalledWith('/connections');

    fireEvent.press(screen.getByText('MY SHOWCASE'));
    expect(onNavigate).toHaveBeenCalledWith('/settings/showcase');
  });
});
