/**
 * Firebase Auth Error Message Mapper
 *
 * Converts Firebase auth error codes to user-friendly messages.
 * Extracted from AuthContext for testability.
 */

export function getAuthErrorMessage(error: unknown): string {
    if (error && typeof error === 'object' && 'code' in error) {
        const code = (error as { code: string }).code;

        switch (code) {
            case 'auth/invalid-email':
                return 'Invalid email address format.';
            case 'auth/user-disabled':
                return 'This account has been disabled.';
            case 'auth/user-not-found':
                return 'No account found with this email.';
            case 'auth/wrong-password':
                return 'Incorrect password.';
            case 'auth/invalid-credential':
                return 'Invalid email or password.';
            case 'auth/too-many-requests':
                return 'Too many failed attempts. Please try again later.';
            case 'auth/network-request-failed':
                return 'Network error. Please check your connection.';
            case 'auth/email-already-in-use':
                return 'An account with this email already exists.';
            case 'auth/weak-password':
                return 'Password is too weak.';
            case 'auth/operation-not-allowed':
                return 'This operation is not allowed.';
            default:
                return 'An error occurred. Please try again.';
        }
    }

    return 'An unexpected error occurred.';
}
