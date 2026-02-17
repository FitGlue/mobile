/**
 * FitGlue Mobile Onboarding Screen
 *
 * Swipeable intro carousel that tells the FitGlue story
 * to first-time users before they reach the login screen.
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
        emoji: '🏃‍♂️',
        title: 'Your fitness apps,\nfinally talking',
        subtitle: 'Strava • Garmin • Fitbit • Hevy • Apple HealthKit',
        description:
            'FitGlue connects all your fitness platforms so your data flows where it needs to — automatically.',
    },
    {
        id: '2',
        emoji: '⚡',
        title: 'Supercharge\nyour workouts',
        subtitle: 'Boosters that add the missing pieces',
        description:
            'Heart rate zones, pace analysis, personal records, calorie estimates — FitGlue enriches every activity with insights your apps don\'t give you.',
    },
    {
        id: '3',
        emoji: '🔗',
        title: 'Set it once,\nforget about it',
        subtitle: 'Pipelines handle the rest',
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

            {/* Skip button */}
            <TouchableOpacity style={styles.skipButton} onPress={onComplete}>
                <Text style={styles.skipText}>Skip</Text>
            </TouchableOpacity>

            {/* Branding */}
            <View style={styles.brandRow}>
                <Text style={styles.brandFit}>Fit</Text>
                <Text style={styles.brandGlue}>Glue</Text>
            </View>

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

            {/* Dots and CTA */}
            <View style={styles.footer}>
                {/* Pagination dots */}
                <View style={styles.dots}>
                    {SLIDES.map((_, index) => (
                        <View
                            key={index}
                            style={[
                                styles.dot,
                                index === currentIndex ? styles.dotActive : styles.dotInactive,
                            ]}
                        />
                    ))}
                </View>

                {/* CTA Button */}
                <TouchableOpacity
                    style={styles.ctaWrapper}
                    onPress={handleNext}
                    activeOpacity={0.8}
                >
                    <LinearGradient
                        colors={['#FF006E', '#8338EC']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.ctaButton}
                    >
                        <Text style={styles.ctaText}>
                            {isLastSlide ? 'GET STARTED' : 'NEXT'}
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
        backgroundColor: '#0d0d0d',
    },
    skipButton: {
        position: 'absolute',
        top: 60,
        right: 24,
        zIndex: 10,
        padding: 8,
    },
    skipText: {
        color: '#888',
        fontSize: 16,
    },
    brandRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        paddingTop: 80,
        marginBottom: 8,
    },
    brandFit: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#FF006E',
    },
    brandGlue: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#8338EC',
    },
    flatList: {
        flex: 1,
    },
    slide: {
        width: SCREEN_WIDTH,
        paddingHorizontal: 32,
        justifyContent: 'center',
        alignItems: 'center',
    },
    slideEmoji: {
        fontSize: 72,
        marginBottom: 24,
    },
    slideTitle: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#ffffff',
        textAlign: 'center',
        lineHeight: 40,
        marginBottom: 12,
    },
    slideSubtitle: {
        fontSize: 14,
        color: '#FF006E',
        textAlign: 'center',
        fontWeight: '600',
        letterSpacing: 0.5,
        marginBottom: 20,
    },
    slideDescription: {
        fontSize: 16,
        color: '#aaa',
        textAlign: 'center',
        lineHeight: 24,
        paddingHorizontal: 8,
    },
    footer: {
        paddingHorizontal: 32,
        paddingBottom: 60,
        alignItems: 'center',
        gap: 24,
    },
    dots: {
        flexDirection: 'row',
        gap: 8,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    dotActive: {
        backgroundColor: '#FF006E',
        width: 24,
    },
    dotInactive: {
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
    },
    ctaWrapper: {
        width: '100%',
        borderRadius: 12,
        overflow: 'hidden',
    },
    ctaButton: {
        paddingVertical: 18,
        alignItems: 'center',
        borderRadius: 12,
    },
    ctaText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
        letterSpacing: 1.5,
    },
});
