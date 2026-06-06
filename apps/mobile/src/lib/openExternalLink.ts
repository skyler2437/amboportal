import * as WebBrowser from 'expo-web-browser';
import { Alert, Linking } from 'react-native';

/**
 * Open an external http(s) link in an in-app browser
 * (SFSafariViewController on iOS / Custom Tab on Android).
 *
 * `Linking.openURL` rejects with "Unable to open URL" on iOS when the system
 * declines to open the link, and because those calls were not awaited/caught
 * the rejection surfaced in Sentry as an unhandled promise rejection
 * (AMBOPORTAL-MOBILE-3). `WebBrowser.openBrowserAsync` does not depend on
 * `canOpenURL`/scheme handlers and is the reliable way to show web content.
 *
 * Falls back to the system browser, and if even that fails surfaces an Alert
 * instead of throwing — so a failure is never silent and never unhandled.
 */
export async function openExternalLink(url: string): Promise<void> {
  try {
    await WebBrowser.openBrowserAsync(url);
  } catch {
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert('Unable to open link', `Please visit:\n${url}`);
    }
  }
}
