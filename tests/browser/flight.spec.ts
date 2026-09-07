import {test,expect} from '@playwright/test';
test('complete cockpit flight, cameras, pause and reset',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/');await expect(page.locator('#phase')).toHaveText('PRELAUNCH');
 await expect(page.locator('#renderer-error')).toBeHidden();
 await page.screenshot({path:'media/flight-deck.png'});
 await page.locator('#preflight').click();await expect(page.locator('#systems-count')).toHaveText('7 / 7');
 await page.locator('#engine-arm').click();await page.locator('#launch-arm').click();
 await expect(page.locator('#launch')).toBeEnabled();await page.locator('#pace').selectOption('50');await page.locator('#launch').click();
 await expect(page.locator('#countdown')).toBeVisible();
 await expect(page.locator('#phase')).toHaveText('ORBITAL FLIGHT',{timeout:45000});
 await expect(page.locator('#completion')).toBeVisible();await page.locator('#dismiss-complete').click();
 await page.locator('[data-camera="ORBIT"]').click();await page.waitForTimeout(1200);await page.screenshot({path:'media/orbit.png'});
 await page.locator('#pause').click();const before=await page.evaluate(()=>(window as any).orbitalTelemetry.time);
 await page.waitForTimeout(300);expect(await page.evaluate(()=>(window as any).orbitalTelemetry.time)).toBe(before);
 await page.locator('#resume').click();await page.locator('#guidance').click();await page.keyboard.down('ArrowDown');await page.waitForTimeout(200);await page.keyboard.up('ArrowDown');
 expect(await page.evaluate(()=>(window as any).orbitalTelemetry.guidance)).toBe(false);
 for(const mode of ['EXTERNAL','CHASE','EARTH','COCKPIT']){await page.locator('[data-camera="'+mode+'"]').click();await expect(page.locator('.flightdeck')).toHaveAttribute('data-view',mode);}
 await page.locator('#reset').click();await expect(page.locator('#phase')).toHaveText('PRELAUNCH');expect(errors).toEqual([]);
});
test('mobile controls, systems and engineering remain accessible',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
 await page.locator('[data-tab="systems"]').click();await page.locator('#preflight').click();await expect(page.locator('#systems-count')).toHaveText('7 / 7');
 await page.locator('#engine-arm').click();await page.locator('#launch-arm').click();await page.locator('[data-tab="flight"]').click();await expect(page.locator('#throttle')).toBeVisible();
 await page.screenshot({path:'media/mobile-flight-deck.png'});
 await page.locator('[data-tab="engineering"]').click();await expect(page.locator('#engineering')).toBeVisible();
 await page.locator('[data-tab="flight"]').click();await page.locator('#launch').click();await expect(page.locator('#countdown')).toBeVisible();
 await page.locator('#abort').click();await expect(page.locator('#phase')).toHaveText('ABORT');await page.locator('#help').click();await expect(page.locator('#manual')).toBeVisible();await page.locator('#manual-ready').click();
});
test('audio, engineering, reduced motion and short-screen controls',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error'&&m.text().includes('Shader Error'))errors.push(m.text());});
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/');
 await page.locator('#audio').click();await expect(page.locator('#audio')).toContainText('ON');
 await page.locator('#audio').click();await expect(page.locator('#audio')).toContainText('OFF');
 await page.locator('#engineering-toggle').click();await expect(page.locator('#engineering-data')).toContainText('GRAVITY');
 await page.locator('#engineering-toggle').click();
 const timing=await page.evaluate(()=>new Promise<{mean:number,p95:number}>(resolve=>{const samples:number[]=[];let previous=performance.now();function frame(now:number){samples.push(now-previous);previous=now;if(samples.length<90)requestAnimationFrame(frame);else{samples.shift();samples.sort((a,b)=>a-b);resolve({mean:samples.reduce((a,b)=>a+b,0)/samples.length,p95:samples[Math.floor(samples.length*.95)]});}}requestAnimationFrame(frame);}));
 console.log('Measured desktop frame interval (ms): '+JSON.stringify(timing));expect(timing.p95).toBeLessThan(250);
 await page.setViewportSize({width:844,height:390});await page.locator('#abort').scrollIntoViewIfNeeded();await expect(page.locator('#abort')).toBeInViewport();
 expect(errors).toEqual([]);
});
