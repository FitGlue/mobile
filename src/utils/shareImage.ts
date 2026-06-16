import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

/**
 * Writes a base64 PNG data URL to a temp file and opens the OS share sheet.
 *
 * Used by the web app's "share/download" buttons: `<a download>` and the Web
 * Share API don't work inside the WebView, so the web app bridges the image
 * bytes to native (message `{ type: 'saveImage', dataUrl, filename }`) and we
 * hand them to the OS share sheet here ("Save to Photos", send to apps, etc.).
 */
export async function saveImageToDevice(dataUrl: string, filename: string): Promise<void> {
  const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, '');
  const safeName = filename.replace(/[^\w.-]/g, '_') || 'fitglue.png';
  const fileUri = `${FileSystem.cacheDirectory}${safeName}`;
  await FileSystem.writeAsStringAsync(fileUri, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(fileUri, {
      mimeType: 'image/png',
      UTI: 'public.png',
      dialogTitle: filename,
    });
  }
}
