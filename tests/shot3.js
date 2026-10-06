const { chromium } = require('playwright'); const APP=process.env.APP||'src/app.html'; require('fs').mkdirSync('out',{recursive:true});
(async()=>{
  const b=await chromium.launch({...(process.env.CHROMIUM?{executablePath:process.env.CHROMIUM}:{})}); const p=await b.newPage({viewport:{width:400,height:820}});
  let html=require('fs').readFileSync(APP,'utf8');
  html='<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0">'+html.replace('<script>','<script>window.claude={use:async()=>null};')+'</body></html>';
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.setContent(html,{waitUntil:'load'}); await p.waitForTimeout(500);
  await p.fill('#pinIn','2018'); await p.click('[data-act="unlock"]'); await p.waitForTimeout(200);
  // add players via import
  await p.click('[data-go="players"]'); await p.click('[data-act="import-players"]'); await p.fill('#impTxt',['A1','A2','A3','B1','B2','B3','C1','C2','C3'].join('\n')); await p.click('[data-act="import-confirm"]'); await p.waitForTimeout(200);
  await p.click('[data-go="home"]'); await p.click('[data-act="new-session"]'); await p.waitForTimeout(200);
  for(let i=0;i<9;i++){ await (await p.$$('[data-act="toggle-present"]'))[i].click(); await p.waitForTimeout(60); }
  await p.click('[data-act="auto-teams"]'); await p.click('[data-act="start-session"]'); await p.waitForTimeout(300);
  await p.screenshot({path:'out/s_live.png'});
  await p.click('.pbtn'); await p.waitForTimeout(200); await p.screenshot({path:'out/s_sheet.png'});
  await p.click('[data-ev="pt2"]'); await p.waitForTimeout(100); if(await p.$('[data-ast]')) await (await p.$$('[data-ast]'))[0].click(); await p.click('.pbtn'); await p.click('[data-ev="pt3"]'); await p.waitForTimeout(100); if(await p.$('[data-ast=""]')) await p.click('[data-ast=""]'); await p.waitForTimeout(200);
  await p.click('.pbtn'); await p.click('[data-act="incident-for"]'); await p.waitForTimeout(200); await p.click('[data-act="incident-kind"][data-id="blocage"]'); await p.click('[data-act="incident-save"]'); await p.waitForTimeout(200);
  await p.click('[data-act="end-match"]'); await p.waitForTimeout(100); await (await p.$$('[data-win]'))[0].click(); await p.waitForTimeout(200);
  await p.screenshot({path:'out/s_between.png'});
  await p.click('[data-go="bureau"]'); await p.click('[data-bureau-seg="discipline"]'); await p.waitForTimeout(200); await p.screenshot({path:'out/s_disc.png'});
  await p.click('[data-act="sanction-from"]'); await p.waitForTimeout(200); await p.screenshot({path:'out/s_sanc.png'});
  console.log('errors:',errs);
  await b.close();
})().catch(e=>{console.error(e);process.exit(1);});
