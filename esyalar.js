// =============================================================
// SaklanKaç - EŞYALAR ve HARİTA. İlk harita: "Sihirli Kiler"
// Bodrumlu, iki katlı, çatı teraslı büyücü evi + bahçe.
// Mobilyalar ince tahtalardan (kutulardan) yapılır; böylece açık dolapların, çekmecelerin,
// buzdolabının içine girilebilir. Küçük eşyaların yeri "tohum" sayısından üretilir ve
// her eşya kendi mantıklı bölgesinde durur. Çarpışma ve ışın hesapları da burada. Node'da da çalışır.
// =============================================================

const Harita = (() => {
  const GEN = 24, DER = 18;                  // evin içi: x -24..24, z -18..18
  const KAT1_ALT = 6.6, KAT1 = 7.0;          // mutfak tavanı / üst katın zemini
  const CATI_ALT = 13.0, CATI = 13.4;        // üst kat tavanı / çatı terası
  const BODRUM = -5;                         // bodrum zemini
  const SINIR = { x0: -40, x1: 40, z0: -22, z1: 44, y0: BODRUM, y1: 22 };   // dünyanın sınırı
  const TAVAN = SINIR.y1;
  const BOY_CADI = 1.15, R_CADI = 0.34;      // süpürgeli cadı (saklanan)
  const BOY_ASCI = 1.75, R_ASCI = 0.38;      // aşçı (avcı)

  // Eşya türleri: r = yarıçap, h = yükseklik, sert = üstüne çıkılır, saklanan kılığına giremez
  const TURLER = [
    { k: 'elma', ad: 'Elma', emo: '🍎', r: 0.14, h: 0.26 },
    { k: 'havuc', ad: 'Havuç', emo: '🥕', r: 0.11, h: 0.4 },
    { k: 'peynir', ad: 'Peynir tekeri', emo: '🧀', r: 0.32, h: 0.2 },
    { k: 'ekmek', ad: 'Ekmek', emo: '🍞', r: 0.24, h: 0.2 },
    { k: 'kavanoz', ad: 'Reçel kavanozu', emo: '🫙', r: 0.16, h: 0.34 },
    { k: 'tencere', ad: 'Tencere', emo: '🍲', r: 0.3, h: 0.3 },
    { k: 'caydanlik', ad: 'Çaydanlık', emo: '🫖', r: 0.2, h: 0.32 },
    { k: 'kupa', ad: 'Kupa', emo: '☕', r: 0.11, h: 0.17 },
    { k: 'iksir', ad: 'İksir şişesi', emo: '🧪', r: 0.13, h: 0.42 },
    { k: 'mum', ad: 'Mum', emo: '🕯️', r: 0.09, h: 0.32 },
    { k: 'kitap', ad: 'Büyü kitapları', emo: '📚', r: 0.24, h: 0.28 },
    { k: 'kabak', ad: 'Bal kabağı', emo: '🎃', r: 0.38, h: 0.46 },
    { k: 'lahana', ad: 'Lahana', emo: '🥬', r: 0.25, h: 0.34 },
    { k: 'sepet', ad: 'Elma sepeti', emo: '🧺', r: 0.3, h: 0.32 },
    { k: 'mantar', ad: 'Sihirli mantar', emo: '🍄', r: 0.17, h: 0.24 },
    { k: 'testi', ad: 'Testi', emo: '🏺', r: 0.19, h: 0.48 },
    { k: 'baykus', ad: 'Baykuş heykeli', emo: '🦉', r: 0.18, h: 0.38 },
    { k: 'cuval', ad: 'Un çuvalı', emo: '🛍️', r: 0.36, h: 0.72 },
    { k: 'fici', ad: 'Fıçı', emo: '🛢️', r: 0.46, h: 0.95, sert: true },
    { k: 'sandik', ad: 'Sandık', emo: '📦', r: 0.48, h: 0.66, sert: true },
    { k: 'tabure', ad: 'Tabure', emo: '🪑', r: 0.26, h: 0.5, sert: true },
    { k: 'kazancik', ad: 'Küçük kazan', emo: '⚗️', r: 0.42, h: 0.5, sert: true },
    { k: 'sut', ad: 'Süt şişesi', emo: '🥛', r: 0.1, h: 0.36 },
    { k: 'tabak', ad: 'Tabak yığını', emo: '🍽️', r: 0.21, h: 0.13 },
    { k: 'kase', ad: 'Kase', emo: '🥣', r: 0.17, h: 0.12 },
    { k: 'tuzluk', ad: 'Tuzluk', emo: '🧂', r: 0.06, h: 0.15 },
    { k: 'but', ad: 'Jambon', emo: '🍖', r: 0.2, h: 0.24 },
    { k: 'yumurta', ad: 'Yumurta', emo: '🥚', r: 0.07, h: 0.12 },
    { k: 'cicek', ad: 'Saksı çiçeği', emo: '🪴', r: 0.18, h: 0.46 },
    { k: 'kurabiye', ad: 'Kurabiye kavanozu', emo: '🍪', r: 0.17, h: 0.3 },
    { k: 'kafatasi', ad: 'Şeker kafatası', emo: '💀', r: 0.13, h: 0.2 },
    { k: 'kristal', ad: 'Kristal küre', emo: '🔮', r: 0.16, h: 0.3 },
    { k: 'sulama', ad: 'Sulama kabı', emo: '🚿', r: 0.2, h: 0.3 },
    { k: 'kova', ad: 'Kova', emo: '🪣', r: 0.18, h: 0.28 },
    { k: 'cuce', ad: 'Bahçe cücesi', emo: '🧙', r: 0.16, h: 0.46 },
    { k: 'saman', ad: 'Saman balyası', emo: '🌾', r: 0.55, h: 0.7, sert: true },
    { k: 'sarap', ad: 'Şarap şişesi', emo: '🍾', r: 0.07, h: 0.34 },
    { k: 'fener', ad: 'Fener', emo: '🏮', r: 0.12, h: 0.36 },
    { k: 'yastik', ad: 'Yastık', emo: '🛏️', r: 0.26, h: 0.15 },
    { k: 'ayi', ad: 'Oyuncak ayı', emo: '🧸', r: 0.16, h: 0.34 },
    { k: 'saat', ad: 'Çalar saat', emo: '⏰', r: 0.1, h: 0.2 },
    { k: 'sapka', ad: 'Cadı şapkası', emo: '🎩', r: 0.22, h: 0.4 },
    // haritada ayrıca süs ya da mobilya olarak duran şekiller (cadı bunlara da dönüşebilir)
    { k: 'tablo', ad: 'Tablo', emo: '🖼️', r: 0.6, h: 0.95, rc: 0.08, duvar: true },
    { k: 'pencere', ad: 'Pencere', emo: '🪟', r: 0.8, h: 1.6, rc: 0.08, duvar: true },
    { k: 'ot', ad: 'Ot demeti', emo: '🌿', r: 0.45, h: 0.8, rc: 0.1, duvar: true },
    { k: 'kasik', ad: 'Kepçe', emo: '🥄', r: 0.1, h: 0.75, rc: 0.06, duvar: true },
    { k: 'direk', ad: 'Sokak lambası', emo: '💡', r: 0.25, h: 2.6 },
    { k: 'avize', ad: 'Avize', emo: '🕯️', r: 1.2, h: 0.5 },
    { k: 'sandalye', ad: 'Sandalye', emo: '🪑', r: 0.3, h: 1.1 },
    { k: 'kasa', ad: 'Tahta kasa', emo: '📦', r: 0.55, h: 1.0 },
    { k: 'supurge', ad: 'Süpürge', emo: '🧹', r: 0.15, h: 1.5 },
    // büyük şekiller
    { k: 'kuyu', ad: 'Kuyu', emo: '⛲', r: 1.1, h: 2.6, rc: 1.0 },
    { k: 'tarla', ad: 'Sebze tarhı', emo: '🌱', r: 1.6, h: 0.5, rc: 0.9 },
    { k: 'agac', ad: 'Elma ağacı', emo: '🌳', r: 1.5, h: 5.6, rc: 0.45 },
    { k: 'kanepe', ad: 'Kanepe', emo: '🛋️', r: 0.85, h: 0.9, sert: true },
    { k: 'piyano', ad: 'Piyano', emo: '🎹', r: 0.8, h: 1.3, sert: true },
    { k: 'buyukSaat', ad: 'Büyük saat', emo: '🕰️', r: 0.35, h: 2.1, sert: true },
    { k: 'heykel', ad: 'Taş heykel', emo: '🗿', r: 0.5, h: 1.7, sert: true },
    { k: 'buyukSaksi', ad: 'Saksı ağacı', emo: '🌲', r: 0.5, h: 1.9, sert: true },
    { k: 'elArabasi', ad: 'El arabası', emo: '🛒', r: 0.7, h: 0.7, sert: true },
    { k: 'depo', ad: 'Su deposu', emo: '🛢️', r: 1.3, h: 2.7 },
    { k: 'baca', ad: 'Baca', emo: '🏭', r: 1.0, h: 2.8 },
    { k: 'catiKulube', ad: 'Çatı kulübesi', emo: '🛖', r: 1.7, h: 2.9 },
  ];
  // Süs → hangi şekle dönüşülür
  const SUS_TUR = { supurge: 'supurge', agacTepe: 'agac', fener: 'fener', ot: 'ot', tablo: 'tablo', avize: 'avize', asiliTencere: 'tencere', kasik: 'kasik', direkFener: 'direk', pencere: 'pencere' };
  const TUR_NO = Object.fromEntries(TURLER.map((t, i) => [t.k, i]));
  // Her bölgenin kendi eşyaları (aynı eşya her yere dağılmasın)
  const SETLER = {
    soguk: ['sut', 'peynir', 'but', 'sut'],
    kiler: ['kavanoz', 'kurabiye', 'testi', 'cuval'],
    mutfak: ['tencere', 'caydanlik', 'kase'],
    tabakDolabi: ['tabak', 'kase', 'kupa'],
    cekmece: ['tuzluk', 'kupa'],
    lavabo: ['tabak', 'kase', 'kupa'],
    sofra: ['tabak', 'kase', 'kupa', 'tuzluk'],
    ekmek: ['ekmek', 'tabak', 'ekmek'],
    baharat: ['tuzluk', 'kavanoz'],
    somine: ['mum', 'baykus'],
    kitap: ['kitap', 'kitap', 'baykus', 'mum'],
    cay: ['caydanlik', 'kupa', 'kurabiye'],
    iksirDolabi: ['iksir'],
    sarap: ['sarap'],
    bodrum: ['mantar', 'fener', 'mantar'],
    bodrumMasa: ['fener', 'sarap', 'mum'],
    yatak: ['yastik', 'ayi', 'yastik'],
    gardirop: ['sapka', 'ayi', 'yastik'],
    komodin: ['saat', 'mum'],
    calisma: ['saat', 'kitap', 'mum'],
    simya: ['iksir', 'kristal', 'kafatasi'],
    cati: ['cicek', 'kova', 'fener'],
    balkon: ['cicek'],
    bostan: ['lahana', 'havuc', 'kabak', 'havuc'],
    elmaAgaci: ['elma', 'elma', 'sepet'],
    kulube: ['kova', 'sulama'],
    sera: ['cicek', 'sulama', 'cicek'],
    kumes: ['yumurta'],
    bahce: ['cuce', 'cicek'],
    kuyu: ['kova', 'testi'],
    bos: [],
  };
  const SERT_SET = { mutfak: ['fici', 'sandik', 'tabure'], bodrum: ['fici', 'fici', 'sandik'], simya: ['sandik', 'kazancik'], bahce: ['saman', 'saman', 'fici'] };

  // ================= YAPI =================
  // K: içinden geçilmez kutular {x0,x1,y0,y1,z0,z1,m}  D: silindirler {x,z,r,y0,y1,m}
  // Y: eşya konulabilecek yüzeyler {x0,x1,z0,z1,y,bos,set,yog,en}   S: süsler   SH: vurulabilen süsler
  const K = [], D = [], Y = [], S = [], SH = [];
  const kutu = (x0, x1, y0, y1, z0, z1, m) => K.push({ x0: Math.min(x0, x1), x1: Math.max(x0, x1), y0, y1, z0: Math.min(z0, z1), z1: Math.max(z0, z1), m });
  const yuzey = (x0, x1, z0, z1, y, bos, set, yog, en = 8) => Y.push({ x0: Math.min(x0, x1), x1: Math.max(x0, x1), z0: Math.min(z0, z1), z1: Math.max(z0, z1), y, bos, set, yog, en });
  const sus = (tip, x, y, z, ek = {}) => { const s = { id: SH.length, tip, x, y, z, r: 0.35, h: 0.6, ...ek }; SH.push(s); return s; };
  // Dikdörtgenden delikleri çıkar → kalan dikdörtgenler
  function eksi(a0, a1, b0, b1, del) {
    const as = [a0, a1];
    del.forEach(d => { if (d.a0 > a0 && d.a0 < a1) as.push(d.a0); if (d.a1 > a0 && d.a1 < a1) as.push(d.a1); });
    as.sort((p, q) => p - q);
    const out = [];
    for (let i = 0; i < as.length - 1; i++) {
      const x0 = as[i], x1 = as[i + 1]; if (x1 - x0 < 1e-6) continue;
      const xm = (x0 + x1) / 2;
      const kes = del.filter(d => d.a0 < xm && d.a1 > xm).map(d => [Math.max(b0, d.b0), Math.min(b1, d.b1)]).filter(([p, q]) => q > p).sort((p, q) => p[0] - q[0]);
      let b = b0;
      kes.forEach(([p, q]) => { if (p > b) out.push([x0, x1, b, p]); b = Math.max(b, q); });
      if (b < b1) out.push([x0, x1, b, b1]);
    }
    return out;
  }
  // Delikli döşeme (x,z düzleminde)
  const doseme = (x0, x1, z0, z1, y0, y1, m, delikler = []) => eksi(x0, x1, z0, z1, delikler.map(d => ({ a0: d[0], a1: d[1], b0: d[2], b1: d[3] }))).forEach(([a, b, c, d]) => kutu(a, b, y0, y1, c, d, m));
  // Açıklıklı duvar: eksen 'x' → x boyunca uzanır (z0..z1 kalınlık); 'z' → z boyunca (x0..x1 kalınlık)
  function duvar(eksen, s0, s1, a0, a1, y0, y1, m, acik = []) {
    eksi(a0, a1, y0, y1, acik.map(d => ({ a0: d[0], a1: d[1], b0: d[2], b1: d[3] }))).forEach(([a, b, c, d]) => {
      if (eksen === 'x') kutu(a, b, c, d, s0, s1, m); else kutu(s0, s1, c, d, a, b, m);
    });
  }
  // Yerel koordinat: lx mobilyanın eni boyunca, lz derinliği boyunca (lz = derinlik → açık ön yüz)
  function yon(X0, X1, Z0, Z1, on) {
    const W = on === 'z+' || on === 'z-' ? X1 - X0 : Z1 - Z0, Dd = on === 'z+' || on === 'z-' ? Z1 - Z0 : X1 - X0;
    const r = (a0, a1, b0, b1) => {
      if (on === 'z+') return [X0 + a0, X0 + a1, Z0 + b0, Z0 + b1];
      if (on === 'z-') return [X1 - a1, X1 - a0, Z1 - b1, Z1 - b0];
      if (on === 'x+') return [X0 + b0, X0 + b1, Z1 - a1, Z1 - a0];
      return [X1 - b1, X1 - b0, Z0 + a0, Z0 + a1];   // x-
    };
    return {
      W, D: Dd,
      k: (a0, a1, y0, y1, b0, b1, m) => { const q = r(a0, a1, b0, b1); kutu(q[0], q[1], y0, y1, q[2], q[3], m); },
      y: (a0, a1, b0, b1, y, bos, set, yog, en) => { const q = r(a0, a1, b0, b1); yuzey(q[0], q[1], q[2], q[3], y, bos, set, yog, en); },
      n: (a, b) => { const q = r(a, a, b, b); return [q[0], q[2]]; },
    };
  }
  // Açık raflı dolap (buzdolabı, kiler rafı, kitaplık…). arka: false → iki yüzü de açık
  function rafDolap(o) {
    const { x0, x1, z0, z1, h, raflar = [], on = 'z+', m = 'ahsap', ic = m, set, yog = 4, kapak = 0, arka = true, yb = 0, ust = true, ustSet = 'bos' } = o;
    const L = yon(x0, x1, z0, z1, on), kal = 0.07;
    if (arka) L.k(0, L.W, yb, yb + h, 0, kal, m);
    L.k(0, kal, yb, yb + h, 0, L.D, m); L.k(L.W - kal, L.W, yb, yb + h, 0, L.D, m);
    L.k(0, L.W, yb + h - kal, yb + h, 0, L.D, m);
    L.k(kal, L.W - kal, yb, yb + 0.1, 0, L.D, m);
    const seviyeler = [yb + 0.1];
    raflar.forEach(ry => { L.k(kal, L.W - kal, yb + ry, yb + ry + 0.05, arka ? kal : 0, L.D, ic); seviyeler.push(yb + ry + 0.05); });
    const tavanlar = [...raflar.map(ry => yb + ry), yb + h - kal];
    seviyeler.forEach((sy, i) => L.y(kal, L.W - kal, arka ? kal : 0, L.D, sy, tavanlar[i] - sy, set, yog));
    if (ust) L.y(0, L.W, 0, L.D, yb + h, 2, ustSet, 1, 3);
    if (kapak >= 1) L.k(-0.06, 0, yb + 0.12, yb + h - 0.08, L.D, L.D + (kapak === 2 ? L.W / 2 : L.W), m + 'Kapak');
    if (kapak === 2) L.k(L.W, L.W + 0.06, yb + 0.12, yb + h - 0.08, L.D, L.D + L.W / 2, m + 'Kapak');
    return L;
  }
  // Tezgah: parçalar = [[başlangıç, bitiş, tür]] tür: 'dolu' | 'dolap' | 'cekmece' | 'lavabo'
  function tezgah(o) {
    const { x0, x1, z0, z1, h = 1.0, on, parcalar, m = 'ahsap', set = 'mutfak', dolapSet = 'mutfak', yog = 1.2 } = o;
    const L = yon(x0, x1, z0, z1, on), ust = 0.08;
    parcalar.forEach(([a, b, tur]) => {
      if (tur === 'lavabo') {
        L.k(a, b, 0, h - 0.45, 0, L.D, m);
        L.k(a, b, h - 0.45, h - 0.38, 0, L.D, 'tas');
        L.k(a, a + 0.12, h - 0.38, h, 0, L.D + 0.04, 'tas'); L.k(b - 0.12, b, h - 0.38, h, 0, L.D + 0.04, 'tas');
        L.k(a + 0.12, b - 0.12, h - 0.38, h, 0, 0.15, 'tas'); L.k(a + 0.12, b - 0.12, h - 0.38, h, L.D - 0.08, L.D + 0.04, 'tas');
        L.y(a + 0.12, b - 0.12, 0.15, L.D - 0.08, h - 0.38, 1.5, 'lavabo', 3, 3);
        S.push({ tip: 'musluk', n: L.n((a + b) / 2, 0.08), y: h, on });
        return;
      }
      L.k(a, b, h - ust, h, 0, L.D + 0.04, m + 'Ust');
      if (tur === 'dolap') {
        L.k(a, b, 0, 0.1, 0, L.D, m);
        L.k(a, a + 0.06, 0.1, h - ust, 0, L.D, m); L.k(b - 0.06, b, 0.1, h - ust, 0, L.D, m);
        L.k(a + 0.06, b - 0.06, 0.1, h - ust, 0, 0.06, m);
        L.k(a + 0.06, b - 0.06, 0.48, 0.52, 0.06, L.D, m);
        L.y(a + 0.06, b - 0.06, 0.06, L.D, 0.1, 0.38, dolapSet, 3, 3);
        L.y(a + 0.06, b - 0.06, 0.06, L.D, 0.52, h - ust - 0.52, dolapSet, 3, 3);
        L.k(a - 0.05, a, 0.12, h - ust - 0.04, L.D, L.D + (b - a) - 0.05, m + 'Kapak');
      } else {
        L.k(a, b, 0, h - ust, 0, L.D - 0.02, m);
        if (tur === 'cekmece') {
          const y0 = h - 0.36, d0 = L.D - 0.02, d1 = L.D + 0.55;
          L.k(a + 0.06, b - 0.06, y0, y0 + 0.03, d0, d1, m + 'Kapak');
          L.k(a + 0.06, a + 0.1, y0, y0 + 0.24, d0, d1, m + 'Kapak'); L.k(b - 0.1, b - 0.06, y0, y0 + 0.24, d0, d1, m + 'Kapak');
          L.k(a + 0.06, b - 0.06, y0 - 0.04, y0 + 0.26, d1, d1 + 0.04, m);
          L.y(a + 0.1, b - 0.1, d0, d1, y0 + 0.03, 0.27, 'cekmece', 5, 3);
          S.push({ tip: 'kulp', n: L.n((a + b) / 2, d1 + 0.05), y: y0 + 0.13, on });
        }
      }
    });
    L.y(0, L.W, 0.05, L.D, h, 3, set, yog, 8);
  }
  function masa(x0, x1, z0, z1, h, m, set, yog, yb = 0, en = 6) {
    kutu(x0, x1, yb + h - 0.08, yb + h, z0, z1, m + 'Ust');
    [[x0 + 0.08, z0 + 0.08], [x1 - 0.18, z0 + 0.08], [x0 + 0.08, z1 - 0.18], [x1 - 0.18, z1 - 0.18]].forEach(([x, z]) => kutu(x, x + 0.1, yb, yb + h - 0.08, z, z + 0.1, m));
    yuzey(x0 + 0.05, x1 - 0.05, z0 + 0.05, z1 - 0.05, yb + h, 3, set, yog, en);
  }
  function sandalye(x, z, yonu, yb = 0) {
    kutu(x - 0.25, x + 0.25, yb + 0.45, yb + 0.5, z - 0.25, z + 0.25, 'sandalye');
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => kutu(x + a * 0.2 - 0.03, x + a * 0.2 + 0.03, yb, yb + 0.45, z + b * 0.2 - 0.03, z + b * 0.2 + 0.03, 'koyu'));
    const bz = z + yonu * 0.22;
    kutu(x - 0.25, x + 0.25, yb + 0.5, yb + 1.1, bz - 0.03, bz + 0.03, 'sandalye');
  }
  function duvarRafi(x0, x1, z0, z1, y, bos, set, yog, en = 6) {
    kutu(x0, x1, y - 0.05, y, z0, z1, 'koyu');
    yuzey(x0, x1, z0, z1, y, bos, set, yog, en);
  }
  // Korkuluk: iki nokta arasında ince kutu
  const korkuluk = (x0, x1, z0, z1, y, h = 1.0) => kutu(x0, x1, y, y + h, z0, z1, 'koyu');

  // ===================== ZEMİN, BODRUM, DUVARLAR, KATLAR =====================
  const EV = { x0: -24.4, x1: 24.4, z0: -18.4, z1: 18.4 };
  const BOD = { x0: -16, x1: 8, z0: -16, z1: 4 };                    // bodrum
  const BOD_DELIK = [-12, -9.5, -10.8, -7];                          // mutfaktan bodruma merdiven boşluğu
  const UST_DELIK = [[-4, 4, -9, -1], [-21.5, -19, 3.8, 8.4]];       // üst katta: ortadaki boşluk + merdiven
  const CATI_DELIK = [16, 18, -14, -12];                             // çatıya çıkış kapağı
  // toprak dolgu (bodrumun dışında her yer), çim, mutfak taşı
  doseme(SINIR.x0, SINIR.x1, SINIR.z0, SINIR.z1, SINIR.y0 - 0.4, -0.4, 'tasKoyu', [[BOD.x0, BOD.x1, BOD.z0, BOD.z1]]);
  doseme(SINIR.x0, SINIR.x1, SINIR.z0, SINIR.z1, -0.4, 0, 'cim', [[EV.x0, EV.x1, EV.z0, EV.z1]]);
  doseme(EV.x0, EV.x1, EV.z0, EV.z1, -0.4, 0, 'tasZemin', [BOD_DELIK]);
  kutu(BOD.x0, BOD.x1, SINIR.y0 - 0.4, SINIR.y0, BOD.z0, BOD.z1, 'tasZemin');
  // dış duvarlar (kapı ve pencere boşluklarıyla)
  duvar('x', 18, 18.4, EV.x0, EV.x1, 0, CATI_ALT, 'tugla', [[-2.5, 2.5, 0, 4.2], [3.8, 7, 1.4, 4], [-2.5, 2.5, 7, 10.8], [-17, -13, 8.5, 11], [13, 17, 8.5, 11]]);
  duvar('x', -18.4, -18, EV.x0, EV.x1, 0, CATI_ALT, 'tugla', [[-12.5, -9.5, 8.6, 11], [15, 18.5, 8.5, 11]]);
  duvar('z', -24.4, -24, -18, 18, 0, CATI_ALT, 'tugla', [[6.8, 9.2, 3.2, 5.6], [5, 9, 8.5, 11]]);
  duvar('z', 24, 24.4, -18, 18, 0, CATI_ALT, 'tugla', [[11.5, 14.5, 2.4, 5], [-2, 2, 8.5, 11], [10, 13, 8.5, 11]]);
  // üst katın zemini, çatı
  doseme(-24, 24, -18, 18, KAT1_ALT, KAT1, 'tahtaZemin', UST_DELIK);
  doseme(EV.x0, EV.x1, EV.z0, EV.z1, CATI_ALT, CATI, 'cati', [CATI_DELIK]);
  // çatı korkulukları (parapet)
  kutu(EV.x0, EV.x1, CATI, CATI + 1, EV.z0, EV.z0 + 0.3, 'tugla'); kutu(EV.x0, EV.x1, CATI, CATI + 1, EV.z1 - 0.3, EV.z1, 'tugla');
  kutu(EV.x0, EV.x0 + 0.3, CATI, CATI + 1, EV.z0, EV.z1, 'tugla'); kutu(EV.x1 - 0.3, EV.x1, CATI, CATI + 1, EV.z0, EV.z1, 'tugla');

  // ===================== MUTFAK (zemin kat) =====================
  // --- Arka duvar (z = -18) ---
  rafDolap({ x0: -23.6, x1: -19.4, z0: -18, z1: -16.9, h: 3.0, raflar: [0.8, 1.55, 2.3], set: 'kiler', yog: 2.2 });
  yuzey(-23.4, -19.6, -16.7, -15.2, 0, 2, 'kiler', 0.6, 3);
  rafDolap({ x0: -17.2, x1: -14.8, z0: -18, z1: -16.8, h: 3.0, raflar: [0.65, 1.25, 1.85, 2.45], m: 'buz', set: 'soguk', yog: 3, kapak: 2 });
  S.push({ tip: 'buzIsik', x: -16, y: 2.85, z: -17.4 });
  duvarRafi(-12.8, -8, -18, -17.5, 1.7, 0.75, 'kiler', 1.5);
  duvarRafi(-12.8, -8, -18, -17.5, 2.5, 0.75, 'kiler', 1.5);
  rafDolap({ x0: -7.6, x1: -5.4, z0: -18, z1: -17.3, h: 2.2, raflar: [0.7, 1.4], m: 'mor', set: 'iksirDolabi', yog: 3, kapak: 1 });
  // şömine ve davlumbaz
  kutu(-4.5, -3.3, 0, 2.4, -18, -16.4, 'tas'); kutu(3.3, 4.5, 0, 2.4, -18, -16.4, 'tas');
  kutu(-3.3, 3.3, 0, 2.4, -18, -17.5, 'tasKoyu');
  kutu(-3.3, 3.3, 0, 0.15, -17.5, -16.4, 'tas');
  kutu(-3.3, 3.3, 1.8, 2.4, -18, -16.4, 'tas');
  kutu(-5, 5, 2.4, 2.55, -18, -16.1, 'koyu');
  yuzey(-4.9, 4.9, -17.9, -16.2, 2.55, 1.3, 'somine', 1.2, 5);
  kutu(-3.6, 3.6, 2.55, KAT1_ALT, -18, -16.9, 'tas');
  kutu(-2, 2, KAT1, CATI + 2.6, -18, -16.6, 'tugla');            // baca (üst kattan çatıya)
  S.push({ tip: 'ates', x: 0, y: 0.15, z: -17.1 });
  rafDolap({ x0: 6.6, x1: 10.6, z0: -18, z1: -16.9, h: 3.2, raflar: [0.8, 1.6, 2.4], m: 'yesil', set: 'mutfak', yog: 2, kapak: 2 });
  duvarRafi(11.6, 14.2, -18, -17.5, 1.9, 0.9, 'tabakDolabi', 2);
  // ekmek fırını
  kutu(15, 21, 0, 1.0, -18, -14, 'tas');
  kutu(15.6, 20.4, 1.0, 2.6, -18, -14.6, 'tugla');
  yuzey(15.05, 20.95, -14.55, -14.05, 1.0, 1.5, 'ekmek', 3, 5);
  S.push({ tip: 'firin', x: 18, y: 1.0, z: -14.6 });
  kutu(21.4, 24, 0, 1.2, -18, -15.6, 'kasa'); kutu(21.8, 24, 1.2, 2.3, -18, -16.2, 'kasa');
  // --- Sol duvar (x = -24) ---
  tezgah({ x0: -24, x1: -22.8, z0: -14.5, z1: 4, on: 'x+', parcalar: [[0, 1.6, 'dolu'], [1.6, 3.6, 'dolap'], [3.6, 5.1, 'cekmece'], [5.1, 7.3, 'lavabo'], [7.3, 8.8, 'cekmece'], [8.8, 11, 'dolap'], [11, 12.5, 'cekmece'], [12.5, 14.4, 'dolu'], [14.4, 16.6, 'dolap'], [16.6, 18.5, 'cekmece']], set: 'mutfak', yog: 0.8 });
  duvarRafi(-24, -23.5, -13, 3, 1.9, 0.75, 'mutfak', 1.2);
  duvarRafi(-24, -23.5, -13, 3, 2.7, 0.75, 'baharat', 2);
  rafDolap({ x0: -24, x1: -22.8, z0: 6.6, z1: 9.4, h: 2.6, raflar: [1.0, 1.8], on: 'x+', m: 'kirmizi', set: 'bos', kapak: 1 });
  kutu(-24, -20.4, 0, 1.2, 14.2, 18, 'odun');
  rafDolap({ x0: -17.2, x1: -16.3, z0: -10, z1: -3, h: 2.7, raflar: [0.65, 1.3, 1.95], on: 'x+', arka: false, set: 'kitap', yog: 2.5 });
  // --- Sağ duvar (x = 24) ---
  tezgah({ x0: 22.8, x1: 24, z0: -10, z1: 10, on: 'x-', parcalar: [[0, 1.8, 'cekmece'], [1.8, 4, 'dolap'], [4, 5.5, 'cekmece'], [5.5, 7.6, 'dolu'], [7.6, 9.8, 'lavabo'], [9.8, 11.3, 'cekmece'], [11.3, 13.5, 'dolap'], [13.5, 15, 'cekmece'], [15, 17.6, 'dolap'], [17.6, 20, 'cekmece']], set: 'ekmek', dolapSet: 'tabakDolabi', yog: 0.8 });
  rafDolap({ x0: 23.5, x1: 24, z0: -7, z1: 1, h: 1.6, raflar: [0.55, 1.05], on: 'x-', m: 'koyu', set: 'baharat', yog: 4, yb: 1.7 });
  duvarRafi(23.4, 24, 3, 9.5, 2.2, 0.8, 'tabakDolabi', 2);
  // --- Ön duvar (z = 18) ---
  rafDolap({ x0: 13.6, x1: 19, z0: 16.9, z1: 18, h: 2.6, raflar: [0.85, 1.7], on: 'z-', set: 'tabakDolabi', yog: 2 });
  kutu(8, 10.6, 0, 1.1, 15.4, 18, 'kasa'); kutu(8.3, 10.3, 1.1, 2.1, 16.2, 18, 'kasa'); kutu(10.6, 12, 0, 0.8, 16.6, 18, 'kasa');
  duvarRafi(-12, -5, 17.5, 18, 2.2, 0.8, 'somine', 1.5);
  rafDolap({ x0: 20.6, x1: 24, z0: 16.9, z1: 18, h: 2.0, raflar: [1.0], on: 'z-', m: 'yesil', set: 'tabakDolabi', yog: 2, kapak: 1 });
  // --- Orta ---
  D.push({ x: 0, z: -5, r: 2.2, y0: 0, y1: 1.3, m: 'kazan' });
  masa(-13, -5, 3, 5.6, 0.85, 'ahsap', 'sofra', 1.2);
  [-12, -9, -6].forEach(x => { sandalye(x, 2.3, -1); sandalye(x, 6.3, 1); });
  rafDolap({ x0: 5, x1: 12, z0: 2, z1: 4.6, h: 1.0, raflar: [0.48], arka: false, m: 'kirmizi', set: 'mutfak', yog: 1.5, ust: false });
  yuzey(5, 12, 2, 4.6, 1.0, 2, 'mutfak', 0.6, 4);
  masa(13, 18.5, -8.5, -5.6, 0.9, 'koyu', 'ekmek', 1.5);
  masa(-6, -1, 9, 11.2, 0.85, 'mor', 'cay', 1.5);
  sandalye(-3.5, 12, 1); sandalye(-3.5, 8.2, -1);
  kutu(15, 17.6, 0, 1.0, 8, 10.6, 'kasa'); kutu(15.3, 16.9, 1.0, 2.0, 8.3, 9.9, 'kasa');
  duvarRafi(-3, 3, 17.5, 18, 4.6, 1.5, 'somine', 1);
  kutu(-20, -15, 4.4, 4.5, 13, 14.2, 'koyu'); yuzey(-20, -15, 13, 14.2, 4.5, 1.8, 'kiler', 1, 4);
  S.push({ tip: 'askiRaf', x0: -20, x1: -15, z: 13.6, y: 4.5, ust: KAT1_ALT });
  // üst kata merdiven (z 11'den 4'e doğru yükselir)
  for (let i = 0; i < 24; i++) kutu(-21.5, -19, 0, (i + 1) * KAT1 / 24, 11 - (i + 1) * 0.29, 11 - i * 0.29, 'ahsapUst');
  // bodruma merdiven (z -7'den -13.8'e doğru iner)
  for (let i = 0; i < 17; i++) kutu(-12, -9.5, BODRUM, -(i + 1) * 5 / 17, -7 - (i + 1) * 0.4, -7 - i * 0.4, 'tasKoyu');
  korkuluk(-12.1, -12, -10.8, -7, 0); korkuluk(-9.5, -9.4, -10.8, -7, 0); korkuluk(-12, -9.5, -10.9, -10.8, 0);

  // ===================== BODRUM =====================
  rafDolap({ x0: BOD.x0, x1: BOD.x0 + 1, z0: -14, z1: -4, on: 'x+', yb: BODRUM, h: 3.6, raflar: [0.6, 1.2, 1.8, 2.4, 3.0], m: 'koyu', set: 'sarap', yog: 1.2 });
  rafDolap({ x0: -1, x1: 6, z0: 3, z1: 4, on: 'z-', yb: BODRUM, h: 3.6, raflar: [0.6, 1.2, 1.8, 2.4, 3.0], m: 'koyu', set: 'sarap', yog: 1.2 });
  rafDolap({ x0: -8, x1: -3, z0: -16, z1: -15, on: 'z+', yb: BODRUM, h: 3, raflar: [0.8, 1.6, 2.4], m: 'ahsap', set: 'bodrum', yog: 2.5 });
  masa(-4, 0, -7, -4.8, 0.9, 'koyu', 'bodrumMasa', 1.5, BODRUM);
  for (let x = -14; x < 8; x += 4) kutu(x, x + 0.3, -0.75, -0.4, BOD.z0, BOD.z1, 'koyu');   // tavan kirişleri
  S.push({ tip: 'bodrumIsik', x: -4, y: -1.3, z: -6 });

  // ===================== ÜST KAT =====================
  // ara duvarlar (kapı boşluklu)
  duvar('z', -6.15, -5.85, -18, 18, KAT1, CATI_ALT, 'siva', [[-1.5, 1.5, KAT1, 10.5], [10, 13, KAT1, 10.5]]);
  duvar('z', 5.85, 6.15, -18, 18, KAT1, CATI_ALT, 'siva', [[-1.5, 1.5, KAT1, 10.5], [10, 13, KAT1, 10.5]]);
  // ortadaki boşluğun ve merdiven boşluğunun korkulukları
  korkuluk(-4, 4, -9.1, -9, KAT1); korkuluk(-4, 4, -1, -0.9, KAT1); korkuluk(-4.1, -4, -9.1, -0.9, KAT1); korkuluk(4, 4.1, -9.1, -0.9, KAT1);
  korkuluk(-21.6, -21.5, 3.8, 8.5, KAT1); korkuluk(-19, -18.9, 3.8, 8.5, KAT1); korkuluk(-21.5, -19, 8.4, 8.5, KAT1);
  // balkon
  kutu(-4, 4, KAT1_ALT, KAT1, 18.4, 21, 'tahtaZemin');
  korkuluk(-4, 4, 20.9, 21, KAT1); korkuluk(-4, -3.9, 18.4, 21, KAT1); korkuluk(3.9, 4, 18.4, 21, KAT1);
  yuzey(-3.8, 3.8, 18.5, 20.8, KAT1, 3, 'balkon', 0.5, 4);
  // sol oda: yatak odası ve kütüphane
  kutu(-23.6, -20.4, KAT1, KAT1 + 0.55, -17.6, -14.6, 'kirmizi'); kutu(-23.6, -20.4, KAT1, KAT1 + 1.6, -17.9, -17.6, 'koyu');
  yuzey(-23.5, -20.5, -17.5, -14.7, KAT1 + 0.55, 3, 'yatak', 1, 5);
  kutu(-20.1, -19.3, KAT1, KAT1 + 0.6, -17.9, -17.1, 'koyu'); yuzey(-20.05, -19.35, -17.85, -17.15, KAT1 + 0.6, 2, 'komodin', 4, 2);
  rafDolap({ x0: -17.5, x1: -14.5, z0: -18, z1: -17, yb: KAT1, h: 3, raflar: [1.0, 2.0], m: 'mor', set: 'gardirop', yog: 2.5, kapak: 2 });
  masa(-12.6, -9.4, -17.6, -16.2, 0.8, 'koyu', 'calisma', 2, KAT1);
  sandalye(-11, -15.6, 1, KAT1);
  rafDolap({ x0: -7.2, x1: -6.15, z0: -16, z1: -6, on: 'x-', yb: KAT1, h: 3.2, raflar: [0.8, 1.6, 2.4], set: 'kitap', yog: 2.2 });
  rafDolap({ x0: -14.6, x1: -13.8, z0: -3, z1: 5, on: 'x+', arka: false, yb: KAT1, h: 2.6, raflar: [0.85, 1.7], set: 'kitap', yog: 2.2 });
  masa(-19, -16.6, 10.5, 12.5, 0.7, 'ahsap', 'calisma', 1.5, KAT1);
  // sağ oda: simya odası
  rafDolap({ x0: 8, x1: 13, z0: -18, z1: -17, yb: KAT1, h: 3, raflar: [0.8, 1.6, 2.4], m: 'koyu', set: 'simya', yog: 2.2 });
  masa(10, 15, -8, -5.5, 0.9, 'mor', 'simya', 1.5, KAT1);
  rafDolap({ x0: 23, x1: 24, z0: 2, z1: 9, on: 'x-', yb: KAT1, h: 2.6, raflar: [0.85, 1.7], m: 'yesil', set: 'simya', yog: 2 });
  kutu(18, 20.5, KAT1, KAT1 + 1.2, 14, 16.5, 'kasa'); kutu(20.5, 22.5, KAT1, KAT1 + 0.8, 14.5, 16.5, 'kasa');
  // çatıya merdiven (sadece görüntü) ve çatı kulübesi
  S.push({ tip: 'merdiven', x: 17, z: -13.9, y0: KAT1, y1: CATI });
  kutu(15, 19, CATI, CATI + 2.6, -15, -14.7, 'tugla'); kutu(15, 15.3, CATI, CATI + 2.6, -15, -11, 'tugla'); kutu(18.7, 19, CATI, CATI + 2.6, -15, -11, 'tugla');
  kutu(14.8, 19.2, CATI + 2.6, CATI + 2.8, -15.2, -10.8, 'cati');
  // çatı: saksılar, su deposu
  kutu(-22, -18, CATI, CATI + 0.5, 12, 17, 'toprak'); yuzey(-21.9, -18.1, 12.1, 16.9, CATI + 0.5, 2, 'cati', 0.8, 5);
  D.push({ x: -12, z: 10, r: 1.3, y0: CATI, y1: CATI + 2.2, m: 'metal' });
  yuzey(4, 14, 2, 14, CATI, 3, 'cati', 0.15, 5);
  yuzey(-20, -8, -15, -5, CATI, 3, 'cati', 0.12, 4);

  // ===================== BAHÇE =====================
  // sebze tarhları
  [[-20, -14, 24, 27], [-20, -14, 29, 32], [-12, -6, 24, 27]].forEach(([x0, x1, z0, z1]) => {
    kutu(x0, x1, 0, 0.35, z0, z1, 'toprak');
    kutu(x0 - 0.12, x1 + 0.12, 0, 0.45, z0 - 0.12, z0, 'ahsap'); kutu(x0 - 0.12, x1 + 0.12, 0, 0.45, z1, z1 + 0.12, 'ahsap');
    kutu(x0 - 0.12, x0, 0, 0.45, z0, z1, 'ahsap'); kutu(x1, x1 + 0.12, 0, 0.45, z0, z1, 'ahsap');
    yuzey(x0 + 0.1, x1 - 0.1, z0 + 0.1, z1 - 0.1, 0.35, 3, 'bostan', 1.6, 9);
  });
  // elma ağaçları
  D.push({ x: 16, z: 28, r: 0.45, y0: 0, y1: 3.4, m: 'agac' }); S.push({ tip: 'agac', x: 16, z: 28, y: 3.4 });
  D.push({ x: -31, z: 38, r: 0.5, y0: 0, y1: 3.8, m: 'agac' }); S.push({ tip: 'agac', x: -31, z: 38, y: 3.8 });
  // ağaç tepeleri: domates çarpınca yaprak saçılır, cadı şeklini alabilir
  sus('agacTepe', 16, 2.6, 28, { r: 2.3, h: 2.8, gizli: true }); sus('agacTepe', -31, 3.0, 38, { r: 2.3, h: 2.8, gizli: true });
  yuzey(12.5, 19.5, 24.5, 31.5, 0, 3, 'elmaAgaci', 0.6, 12);
  // kuyu
  D.push({ x: -6, z: 36, r: 1.1, y0: 0, y1: 1.0, m: 'tas' }); S.push({ tip: 'kuyu', x: -6, z: 36 });
  yuzey(-9, -3, 33, 39, 0, 3, 'kuyu', 0.1, 3);
  // alet kulübesi (önü açık)
  kutu(33.6, 34, 0, 3.2, 28, 36, 'ahsap'); kutu(26, 34, 0, 3.2, 28, 28.4, 'ahsap'); kutu(26, 34, 0, 3.2, 35.6, 36, 'ahsap');
  kutu(25.6, 34.4, 3.2, 3.4, 27.6, 36.4, 'cati');
  duvarRafi(33, 33.6, 28.6, 35.4, 1.0, 0.95, 'kulube', 2); duvarRafi(33, 33.6, 28.6, 35.4, 2.0, 1.1, 'kulube', 2);
  yuzey(27, 32.8, 29, 35, 0, 3, 'kulube', 0.12, 4);
  // sera (cam duvarlı)
  duvar('z', -38, -37.92, 0, 12, 0, 3.5, 'cam'); duvar('x', 0, 0.08, -38, -28, 0, 3.5, 'cam'); duvar('x', 11.92, 12, -38, -28, 0, 3.5, 'cam');
  duvar('z', -28.08, -28, 0, 12, 0, 3.5, 'cam', [[5, 7, 0, 2.6]]);
  kutu(-38, -28, 3.5, 3.58, 0, 12, 'cam');
  masa(-37.5, -35.8, 0.6, 11.4, 0.9, 'ahsap', 'sera', 1.6);
  masa(-30.2, -28.5, 0.6, 4.6, 0.9, 'ahsap', 'sera', 1.6); masa(-30.2, -28.5, 7.4, 11.4, 0.9, 'ahsap', 'sera', 1.6);
  // kümes
  rafDolap({ x0: -37, x1: -33, z0: 18, z1: 21, on: 'x+', h: 2.2, raflar: [0.9], m: 'kirmizi', set: 'kumes', yog: 3, ustSet: 'bos' });
  // çiçek bahçeleri ve odun yığını
  yuzey(4, 14, 22, 26, 0, 3, 'bahce', 0.12, 6);
  yuzey(28, 38, -8, 8, 0, 3, 'bahce', 0.06, 5);
  kutu(-10, -4, 0, 1.2, -21.6, -19.4, 'odun');
  // bahçe çiti (görüntü) – sınır zaten durdurur
  S.push({ tip: 'cit' });

  // ===================== AŞÇI KULÜBESİ (bahçe kapısının yanında) =====================
  // Aşçılar saklanma süresince burada bekler. Tahtaların arası ve kapıdaki anahtar deliği açıktır.
  const KULUBE = { x0: -2.5, x1: 2.5, z0: 37, z1: 41.6, h: 2.6, kapi: [-0.62, 0.62], kapiH: 2.1, delik: { x: 0.35, y: 1.56, z: 37.06 } };
  {
    const { x0, x1, z0, z1, h } = KULUBE, k = 0.1, en = 0.22, ara = 0.045;
    kutu(x0, x1, 0, 0.1, z0, z1, 'ahsapUst');
    const tahtalar = (eksen, s0, s1, a0, a1, bosluk) => {
      for (let a = a0; a < a1 - 0.02; a += en + ara) {
        const b = Math.min(a1, a + en);
        if (bosluk && b > bosluk[0] && a < bosluk[1]) { if (a < bosluk[0]) eksen === 'x' ? kutu(a, bosluk[0], 0.1, h, s0, s1, 'ahsap') : 0; if (b > bosluk[1]) eksen === 'x' ? kutu(bosluk[1], b, 0.1, h, s0, s1, 'ahsap') : 0; continue; }
        if (eksen === 'x') kutu(a, b, 0.1, h, s0, s1, 'ahsap'); else kutu(s0, s1, 0.1, h, a, b, 'ahsap');
      }
    };
    tahtalar('x', z1 - k, z1, x0, x1);
    tahtalar('z', x0, x0 + k, z0, z1); tahtalar('z', x1 - k, x1, z0, z1);
    tahtalar('x', z0, z0 + k, x0, x1, KULUBE.kapi);
    kutu(KULUBE.kapi[0], KULUBE.kapi[1], KULUBE.kapiH, h, z0, z0 + k, 'ahsap');
    kutu(x0 - 0.35, x1 + 0.35, h, h + 0.12, z0 - 0.35, z1 + 0.35, 'cati');
    kutu(x0 + 0.15, x1 - 0.15, 0.1, 0.55, z1 - 0.55, z1 - k, 'koyu');            // bank
    S.push({ tip: 'kulube', ...KULUBE });
  }

  // ===================== VURULABİLEN SÜSLER =====================
  // Fenerler, ot demetleri, avize, asılı tencereler, tablolar: domates çarpınca sallanır / döner
  const DUVAR_SUSLERI = [
    ['fener', -23.7, 4.5, -6, Math.PI / 2], ['ot', -23.7, 4.5, 2, Math.PI / 2], ['fener', -23.7, 4.5, 12, Math.PI / 2],
    ['ot', 23.7, 4.5, -12, -Math.PI / 2], ['fener', 23.7, 4.5, 4, -Math.PI / 2], ['ot', 23.7, 4.5, 16, -Math.PI / 2],
    ['fener', -14, 4.5, -17.7, 0], ['ot', 13, 4.5, -17.7, 0], ['fener', -16, 4.2, 17.7, Math.PI], ['ot', -8.5, 4.6, 17.7, Math.PI], ['fener', 16, 4.2, 17.7, Math.PI],
    ['tablo', -20.5, 4.3, -17.95, 0, 0xc84a8a], ['tablo', 10.5, 4.5, -17.95, 0, 0x4a8ac8], ['tablo', 23.95, 3.8, -4, -Math.PI / 2, 0x6ac84a], ['tablo', -23.95, 3.8, 16, Math.PI / 2, 0xe8a03a],
    // üst kat
    ['fener', -23.7, 11, -8, Math.PI / 2], ['fener', 23.7, 11, -6, -Math.PI / 2], ['tablo', -6.3, 10, 8, -Math.PI / 2, 0x8a5ac8], ['tablo', 6.3, 10, -12, Math.PI / 2, 0x3ab8a8],
    ['ot', 6.3, 11.2, 6, Math.PI / 2], ['fener', -6.3, 11, -12, -Math.PI / 2],
    // bodrum
    ['fener', -15.7, -1.6, 0, Math.PI / 2], ['fener', 7.7, -1.6, -10, -Math.PI / 2], ['ot', -2, -1.4, -15.7, 0],
    // dış duvar ve bahçe
    ['fener', -3.5, 3.6, 18.6, 0], ['fener', 3.5, 3.6, 18.6, 0], ['fener', 33.4, 2.6, 32, -Math.PI / 2],
  ];
  DUVAR_SUSLERI.forEach(([tip, x, y, z, ry, renk]) => sus(tip, x, y, z, { ry, renk, r: tip === 'tablo' ? 0.75 : 0.35, h: tip === 'tablo' ? 1.2 : 0.8, y: tip === 'tablo' ? y - 0.6 : y - 0.5 }));
  sus('avize', -9, 4.4, 4.3, { r: 1.3, h: 0.5, y: 4.2, ip: KAT1_ALT });
  sus('avize', -15, 11.2, -10, { r: 1.0, h: 0.5, y: 11.0, ip: CATI_ALT });
  sus('avize', 15, 11.2, -2, { r: 1.0, h: 0.5, y: 11.0, ip: CATI_ALT, renk: 0xb05aff });
  for (let i = 0; i < 7; i++) sus('asiliTencere', 8.5 - 2.1 + i * 0.7, 3.6, 3.3, { r: 0.25, h: 0.6, y: 2.9, cesit: i, ip: 3.6 });
  sus('supurge', -23.1, 0, 11, { r: 0.22, h: 1.5 }); sus('supurge', 22.7, 0, 14.6, { r: 0.22, h: 1.5 });
  sus('askiCubuk', 8.5, 3.7, 3.3, { r: 0, h: 0, ip: KAT1_ALT });   // tencere askısı (vurulmaz)
  for (let i = 0; i < 6; i++) sus('kasik', -6.8 + i * 0.3, 3.4, -17.92, { r: 0.12, h: 0.75, y: 2.9, cesit: i });
  // pencere çerçeveleri (vurulmaz, ama cadı şekillerini alabilir)
  [[5.4, 1.4, 18.2, 0], [-15, 8.5, 18.2, 0], [15, 8.5, 18.2, 0], [-11, 8.6, -18.2, 0], [16.75, 8.5, -18.2, 0], [-24.2, 3.2, 8, Math.PI / 2], [-24.2, 8.5, 7, Math.PI / 2], [24.2, 2.4, 13, Math.PI / 2], [24.2, 8.5, 0, Math.PI / 2], [24.2, 8.5, 11.5, Math.PI / 2]]
    .forEach(([x, y, z, ry]) => sus('pencere', x, y, z, { ry, r: 0.8, h: 1.6, vurulmaz: true }));
  [[-20, 2.2, 21], [0, 2.2, 43.2], [20, 2.2, 21], [-20, 2.2, 43.2], [20, 2.2, 43.2], [28, 2.2, 21]].forEach(([x, y, z]) => sus('direkFener', x, y, z, { r: 0.3, h: 2.6, y: 0 }));

  // ===================== GÖRÜNMEZ ÇARPIŞMALAR (süslerin katı olması için) =====================
  // m: 'yok' → çizilmez, sadece içinden geçilmez
  D.push({ x: 16, z: 28, r: 2.0, y0: 2.4, y1: 5.6, m: 'yok' }); D.push({ x: -31, z: 38, r: 2.0, y0: 2.8, y1: 6.0, m: 'yok' });   // ağaç tepeleri
  for (const dx of [-1.0, 1.0]) kutu(-6 + dx - 0.08, -6 + dx + 0.08, 0, 2.5, 35.92, 36.08, 'yok');                              // kuyu direkleri
  kutu(-7.3, -4.7, 2.44, 2.62, 35.1, 36.9, 'yok');                                                                             // kuyu çatısı
  {
    const E = { x0: -24.4, x1: 24.4, z0: -18.4, z1: 18.4 };
    kutu(E.x0 - 0.22, -2.5, 0, 1.0, E.z1, E.z1 + 0.22, 'yok'); kutu(2.5, E.x1 + 0.22, 0, 1.0, E.z1, E.z1 + 0.22, 'yok');       // taş kaide
    kutu(E.x0 - 0.22, E.x1 + 0.22, 0, 1.0, E.z0 - 0.22, E.z0, 'yok');
    kutu(E.x0 - 0.22, E.x0, 0, 1.0, E.z0, E.z1, 'yok'); kutu(E.x1, E.x1 + 0.22, 0, 1.0, E.z0, E.z1, 'yok');
    for (const [x, z] of [[E.x0, E.z0], [E.x1, E.z0], [E.x0, E.z1], [E.x1, E.z1]]) kutu(x - 0.45, x + 0.45, 0, 13.1, z - 0.45, z + 0.45, 'yok');   // köşe taşları
    kutu(-3.0, -2.5, 0, 4.6, E.z1, E.z1 + 0.36, 'yok'); kutu(2.5, 3.0, 0, 4.6, E.z1, E.z1 + 0.36, 'yok');                        // kapı kemeri
    kutu(-3.2, 3.2, 0, 0.16, E.z1, E.z1 + 1.5, 'yok');                                                                           // basamak
    for (let i = 0; i < 22; i++) { const x = -22 + i * 2.1; if (Math.abs(x) < 4) continue; const r = 0.55 + (i % 3) * 0.15; D.push({ x, z: E.z1 + 0.9, r: r * 0.9, y0: 0, y1: r * 1.45, m: 'yok' }); }   // çalılar
  }
  // Büyük eşyaların olası yerleri: [türler, x, z, y]
  const BUYUK_YER = [
    [['kanepe', 'piyano'], 0, 7, KAT1], [['piyano', 'buyukSaat'], -3, 14.5, KAT1], [['buyukSaat'], 3.4, -17.2, KAT1], [['kanepe'], -10, 8, KAT1], [['buyukSaksi'], -5, -12.5, KAT1],
    [['kanepe'], 15, 5, KAT1], [['buyukSaksi', 'heykel'], 20, -14, KAT1],
    [['buyukSaksi'], -21.5, 11.5, 0], [['buyukSaksi'], 21.5, 14.6, 0], [['buyukSaat'], 13, 0.5, 0], [['kanepe'], -18.5, -1, 0],
    [['buyukSaksi'], -4.6, 20.4, 0], [['buyukSaksi'], 4.6, 20.4, 0], [['heykel'], 8, 31, 0], [['heykel'], -13, 21.5, 0], [['elArabasi'], 23, 31, 0], [['elArabasi'], -24, 26, 0], [['heykel'], 30, 0, 0],
    [['heykel'], -8, -2, CATI], [['buyukSaksi'], 10, 16, CATI], [['buyukSaksi'], -20, -16, CATI],
    [['elArabasi'], 4, -12, BODRUM], [['heykel'], -14, -15, BODRUM],
  ];

  // Asılı süsler de katı (tablo, pencere gibi düz duvar süsleri hariç)
  const SH_KATI = SH.filter(s => ['avize', 'fener', 'asiliTencere', 'direkFener'].includes(s.tip));

  // Avcıların başladığı yer (bahçe kapısı)
  const KAPI = { x: 0, z: 39.4 };

  function rastgele(tohum) {
    let a = (tohum >>> 0) || 1;
    return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }

  // Silindir (x,z,r) [y, y+h] bir şeye çarpıyor mu?
  function carpar(x, z, r, y, h, esyalar, haric) {
    for (const k of K) {
      if (y + h <= k.y0 + 0.001 || y >= k.y1 - 0.001) continue;
      const cx = Math.max(k.x0, Math.min(k.x1, x)), cz = Math.max(k.z0, Math.min(k.z1, z));
      if (Math.hypot(x - cx, z - cz) < r - 0.005) return true;
    }
    for (const d of D) { if (y + h > d.y0 && y < d.y1 && Math.hypot(x - d.x, z - d.z) < d.r + r) return true; }
    for (const d of SH_KATI) { if (y + h > d.y && y < d.y + d.h && Math.hypot(x - d.x, z - d.z) < d.r * 0.8 + r) return true; }
    if (esyalar) for (const e of esyalar) { if (e === haric) continue; if (y + h > e.y + 0.001 && y < e.y + e.h - 0.001 && Math.hypot(x - e.x, z - e.z) < e.r + r) return true; }
    return x < SINIR.x0 + r || x > SINIR.x1 - r || z < SINIR.z0 + r || z > SINIR.z1 - r;
  }

  // Bir turun eşya yerlerini üret: her eşya kendi bölgesinde, az ve çeşitli
  function uret(tohum) {
    const r = rastgele(tohum);
    const esyalar = [];
    const sec = d => d[Math.floor(r() * d.length)];
    const sayac = {};
    function koy(t, x, z, y) {
      const T = TURLER[TUR_NO[t]];
      if ((sayac[t] || 0) >= (T.sert ? 22 : 14)) return false;   // aynı eşyadan çok olmasın
      if (carpar(x, z, T.r, y, T.h, esyalar)) return false;
      if (Math.abs(zeminHesap(esyalar, x, z, y + 0.05, Math.min(0.08, T.r * 0.5)) - y) > 0.03) return false;   // altı boş olmasın
      sayac[t] = (sayac[t] || 0) + 1;
      esyalar.push({ id: esyalar.length, t: TUR_NO[t], x: +x.toFixed(2), y: +y.toFixed(3), z: +z.toFixed(2), yon: +(r() * 6.283).toFixed(2), r: T.r, h: T.h, sert: !!T.sert });
      return true;
    }
    // fıçı, sandık, saman kümeleri
    const kumeler = [
      ['mutfak', -20, -12, 0], ['mutfak', 12.5, -12, 0], ['mutfak', 20, 13, 0], ['mutfak', -9, 15.8, 0], ['mutfak', 20.5, -2, 0],
      ['bodrum', -12, 1, BODRUM], ['bodrum', 4, -12, BODRUM], ['bodrum', -2, -1, BODRUM], ['bodrum', 5, -4, BODRUM],
      ['simya', 20, -6, KAT1], ['simya', 10, 10, KAT1], ['mutfak', -12, 14, KAT1],
      ['bahce', 12, 40, 0], ['bahce', -20, 40, 0], ['bahce', 30, 22, 0], ['bahce', -26, -2, 0],
    ];
    kumeler.forEach(([set, cx, cz, y]) => {
      const n = 2 + Math.floor(r() * 3);
      for (let i = 0, deneme = 0; i < n && deneme < 40; deneme++) {
        const t = sec(SERT_SET[set]), x = cx + (r() - 0.5) * 3.2, z = cz + (r() - 0.5) * 3.2;
        if (Math.hypot(x - KAPI.x, z - KAPI.z) < 4) continue;
        if (koy(t, x, z, y)) i++;
      }
    });
    // büyük eşyalar (kanepe, piyano, heykel…) kendi yerlerinde
    BUYUK_YER.forEach(([turler, x, z, y]) => { if (r() < 0.8) koy(sec(turler), x + (r() - 0.5) * 0.6, z + (r() - 0.5) * 0.6, y); });
    // fıçı ve sandıkların üstüne birer küçük eşya
    esyalar.filter(e => e.sert && TURLER[e.t].k !== 'tabure').forEach(e => {
      if (r() < 0.35) { const s = e.y < -1 ? 'bodrumMasa' : e.y > 6 ? 'simya' : e.z > 18 ? 'kuyu' : 'kiler'; const t = sec(SETLER[s]); const T = TURLER[TUR_NO[t]]; if (T.r < e.r) koy(t, e.x, e.z, e.y + e.h); }
    });
    // mobilyaların içi ve üstü
    Y.forEach(s => {
      if (!SETLER[s.set] || !SETLER[s.set].length) return;
      const alan = (s.x1 - s.x0) * (s.z1 - s.z0);
      const n = Math.min(s.en, Math.floor(alan * s.yog * 0.3 + r()));
      const uygun = SETLER[s.set].filter(k => { const T = TURLER[TUR_NO[k]]; return T.h + 0.02 <= s.bos && 2 * T.r <= Math.min(s.x1 - s.x0, s.z1 - s.z0) + 0.02 && !T.sert; });
      if (!uygun.length) return;
      for (let i = 0, deneme = 0; i < n && deneme < n * 10; deneme++) {
        const t = sec(uygun), T = TURLER[TUR_NO[t]];
        const x = s.x0 + T.r + r() * Math.max(0, s.x1 - s.x0 - 2 * T.r), z = s.z0 + T.r + r() * Math.max(0, s.z1 - s.z0 - 2 * T.r);
        if (koy(t, x, z, s.y)) i++;
      }
    });
    return { tohum, esyalar };
  }

  // ---------- Yürüme / uçma ----------
  // Ayağın altındaki en yüksek zemin (y'nin biraz üstüne kadar)
  function zeminHesap(esyalar, x, z, y, r = 0.05, haric) {
    let zemin = SINIR.y0;
    for (const k of K) if (k.y1 <= y && x > k.x0 - r && x < k.x1 + r && z > k.z0 - r && z < k.z1 + r) zemin = Math.max(zemin, k.y1);
    for (const d of D) if (d.y1 <= y && Math.hypot(x - d.x, z - d.z) < d.r + r) zemin = Math.max(zemin, d.y1);
    if (esyalar) for (const e of esyalar) if (e !== haric && e.y + e.h <= y && Math.hypot(x - e.x, z - e.z) < e.r + r) zemin = Math.max(zemin, e.y + e.h);
    return zemin;
  }
  // (x, z) noktasını engellerden dışarı iter; ayağın altındaki zemini ve kafanın üstündeki tavanı bulur.
  // y = ayak yüksekliği, r = gövde yarıçapı, boy = kaç metre uzun. haric = kendisi (eşya uçarken)
  function hareket(H, x, z, y, r, boy = 1, haric = null) {
    let zemin = SINIR.y0, tavan = SINIR.y1;
    const basamak = 0.3;
    for (const k of K) {
      const icinde = x > k.x0 && x < k.x1 && z > k.z0 && z < k.z1;
      const cx = Math.max(k.x0, Math.min(k.x1, x)), cz = Math.max(k.z0, Math.min(k.z1, z));
      const dx = x - cx, dz = z - cz, d = Math.hypot(dx, dz);
      if (k.y1 <= y + basamak) { if (icinde || d < r * 0.5) zemin = Math.max(zemin, k.y1); continue; }
      if (k.y0 >= y + boy - 0.05) { if (icinde || d < r * 0.7) tavan = Math.min(tavan, k.y0); continue; }
      if (icinde) {
        const sol = x - k.x0, sag = k.x1 - x, on = z - k.z0, arka = k.z1 - z, en = Math.min(sol, sag, on, arka);
        if (en === sol) x = k.x0 - r; else if (en === sag) x = k.x1 + r; else if (en === on) z = k.z0 - r; else z = k.z1 + r;
      } else if (d < r) { x = cx + dx / (d || 1) * r; z = cz + dz / (d || 1) * r; }
    }
    const daire = (cx, cz, cr, y0, y1, bas) => {
      const dx = x - cx, dz = z - cz, d = Math.hypot(dx, dz) || 0.001;
      if (y1 <= y + bas) { if (d < cr + r * 0.4) zemin = Math.max(zemin, y1); return; }
      if (y0 >= y + boy - 0.05) { if (d < cr + r * 0.6) tavan = Math.min(tavan, y0); return; }
      if (d < cr + r) { x = cx + dx / d * (cr + r); z = cz + dz / d * (cr + r); }
    };
    D.forEach(d => daire(d.x, d.z, d.r, d.y0, d.y1, basamak));
    SH_KATI.forEach(d => daire(d.x, d.z, d.r * 0.8, d.y, d.y + d.h, 0.05));
    if (H) for (const e of H.esyalar) { if (e !== haric) daire(e.x, e.z, e.r, e.y, e.y + e.h, Math.min(basamak, e.h * 0.6)); }
    x = Math.max(SINIR.x0 + r, Math.min(SINIR.x1 - r, x));
    z = Math.max(SINIR.z0 + r, Math.min(SINIR.z1 - r, z));
    return { x, z, zemin, tavan };
  }
  function zeminBul(H, x, z, y, r = 0.05) { return zeminHesap(H ? H.esyalar : null, x, z, y, r); }
  // Eşya olarak (x, y, z)'ye sığar mı? Sığarsa düzeltilmiş yeri verir
  function sigar(H, t, x, y, z) {
    const T = TURLER[t]; if (!T) return null;
    const zem = zeminBul(H, x, z, y + 0.05);
    if (Math.abs(zem - y) > 0.35) return null;
    let p = { x, z };
    for (let i = 0; i < 3; i++) p = hareket(H, p.x, p.z, zem, T.r, T.h);
    if (Math.hypot(p.x - x, p.z - z) > T.r + 0.25) return null;
    const son = hareket(H, p.x, p.z, zem, T.r, T.h);
    if (son.tavan - zem < T.h - 0.02) return null;
    if (carpar(son.x, son.z, T.r * 0.9, zem + 0.02, T.h - 0.04, H.esyalar)) return null;
    return { x: +son.x.toFixed(2), y: +zeminBul(H, son.x, son.z, zem + 0.05).toFixed(3), z: +son.z.toFixed(2) };
  }
  // Vurulan eşya yerinden fırlar: yolunu hesapla (herkes aynı yolu izler)
  function firlat(H, e, dx, dz, rnd = Math.random) {
    const L = Math.hypot(dx, dz) || 1;
    const hiz = 4 + rnd() * 2.5;
    let vx = dx / L * hiz + (rnd() - 0.5) * 1.5, vz = dz / L * hiz + (rnd() - 0.5) * 1.5, vy = 3.5 + rnd() * 2;
    let x = e.x, y = e.y, z = e.z;
    const yol = [[+x.toFixed(2), +y.toFixed(2), +z.toFixed(2)]];
    const dt = 0.02;
    let sekme = 0;
    for (let i = 1; i <= 200; i++) {
      vy -= 14 * dt;
      const h = hareket(H, x + vx * dt, z + vz * dt, y, e.r, e.h, e);
      if (Math.abs(h.x - (x + vx * dt)) > 1e-4) vx *= -0.4;
      if (Math.abs(h.z - (z + vz * dt)) > 1e-4) vz *= -0.4;
      x = h.x; z = h.z;
      y += vy * dt;
      if (y + e.h > h.tavan) { y = h.tavan - e.h; vy = -Math.abs(vy) * 0.3; }
      if (y <= h.zemin) {
        y = h.zemin;
        if (sekme < 1 && vy < -3) { vy = -vy * 0.35; vx *= 0.5; vz *= 0.5; sekme++; }
        else { if (i % 5) yol.push([+x.toFixed(2), +y.toFixed(3), +z.toFixed(2)]); break; }
      }
      if (i % 5 === 0) yol.push([+x.toFixed(2), +y.toFixed(3), +z.toFixed(2)]);
    }
    const son = yol[yol.length - 1];
    son[1] = +zeminBul(H, son[0], son[2], son[1] + 0.05).toFixed(3);
    return yol;
  }

  // ---------- Işın (vuruş) ----------
  function silindirIsin(o, d, x, y0, z, r, h) {
    let en = Infinity;
    const ox = o[0] - x, oz = o[2] - z;
    const a = d[0] * d[0] + d[2] * d[2];
    if (a > 1e-9) {
      const b = 2 * (ox * d[0] + oz * d[2]), c = ox * ox + oz * oz - r * r, Dd = b * b - 4 * a * c;
      if (Dd >= 0) {
        const s = Math.sqrt(Dd);
        for (const t of [(-b - s) / (2 * a), (-b + s) / (2 * a)]) {
          if (t < 0) continue;
          const yy = o[1] + d[1] * t;
          if (yy >= y0 && yy <= y0 + h) { en = Math.min(en, t); break; }
        }
      }
    }
    if (Math.abs(d[1]) > 1e-9) {
      for (const yy of [y0 + h, y0]) {
        const t = (yy - o[1]) / d[1];
        if (t < 0) continue;
        const px = o[0] + d[0] * t - x, pz = o[2] + d[2] * t - z;
        if (px * px + pz * pz <= r * r) en = Math.min(en, t);
      }
    }
    return en;
  }
  function kutuIsin(o, d, k) {
    let t0 = 0, t1 = Infinity;
    const mn = [k.x0, k.y0, k.z0], mx = [k.x1, k.y1, k.z1];
    for (let i = 0; i < 3; i++) {
      if (Math.abs(d[i]) < 1e-9) { if (o[i] < mn[i] || o[i] > mx[i]) return Infinity; continue; }
      let a = (mn[i] - o[i]) / d[i], b = (mx[i] - o[i]) / d[i];
      if (a > b) [a, b] = [b, a];
      t0 = Math.max(t0, a); t1 = Math.min(t1, b);
      if (t0 > t1) return Infinity;
    }
    return t0;
  }
  // o = başlangıç, d = birim yön. hedefler: [{tip, ref, x, y, z, r, h}]. susler: true → süsler de hedef
  // Dönüş: { t, tip: 'duvar' | 'mobilya' | 'esya' | 'sus' | hedef tipi | 'bos', ref, nokta }
  function isin(H, o, d, menzil, hedefler = [], susler = false) {
    let en = { t: menzil, tip: 'bos', ref: null };
    const dene = (t, tip, ref) => { if (t < en.t) en = { t, tip, ref }; };
    const lo = [SINIR.x0, SINIR.y0, SINIR.z0], hi = [SINIR.x1, SINIR.y1, SINIR.z1];
    for (let i = 0; i < 3; i++) { if (Math.abs(d[i]) < 1e-9) continue; dene(((d[i] > 0 ? hi[i] : lo[i]) - o[i]) / d[i], 'duvar', null); }
    for (const k of K) dene(kutuIsin(o, d, k), 'mobilya', k);
    for (const m of D) dene(silindirIsin(o, d, m.x, m.y0, m.z, m.r, m.y1 - m.y0), 'mobilya', m);
    if (H) for (const e of H.esyalar) dene(silindirIsin(o, d, e.x, e.y, e.z, e.r, e.h), 'esya', e);
    if (susler) for (const s of SH) if (s.r > 0 && (susler === 'secim' || !s.vurulmaz)) dene(silindirIsin(o, d, s.x, s.y, s.z, s.r, s.h), 'sus', s);
    for (const h of hedefler) dene(silindirIsin(o, d, h.x, h.y, h.z, h.r, h.h), h.tip, h.ref);
    en.nokta = [o[0] + d[0] * en.t, o[1] + d[1] * en.t, o[2] + d[2] * en.t];
    return en;
  }

  // Oyuncunun vurulabilir silindiri: tur -1 = cadı
  function govde(tur, avci) {
    if (avci) return { r: R_ASCI, h: BOY_ASCI };
    if (tur >= 0 && TURLER[tur]) return { r: Math.max(0.15, TURLER[tur].r), h: Math.max(0.15, TURLER[tur].h) };
    return { r: R_CADI, h: BOY_CADI };
  }
  // Hareket ederken çarpışma yarıçapı (duvar eşyaları ince)
  function carpR(tur, avci) { const g = govde(tur, avci); return tur >= 0 && TURLER[tur] && TURLER[tur].rc ? TURLER[tur].rc : g.r; }
  // Bulunulan yerin adı
  function bolge(x, y, z) {
    const icerde = x > EV.x0 && x < EV.x1 && z > EV.z0 && z < EV.z1;
    if (y > CATI_ALT + 0.2) return icerde ? '🏠 Çatı' : '☁️ Gökyüzü';
    if (!icerde) return y > KAT1_ALT ? '🌙 Balkon / dışarı' : '🌳 Bahçe';
    if (y < -0.3) return '🍷 Bodrum';
    if (y < KAT1_ALT) return '🍲 Mutfak';
    return x < -6 ? '🛏️ Yatak odası' : x > 6 ? '⚗️ Simya odası' : '🪜 Üst kat';
  }

  return { GEN, DER, TAVAN, KAT1, KAT1_ALT, CATI, CATI_ALT, BODRUM, SINIR, EV, TURLER, TUR_NO, KUTULAR: K, DAIRELER: D, YUZEYLER: Y, SUSLER: S, SUS_HEDEF: SH, KAPI, KULUBE, SUS_TUR, BOY_CADI, R_CADI, BOY_ASCI, R_ASCI, rastgele, uret, hareket, zeminBul, sigar, carpar, isin, govde, carpR, firlat, bolge };
})();

if (typeof module !== 'undefined') module.exports = Harita;
