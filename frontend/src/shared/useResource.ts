import { useCallback, useEffect, useRef, useState } from 'react';
import { errorText } from './api';
import { subscribeToRefresh } from './autoRefresh';

export function useResource<T>(key: string | null, loader: (signal: AbortSignal) => Promise<T>, poll = true) {
  const loaderRef = useRef(loader); loaderRef.current = loader;
  const keyRef = useRef(key); keyRef.current = key;
  const [state, setState] = useState<{ key: string | null; data?: T; error: string; loading: boolean }>({ key, error: '', loading: !!key });
  const request = useRef<AbortController>();
  const reload = useCallback(async (background = false) => {
    const currentKey = keyRef.current;
    if (!currentKey) return;
    if (background && request.current && !request.current.signal.aborted) return;
    request.current?.abort();
    const controller = new AbortController(); request.current = controller;
    try {
      const data = await loaderRef.current(controller.signal);
      if (!controller.signal.aborted && keyRef.current === currentKey) setState({ key: currentKey, data, error: '', loading: false });
      return data;
    } catch (error) {
      if (!controller.signal.aborted && keyRef.current === currentKey) setState(previous => ({ key: currentKey, data: previous.key === currentKey ? previous.data : undefined, error: errorText(error), loading: false }));
    } finally {
      if (request.current === controller) request.current = undefined;
    }
  }, []);
  useEffect(() => {
    if (!key) { setState({ key, error: '', loading: false }); return; }
    setState({ key, error: '', loading: true }); void reload();
    const unsubscribe = subscribeToRefresh(() => void reload(true), poll);
    return () => { request.current?.abort(); unsubscribe(); };
  }, [key, poll, reload]);
  return { data: state.key === key ? state.data : undefined, error: state.key === key ? state.error : '', loading: !!key && (state.key !== key || state.loading), reload };
}
