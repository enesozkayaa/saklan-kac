// Motor testi: node araclar/test-motor.js
const H = require('../esyalar.js'), M = require('../motor.js');
const gelen = [];
let hata = 0; const bekle = (k, ad) => { if (!k) { hata++; console.log('HATA:', ad); } else console.log('tamam:', ad); };
const olaylar = () => gelen.filter(m => m.o).flatMap(m => m.o);
const H1 = H.uret(123), H2 = H.uret(123);
bekle(JSON.stringify(H1.esyalar) === JSON.stringify(H2.esyalar), 'aynı tohum aynı harita');
const adimlar = (n) => { for (let i = 0; i < n; i++) M.adim(0.05); };
const nisan = (avci, x, y, z) => { const o = [avci.x, avci.y + 1.5, avci.z]; return { o, d: [x - o[0], y - o[1], z - o[2]] }; };

for (const ayar of [{ mod: 'elenme', can: 2 }, { mod: 'donusum', can: 1 }]) {
  gelen.length = 0;
  M.baslat([{ id: 'a', ad: 'A' }, { id: 'b', ad: 'B' }, { id: 'c', ad: 'C' }], { ...ayar, saklan: 10, ara: 60, tur: 2, avci: 1, donusum: 0 }, { herkese: m => gelen.push(m) }, { elle: true });
  const S = M.M;
  const avci = S.oyuncular.find(p => p.takim === 'avci'), sak = S.oyuncular.filter(p => p.takim === 'saklanan');
  bekle(sak.length === 2, 'iki saklanan');
  M.girdi(sak[0].id, { tip: 'k', x: 0, z: 22, h: 1, y: 0 });
  M.girdi(sak[0].id, { tip: 'yerles', t: H.TUR_NO.tablo, x: 0, h: 0, z: 24, y: 0 });
  adimlar(1);
  bekle(sak[0].tur === H.TUR_NO.tablo, 'yerleşme (tabloya dönüşme)');
  M.girdi(sak[1].id, { tip: 'yerles', t: 1, x: 0, h: 0, z: 0, y: 0 }); adimlar(20);
  M.girdi(sak[1].id, { tip: 'cadi' }); adimlar(1);
  bekle(sak[1].tur === -1, 'cadıya geri dönme');
  M.girdi(sak[1].id, { tip: 'yerles', t: 1, x: 35, h: 0, z: 0, y: 0 }); adimlar(1);
  bekle(sak[1].tur === -1, 'uzağa yerleşme reddedildi');
  adimlar(210);
  bekle(S.faz === 'ara', 'av başladı');
  const q = sak[0];
  M.girdi(q.id, { tip: 'k', x: 1.5, z: 30, h: 0, y: 0 });
  M.girdi(avci.id, { tip: 'k', x: -2, z: 30, h: 0, y: 0 });
  M.girdi(avci.id, { tip: 'iksir', x: q.x + 1, h: 0, z: q.z }); adimlar(25);
  const iks = olaylar().filter(o => o[0] === 'iksir').pop();
  bekle(iks && iks[5] === 1, 'iksir saklananı sezdi');
  const g = H.govde(q.tur);
  const vurus = () => { M.girdi(avci.id, { tip: 'at', ...nisan(avci, q.x, q.y + g.h / 2, q.z) }); adimlar(12); };
  const enerji0 = avci.enerji;
  vurus();
  console.log('  atış', JSON.stringify(olaylar().filter(o => o[0] === 'at').pop()), 'can', q.can, 'enerji', enerji0.toFixed(1), '→', avci.enerji.toFixed(1));
  if (ayar.can === 2) { bekle(q.can === 1, 'domates isabet, can düştü'); vurus(); }
  bekle(ayar.mod === 'elenme' ? q.takim === 'izle' : q.takim === 'avci', 'yakalandı → ' + ayar.mod);
  bekle(avci.puan === 2, 'avcıya 2 puan');
  const e = S.H.esyalar.find(x => {
    if (x.sert || x.y !== 0 || x.z < 20) return false;
    const o = [x.x - 2, 1.5, x.z], d0 = [2, x.y + x.h / 2 - 1.5, 0], L = Math.hypot(...d0);
    const r = H.isin(S.H, o, d0.map(v => v / L), 30, [], true); if (r.tip !== 'esya' || r.ref !== x) return false;
    const yol = H.firlat(S.H, x, 1, 0, () => 0.5); const son = yol[yol.length - 1]; return son[0] !== x.x || son[2] !== x.z;
  });
  if (e) {
    const once = [e.x, e.z];
    M.girdi(avci.id, { tip: 'k', x: e.x - 2, z: e.z, h: 0, y: 0 });
    M.girdi(avci.id, { tip: 'at', ...nisan(avci, e.x, e.y + e.h / 2, e.z) }); adimlar(12);
    const it = olaylar().filter(o => o[0] === 'it').pop();
    bekle(!!it && (e.x !== once[0] || e.z !== once[1]), 'vurulan eşya fırladı');
  } else console.log('  (yakında eşya yok, fırlatma testi atlandı)');
  avci.enerji = 100; let atilan = 0;
  for (let i = 0; i < 20; i++) { const n0 = olaylar().filter(o => o[0] === 'at').length; M.girdi(avci.id, { tip: 'at', o: [avci.x, 1.5, avci.z], d: [0, 0, 1] }); adimlar(5); if (olaylar().filter(o => o[0] === 'at').length > n0) atilan++; }
  bekle(atilan > 6 && atilan < 20, `fırlatma barı bitiyor (${atilan} atış)`);
  M.girdi(sak[1].id, { tip: 'k', x: 'abc', z: NaN, h: Infinity, y: null });
  bekle(Number.isFinite(sak[1].x) && Number.isFinite(sak[1].y), 'kötü sayılar süzüldü');
  for (let i = 0; i < 6000 && S.faz !== 'bitti'; i++) M.adim(0.05);
  bekle(!!gelen.find(m => m.tip === 'bitti'), 'oyun bitti');
}
gelen.length = 0;
M.baslat([{ id: 'a', ad: 'A' }, { id: 'b', ad: 'B' }, { id: 'c', ad: 'C' }], { saklan: 10, ara: 200, donusum: 1, avci: 1 }, { herkese: m => gelen.push(m) }, { elle: true });
for (let i = 0; i < 200 + 1220; i++) M.adim(0.05);
const zd = olaylar().filter(o => o[0] === 'zorDon');
bekle(zd.length === 1 && zd[0][1].length === 2, 'her dakika rastgele dönüşüm');
const d = gelen.filter(m => m.tip === 'd' && m.dn).pop();
bekle(d && d.dn > 0 && d.dn <= 60, 'kalan süre ekrana gidiyor (' + (d && d.dn) + ')');
gelen.length = 0;
M.baslat([{ id: 'a', ad: 'A' }, { id: 'b', ad: 'B' }], {}, { herkese: m => gelen.push(m) }, { elle: true });
M.cikis('b'); adimlar(400);
bekle(gelen.some(m => m.tip === 'bitti'), 'tek kişi kalınca oyun biter');
console.log(hata ? hata + ' HATA' : 'HEPSİ TAMAM');
