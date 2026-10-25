const { test, expect } = require('@playwright/test');
const endpoint = 'http://nodo.test/api/status';
const sample = {
  ok: true, system: { cpu: { percent: 24 }, memory: { percent: 62, used: 8 * 1073741824, total: 16 * 1073741824 },
    uptimeSeconds: 172800, disks: [{ label: 'C:', name: 'Sistema', percent: 73, used: 73 * 1073741824, total: 100 * 1073741824 }] },
  services: { up: 1, down: 1, total: 2, services: [
    { name: 'Jellyfin', port: 8920, up: true, latencyMs: 12 }, { name: 'Mealie', port: 9925, up: false, latencyMs: 0 }
  ] }, updatedAt: '2026-10-25T18:00:00Z'
};
test.beforeEach(async ({page}) => {
  await page.addInitScript(() => {
    const key = 'aerotizen.settings.v1';
    if (!localStorage.getItem(key)) { localStorage.setItem(key, JSON.stringify({ nodoUrl: 'http://nodo.test/api/status' })); }
  });
  await page.route('https://**/*', r => r.fulfill({body:'{}',contentType:'application/json'}));
  await page.route('http://127.0.0.1:47790/**', r => r.fulfill({body:'{}'}));
});
test('Nodo reads metrics, safely renders server text, polls every 30s and recovers from failures', async ({page}) => {
  await page.clock.install(); await page.clock.pauseAt(new Date());
  let count=0, mode='valid';
  await page.route(endpoint, route => {
    count++;
    if(mode==='network') return route.abort();
    if(mode==='invalid-json') return route.fulfill({body:'not JSON'});
    const body=structuredClone(sample);
    if(mode==='false') body.ok=false;
    if(mode==='malformed') body.system.cpu.percent=null;
    body.services.services[0].name='<img src=x onerror=alert(1)>';
    return route.fulfill({status:mode==='http'?503:200,contentType:'application/json',body:JSON.stringify(body)});
  });
  await page.goto('/');
  await expect(page.locator('#nodo-resources')).toBeVisible();
  await expect(page.locator('#nodo-resources')).toContainText('24%');
  await expect(page.locator('#nodo-resources')).toContainText('73.0 GiB / 100.0 GiB');
  await expect(page.locator('.nodo-service.is-down')).toHaveText('Mealie');
  await expect(page.locator('#nodo-services img')).toHaveCount(0);
  await expect(page.locator('.home-intro')).toHaveCount(0);
  expect(count).toBe(1);
  await page.clock.runFor(29999); expect(count).toBe(1);
  await page.clock.runFor(1); await expect.poll(()=>count).toBe(2);
  for(const failure of ['false','malformed','invalid-json','http','network']) {
    mode=failure; await page.clock.runFor(30000);
    await expect(page.locator('#nodo-status')).toHaveText('Nodo no disponible');
    await expect(page.locator('#nodo-resources')).toBeHidden();
    await expect(page.locator('#nodo-services')).toBeHidden();
    mode='valid'; await page.clock.runFor(30000);
    await expect(page.locator('#nodo-resources')).toBeVisible();
  }
});
test('Nodo URL edits persist, invalid URLs fail locally and remote navigation remains available', async ({page})=>{
  await page.route(endpoint, r=>r.fulfill({json:sample}));
  await page.goto('/'); await expect(page.locator('#nodo-resources')).toBeVisible();
  await page.keyboard.press('ArrowUp'); await page.keyboard.press('ArrowLeft'); await page.keyboard.press('Enter');
  await expect(page.locator('#editor')).toBeVisible();
  await page.locator('[data-key="nodo:url"]').click();
  await page.getByLabel('URL de Nodo').fill('javascript:alert(1)'); await page.keyboard.press('Enter');
  await expect(page.locator('#nodo-status')).toHaveText('Nodo no disponible');
  await page.keyboard.press('Escape'); await page.reload();
  await expect.poll(()=>page.evaluate(()=>AeroTizen.settings.nodoUrl)).toBe('javascript:alert(1)');
  await page.click('#inputs-tab'); await expect(page.locator('#inputs .focused')).toHaveCount(1);
  await page.click('#gear'); await page.locator('[data-key="nodo:url"]').click();
  await page.getByLabel('URL de Nodo').fill(endpoint); await page.keyboard.press('Enter');
  await page.keyboard.press('Escape');
  await expect(page.locator('#nodo-resources')).toBeVisible();
});
test('Nodo times out without overlap, ignores stale responses and pauses while hidden', async({page})=>{
  await page.clock.install(); await page.clock.pauseAt(new Date()); let requests=0;
  await page.route(endpoint,async r=>{requests++; await new Promise(resolve=>setTimeout(resolve,9000)); await r.fulfill({json:sample}).catch(()=>{});});
  await page.goto('/'); await expect.poll(()=>requests).toBe(1);
  await page.evaluate(()=>{AeroTizen.nodo.refresh();AeroTizen.nodo.refresh();});expect(requests).toBe(1);
  await page.clock.runFor(8001);await expect(page.locator('#nodo-status')).toHaveText('Nodo no disponible');
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
  await page.clock.runFor(60000);expect(requests).toBe(1);
  await page.unroute(endpoint);await page.route(endpoint,r=>r.fulfill({json:sample}));
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));});
  await expect(page.locator('#nodo-resources')).toBeVisible();
});
