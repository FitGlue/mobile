/**
 * Tests for saveImageToDevice — bridges web "share/download" images to the
 * native OS share sheet. expo-file-system and expo-sharing are mocked.
 */

const writeAsStringAsync = jest.fn((..._args: unknown[]) => Promise.resolve());
const shareAsync = jest.fn((..._args: unknown[]) => Promise.resolve());
const isAvailableAsync = jest.fn(() => Promise.resolve(true));

jest.mock('expo-file-system/legacy', () => ({
  cacheDirectory: 'file:///cache/',
  EncodingType: { Base64: 'base64' },
  writeAsStringAsync: (...args: unknown[]) => writeAsStringAsync(...args),
}));

jest.mock('expo-sharing', () => ({
  isAvailableAsync: () => isAvailableAsync(),
  shareAsync: (...args: unknown[]) => shareAsync(...args),
}));

import { saveImageToDevice } from '../shareImage';

const DATA_URL = 'data:image/png;base64,AAAA';

describe('saveImageToDevice', () => {
  beforeEach(() => {
    writeAsStringAsync.mockClear();
    shareAsync.mockClear();
    isAvailableAsync.mockReset().mockResolvedValue(true);
  });

  it('strips the data-URL prefix and writes the base64 to the cache dir', async () => {
    await saveImageToDevice(DATA_URL, 'route-fitglue.png');

    expect(writeAsStringAsync).toHaveBeenCalledWith(
      'file:///cache/route-fitglue.png',
      'AAAA',
      { encoding: 'base64' }
    );
  });

  it('opens the share sheet for the written file', async () => {
    await saveImageToDevice(DATA_URL, 'route-fitglue.png');

    expect(shareAsync).toHaveBeenCalledWith(
      'file:///cache/route-fitglue.png',
      expect.objectContaining({ mimeType: 'image/png' })
    );
  });

  it('sanitises unsafe filename characters', async () => {
    await saveImageToDevice(DATA_URL, 'My Run!/2026.png');

    expect(writeAsStringAsync).toHaveBeenCalledWith(
      'file:///cache/My_Run__2026.png',
      'AAAA',
      { encoding: 'base64' }
    );
  });

  it('skips sharing when the share sheet is unavailable', async () => {
    isAvailableAsync.mockResolvedValue(false);

    await saveImageToDevice(DATA_URL, 'route-fitglue.png');

    expect(writeAsStringAsync).toHaveBeenCalled();
    expect(shareAsync).not.toHaveBeenCalled();
  });
});
