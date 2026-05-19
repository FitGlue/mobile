/**
 * FitGlue Mobile Onboarding Screen — Brutal × Aurora
 *
 * Swipeable intro carousel. Aurora gradient CTA, BA typography.
 * Progress indicators are square BA-style (no pill dots).
 */

import React, { useState, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Dimensions,
    FlatList,
    TouchableOpacity,
    NativeSyntheticEvent,
    NativeScrollEvent,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, gradients, spacing } from '../theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface OnboardingSlide {
    id: string;
    emoji: string;
    title: string;
    subtitle: string;
    description: string;
}

const SLIDES: OnboardingSlide[] = [
    {
        id: '1',
        emoji: '🏃',
        title: 'YOUR FITNESS APPS,\nFINALLY TALKING',
        subtitle: 'STRAVA · GARMIN · FITBIT · HEVY · HEALTHKIT',
        description:
            'FitGlue connects all your fitness platforms so your data flows where it needs to — automatically.',
    },
    {
        id: '2',
        emoji: '⚡',
        title: 'SUPERCHARGE\nYOUR WORKOUTS',
        subtitle: 'BOOSTERS THAT ADD THE MISSING PIECES',
        description:
            'Heart rate zones, pace analysis, personal records, calorie estimates — FitGlue enriches every activity with insights your apps don\'t give you.',
    },
    {
        id: '3',
        emoji: '🔗',
        title: 'SET IT ONCE,\nFORGET ABOUT IT',
        subtitle: 'PIPELINES HANDLE THE REST',
        description:
            'Create a pipeline, choose your boosters, and every workout is automatically enhanced and synced across your connected apps.',
    },
];

interface OnboardingScreenProps {
    onComplete: () => void;
}

export function OnboardingScreen({ onComplete }: OnboardingScreenProps): JSX.Element {
    const [currentIndex, setCurrentIndex] = useState(0);
    const flatListRef = useRef<FlatList>(null);
    const insets = useSafeAreaInsets();

    const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        const index = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
        setCurrentIndex(index);
    };

    const handleNext = () => {
        if (currentIndex < SLIDES.length - 1) {
            flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
        } else {
            onComplete();
        }
    };

    const renderSlide = ({ item }: { item: OnboardingSlide }) => (
        <View style={styles.slide}>
            <Text style={styles.slideEmoji}>{item.emoji}</Text>
            <Text style={styles.slideTitle}>{item.title}</Text>
            <Text style={styles.slideSubtitle}>{item.subtitle}</Text>
            <Text style={styles.slideDescription}>{item.description}</Text>
        </View>
    );

    const isLastSlide = currentIndex === SLIDES.length - 1;

    return (
        <View style={styles.container}>
            <StatusBar style="light" />

            {/* Top bar */}
            <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
                <Text style={styles.wordmark}>FITGLUE</Text>
                <TouchableOpacity onPress={onComplete}>
                    <Text style={styles.skipText}>SKIP →</Text>
                </TouchableOpacity>
            </View>

            {/* Aurora accent line under wordmark */}
            <LinearGradient
                colors={gradients.primary}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.accentLine}
            />

            {/* Slides */}
            <FlatList
                ref={flatListRef}
                data={SLIDES}
                renderItem={renderSlide}
                keyExtractor={(item) => item.id}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={handleScroll}
                style={styles.flatList}
            />

            {/* Footer: progress squares + CTA */}
            <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
                {/* Progress squares (BA: no pill dots, use small squares) */}
                <View style={styles.progressRow}>
                    {SLIDES.map((_, index) => (
                        <View
                            key={index}
                            style={[
                                styles.progressSquare,
                                index === currentIndex
                                    ? styles.progressSquareActive
                                    : styles.progressSquareInactive,
                            ]}
                        />
                    ))}
                </View>

                {/* CTA */}
                <TouchableOpacity
                    onPress={handleNext}
                    activeOpacity={0.85}
                    style={styles.ctaWrapper}
                >
                    <LinearGradient
                        colors={gradients.primary}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.ctaButton}
                    >
                        <Text style={styles.ctaText}>
                            {isLastSlide ? 'GET STARTED →' : 'NEXT →'}
                        </Text>
                    </LinearGradient>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.ink,
    },
    topBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.md,
        backgroundColor: colors.ink,
        borderBottomWidth: 3,
        borderBottomColor: colors.paper,
    },
    wordmark: {
        fontSize: 18,
        fontWeight: '900',
        color: colors.paper,
        textTransform: 'uppercase',
        letterSpacing: -0.3,
    },
    skipText: {
        fontSize: 9,
        fontWeight: '700',
        color: colors.textMuted,
        fontFamily: 'monospace',
        letterSpacing: 1.5,
        textTransform: 'uppercase',
    },
    accentLine: {
        height: 3,
    },
    flatList: {
        flex: 1,
    },
    slide: {
        width: SCREEN_WIDTH,
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.xxxl,
        justifyContent: 'center',
        alignItems: 'flex-start',
    },
    slideEmoji: {
        fontSize: 56,
        marginBottom: spacing.xl,
    },
    slideTitle: {
        fontSize: 36,
        fontWeight: '900',
        color: colors.paper,
        textTransform: 'uppercase',
        letterSpacing: -0.5,
        lineHeight: 38,
        marginBottom: spacing.md,
    },
    slideSubtitle: {
        fontSize: 9,
        fontWeight: '700',
        color: colors.violet,
        fontFamily: 'monospace',
        letterSpacing: 1.5,
        textTransform: 'uppercase',
        marginBottom: spacing.lg,
    },
    slideDescription: {
        fontSize: 15,
        color: colors.textSecondary,
        lineHeight: 23,
    },
    footer: {
        paddingHorizontal: spacing.lg,
        gap: spacing.lg,
        paddingTop: spacing.md,
        backgroundColor: colors.ink,
        borderTopWidth: 1.5,
        borderTopColor: colors.hairline,
    },
    progressRow: {
        flexDirection: 'row',
        gap: spacing.xs,
    },
    // BA: square progress indicators (no pills/dots)
    progressSquare: {
        height: 4,
    },
    progressSquareActive: {
        width: 24,
        backgroundColor: colors.paper,
    },
    progressSquareInactive: {
        width: 8,
        backgroundColor: colors.textSubtle,
    },
    ctaWrapper: {},
    ctaButton: {
        paddingVertical: 16,
        alignItems: 'center',
    },
    ctaText: {
        color: colors.ink,
        fontSize: 14,
        fontWeight: '900',
        textTransform: 'uppercase',
        letterSpacing: 2,
    },
});
