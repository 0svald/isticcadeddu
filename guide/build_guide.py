import re
svg=open(__import__('os').path.join(__import__('os').path.dirname(__file__),'..','design','mani.svg')).read().replace(' width="512" height="512"','')
ICON="data:image/svg+xml,"+svg.replace('"',"'").replace('#','%23').replace('<','%3C').replace('>','%3E')
CSS='''
:root{--paper:#F4F1E8;--surface:#FFFDF8;--sub:#FAF7EF;--sunk:#ECE7DA;--line:#DDD5C1;--ink:#1F261C;--muted:#545B4C;--green:#3A6B35;--green-d:#2A5226;--green-t:#E6EEDF;--green-l:#C4D6BB;--green-bg:#F0F5EC;--amber-bg:#FBEFD6;--amber-line:#EBD5A4;--amber:#7A4A0C;--red:#8E2F1C;--red-bg:#F8E3DC;--red-line:#E3B5A6}
*{box-sizing:border-box} body{margin:0;background:#fff;color:var(--ink);font-family:"Atkinson Hyperlegible","Segoe UI","DejaVu Sans",Arial,sans-serif;font-size:16.5px;line-height:1.5}
.wrap{max-width:780px;margin:0 auto;padding:0 4px}
h1,h2,h3{font-family:"Fraunces",Georgia,"DejaVu Serif",serif;color:var(--green-d);font-weight:600}
h1{font-size:2.05rem;margin:.2em 0 .15em} h2{font-size:1.4rem;margin:1.5em 0 .35em;padding-bottom:.2em;border-bottom:1.5px solid var(--line)} h3{font-size:1.12rem;margin:1.1em 0 .25em}
p,li{margin:.35em 0} ul{padding-left:1.3em}
.cover{display:flex;align-items:center;gap:18px;margin:6px 0 10px}.cover .ic{width:74px;height:74px;background:url("ICON") center/contain no-repeat;flex:0 0 74px}
.tag{display:inline-block;background:var(--green-t);color:var(--green-d);border:1px solid var(--green-l);border-radius:999px;padding:2px 12px;font-size:.82rem;font-weight:700}
.lead{font-size:1.1rem;color:var(--muted)}
.box{border-radius:14px;padding:12px 16px;margin:12px 0;background:var(--green-t);border:1px solid var(--green-l)}
.box.warn{background:var(--amber-bg);border-color:var(--amber-line);color:#5E3908}
.step{display:flex;gap:12px;align-items:flex-start;margin:9px 0}.step .n{flex:0 0 28px;height:28px;border-radius:50%;background:var(--green);color:#fff;font-weight:700;display:flex;align-items:center;justify-content:center;font-size:.92rem}
.k{display:inline-block;font-weight:700;border:1.5px solid var(--green);color:var(--green-d);border-radius:8px;padding:0 7px;font-size:.92em;white-space:nowrap}
figure{margin:16px 0;break-inside:avoid;display:flex;flex-direction:column;align-items:center}
figcaption{color:var(--muted);font-size:.86rem;margin-top:6px;text-align:center}
.duo{display:flex;gap:18px;justify-content:center;flex-wrap:wrap}
.phone{width:300px;background:#1b1b1b;border-radius:28px;padding:9px;text-align:left}
.scr{background:var(--paper);border-radius:20px;overflow:hidden;position:relative;font-size:12.5px;line-height:1.35}
.browser{width:640px;border:1px solid var(--line);border-radius:12px;overflow:hidden;background:#fff;text-align:left}
.browser .bar{background:#ECE7DA;padding:7px 10px;display:flex;gap:5px;align-items:center}.browser .bar i{width:9px;height:9px;border-radius:50%;background:#C9C2B0}
.browser .bar span{flex:1;margin-left:8px;background:#fff;border-radius:6px;font-size:10px;color:#888;padding:2px 8px}
.m .top{display:flex;align-items:center;gap:8px;padding:9px 11px;border-bottom:1px solid var(--line);background:var(--paper)}
.m .mk{width:26px;height:26px;flex:0 0 26px;background:url("ICON") center/contain no-repeat}
.m .top b{font-family:Georgia,"DejaVu Serif",serif;color:var(--green-d);font-size:13px;display:block;line-height:1.1}.m .top small{color:var(--muted);font-size:10px}
.m .body{padding:10px 11px 12px}.m .h{font-family:Georgia,"DejaVu Serif",serif;color:var(--green-d);font-size:19px;font-weight:600;margin:0 0 4px}
.m .sub{color:var(--muted);font-size:11px}
.m .card{background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:9px 10px;margin:7px 0}.m .card.mine{border:2px solid var(--green)}
.m .card.warn{background:var(--amber-bg);border-color:var(--amber-line)}
.m .hero{background:var(--green);color:#fff;border-radius:13px;padding:10px 11px;margin:8px 0}.m .hero small{display:block;font-size:9px;letter-spacing:.07em;font-weight:700;color:#D6E6CF}.m .hero b{display:block;font-family:Georgia,serif;font-size:15px;margin:2px 0}
.m .row{display:flex;justify-content:space-between;align-items:center;gap:6px}
.m .li{display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px dashed var(--line)}
.m .badge{display:inline-block;font-size:9.5px;font-weight:700;padding:1px 7px;border-radius:999px;background:var(--green-t);color:var(--green-d);border:1px solid var(--green-l);white-space:nowrap}
.m .badge.full{background:var(--green);color:#fff;border-color:var(--green)}.m .badge.warn{background:var(--amber-bg);color:var(--amber);border-color:var(--amber-line)}.m .badge.grey{background:var(--sunk);color:var(--muted);border-color:var(--line)}
.m .btn{display:flex;align-items:center;justify-content:center;min-height:30px;border-radius:9px;background:var(--green);color:#fff;font-weight:700;font-size:11.5px;padding:0 10px;margin-top:6px}
.m .btn.sec{background:var(--surface);color:var(--green-d);border:1.5px solid var(--green)}.m .btn.red{background:var(--red-bg);color:var(--red);border:1px solid var(--red-line)}.m .btn.ghost{background:var(--sunk);color:var(--ink);border:1px solid var(--line)}
.m .btns{display:grid;grid-template-columns:repeat(3,1fr);gap:5px}.m .btns2{display:grid;grid-template-columns:repeat(2,1fr);gap:5px}
.m .nav{display:grid;grid-auto-flow:column;grid-auto-columns:1fr;gap:3px;padding:6px;border-top:1px solid var(--line);background:var(--surface)}
.m .nav span{text-align:center;font-size:9.5px;font-weight:700;color:var(--muted);padding:5px 2px;border-radius:8px}.m .nav span.on{background:var(--green-t);color:var(--green-d)}
.m .nav span i{display:block;font-style:normal;font-size:12px;line-height:1}
.m .prod{background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:8px 9px;margin:6px 0}.m .prod.on{background:var(--green-bg);border:2px solid var(--green)}
.m .st{display:flex;align-items:center;gap:5px;justify-content:flex-end;margin-top:6px}.m .st .u{margin-right:auto;font-size:10.5px;color:var(--muted)}.m .prod.on .st .u{color:var(--green-d);font-weight:700}
.m .sb{width:30px;height:30px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:16px;background:var(--green);color:#fff}.m .sb.m{background:#fff;color:var(--green-d);border:2px solid var(--green)}
.m .q{width:40px;height:30px;border:1.5px solid var(--line);border-radius:8px;background:#fff;display:flex;align-items:center;justify-content:center;font-weight:700}
.m .in{border:1.5px solid var(--line);border-radius:9px;background:#fff;padding:6px 8px;margin:3px 0 6px;font-size:12px}
.m .lab{font-size:10px;font-weight:700;color:var(--muted)}
.m .pill{font-size:9.5px;font-weight:700;border-radius:999px;padding:4px 8px;white-space:nowrap;background:var(--green-t);color:var(--green-d);border:1px solid var(--green-l)}.m .pill.no{background:var(--sunk);color:var(--muted);border:1px dashed #B9B09A}
.m .off{background:#F2EEE4;color:var(--muted)}
.m .totbar{display:flex;justify-content:space-between;align-items:center;border-top:2px solid var(--green);background:var(--surface);padding:8px 11px}
.m .side{display:flex}.m .side .sn{width:150px;background:var(--surface);border-right:1px solid var(--line);padding:8px 6px}.m .side .sn div{font-size:10.5px;font-weight:700;padding:6px 8px;border-radius:8px}.m .side .sn div.on{background:var(--green);color:#fff}
.m .side .mn{flex:1;padding:10px 12px}
.m .grpt{font-weight:700;font-size:11.5px}.m .grpt small{display:block;font-weight:400;color:var(--muted);font-size:10px}
.m table{width:100%;border-collapse:collapse;font-size:10px}.m th,.m td{border:1px solid var(--line);padding:3px 4px;text-align:center}.m th{background:#EEF2E7;color:var(--green-d)}
.m .det{border:1px solid var(--line);border-radius:10px;padding:6px 9px;background:var(--surface);margin:5px 0;font-weight:700;color:var(--green-d)}
.foot{margin-top:34px;color:var(--muted);font-size:.84rem;border-top:1px solid var(--line);padding-top:10px}
h2,h3{break-after:avoid} .box,.step{break-inside:avoid}
'''.replace('ICON',ICON)
def page(title,tag,body):
    return f'<!DOCTYPE html><html lang="it"><head><meta charset="utf-8"><title>{title}</title><style>{CSS}</style></head><body><div class="wrap"><div class="cover"><div class="ic"></div><div><span class="tag">{tag}</span><h1>{title}</h1></div></div>{body}<div class="foot">Gruppo di Acquisto Solidale – Comitato di quartiere Isticcadeddu · guida aggiornata al 24-09-2026.<br>Nomi, tessere, telefoni e prodotti nelle immagini sono <b>inventati</b>, solo come esempio.</div></div></body></html>'
def phone(inner,cap): return f'<figure><div class="phone"><div class="scr m">{inner}</div></div><figcaption>{cap}</figcaption></figure>'
def phones(items): return '<figure><div class="duo">'+''.join(f'<div><div class="phone"><div class="scr m">{i}</div></div></div>' for i,_ in items)+'</div><figcaption>'+' · '.join(c for _,c in items)+'</figcaption></figure>'
def browser(inner,cap,url='pannello amministratori'): return f'<figure><div class="browser"><div class="bar"><i></i><i></i><i></i><span>{url}</span></div><div class="m">{inner}</div></div><figcaption>{cap}</figcaption></figure>'
def top(t,s): return f'<div class="top"><div class="mk"></div><div><b>{t}</b><small>{s}</small></div></div>'
def nav(items,on): return '<div class="nav">'+''.join(f'<span class="{"on" if i==on else ""}"><i>{ic}</i>{i}</span>' for i,ic in items)+'</div>'
NAV_SOCIO=[('I miei ordini','◧'),('Profilo','◯'),('Aiuto','?')]
NAV_FORN=[('Listino','☰'),('Raccolte','▣'),('Profilo','◯'),('Aiuto','?')]
NAV_ADM=[('Da fare','✓'),('Raccolte','▣'),('Consegne','⛟'),('Profilo','◯'),('Altro','…')]
