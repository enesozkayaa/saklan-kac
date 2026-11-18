// =============================================================
// SaklanKaç - OYUN MOTORU (sadece odayı açan "ev" çalıştırır)
// Akış: saklanma süresi (avcıların gözü kapalı) → av → tur sonu → … → oyun sonu
// Her oyuncu kendi yerini hesaplayıp yollar; atışları, dönüşmeyi, puanları ev karar verir.
// Node'da da çalışır (testler için).
// =============================================================

const Motor = (() => {
  const H_ = (typeof Harita !== 'undefined') ? Harita : require('./esyalar.js');
  const S_ = H_.SINIR;
  const ADIM = 0.05;               // saniyede 20 adım
  const TUR_SONU = 8;              // tur sonu tablosu kaç saniye
  const MENZIL = 30;               // domatesin gidebileceği en uzak yer (kameradan)
  const DOMATES_HIZ = 26;          // metre / saniye
  const ATIS_ARA = 0.2;            // iki atış arası en az (oyuncuda 0.25)
  const ENERJI_MAX = 100, ATIS_ENERJI = 12, ENERJI_DOLUM = 9;   // fırlatma barı
  const DON_BEKLE = 0.6, YERLES_MESAFE = 8;
  const IKSIR_BEKLE = 10, IKSIR_R = 4.5, IKSIR_GECIKME = 0.9, IKSIR_MENZIL = 26;
  const KOPYA_BEKLE = 5, KOPYA_EN_COK = 2;
  const ALAY_BEKLE = 15, ALAY_EN_COK = 6;
  const PUAN = { yakala: 2, hayatta: 3, avciKazandi: 1, alay: 1 };

  let M = null, sayac = null, geri = null, rnd = Math.random;
  const yolla = m => geri && geri.herkese(m);
  const sayi = v => (Number.isFinite(+v) ? +v : 0);
  const sinirda = (x, z) => x >= S_.x0 && x <= S_.x1 && z >= S_.z0 && z <= S_.z1;

  function ayarDuzelt(a = {}) {
    const ara = (v, mn, mx, vs) => (v !== undefined && v !== null && v !== '' && Number.isFinite(+v) ? Math.max(mn, Math.min(mx, +v)) : vs);
    return {
      avci: ara(a.avci, 1, 4, 1) | 0,
      mod: a.mod === 'donusum' ? 'donusum' : 'elenme',
      can: ara(a.can, 1, 3, 2) | 0,
      tur: ara(a.tur, 1, 10, 4) | 0,
      saklan: ara(a.saklan, 10, 90, 45),
      ara: ara(a.ara, 60, 600, 240),
      kopya: a.kopya !== false,
      ses: a.ses !== false,
      sesAralik: ara(a.sesAralik, 15, 120, 45),
      iksir: a.iksir !== false,
      donusum: ara(a.donusum, 0, 5, 2),        // dakika; 0 = kapalı
    };
  }

  function baslat(liste, ayar, g, secenek = {}) {
    durdur();
    geri = g; rnd = secenek.rastgele || Math.random;
    M = {
      ayar: ayarDuzelt(ayar),
      oyuncular: liste.map((p, i) => ({ no: i, id: p.id, ad: String(p.ad).slice(0, 14), renk: p.renk ?? i, puan: 0, cikti: false })),
      tur: 0, faz: 'bos', s: 0, t: 0, kopyalar: [], kopyaNo: 0, olaylar: [], H: null, iksirler: [], domatesler: [],
      tohum: Math.floor(rnd() * 1e9),
    };
    yolla({ tip: 'basla', oyuncular: M.oyuncular.map(o => ({ no: o.no, id: o.id, ad: o.ad, renk: o.renk })), ayar: M.ayar });
    turBaslat();
    if (!secenek.elle) {
      // Gerçek saate göre adım at: sekme arka plandayken setInterval yavaşlasa da oyun yavaşlamaz
      let son = Date.now(), birikim = 0;
      sayac = setInterval(() => {
        const simdi = Date.now(); birikim += Math.min(3, (simdi - son) / 1000); son = simdi;
        let n = 0;
        while (birikim >= ADIM && n++ < 80) { adim(ADIM); birikim -= ADIM; }
      }, ADIM * 1000);
    }
    return M;
  }
  function durdur() { if (sayac) clearInterval(sayac); sayac = null; M = null; }

  const aktifler = () => M.oyuncular.filter(p => !p.cikti);
  const saklananlar = () => M.oyuncular.filter(p => !p.cikti && p.takim === 'saklanan');
  const avcilar = () => M.oyuncular.filter(p => !p.cikti && p.takim === 'avci');
  function kapiYeri(i) { return { x: H_.KAPI.x + ((i % 5) - 2) * 1.2, z: H_.KAPI.z - Math.floor(i / 5) * 1.2 }; }

  function turBaslat() {
    M.tur++;
    const L = aktifler(), n = L.length;
    const k = Math.max(1, Math.min(M.ayar.avci, n - 1));
    const bas = ((M.tur - 1) * k) % n;
    const avciNo = new Set(Array.from({ length: k }, (_, j) => L[(bas + j) % n].no));
    M.H = H_.uret(M.tohum + M.tur * 7919);
    M.kopyalar = []; M.iksirler = []; M.domatesler = [];
    let ai = 0, si = 0;
    L.forEach(p => {
      Object.assign(p, { tur: -1, kilit: false, cd: 0, donCd: 0, kopyaCd: 0, alayCd: 0, alaySay: 0, iksirCd: 0, enerji: ENERJI_MAX, y: 0, vuruldu: 0, yakalayan: -1 });
      if (avciNo.has(p.no)) {
        const yer = kapiYeri(ai++);
        Object.assign(p, { takim: 'avci', can: ENERJI_MAX, x: yer.x, z: yer.z, yon: Math.PI });
      } else {
        const a = (si++ / Math.max(1, n - k)) * Math.PI * 2 + rnd() * 0.3;
        const yer = H_.hareket(M.H, Math.sin(a) * 4.2, -5 + Math.cos(a) * 4.2, 0, H_.R_CADI, H_.BOY_CADI);
        Object.assign(p, { takim: 'saklanan', can: M.ayar.can, x: yer.x, z: yer.z, yon: a });
      }
    });
    M.oyuncular.filter(p => p.cikti).forEach(p => { p.takim = 'cikti'; });
    M.faz = 'saklan'; M.s = M.ayar.saklan; M.sesSayac = M.ayar.sesAralik; M.donSayac = M.ayar.donusum * 60;
    yolla({ tip: 'tur', tur: M.tur, turSayisi: M.ayar.tur, tohum: M.H.tohum, s: M.s, p: M.oyuncular.map(durum) });
  }

  // [no, x, y, z, yon, tur, can (avcıda fırlatma barı), bayrak]
  function durum(p) {
    const b = (p.takim === 'avci' ? 1 : 0) | (p.takim === 'izle' || p.takim === 'cikti' ? 2 : 0) | (p.kilit ? 4 : 0) | (p.cikti ? 16 : 0);
    const can = p.takim === 'avci' ? Math.floor(p.enerji || 0) : Math.ceil(p.can || 0);
    return [p.no, +(p.x || 0).toFixed(2), +(p.y || 0).toFixed(2), +(p.z || 0).toFixed(2), +(p.yon || 0).toFixed(2), p.tur ?? -1, can, b];
  }

  function adim(dt) {
    if (!M || M.faz === 'bitti' || M.faz === 'bos') return;
    M.t += dt;
    M.s -= dt;
    M.oyuncular.forEach(p => {
      p.cd = Math.max(0, (p.cd || 0) - dt); p.donCd = Math.max(0, (p.donCd || 0) - dt);
      p.kopyaCd = Math.max(0, (p.kopyaCd || 0) - dt); p.alayCd = Math.max(0, (p.alayCd || 0) - dt); p.iksirCd = Math.max(0, (p.iksirCd || 0) - dt);
      if (p.takim === 'avci') p.enerji = Math.min(ENERJI_MAX, (p.enerji || 0) + ENERJI_DOLUM * dt);
    });
    domatesAdim(dt);
    if (M.faz === 'saklan') {
      if (M.s <= 0) { M.faz = 'ara'; M.s = M.ayar.ara; M.olaylar.push(['ara']); }
    } else if (M.faz === 'ara') {
      iksirAdim(dt);
      if (M.ayar.ses) {
        M.sesSayac -= dt;
        if (M.sesSayac <= 0) { M.sesSayac = M.ayar.sesAralik; M.olaylar.push(['zorSes', saklananlar().map(p => p.no)]); }
      }
      if (M.ayar.donusum > 0) {
        M.donSayac -= dt;
        if (M.donSayac <= 0) { M.donSayac = M.ayar.donusum * 60; zorDonusum(); }
      }
      if (!saklananlar().length) return turBitti('avci');
      if (!avcilar().length) return turBitti('saklanan');
      if (M.s <= 0) return turBitti('saklanan');
    } else if (M.faz === 'turSonu') {
      if (M.s <= 0) {
        if (M.tur >= M.ayar.tur || aktifler().length < 2) return oyunBitti();
        return turBaslat();
      }
    }
    if (M.faz === 'saklan' && (!saklananlar().length || !avcilar().length)) return turBitti(saklananlar().length ? 'saklanan' : 'avci');
    snap();
  }

  function snap() {
    const m = { tip: 'd', f: M.faz, s: +Math.max(0, M.s).toFixed(1), p: M.oyuncular.map(durum), pu: M.oyuncular.map(p => p.puan) };
    if (M.ayar.donusum > 0 && M.faz === 'ara') m.dn = Math.ceil(M.donSayac);
    if (M.ayar.ses && M.faz === 'ara') m.sn = Math.ceil(M.sesSayac);
    if (M.olaylar.length) { m.o = M.olaylar; M.olaylar = []; }
    yolla(m);
  }

  function turBitti(kazanan) {
    const hayatta = saklananlar().map(p => p.no);
    hayatta.forEach(no => { M.oyuncular[no].puan += PUAN.hayatta; });
    if (kazanan === 'avci') avcilar().forEach(p => { p.puan += PUAN.avciKazandi; });
    M.faz = 'turSonu'; M.s = TUR_SONU;
    snap();
    yolla({ tip: 'turSonu', kazanan, hayatta, tur: M.tur, turSayisi: M.ayar.tur, sure: TUR_SONU, puanlar: M.oyuncular.map(p => p.puan), son: M.tur >= M.ayar.tur || aktifler().length < 2 });
  }
  function oyunBitti() {
    M.faz = 'bitti';
    const sira = M.oyuncular.filter(p => !p.cikti).map(p => ({ no: p.no, puan: p.puan })).sort((a, b) => b.puan - a.puan);
    yolla({ tip: 'bitti', sira, puanlar: M.oyuncular.map(p => p.puan) });
    if (sayac) clearInterval(sayac); sayac = null;
  }

  // ---------- Oyunculardan gelen mesajlar ----------
  function girdi(id, m) {
    if (!M || !m || typeof m !== 'object' || M.faz === 'bitti' || M.faz === 'bos') return;
    const p = M.oyuncular.find(o => o.id === id && !o.cikti);
    if (!p || p.takim === 'izle' || p.takim === 'cikti') return;
    if (M.faz === 'turSonu') return;
    switch (m.tip) {
      case 'k': {
        if (p.takim === 'avci' && M.faz === 'saklan') { p.yon = sayi(m.y); return; }
        p.x = Math.max(S_.x0, Math.min(S_.x1, sayi(m.x)));
        p.z = Math.max(S_.z0, Math.min(S_.z1, sayi(m.z)));
        p.y = Math.max(S_.y0, Math.min(S_.y1 - 0.2, sayi(m.h)));
        p.yon = sayi(m.y);
        if (p.takim === 'saklanan') p.kilit = !!m.l;
        return;
      }
      case 'at': return at(p, m);
      case 'yerles': return yerles(p, m);
      case 'cadi': return cadi(p);
      case 'iksir': return iksir(p, m);
      case 'kopya': return kopya(p, m);
      case 'alay': return alay(p);
    }
  }

  // Aşçı büyülü domates fırlatır: uçar, çarptığı şeye göre olay olur
  function at(p, m) {
    if (p.takim !== 'avci' || M.faz !== 'ara' || p.cd > 0 || p.enerji < ATIS_ENERJI) return;
    if (!Array.isArray(m.o) || !Array.isArray(m.d)) return;
    let o = m.o.slice(0, 3).map(sayi), d = m.d.slice(0, 3).map(sayi);
    const L = Math.hypot(d[0], d[1], d[2]);
    if (L < 1e-6) return;
    d = d.map(v => v / L);
    const goz = [p.x, (p.y || 0) + 1.5, p.z];
    if (Math.hypot(o[0] - goz[0], o[1] - goz[1], o[2] - goz[2]) > 7) o = goz;
    p.cd = ATIS_ARA; p.enerji -= ATIS_ENERJI;
    const hedefler = [];
    saklananlar().forEach(q => { const g = H_.govde(q.tur, false); hedefler.push({ tip: 'oyuncu', ref: q, x: q.x, y: q.y || 0, z: q.z, r: g.r, h: g.h }); });
    M.kopyalar.forEach(k => { const g = H_.govde(k.t, false); hedefler.push({ tip: 'kopya', ref: k, x: k.x, y: k.y, z: k.z, r: g.r, h: g.h }); });
    const sonuc = H_.isin(M.H, o, d, MENZIL, hedefler, true);
    const n = sonuc.nokta;
    const sure = Math.max(0.08, Math.hypot(n[0] - p.x, n[1] - (p.y + 1.4), n[2] - p.z) / DOMATES_HIZ);
    M.domatesler.push({ avci: p.no, sonuc, d, s: sure });
    M.olaylar.push(['at', p.no, +n[0].toFixed(2), +n[1].toFixed(2), +n[2].toFixed(2), +sure.toFixed(2)]);
  }
  function domatesAdim(dt) {
    if (!M.domatesler.length) return;
    M.domatesler = M.domatesler.filter(k => {
      k.s -= dt; if (k.s > 0) return true;
      carp(k); return false;
    });
  }
  function carp(k) {
    const { sonuc, d } = k, avci = M.oyuncular[k.avci];
    const n = sonuc.nokta;
    if (sonuc.tip === 'oyuncu') {
      const q = sonuc.ref;
      if (q.takim !== 'saklanan' || M.faz !== 'ara') return;
      const g = H_.govde(q.tur, false);
      // domates uçarken kaçtıysa ıska geçer
      if (Math.hypot(q.x - n[0], q.z - n[2]) > g.r + 0.6 || n[1] < q.y - 0.6 || n[1] > q.y + g.h + 0.6) return;
      q.can--; q.vuruldu++;
      M.olaylar.push(['hit', q.no, Math.max(0, q.can), avci.no]);
      if (q.can <= 0) yakala(q, avci);
    } else if (sonuc.tip === 'kopya') {
      if (!M.kopyalar.includes(sonuc.ref)) return;
      M.kopyalar = M.kopyalar.filter(c => c !== sonuc.ref);
      M.olaylar.push(['kopyaGit', sonuc.ref.id, 1]);
    } else if (sonuc.tip === 'esya') {
      const e = sonuc.ref;
      const yol = H_.firlat(M.H, e, d[0], d[2], rnd);
      const son = yol[yol.length - 1];
      e.x = son[0]; e.y = son[1]; e.z = son[2]; e.yon = +(e.yon + (rnd() - 0.5) * 4).toFixed(2);
      M.olaylar.push(['it', e.id, yol, e.yon]);
    } else if (sonuc.tip === 'sus') {
      M.olaylar.push(['sus', sonuc.ref.id, +d[0].toFixed(2), +d[2].toFixed(2)]);
    }
  }
  function yakala(q, avci) {
    avci.puan += PUAN.yakala;
    q.yakalayan = avci.no;
    M.kopyalar.filter(k => k.sahip === q.no).forEach(k => M.olaylar.push(['kopyaGit', k.id, 0]));
    M.kopyalar = M.kopyalar.filter(k => k.sahip !== q.no);
    if (M.ayar.mod === 'donusum') {
      const yer = kapiYeri(Math.floor(rnd() * 5));
      Object.assign(q, { takim: 'avci', enerji: ENERJI_MAX, tur: -1, kilit: false, x: yer.x, z: yer.z, y: 0, cd: 1 });
      M.olaylar.push(['yakala', q.no, avci.no, 1, q.x, q.z]);
    } else {
      q.takim = 'izle';
      M.olaylar.push(['yakala', q.no, avci.no, 0]);
    }
  }
  // Cadı seçtiği şeklin kılığına girip işaret ettiği yere yerleşir
  function yerles(p, m) {
    if (p.takim !== 'saklanan' || p.donCd > 0) return;
    const t = sayi(m.t) | 0;
    if (!H_.TURLER[t]) return;
    const x = sayi(m.x), z = sayi(m.z), y = Math.max(S_.y0, Math.min(S_.y1, sayi(m.h)));
    if (!sinirda(x, z)) return;
    if (Math.hypot(x - p.x, z - p.z, y - p.y) > YERLES_MESAFE + 1.5) return;
    Object.assign(p, { tur: t, x, y, z, yon: sayi(m.y), donCd: DON_BEKLE });
    M.olaylar.push(['don', p.no, t]);
  }
  function cadi(p) {
    if (p.takim !== 'saklanan' || p.tur < 0 || p.donCd > 0) return;
    p.tur = -1; p.kilit = false; p.donCd = DON_BEKLE;
    M.olaylar.push(['don', p.no, -1]);
  }
  // Belirli aralıklarla bütün cadılar rastgele bir şekle dönüşür (büyük, küçük, alakasız…)
  function zorDonusum() {
    const liste = saklananlar().map(p => {
      let t; do { t = Math.floor(rnd() * H_.TURLER.length); } while (t === p.tur && H_.TURLER.length > 1);
      p.tur = t; p.kilit = false; p.donCd = DON_BEKLE;
      return [p.no, t];
    });
    M.olaylar.push(['zorDon', liste]);
  }
  // Gözcü iksiri: düştüğü yerin çevresinde cadı ya da sahte kopya varsa parlar (hangisi olduğu belli olmaz)
  function iksir(p, m) {
    if (!M.ayar.iksir || p.takim !== 'avci' || M.faz !== 'ara' || p.iksirCd > 0) return;
    const x = sayi(m.x), y = Math.max(S_.y0, Math.min(S_.y1, sayi(m.h))), z = sayi(m.z);
    if (!sinirda(x, z)) return;
    if (Math.hypot(x - p.x, z - p.z) > IKSIR_MENZIL) return;
    p.iksirCd = IKSIR_BEKLE - 0.3;
    M.iksirler.push({ no: p.no, x, y, z, s: IKSIR_GECIKME });
    M.olaylar.push(['iksirAt', p.no, +x.toFixed(2), +y.toFixed(2), +z.toFixed(2)]);
  }
  function iksirAdim(dt) {
    M.iksirler = M.iksirler.filter(k => {
      k.s -= dt; if (k.s > 0) return true;
      const yakin = (x, y, z) => Math.hypot(x - k.x, (y - k.y) * 0.8, z - k.z) < IKSIR_R;
      const var_ = saklananlar().some(q => yakin(q.x, q.y, q.z)) || M.kopyalar.some(c => yakin(c.x, c.y, c.z));
      M.olaylar.push(['iksir', k.no, +k.x.toFixed(2), +k.y.toFixed(2), +k.z.toFixed(2), var_ ? 1 : 0]);
      return false;
    });
  }
  function kopya(p, m) {
    if (!M.ayar.kopya || p.takim !== 'saklanan' || p.kopyaCd > 0 || M.faz === 'turSonu') return;
    const t = sayi(m.t) | 0, x = sayi(m.x), z = sayi(m.z), y = Math.max(S_.y0, Math.min(S_.y1, sayi(m.h)));
    if (!H_.TURLER[t]) return;
    if (Math.hypot(x - p.x, z - p.z, y - p.y) > YERLES_MESAFE + 1) return;
    if (!sinirda(x, z)) return;
    p.kopyaCd = KOPYA_BEKLE;
    const benim = M.kopyalar.filter(k => k.sahip === p.no);
    if (benim.length >= KOPYA_EN_COK) { const eski = benim[0]; M.kopyalar = M.kopyalar.filter(k => k !== eski); M.olaylar.push(['kopyaGit', eski.id, 0]); }
    const k = { id: ++M.kopyaNo, t, x: +x.toFixed(2), y: +y.toFixed(2), z: +z.toFixed(2), yon: +sayi(m.y).toFixed(2), sahip: p.no };
    M.kopyalar.push(k);
    M.olaylar.push(['kopya', k.id, k.t, k.x, k.y, k.z, k.yon, p.no]);
  }
  function alay(p) {
    if (!M.ayar.ses || p.takim !== 'saklanan' || M.faz !== 'ara' || p.alayCd > 0) return;
    p.alayCd = ALAY_BEKLE;
    const puanli = p.alaySay < ALAY_EN_COK;
    if (puanli) { p.alaySay++; p.puan += PUAN.alay; }
    M.olaylar.push(['alay', p.no, Math.floor(rnd() * 4), puanli ? 1 : 0]);
  }

  // Oyuncu ayrıldı (botlar yok): oyundan düşer
  function cikis(id) {
    if (!M) return;
    const p = M.oyuncular.find(o => o.id === id && !o.cikti);
    if (!p) return;
    p.cikti = true; p.takim = 'cikti';
    M.kopyalar.filter(k => k.sahip === p.no).forEach(k => M.olaylar.push(['kopyaGit', k.id, 0]));
    M.kopyalar = M.kopyalar.filter(k => k.sahip !== p.no);
    M.olaylar.push(['cikti', p.no]);
    if (M.faz !== 'bitti' && aktifler().length < 2) { if (M.faz === 'turSonu') M.s = Math.min(M.s, 2); else turBitti(saklananlar().length ? 'saklanan' : 'avci'); }
  }

  return {
    baslat, durdur, adim, girdi, cikis, ayarDuzelt,
    ADIM, MENZIL, DOMATES_HIZ, ATIS_ARA, ENERJI_MAX, ATIS_ENERJI, ENERJI_DOLUM, YERLES_MESAFE, IKSIR_BEKLE, IKSIR_R, IKSIR_MENZIL, KOPYA_BEKLE, ALAY_BEKLE, PUAN, TUR_SONU,
    get M() { return M; },
  };
})();

if (typeof module !== 'undefined') module.exports = Motor;
