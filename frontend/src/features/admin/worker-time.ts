export const workerTimeZones = [
  ['Europe/Kaliningrad', "Kaliningrad"], ['Europe/Moscow', "Moscow"], ['Europe/Samara', "Samara"],
  ['Asia/Yekaterinburg', "Yekaterinburg"], ['Asia/Omsk', "Omsk"], ['Asia/Novosibirsk', "Novosibirsk"],
  ['Asia/Krasnoyarsk', "Krasnoyarsk"], ['Asia/Irkutsk', "Irkutsk"], ['Asia/Yakutsk', "Yakutsk"],
  ['Asia/Vladivostok', "Vladivostok"], ['Asia/Magadan', "Magadan"], ['Asia/Kamchatka', "Kamchatka"],
  ['UTC', 'UTC'], ['Europe/London', "London"], ['Europe/Berlin', "Berlin"], ['Europe/Istanbul', "Istanbul"],
  ['Asia/Tbilisi', "Tbilisi"], ['Asia/Yerevan', "Yerevan"], ['Asia/Dubai', "Dubai"], ['Asia/Almaty', "Almaty"],
  ['Asia/Tashkent', "Tashkent"], ['Asia/Bangkok', "Bangkok"], ['Asia/Shanghai', "Shanghai"], ['Asia/Tokyo', "Tokyo"],
  ['America/New_York', "New York"], ['America/Los_Angeles', "Los Angeles"], ['Australia/Sydney', "Sydney"],
] as const;

// Use named zones rather than a fixed offset: Intl applies daylight saving rules for this instant.
export function workerLocalTime(timeZone: string, now: number) {
  const time = new Intl.DateTimeFormat('en-US', { timeZone, hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).format(now);
  const date = new Intl.DateTimeFormat('en-US', { timeZone, day: 'numeric', month: 'long' }).format(now);
  const offset = new Intl.DateTimeFormat('en-GB', { timeZone, timeZoneName: 'shortOffset' }).formatToParts(now).find(part => part.type === 'timeZoneName')!.value.replace('GMT', 'UTC');
  return { time, date, offset, city: workerTimeZones.find(zone => zone[0] === timeZone)?.[1] ?? timeZone };
}
