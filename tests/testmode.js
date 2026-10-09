const { chromium } = require('playwright');
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'}); const ctx=await b.newContext({viewport:{width:420,height:900},serviceWorkers:'block'});
  await ctx.route(/gstatic\.com\/firebasejs\//, r=>r.fulfill({contentType:'application/javascript',body:'window.firebase={initializeApp(){ throw new Error("should not init"); }};'}));
  await ctx.route(/fonts\.googleapis|fonts\.gstatic/, r=>r.fulfill({contentType:'text/css',body:''}));
  const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://127.0.0.1:8099/index.html?mode=test'); await p.waitForTimeout(800);
  const t=await p.textContent('body'); console.log('banner', /MODE ENTRAÎNEMENT/.test(t), 'FB defined', await p.evaluate(()=>!!window.FB), 'unlocked', await p.evaluate(()=>window.__hs.S.unlocked), 'new-session btn', !!(await p.$('[data-act="new-session"]')));
  await p.click('[data-go="players"]'); await p.click('[data-act="import-players"]'); await p.fill('#impTxt','Alice\nBob\nChloé'); await p.click('[data-act="import-confirm"]'); await p.waitForTimeout(200);
  await p.reload(); await p.waitForTimeout(600); console.log('players persisted', await p.evaluate(()=>Object.keys(window.__hs.S.players).length));
  p.on('dialog',d=>d.accept()); await p.click('[data-act="local-reset"]'); await p.waitForTimeout(800); console.log('after reset', await p.evaluate(()=>Object.keys(window.__hs.S.players).length));
  console.log('errors',errs); await b.close();
})().catch(e=>{console.error(String(e).slice(0,400));process.exit(1);});
