import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist']});
const page=await browser.newPage({viewport:{width:1440,height:900}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://localhost:5173');await page.locator('canvas').waitFor();await page.screenshot({path:'test-results/desktop.png'});
 await page.locator('#practice').click();await page.keyboard.down('w');await page.waitForTimeout(2200);await page.keyboard.up('w');assert.notEqual(await page.locator('#timer').textContent(),'00:00.00');await page.screenshot({path:'test-results/practice.png'});
 await page.locator('#exit').click();await page.locator('#open-lobby').click();await page.waitForFunction(()=>document.querySelector('#connection').textContent==='SPACETIMEDB CONNECTED',{timeout:15000});
 const code='QA'+Date.now().toString().slice(-8);await page.locator('#name').fill('Test pilot A');await page.locator('#code').fill(code);await page.locator('#join').click();await page.locator('#members').getByText('Test pilot A',{exact:false}).waitFor();
 const b=await browser.newPage({viewport:{width:1280,height:800}});await b.goto('http://localhost:5173/?room='+code);await b.waitForFunction(()=>document.querySelector('#connection').textContent==='SPACETIMEDB CONNECTED');await b.locator('#name').fill('Test pilot B');await b.locator('#join').click();await b.waitForTimeout(500);assert.match(await b.locator('#network-error').textContent(),/already has a pilot/);
 await b.locator('#part').selectOption('5');await b.locator('#join').click();await page.locator('#members').getByText('Test pilot B',{exact:false}).waitFor();assert.equal(await b.locator('#start').isVisible(),false);
 await page.locator('#start').click();await page.waitForFunction(()=>document.body.classList.contains('playing'));await b.waitForFunction(()=>document.body.classList.contains('playing'));await page.waitForTimeout(3300);assert.match(await page.locator('#race-status').textContent(),/RACING/);assert.match(await b.locator('#race-status').textContent(),/RACING/);
 await page.locator('[data-role="1"]').click();await page.waitForTimeout(500);assert.match(await page.locator('[data-role="1"]').getAttribute('class'),/active/);
 await page.screenshot({path:'test-results/multiplayer.png'});await page.locator('#exit').click();await b.locator('#exit').click();await b.close();
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:'test-results/mobile.png'});assert.equal(await page.locator('#practice').isVisible(),true);assert.deepEqual(errors,[]);console.log('PASS: rendering, practice, cloud connection, two clients, role conflicts, host start, shared countdown, live role switching, mobile layout, no page errors.');
}finally{await browser.close();}
