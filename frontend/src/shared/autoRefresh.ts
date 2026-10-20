export const AUTO_REFRESH_INTERVAL = 10000;

export function subscribeToRefresh(refresh: () => void, poll = true) {
  const update = () => {
    if (document.visibilityState !== 'hidden' && navigator.onLine) refresh();
  };
  window.addEventListener('deathline:refresh', update);
  window.addEventListener('focus', update);
  window.addEventListener('online', update);
  document.addEventListener('visibilitychange', update);
  const timer = poll ? window.setInterval(update, AUTO_REFRESH_INTERVAL) : undefined;
  return () => {
    window.removeEventListener('deathline:refresh', update);
    window.removeEventListener('focus', update);
    window.removeEventListener('online', update);
    document.removeEventListener('visibilitychange', update);
    if (timer !== undefined) window.clearInterval(timer);
  };
}
