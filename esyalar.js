// =============================================================
// Sihirli Kiler - EŞYALAR ve HARİTA (büyük büyücü mutfağı)
// Mobilyalar ince tahtalardan (kutulardan) yapılır; böylece açık dolapların, çekmecelerin,
// buzdolabının içine girilebilir. Küçük eşyaların yeri "tohum" sayısından üretilir:
// herkes aynı tohumla aynı mutfağı görür. Çarpışma ve ışın hesapları da burada. Node'da da çalışır.
// =============================================================

const Harita = (() => {
  const GEN = 24, DER = 18, TAVAN = 7;      // oda: x -24..24, z -18..18
  const BOY_CADI = 1.15, R_CADI = 0.34;     // süpürgeli cadı (saklanan)
  const BOY_ASCI = 1.75, R_ASCI = 0.38;     // aşçı (avcı)

  // Eşya türleri: r = yarıçap, h = yükseklik, sert = üstüne çıkılır / içinden geçilmez
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
  ];
  const TUR_NO = Object.fromEntries(TURLER.map((t, i) => [t.k, i]));
  const SETLER = {
    yemek: ['elma', 'havuc', 'peynir', 'ekmek', 'lahana', 'mantar', 'but', 'kase', 'tabak', 'sepet', 'kabak', 'yumurta', 'kurabiye'],
    mutfak: ['tencere', 'caydanlik', 'kupa', 'kase', 'tabak', 'tuzluk', 'kavanoz', 'testi', 'sut', 'kurabiye', 'ekmek'],
    buyu: ['iksir', 'mum', 'kitap', 'baykus', 'mantar', 'kavanoz', 'kafatasi', 'kristal', 'iksir', 'mum'],
    soguk: ['sut', 'peynir', 'but', 'kavanoz', 'elma', 'havuc', 'lahana', 'kase', 'yumurta', 'sut', 'iksir'],
    kucuk: ['elma', 'kupa', 'tuzluk', 'mum', 'iksir', 'mantar', 'havuc', 'yumurta', 'kafatasi', 'kase', 'sut'],
    kiler: ['cuval', 'kavanoz', 'testi', 'sepet', 'kabak', 'lahana', 'kurabiye', 'ekmek', 'peynir', 'sut'],
    yer: ['kabak', 'sepet', 'cuval', 'testi', 'tencere', 'lahana', 'kitap', 'cicek', 'kazancik', 'mantar', 'peynir', 'baykus', 'sut'],
    sert: ['fici', 'sandik', 'fici', 'tabure', 'sandik'],
  };

  // ================= MOBİLYALAR =================
  // K: içinden geçilmez kutular {x0,x1,y0,y1,z0,z1,m}  D: silindirler {x,z,r,y0,y1,m}
  // Y: eşya konulabilecek yüzeyler {x0,x1,z0,z1,y,bos,set,yog}   S: süsler (sadece görüntü)
  const K = [], D = [], Y = [], S = [];
  const kutu = (x0, x1, y0, y1, z0, z1, m) => K.push({ x0: Math.min(x0, x1), x1: Math.max(x0, x1), y0, y1, z0: Math.min(z0, z1), z1: Math.max(z0, z1), m });
  const yuzey = (x0, x1, z0, z1, y, bos, set, yog) => Y.push({ x0: Math.min(x0, x1), x1: Math.max(x0, x1), z0: Math.min(z0, z1), z1: Math.max(z0, z1), y, bos, set, yog });
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
      y: (a0, a1, b0, b1, y, bos, set, yog) => { const q = r(a0, a1, b0, b1); yuzey(q[0], q[1], q[2], q[3], y, bos, set, yog); },
      n: (a, b) => { const q = r(a, a, b, b); return [q[0], q[2]]; },
    };
  }
  // Açık raflı dolap (buzdolabı, kiler rafı, kitaplık…). arka: false → iki yüzü de açık
  function rafDolap(o) {
    const { x0, x1, z0, z1, h, raflar = [], on = 'z+', m = 'ahsap', ic = m, set, yog = 4, kapak = 0, arka = true, yb = 0, ust = true } = o;
    const L = yon(x0, x1, z0, z1, on), kal = 0.07;
    if (arka) L.k(0, L.W, yb, yb + h, 0, kal, m);
    L.k(0, kal, yb, yb + h, 0, L.D, m); L.k(L.W - kal, L.W, yb, yb + h, 0, L.D, m);
    L.k(0, L.W, yb + h - kal, yb + h, 0, L.D, m);
    L.k(kal, L.W - kal, yb, yb + 0.1, 0, L.D, m);
    const seviyeler = [yb + 0.1];
    raflar.forEach(ry => { L.k(kal, L.W - kal, yb + ry, yb + ry + 0.05, arka ? kal : 0, L.D, ic); seviyeler.push(yb + ry + 0.05); });
    const tavanlar = [...raflar.map(ry => yb + ry), yb + h - kal];
    seviyeler.forEach((sy, i) => L.y(kal, L.W - kal, arka ? kal : 0, L.D, sy, tavanlar[i] - sy, set, yog));
    if (ust) L.y(0, L.W, 0, L.D, yb + h, 2, set, yog * 0.3);
    // Açık kapaklar: menteşeden 90 derece dışarı açılmış
    if (kapak >= 1) L.k(-0.06, 0, yb + 0.12, yb + h - 0.08, L.D, L.D + (kapak === 2 ? L.W / 2 : L.W), m + 'Kapak');
    if (kapak === 2) L.k(L.W, L.W + 0.06, yb + 0.12, yb + h - 0.08, L.D, L.D + L.W / 2, m + 'Kapak');
    return L;
  }
  // Tezgah: parçalar = [[başlangıç, bitiş, tür]] tür: 'dolu' | 'dolap' | 'cekmece' | 'lavabo'
  function tezgah(o) {
    const { x0, x1, z0, z1, h = 1.0, on, parcalar, m = 'ahsap' } = o;
    const L = yon(x0, x1, z0, z1, on), ust = 0.08;
    parcalar.forEach(([a, b, tur]) => {
      if (tur === 'lavabo') {
        // taş lavabo: tezgahın üstünde çukur
        L.k(a, b, 0, h - 0.45, 0, L.D, m);
        L.k(a, b, h - 0.45, h - 0.38, 0, L.D, 'tas');
        L.k(a, a + 0.12, h - 0.38, h, 0, L.D + 0.04, 'tas'); L.k(b - 0.12, b, h - 0.38, h, 0, L.D + 0.04, 'tas');
        L.k(a + 0.12, b - 0.12, h - 0.38, h, 0, 0.15, 'tas'); L.k(a + 0.12, b - 0.12, h - 0.38, h, L.D - 0.08, L.D + 0.04, 'tas');
        L.y(a + 0.12, b - 0.12, 0.15, L.D - 0.08, h - 0.38, 1.5, 'mutfak', 3);
        S.push({ tip: 'musluk', n: L.n((a + b) / 2, 0.08), y: h, on });
        return;
      }
      L.k(a, b, h - ust, h, 0, L.D + 0.04, m + 'Ust');
      if (tur === 'dolap') {
        L.k(a, b, 0, 0.1, 0, L.D, m);
        L.k(a, a + 0.06, 0.1, h - ust, 0, L.D, m); L.k(b - 0.06, b, 0.1, h - ust, 0, L.D, m);
        L.k(a + 0.06, b - 0.06, 0.1, h - ust, 0, 0.06, m);
        L.k(a + 0.06, b - 0.06, 0.48, 0.52, 0.06, L.D, m);
        L.y(a + 0.06, b - 0.06, 0.06, L.D, 0.1, 0.38, 'mutfak', 5);
        L.y(a + 0.06, b - 0.06, 0.06, L.D, 0.52, h - ust - 0.52, 'mutfak', 5);
        L.k(a - 0.05, a, 0.12, h - ust - 0.04, L.D, L.D + (b - a) - 0.05, m + 'Kapak');
      } else {
        L.k(a, b, 0, h - ust, 0, L.D - 0.02, m);
        if (tur === 'cekmece') {
          // dışarı çekilmiş çekmece
          const y0 = h - 0.36, d0 = L.D - 0.02, d1 = L.D + 0.55;
          L.k(a + 0.06, b - 0.06, y0, y0 + 0.03, d0, d1, m + 'Kapak');
          L.k(a + 0.06, a + 0.1, y0, y0 + 0.24, d0, d1, m + 'Kapak'); L.k(b - 0.1, b - 0.06, y0, y0 + 0.24, d0, d1, m + 'Kapak');
          L.k(a + 0.06, b - 0.06, y0 - 0.04, y0 + 0.26, d1, d1 + 0.04, m);
          L.y(a + 0.1, b - 0.1, d0, d1, y0 + 0.03, 0.27, 'kucuk', 9);
          S.push({ tip: 'kulp', n: L.n((a + b) / 2, d1 + 0.05), y: y0 + 0.13, on });
        }
      }
    });
    L.y(0, L.W, 0.05, L.D, h, 3, o.set || 'mutfak', o.yog || 1.6);
  }
  function masa(x0, x1, z0, z1, h, m, set, yog) {
    kutu(x0, x1, h - 0.08, h, z0, z1, m + 'Ust');
    [[x0 + 0.08, z0 + 0.08], [x1 - 0.18, z0 + 0.08], [x0 + 0.08, z1 - 0.18], [x1 - 0.18, z1 - 0.18]].forEach(([x, z]) => kutu(x, x + 0.1, 0, h - 0.08, z, z + 0.1, m));
    yuzey(x0 + 0.05, x1 - 0.05, z0 + 0.05, z1 - 0.05, h, 3, set, yog);
    yuzey(x0 + 0.25, x1 - 0.25, z0 + 0.25, z1 - 0.25, 0, h - 0.1, 'yer', 0.5);
  }
  function sandalye(x, z, yonu) {
    kutu(x - 0.25, x + 0.25, 0.45, 0.5, z - 0.25, z + 0.25, 'ahsap');
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => kutu(x + a * 0.2 - 0.03, x + a * 0.2 + 0.03, 0, 0.45, z + b * 0.2 - 0.03, z + b * 0.2 + 0.03, 'koyu'));
    const bz = z + yonu * 0.22;
    kutu(x - 0.25, x + 0.25, 0.5, 1.1, bz - 0.03, bz + 0.03, 'ahsap');
    yuzey(x - 0.2, x + 0.2, z - 0.2, z + 0.2, 0.5, 0.55, 'yemek', 3);
  }
  function duvarRafi(x0, x1, z0, z1, y, bos, set, yog) {
    kutu(x0, x1, y - 0.05, y, z0, z1, 'koyu');
    yuzey(x0, x1, z0, z1, y, bos, set, yog);
  }

  // --- Arka duvar (z = -18) ---
  rafDolap({ x0: -23.6, x1: -19.4, z0: -18, z1: -16.9, h: 3.0, raflar: [0.8, 1.55, 2.3], set: 'kiler', yog: 4 });
  rafDolap({ x0: -17.2, x1: -14.8, z0: -18, z1: -16.8, h: 3.0, raflar: [0.65, 1.25, 1.85, 2.45], m: 'buz', set: 'soguk', yog: 6, kapak: 2 });
  S.push({ tip: 'buzIsik', x: -16, y: 2.85, z: -17.4 });
  duvarRafi(-12.8, -8, -18, -17.5, 1.7, 0.75, 'buyu', 4);
  duvarRafi(-12.8, -8, -18, -17.5, 2.5, 0.75, 'buyu', 4);
  duvarRafi(-12.8, -8, -18, -17.5, 3.3, 1.2, 'mutfak', 3);
  rafDolap({ x0: -7.6, x1: -5.4, z0: -18, z1: -17.3, h: 2.2, raflar: [0.7, 1.4], m: 'mor', set: 'buyu', yog: 6, kapak: 1 });
  // şömine
  kutu(-4.5, -3.3, 0, 2.4, -18, -16.4, 'tas'); kutu(3.3, 4.5, 0, 2.4, -18, -16.4, 'tas');
  kutu(-3.3, 3.3, 0, 2.4, -18, -17.5, 'tasKoyu');
  kutu(-3.3, 3.3, 0, 0.15, -17.5, -16.4, 'tas');
  kutu(-3.3, 3.3, 1.8, 2.4, -18, -16.4, 'tas');
  kutu(-5, 5, 2.4, 2.55, -18, -16.1, 'koyu');
  yuzey(-4.9, 4.9, -17.9, -16.2, 2.55, 1.3, 'buyu', 2.5);
  kutu(-3.6, 3.6, 2.55, TAVAN, -18, -16.9, 'tas');
  S.push({ tip: 'ates', x: 0, y: 0.15, z: -17.1, en: 4.5 });
  rafDolap({ x0: 6.6, x1: 10.6, z0: -18, z1: -16.9, h: 3.2, raflar: [0.8, 1.6, 2.4], m: 'yesil', set: 'mutfak', yog: 4.5, kapak: 2 });
  duvarRafi(11.6, 14.2, -18, -17.5, 1.9, 0.9, 'mutfak', 3);
  duvarRafi(11.6, 14.2, -18, -17.5, 2.8, 1.2, 'buyu', 3);
  // ekmek fırını
  kutu(15, 21, 0, 1.0, -18, -14, 'tas');
  kutu(15.6, 20.4, 1.0, 2.6, -18, -14.6, 'tugla');
  yuzey(15.05, 20.95, -14.55, -14.05, 1.0, 1.5, 'yemek', 6);
  S.push({ tip: 'firin', x: 18, y: 1.0, z: -14.6 });
  // köşede kasalar
  kutu(21.4, 24, 0, 1.2, -18, -15.6, 'kasa'); kutu(21.8, 24, 1.2, 2.3, -18, -16.2, 'kasa');
  yuzey(21.45, 23.95, -15.55, -16.2, 1.2, 2, 'kiler', 3); yuzey(21.85, 23.95, -17.95, -16.25, 2.3, 2, 'kiler', 2);

  // --- Sol duvar (x = -24) ---
  tezgah({ x0: -24, x1: -22.8, z0: -14.5, z1: 4, on: 'x+', parcalar: [[0, 1.6, 'dolu'], [1.6, 3.6, 'dolap'], [3.6, 5.1, 'cekmece'], [5.1, 7.3, 'lavabo'], [7.3, 8.8, 'cekmece'], [8.8, 11, 'dolap'], [11, 12.5, 'cekmece'], [12.5, 14.4, 'dolu'], [14.4, 16.6, 'dolap'], [16.6, 18.5, 'cekmece']] });
  duvarRafi(-24, -23.5, -13, 3, 1.9, 0.75, 'mutfak', 3);
  duvarRafi(-24, -23.5, -13, 3, 2.7, 0.75, 'kucuk', 3);
  duvarRafi(-24, -23.5, -13, 3, 3.5, 1.4, 'buyu', 2);
  rafDolap({ x0: -24, x1: -22.8, z0: 6.6, z1: 9.4, h: 2.6, raflar: [1.0, 1.8], on: 'x+', m: 'kirmizi', set: 'yer', yog: 3, kapak: 1 });
  // odun yığını
  kutu(-24, -20.4, 0, 1.2, 14.2, 18, 'odun');
  yuzey(-23.9, -20.5, 14.3, 17.9, 1.2, 2, 'kiler', 1);
  // kitaplık (iki yüzü açık)
  rafDolap({ x0: -17.2, x1: -16.3, z0: -10, z1: -3, h: 2.7, raflar: [0.65, 1.3, 1.95], on: 'x+', arka: false, set: 'buyu', yog: 5 });

  // --- Sağ duvar (x = 24) ---
  tezgah({ x0: 22.8, x1: 24, z0: -10, z1: 10, on: 'x-', parcalar: [[0, 1.8, 'cekmece'], [1.8, 4, 'dolap'], [4, 5.5, 'cekmece'], [5.5, 7.6, 'dolu'], [7.6, 9.8, 'lavabo'], [9.8, 11.3, 'cekmece'], [11.3, 13.5, 'dolap'], [13.5, 15, 'cekmece'], [15, 17.6, 'dolap'], [17.6, 20, 'cekmece']], set: 'yemek', yog: 2 });
  rafDolap({ x0: 23.5, x1: 24, z0: -7, z1: 1, h: 1.6, raflar: [0.55, 1.05], on: 'x-', m: 'koyu', set: 'kucuk', yog: 7, yb: 1.7 });
  duvarRafi(23.4, 24, 3, 9.5, 2.2, 0.8, 'mutfak', 3);
  duvarRafi(23.4, 24, 3, 9.5, 3.0, 1.2, 'buyu', 3);

  // --- Ön duvar (z = 18) ---
  rafDolap({ x0: 13.6, x1: 19, z0: 16.9, z1: 18, h: 2.6, raflar: [0.85, 1.7], on: 'z-', set: 'kiler', yog: 4 });
  kutu(8, 10.6, 0, 1.1, 15.4, 18, 'kasa'); kutu(8.3, 10.3, 1.1, 2.1, 16.2, 18, 'kasa'); kutu(10.6, 12, 0, 0.8, 16.6, 18, 'kasa');
  yuzey(8.05, 10.55, 15.45, 16.15, 1.1, 2, 'kiler', 3); yuzey(8.35, 10.25, 16.25, 17.95, 2.1, 2, 'kiler', 2); yuzey(10.65, 11.95, 16.65, 17.95, 0.8, 2, 'kiler', 3);
  duvarRafi(-12, -5, 17.5, 18, 2.2, 0.8, 'buyu', 3);
  rafDolap({ x0: 20.6, x1: 24, z0: 16.9, z1: 18, h: 2.0, raflar: [1.0], on: 'z-', m: 'yesil', set: 'mutfak', yog: 4, kapak: 1 });

  // --- Orta ---
  D.push({ x: 0, z: -5, r: 2.2, y0: 0, y1: 1.3, m: 'kazan' });
  // yemek masası ve sandalyeler
  masa(-13, -5, 3, 5.6, 0.85, 'ahsap', 'yemek', 2.2);
  [-12, -9, -6].forEach(x => { sandalye(x, 2.3, -1); sandalye(x, 6.3, 1); });
  // ada tezgah: iki yanı açık raflı
  rafDolap({ x0: 5, x1: 12, z0: 2, z1: 4.6, h: 1.0, raflar: [0.48], arka: false, m: 'kirmizi', set: 'mutfak', yog: 4, ust: false });
  yuzey(5, 12, 2, 4.6, 1.0, 2, 'yemek', 1.8);
  // hazırlık masası, büyü masası
  masa(13, 18.5, -8.5, -5.6, 0.9, 'koyu', 'yemek', 2.5);
  masa(-6, -1, 9, 11.2, 0.85, 'mor', 'buyu', 2.5);
  sandalye(-3.5, 12, 1); sandalye(-3.5, 8.2, -1);
  // büyük kasa yığını (basamak gibi)
  kutu(15, 17.6, 0, 1.0, 8, 10.6, 'kasa'); kutu(15.3, 16.9, 1.0, 2.0, 8.3, 9.9, 'kasa');
  yuzey(15.05, 17.55, 8.05, 10.55, 1.0, 2, 'kiler', 2); yuzey(15.35, 16.85, 8.35, 9.85, 2.0, 2, 'kiler', 2);
  // yüksek asma raf (sadece uçarak)
  duvarRafi(-3, 3, 17.5, 18, 4.6, 1.5, 'buyu', 2.5);
  kutu(-20, -15, 4.4, 4.5, 13, 14.2, 'koyu'); yuzey(-20, -15, 13, 14.2, 4.5, 2, 'kiler', 2.5);   // tavana asılı raf
  S.push({ tip: 'askiRaf', x0: -20, x1: -15, z: 13.6, y: 4.5 });

  // Avcıların başladığı kapı, saklananların başladığı yer
  const KAPI = { x: 0, z: 16.4 };

  function rastgele(tohum) {
    let a = (tohum >>> 0) || 1;
    return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }

  // Silindir (x,z,r) [y, y+h] bir mobilyaya çarpıyor mu?
  function carpar(x, z, r, y, h, ekSertler) {
    for (const k of K) {
      if (y + h <= k.y0 + 0.001 || y >= k.y1 - 0.001) continue;
      const cx = Math.max(k.x0, Math.min(k.x1, x)), cz = Math.max(k.z0, Math.min(k.z1, z));
      if (Math.hypot(x - cx, z - cz) < r - 0.005) return true;
    }
    for (const d of D) { if (y + h > d.y0 && y < d.y1 && Math.hypot(x - d.x, z - d.z) < d.r + r) return true; }
    if (ekSertler) for (const e of ekSertler) { if (y + h > e.y + 0.001 && y < e.y + e.h - 0.001 && Math.hypot(x - e.x, z - e.z) < e.r + r) return true; }
    return Math.abs(x) > GEN - r || Math.abs(z) > DER - r;
  }

  // Bir turun mutfağını üret: küçük eşyaların yerleri tohuma göre değişir
  function uret(tohum) {
    const r = rastgele(tohum);
    const esyalar = [], sertler = [];
    const sec = d => d[Math.floor(r() * d.length)];
    const ustUsteMi = (x, z, rr, y) => esyalar.some(e => Math.abs(e.y - y) < 0.3 && Math.hypot(e.x - x, e.z - z) < e.r + rr + 0.04);
    function koy(t, x, z, y) {
      const T = TURLER[TUR_NO[t]];
      if (ustUsteMi(x, z, T.r, y) || carpar(x, z, T.r, y, T.h, sertler)) return false;
      const e = { id: esyalar.length, t: TUR_NO[t], x: +x.toFixed(2), y: +y.toFixed(3), z: +z.toFixed(2), yon: +(r() * 6.283).toFixed(2), r: T.r, h: T.h, sert: !!T.sert };
      esyalar.push(e);
      if (e.sert) sertler.push(e);
      return true;
    }
    // Yerdeki fıçı, sandık kümeleri
    const kumeler = [[-20, -12], [-8, -14.5], [12.5, -12], [20, 13], [-18, 10.5], [-9, 15.8], [5, 15.5], [20.5, -2], [-11, -5], [2, 9]];
    kumeler.forEach(([cx, cz]) => {
      const n = 2 + Math.floor(r() * 3);
      for (let i = 0, deneme = 0; i < n && deneme < 40; deneme++) {
        const t = sec(SETLER.sert), x = cx + (r() - 0.5) * 3.2, z = cz + (r() - 0.5) * 3.2;
        if (Math.hypot(x - KAPI.x, z - KAPI.z) < 3.2) continue;
        if (koy(t, x, z, 0)) i++;
      }
    });
    // Fıçı ve sandıkların üstü de yüzeydir
    const yuzeyler = Y.slice();
    sertler.slice().forEach(e => { if (TURLER[e.t].k !== 'tabure') yuzeyler.push({ x0: e.x - e.r * 0.6, x1: e.x + e.r * 0.6, z0: e.z - e.r * 0.6, z1: e.z + e.r * 0.6, y: e.h, bos: 2, set: 'kucuk', yog: 6 }); });
    // Mobilyaların içi ve üstü
    yuzeyler.forEach(s => {
      const alan = (s.x1 - s.x0) * (s.z1 - s.z0);
      const n = Math.min(14, Math.floor(alan * s.yog * 0.36 + r()));
      const uygun = SETLER[s.set].filter(k => { const T = TURLER[TUR_NO[k]]; return T.h + 0.02 <= s.bos && 2 * T.r <= Math.min(s.x1 - s.x0, s.z1 - s.z0) + 0.02 && !T.sert; });
      if (!uygun.length) return;
      for (let i = 0, deneme = 0; i < n && deneme < n * 8; deneme++) {
        const t = sec(uygun), T = TURLER[TUR_NO[t]];
        const x = s.x0 + T.r + r() * Math.max(0, s.x1 - s.x0 - 2 * T.r), z = s.z0 + T.r + r() * Math.max(0, s.z1 - s.z0 - 2 * T.r);
        if (koy(t, x, z, s.y)) i++;
      }
    });
    // Yere dağılmış eşyalar
    for (let i = 0, deneme = 0; i < 95 && deneme < 1500; deneme++) {
      const t = sec(SETLER.yer), T = TURLER[TUR_NO[t]];
      const x = (r() * 2 - 1) * (GEN - 0.5), z = (r() * 2 - 1) * (DER - 0.5);
      if (Math.hypot(x - KAPI.x, z - KAPI.z) < 2.6) continue;
      if (koy(t, x, z, 0)) i++;
    }
    return { tohum, esyalar, sertler };
  }

  // ---------- Yürüme / uçma ----------
  // (x, z) noktasını engellerden dışarı iter; ayağın altındaki zemini ve kafanın üstündeki tavanı bulur.
  function hareket(H, x, z, y, r, boy = 1) {
    let zemin = 0, tavan = TAVAN;
    const basamak = 0.3;
    const sertler = H ? H.sertler : [];
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
    const daire = (cx, cz, cr, y0, y1) => {
      const dx = x - cx, dz = z - cz, d = Math.hypot(dx, dz) || 0.001;
      if (y1 <= y + basamak) { if (d < cr + r * 0.4) zemin = Math.max(zemin, y1); return; }
      if (y0 >= y + boy - 0.05) { if (d < cr + r * 0.6) tavan = Math.min(tavan, y0); return; }
      if (d < cr + r) { x = cx + dx / d * (cr + r); z = cz + dz / d * (cr + r); }
    };
    D.forEach(d => daire(d.x, d.z, d.r, d.y0, d.y1));
    sertler.forEach(e => daire(e.x, e.z, e.r, e.y, e.y + e.h));
    x = Math.max(-GEN + r, Math.min(GEN - r, x));
    z = Math.max(-DER + r, Math.min(DER - r, z));
    return { x, z, zemin, tavan };
  }
  // Bir noktanın altındaki en yüksek zemin (eşya yerleştirmek için)
  function zeminBul(H, x, z, y, r = 0.05) { return hareket(H, x, z, y, r, 0.05).zemin; }
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
    if (carpar(son.x, son.z, T.r * 0.9, zem + 0.02, T.h - 0.04, H.sertler)) return null;
    return { x: +son.x.toFixed(2), y: +zeminBul(H, son.x, son.z, zem + 0.05).toFixed(3), z: +son.z.toFixed(2) };
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
  // o = başlangıç, d = birim yön. hedefler: [{tip, ref, x, y, z, r, h}]
  // Dönüş: { t, tip: 'duvar' | 'mobilya' | 'esya' | hedef tipi | 'bos', ref, nokta }
  function isin(H, o, d, menzil, hedefler = [], esyaSuz = null) {
    let en = { t: menzil, tip: 'bos', ref: null };
    const dene = (t, tip, ref) => { if (t < en.t) en = { t, tip, ref }; };
    for (let i = 0; i < 3; i++) {
      if (Math.abs(d[i]) < 1e-9) continue;
      if (i === 1) { dene(d[1] < 0 ? -o[1] / d[1] : (TAVAN - o[1]) / d[1], 'duvar', null); continue; }
      dene((Math.sign(d[i]) * (i === 0 ? GEN : DER) - o[i]) / d[i], 'duvar', null);
    }
    for (const k of K) dene(kutuIsin(o, d, k), 'mobilya', k);
    for (const m of D) dene(silindirIsin(o, d, m.x, m.y0, m.z, m.r, m.y1 - m.y0), 'mobilya', m);
    if (H) for (const e of H.esyalar) { if (!esyaSuz || esyaSuz(e)) dene(silindirIsin(o, d, e.x, e.y, e.z, e.r, e.h), 'esya', e); }
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

  return { GEN, DER, TAVAN, TURLER, TUR_NO, KUTULAR: K, DAIRELER: D, YUZEYLER: Y, SUSLER: S, KAPI, BOY_CADI, R_CADI, BOY_ASCI, R_ASCI, rastgele, uret, hareket, zeminBul, sigar, carpar, isin, govde };
})();

if (typeof module !== 'undefined') module.exports = Harita;
