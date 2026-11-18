// =============================================================
// SaklanKaç - oyun sesleri (hepsi kodla üretilir, dosya yok)
// Konumlu sesler: uzaktaki ses kısık, sağdaki ses sağ kulaktan gelir.
// =============================================================

const Ses = (() => {
  let ctx = null, ana = null, acik = true;
  const dinleyici = { x: 0, z: 0, yaw: 0 };
  try { acik = localStorage.getItem('sk.ses') !== '0'; } catch (e) { }
  function baslat() {
    if (!ctx) { try { ctx = new (window.AudioContext || window.webkitAudioContext)(); ana = ctx.createGain(); ana.gain.value = acik ? 0.5 : 0; ana.connect(ctx.destination); } catch (e) { return; } }
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  }
  function degistir() { acik = !acik; if (ana) ana.gain.value = acik ? 0.5 : 0; try { localStorage.setItem('sk.ses', acik ? '1' : '0'); } catch (e) { } return acik; }
  // Konuma göre ses yüksekliği ve sağ/sol
  function cikis(konum) {
    if (!konum || !ctx.createStereoPanner) return { hedef: ana, kazanc: 1 };
    const dx = konum.x - dinleyici.x, dz = konum.z - dinleyici.z, d = Math.hypot(dx, dz);
    const kazanc = Math.max(0.06, Math.min(1, 1.6 / (1 + d * 0.16)));
    const a = Math.atan2(dx, dz) - dinleyici.yaw;
    const p = ctx.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, -Math.sin(a) * Math.min(1, d / 3)));
    p.connect(ana);
    setTimeout(() => { try { p.disconnect(); } catch (e) { } }, 4000);
    return { hedef: p, kazanc };
  }
  function ton(f, sure, tip = 'sine', ses = 0.3, f2 = null, gecikme = 0, konum = null) {
    if (!ctx || !acik) return;
    const { hedef, kazanc } = cikis(konum);
    const t = ctx.currentTime + gecikme, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = tip; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + sure);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(ses * kazanc, t + 0.01); g.gain.exponentialRampToValueAtTime(0.001, t + sure);
    o.connect(g).connect(hedef); o.start(t); o.stop(t + sure + 0.02);
  }
  let gurultuB = null;
  function gurultu(sure, ses = 0.3, fGecis = 1200, tip = 'bandpass', gecikme = 0, q = 1, konum = null) {
    if (!ctx || !acik) return;
    const { hedef, kazanc } = cikis(konum);
    if (!gurultuB) { gurultuB = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate); const d = gurultuB.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
    const t = ctx.currentTime + gecikme, s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = gurultuB; f.type = tip; f.frequency.value = fGecis; f.Q.value = q;
    g.gain.setValueAtTime(ses * kazanc, t); g.gain.exponentialRampToValueAtTime(0.001, t + sure);
    s.connect(f).connect(g).connect(hedef); s.start(t, Math.random() * 0.5); s.stop(t + sure + 0.02);
  }
  // Cadıların alay ezgileri (her biri farklı)
  const ALAYLAR = [
    k => [523, 659, 784, 659, 523].forEach((f, i) => ton(f, 0.16, 'square', 0.12, null, i * 0.12, k)),              // tirili
    k => { ton(300, 0.5, 'sawtooth', 0.12, 900, 0, k); ton(900, 0.4, 'sawtooth', 0.1, 250, 0.5, k); },              // ıııyuuu
    k => [0, 0.18, 0.36].forEach(g => { ton(180, 0.12, 'square', 0.18, 120, g, k); gurultu(0.08, 0.15, 400, 'lowpass', g, 1, k); }), // vırak vırak
    k => { for (let i = 0; i < 6; i++) ton(880 + (i % 2) * 220, 0.08, 'triangle', 0.14, null, i * 0.09, k); ton(1320, 0.3, 'sine', 0.15, 660, 0.55, k); }, // kıkırdama
  ];
  // Cadı ıslıkları (her biri farklı ezgi)
  const ISLIKLAR = [
    k => { ton(900, 0.25, 'sine', 0.22, 1900, 0, k); ton(1100, 0.5, 'sine', 0.22, 600, 0.32, k); },                       // fiyuuu-fiyuuu
    k => [1320, 1175, 1047, 1175, 1320, 1320, 1320].forEach((f, i) => ton(f, 0.16, 'sine', 0.2, f * 1.02, i * 0.17, k)),  // ezgi
    k => { ton(700, 0.7, 'sine', 0.2, 2100, 0, k); },                                                                      // yükselen
    k => { for (let i = 0; i < 5; i++) ton(2000 + (i % 2) * 300, 0.09, 'sine', 0.18, 2700, i * 0.12, k); },              // kuş cıvıltısı
  ];
  return {
    islik(tur, k) { (ISLIKLAR[tur % ISLIKLAR.length])(k); },
    firlat(k) { gurultu(0.18, 0.18, 1800, 'bandpass', 0, 2, k); ton(500, 0.12, 'triangle', 0.08, 900, 0, k); },
    patla(k) { gurultu(0.22, 0.35, 700, 'lowpass', 0, 1, k); ton(220, 0.15, 'sine', 0.2, 80, 0, k); gurultu(0.12, 0.2, 2500, 'bandpass', 0.03, 3, k); },
    firla(k) { ton(600, 0.2, 'square', 0.08, 1200, 0, k); gurultu(0.12, 0.2, 3000, 'highpass', 0, 1, k); },
    dus(k) { gurultu(0.1, 0.25, 500, 'lowpass', 0, 1, k); ton(300, 0.08, 'triangle', 0.12, 200, 0, k); },
    susVur(tip, k) {
      if (tip === 'fener' || tip === 'direkFener' || tip === 'avize') { ton(1800, 0.3, 'triangle', 0.12, 1700, 0, k); ton(2400, 0.25, 'sine', 0.08, null, 0.03, k); gurultu(0.1, 0.15, 5000, 'highpass', 0, 1, k); }
      else if (tip === 'asiliTencere' || tip === 'kasik') { ton(520, 0.6, 'triangle', 0.15, 500, 0, k); ton(780, 0.5, 'sine', 0.1, null, 0, k); }
      else { gurultu(0.15, 0.25, 900, 'bandpass', 0, 2, k); ton(260, 0.15, 'sine', 0.12, 180, 0, k); }
    },
    zorDon() { [523, 784, 1046, 1568].forEach((f, i) => ton(f, 0.25, 'sine', 0.15, f * 1.5, i * 0.06)); gurultu(0.5, 0.15, 3000, 'bandpass', 0, 2); },
    bos() { ton(200, 0.12, 'square', 0.08, 150); },
    baslat, degistir, get acik() { return acik; },
    dinleyiciAyarla(x, z, yaw) { dinleyici.x = x; dinleyici.z = z; dinleyici.yaw = yaw; },
    ates(k) { ton(1400, 0.18, 'sawtooth', 0.09, 300, 0, k); gurultu(0.15, 0.12, 3000, 'highpass', 0, 1, k); },
    isabet(k) { ton(220, 0.25, 'square', 0.2, 80, 0, k); gurultu(0.2, 0.25, 800, 'lowpass', 0, 1, k); ton(1200, 0.12, 'sine', 0.15, 1800, 0.05, k); },
    yanlis(k) { ton(400, 0.12, 'sine', 0.2, 200, 0, k); ton(300, 0.18, 'sine', 0.15, 150, 0.1, k); },
    don(k) { gurultu(0.25, 0.25, 2000, 'bandpass', 0, 2, k); ton(700, 0.2, 'sine', 0.15, 1400, 0, k); },
    cadi(k) { gurultu(0.3, 0.2, 1500, 'bandpass', 0, 2, k); ton(1200, 0.25, 'triangle', 0.12, 500, 0, k); },
    kopya(k) { ton(900, 0.08, 'sine', 0.2, null, 0, k); ton(1350, 0.12, 'sine', 0.18, null, 0.07, k); },
    kopyaPatla(k) { gurultu(0.3, 0.3, 1500, 'bandpass', 0, 1, k); ton(600, 0.3, 'triangle', 0.15, 150, 0, k); },
    alay(tur, k) { (ALAYLAR[tur % ALAYLAR.length])(k); },
    zorSes(k) { [1568, 2093, 1568].forEach((f, i) => ton(f, 0.25, 'sine', 0.2, null, i * 0.11, k)); },
    iksirAt(k) { gurultu(0.15, 0.12, 2500, 'highpass', 0, 1, k); },
    iksirPatla(var_, k) { gurultu(0.2, 0.25, 3500, 'highpass', 0, 1, k); if (var_) [660, 880, 1100, 1320].forEach((f, i) => ton(f, 0.3, 'sine', 0.16, null, i * 0.08, k)); else ton(300, 0.35, 'sine', 0.15, 200, 0.05, k); },
    yakala(k) { ton(600, 0.5, 'sawtooth', 0.15, 100, 0, k); gurultu(0.4, 0.3, 600, 'lowpass', 0.05, 1, k); },
    sersem() { ton(500, 0.6, 'sine', 0.2, 200); ton(520, 0.6, 'sine', 0.15, 210, 0.05); },
    gong() { ton(110, 1.6, 'sine', 0.4); ton(220, 1.2, 'triangle', 0.15); ton(330, 0.9, 'sine', 0.08); },
    tik() { ton(1200, 0.04, 'square', 0.08); },
    zipla(k) { ton(300, 0.1, 'sine', 0.08, 500, 0, k); },
    kazandi() { [523, 659, 784, 1046].forEach((f, i) => ton(f, 0.35, 'triangle', 0.22, null, i * 0.13)); },
    kaybetti() { [392, 330, 262].forEach((f, i) => ton(f, 0.4, 'triangle', 0.2, null, i * 0.18)); },
  };
})();
