// =============================================================
// SaklanKaç - oyuncunun tarafı: ekranlar, bekleme odası, uçma / yürüme, kamera,
// nişan alma, eşya seçme ve yerleşme, gözcü iksiri, HUD, telefon düğmeleri.
// Oyunun kuralları evde (motor.js). Kendi yerini oyuncu hesaplar ve eve yollar.
// =============================================================

const Oyun = (() => {
  const SURUM = 7;   // sw.js ONBELLEK numarasıyla aynı tut; oyuncular farklı sürümdeyse uyarı çıkar
  const $ = id => document.getElementById(id);
  const H_ = Harita, T_ = Harita.TURLER;
  const kanvas = $('sahne');
  Sahne.kur(kanvas);
  const dokun = matchMedia('(pointer: coarse)').matches;
  if (dokun) document.body.classList.add('dokun');
  $('surumYazi').textContent = 'Sürüm ' + SURUM;

  const kacis = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const hex = n => '#' + n.toString(16).padStart(6, '0');
  const sure = s => { s = Math.max(0, Math.ceil(s)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };

  let mod = null, benimId = null;
  const ayarVarsayilan = () => ({ avci: 1, mod: 'elenme', can: 2, tur: 4, saklan: 45, ara: 240, kopya: true, ses: true, sesAralik: 45, iksir: true, donusum: 2 });
  let lobi = { ayar: ayarVarsayilan() };
  try { const k = JSON.parse(localStorage.getItem('sk.ayar2') || 'null'); if (k) lobi.ayar = { ...lobi.ayar, ...k }; } catch (e) { }
  let oyun = null, ben = null;

  // ---------- Giriş ----------
  try { $('adim').value = localStorage.getItem('sk.ad') || ''; } catch (e) { }
  function adAl() {
    const ad = $('adim').value.trim().slice(0, 14);
    if (!ad) { $('girisDurum').textContent = 'Önce adını yaz.'; $('adim').focus(); return null; }
    try { localStorage.setItem('sk.ad', ad); } catch (e) { }
    Ses.baslat();
    return ad;
  }
  $('odaKurBtn').onclick = () => { const ad = adAl(); if (!ad) return; mod = 'ev'; $('girisDurum').textContent = 'Oda açılıyor…'; Ag.odaAc(ad); };
  $('katilBtn').onclick = () => {
    const ad = adAl(); if (!ad) return;
    const kod = $('odaKoduGir').value.trim().toUpperCase();
    if (kod.length < 5) { $('girisDurum').textContent = 'Oda kodunu yaz (5 harf).'; return; }
    mod = 'misafir'; $('girisDurum').textContent = 'Bağlanılıyor…'; Ag.katil(kod, ad);
  };
  $('odaKoduGir').addEventListener('keydown', e => { if (e.key === 'Enter') $('katilBtn').click(); });
  function ekranGoster(ad) {
    ['giris', 'lobi', 'turSonu', 'sonuc'].forEach(e => $(e).classList.toggle('gizli', e !== ad));
    $('hud').classList.toggle('gizli', ad !== 'hud' && ad !== 'turSonu');
  }

  // ---------- Ağ olayları ----------
  Ag.kabulKurali(n => {
    if (oyun && !oyun.bitti) return 'Oyun başladı; bitince tekrar dene.';
    if (n >= 10) return 'Oda dolu (en fazla 10 kişi).';
    return true;
  });
  Ag.on('oda', ({ kod }) => { benimId = Ag.benimId; $('lobiKod').textContent = kod; ekranGoster('lobi'); lobiYay(); lobiCiz(); mikCiz(); });
  Ag.on('hata', m => { $('girisDurum').textContent = m; $('lobiDurum').textContent = m; });
  Ag.on('oyuncular', () => { if (mod === 'ev') lobiYay(); lobiCiz(); Ag.sesGuncelle(); });
  Ag.on('mesaj', m => mesaj(m));
  Ag.on('evMesaj', (m, id) => { if (oyun && !oyun.bitti) Motor.girdi(id, m); });
  Ag.on('koptu', o => { if (mod === 'ev' && oyun && !oyun.bitti) Motor.cikis(o.id); });
  Ag.on('evKoptu', () => menuyeDon('Oda sahibiyle bağlantı koptu.'));
  const eve = m => Ag.eveGonder(m);
  // Oyun sırasında herkes sadece kendi takımını duyar (izleyenler cadılarla)
  const grup = no => { const v = oyun?.k.get(no); return v && v.takim === 'avci' ? 'a' : 's'; };
  Ag.duyulacaklariBelirle(() => {
    const hepsi = new Set(Ag.oyuncular.map(o => o.id));
    if (!oyun || oyun.bitti || oyun.faz === 'turSonu' || benimNo() < 0) return hepsi;
    const benG = grup(benimNo());
    return new Set(oyun.oyuncular.filter(p => grup(p.no) === benG).map(p => p.id));
  });

  // ---------- Bekleme odası ----------
  const yonetici = () => mod === 'ev';
  const AYAR_SEC = [['ayMod', 'mod', String], ['ayAvci', 'avci', Number], ['ayCan', 'can', Number], ['ayTur', 'tur', Number], ['aySaklan', 'saklan', Number], ['ayAra', 'ara', Number], ['aySesAralik', 'sesAralik', Number], ['ayDonusum', 'donusum', Number]];
  const AYAR_KUTU = [['ayIksir', 'iksir'], ['ayKopya', 'kopya'], ['aySes', 'ses']];
  function lobiYay() { if (mod === 'ev') Ag.yayinla({ tip: 'lobi', ayar: lobi.ayar, surum: SURUM }); }
  function lobiCiz() {
    const L = Ag.oyuncular;
    $('lobiListe').innerHTML = L.map((p, i) => `<li style="--r:${hex(Sahne.RENKLER[i % 10])}"><span>${p.id === benimId ? '⭐ ' : ''}${kacis(p.ad)}${p.ses ? ' 🎤' : ''}</span><small>${Sahne.RENK_AD[i % 10]}</small></li>`).join('');
    AYAR_SEC.forEach(([el, k]) => { $(el).value = String(lobi.ayar[k]); $(el).disabled = !yonetici(); });
    AYAR_KUTU.forEach(([el, k]) => { $(el).checked = !!lobi.ayar[k]; $(el).disabled = !yonetici(); });
    $('aySesAralik').disabled = !yonetici() || !lobi.ayar.ses;
    const a = lobi.ayar, n = L.length, avci = Math.max(1, Math.min(a.avci, n - 1));
    $('ayarOzet').textContent = `${n} oyuncu · ${avci} aşçı, ${Math.max(0, n - avci)} cadı · ${a.tur} tur · ${a.mod === 'elenme' ? 'Elenme' : 'Avcıya dönüşme'}${a.donusum > 0 ? ` · ${a.donusum} dk'da bir rastgele dönüşüm` : ''}`;
    $('baslaBtn').classList.toggle('gizli', !yonetici());
    if (yonetici()) $('lobiDurum').textContent = n < 2 ? 'En az 2 kişi gerekli. Oda kodunu arkadaşlarına gönder.' : 'Hazır olunca oyunu başlat.';
    else if (!/Sürümün/.test($('lobiDurum').textContent)) $('lobiDurum').textContent = 'Oda sahibi oyunu başlatacak…';
  }
  function ayarDegisti() { if (!yonetici()) return; try { localStorage.setItem('sk.ayar2', JSON.stringify(lobi.ayar)); } catch (e) { } lobiYay(); lobiCiz(); }
  AYAR_SEC.forEach(([el, k, f]) => $(el).addEventListener('change', () => { lobi.ayar[k] = f($(el).value); ayarDegisti(); }));
  AYAR_KUTU.forEach(([el, k]) => $(el).addEventListener('change', () => { lobi.ayar[k] = $(el).checked; ayarDegisti(); }));
  $('kodKopyalaBtn').onclick = () => { navigator.clipboard?.writeText(Ag.kod).then(() => { $('lobiDurum').textContent = 'Kod kopyalandı.'; }).catch(() => {}); };
  $('lobiCikBtn').onclick = () => menuyeDon('');
  $('lobiMikBtn').onclick = mikDegistir;
  $('baslaBtn').onclick = baslat;
  function baslat() {
    if (!yonetici()) return;
    const L = Ag.oyuncular;
    if (L.length < 2) { if (oyun) { oyunTemizle(); ekranGoster('lobi'); lobiCiz(); } $('lobiDurum').textContent = 'En az 2 kişi gerekli.'; return; }
    Motor.baslat(L.map((p, i) => ({ id: p.id, ad: p.ad, renk: i })), lobi.ayar, { herkese: m => Ag.yayinla(m) });
  }
  function menuyeDon(neden) {
    Motor.durdur();
    Ag.kapat();
    oyunTemizle();
    mod = null;
    ekranGoster('giris');
    $('girisDurum').textContent = neden || '';
    mikCiz();
  }
  $('lobiyeBtn').onclick = () => {
    if (mod === 'ev') { Motor.durdur(); Ag.yayinla({ tip: 'lobiyeDon' }); }
    else { oyunTemizle(); ekranGoster('lobi'); lobiCiz(); }
  };
  $('tekrarBtn').onclick = () => { if (yonetici()) baslat(); };
  $('cikBtn').onclick = () => { if (confirm('Oyundan çıkılsın mı?')) menuyeDon(''); };
  $('sesBtn').onclick = () => { const a = Ses.degistir(); $('sesBtn').textContent = a ? '🔊' : '🔇'; };
  $('sesBtn').textContent = Ses.acik ? '🔊' : '🔇';
  $('mikBtn').onclick = mikDegistir;
  async function mikDegistir() {
    if (Ag.sesAcik) Ag.sesKapat(); else if (!(await Ag.sesAc())) { akis('🎤 Mikrofona izin verilmedi.', 'kotu'); $('lobiDurum').textContent = 'Mikrofona izin verilmedi.'; }
    mikCiz();
  }
  function mikCiz() {
    const a = Ag.sesAcik;
    $('lobiMikBtn').textContent = a ? '🎤 Mikrofon açık' : '🎤 Mikrofon kapalı';
    $('mikBtn').classList.toggle('acik', a); $('mikBtn').classList.toggle('kapali', !a);
  }

  // ---------- Oyun kurulumu ----------
  function oyunKur(m) {
    oyunTemizle();
    oyun = { oyuncular: m.oyuncular, ayar: m.ayar, k: new Map(), puan: m.oyuncular.map(() => 0), bitti: false, faz: 'bos', s: 0, H: null, kopyalar: new Map(), yaw: 0, pitch: -0.15 };
    m.oyuncular.forEach(p => {
      const g = Sahne.oyuncuYap(p.renk, 'cadi');
      const et = Sahne.etiketYap(p.ad, hex(Sahne.RENKLER[p.renk % 10]));
      Sahne.scene.add(g); Sahne.scene.add(et);
      oyun.k.set(p.no, { g, et, x: 0, y: 0, z: 0, yon: 0, hx: 0, hy: 0, hz: 0, hyon: 0, tur: -1, takim: 'saklanan', can: 1, bayrak: 0, hiz: 0, ates: false });
    });
    $('akis').innerHTML = '';
    mikCiz();
  }
  function oyunTemizle() {
    if (oyun) { oyun.k.forEach(v => { Sahne.at(v.g); Sahne.at(v.et); }); oyun.kopyalar.forEach(k => Sahne.at(k)); clearInterval(oyun.turSayac); }
    Sahne.esyalarTemizle(); Sahne.hayaletGoster(null); Sahne.isaretKoy(null);
    oyun = null; ben = null;
    if (document.pointerLockElement) document.exitPointerLock();
  }
  const benimNo = () => (oyun ? (oyun.oyuncular.find(p => p.id === benimId)?.no ?? -1) : -1);
  const oyuncu = no => oyun.oyuncular[no];
  const renkCss = no => hex(Sahne.RENKLER[oyuncu(no).renk % 10]);
  const takimOf = b => (b & 2 ? 'izle' : b & 1 ? 'avci' : 'saklanan');
  const benimV = () => oyun?.k.get(benimNo());

  // ---------- Mesajlar ----------
  function mesaj(m) {
    switch (m.tip) {
      case 'lobi':
        lobi = { ayar: { ...ayarVarsayilan(), ...m.ayar } };
        if (!Ag.evMi && m.surum !== SURUM) $('lobiDurum').innerHTML = `⚠️ <b>Sürümün farklı!</b> Oda sahibi: ${m.surum ?? 'eski'}, sen: ${SURUM}. Daha eski olan sayfayı yenilesin (gerekirse kapatıp aç).`;
        if (!oyun || oyun.bitti) lobiCiz();
        break;
      case 'lobiyeDon': oyunTemizle(); ekranGoster('lobi'); lobiCiz(); Ag.sesGuncelle(); break;
      case 'basla': oyunKur(m); break;
      case 'tur': if (oyun) turGeldi(m); break;
      case 'd': if (oyun) snapGeldi(m); break;
      case 'turSonu': if (oyun) turSonu(m); break;
      case 'bitti': if (oyun) oyunBitti(m); break;
    }
  }

  function turGeldi(m) {
    oyun.H = H_.uret(m.tohum);
    Sahne.esyalarKur(oyun.H);
    Sahne.kapiAc(false);
    oyun.kopyalar.forEach(k => Sahne.at(k)); oyun.kopyalar.clear();
    oyun.tur = m.tur; oyun.turSayisi = m.turSayisi; oyun.faz = 'saklan'; oyun.s = m.s;
    oyun.turBasiPuan = oyun.puan.slice();
    clearInterval(oyun.turSayac);
    m.p.forEach(d => durumUygula(d, true));
    const bn = benimNo(), v = benimV();
    girdiSifirla();
    ben = v ? { x: v.x, y: v.y, z: v.z, yon: v.yon, kilit: false, cd: 0, iksirCd: 0, kopyaCd: 0, alayCd: 0, secili: -1, sonYolla: 0, turKilit: 0, yerde: true, kam: null, harcanan: 0 } : null;
    oyun.yaw = v ? v.yon : 0; oyun.pitch = -0.15;
    ekranGoster('hud'); mikCiz();
    $('akis').innerHTML = '';
    if (v?.takim === 'avci') buyukYazi('AŞÇISIN! 👨‍🍳', 'Kulübede kilitlisin. Aralıklardan ve anahtar deliğinden dikizle!', 2600);
    else buyukYazi('CADISIN! 🧹', dokun ? 'Uç, 🎯 ile bir eşya seç, ✨ ile saklan!' : 'Uç, E ile bir eşya seç, sol tık ile saklan!', 2600);
    Ses.gong();
    void bn;
    ipucuCiz(); puanTabloCiz(); Ag.sesGuncelle();
  }
  // [no, x, y, z, yon, tur, can, bayrak]
  function durumUygula(d, hemen) {
    const [no, x, y, z, yon, tur, can, b] = d, v = oyun.k.get(no); if (!v) return;
    const benim = no === benimNo();
    const eskiTakim = v.takim;
    v.hx = x; v.hy = y; v.hz = z; v.hyon = yon; v.can = can; v.bayrak = b;
    v.takim = takimOf(b);
    if (!(benim && ben && ben.turKilit > 0)) v.tur = tur;
    if (hemen) { v.x = x; v.y = y; v.z = z; v.yon = yon; }
    if (eskiTakim !== v.takim && !hemen) Ag.sesGuncelle();
  }
  function snapGeldi(m) {
    if (!oyun.H) return;
    const eskiFaz = oyun.faz;
    oyun.faz = m.f; oyun.s = m.s; oyun.dn = m.dn; oyun.sn = m.sn;
    m.p.forEach(d => durumUygula(d, false));
    if (m.pu && m.pu.join() !== oyun.puan.join()) { oyun.puan = m.pu.slice(); puanTabloCiz(); }
    if (eskiFaz === 'saklan' && m.f === 'saklan') { const n = Math.ceil(m.s); if (n <= 5 && n > 0 && n !== oyun.sonSayi) { oyun.sonSayi = n; Ses.tik(); } }
    if (m.o) m.o.forEach(olay);
  }
  const konum = no => { const v = oyun.k.get(no); return v ? { x: v.x, z: v.z } : null; };
  function olay(o) {
    const bn = benimNo(), ben_ = no => no === bn;
    switch (o[0]) {
      case 'ara': {
        Sahne.kapiAc(true); if (ben) ben.dikiz = false; Ses.kapi();
        const v = benimV();
        buyukYazi('AV BAŞLADI! 🔎', v?.takim === 'avci' ? 'Cadıları bul ve vur!' : 'Eşyayken artık sadece yürürsün. Uçmak için F: cadı ol!', 2400);
        Ses.gong(); break;
      }
      case 'at': {
        const [, no, x, y, z, sure_] = o, v = oyun.k.get(no); if (!v) break;
        v.ates = true;
        const a = Sahne.kepceUcu(v.g) || new THREE.Vector3(v.x, v.y + 1.4, v.z), b = new THREE.Vector3(x, y, z);
        Sahne.domatesAt(a, b, sure_, () => Ses.patla({ x, z }));
        Ses.firlat({ x: v.x, z: v.z });
        break;
      }
      case 'it': {
        const [, id, yol, yon] = o, e = oyun.H.esyalar[id]; if (!e) break;
        Sahne.esyaUcur(e, yol, yon, () => { if (yol.length > 2) Ses.dus({ x: e.x, z: e.z }); });
        Ses.firla({ x: e.x, z: e.z });
        break;
      }
      case 'sus': {
        const [, id, dx, dz] = o, s_ = H_.SUS_HEDEF[id]; if (!s_) break;
        Sahne.susVur(id, dx, dz);
        Ses.susVur(s_.tip, { x: s_.x, z: s_.z });
        break;
      }
      case 'zorDon': {
        (o[1] || []).forEach(([no, t]) => {
          const v = oyun.k.get(no); if (!v) return;
          v.tur = t;
          Sahne.partikul(v.x, v.y + 0.4, v.z, 0xc88aff, 20, 3, 0.7);
          if (no === bn && ben) { ben.turKilit = 0.6; ben.kilit = !!T_[t].duvar; buyukYazi('🎲 RASTGELE DÖNÜŞÜM!', `Artık ${T_[t].emo} ${T_[t].ad} oldun!`, 2200); }
        });
        Ses.zorDon();
        if (benimV()?.takim === 'avci') akis('🎲 Cadılar rastgele şekillere büründü!');
        break;
      }
      case 'hit': {
        const [, q, can, avci] = o, v = oyun.k.get(q); if (!v) break;
        Sahne.partikul(v.x, v.y + 0.4, v.z, 0xff4a6a, 16, 3);
        Ses.isabet({ x: v.x, z: v.z });
        if (ben_(q)) { Sahne.sars(0.15); $('hasarFlas').classList.remove('goster'); void $('hasarFlas').offsetWidth; $('hasarFlas').classList.add('goster'); if (can > 0) buyukYazi('VURULDUN!', `${can} canın kaldı. Kaç!`, 1500); }
        if (ben_(avci)) { Sahne.yaziGoster(v.x, v.y + 1, v.z, '🎯 İSABET!', '#ffe06a', 0.8, 1.2); Sahne.sars(0.05); }
        Sahne.yaziGoster(v.x, v.y + 0.6, v.z, '💥', '#ffffff', 0.8, 0.8);
        break;
      }
      case 'yakala': {
        const [, q, avci, donustu, x, z] = o, v = oyun.k.get(q);
        if (v) { Sahne.partikul(v.x, v.y + 0.5, v.z, 0xc88aff, 30, 4, 0.9); Ses.yakala({ x: v.x, z: v.z }); }
        akis(`🎯 <b style="color:${renkCss(avci)}">${kacis(oyuncu(avci).ad)}</b> → <b style="color:${renkCss(q)}">${kacis(oyuncu(q).ad)}</b> yakalandı!${donustu ? ' Artık aşçı.' : ''}`, ben_(avci) ? 'iyi' : ben_(q) ? 'kotu' : '');
        if (ben_(avci)) buyukYazi('YAKALADIN! +2', `${oyuncu(q).ad} yakalandı`, 1500);
        if (ben_(q)) {
          if (donustu) { Object.assign(ben, { x, y: 0, z, kilit: false }); if (v) { v.x = x; v.z = z; v.y = 0; } buyukYazi('YAKALANDIN!', 'Artık sen de aşçısın! Diğer cadıları bul.', 2500); }
          else { buyukYazi('YAKALANDIN!', 'Artık mutfakta serbestçe uçarak izleyebilirsin', 2500); }
          Ses.kaybetti();
        }
        if (v) v.takim = donustu ? 'avci' : 'izle';
        puanTabloCiz(); Ag.sesGuncelle();
        break;
      }
      case 'kopya': {
        const [, id, t, x, y, z, yon, sahip] = o;
        const m = Sahne.esyaYap(t); m.position.set(x, y, z); m.rotation.y = yon; Sahne.scene.add(m);
        oyun.kopyalar.set(id, m);
        if (ben_(sahip)) { Ses.kopya({ x, z }); akis('👥 Sahte kopya koydun', 'iyi'); }
        break;
      }
      case 'kopyaGit': {
        const [, id, vuruldu] = o, m = oyun.kopyalar.get(id); if (!m) break;
        oyun.kopyalar.delete(id);
        const p = m.position;
        Sahne.partikul(p.x, p.y + 0.2, p.z, 0xc88aff, 16, 2.5, 0.7);
        if (vuruldu) { Sahne.yaziGoster(p.x, p.y + 0.8, p.z, '🤡 SAHTE!', '#e8a0ff', 0.8, 1.4); Ses.kopyaPatla({ x: p.x, z: p.z }); }
        Sahne.at(m);
        break;
      }
      case 'don': {
        const [, no, t] = o, v = oyun.k.get(no); if (!v) break;
        Sahne.partikul(v.hx, v.hy + 0.3, v.hz, t < 0 ? 0x7affb0 : 0xc88aff, 14, 2.5, 0.6);
        (t < 0 ? Ses.cadi : Ses.don)({ x: v.hx, z: v.hz });
        if (ben_(no)) akis(t < 0 ? '🧹 Yeniden cadı oldun, uçabilirsin' : `🎭 ${T_[t].emo} ${T_[t].ad} oldun. Kıpırdama!`, 'iyi');
        break;
      }
      case 'alay': {
        const [, no, tur, puanli] = o, v = oyun.k.get(no); if (!v) break;
        Ses.islik(tur, { x: v.x, z: v.z });
        Sahne.yaziGoster(v.x, v.y + 0.9, v.z, '🎵', '#ffe06a', 0.9, 1.5);
        if (ben_(no)) akis(puanli ? '📢 Alay ettin! +1 puan' : '📢 Alay ettin (bu turun puanı doldu)', 'iyi');
        break;
      }
      case 'zorSes': (o[1] || []).forEach((no, i) => { const v = oyun.k.get(no); if (!v) return; setTimeout(() => Ses.islik(no % 4, { x: v.x, z: v.z }), i * 250); Sahne.yaziGoster(v.x, v.y + 0.9, v.z, '🎵', '#ffe06a', 0.6, 1.2); Sahne.partikul(v.x, v.y + 0.4, v.z, 0xffe06a, 5, 1.5, 0.6); }); if (benimV()?.takim === 'avci') akis('🎵 Cadılar ıslık çaldı! Kulak ver…'); break;
      case 'iksirAt': {
        const [, no, x, y, z] = o, v = oyun.k.get(no); if (!v) break;
        Sahne.iksirUcur(new THREE.Vector3(v.x, v.y + 1.3, v.z), new THREE.Vector3(x, y, z), 0xa04ae0);
        Ses.iksirAt({ x: v.x, z: v.z });
        break;
      }
      case 'iksir': {
        const [, no, x, y, z, var_] = o;
        Sahne.halka(x, y, z, var_ ? 0xb05aff : 0x9a9aa8, Motor.IKSIR_R, 3.2);
        Sahne.partikul(x, y + 0.2, z, var_ ? 0xc88aff : 0xbbbbbb, 18, 3, 0.7);
        Sahne.yaziGoster(x, y + 1.4, z, var_ ? '✨ Cadı kokusu!' : '💨 Boş', var_ ? '#e0a8ff' : '#dddddd', 1, 2.6);
        Ses.iksirPatla(var_, { x, z });
        if (ben_(no)) akis(var_ ? '🔮 İksir parladı: yakında cadı ya da sahte kopya var!' : '🔮 İksir sönük kaldı: orada kimse yok', var_ ? 'iyi' : '');
        break;
      }
      case 'cikti': akis(`🚪 ${kacis(oyuncu(o[1]).ad)} oyundan çıktı`); puanTabloCiz(); break;
    }
  }
  function puanTabloCiz() {
    if (!oyun) return;
    const sirali = oyun.oyuncular.slice().sort((a, b) => oyun.puan[b.no] - oyun.puan[a.no]);
    $('puanTablo').innerHTML = sirali.map(p => {
      const v = oyun.k.get(p.no), simge = v?.takim === 'avci' ? '👨‍🍳' : v?.takim === 'izle' ? '👁️' : '🧹';
      return `<li class="${v?.takim === 'izle' ? 'olu' : ''}" style="--r:${renkCss(p.no)}"><span><i>●</i> ${simge} ${kacis(p.ad)}${p.no === benimNo() ? ' ⭐' : ''}</span><b>${oyun.puan[p.no]}</b></li>`;
    }).join('');
  }

  // ---------- Girdi ----------
  const tuslar = new Set();
  const joy = { aktif: false, id: null, x: 0, y: 0 }, bakis = { id: null, x: 0, y: 0 };
  const basili = { ana: false, iki: false, yukari: false, asagi: false };
  let solBasili = false;
  addEventListener('keydown', e => {
    if (/^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName || '')) return;
    if (e.code === 'Space') e.preventDefault();
    tuslar.add(e.code);
    if (e.repeat) return;
    if (!oyun) return;
    if (e.code === 'KeyK') mikDegistir();
    if (e.code === 'KeyE') eylem('iki');
    if (e.code === 'KeyF') eylem('cadi');
    if (e.code === 'KeyQ') eylem('kilit');
    if (e.code === 'KeyR') eylem('kopya');
    if (e.code === 'KeyT') eylem('alay');
    if (e.code === 'KeyG') eylem('menu');
    if ((e.code === 'AltLeft' || e.code === 'AltRight') && document.pointerLockElement) { e.preventDefault(); document.exitPointerLock(); }
  });
  addEventListener('keyup', e => tuslar.delete(e.code));
  function girdiSifirla() { tuslar.clear(); solBasili = false; fare.basili = false; Object.keys(basili).forEach(k => { basili[k] = false; }); joy.aktif = false; joy.x = joy.y = 0; bakis.id = null; document.querySelectorAll('#dugmeler button').forEach(b => b.classList.remove('basili')); $('joyTopuz').style.transform = ''; }
  addEventListener('blur', girdiSifirla);
  document.addEventListener('visibilitychange', () => { if (document.hidden) girdiSifirla(); });
  const oyunda = () => !!(oyun && oyun.H && !oyun.bitti && !$('hud').classList.contains('gizli'));
  const fare = { basili: false, oynadi: false, x: 0, y: 0 };
  kanvas.addEventListener('mousedown', e => {
    if (!oyunda() || dokun) return;
    Ses.baslat();
    if (document.pointerLockElement !== kanvas) {
      try { const p = kanvas.requestPointerLock?.(); if (p?.catch) p.catch(() => {}); } catch (er) { /* kilitlenemiyor */ }
      Object.assign(fare, { basili: true, oynadi: false, x: e.clientX, y: e.clientY, sag: e.button === 2 });
      return;
    }
    if (e.button === 0) { solBasili = true; eylem('ana'); }
    if (e.button === 2) eylem('iki');
  });
  addEventListener('mouseup', e => {
    if (e.button === 0) solBasili = false;
    if (fare.basili && !fare.oynadi && oyunda() && document.pointerLockElement !== kanvas && fare.denendi) eylem(fare.sag ? 'iki' : 'ana');
    if (fare.basili) fare.denendi = true;
    fare.basili = false;
  });
  document.addEventListener('mousemove', e => {
    if (!oyunda()) return;
    if (document.pointerLockElement === kanvas) { bak(e.movementX * 0.0024, e.movementY * 0.0024); return; }
    if (fare.basili) {
      const dx = e.clientX - fare.x, dy = e.clientY - fare.y;
      if (Math.hypot(dx, dy) > 4) fare.oynadi = true;
      if (fare.oynadi) { bak(dx * 0.005, dy * 0.004); fare.x = e.clientX; fare.y = e.clientY; }
    }
  });
  function bak(dx, dy) { oyun.yaw -= dx; oyun.pitch = Math.max(-1.35, Math.min(1.1, oyun.pitch - dy)); }
  kanvas.addEventListener('contextmenu', e => e.preventDefault());
  document.addEventListener('pointerlockchange', ipucuCiz);
  // Dokunmatik: sol çubuk + sağda kaydırarak bakış + düğmeler
  const joyEl = $('joystick'), topuz = $('joyTopuz');
  joyEl.addEventListener('touchstart', e => { e.preventDefault(); Ses.baslat(); const t = e.changedTouches[0]; joy.aktif = true; joy.id = t.identifier; joyHareket(t); }, { passive: false });
  joyEl.addEventListener('touchmove', e => { e.preventDefault(); [...e.changedTouches].forEach(t => { if (t.identifier === joy.id) joyHareket(t); }); }, { passive: false });
  const joyBirak = e => { [...e.changedTouches].forEach(t => { if (t.identifier === joy.id) { joy.aktif = false; joy.x = joy.y = 0; topuz.style.transform = ''; } }); };
  joyEl.addEventListener('touchend', joyBirak); joyEl.addEventListener('touchcancel', joyBirak);
  function joyHareket(t) {
    const r = joyEl.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    let dx = (t.clientX - cx) / (r.width / 2), dy = (t.clientY - cy) / (r.height / 2);
    const L = Math.hypot(dx, dy); if (L > 1) { dx /= L; dy /= L; }
    joy.x = dx; joy.y = dy; topuz.style.transform = `translate(${dx * 38}px, ${dy * 38}px)`;
  }
  kanvas.addEventListener('touchstart', e => { if (!oyunda()) return; Ses.baslat(); const t = e.changedTouches[0]; if (bakis.id === null) Object.assign(bakis, { id: t.identifier, x: t.clientX, y: t.clientY }); }, { passive: true });
  kanvas.addEventListener('touchmove', e => { if (!oyunda()) return; [...e.changedTouches].forEach(t => { if (t.identifier !== bakis.id) return; bak((t.clientX - bakis.x) * 0.006, (t.clientY - bakis.y) * 0.004); bakis.x = t.clientX; bakis.y = t.clientY; }); }, { passive: true });
  const bakisBitti = e => { [...e.changedTouches].forEach(t => { if (t.identifier === bakis.id) bakis.id = null; }); };
  kanvas.addEventListener('touchend', bakisBitti); kanvas.addEventListener('touchcancel', bakisBitti);
  document.querySelectorAll('#dugmeler button').forEach(b => {
    const d = b.dataset.d;
    b.addEventListener('touchstart', e => { e.preventDefault(); Ses.baslat(); b.classList.add('basili'); if (d in basili) basili[d] = true; if (d === 'ana') solBasili = true; if (d !== 'yukari' && d !== 'asagi') eylem(d); }, { passive: false });
    const bir = e => { e.preventDefault(); b.classList.remove('basili'); if (d in basili) basili[d] = false; if (d === 'ana') solBasili = false; };
    b.addEventListener('touchend', bir, { passive: false }); b.addEventListener('touchcancel', bir, { passive: false });
  });
  const yukariBasili = () => tuslar.has('Space') || basili.yukari;
  const asagiBasili = () => tuslar.has('ShiftLeft') || tuslar.has('ShiftRight') || tuslar.has('KeyC') || basili.asagi;   // Ctrl kullanılmaz (Ctrl+W sekmeyi kapatır)

  // ---------- Eylemler ----------
  const hedef = { sekil: null, yer: null };   // her karede güncellenir
  function eylem(ad) {
    const v = benimV(); if (!oyun || !v || !ben || oyun.faz === 'turSonu') return;
    const t = v.takim;
    if (t === 'avci') {
      if (ad === 'ana') at();
      if (ad === 'iki') { if (kulubede()) { ben.dikiz = !ben.dikiz; if (ben.dikiz) { oyun.yaw = Math.PI; oyun.pitch = 0; } } else iksirAt(); }
      return;
    }
    if (t !== 'saklanan') return;
    const esya = v.tur >= 0;
    if (ad === 'iki') {
      if (hedef.sekil) sekilSec(hedef.sekil.t);
      else akis('🎯 Önce nişangâhla bir şeye bak, sonra E', 'kotu');
    }
    if (ad === 'menu') menuAc();
    if (ad === 'ana' && !esya) yerles();
    if (ad === 'cadi' && esya) { eve({ tip: 'cadi' }); v.tur = -1; ben.turKilit = 0.5; ben.kilit = false; }
    if (ad === 'kilit' && esya) { ben.kilit = !ben.kilit; akis(ben.kilit ? '🔒 Dönme kilitlendi: etrafa bakabilirsin' : '🔓 Kilit açıldı', ''); }
    if (ad === 'kopya') {
      if (!oyun.ayar.kopya) return;
      if (ben.secili < 0) return akis('👥 Önce E ile bir şekil seç', 'kotu');
      if (ben.kopyaCd > 0) return;
      const y = hedef.yer;
      if (!y || !y.uygun) return akis('👥 Baktığın yere sığmıyor', 'kotu');
      eve({ tip: 'kopya', t: ben.secili, x: y.x, h: y.y, z: y.z, y: +y.yon.toFixed(2) });
      ben.kopyaCd = Motor.KOPYA_BEKLE + 0.2;
    }
    if (ad === 'alay') {
      if (!oyun.ayar.ses || oyun.faz !== 'ara' || ben.alayCd > 0) return;
      eve({ tip: 'alay' }); ben.alayCd = Motor.ALAY_BEKLE + 0.2;
    }
  }
  function sekilSec(t) {
    ben.secili = t; Ses.kopya();
    akis(`🎯 Seçilen şekil: ${T_[t].emo} ${T_[t].ad}${T_[t].duvar ? ' (duvara asılır)' : ''}`, 'iyi');
  }
  // Bütün şekillerin listesi
  function menuAc() {
    const m = $('sekilMenu');
    if (!m.classList.contains('gizli')) { m.classList.add('gizli'); return; }
    m.querySelector('.izgara').innerHTML = T_.map((T, i) => `<div class="sekil${ben && ben.secili === i ? ' secili' : ''}"><b>${T.emo}</b><small>${kacis(T.ad)}</small></div>`).join('');
    m.classList.remove('gizli');
    if (document.pointerLockElement) document.exitPointerLock();
  }
  $('sekilMenu').addEventListener('click', e => {
    // liste sadece bakmak için: şekil almak için haritada o şeye bakıp E'ye basılır
    if (!e.target.closest('.izgara') || e.target.id === 'menuKapat') $('sekilMenu').classList.add('gizli');
  });
  function yerles() {
    if (ben.secili < 0) { akis(dokun ? '🎯 Önce bir şeye bakıp 🎯 düğmesine bas' : '🎯 Önce bir şeye bakıp E tuşuna bas', 'kotu'); return; }
    const y = hedef.yer;
    if (!y || !y.uygun) { akis('❌ Oraya sığmıyor ya da çok uzak', 'kotu'); return; }
    const v = benimV();
    eve({ tip: 'yerles', t: ben.secili, x: y.x, h: y.y, z: y.z, y: +y.yon.toFixed(2) });
    Object.assign(ben, { x: y.x, y: y.y, z: y.z, yon: y.yon, turKilit: 0.5, kilit: !!T_[ben.secili].duvar });
    v.tur = ben.secili; v.x = y.x; v.y = y.y; v.z = y.z;
  }
  function at() {
    const v = benimV();
    if (oyun.faz !== 'ara' || ben.cd > 0) return;
    if (v.can - ben.harcanan < Motor.ATIS_ENERJI) { if (!ben.bosUyari) { ben.bosUyari = true; Ses.bos(); } return; }
    ben.cd = 0.25; ben.harcanan += Motor.ATIS_ENERJI; ben.bosUyari = false;
    const { o, d } = bakisIsini();
    eve({ tip: 'at', o: o.map(n => +n.toFixed(2)), d: d.map(n => +n.toFixed(3)) });
    v.ates = true;
  }
  function iksirAt() {
    if (!oyun.ayar.iksir || oyun.faz !== 'ara' || ben.iksirCd > 0) return;
    const { o, d } = bakisIsini();
    const r = H_.isin(oyun.H, o, d, Motor.IKSIR_MENZIL);
    let [x, y, z] = r.nokta;
    x -= d[0] * 0.1; z -= d[2] * 0.1;
    y = H_.zeminBul(oyun.H, x, z, y + 0.1);
    eve({ tip: 'iksir', x: +x.toFixed(2), h: +y.toFixed(2), z: +z.toFixed(2) });
    ben.iksirCd = Motor.IKSIR_BEKLE + 0.2;
  }

  // ---------- Kamera ve nişan ----------
  const kam = { poz: new THREE.Vector3(), d: [0, 0, 1] };
  function bakisIsini() { return { o: [kam.poz.x, kam.poz.y, kam.poz.z], d: kam.d.slice() }; }
  function kameraGuncelle() {
    const v = benimV(); if (!v) return;
    const cp = Math.cos(oyun.pitch), d = [Math.sin(oyun.yaw) * cp, Math.sin(oyun.pitch), Math.cos(oyun.yaw) * cp];
    kam.d = d;
    if (!ben) { kam.poz.set(v.x, v.y + 3, v.z + 5); }
    else if (v.takim === 'izle') {
      if (!ben.kam) ben.kam = { x: kam.poz.x || v.x, y: kam.poz.y || 3, z: kam.poz.z || v.z };
      kam.poz.set(ben.kam.x, ben.kam.y, ben.kam.z);
    } else {
      let hY, uzak, omuz = 0;
      if (kulubede()) {
        if (ben.dikiz) {
          // anahtar deliğinden: sadece dışarıya, dar açıyla
          const dl = H_.KULUBE.delik;
          oyun.yaw = Math.PI + Math.max(-0.45, Math.min(0.45, Math.atan2(Math.sin(oyun.yaw - Math.PI), Math.cos(oyun.yaw - Math.PI))));
          oyun.pitch = Math.max(-0.35, Math.min(0.3, oyun.pitch));
          const cp2 = Math.cos(oyun.pitch); kam.d = [Math.sin(oyun.yaw) * cp2, Math.sin(oyun.pitch), Math.cos(oyun.yaw) * cp2];
          kam.poz.set(dl.x, dl.y, dl.z - 0.08);
          Sahne.fov(42);
        } else { kam.poz.set(ben.x, ben.y + 1.72, ben.z); Sahne.fov(70); }
        const bk = kam.poz.clone().add(new THREE.Vector3(kam.d[0], kam.d[1], kam.d[2]).multiplyScalar(10));
        Sahne.elle(kam.poz, bk); Ses.dinleyiciAyarla(kam.poz.x, kam.poz.z, oyun.yaw);
        return;
      }
      Sahne.fov(66);
      if (v.takim === 'avci') { hY = 1.8; uzak = 3.4; omuz = 0.85; }
      else if (v.tur < 0) { hY = 1.45; uzak = 3.3; omuz = 0.75; }
      else { const T = T_[v.tur]; hY = Math.max(0.3, T.h + 0.25); uzak = 1.6 + Math.min(2.5, T.h * 1.6 + T.r * 1.6); }
      const sagX = -Math.cos(oyun.yaw), sagZ = Math.sin(oyun.yaw);
      const hx = ben.x + sagX * omuz, hy = ben.y + hY, hz = ben.z + sagZ * omuz;
      const geri = [-d[0], -d[1], -d[2]];
      const r = H_.isin(null, [hx, hy, hz], geri, uzak + 0.3);
      const t = Math.max(0.25, Math.min(uzak, r.t - 0.25));
      kam.poz.set(hx + geri[0] * t, hy + geri[1] * t, hz + geri[2] * t);
    }
    const bakN = kam.poz.clone().add(new THREE.Vector3(d[0], d[1], d[2]).multiplyScalar(10));
    Sahne.elle(kam.poz, bakN);
    Ses.dinleyiciAyarla(kam.poz.x, kam.poz.z, oyun.yaw);
  }
  // Av başlayınca eşya kılığındaki cadı sadece yürür
  function esyaYurur(v) { return !!(oyun && v && v.takim === 'saklanan' && v.tur >= 0 && oyun.faz === 'ara'); }
  function esyaAsili(v) { const T = T_[v.tur]; return !!(T && (T.duvar || T.k === 'avize')); }
  // Aşçı saklanma süresince kulübede, gözü açık bekler
  function kulubede() { const v = benimV(); return !!(oyun && v && ben && v.takim === 'avci' && oyun.faz === 'saklan'); }
  // Işının çarptığı yüzeyin dışa bakan yönü
  function yuzeyYonu(r, d) {
    const p = r.nokta;
    if (r.tip === 'mobilya' && r.ref && r.ref.x0 !== undefined) {
      const k = r.ref, f = [[Math.abs(p[0] - k.x0), [-1, 0, 0]], [Math.abs(p[0] - k.x1), [1, 0, 0]], [Math.abs(p[1] - k.y0), [0, -1, 0]], [Math.abs(p[1] - k.y1), [0, 1, 0]], [Math.abs(p[2] - k.z0), [0, 0, -1]], [Math.abs(p[2] - k.z1), [0, 0, 1]]];
      return f.sort((a, b) => a[0] - b[0])[0][1];
    }
    if (r.tip === 'duvar') { const i = [0, 1, 2].sort((a, b) => Math.abs(d[b]) - Math.abs(d[a]))[0]; const n = [0, 0, 0]; n[i] = -Math.sign(d[i]); return n; }
    if (r.ref && r.ref.x !== undefined && r.ref.z !== undefined) {
      const top = r.ref.y1 ?? ((r.ref.y || 0) + (r.ref.h || 0));
      if (Math.abs(p[1] - top) < 0.03) return [0, 1, 0];
      const L = Math.hypot(p[0] - r.ref.x, p[2] - r.ref.z) || 1; return [(p[0] - r.ref.x) / L, 0, (p[2] - r.ref.z) / L];
    }
    return [0, 1, 0];
  }
  // Saklanan için: bakılan şekil (seçmek) ve yerleşilecek yer (hayalet)
  function hedefleriBul() {
    hedef.sekil = null; hedef.yer = null;
    const v = benimV();
    if (!v || v.takim !== 'saklanan' || !ben || oyun.faz === 'turSonu') { Sahne.isaretKoy(null); Sahne.hayaletGoster(null); $('hedefYazi').textContent = ''; return; }
    const { o, d } = bakisIsini();
    const uzaklik = p => Math.hypot(p[0] - ben.x, p[1] - ben.y, p[2] - ben.z);
    // şekil: eşya, süs (tablo, fener, pencere…), kasa
    const rs = H_.isin(oyun.H, o, d, 18, [], 'secim');
    if (uzaklik(rs.nokta) <= Motor.YERLES_MESAFE + 3) {
      if (rs.tip === 'esya') hedef.sekil = { t: rs.ref.t, x: rs.ref.x, y: rs.ref.y, z: rs.ref.z, r: rs.ref.r };
      else if (rs.tip === 'sus') { const t = H_.TUR_NO[H_.SUS_TUR[rs.ref.tip]]; if (t !== undefined) hedef.sekil = { t, x: rs.ref.x, y: rs.ref.y, z: rs.ref.z, r: Math.min(1, rs.ref.r) }; }
      else if (rs.tip === 'mobilya') {
        const m = rs.ref.m, buyuk = { kasa: 'kasa', toprak: 'tarla', agac: 'agac', metal: 'depo', sandalye: 'sandalye' }[m] || (m === 'tas' && rs.ref.r ? 'kuyu' : null)
          || ((m === 'tugla' || m === 'cati') && rs.ref.y0 >= H_.CATI - 0.01 ? 'catiKulube' : null) || (m === 'tugla' && rs.ref.y1 > H_.CATI + 1 && rs.ref.y0 < H_.CATI ? 'baca' : null);
        if (buyuk) { const T = T_[H_.TUR_NO[buyuk]]; hedef.sekil = { t: H_.TUR_NO[buyuk], x: rs.ref.x ?? rs.nokta[0], y: rs.ref.y0 ?? 0, z: rs.ref.z ?? rs.nokta[2], r: Math.min(1.6, T.r) }; }
      }
    }
    Sahne.isaretKoy(hedef.sekil);
    let yazi = '';
    if (hedef.sekil) yazi = `${T_[hedef.sekil.t].emo} ${T_[hedef.sekil.t].ad} · ${dokun ? '🎯' : 'E'}: şeklini al`;
    if (v.tur < 0 && ben.secili >= 0) {
      const T = T_[ben.secili];
      const r = H_.isin(oyun.H, o, d, 18);
      const n = yuzeyYonu(r, d);
      let yer = null;
      if (T.duvar && Math.abs(n[1]) < 0.5 && r.tip !== 'bos') {
        // duvara as: yüzeye yapıştır, ön yüzü dışarı baksın
        const x = r.nokta[0] + n[0] * 0.03, z = r.nokta[2] + n[2] * 0.03, y = r.nokta[1] - T.h / 2;
        const uygun = uzaklik([x, y, z]) <= Motor.YERLES_MESAFE && !H_.carpar(x + n[0] * 0.1, z + n[2] * 0.1, 0.05, y + 0.05, Math.max(0.1, T.h - 0.1), oyun.H.esyalar);
        yer = { x: +x.toFixed(2), y: +y.toFixed(2), z: +z.toFixed(2), yon: Math.atan2(n[0], n[2]), uygun };
      } else {
        const p = [r.nokta[0] - d[0] * 0.06, r.nokta[1] - d[1] * 0.06, r.nokta[2] - d[2] * 0.06];
        const zem = H_.zeminBul(oyun.H, p[0], p[2], p[1] + 0.05);
        const s = uzaklik([p[0], zem, p[2]]) <= Motor.YERLES_MESAFE ? H_.sigar(oyun.H, ben.secili, p[0], zem, p[2]) : null;
        yer = s ? { ...s, yon: oyun.yaw + Math.PI, uygun: true } : { x: p[0], y: zem, z: p[2], yon: oyun.yaw + Math.PI, uygun: false };
      }
      hedef.yer = yer;
      Sahne.hayaletGoster(ben.secili, yer.x, yer.y, yer.z, yer.yon, yer.uygun);
      if (hedef.sekil && yer.uygun) yazi += ` · ${dokun ? '📍' : 'Sol tık'}: buraya saklan`;
      else if (!hedef.sekil) yazi = yer.uygun ? `${dokun ? '📍' : 'Sol tık'}: ${T.emo} olarak buraya ${T.duvar ? 'asıl' : 'saklan'}` : (T.duvar ? '❌ Bir duvara bak' : '❌ Buraya sığmaz / çok uzak');
    } else Sahne.hayaletGoster(null);
    $('hedefYazi').textContent = yazi;
  }

  // ---------- Kendi hareketim: herkes uçar ----------
  function benAdim(dt) {
    const v = benimV(); if (!v || !ben) return;
    ben.cd = Math.max(0, ben.cd - dt); ben.iksirCd = Math.max(0, ben.iksirCd - dt);
    ben.kopyaCd = Math.max(0, ben.kopyaCd - dt); ben.alayCd = Math.max(0, ben.alayCd - dt); ben.turKilit = Math.max(0, ben.turKilit - dt);
    ben.harcanan = Math.max(0, ben.harcanan - dt * 60);   // sunucudan gelen bar yetişene kadar tahmin
    let ileri = 0, yan = 0;
    if (tuslar.has('KeyW') || tuslar.has('ArrowUp')) ileri += 1;
    if (tuslar.has('KeyS') || tuslar.has('ArrowDown')) ileri -= 1;
    if (tuslar.has('KeyD') || tuslar.has('ArrowRight')) yan += 1;
    if (tuslar.has('KeyA') || tuslar.has('ArrowLeft')) yan -= 1;
    if (joy.aktif) { ileri = -joy.y; yan = joy.x; }
    let L = Math.hypot(ileri, yan); if (L > 1) { ileri /= L; yan /= L; L = 1; }
    const s0 = Math.sin(oyun.yaw), c0 = Math.cos(oyun.yaw);
    const mx = s0 * ileri - c0 * yan, mz = c0 * ileri + s0 * yan;
    const dikey = (yukariBasili() ? 1 : 0) - (asagiBasili() ? 1 : 0);
    const S = H_.SINIR;
    // İzleyen: serbest uçuş (duvarlardan geçer)
    if (v.takim === 'izle') {
      if (!ben.kam) ben.kam = { x: kam.poz.x, y: kam.poz.y, z: kam.poz.z };
      const h = 10, d = kam.d;
      ben.kam.x += (d[0] * ileri * h - c0 * yan * h) * dt;
      ben.kam.z += (d[2] * ileri * h + s0 * yan * h) * dt;
      ben.kam.y += (d[1] * ileri * h + dikey * 6) * dt;
      ben.kam.x = Math.max(S.x0 + 0.3, Math.min(S.x1 - 0.3, ben.kam.x));
      ben.kam.z = Math.max(S.z0 + 0.3, Math.min(S.z1 - 0.3, ben.kam.z));
      ben.kam.y = Math.max(S.y0 + 0.3, Math.min(S.y1 - 0.3, ben.kam.y));
      return;
    }
    ben.kam = null;
    const avci = v.takim === 'avci', cadi = !avci && v.tur < 0;
    const kor = avci && oyun.faz === 'saklan' && ben.dikiz;
    const g = H_.govde(v.tur, avci), rc = H_.carpR(v.tur, avci);
    const hiz = avci ? 6 : cadi ? 6.5 : 4.2, dHiz = avci ? 4.5 : cadi ? 5 : 3.8;
    // av sırasında eşya kılığındaki cadı uçamaz: yürür, havadaysa düşer. Asılı şekiller (tablo, avize…) yerinde kalır
    const yuruyen = esyaYurur(v), asili = yuruyen && esyaAsili(v);
    const durgun = kor || oyun.faz === 'turSonu' || asili;
    const ox = ben.x, oz = ben.z;
    let nx = ben.x, nz = ben.z, ny = ben.y;
    if (!durgun) {
      if (L > 0) { const ll = Math.hypot(mx, mz) || 1; nx += mx / ll * hiz * L * dt; nz += mz / ll * hiz * L * dt; }
      if (yuruyen) { ben.vy = (ben.vy || 0) - 14 * dt; ny += ben.vy * dt; }
      else { ben.vy = 0; ny += dikey * dHiz * dt; }
    } else ben.vy = 0;
    // hızlı giderken ince duvarlardan geçmesin: hareketi küçük adımlara böl
    const adimS = Math.max(1, Math.ceil(Math.hypot(nx - ben.x, nz - ben.z) / Math.min(0.08, Math.max(0.04, rc * 0.8))));
    let h = null, sx = ben.x, sz = ben.z;
    for (let i = 1; i <= adimS; i++) {
      h = H_.hareket(oyun.H, sx + (nx - ben.x) / adimS, sz + (nz - ben.z) / adimS, Math.max(ben.y, ny), rc, g.h);
      sx = h.x; sz = h.z;
    }
    ben.x = h.x; ben.z = h.z;
    if (ny < h.zemin) { if (yuruyen && ben.vy < -6) Sahne.partikul(ben.x, h.zemin + 0.05, ben.z, 0xc8a878, 8, 1.5, 0.4); ny = h.zemin; ben.vy = 0; }
    if (ny + g.h > h.tavan) ny = Math.max(h.zemin, h.tavan - g.h);
    // bir basamak yukarı çıktıysa
    if (h.zemin > ben.y && h.zemin - ben.y <= 0.31 && ny < h.zemin) ny = h.zemin;
    ben.y = ny;
    if (avci && oyun.faz === 'saklan') {
      const K_ = H_.KULUBE;
      ben.x = Math.max(K_.x0 + 0.4, Math.min(K_.x1 - 0.4, ben.x)); ben.z = Math.max(K_.z0 + 0.4, Math.min(K_.z1 - 0.4, ben.z)); ben.y = Math.min(0.85, ben.y);
    }
    ben.yerde = ben.y - h.zemin < 0.05;
    // yön
    if (avci || cadi) { let f = oyun.yaw - ben.yon; f = Math.atan2(Math.sin(f), Math.cos(f)); ben.yon += f * Math.min(1, dt * 12); }
    else if (!ben.kilit) { let f = oyun.yaw + Math.PI - ben.yon; f = Math.atan2(Math.sin(f), Math.cos(f)); ben.yon += f * Math.min(1, dt * 10); }
    if (avci && solBasili && oyun.faz === 'ara') at();
    v.hiz = Math.hypot(ben.x - ox, ben.z - oz) / Math.max(dt, 0.001);
    v.havada = !ben.yerde;
    v.x = ben.x; v.y = ben.y; v.z = ben.z; v.yon = ben.yon;
    ben.sonYolla += dt;
    if (ben.sonYolla >= 0.05) { ben.sonYolla = 0; eve({ tip: 'k', x: +ben.x.toFixed(2), z: +ben.z.toFixed(2), h: +ben.y.toFixed(2), y: +ben.yon.toFixed(2), l: ben.kilit ? 1 : 0 }); }
  }

  // ---------- HUD ----------
  let buyukZaman = null;
  function buyukYazi(ust, alt, sure_) {
    const b = $('buyukYazi'); b.innerHTML = `${kacis(ust)}${alt ? `<small>${kacis(alt)}</small>` : ''}`;
    b.classList.add('goster'); clearTimeout(buyukZaman); buyukZaman = setTimeout(() => b.classList.remove('goster'), sure_ || 1500);
  }
  function akis(html, sinif = '') {
    const d = document.createElement('div'); d.className = sinif; d.innerHTML = html;
    $('akis').prepend(d);
    while ($('akis').children.length > 5) $('akis').lastChild.remove();
    setTimeout(() => d.remove(), 6000);
  }
  function ipucuCiz() {
    const v = benimV();
    const kilitli = document.pointerLockElement === kanvas;
    let y = '';
    if (!kilitli && !dokun) y = '🖱️ Ekrana tıkla: fareyle etrafa bak (olmazsa basılı tutup sürükle)';
    else if (!v) y = '';
    else if (v.takim === 'avci') y = 'WASD uç · Boşluk yüksel · Shift alçal · Sol tık (basılı tut): domates fırlat' + (oyun?.ayar.iksir ? ' · Sağ tık / E: gözcü iksiri' : '') + ' · Alt: fareyi bırak';
    else if (v.takim === 'izle') y = 'Serbest uçuş: WASD · Boşluk yüksel · Shift alçal';
    else if (v.tur < 0) y = 'WASD uç · Boşluk / Shift: yüksel / alçal · E: baktığın şeyin şeklini al · G: neye dönüşebilirsin · Sol tık: saklan' + (oyun?.ayar.kopya ? ' · R: sahte kopya' : '') + (oyun?.ayar.ses ? ' · T: ıslık' : '');
    else if (esyaYurur(v)) y = (esyaAsili(v) ? 'Asılısın, kıpırdama! · F: cadı ol, uç' : 'Kıpırdama! · Av başladı: eşyayken sadece yürürsün (WASD) · F: cadı ol, uç') + ' · Q: dönmeyi kilitle'
    else y = 'Kıpırdama! · WASD / Boşluk / Shift: uç · Q: dönmeyi kilitle · F: cadı ol' + (oyun?.ayar.kopya ? ' · R: kopya' : '') + (oyun?.ayar.ses ? ' · T: ıslık' : '');
    $('ipucu').textContent = y;
    $('ipucu').classList.toggle('serbest', !kilitli && !dokun);
  }
  let sonIpucu = '';
  function hudCiz() {
    const v = benimV(); if (!v) return;
    const t = v.takim, a = oyun.ayar;
    const rol = $('rolKutu');
    rol.className = t;
    rol.textContent = t === 'avci' ? '👨‍🍳 AŞÇISIN (AVCI)' : t === 'izle' ? '👁️ İZLİYORSUN' : v.tur < 0 ? '🧹 CADISIN' : `🎭 ${T_[v.tur].emo} ${T_[v.tur].ad}`;
    const ck = $('canKutu');
    ck.classList.toggle('gizli', t !== 'saklanan');
    const eb = $('enerjiBar');
    eb.classList.toggle('gizli', t !== 'avci');
    if (t === 'avci' && ben) {
      const e = Math.max(0, v.can - ben.harcanan), o = e / Motor.ENERJI_MAX;
      $('enerjiDolu').style.width = o * 100 + '%';
      eb.classList.toggle('az', e < Motor.ATIS_ENERJI);
      $('enerjiYazi').textContent = e < Motor.ATIS_ENERJI ? '🍅 Doluyor…' : `🍅 ${Math.floor(e / Motor.ATIS_ENERJI)} domates`;
    }
    if (t === 'saklanan') { const o = Math.max(0, v.can / a.can); $('canDolu').style.width = o * 100 + '%'; ck.classList.toggle('az', v.can <= 1 && a.can > 1); $('canYazi').textContent = '❤️'.repeat(Math.max(0, v.can)) + '🖤'.repeat(Math.max(0, a.can - v.can)); }
    const sk = $('seciliKutu');
    sk.classList.toggle('gizli', t !== 'saklanan');
    if (t === 'saklanan' && ben) sk.innerHTML = ben.secili >= 0 ? `Seçili şekil: <b>${T_[ben.secili].emo} ${T_[ben.secili].ad}</b>` : `Şekil yok: bir şeye bak, <b>${dokun ? '🎯' : 'E'}</b>`;
    const yt = [];
    const cdYaz = (emo, ad, cd) => `<span class="${cd > 0 ? 'bekle' : ''}">${emo} ${cd > 0 && cd < 90 ? Math.ceil(cd) : ad}</span>`;
    if (t === 'avci' && ben && a.iksir) yt.push(cdYaz('🔮', 'İksir hazır', ben.iksirCd));
    if (t === 'saklanan' && ben) {
      if (a.kopya) yt.push(cdYaz('👥', 'Kopya', ben.kopyaCd));
      if (a.ses) yt.push(cdYaz('🎵', 'Islık', oyun.faz === 'ara' ? ben.alayCd : 99));
      if (v.tur >= 0 && ben.kilit) yt.push('<span>🔒 Kilitli</span>');
    }
    $('yetenekler').innerHTML = yt.join('');
    const fz = $('fazYazi');
    fz.textContent = oyun.faz === 'saklan' ? `🙈 Saklanma ${sure(oyun.s)}` : oyun.faz === 'ara' ? `🔎 Av ${sure(oyun.s)}` : '⏸️ Tur bitti';
    fz.classList.toggle('uyari', oyun.faz === 'ara' && oyun.s < 30);
    let nS = 0, nA = 0; oyun.k.forEach(x => { if (x.takim === 'saklanan') nS++; else if (x.takim === 'avci') nA++; });
    const yer = t === 'izle' && ben?.kam ? H_.bolge(ben.kam.x, ben.kam.y, ben.kam.z) : H_.bolge(v.x, v.y + 0.1, v.z);
    $('sayiYazi').textContent = `🧹 ${nS} cadı · 👨‍🍳 ${nA} aşçı · Tur ${oyun.tur}/${oyun.turSayisi} · ${yer}`;
    const sayaclar = [];
    if (oyun.faz === 'ara' && oyun.dn > 0) sayaclar.push(`<span class="${oyun.dn <= 10 ? 'yakin' : ''}">🎲 Rastgele dönüşüm ${sure(oyun.dn)}</span>`);
    if (oyun.faz === 'ara' && oyun.sn > 0) sayaclar.push(`<span class="${oyun.sn <= 5 ? 'yakin' : ''}">🎵 Islık ${sure(oyun.sn)}</span>`);
    $('sayaclar').innerHTML = sayaclar.join('');
    const kor = t === 'avci' && oyun.faz === 'saklan';
    $('kor').classList.toggle('gizli', !kor);
    if (kor) $('korSayi').textContent = Math.max(0, Math.ceil(oyun.s));
    $('dikiz').classList.toggle('gizli', !(kor && ben?.dikiz));
    $('nisan').classList.toggle('gizli', t === 'izle');
    $('nisan').classList.toggle('avci', t === 'avci');
    $('izleYazi').classList.toggle('gizli', t !== 'izle');
    if (t === 'izle') $('izleYazi').innerHTML = `👁️ Yakalandın, her yerde serbestçe uçuyorsun<small>${dokun ? 'Çubukla uç · ⬆️⬇️ yüksel / alçal' : 'WASD uç · Boşluk yüksel · Shift alçal'}</small>`;
    // telefon düğmeleri
    if (dokun) {
      const esya = t === 'saklanan' && v.tur >= 0, cadi = t === 'saklanan' && v.tur < 0;
      const goster = { btnAna: t === 'avci' || cadi, btnIki: (t === 'avci' && (a.iksir || oyun.faz === 'saklan')) || cadi, btnYukari: !esyaYurur(v), btnAsagi: !esyaYurur(v), btnCadi: esya, btnKopya: t === 'saklanan' && a.kopya, btnAlay: t === 'saklanan' && a.ses, btnKilit: esya, btnMenu: t === 'saklanan' };
      Object.entries(goster).forEach(([id, g]) => $(id).classList.toggle('gizli', !g));
      $('btnAna').textContent = t === 'avci' ? '🍅' : '📍'; $('btnIki').textContent = t === 'avci' ? (oyun.faz === 'saklan' ? '🔑' : '🔮') : '🎯';
      $('btnIki').classList.toggle('bekle', t === 'avci' && ben?.iksirCd > 0);
      $('btnKopya').classList.toggle('bekle', !!ben && ben.kopyaCd > 0);
      $('btnAlay').classList.toggle('bekle', !!ben && (ben.alayCd > 0 || oyun.faz !== 'ara'));
      $('btnKilit').textContent = ben?.kilit ? '🔒' : '🔓';
    }
    const ip = `${t}|${v.tur}|${oyun.faz}|${document.pointerLockElement === kanvas}`;
    if (ip !== sonIpucu) { sonIpucu = ip; ipucuCiz(); }
  }

  // ---------- Tur sonu / oyun sonu ----------
  function turSonu(m) {
    const once = oyun.turBasiPuan || oyun.puan.slice();
    oyun.puan = m.puanlar.slice();
    const bn = benimNo(), v = benimV();
    if (document.pointerLockElement) document.exitPointerLock();
    const avciKazandi = m.kazanan === 'avci';
    const benKazandim = v && (avciKazandi ? v.takim === 'avci' : m.hayatta.includes(bn));
    buyukYazi(avciKazandi ? 'AŞÇILAR KAZANDI! 👨‍🍳' : 'CADILAR KAZANDI! 🧹', avciKazandi ? 'Bütün cadılar yakalandı' : `${m.hayatta.length} cadı saklanmayı başardı`, 2000);
    (benKazandim ? Ses.kazandi : Ses.kaybetti)();
    Sahne.hayaletGoster(null); Sahne.isaretKoy(null);
    setTimeout(() => {
      if (!oyun || oyun.faz !== 'turSonu') return;
      $('turSonuBaslik').textContent = avciKazandi ? 'AŞÇILAR KAZANDI!' : 'CADILAR KAZANDI!';
      const sirali = oyun.oyuncular.slice().sort((a, b) => m.puanlar[b.no] - m.puanlar[a.no]);
      $('turTablo').innerHTML = '<tr><th>Oyuncu</th><th>Bu tur</th><th>Puan</th></tr>' + sirali.map(p => {
        const arti = m.puanlar[p.no] - (once[p.no] || 0), x = oyun.k.get(p.no);
        const simge = m.hayatta.includes(p.no) ? '🧹✅' : x?.takim === 'avci' ? '👨‍🍳' : x?.takim === 'izle' ? '🧹❌' : '';
        return `<tr class="${p.no === bn ? 'ben' : ''}"><td class="ad" style="--r:${renkCss(p.no)}">${simge} ${kacis(p.ad)}</td><td class="arti">${arti ? '+' + arti : ''}</td><td><b>${m.puanlar[p.no]}</b></td></tr>`;
      }).join('');
      ekranGoster('turSonu');
      let kalan = Math.round(m.sure - 1.5);
      const yaz = () => { $('turSonuAlt').textContent = m.son ? 'Oyun bitiyor…' : `Tur ${m.tur}/${m.turSayisi} · Sonraki tur ${Math.max(0, kalan)} sn sonra (aşçılar değişecek)`; };
      yaz(); clearInterval(oyun.turSayac); oyun.turSayac = setInterval(() => { kalan--; yaz(); }, 1000);
    }, 1500);
    puanTabloCiz();
    Ag.sesGuncelle();
  }
  function oyunBitti(m) {
    oyun.bitti = true; oyun.faz = 'bitti';
    clearInterval(oyun.turSayac);
    oyun.puan = m.puanlar.slice();
    const bn = benimNo(), kaz = m.sira[0].no;
    $('sonucBaslik').textContent = kaz === bn ? 'KAZANDIN! 🏆' : `${oyuncu(kaz).ad.toLocaleUpperCase('tr')} KAZANDI!`;
    $('sonucSira').innerHTML = m.sira.map(s => `<li style="color:${renkCss(s.no)}"><span style="color:#241430">${kacis(oyuncu(s.no).ad)}${s.no === bn ? ' ⭐' : ''} · <b>${s.puan}</b> puan</span></li>`).join('');
    $('tekrarBtn').classList.toggle('gizli', !yonetici());
    $('sonucBekle').classList.toggle('gizli', yonetici());
    ekranGoster('sonuc');
    if (document.pointerLockElement) document.exitPointerLock();
    (kaz === bn ? Ses.kazandi : Ses.kaybetti)();
    Ag.sesGuncelle();
  }

  // ---------- Ana döngü ----------
  let sonT = performance.now();
  function dongu() {
    requestAnimationFrame(dongu);
    const simdi = performance.now(), dt = Math.min(0.05, (simdi - sonT) / 1000); sonT = simdi;
    kare(dt);
  }
  function kare(dt) {
    if (oyun && oyun.H) {
      const bn = benimNo(), benV = benimV();
      if (!oyun.bitti) benAdim(dt);
      const benAvci = benV?.takim === 'avci';
      oyun.k.forEach((v, no) => {
        const benim = no === bn;
        if (!benim) {
          const k = Math.min(1, dt * 12), ox = v.x, oz = v.z;
          v.x += (v.hx - v.x) * k; v.y += (v.hy - v.y) * k; v.z += (v.hz - v.z) * k;
          let fy = v.hyon - v.yon; fy = Math.atan2(Math.sin(fy), Math.cos(fy)); v.yon += fy * k;
          v.hiz = Math.hypot(v.x - ox, v.z - oz) / Math.max(dt, 0.001);
          v.havada = v.y > 0.05 && v.takim !== 'avci';
        }
        const gorunur = (v.takim === 'avci' || v.takim === 'saklanan') && !(benim && kulubede());
        v.g.visible = gorunur;
        if (gorunur) {
          Sahne.gorunusDegis(v.g, oyuncu(no).renk, v.takim === 'avci' ? 'asci' : v.tur < 0 ? 'cadi' : String(v.tur));
          v.g.position.set(v.x, v.y, v.z); v.g.rotation.y = v.yon;
          Sahne.oyuncuOynat(v.g, { dt, hiz: v.hiz, ates: v.ates, havada: v.havada });
          if (v.takim === 'avci' && Math.random() < dt * (v.hiz > 0.5 ? 14 : 3)) Sahne.partikul(v.x + (Math.random() - 0.5) * 0.8, v.y + 0.08, v.z + (Math.random() - 0.5) * 0.8, Math.random() < 0.5 ? 0xffd36a : 0xc88aff, 1, 0.4, 0.6);
          v.ates = false;
        }
        // isim: aşçıları herkes görür; cadıları sadece cadılar ve izleyenler
        const etGor = gorunur && !benim && (v.takim === 'avci' || !benAvci);
        v.et.visible = etGor;
        if (etGor) {
          const g = H_.govde(v.tur, v.takim === 'avci');
          v.et.position.set(v.x, v.y + g.h + (v.takim === 'avci' ? 0.6 : 0.35), v.z);
          Sahne.etiketCiz(v.et, v.takim === 'saklanan' ? '❤️'.repeat(Math.max(0, v.can)) : '');
        }
      });
      kameraGuncelle();
      if (!oyun.bitti) { hedefleriBul(); hudCiz(); }
    }
    Sahne.ciz();
  }
  requestAnimationFrame(dongu);

  // testler için: tuslar + kare ile oyuncuyu elle yürütmek, eylem ile düğmelere basmak mümkün
  return { get oyun() { return oyun; }, get ben() { return ben; }, mesaj, SURUM, kare, tuslar, eylem, bak, hedef, get lobi() { return lobi; } };
})();
