// =============================================================
// SaklanKaç - oyuncunun tarafı: ekranlar, bekleme odası, uçma / yürüme, kamera,
// nişan alma, eşya seçme ve yerleşme, gözcü iksiri, HUD, telefon düğmeleri.
// Oyunun kuralları evde (motor.js). Kendi yerini oyuncu hesaplar ve eve yollar.
// =============================================================

const Oyun = (() => {
  const SURUM = 1;   // sw.js ONBELLEK numarasıyla aynı tut; oyuncular farklı sürümdeyse uyarı çıkar
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
  const ayarVarsayilan = () => ({ avci: 1, mod: 'elenme', can: 2, tur: 4, saklan: 45, ara: 240, ceza: true, kopya: true, ses: true, sesAralik: 45 });
  let lobi = { ayar: ayarVarsayilan() };
  try { const k = JSON.parse(localStorage.getItem('sk.ayar') || 'null'); if (k) lobi.ayar = { ...lobi.ayar, ...k }; } catch (e) { }
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
  const AYAR_SEC = [['ayMod', 'mod', String], ['ayAvci', 'avci', Number], ['ayCan', 'can', Number], ['ayTur', 'tur', Number], ['aySaklan', 'saklan', Number], ['ayAra', 'ara', Number], ['aySesAralik', 'sesAralik', Number]];
  const AYAR_KUTU = [['ayCeza', 'ceza'], ['ayKopya', 'kopya'], ['aySes', 'ses']];
  function lobiYay() { if (mod === 'ev') Ag.yayinla({ tip: 'lobi', ayar: lobi.ayar, surum: SURUM }); }
  function lobiCiz() {
    const L = Ag.oyuncular;
    $('lobiListe').innerHTML = L.map((p, i) => `<li style="--r:${hex(Sahne.RENKLER[i % 10])}"><span>${p.id === benimId ? '⭐ ' : ''}${kacis(p.ad)}${p.ses ? ' 🎤' : ''}</span><small>${Sahne.RENK_AD[i % 10]}</small></li>`).join('');
    AYAR_SEC.forEach(([el, k]) => { $(el).value = String(lobi.ayar[k]); $(el).disabled = !yonetici(); });
    AYAR_KUTU.forEach(([el, k]) => { $(el).checked = !!lobi.ayar[k]; $(el).disabled = !yonetici(); });
    $('aySesAralik').disabled = !yonetici() || !lobi.ayar.ses;
    const a = lobi.ayar, n = L.length, avci = Math.max(1, Math.min(a.avci, n - 1));
    $('ayarOzet').textContent = `${n} oyuncu · ${avci} aşçı, ${Math.max(0, n - avci)} cadı · ${a.tur} tur · ${a.mod === 'elenme' ? 'Elenme' : 'Avcıya dönüşme'}`;
    $('baslaBtn').classList.toggle('gizli', !yonetici());
    if (yonetici()) $('lobiDurum').textContent = n < 2 ? 'En az 2 kişi gerekli. Oda kodunu arkadaşlarına gönder.' : 'Hazır olunca oyunu başlat.';
    else if (!/Sürümün/.test($('lobiDurum').textContent)) $('lobiDurum').textContent = 'Oda sahibi oyunu başlatacak…';
  }
  function ayarDegisti() { if (!yonetici()) return; try { localStorage.setItem('sk.ayar', JSON.stringify(lobi.ayar)); } catch (e) { } lobiYay(); lobiCiz(); }
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
    oyun.kopyalar.forEach(k => Sahne.at(k)); oyun.kopyalar.clear();
    oyun.tur = m.tur; oyun.turSayisi = m.turSayisi; oyun.faz = 'saklan'; oyun.s = m.s;
    oyun.turBasiPuan = oyun.puan.slice();
    clearInterval(oyun.turSayac);
    m.p.forEach(d => durumUygula(d, true));
    const bn = benimNo(), v = benimV();
    girdiSifirla();
    ben = v ? { x: v.x, y: v.y, z: v.z, vy: 0, yon: v.yon, kilit: false, cd: 0, iksirCd: 0, kopyaCd: 0, alayCd: 0, secili: -1, sonYolla: 0, turKilit: 0, yerde: true, kam: null } : null;
    oyun.yaw = v ? v.yon : 0; oyun.pitch = -0.15;
    ekranGoster('hud'); mikCiz();
    $('akis').innerHTML = '';
    if (v?.takim === 'avci') buyukYazi('AŞÇISIN! 👨‍🍳', 'Gözlerin kapalı… Cadılar saklanıyor', 2600);
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
    oyun.faz = m.f; oyun.s = m.s;
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
        const v = benimV();
        buyukYazi('AV BAŞLADI! 🔎', v?.takim === 'avci' ? 'Cadıları bul ve vur!' : 'Kıpırdama… ya da kaç!', 2000);
        Ses.gong(); break;
      }
      case 'ates': {
        const [, no, x, y, z, tur] = o, v = oyun.k.get(no); if (!v) break;
        v.ates = true;
        const a = Sahne.kepceUcu(v.g) || new THREE.Vector3(v.x, v.y + 1.4, v.z), b = new THREE.Vector3(x, y, z);
        Sahne.isinCiz(a, b, tur === 1 ? 0xff4a6a : tur === 2 ? 0xc8c8d8 : 0x7affd8);
        Sahne.partikul(x, y, z, tur === 1 ? 0xff4a6a : 0x7affd8, tur === 1 ? 14 : 6, 2.5, 0.5);
        Ses.ates({ x: v.x, z: v.z });
        if (tur === 2 && ben_(no) && oyun.ayar.ceza) Sahne.yaziGoster(x, y + 0.4, z, '❌ Boş!', '#ff8a7a', 0.7, 1);
        break;
      }
      case 'hit': {
        const [, q, can, avci] = o, v = oyun.k.get(q); if (!v) break;
        Sahne.partikul(v.x, v.y + 0.4, v.z, 0xff4a6a, 16, 3);
        Ses.isabet({ x: v.x, z: v.z });
        if (ben_(q)) { Sahne.sars(0.15); $('hasarFlas').classList.remove('goster'); void $('hasarFlas').offsetWidth; $('hasarFlas').classList.add('goster'); if (can > 0) buyukYazi('VURULDUN!', `${can} canın kaldı. Kaç!`, 1500); }
        if (ben_(avci)) { Sahne.yaziGoster(v.x, v.y + 1, v.z, '🎯 İSABET!', '#ffe06a', 0.8, 1.2); }
        break;
      }
      case 'yakala': {
        const [, q, avci, donustu, x, z] = o, v = oyun.k.get(q);
        if (v) { Sahne.partikul(v.x, v.y + 0.5, v.z, 0xc88aff, 30, 4, 0.9); Ses.yakala({ x: v.x, z: v.z }); }
        akis(`🎯 <b style="color:${renkCss(avci)}">${kacis(oyuncu(avci).ad)}</b> → <b style="color:${renkCss(q)}">${kacis(oyuncu(q).ad)}</b> yakalandı!${donustu ? ' Artık aşçı.' : ''}`, ben_(avci) ? 'iyi' : ben_(q) ? 'kotu' : '');
        if (ben_(avci)) buyukYazi('YAKALADIN! +2', `${oyuncu(q).ad} yakalandı`, 1500);
        if (ben_(q)) {
          if (donustu) { Object.assign(ben, { x, y: 0, z, vy: 0, kilit: false }); if (v) { v.x = x; v.z = z; v.y = 0; } buyukYazi('YAKALANDIN!', 'Artık sen de aşçısın! Diğer cadıları bul.', 2500); }
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
      case 'ceza': if (ben_(o[1])) { akis(`⚠️ Yanlış vuruş! Canın ${o[2]}`, 'kotu'); Ses.yanlis(); } break;
      case 'sersem': if (ben_(o[1])) { buyukYazi('SERSEMLEDİN! 😵', `${Motor.SERSEM} saniye bir şey yapamazsın`, 2000); Ses.sersem(); } else akis(`😵 ${kacis(oyuncu(o[1]).ad)} sersemledi`); break;
      case 'ayildi': if (ben_(o[1])) akis('💪 Kendine geldin, canın doldu', 'iyi'); break;
      case 'don': {
        const [, no, t] = o, v = oyun.k.get(no); if (!v) break;
        Sahne.partikul(v.hx, v.hy + 0.3, v.hz, t < 0 ? 0x7affb0 : 0xc88aff, 14, 2.5, 0.6);
        (t < 0 ? Ses.cadi : Ses.don)({ x: v.hx, z: v.hz });
        if (ben_(no)) akis(t < 0 ? '🧹 Yeniden cadı oldun, uçabilirsin' : `🎭 ${T_[t].emo} ${T_[t].ad} oldun. Kıpırdama!`, 'iyi');
        break;
      }
      case 'alay': {
        const [, no, tur, puanli] = o, v = oyun.k.get(no); if (!v) break;
        Ses.alay(tur, { x: v.x, z: v.z });
        Sahne.yaziGoster(v.x, v.y + 0.9, v.z, '🎵', '#ffe06a', 0.9, 1.5);
        if (ben_(no)) akis(puanli ? '📢 Alay ettin! +1 puan' : '📢 Alay ettin (bu turun puanı doldu)', 'iyi');
        break;
      }
      case 'zorSes': (o[1] || []).forEach(no => { const v = oyun.k.get(no); if (!v) return; Ses.zorSes({ x: v.x, z: v.z }); Sahne.partikul(v.x, v.y + 0.4, v.z, 0xffe06a, 5, 1.5, 0.6); }); if (benimV()?.takim === 'avci') akis('🔔 Cadılar ses çıkardı! Kulak ver…'); break;
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
    if (e.code === 'Space') eylem('zipla');
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
    b.addEventListener('touchstart', e => { e.preventDefault(); Ses.baslat(); b.classList.add('basili'); if (d in basili) basili[d] = true; if (d === 'ana') solBasili = true; if (d === 'yukari') eylem('zipla'); else if (d !== 'asagi') eylem(d); }, { passive: false });
    const bir = e => { e.preventDefault(); b.classList.remove('basili'); if (d in basili) basili[d] = false; if (d === 'ana') solBasili = false; };
    b.addEventListener('touchend', bir, { passive: false }); b.addEventListener('touchcancel', bir, { passive: false });
  });
  const yukariBasili = () => tuslar.has('Space') || basili.yukari;
  const asagiBasili = () => tuslar.has('KeyC') || tuslar.has('ControlLeft') || basili.asagi;

  // ---------- Eylemler ----------
  const hedef = { esya: null, yer: null };   // her karede güncellenir
  function eylem(ad) {
    const v = benimV(); if (!oyun || !v || !ben || oyun.faz === 'turSonu') return;
    const t = v.takim;
    if (t === 'avci') {
      if (ad === 'ana') ates();
      if (ad === 'iki') iksirAt();
      if (ad === 'zipla' && ben.yerde && oyun.faz === 'ara' && !(v.bayrak & 8)) { ben.vy = 5.4; ben.yerde = false; Ses.zipla({ x: v.x, z: v.z }); }
      return;
    }
    if (t !== 'saklanan') return;
    const esya = v.tur >= 0;
    if (ad === 'iki') {
      if (hedef.esya) { ben.secili = hedef.esya.t; Ses.kopya(); akis(`🎯 Seçilen şekil: ${T_[ben.secili].emo} ${T_[ben.secili].ad}`, 'iyi'); }
      else akis('🎯 Önce nişangâhla bir eşyaya bak', 'kotu');
    }
    if (ad === 'ana' && !esya) yerles();
    if (ad === 'cadi' && esya) { eve({ tip: 'cadi' }); v.tur = -1; ben.turKilit = 0.5; ben.kilit = false; ben.vy = 0; }
    if (ad === 'kilit' && esya) { ben.kilit = !ben.kilit; akis(ben.kilit ? '🔒 Dönme kilitlendi: etrafa bakabilirsin' : '🔓 Kilit açıldı', ''); }
    if (ad === 'zipla' && esya && ben.yerde) { ben.vy = 4.2; ben.yerde = false; }
    if (ad === 'kopya') {
      if (!oyun.ayar.kopya) return;
      if (ben.secili < 0) return akis('👥 Önce E ile bir şekil seç', 'kotu');
      if (ben.kopyaCd > 0) return;
      const y = hedef.yer;
      if (!y || !y.uygun) return akis('👥 Baktığın yere sığmıyor', 'kotu');
      eve({ tip: 'kopya', t: ben.secili, x: y.x, h: y.y, z: y.z, y: +(oyun.yaw + Math.PI).toFixed(2) });
      ben.kopyaCd = Motor.KOPYA_BEKLE + 0.2;
    }
    if (ad === 'alay') {
      if (!oyun.ayar.ses || oyun.faz !== 'ara' || ben.alayCd > 0) return;
      eve({ tip: 'alay' }); ben.alayCd = Motor.ALAY_BEKLE + 0.2;
    }
  }
  function yerles() {
    if (ben.secili < 0) { akis(dokun ? '🎯 Önce bir eşyaya bakıp 🎯 düğmesine bas' : '🎯 Önce bir eşyaya bakıp E tuşuna bas', 'kotu'); return; }
    const y = hedef.yer;
    if (!y || !y.uygun) { akis('❌ Oraya sığmıyor ya da çok uzak', 'kotu'); return; }
    const v = benimV();
    const yon = +(oyun.yaw + Math.PI).toFixed(2);
    eve({ tip: 'yerles', t: ben.secili, x: y.x, h: y.y, z: y.z, y: yon });
    Object.assign(ben, { x: y.x, y: y.y, z: y.z, vy: 0, yon, turKilit: 0.5, kilit: false });
    v.tur = ben.secili; v.x = y.x; v.y = y.y; v.z = y.z;
  }
  function ates() {
    const v = benimV();
    if (oyun.faz !== 'ara' || (v.bayrak & 8) || ben.cd > 0) return;
    ben.cd = 0.5;
    const { o, d } = bakisIsini();
    eve({ tip: 'ates', o: o.map(n => +n.toFixed(2)), d: d.map(n => +n.toFixed(3)) });
    v.ates = true;
  }
  function iksirAt() {
    const v = benimV();
    if (oyun.faz !== 'ara' || (v.bayrak & 8) || ben.iksirCd > 0) return;
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
      if (!ben.kam) ben.kam = { x: kam.poz.x || v.x, y: Math.max(1.5, kam.poz.y || 3), z: kam.poz.z || v.z };
      kam.poz.set(ben.kam.x, ben.kam.y, ben.kam.z);
    } else {
      let hY, uzak, omuz = 0;
      if (v.takim === 'avci') { hY = 1.8; uzak = 3.4; omuz = 0.85; }
      else if (v.tur < 0) { hY = 1.45; uzak = 3.3; omuz = 0.75; }
      else { const T = T_[v.tur]; hY = Math.max(0.3, T.h + 0.25); uzak = 1.5 + T.h * 2 + T.r * 2; }
      const sagX = -Math.cos(oyun.yaw), sagZ = Math.sin(oyun.yaw);
      const hx = ben.x + sagX * omuz, hy = ben.y + hY, hz = ben.z + sagZ * omuz;
      const geri = [-d[0], -d[1], -d[2]];
      const r = H_.isin(null, [hx, hy, hz], geri, uzak + 0.3);
      const t = Math.max(0.25, Math.min(uzak, r.t - 0.25));
      kam.poz.set(hx + geri[0] * t, Math.max(0.15, hy + geri[1] * t), hz + geri[2] * t);
    }
    const bakN = kam.poz.clone().add(new THREE.Vector3(d[0], d[1], d[2]).multiplyScalar(10));
    Sahne.elle(kam.poz, bakN);
    Ses.dinleyiciAyarla(kam.poz.x, kam.poz.z, oyun.yaw);
  }
  // Saklanan için: bakılan eşya (şekil seçmek) ve yerleşilecek yer (hayalet)
  function hedefleriBul() {
    hedef.esya = null; hedef.yer = null;
    const v = benimV();
    if (!v || v.takim !== 'saklanan' || !ben || oyun.faz === 'turSonu') { Sahne.isaretKoy(null); Sahne.hayaletGoster(null); $('hedefYazi').textContent = ''; return; }
    const { o, d } = bakisIsini();
    const r = H_.isin(oyun.H, o, d, 16);
    const uzaklik = p => Math.hypot(p[0] - ben.x, p[1] - ben.y, p[2] - ben.z);
    if (r.tip === 'esya' && uzaklik([r.ref.x, r.ref.y, r.ref.z]) <= Motor.YERLES_MESAFE + 2) hedef.esya = r.ref;
    Sahne.isaretKoy(hedef.esya);
    let yazi = '';
    if (hedef.esya) yazi = `${T_[hedef.esya.t].emo} ${T_[hedef.esya.t].ad} · ${dokun ? '🎯' : 'E'}: şeklini al`;
    if (v.tur < 0 && ben.secili >= 0) {
      const p = [r.nokta[0] - d[0] * 0.06, r.nokta[1] - d[1] * 0.06, r.nokta[2] - d[2] * 0.06];
      const zem = H_.zeminBul(oyun.H, p[0], p[2], p[1] + 0.05);
      const s = uzaklik([p[0], zem, p[2]]) <= Motor.YERLES_MESAFE ? H_.sigar(oyun.H, ben.secili, p[0], zem, p[2]) : null;
      hedef.yer = s ? { ...s, uygun: true } : { x: p[0], y: zem, z: p[2], uygun: false };
      Sahne.hayaletGoster(ben.secili, hedef.yer.x, hedef.yer.y, hedef.yer.z, oyun.yaw + Math.PI, hedef.yer.uygun);
      if (hedef.esya && hedef.yer.uygun) yazi += ` · ${dokun ? '📍' : 'Sol tık'}: buraya saklan`;
      else if (!hedef.esya) yazi = hedef.yer.uygun ? `${dokun ? '📍' : 'Sol tık'}: ${T_[ben.secili].emo} olarak buraya saklan` : '❌ Buraya sığmaz / çok uzak';
    } else Sahne.hayaletGoster(null);
    $('hedefYazi').textContent = yazi;
  }

  // ---------- Kendi hareketim ----------
  function benAdim(dt) {
    const v = benimV(); if (!v || !ben) return;
    ben.cd = Math.max(0, ben.cd - dt); ben.iksirCd = Math.max(0, ben.iksirCd - dt);
    ben.kopyaCd = Math.max(0, ben.kopyaCd - dt); ben.alayCd = Math.max(0, ben.alayCd - dt); ben.turKilit = Math.max(0, ben.turKilit - dt);
    let ileri = 0, yan = 0;
    if (tuslar.has('KeyW') || tuslar.has('ArrowUp')) ileri += 1;
    if (tuslar.has('KeyS') || tuslar.has('ArrowDown')) ileri -= 1;
    if (tuslar.has('KeyD') || tuslar.has('ArrowRight')) yan += 1;
    if (tuslar.has('KeyA') || tuslar.has('ArrowLeft')) yan -= 1;
    if (joy.aktif) { ileri = -joy.y; yan = joy.x; }
    let L = Math.hypot(ileri, yan); if (L > 1) { ileri /= L; yan /= L; L = 1; }
    const s0 = Math.sin(oyun.yaw), c0 = Math.cos(oyun.yaw);
    const mx = s0 * ileri - c0 * yan, mz = c0 * ileri + s0 * yan;
    // İzleyen: serbest uçuş
    if (v.takim === 'izle') {
      if (!ben.kam) ben.kam = { x: kam.poz.x, y: Math.max(1, kam.poz.y), z: kam.poz.z };
      const h = 9, d = kam.d;
      ben.kam.x += (d[0] * ileri * h - c0 * yan * h) * dt;
      ben.kam.z += (d[2] * ileri * h + s0 * yan * h) * dt;
      ben.kam.y += (d[1] * ileri * h + (yukariBasili() ? 5 : 0) - (asagiBasili() ? 5 : 0)) * dt;
      ben.kam.x = Math.max(-H_.GEN + 0.3, Math.min(H_.GEN - 0.3, ben.kam.x));
      ben.kam.z = Math.max(-H_.DER + 0.3, Math.min(H_.DER - 0.3, ben.kam.z));
      ben.kam.y = Math.max(0.3, Math.min(H_.TAVAN - 0.3, ben.kam.y));
      return;
    }
    ben.kam = null;
    const avci = v.takim === 'avci', cadi = !avci && v.tur < 0;
    const kor = avci && (oyun.faz === 'saklan' || (v.bayrak & 8));
    const g = H_.govde(v.tur, avci);
    let hiz = avci ? 5.4 : cadi ? 6.5 : 3.4;
    if (kor || oyun.faz === 'turSonu') { ileri = yan = 0; L = 0; }
    const ox = ben.x, oz = ben.z;
    let nx = ben.x + mx * hiz * L * dt, nz = ben.z + mz * hiz * L * dt;
    if (L > 0) { const ll = Math.hypot(mx, mz) || 1; nx = ben.x + mx / ll * hiz * L * dt; nz = ben.z + mz / ll * hiz * L * dt; }
    let yeniY = ben.y;
    if (cadi) {
      const dikey = (yukariBasili() ? 1 : 0) - (asagiBasili() ? 1 : 0);
      yeniY = ben.y + dikey * 4.5 * dt;
      ben.vy = 0;
    } else {
      ben.vy -= 14 * dt;
      yeniY = ben.y + ben.vy * dt;
    }
    const h = H_.hareket(oyun.H, nx, nz, Math.max(ben.y, yeniY), g.r, g.h);
    ben.x = h.x; ben.z = h.z;
    if (yeniY <= h.zemin) { yeniY = h.zemin; ben.vy = 0; ben.yerde = true; } else ben.yerde = cadi ? yeniY - h.zemin < 0.05 : false;
    if (yeniY + g.h > h.tavan) { yeniY = Math.max(h.zemin, h.tavan - g.h); if (ben.vy > 0) ben.vy = 0; }
    // bir basamak yukarı çıktıysa
    if (h.zemin > ben.y && h.zemin - ben.y <= 0.31 && yeniY < h.zemin) yeniY = h.zemin;
    ben.y = yeniY;
    // tuşu basılı tutunca da zıpla (telefon)
    if (!cadi && yukariBasili() && ben.yerde && !kor && oyun.faz !== 'turSonu' && dokun) eylem('zipla');
    // yön
    if (avci || cadi) { let f = oyun.yaw - ben.yon; f = Math.atan2(Math.sin(f), Math.cos(f)); ben.yon += f * Math.min(1, dt * 12); }
    else if (!ben.kilit) { let f = oyun.yaw + Math.PI - ben.yon; f = Math.atan2(Math.sin(f), Math.cos(f)); ben.yon += f * Math.min(1, dt * 10); }
    // basılı tutulan ateş
    if (avci && solBasili && !kor) ates();
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
    else if (v.takim === 'avci') y = 'WASD yürü · Boşluk zıpla · Sol tık: kepçe ışını · Sağ tık / E: gözcü iksiri · Alt: fareyi bırak';
    else if (v.takim === 'izle') y = 'Serbest uçuş: WASD · Boşluk yüksel · C alçal';
    else if (v.tur < 0) y = 'WASD uç · Boşluk yüksel · C alçal · E: şekil seç · Sol tık: oraya saklan' + (oyun?.ayar.kopya ? ' · R: sahte kopya' : '') + (oyun?.ayar.ses ? ' · T: alay' : '');
    else y = 'Kıpırdama! · WASD yürü · Boşluk zıpla · Q: dönmeyi kilitle · F: cadı ol' + (oyun?.ayar.kopya ? ' · R: kopya' : '') + (oyun?.ayar.ses ? ' · T: alay' : '');
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
    ck.classList.toggle('gizli', t === 'izle');
    if (t === 'avci') { const o = Math.max(0, v.can / 100); $('canDolu').style.width = o * 100 + '%'; ck.classList.toggle('az', o < 0.35); $('canYazi').textContent = v.bayrak & 8 ? '😵 Sersem!' : `💪 ${v.can} / 100`; }
    else if (t === 'saklanan') { const o = Math.max(0, v.can / a.can); $('canDolu').style.width = o * 100 + '%'; ck.classList.toggle('az', v.can <= 1 && a.can > 1); $('canYazi').textContent = '❤️'.repeat(Math.max(0, v.can)) + '🖤'.repeat(Math.max(0, a.can - v.can)); }
    const sk = $('seciliKutu');
    sk.classList.toggle('gizli', t !== 'saklanan');
    if (t === 'saklanan' && ben) sk.innerHTML = ben.secili >= 0 ? `Seçili şekil: <b>${T_[ben.secili].emo} ${T_[ben.secili].ad}</b>` : `Şekil yok: bir eşyaya bak, <b>${dokun ? '🎯' : 'E'}</b>`;
    const yt = [];
    const cdYaz = (emo, ad, cd) => `<span class="${cd > 0 ? 'bekle' : ''}">${emo} ${cd > 0 && cd < 90 ? Math.ceil(cd) : ad}</span>`;
    if (t === 'avci' && ben) yt.push(cdYaz('🔮', 'İksir hazır', ben.iksirCd));
    if (t === 'saklanan' && ben) {
      if (a.kopya) yt.push(cdYaz('👥', 'Kopya', ben.kopyaCd));
      if (a.ses) yt.push(cdYaz('📢', 'Alay', oyun.faz === 'ara' ? ben.alayCd : 99));
      if (v.tur >= 0 && ben.kilit) yt.push('<span>🔒 Kilitli</span>');
    }
    $('yetenekler').innerHTML = yt.join('');
    const fz = $('fazYazi');
    fz.textContent = oyun.faz === 'saklan' ? `🙈 Saklanma ${sure(oyun.s)}` : oyun.faz === 'ara' ? `🔎 Av ${sure(oyun.s)}` : '⏸️ Tur bitti';
    fz.classList.toggle('uyari', oyun.faz === 'ara' && oyun.s < 30);
    let nS = 0, nA = 0; oyun.k.forEach(x => { if (x.takim === 'saklanan') nS++; else if (x.takim === 'avci') nA++; });
    $('sayiYazi').textContent = `🧹 ${nS} cadı · 👨‍🍳 ${nA} aşçı · Tur ${oyun.tur}/${oyun.turSayisi}`;
    const kor = t === 'avci' && oyun.faz === 'saklan';
    $('kor').classList.toggle('gizli', !kor);
    if (kor) $('korSayi').textContent = Math.max(0, Math.ceil(oyun.s));
    $('nisan').classList.toggle('gizli', t === 'izle');
    $('nisan').classList.toggle('avci', t === 'avci');
    $('izleYazi').classList.toggle('gizli', t !== 'izle');
    if (t === 'izle') $('izleYazi').innerHTML = `👁️ Yakalandın, mutfakta serbestçe uçuyorsun<small>${dokun ? 'Çubukla uç · ⬆️⬇️ yüksel / alçal' : 'WASD uç · Boşluk yüksel · C alçal'}</small>`;
    // telefon düğmeleri
    if (dokun) {
      const esya = t === 'saklanan' && v.tur >= 0, cadi = t === 'saklanan' && v.tur < 0;
      const goster = { btnAna: t === 'avci' || cadi, btnIki: t === 'avci' || cadi, btnYukari: t !== 'turSonu', btnAsagi: cadi || t === 'izle', btnCadi: esya, btnKopya: t === 'saklanan' && a.kopya, btnAlay: t === 'saklanan' && a.ses, btnKilit: esya };
      Object.entries(goster).forEach(([id, g]) => $(id).classList.toggle('gizli', !g));
      $('btnAna').textContent = t === 'avci' ? '✨' : '📍'; $('btnIki').textContent = t === 'avci' ? '🔮' : '🎯';
      $('btnYukari').textContent = cadi || t === 'izle' ? '⬆️' : '⤴️';
      $('btnIki').classList.toggle('bekle', t === 'avci' && ben?.iksirCd > 0);
      $('btnKopya').classList.toggle('bekle', !!ben && ben.kopyaCd > 0);
      $('btnAlay').classList.toggle('bekle', !!ben && (ben.alayCd > 0 || oyun.faz !== 'ara'));
      $('btnKilit').textContent = ben?.kilit ? '🔒' : '🔓';
    }
    const ip = `${t}|${v.tur < 0}|${document.pointerLockElement === kanvas}`;
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
        const gorunur = v.takim === 'avci' || v.takim === 'saklanan';
        v.g.visible = gorunur;
        if (gorunur) {
          Sahne.gorunusDegis(v.g, oyuncu(no).renk, v.takim === 'avci' ? 'asci' : v.tur < 0 ? 'cadi' : String(v.tur));
          v.g.position.set(v.x, v.y, v.z); v.g.rotation.y = v.yon;
          Sahne.oyuncuOynat(v.g, { dt, hiz: v.hiz, ates: v.ates, havada: v.havada });
          v.ates = false;
        }
        // isim: aşçıları herkes görür; cadıları sadece cadılar ve izleyenler
        const etGor = gorunur && !benim && (v.takim === 'avci' || !benAvci);
        v.et.visible = etGor;
        if (etGor) {
          const g = H_.govde(v.tur, v.takim === 'avci');
          v.et.position.set(v.x, v.y + g.h + (v.takim === 'avci' ? 0.6 : 0.35), v.z);
          Sahne.etiketCiz(v.et, v.takim === 'saklanan' ? '❤️'.repeat(Math.max(0, v.can)) : (v.bayrak & 8 ? '😵' : ''));
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
