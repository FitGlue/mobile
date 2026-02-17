/**
 * Tests for Firebase auth error message mapper.
 */

import { getAuthErrorMessage } from '../authErrors';

describe('getAuthErrorMessage', () => {
    it('maps known Firebase error codes to friendly messages', () => {
        const cases: [string, string][] = [
            ['auth/invalid-email', 'Invalid email address format.'],
            ['auth/user-disabled', 'This account has been disabled.'],
            ['auth/user-not-found', 'No account found with this email.'],
            ['auth/wrong-password', 'Incorrect password.'],
            ['auth/invalid-credential', 'Invalid email or password.'],
            ['auth/too-many-requests', 'Too many failed attempts. Please try again later.'],
            ['auth/network-request-failed', 'Network error. Please check your connection.'],
            ['auth/email-already-in-use', 'An account with this email already exists.'],
            ['auth/weak-password', 'Password is too weak.'],
            ['auth/operation-not-allowed', 'This operation is not allowed.'],
        ];

        for (const [code, expected] of cases) {
            expect(getAuthErrorMessage({ code })).toBe(expected);
        }
    });

    it('returns generic message for unknown Firebase error codes', () => {
        expect(getAuthErrorMessage({ code: 'auth/unknown-code' })).toBe(
            'An error occurred. Please try again.'
        );
    });

    it('returns unexpected error for non-object errors', () => {
        expect(getAuthErrorMessage('string error')).toBe('An unexpected error occurred.');
        expect(getAuthErrorMessage(null)).toBe('An unexpected error occurred.');
        expect(getAuthErrorMessage(undefined)).toBe('An unexpected error occurred.');
        expect(getAuthErrorMessage(42)).toBe('An unexpected error occurred.');
    });

    it('returns unexpected error for objects without code property', () => {
        expect(getAuthErrorMessage({ message: 'something' })).toBe('An unexpected error occurred.');
    });
});
