import { router } from 'expo-router';

// Full-screen flows can be the first screen in the stack (reload while open,
// deep link, notification tap). Bare router.back() throws GO_BACK unhandled
// there; fall back to the Board.
export function goBack() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}
