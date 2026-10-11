(function (scope) {
  const INITIAL_SECONDS = 900;

  function formatTime(seconds) {
    const value = Math.max(0, Math.ceil(seconds));
    return [Math.floor(value / 3600), Math.floor(value / 60) % 60, value % 60]
      .map(part => String(part).padStart(2, '0')).join(':');
  }

  function createClock(options = {}) {
    const now = options.now || (() => performance.now());
    const random = options.random || Math.random;
    const initialSeconds = options.initialSeconds ?? INITIAL_SECONDS;
    const randomInt = (min, max) => min + Math.floor(Math.min(.999999999, Math.max(0, random())) * (max - min + 1));
    const startedAt = now();
    let endAt = startedAt + initialSeconds * 1000;
    let nextBonusAt = startedAt + randomInt(20, 60) * 1000;
    let lastBonusAt = -Infinity;
    let bonusSeconds = 0;
    let bonusId = 0;
    let ended = initialSeconds <= 0;

    function tick(allowBonus = true) {
      const current = now();
      // Read elapsed time from the clock, rather than counting interval callbacks.
      if (current >= endAt) ended = true;
      if (!ended && current >= nextBonusAt) {
        // Missed events in a hidden tab are skipped instead of replayed on return.
        if (allowBonus) {
          bonusSeconds = randomInt(3, 12);
          endAt += bonusSeconds * 1000;
          lastBonusAt = current;
          bonusId += 1;
        }
        nextBonusAt = current + randomInt(20, 60) * 1000;
      }
      const remainingSeconds = ended ? 0 : Math.max(0, Math.ceil((endAt - current) / 1000));
      return {
        remainingSeconds,
        progress: initialSeconds > 0 ? Math.min(1, remainingSeconds / initialSeconds) : 0,
        bonusSeconds,
        bonusId,
        bonusVisible: !ended && current - lastBonusAt < 5000,
        glitching: !ended && current - lastBonusAt < 1100,
        ended,
      };
    }

    return Object.freeze({ tick });
  }

  // Shared by React and the install-free HTML preview.
  scope.DeathlineTime = Object.freeze({ createClock, formatTime });
})(globalThis);
