// Until the server is connected, writes fail instead of simulating success.
export const serviceUnavailableMessage = 'Сервис пока недоступен. Попробуй позже.';
export function serviceUnavailable(): never { throw new Error(serviceUnavailableMessage); }
