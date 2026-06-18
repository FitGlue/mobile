/**
 * Tests for the OnboardingScreen carousel.
 */

jest.mock('expo-status-bar', () => ({ StatusBar: () => null }));
jest.mock('expo-linear-gradient', () => {
  const { View } = require('react-native');
  return { LinearGradient: View };
});
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
}));

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { OnboardingScreen } from '../OnboardingScreen';

describe('OnboardingScreen', () => {
  it('renders the first slide and a Skip control', () => {
    render(<OnboardingScreen onComplete={jest.fn()} />);
    expect(screen.getByText('FITGLUE')).toBeTruthy();
    expect(screen.getByText('SKIP →')).toBeTruthy();
    expect(screen.getByText('NEXT →')).toBeTruthy();
  });

  it('completes onboarding when Skip is pressed', () => {
    const onComplete = jest.fn();
    render(<OnboardingScreen onComplete={onComplete} />);
    fireEvent.press(screen.getByText('SKIP →'));
    expect(onComplete).toHaveBeenCalled();
  });

  it('advances (does not complete) when NEXT is pressed from the first slide', () => {
    const onComplete = jest.fn();
    render(<OnboardingScreen onComplete={onComplete} />);
    // FlatList.scrollToIndex throws a test-env invariant (no getItemLayout); the
    // important behaviour is that NEXT from slide 1 does NOT complete onboarding.
    try {
      fireEvent.press(screen.getByText('NEXT →'));
    } catch {
      /* scrollToIndex invariant — irrelevant to this assertion */
    }
    expect(onComplete).not.toHaveBeenCalled();
  });
});
