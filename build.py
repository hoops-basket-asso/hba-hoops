#!/usr/bin/env python3
"""Assemble index.html (site public) à partir de src/app.html + src/config.js + src/fb-shim.js."""
import pathlib
root = pathlib.Path(__file__).parent
app = (root/'src/app.html').read_text(encoding='utf-8')
shim = (root/'src/fb-shim.js').read_text(encoding='utf-8')
cfg = (root/'src/config.js').read_text(encoding='utf-8')
import datetime, zoneinfo
stamp = datetime.datetime.now(zoneinfo.ZoneInfo('Europe/Paris')).strftime('%Y-%m-%d %H:%M')
cfg = cfg + '\nwindow.HS_VERSION = ' + repr(stamp) + ';'
head = f'''<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#151515"><meta name="apple-mobile-web-app-capable" content="yes"><meta name="mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-status-bar-style" content="black">
<meta name="description" content="Hoops Basket Association · stats et table de marque du dimanche">
<link rel="manifest" href="manifest.json"><link rel="icon" href="icon-192.png"><link rel="apple-touch-icon" href="icon-192.png">
<link rel="preconnect" href="https://www.gstatic.com" crossorigin><link rel="preconnect" href="https://firestore.googleapis.com" crossorigin><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<script>if('serviceWorker' in navigator){{ addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{{}})); }}</script>
<script src="https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.14.1/firebase-auth-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore-compat.js"></script>
<script>{cfg}</script>
<script>{shim}</script>
'''
i = app.find('</style>') + len('</style>')
page = head + app[:i] + '\n</head><body>' + app[i:] + '\n</body></html>'
page = page.replace('<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800&family=Barlow:wght@400;500;600;700&display=swap"', '<link rel="stylesheet" media="print" onload="this.media=\'all\'" href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800&family=Barlow:wght@400;500;600;700&display=swap"', 1)
(root/'index.html').write_text(page, encoding='utf-8')
print('index.html généré')
