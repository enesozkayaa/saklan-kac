// Motor testi: node araclar/test-motor.js
const H = require('../esyalar.js'), M = require('../motor.js');
const gelen = [];
let hata = 0; const bekle = (k, ad) => { if (!k) { hata++; console.log('HATA:', ad); } else console.log('tamam:', ad); };
const H1 = H.uret(123), H2 = H.uret(123);
bekle(JSON.stringify(H1.esyalar) === JSON.stringify(H2.esyalar), 'aynı tohum aynı harita');
console.log('eşya sayısı', H1.esyalar.length, 'sert', H1.esyalar.filter(e => e.sert).length);
for (const ayar of [{ mod: 'elenme', can: 2 }, { mod: 'donusum', can: 1 }]) {
  M.baslat([{ id: 'a', ad: 'A' }, { id: 'b', ad: 'B' }, { id: 'c', ad: 'C' }], { ...ayar, saklan: 10, ara: 60, tur: 2, avci: 1 }, { herkese: m => gelen.push(m) }, { elle: true });
  const S = M.M;
  const avci = S.oyuncular.find(p => p.takim === 'avci'), sak = S.oyuncular.filter(p => p.takim === 'saklanan');
  bekle(sak.length === 2, 'iki saklanan');
  // saklanan bir eşyaya dönüşsün
  const e = S.H.esyalar.find(e => !e.sert && e.y === 0 && Math.abs(e.x) < 15 && Math.abs(e.z) < 12);
  M.girdi(sak[0].id, { tip: 'k', x: e.x + 0.8, z: e.z, h: 0, y: 0 });
  const yer = H.sigar(S.H, e.t, e.x + 1.2, 0, e.z) || { x: e.x + 1.2, y: 0, z: e.z };
  M.girdi(sak[0].id, { tip: 'yerles', t: e.t, x: yer.x, h: yer.y, z: yer.z, y: 0 });
  M.adim(0.05);
  bekle(sak[0].tur === e.t, 'yerleşme (eşyaya dönüşme)');
  M.girdi(sak[1].id, { tip: 'yerles', t: 1, x: 0, h: 0, z: 0, y: 0 });
  for (let i = 0; i < 20; i++) M.adim(0.05);
  M.girdi(sak[1].id, { tip: 'cadi' }); M.adim(0.05);
  bekle(sak[1].tur === -1, 'cadıya geri dönme');
  M.girdi(sak[1].id, { tip: 'yerles', t: 1, x: 40, h: 0, z: 0, y: 0 }); M.adim(0.05);
  bekle(sak[1].tur === -1, 'uzağa yerleşme reddedildi');
  // saklanma süresi biter
  for (let i = 0; i < 210; i++) M.adim(0.05);
  bekle(S.faz === 'ara', 'av başladı');
  // avcı saklananın yanına gelip ona ateş eder
  const q = sak[0];
  M.girdi(q.id, { tip: 'k', x: 1.5, z: 15.2, h: 0, y: 0 });
  M.girdi(avci.id, { tip: 'k', x: -1.5, z: 15.2, h: 0, y: 0 });
  const vurus = () => { const o = [avci.x, 1.5, avci.z], hy = q.y + H.govde(q.tur).h / 2; const d = [q.x - o[0], hy - o[1], q.z - o[2]]; M.girdi(avci.id, { tip: 'ates', o, d }); for (let i = 0; i < 10; i++) M.adim(0.05); };
  // gözcü iksiri saklananın yanına
  M.girdi(avci.id, { tip: 'iksir', x: q.x + 1, h: 0, z: q.z }); for (let i = 0; i < 25; i++) M.adim(0.05);
  const iks = gelen.filter(m => m.o).flatMap(m => m.o).filter(o => o[0] === 'iksir').pop();
  bekle(iks && iks[5] === 1, 'iksir saklananı sezdi');
  M.girdi(avci.id, { tip: 'iksir', x: q.x + 1, h: 0, z: q.z }); for (let i = 0; i < 25; i++) M.adim(0.05);
  bekle(gelen.filter(m => m.o).flatMap(m => m.o).filter(o => o[0] === 'iksir').length === 1, 'iksir bekleme süresi');
  vurus();
  const olaylar = gelen.filter(m => m.o).flatMap(m => m.o);
  const ates = olaylar.filter(o => o[0] === 'ates').pop();
  console.log('  atış sonucu', ates, 'saklanan can', q.can, 'avcı yeri', avci.x.toFixed(2), avci.z.toFixed(2), 'q', q.x, q.z);
  if (ayar.can === 2) { bekle(q.can === 1, 'isabet can düştü'); vurus(); }
  bekle(ayar.mod === 'elenme' ? q.takim === 'izle' : q.takim === 'avci', 'yakalandı → ' + ayar.mod);
  bekle(avci.puan === 2, 'avcıya 2 puan');
  // yanlış vuruş: duvara değil bir eşyaya
  const e2 = S.H.esyalar.find(x => !x.sert && x.y === 0 && Math.hypot(x.x - avci.x, x.z - avci.z) > 1.5 && Math.hypot(x.x - avci.x, x.z - avci.z) < 6);
  if (e2) { const o = [avci.x, 1.5, avci.z]; M.girdi(avci.id, { tip: 'ates', o, d: [e2.x - o[0], e2.y + e2.h / 2 - o[1], e2.z - o[2]] }); M.adim(0.05); console.log('  yanlış atış', gelen.filter(m => m.o).flatMap(m => m.o).filter(o => o[0] === 'ates').pop(), 'avcı can', avci.can); }
  // kötü sayı gelirse bozulmamalı
  M.girdi(sak[1].id, { tip: 'k', x: 'abc', z: NaN, h: Infinity, y: null });
  bekle(Number.isFinite(sak[1].x) && Number.isFinite(sak[1].y), 'kötü sayılar süzüldü');
  // süre bitsin → tur sonu → 2. tur → oyun sonu
  for (let i = 0; i < 6000 && S.faz !== 'bitti'; i++) M.adim(0.05);
  const bitti = gelen.find(m => m.tip === 'bitti');
  bekle(!!bitti, 'oyun bitti');
  console.log('  sıra', JSON.stringify(bitti && bitti.sira), 'tur', S.tur);
  gelen.length = 0;
}
// çıkış
M.baslat([{ id: 'a', ad: 'A' }, { id: 'b', ad: 'B' }], {}, { herkese: m => gelen.push(m) }, { elle: true });
M.cikis('b'); for (let i = 0; i < 400; i++) M.adim(0.05);
bekle(gelen.some(m => m.tip === 'bitti'), 'tek kişi kalınca oyun biter');
console.log(hata ? hata + ' HATA' : 'HEPSİ TAMAM');
