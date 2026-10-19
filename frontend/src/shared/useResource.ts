import { useCallback, useEffect, useRef, useState } from 'react';
import { errorText } from './api';

export function useResource<T>(key: string | null, loader: (signal: AbortSignal) => Promise<T>, poll = true) {
  const loaderRef = useRef(loader); loaderRef.current = loader;
  const keyRef = useRef(key); keyRef.current = key;
  const [state, setState] = useState<{ key: string | null; data?: T; error: string; loading: boolean }>({ key, error: '', loading: !!key });
  const request = useRef<AbortController>();
  const reload = useCallback(async () => {
    const currentKey = keyRef.current;
    if (!currentKey) return;
    request.current?.abort();
    const controller = new AbortController(); request.current = controller;
    try {
      const data = await loaderRef.current(controller.signal);
      if (!controller.signal.aborted && keyRef.current === currentKey) setState({ key: currentKey, data, error: '', loading: false });
      return data;
    } catch (error) {
      if (!controller.signal.aborted && keyRef.current === currentKey) setState(previous => ({ key: currentKey, data: previous.key === currentKey ? previous.data : undefined, error: errorText(error), loading: false }));
    }
  }, []);
  useEffect(() => {
    if (!key) { setState({ key, error: '', loading: false }); return; }
    setState({ key, error: '', loading: true }); void reload();
    const refresh = () => { if (document.visibilityState !== 'hidden') void reload(); };
    window.addEventListener('deathline:refresh', refresh);
    window.addEventListener('focus', refresh);
    const timer = poll ? window.setInterval(refresh, 30000) : undefined;
    return () => { request.current?.abort(); window.removeEventListener('deathline:refresh', refresh); window.removeEventListener('focus', refresh); if (timer) window.clearInterval(timer); };
  }, [key, poll, reload]);
  return { data: state.key === key ? state.data : undefined, error: state.key === key ? state.error : '', loading: !!key && (state.key !== key || state.loading), reload };
}
