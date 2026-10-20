import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PACKAGE || 'playwright');
const base = process.env.FRONTEND_URL || 'http://127.0.0.1:5173';
const browser = await chromium.launch({ headless: true });
const created = '2026-10-01T00:00:00Z';
const users = [1, 2].map(id => ({ id, name: id === 1 ? 'Admin Refresh' : 'Employee Refresh', username: `refresh${id}`, email: `refresh${id}@example.com`, phone: null, telegram: null, timezone: 'Europe/Moscow', created_at: created, email_verified_at: created }));
const tasks = [];
let extraTeam = false;
let failing = false;
let holdTasks;
let releaseTasks;
const counts = new Map();
const errors = [];
async function workspace(id) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.clock.install();
  await page.addInitScript(() => {
    window.refreshHidden = false;
    window.refreshOnline = true;
    Object.defineProperty(document, 'visibilityState', { get: () => window.refreshHidden ? 'hidden' : 'visible' });
    Object.defineProperty(navigator, 'onLine', { get: () => window.refreshOnline });
  });
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/api/**', async route => {
    const request = route.request();
    const path = new URL(request.url()).pathname.replace('/api', '');
    const key = `${id}:${path}`;
    counts.set(key, (counts.get(key) || 0) + 1);
    if (failing) return route.fulfill({ status: 503, json: { detail: 'Temporary failure' } });
    let data;
    if (path === '/auth/me') data = users[id - 1];
    else if (path === '/teams') data = [
      { id: 18, name: 'Refresh Team', timezone: 'Europe/Moscow', role: id === 1 ? 'admin' : 'employee', created_at: created },
      ...(extraTeam ? [{ id: 19, name: 'New Team', timezone: 'Europe/Moscow', role: 'employee', created_at: created }] : []),
    ];
    else if (path.endsWith('/members')) data = users.map(user => ({ id: user.id + 100, team_id: 18, role: user.id === 1 ? 'admin' : 'employee', job_title: null, joined_at: created, user }));
    else if (path.endsWith('/complete')) {
      const task = tasks.find(task => task.id === Number(path.split('/').at(-2)));
      task.completed_at = new Date().toISOString(); data = task;
    } else if (path.endsWith('/tasks') || path.endsWith('/my-tasks')) {
      if (request.method() === 'POST') {
        data = { ...request.postDataJSON(), id: tasks.length + 1, team_id: 18, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), completed_at: null };
        tasks.push(data);
      } else {
        if (id === 1 && holdTasks) await holdTasks;
        data = tasks.filter(task => id === 1 || task.user_id === id);
      }
    } else if (path.endsWith('statistics')) data = { total: tasks.length, active: tasks.filter(task => !task.completed_at).length, completed: tasks.filter(task => task.completed_at).length, overdue: 0, on_time_percent: tasks.length ? 100 : null, productivity_percent: tasks.length ? 100 : null };
    else if (path.includes('/goat')) data = { members: [], leaders: [] };
    else if (path.endsWith('/history')) data = { points: [], history_complete: true, timezone: 'Europe/Moscow' };
    else throw new Error(path);
    await route.fulfill({ status: 200, json: data });
  });
  await page.goto(`${base}/${id === 1 ? 'admin' : 'employee'}/?team=18`);
  await page.getByRole('combobox', { name: 'Current team' }).waitFor();
  return page;
}
try {
  const admin = await workspace(1);
  const employee = await workspace(2);
  await employee.getByRole('heading', { name: 'No tasks yet' }).waitFor();
  await admin.getByRole('button', { name: 'Tasks', exact: true }).click();
  await admin.getByRole('button', { name: 'New task', exact: false }).click();
  await admin.locator('#task-title').fill('Auto refresh task');
  await admin.locator('#task-worker').selectOption('2');
  await admin.getByRole('button', { name: 'Create task', exact: true }).click();
  await admin.getByRole('button', { name: 'Auto refresh task', exact: false }).first().waitFor();
  await admin.getByRole('button', { name: /^All tasks:.*Filter tasks$/ }).click();
  await employee.clock.runFor(10001);
  await employee.getByRole('heading', { name: 'Auto refresh task', exact: true }).waitFor();
  await employee.getByRole('button', { name: 'Mark as completed', exact: false }).click();
  await employee.getByText('Task completed.', { exact: true }).waitFor();
  await admin.clock.runFor(10001);
  await admin.locator('tbody tr').filter({ hasText: 'Auto refresh task' }).getByText('Completed', { exact: true }).first().waitFor();
  console.log('PASS: another user receives new tasks and completion updates without navigation.');

  await admin.getByRole('button', { name: 'New task', exact: false }).click();
  await admin.locator('#task-title').fill('Unsaved draft');
  extraTeam = true;
  await admin.clock.runFor(10001);
  await admin.getByRole('combobox', { name: 'Current team' }).click();
  await admin.getByRole('option', { name: /New Team/ }).waitFor();
  await admin.getByRole('combobox', { name: 'Current team' }).press('Escape');
  assert.equal(await admin.locator('#task-title').inputValue(), 'Unsaved draft');
  failing = true;
  await admin.clock.runFor(10001);
  await admin.getByText('Temporary failure', { exact: false }).first().waitFor();
  assert.equal(await admin.locator('#task-title').inputValue(), 'Unsaved draft');
  failing = false;
  await admin.evaluate(() => window.dispatchEvent(new Event('online')));
  await admin.waitForFunction(() => !document.body.innerText.includes('Temporary failure'));
  console.log('PASS: teams refresh, unsaved forms survive refresh and network failure, reconnection recovers.');

  await admin.evaluate(() => { window.refreshHidden = true; document.dispatchEvent(new Event('visibilitychange')); });
  const hiddenCount = counts.get('1:/teams/18/tasks');
  await admin.clock.runFor(20001);
  assert.equal(counts.get('1:/teams/18/tasks'), hiddenCount);
  await admin.evaluate(() => { window.refreshHidden = false; document.dispatchEvent(new Event('visibilitychange')); });
  await admin.waitForFunction(() => !document.body.innerText.includes('Temporary failure'));
  await admin.waitForTimeout(50);
  assert(counts.get('1:/teams/18/tasks') > hiddenCount);
  await admin.evaluate(() => { window.refreshOnline = false; });
  const offlineCount = counts.get('1:/teams/18/tasks');
  await admin.clock.runFor(20001);
  assert.equal(counts.get('1:/teams/18/tasks'), offlineCount);
  await admin.evaluate(() => { window.refreshOnline = true; window.dispatchEvent(new Event('online')); });
  await admin.waitForTimeout(50);
  assert(counts.get('1:/teams/18/tasks') > offlineCount);
  console.log('PASS: hidden/offline tabs pause polling and refresh immediately when active/online.');

  holdTasks = new Promise(resolve => { releaseTasks = resolve; });
  const slowStart = counts.get('1:/teams/18/tasks');
  await admin.clock.runFor(10001);
  await admin.waitForTimeout(50);
  assert.equal(counts.get('1:/teams/18/tasks'), slowStart + 1);
  await admin.clock.runFor(10001);
  assert.equal(counts.get('1:/teams/18/tasks'), slowStart + 1);
  releaseTasks(); holdTasks = undefined;
  await admin.waitForTimeout(50);
  assert.equal(await admin.locator('#task-title').inputValue(), 'Unsaved draft');
  assert.deepEqual(errors, []);
  console.log('PASS: a slow request is not cancelled or duplicated by the next polling tick.');
} finally {
  releaseTasks?.();
  await browser.close();
}
