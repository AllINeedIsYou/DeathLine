import { useCallback, useEffect, useRef, useState } from 'react';

export function useTimedNotice(duration = 10000) {
  const [notice, setNotice] = useState('');
  const timeout = useRef<number | undefined>(undefined);
  const showNotice = useCallback((message: string) => {
    window.clearTimeout(timeout.current);
    setNotice(message);
    // Restart even when the next action produces exactly the same message.
    timeout.current = message ? window.setTimeout(() => {
      timeout.current = undefined;
      setNotice('');
    }, duration) : undefined;
  }, [duration]);
  useEffect(() => () => window.clearTimeout(timeout.current), []);
  return [notice, showNotice] as const;
}
