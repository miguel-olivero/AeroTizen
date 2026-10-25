const {test,expect}=require('@playwright/test');
const imageUrl='https://upload.wikimedia.org/wikipedia/commons/test-landscape.jpg';
const commons={query:{pages:{one:{title:'File:Landscape',imageinfo:[{width:2560,height:1440,mime:'image/jpeg',thumburl:imageUrl,descriptionurl:'https://commons.wikimedia.org/wiki/File:Landscape',extmetadata:{Artist:{value:'<b>Example photographer</b>'},LicenseShortName:{value:'CC BY 4.0'},LicenseUrl:{value:'https://creativecommons.org/licenses/by/4.0/'}}}]}}}};
test.beforeEach(async({page})=>{
 await page.route('https://**/*',r=>r.fulfill({json:{}}));
 await page.route('http://127.0.0.1:47790/**',r=>r.fulfill({json:{}}));
 await page.route('http://nodo.test/api/status',r=>r.fulfill({json:{ok:false}}));
});
test('Favorites is a horizontal bottom dock with uniformly named watermark cards; Apps and Inputs retain remote navigation',async({page})=>{
 await page.goto('/');await page.waitForFunction(()=>AeroTizen.settings.home&&AeroTizen.apps.all.length>0);
 await page.evaluate(()=>{AeroTizen.settings.home=AeroTizen.apps.all.map(a=>a.id);AeroTizen.settings.save();AeroTizen.homeScreen.render();});
 const geometry=await page.locator('#grid').evaluate(grid=>{const r=grid.getBoundingClientRect();return {top:r.top,bottom:r.bottom,scroll:grid.scrollWidth>grid.clientWidth,rows:new Set([...grid.children].map(t=>t.offsetTop)).size};});
 expect(geometry.top).toBe(824);expect(geometry.bottom).toBeLessThanOrEqual(1080);expect(geometry.rows).toBe(1);expect(geometry.scroll).toBe(true);
 const tiles=page.locator('#grid .app-tile');expect(await tiles.count()).toBeGreaterThan(5);
 for(const tile of await tiles.all()) { await expect(tile.locator('.name')).toHaveCount(1);expect(await tile.evaluate(t=>t.clientWidth/t.clientHeight)).toBeGreaterThan(1.6); }
 await expect(page.locator('#grid .app-artwork')).toHaveCount(0);
 await page.keyboard.press('ArrowDown'); // header to dock if the preceding render retained header focus
 for(let i=0;i<15;i++) await page.keyboard.press('ArrowRight');
 await expect.poll(()=>page.locator('#grid').evaluate(g=>g.scrollLeft)).toBeGreaterThan(0);
 await page.keyboard.press('ArrowUp');await expect(page.locator('#home-tab')).toHaveClass(/focused/);
 await page.keyboard.press('ArrowRight');await page.keyboard.press('Enter');await expect(page.locator('body')).not.toHaveClass(/home-page/);
 await page.keyboard.press('ArrowDown');await expect(page.locator('#grid .focused')).toHaveCount(1);
 await page.click('#inputs-tab');await expect(page.locator('#inputs .focused')).toHaveCount(1);
 await page.keyboard.press('Escape');await expect(page.locator('body')).toHaveClass(/home-page/);
});
test('Featured wallpaper validates 1080p, shows safe author/license credits and clears when another background is chosen',async({page})=>{
 await page.route('https://commons.wikimedia.org/w/api.php?**',r=>r.fulfill({json:commons}));
 await page.route(imageUrl,r=>r.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="2560" height="1440"><rect width="2560" height="1440" fill="#345678"/></svg>'}));
 await page.goto('/');await expect(page.locator('.wallpaper-photo')).toBeVisible();
 await expect(page.locator('#wallpaper-credit')).toContainText('Example photographer');await expect(page.locator('#wallpaper-credit b')).toHaveCount(0);
 await expect(page.locator('#wallpaper-credit a').last()).toHaveAttribute('href','https://creativecommons.org/licenses/by/4.0/');
 await page.evaluate(()=>{AeroTizen.settings.background='black';AeroTizen.applyBackground();});
 await expect(page.locator('.wallpaper-photo')).toHaveCount(0);await expect(page.locator('#wallpaper-credit')).toBeHidden();
});
test('Wallpaper failure leaves a usable launcher and stale image loads cannot replace a selected background',async({page})=>{
 await page.route('https://commons.wikimedia.org/w/api.php?**',r=>r.fulfill({json:commons}));
 let complete; const gate=new Promise(resolve=>{complete=resolve;});
 await page.route(imageUrl,async r=>{await gate;await r.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="2560" height="1440"/>'}).catch(()=>{});});
 await page.goto('/');await page.waitForFunction(()=>AeroTizen.apps.all.length>0);
 await page.evaluate(()=>{AeroTizen.settings.background='black';AeroTizen.applyBackground();});complete();
 await expect(page.locator('.wallpaper-photo')).toHaveCount(0);await expect(page.locator('#grid .tile').first()).toBeVisible();
});
test('Native icons have a full-width translucent backdrop, a separate left logo and lower-right title',async({page})=>{
 await page.goto('/');await page.waitForFunction(()=>AeroTizen.apps.all.length>0);
 await page.evaluate(()=>{
   const svg='<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128"><rect width="128" height="128" fill="#0644cc"/><circle cx="64" cy="64" r="30" fill="white"/></svg>';
   const grid=document.getElementById('grid');grid.textContent='';
   grid.appendChild(AeroTizen.tiles.app({id:'fixture.luna',name:'Amazon Luna',icon:'data:image/svg+xml,'+encodeURIComponent(svg)},'nodo-card',()=>{}));
   grid.appendChild(AeroTizen.tiles.app({id:'fixture.sky',name:'SkyShowtime',icon:'data:image/png;base64,broken'},'nodo-card',()=>{}));
 });
 const tile=page.locator('#grid .native-icon').first(), icon=tile.locator('img.logo');
 await expect.poll(()=>icon.evaluate(i=>i.complete&&i.naturalWidth>0)).toBe(true);
 expect(await icon.evaluate(i=>{const s=getComputedStyle(i);return {filter:s.filter,opacity:s.opacity,fit:s.objectFit};})).toEqual({filter:'none',opacity:'1',fit:'cover'});
 await expect(tile.locator('.name')).toHaveText('Amazon Luna');
 await expect(tile.locator('.app-monogram')).toBeHidden();
 const backdrop=tile.locator('.native-backdrop');await expect(backdrop).toHaveCount(1);
 const geometry=await backdrop.evaluate(i=>{const s=getComputedStyle(i),p=i.parentElement;return {height:i.clientHeight,parentHeight:p.clientHeight,width:i.clientWidth,parentWidth:p.clientWidth,opacity:s.opacity,align:getComputedStyle(p.querySelector('.name')).textAlign};});
 expect(geometry.height).toBe(geometry.parentHeight);expect(geometry.width).toBe(geometry.parentWidth);expect(geometry.opacity).toBe('0.22');expect(geometry.align).toBe('right');
 expect(await icon.evaluate(i=>getComputedStyle(i).left)).toBe('18px');
 for(const home of [true,false]) {
   await page.evaluate(home=>document.body.classList.toggle('home-page',home),home);
   const box=await icon.evaluate(i=>{const r=i.getBoundingClientRect(),p=i.parentElement.getBoundingClientRect();return {width:i.clientWidth,height:i.clientHeight,centerOffset:Math.abs((r.top+r.bottom-p.top-p.bottom)/2),radius:parseFloat(getComputedStyle(i).borderRadius)};});
   expect(box.width).toBe(box.height);expect(box.centerOffset).toBeLessThan(1);expect(box.radius).toBeGreaterThan(0);
 }
 await page.evaluate(()=>document.body.classList.add('home-page'));

 const failed=page.locator('#grid .native-icon').last();await expect(failed.locator('img')).toHaveCount(0);
 await expect(failed.locator('.app-monogram')).toHaveText('S');await expect(failed.locator('.name')).toHaveText('SkyShowtime');
});

test('Native icons tint the card from their dominant visible color and long dock names wrap completely',async({page})=>{
 await page.goto('/');await page.waitForFunction(()=>AeroTizen.apps.all.length>0);
 await page.evaluate(()=>{
 const c=document.createElement('canvas');c.width=c.height=128;const ctx=c.getContext('2d');
 ctx.fillStyle='#0040e0';ctx.fillRect(0,0,128,128);ctx.fillStyle='white';ctx.fillRect(48,48,32,32);
 const grid=document.getElementById('grid');grid.textContent='';
 grid.appendChild(AeroTizen.tiles.app({id:'test.long',name:'An Application With A Very Long Name For Television',icon:c.toDataURL()},'nodo-card',()=>{}));
 });
 const tile=page.locator('#grid .native-icon');await expect.poll(()=>tile.evaluate(t=>t.style.background)).toContain('rgb(8, 25, 66)');
 const label=tile.locator('.name');await expect(label).toHaveText('An Application With A Very Long Name For Television');
 const layout=await label.evaluate(n=>{const s=getComputedStyle(n),r=n.getBoundingClientRect(),p=n.closest('.tile').getBoundingClientRect();return {whiteSpace:s.whiteSpace,overflow:s.overflow,font:s.fontSize,fits:r.top>=p.top&&r.bottom<=p.bottom,lines:r.height/parseFloat(s.lineHeight)};});
 expect(layout.whiteSpace).toBe('normal');expect(layout.overflow).toBe('visible');expect(parseFloat(layout.font)).toBeLessThanOrEqual(18);expect(layout.fits).toBe(true);expect(layout.lines).toBeGreaterThan(1);
});

test('Application names shrink whole words and wrap exclusively at spaces in both card sizes',async({page})=>{
 await page.goto('/');await page.waitForFunction(()=>AeroTizen.apps.all.length>0);
 for(const size of ['big','small']) {
 await page.evaluate(size=>{
   AeroTizen.settings.cardSize=size;AeroTizen.homeScreen.render();const grid=document.getElementById('grid');grid.textContent='';
   ['SupercalifragilisticApplicationName','Several Whole Words In The Application Name'].forEach((name,i)=>grid.appendChild(AeroTizen.tiles.app({id:'fit.'+i,name},'nodo-card',()=>{})));
   AeroTizen.tiles.fitNames(grid);
 },size);
 const result=await page.locator('#grid .name').evaluateAll(nodes=>nodes.map(n=>{const s=getComputedStyle(n);return {space:s.whiteSpace,break:s.wordBreak,wrap:s.overflowWrap,font:parseFloat(s.fontSize),fits:n.scrollWidth<=n.clientWidth+1,text:n.textContent};}));
 expect(result[0].space).toBe('nowrap');expect(result[0].font).toBeLessThan(22);expect(result[0].fits).toBe(true);
 expect(result[1].space).toBe('normal');expect(result[1].break).toBe('normal');expect(result[1].wrap).toBe('normal');expect(result[1].fits).toBe(true);
 }
});
