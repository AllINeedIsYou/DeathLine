export const workerTimeZones = [
  ['Europe/Kaliningrad', 'Калининград'], ['Europe/Moscow', 'Москва'], ['Europe/Samara', 'Самара'],
  ['Asia/Yekaterinburg', 'Екатеринбург'], ['Asia/Omsk', 'Омск'], ['Asia/Novosibirsk', 'Новосибирск'],
  ['Asia/Krasnoyarsk', 'Красноярск'], ['Asia/Irkutsk', 'Иркутск'], ['Asia/Yakutsk', 'Якутск'],
  ['Asia/Vladivostok', 'Владивосток'], ['Asia/Magadan', 'Магадан'], ['Asia/Kamchatka', 'Камчатка'],
  ['UTC', 'UTC'], ['Europe/London', 'Лондон'], ['Europe/Berlin', 'Берлин'], ['Europe/Istanbul', 'Стамбул'],
  ['Asia/Tbilisi', 'Тбилиси'], ['Asia/Yerevan', 'Ереван'], ['Asia/Dubai', 'Дубай'], ['Asia/Almaty', 'Алматы'],
  ['Asia/Tashkent', 'Ташкент'], ['Asia/Bangkok', 'Бангкок'], ['Asia/Shanghai', 'Шанхай'], ['Asia/Tokyo', 'Токио'],
  ['America/New_York', 'Нью-Йорк'], ['America/Los_Angeles', 'Лос-Анджелес'], ['Australia/Sydney', 'Сидней'],
] as const;

// Use named zones rather than a fixed offset: Intl applies daylight saving rules for this instant.
export function workerLocalTime(timeZone: string, now: number) {
  const time = new Intl.DateTimeFormat('ru-RU', { timeZone, hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).format(now);
  const date = new Intl.DateTimeFormat('ru-RU', { timeZone, day: 'numeric', month: 'long' }).format(now);
  const offset = new Intl.DateTimeFormat('en-GB', { timeZone, timeZoneName: 'shortOffset' }).formatToParts(now).find(part => part.type === 'timeZoneName')!.value.replace('GMT', 'UTC');
  return { time, date, offset, city: workerTimeZones.find(zone => zone[0] === timeZone)?.[1] ?? timeZone };
}
