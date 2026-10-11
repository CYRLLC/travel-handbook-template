const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const types = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.svg':'image/svg+xml', '.webmanifest':'application/manifest+json' };
const headers = fs.readFileSync(path.join(root, '_headers'), 'utf8');
const csp = headers.match(/Content-Security-Policy: (.+)/)[1];
const apiHits = [];
const server = http.createServer((request, response) => {
  const url = new URL(request.url, 'http://localhost');
  if (url.pathname.startsWith('/api/')) apiHits.push(request.url);
  const file = path.resolve(root, '.' + decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname));
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { response.writeHead(404); return response.end('Not found'); }
  response.writeHead(200, { 'Content-Type':types[path.extname(file)] || 'text/plain; charset=utf-8', 'Content-Security-Policy':csp, 'Cache-Control':'no-cache' });
  fs.createReadStream(file).pipe(response);
});
const localChrome = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const chrome = process.env.CHROME_PATH || (process.platform === 'win32' && fs.existsSync(localChrome) ? localChrome : undefined);
const artifacts = path.join(root, '.test-artifacts');
fs.mkdirSync(artifacts, { recursive: true });
async function download(page, selector) {
  const received = page.waitForEvent('download'); await page.locator(selector).click();
  return JSON.parse(fs.readFileSync(await (await received).path(), 'utf8'));
}
async function importFile(page, value) {
  await page.locator('#importProgress').setInputFiles({ name:'fixture.json', mimeType:'application/json', buffer:Buffer.from(JSON.stringify(value)) });
}
async function ready(page) { await page.waitForFunction(() => document.querySelector('#tripPicker').options.length > 0); }
async function saveEditor(page) { await Promise.all([page.waitForEvent('load'), page.locator('#tripEditorForm button[type="submit"]').click()]); await ready(page); }
async function testWorkflow(browser, url) {
  const context = await browser.newContext({ viewport:{width:1280,height:900}, serviceWorkers:'block' });
  const page = await context.newPage(), errors = [], outbound = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('request', request => { if (/^https?:/.test(request.url()) && !request.url().startsWith('http://127.0.0.1:')) outbound.push(request.url()); });
  await page.goto(url); await ready(page);
  assert.equal(await page.locator('[data-day-card]').count(), 3);
  assert.equal(await page.locator('[data-schedule-locked="true"]').count(), 1);
  await page.locator('[data-day-card="day-02"] [data-move-day]').click();
  await page.locator('#moveTarget').selectOption('day-03'); await page.locator('#confirmMove').click();
  assert.match(await page.locator('[data-day-card="day-02"] h3').innerText(), /彈性日/);
  await context.setOffline(true);
  await page.locator('[data-day-card="day-02"] [data-open-map]').click();
  assert.equal(await page.locator('#mapDialogDate').innerText(), '2027-04-11');
  await page.waitForFunction(() => document.querySelector('#dialogMap').textContent.includes('離線'));
  await page.locator('[data-close-dialog="routeMapDialog"]').click(); await context.setOffline(false);
  await page.locator('[data-check="check-0-0"]').check();
  await page.locator('#tripNotes').fill('備份測試備註');
  await page.locator('#shoppingItem').fill('示例商品'); await page.locator('#shoppingForm button[type="submit"]').click();
  await page.waitForFunction(() => document.querySelector('#shoppingList').textContent.includes('示例商品'));
  await page.locator('.shopping-editor select').selectOption('planned');
  await page.locator('.shopping-editor input[aria-label="順路日期"]').fill('2027-04-11');
  await page.locator('.shopping-editor button').filter({hasText:'儲存'}).click();
  await page.locator('#commentsLauncher').click(); await page.locator('#commentMessage').fill('<img src=x onerror="window.injected=true">');
  await page.locator('#commentForm button[type="submit"]').click();
  await page.waitForFunction(() => document.querySelector('#commentList').textContent.includes('<img'));
  assert.equal(await page.locator('#commentList img').count(), 0);
  await page.locator('[data-close-dialog="commentsDialog"]').click();
  const sourceId = await page.locator('#tripPicker').inputValue();
  const full = await download(page, '#exportProgress');
  assert.equal(full.data.progress.notes, '備份測試備註'); assert.equal(full.data.progress.checks['check-0-0'], true);
  assert.equal(full.data.shopping[0].status, 'planned'); assert.equal(full.data.comments.length, 1); assert.ok(full.data.notifications.length >= 2);
  const template = await download(page, '#exportTemplate');
  assert.match(template.config.days[1].title, /彈性日/);
  assert.equal(template.data.shopping.length, 0); assert.equal(template.data.comments.length, 0); assert.equal(template.data.progress.notes, '');
  assert.deepEqual(template.config.travelers, ['旅伴 A', '旅伴 B']);
  // Editing a moved plan must preserve the displayed date arrangement and existing progress.
  await page.locator('[data-day-card="day-02"] [data-edit-day]').click();
  await page.locator('#editorBody [data-field="title"]').first().fill('測試街區行程');
  await page.locator('#editorBody [data-field="transport"]').fill('步行／捷運');
  await page.getByRole('button',{name:'新增活動',exact:true}).click();
  await page.locator('#editorBody fieldset').filter({has:page.locator('legend', {hasText:'活動'})}).locator('[data-field="title"]').last().fill('新增活動測試');
  await saveEditor(page);
  assert.equal(await page.locator('[data-day-card="day-02"] h3').innerText(), '測試街區行程');
  assert.match(await page.locator('[data-day-card="day-02"] .timeline').innerText(), /新增活動測試/);
  assert.match(await page.locator('[data-day-card="day-03"] h3').innerText(), /主要景點/);
  assert.equal(await page.locator('#tripNotes').inputValue(), '備份測試備註');
  await page.locator('[data-edit-trip]').first().click();
  await page.locator('#editorBody [data-field="title"]').first().fill('表單設定測試');
  await page.locator('#editorBody [data-field="travelers"]').fill('旅伴甲\n旅伴乙');
  await page.locator('#editorBody [data-field="start"]').fill('2028-05-01');
  await page.locator('#editorBody [data-field="end"]').fill('2028-05-03');
  await page.locator('#editorBody [data-field="title"]').nth(1).fill('更新總覽');
  await saveEditor(page);
  assert.equal(await page.locator('#tripTitle').innerText(), '表單設定測試');
  assert.match(await page.locator('#introGrid').innerText(), /更新總覽/);
  assert.equal(await page.locator('[data-day-card="day-02"]').getAttribute('data-weather-date'), '2028-05-02');
  assert.equal(await page.locator('[data-check="check-0-0"]').isChecked(), true);
  await page.locator('#duplicateTrip').click(); await saveEditor(page);
  const duplicateId = await page.locator('#tripPicker').inputValue(); assert.notEqual(duplicateId, sourceId);
  assert.match(await page.locator('[data-day-card="day-02"] h3').innerText(), /測試街區行程/);
  assert.equal(await page.locator('#tripNotes').inputValue(), ''); assert.equal(await page.locator('[data-check="check-0-0"]').isChecked(), false);
  assert.equal(await page.locator('.shopping-card').count(), 0);
  await page.locator('#newTrip').click(); await page.locator('#editorBody [data-field="title"]').first().fill('空白旅程');
  await page.locator('#editorBody [data-field="start"]').fill('2028-06-01'); await page.locator('#editorBody [data-field="end"]').fill('2028-06-02'); await saveEditor(page);
  assert.equal(await page.locator('[data-day-card]').count(), 2); assert.equal(await page.locator('.reservation-row').count(), 0);
  await Promise.all([page.waitForEvent('load'), page.locator('#tripPicker').selectOption(sourceId)]); await ready(page);
  assert.equal(await page.locator('#tripNotes').inputValue(), '備份測試備註'); assert.equal(await page.locator('.shopping-card').count(), 1);
  const tripCount = await page.locator('#tripPicker option').count();
  for (const corrupt of [ { ...full, version:99 }, { ...full, config:{...full.config,days:[{...full.config.days[0],date:'2028-02-30'}]} }, { ...full,config:{...full.config,reservations:[{title:'unsafe',url:'javascript:alert(1)'}]}} ]) {
    await importFile(page, corrupt); await page.waitForFunction(() => document.querySelector('#progressStatus').textContent.startsWith('匯入失敗'));
    assert.equal(await page.locator('#tripPicker option').count(), tripCount);
  }
  await Promise.all([page.waitForEvent('load'), importFile(page,full)]); await ready(page);
  assert.equal(await page.locator('#tripPicker option').count(), tripCount + 1);
  assert.equal(await page.locator('#tripNotes').inputValue(), full.data.progress.notes);
  assert.match(await page.locator('[data-day-card="day-02"] h3').innerText(), /彈性日/);
  await page.reload(); await ready(page); assert.equal(await page.locator('.shopping-card').count(), 1);
  // A quota failure must not partially replace the previous saved trip.
  assert.equal(await page.evaluate(() => {
    const saved = Storage.prototype.setItem, original = TravelStore.current().config.title;
    Storage.prototype.setItem = function () { throw new Error('quota'); };
    try { const cfg = TravelStore.current().config; cfg.title = 'Should not persist'; TravelStore.saveConfig(cfg); return false; }
    catch { return TravelStore.current().config.title === original; }
    finally { Storage.prototype.setItem = saved; }
  }), true);
  await page.evaluate(() => { window.originalSetItem = Storage.prototype.setItem; Storage.prototype.setItem = function () { throw new Error('quota'); }; });
  const quotaBackup = await download(page, '#exportProgress');
  assert.equal(quotaBackup.data.progress.notes, '備份測試備註');
  await page.evaluate(() => { Storage.prototype.setItem = window.originalSetItem; delete window.originalSetItem; });
  await page.setViewportSize({width:390,height:844}); assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2));
  await page.locator('[data-edit-trip]').first().click();
  assert.ok(await page.locator('#tripEditor').evaluate(el => el.scrollWidth <= el.clientWidth + 2));
  assert.ok(await page.locator('#tripEditorForm button[type="submit"]').isVisible());
  // Also check the smallest commonly supported mobile width.
  await page.setViewportSize({width:320,height:640}); assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2));
  await page.screenshot({path:path.join(artifacts,'template-editor-mobile.png')});
  await page.locator('[data-close-dialog="tripEditor"]').first().click();
  await context.setOffline(true); await page.locator('#tripNotes').fill('離線編輯測試'); await page.reload(); await ready(page);
  assert.equal(await page.locator('#tripNotes').inputValue(), '離線編輯測試');
  const countBeforeDelete = await page.locator('#tripPicker option').count();
  page.once('dialog',dialog=>dialog.accept());
  await Promise.all([page.waitForEvent('load'), page.locator('#deleteTrip').click()]); await ready(page);
  assert.equal(await page.locator('#tripPicker option').count(), countBeforeDelete - 1);
  assert.deepEqual(errors, []); assert.deepEqual(outbound, [], 'Default mode must not transmit trip data');
  await context.close();
  const fresh = await browser.newContext({serviceWorkers:'block'}), restored = await fresh.newPage();
  await restored.goto(url); await ready(restored);
  await Promise.all([restored.waitForEvent('load'), importFile(restored,full)]); await ready(restored);
  assert.equal(await restored.locator('#tripNotes').inputValue(), '備份測試備註');
  assert.equal(await restored.locator('.shopping-card').count(), 1);
  await restored.locator('#commentsLauncher').click(); assert.equal(await restored.locator('#commentList img').count(), 0);
  assert.match(await restored.locator('#commentList').innerText(), /<img/);
  await fresh.close();
}
(async () => {
  await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
  const base = 'http://127.0.0.1:' + server.address().port + '/';
  const browser = await chromium.launch({headless:true, executablePath:chrome});
  try {
    await testWorkflow(browser,pathToFileURL(path.join(root,'index.html')).href);
    // The hosted edition must honor the production CSP and retain editing behavior.
    const webContext = await browser.newContext(), page = await webContext.newPage(), issues = [];
    page.on('pageerror',e=>issues.push(e.message));
    await page.goto(base); await ready(page); await page.locator('#newTrip').click();
    await page.locator('#editorBody [data-field="title"]').first().fill('靜態網站測試'); await saveEditor(page);
    assert.equal(await page.locator('#tripTitle').innerText(),'靜態網站測試');
    await page.evaluate(async () => { await navigator.serviceWorker.ready; });
    await page.reload(); await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
    await webContext.setOffline(true); await page.reload(); await ready(page);
    assert.equal(await page.locator('#tripTitle').innerText(),'靜態網站測試');
    assert.deepEqual(issues,[]); assert.deepEqual(apiHits,[]);
    await webContext.close();
    console.log('Smoke passed: file opening, form editing, date moves, isolated trips, full backup/restore, clean template, malicious import rejection, mobile layout, CSP, and hosted PWA offline. No API traffic.');
  } finally { await browser.close(); await new Promise(resolve=>server.close(resolve)); }
})().catch(error=>{ console.error(error); server.close(); process.exitCode=1; });
