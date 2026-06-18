/**
 * Tests for the Firebase wrapper. All firebase SDK entry points and
 * AsyncStorage are mocked. The module initialises at import time, so the two
 * init branches (fresh app vs already-initialised) are exercised with
 * jest.isolateModules + different getApps() return values.
 */

const mockInitializeApp: jest.Mock = jest.fn(() => ({ name: 'new-app' }));
const mockGetApps: jest.Mock = jest.fn(() => []);
const mockGetAuth: jest.Mock = jest.fn(() => ({ name: 'existing-auth' }));
const mockInitializeAuth: jest.Mock = jest.fn(() => ({ name: 'init-auth' }));
const mockGetReactNativePersistence: jest.Mock = jest.fn(() => 'persistence');
const mockSignInWithEmailAndPassword: jest.Mock = jest.fn();
const mockFirebaseSignOut: jest.Mock = jest.fn();
const mockOnAuthStateChanged: jest.Mock = jest.fn(() => () => {});

jest.mock('firebase/app', () => ({
  initializeApp: (...a: unknown[]) => mockInitializeApp(...a),
  getApps: () => mockGetApps(),
}));

jest.mock('firebase/auth', () => ({
  getAuth: (...a: any[]) => mockGetAuth(...a),
  initializeAuth: (...a: any[]) => mockInitializeAuth(...a),
  getReactNativePersistence: (...a: any[]) => mockGetReactNativePersistence(...a),
  signInWithEmailAndPassword: (...a: any[]) => mockSignInWithEmailAndPassword(...a),
  signOut: (...a: any[]) => mockFirebaseSignOut(...a),
  onAuthStateChanged: (...a: any[]) => mockOnAuthStateChanged(...a),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({ __esModule: true, default: {} }));

jest.mock('../environment', () => ({
  firebaseConfig: { projectId: 'fitglue-server-test' },
  isDebug: true,
}));

function loadFirebase() {
  let mod!: typeof import('../firebase');
  jest.isolateModules(() => {
    mod = require('../firebase');
  });
  return mod;
}

describe('firebase config', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetApps.mockReturnValue([]);
  });

  describe('initialisation', () => {
    it('initialises a fresh app with RN AsyncStorage persistence', () => {
      mockGetApps.mockReturnValue([]);
      loadFirebase();

      expect(mockInitializeApp).toHaveBeenCalledWith({ projectId: 'fitglue-server-test' });
      expect(mockInitializeAuth).toHaveBeenCalledWith(
        { name: 'new-app' },
        { persistence: 'persistence' },
      );
      expect(mockGetAuth).not.toHaveBeenCalled();
    });

    it('reuses the existing app/auth when already initialised', () => {
      mockGetApps.mockReturnValue([{ name: 'app-0' }]);
      loadFirebase();

      expect(mockInitializeApp).not.toHaveBeenCalled();
      expect(mockGetAuth).toHaveBeenCalledWith({ name: 'app-0' });
    });
  });

  describe('auth wrappers', () => {
    it('signIn delegates to signInWithEmailAndPassword', async () => {
      mockSignInWithEmailAndPassword.mockResolvedValue({ user: { uid: 'u1' } });
      const fb = loadFirebase();

      await fb.signIn('a@b.com', 'pw');

      expect(mockSignInWithEmailAndPassword).toHaveBeenCalledWith(
        expect.anything(),
        'a@b.com',
        'pw',
      );
    });

    it('signOut delegates to firebase signOut', async () => {
      mockFirebaseSignOut.mockResolvedValue(undefined);
      const fb = loadFirebase();

      await fb.signOut();

      expect(mockFirebaseSignOut).toHaveBeenCalled();
    });

    it('getCurrentUser returns auth.currentUser', () => {
      mockGetApps.mockReturnValue([{ name: 'app-0' }]);
      mockGetAuth.mockReturnValue({ name: 'existing-auth', currentUser: { uid: 'u9' } } as never);
      const fb = loadFirebase();

      expect(fb.getCurrentUser()).toEqual({ uid: 'u9' });
    });

    it('subscribeToAuthState wires onAuthStateChanged', () => {
      const fb = loadFirebase();
      const cb = jest.fn();

      fb.subscribeToAuthState(cb);

      expect(mockOnAuthStateChanged).toHaveBeenCalledWith(expect.anything(), cb);
    });
  });

  describe('getIdToken', () => {
    it('returns null when there is no current user', async () => {
      mockGetApps.mockReturnValue([{ name: 'app-0' }]);
      mockGetAuth.mockReturnValue({ currentUser: null } as never);
      const fb = loadFirebase();

      expect(await fb.getIdToken()).toBeNull();
    });

    it('returns the token from the current user', async () => {
      mockGetApps.mockReturnValue([{ name: 'app-0' }]);
      mockGetAuth.mockReturnValue({
        currentUser: { getIdToken: jest.fn().mockResolvedValue('id-tok') },
      } as never);
      const fb = loadFirebase();

      expect(await fb.getIdToken()).toBe('id-tok');
    });

    it('returns null and logs when getIdToken throws', async () => {
      const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      mockGetApps.mockReturnValue([{ name: 'app-0' }]);
      mockGetAuth.mockReturnValue({
        currentUser: { getIdToken: jest.fn().mockRejectedValue(new Error('nope')) },
      } as never);
      const fb = loadFirebase();

      expect(await fb.getIdToken()).toBeNull();
      expect(errSpy).toHaveBeenCalled();
      errSpy.mockRestore();
    });
  });
});
