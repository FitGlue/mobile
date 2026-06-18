/**
 * Tests for the design-token module. These mostly guard against accidental
 * deletion / mutation of tokens that the whole UI depends on.
 */
import { colors, gradients, spacing, radii, typography } from '../theme';

describe('theme tokens', () => {
  it('exposes the core aurora palette', () => {
    expect(colors.pink).toBe('#FF3DA6');
    expect(colors.violet).toBe('#8B5CF6');
    expect(colors.cyan).toBe('#22D3EE');
    expect(colors.ink).toBe('#0A0A0F');
  });

  it('keeps legacy aliases pointing at the new palette', () => {
    expect(colors.primary).toBe(colors.pink);
    expect(colors.secondary).toBe(colors.violet);
    expect(colors.background).toBe(colors.ink);
  });

  it('defines the full aurora gradient as pink → violet → cyan', () => {
    expect(gradients.primary).toEqual(['#FF3DA6', '#8B5CF6', '#22D3EE']);
    expect(gradients.primarySurface).toHaveLength(2);
  });

  it('uses an 4px-based spacing scale', () => {
    expect(spacing.xs).toBe(4);
    expect(spacing.sm).toBe(8);
    expect(spacing.xxxl).toBe(32);
  });

  it('squares off cards but keeps pills/avatars rounded', () => {
    expect(radii.sm).toBe(4);
    expect(radii.md).toBe(0);
    expect(radii.lg).toBe(0);
    expect(radii.round).toBe(9999);
  });

  it('uses heavy uppercase display type and monospace captions', () => {
    expect(typography.titleLg.fontWeight).toBe('900');
    expect(typography.titleLg.textTransform).toBe('uppercase');
    expect(typography.caption.fontFamily).toBe('monospace');
    expect(typography.label.letterSpacing).toBe(2);
  });
});
