// =============================================================
// Sihirli Kiler - 3D SAHNE: büyük büyücü mutfağı, mobilyalar, yüzlerce küçük eşya,
// aşçılar (avcı), süpürgeli cadılar (saklanan), büyü ışınları, gözcü iksiri, parçacıklar, kamera.
// =============================================================

const Sahne = (() => {
  const H_ = Harita;
  let renderer, scene, camera;
  let esyaGrup = null, kazanSivi = null;
  const kabarciklar = [], alevler = [], mumAlevleri = [];
  const elPoz = new THREE.Vector3(0, 8, 16), elBak = new THREE.Vector3(0, 0, 0);
  let sarsinti = 0, sonT = performance.now();
  const telefon = matchMedia('(pointer: coarse)').matches;

  // ---------- Paylaşılan malzemeler ve şekiller (hiç silinmez) ----------
  const matOnbellek = new Map();
  function mat(renk, ek = {}) {
    const k = renk + JSON.stringify(ek);
    if (!matOnbellek.has(k)) {
      const m = ek.parla ? new THREE.MeshBasicMaterial({ color: renk, transparent: !!ek.saydam, opacity: ek.saydam || 1, side: ek.iki ? THREE.DoubleSide : THREE.FrontSide })
        : new THREE.MeshLambertMaterial({ color: renk, transparent: !!ek.saydam, opacity: ek.saydam || 1, emissive: ek.isik || 0x000000, side: ek.iki ? THREE.DoubleSide : THREE.FrontSide, map: ek.map || null });
      m.userData.paylasimli = true;
      matOnbellek.set(k, m);
    }
    return matOnbellek.get(k);
  }
  const geoOnbellek = new Map();
  function geo(ad, f) { if (!geoOnbellek.has(ad)) { const g = f(); g.userData.paylasimli = true; geoOnbellek.set(ad, g); } return geoOnbellek.get(ad); }
  function parca(g, m, x = 0, y = 0, z = 0, gol = true) {
    const o = new THREE.Mesh(g, m); o.position.set(x, y, z);
    o.castShadow = gol; o.receiveShadow = true; return o;
  }
  const kure = (r, a = 14, b = 10) => geo(`k${r}_${a}_${b}`, () => new THREE.SphereGeometry(r, a, b));
  const sil = (r1, r2, h, n = 14, acik = false) => geo(`s${r1}_${r2}_${h}_${n}_${acik}`, () => new THREE.CylinderGeometry(r1, r2, h, n, 1, acik));
  const kutu = (w, h, d) => geo(`b${w}_${h}_${d}`, () => new THREE.BoxGeometry(w, h, d));
  const koni = (r, h, n = 12) => geo(`c${r}_${h}_${n}`, () => new THREE.ConeGeometry(r, h, n));
  const simit = (r, t, a = Math.PI * 2) => geo(`t${r}_${t}_${a}`, () => new THREE.TorusGeometry(r, t, 8, 18, a));

  function kur(kanvas) {
    renderer = new THREE.WebGLRenderer({ canvas: kanvas, antialias: !telefon });
    renderer.setPixelRatio(Math.min(telefon ? 1.25 : 2, window.devicePixelRatio || 1));
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1024);
    scene.fog = new THREE.Fog(0x2a1a30, 38, 80);
    camera = new THREE.PerspectiveCamera(66, 1, 0.05, 200);
    scene.add(new THREE.HemisphereLight(0xffe8d0, 0x5a4060, 1.05));
    const isik = new THREE.DirectionalLight(0xfff0dd, 0.95);
    isik.position.set(8, 26, 10); isik.castShadow = true;
    isik.shadow.mapSize.set(telefon ? 1024 : 2048, telefon ? 1024 : 2048);
    Object.assign(isik.shadow.camera, { left: -27, right: 27, top: 21, bottom: -21, near: 1, far: 60 });
    isik.shadow.bias = -0.0006;
    scene.add(isik);
    [[0, 1.4, -15.8, 0xff8a3a, 2.4, 14], [0, 2.4, -5, 0x6aff7a, 1.6, 9], [-9, 4.4, 4.3, 0xffc87a, 1.6, 12], [18, 1.6, -13.6, 0xff7a2a, 1.4, 7]].forEach(([x, y, z, c, g, m]) => {
      const p = new THREE.PointLight(c, g, m, 1.3); p.position.set(x, y, z); scene.add(p);
    });
    odaKur();
    window.addEventListener('resize', boyut); boyut();
  }
  function boyut() {
    const w = innerWidth, h = innerHeight;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
  }

  // Sahneden çıkarılan nesnelerin GPU belleğini boşaltır (paylaşılan parçalar hariç)
  function at(obj) {
    if (!obj) return;
    obj.parent && obj.parent.remove(obj);
    obj.traverse(o => {
      if (o.isInstancedMesh) o.dispose();
      if (o.geometry && !o.geometry.userData?.paylasimli) o.geometry.dispose();
      const ms = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
      ms.forEach(m => { if (m.userData?.paylasimli) return; if (m.map && !m.map.userData?.paylasimli) m.map.dispose(); m.dispose(); });
    });
  }

  // ---------- Dokular (metre başına 1 tekrar) ----------
  function doku(w, h, ciz) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    ciz(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4; t.userData.paylasimli = true;
    return t;
  }
  const benek = (g, w, h, n, renkler) => { for (let i = 0; i < n; i++) { g.fillStyle = renkler[i % renkler.length]; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); } };
  const D = {};
  function dokulariYap() {
    D.tas = doku(256, 256, g => {
      g.fillStyle = '#3a2e30'; g.fillRect(0, 0, 256, 256);
      for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) {
        const v = 92 + Math.random() * 26;
        g.fillStyle = `rgb(${v + 12},${v},${v - 6})`; g.fillRect(x * 128 + 4, y * 128 + 4, 120, 120);
      }
      benek(g, 256, 256, 900, ['#0000001a', '#ffffff10']);
    });
    D.tasR = 0.5;   // zemin taşı yarım metre
    D.tugla = doku(256, 256, g => {
      g.fillStyle = '#4a2e28'; g.fillRect(0, 0, 256, 256);
      for (let y = 0; y < 8; y++) for (let x = -1; x < 5; x++) {
        const v = 125 + Math.random() * 40, ox = (y % 2) * 32;
        g.fillStyle = `rgb(${v},${v * 0.6},${v * 0.47})`; g.fillRect(x * 64 + ox + 3, y * 32 + 3, 58, 26);
      }
      benek(g, 256, 256, 600, ['#0000001a', '#ffffff0d']);
    });
    D.ahsap = doku(256, 256, g => {
      g.fillStyle = '#8a5a32'; g.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#7c4e2a' : '#946238'; g.fillRect(0, i * 32, 256, 31); g.fillStyle = '#4a2a1455'; g.fillRect(0, i * 32 + 31, 256, 1); }
      for (let i = 0; i < 40; i++) { g.strokeStyle = '#5a361a44'; g.beginPath(); const y = Math.random() * 256; g.moveTo(0, y); g.bezierCurveTo(80, y + 5, 170, y - 5, 256, y); g.stroke(); }
    });
    D.kasa = doku(128, 128, g => {
      g.fillStyle = '#a07040'; g.fillRect(0, 0, 128, 128);
      for (let i = 0; i < 4; i++) { g.fillStyle = '#6a4424'; g.fillRect(0, i * 32, 128, 2); }
      g.strokeStyle = '#6a4424'; g.lineWidth = 6; g.strokeRect(3, 3, 122, 122); g.beginPath(); g.moveTo(6, 6); g.lineTo(122, 122); g.stroke();
    });
    D.odun = doku(128, 128, g => {
      g.fillStyle = '#4a2e18'; g.fillRect(0, 0, 128, 128);
      for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { const cx = x * 32 + 16 + (y % 2) * 8, cy = y * 32 + 16; g.fillStyle = '#c8945a'; g.beginPath(); g.arc(cx, cy, 13, 0, 7); g.fill(); g.strokeStyle = '#8a5a2a'; g.lineWidth = 2; g.beginPath(); g.arc(cx, cy, 7, 0, 7); g.stroke(); }
    });
    D.hali = doku(256, 256, g => {
      g.fillStyle = '#7a1a2a'; g.fillRect(0, 0, 256, 256);
      g.strokeStyle = '#e8b84a'; g.lineWidth = 8; g.strokeRect(12, 12, 232, 232);
      g.strokeStyle = '#2a4a8a'; g.lineWidth = 5; g.strokeRect(30, 30, 196, 196);
      g.fillStyle = '#e8b84a'; for (let i = 0; i < 6; i++) { g.save(); g.translate(128, 128); g.rotate(i * Math.PI / 3); g.beginPath(); g.ellipse(0, 50, 14, 40, 0, 0, 7); g.fill(); g.restore(); }
      g.fillStyle = '#2a4a8a'; g.beginPath(); g.arc(128, 128, 22, 0, 7); g.fill();
    });
    D.hali.wrapS = D.hali.wrapT = THREE.ClampToEdgeWrapping;
  }
  // Kutu türü → malzeme
  function kutuMat(k) {
    const kapak = /Kapak$/.test(k), ust = /Ust$/.test(k), ad = k.replace(/(Kapak|Ust)$/, '');
    const renk = { ahsap: 0xffffff, koyu: 0x8a6a5a, mor: 0x9a7ab8, yesil: 0x8ab88a, kirmizi: 0xd88a7a, buz: 0xe8f4ff, tas: 0xb8b0a8, tasKoyu: 0x4a4040, tugla: 0xffffff, kasa: 0xffffff, odun: 0xffffff }[ad] ?? 0xffffff;
    const map = { tas: D.tas, tasKoyu: D.tas, tugla: D.tugla, kasa: D.kasa, odun: D.odun, buz: null }[ad] ?? D.ahsap;
    let c = new THREE.Color(renk);
    if (kapak) c.multiplyScalar(1.12); if (ust) c.multiplyScalar(1.25);
    if (ad === 'buz') return mat(kapak ? 0xd8e8f4 : 0xc8dcec, {});
    return mat(c.getHex(), { map });
  }
  // Birçok kutuyu malzemesine göre tek parça yapar (çizim hızlı olsun)
  function kutulariBirlestir(liste) {
    const gruplar = new Map();
    liste.forEach(k => { const m = kutuMat(k.m); if (!gruplar.has(m)) gruplar.set(m, []); gruplar.get(m).push(k); });
    const g = new THREE.Group();
    gruplar.forEach((kl, m) => {
      const poz = [], nor = [], uv = [], idx = [];
      kl.forEach(k => {
        const w = k.x1 - k.x0, h = k.y1 - k.y0, d = k.z1 - k.z0;
        const b = new THREE.BoxGeometry(w, h, d);
        b.translate((k.x0 + k.x1) / 2, (k.y0 + k.y1) / 2, (k.z0 + k.z1) / 2);
        const P = b.attributes.position, N = b.attributes.normal, U = b.attributes.uv, I = b.index;
        const bas = poz.length / 3;
        const boyut = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
        for (let i = 0; i < P.count; i++) {
          poz.push(P.getX(i), P.getY(i), P.getZ(i)); nor.push(N.getX(i), N.getY(i), N.getZ(i));
          const yuz = Math.floor(i / 4), [su, sv] = boyut[yuz];
          uv.push(U.getX(i) * su + ((k.x0 + k.z0) * 0.37) % 1, U.getY(i) * sv + (k.y0 * 0.53) % 1);
        }
        for (let i = 0; i < I.count; i++) idx.push(I.getX(i) + bas);
        b.dispose();
      });
      const bg = new THREE.BufferGeometry();
      bg.setAttribute('position', new THREE.Float32BufferAttribute(poz, 3));
      bg.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
      bg.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      bg.setIndex(idx);
      const me = new THREE.Mesh(bg, m); me.castShadow = me.receiveShadow = true; g.add(me);
    });
    return g;
  }

  // ---------- Oda ----------
  function odaKur() {
    dokulariYap();
    const G = H_.GEN, Dz = H_.DER, T = H_.TAVAN;
    const g = new THREE.Group(); scene.add(g);
    const zT = D.tas.clone(); zT.repeat.set(G * 2 * D.tasR, Dz * 2 * D.tasR); zT.needsUpdate = true;
    const zemin = new THREE.Mesh(new THREE.PlaneGeometry(G * 2, Dz * 2), new THREE.MeshLambertMaterial({ map: zT }));
    zemin.rotation.x = -Math.PI / 2; zemin.receiveShadow = true; g.add(zemin);
    const duvar = (w, x, z, ry) => {
      const t = D.tugla.clone(); t.repeat.set(w / 2.5, T / 2.5); t.needsUpdate = true;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, T), new THREE.MeshLambertMaterial({ map: t })); m.position.set(x, T / 2, z); m.rotation.y = ry; m.receiveShadow = true; g.add(m);
    };
    duvar(G * 2, 0, -Dz, 0); duvar(G * 2, 0, Dz, Math.PI); duvar(Dz * 2, -G, 0, Math.PI / 2); duvar(Dz * 2, G, 0, -Math.PI / 2);
    const tavan = new THREE.Mesh(new THREE.PlaneGeometry(G * 2, Dz * 2), mat(0x2a1a14)); tavan.rotation.x = Math.PI / 2; tavan.position.y = T; g.add(tavan);
    for (let x = -G + 3; x < G; x += 6) g.add(parca(kutu(0.45, 0.45, Dz * 2), mat(0x4a2e1a), x, T - 0.22, 0, false));
    for (let z = -Dz + 4; z < Dz; z += 8) g.add(parca(kutu(G * 2, 0.3, 0.3), mat(0x3a2414), 0, T - 0.6, z, false));
    // süpürgelik
    [[0, -Dz + 0.05, G * 2, 0.1], [0, Dz - 0.05, G * 2, 0.1], [-G + 0.05, 0, 0.1, Dz * 2], [G - 0.05, 0, 0.1, Dz * 2]].forEach(([x, z, w, d]) => g.add(parca(kutu(w, 0.22, d), mat(0x3a2414), x, 0.11, z, false)));
    // mobilyalar
    g.add(kutulariBirlestir(H_.KUTULAR));
    H_.DAIRELER.forEach(d => g.add(kazanYap(d)));
    H_.SUSLER.forEach(s => { const o = susYap(s); if (o) g.add(o); });
    elleSusler(g);
  }

  function kazanYap(m) {
    const g = new THREE.Group(); g.position.set(m.x, 0, m.z);
    const govde = parca(geo('kazanGovde', () => new THREE.SphereGeometry(m.r, 30, 18, 0, Math.PI * 2, Math.PI * 0.3, Math.PI * 0.7)), mat(0x2a2630));
    govde.scale.y = 0.78; govde.position.y = m.y1 - Math.cos(Math.PI * 0.3) * m.r * 0.78; g.add(govde);   // ağzı tam kenar hizasında
    const agiz = parca(simit(m.r * 0.82, 0.16), mat(0x45404c), 0, m.y1, 0); agiz.rotation.x = Math.PI / 2; g.add(agiz);
    kazanSivi = parca(geo('kazanSivi', () => new THREE.CircleGeometry(m.r * 0.8, 30)), new THREE.MeshBasicMaterial({ color: 0x5aff6a }), 0, m.y1 - 0.06, 0, false);
    kazanSivi.rotation.x = -Math.PI / 2; g.add(kazanSivi);
    for (let i = 0; i < 9; i++) { const b = parca(kure(0.14, 8, 6), mat(0xaaffaa, { parla: true }), 0, m.y1, 0, false); b.userData = { a: Math.random() * 6, r: Math.random() * m.r * 0.6, f: Math.random(), y: m.y1 }; g.add(b); kabarciklar.push(b); }
    for (let i = 0; i < 3; i++) { const a = i * 2.094; g.add(parca(sil(0.18, 0.12, 0.5), mat(0x2a2630), Math.sin(a) * m.r * 0.62, 0.22, Math.cos(a) * m.r * 0.62)); }
    for (let i = 0; i < 5; i++) { const a = parca(koni(0.3, 0.7, 7), mat(i % 2 ? 0xffa83a : 0xff6a1a, { parla: true }), Math.sin(i * 1.25) * 0.7, 0.3, Math.cos(i * 1.25) * 0.7, false); alevler.push(a); g.add(a); }
    // büyük karıştırma kaşığı
    const kasik = new THREE.Group(); kasik.position.set(0.6, m.y1 + 0.6, 0.2); kasik.rotation.z = -0.5; kasik.rotation.x = 0.3;
    kasik.add(parca(sil(0.05, 0.05, 2.4, 6), mat(0x8a5a2a), 0, 0, 0)); g.add(kasik);
    return g;
  }
  function susYap(s) {
    const g = new THREE.Group();
    if (s.tip === 'ates') {
      g.position.set(s.x, s.y, s.z);
      for (let i = 0; i < 7; i++) { const a = new THREE.Mesh(koni(0.32, 0.9, 7), mat(i % 2 ? 0xffa83a : 0xff5a1a, { parla: true })); a.position.set((i - 3) * 0.5, 0.45, (i % 2) * 0.2); g.add(a); alevler.push(a); }
      for (let i = 0; i < 3; i++) { const o = parca(sil(0.12, 0.12, 2.2, 8), mat(0x3a2414), 0, 0.12, -0.1 + i * 0.12); o.rotation.z = Math.PI / 2 + (i - 1) * 0.15; g.add(o); }
      // asılı kazan
      g.add(parca(sil(0.02, 0.02, 1.4, 4), mat(0x2a2a2a), 0, 1.2, 0, false));
      g.add(parca(geo('asiliKazan', () => new THREE.SphereGeometry(0.4, 14, 10, 0, Math.PI * 2, Math.PI * 0.35, Math.PI * 0.65)), mat(0x2a2630), 0, 0.85, 0));
      return g;
    }
    if (s.tip === 'buzIsik') { g.add(parca(kutu(1.2, 0.04, 0.4), mat(0xd8f4ff, { parla: true }), s.x, s.y, s.z, false)); return g; }
    if (s.tip === 'firin') {
      g.position.set(s.x, s.y, s.z);
      g.add(parca(kutu(1.5, 0.9, 0.06), mat(0x1a0a04), 0, 0.55, 0.01, false));
      g.add(parca(kutu(1.2, 0.5, 0.05), mat(0xff7a2a, { parla: true }), 0, 0.4, 0.03, false));
      for (let i = 0; i < 3; i++) { const e = parca(kure(0.16, 8, 6), mat(0xc8843a), (i - 1) * 0.35, 0.12, 0.25); e.scale.set(1.4, 0.6, 0.9); g.add(e); }
      return g;
    }
    if (s.tip === 'musluk') {
      const [x, z] = s.n; g.position.set(x, s.y, z);
      g.add(parca(sil(0.04, 0.04, 0.4, 8), mat(0xb8b8c0), 0, 0.2, 0, false));
      const b = parca(sil(0.03, 0.03, 0.3, 8), mat(0xb8b8c0), 0, 0.38, 0, false); b.rotation.x = Math.PI / 2;
      const yonY = { 'x+': -Math.PI / 2, 'x-': Math.PI / 2, 'z+': 0, 'z-': Math.PI }[s.on] || 0;
      const kol = new THREE.Group(); kol.rotation.y = yonY; b.position.set(0, 0.38, 0.15); kol.add(b); g.add(kol);
      return g;
    }
    if (s.tip === 'kulp') { const [x, z] = s.n; g.add(parca(kure(0.04, 6, 4), mat(0xd8a020), x, s.y, z, false)); return g; }
    if (s.tip === 'askiRaf') {
      for (const x of [s.x0 + 0.2, s.x1 - 0.2]) g.add(parca(sil(0.015, 0.015, H_.TAVAN - s.y, 4), mat(0x2a2a2a), x, (H_.TAVAN + s.y) / 2, s.z, false));
      return g;
    }
    return null;
  }
  // Elle yerleştirilen süsler: avize, tencere askısı, otlar, fenerler, pencereler, halılar, tablolar
  function elleSusler(g) {
    const G = H_.GEN, Dz = H_.DER;
    // halılar
    [[-9, 4.3, 9, 6.5], [0, -13.6, 7, 3.4], [-3.5, 10.1, 6, 4.5]].forEach(([x, z, w, d]) => { const h = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat(0xffffff, { map: D.hali })); h.rotation.x = -Math.PI / 2; h.position.set(x, 0.012, z); h.receiveShadow = true; g.add(h); });
    // avize (yemek masasının üstünde)
    const av = new THREE.Group(); av.position.set(-9, 4.4, 4.3);
    av.add(parca(simit(1.2, 0.06), mat(0x3a2a1a), 0, 0, 0, false).rotateX(Math.PI / 2));
    for (let i = 0; i < 4; i++) av.add(parca(sil(0.015, 0.015, 2.8, 4), mat(0x2a2a2a), Math.cos(i * 1.57) * 0.6, 1.4, Math.sin(i * 1.57) * 0.6, false).rotateZ(Math.cos(i * 1.57) * -0.2));
    for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; av.add(parca(sil(0.05, 0.05, 0.25, 6), mat(0xf4ead0), Math.cos(a) * 1.2, 0.15, Math.sin(a) * 1.2, false)); const f = parca(koni(0.04, 0.12, 5), mat(0xffc83a, { parla: true }), Math.cos(a) * 1.2, 0.34, Math.sin(a) * 1.2, false); av.add(f); mumAlevleri.push(f); }
    g.add(av);
    // tencere askısı (ada tezgahın üstünde)
    const ask = new THREE.Group(); ask.position.set(8.5, 3.7, 3.3);
    ask.add(parca(kutu(5, 0.08, 0.08), mat(0x2a2a2a), 0, 0, 0, false));
    for (const x of [-2.3, 2.3]) ask.add(parca(sil(0.015, 0.015, H_.TAVAN - 3.7, 4), mat(0x2a2a2a), x, (H_.TAVAN - 3.7) / 2, 0, false));
    for (let i = 0; i < 7; i++) {
      const x = -2.1 + i * 0.7, p = new THREE.Group(); p.position.set(x, -0.1, 0);
      p.add(parca(sil(0.01, 0.01, 0.3, 4), mat(0x2a2a2a), 0, -0.15, 0, false));
      if (i % 2) { p.add(parca(sil(0.22, 0.2, 0.06, 14), mat(0x3a3a42), 0, -0.6, 0)); p.children[1].rotation.x = Math.PI / 2; p.add(parca(kutu(0.04, 0.3, 0.02), mat(0x2a2a2a), 0, -0.33, 0, false)); }
      else { p.add(parca(sil(0.18, 0.16, 0.3, 12), mat(i % 4 ? 0xb87a3a : 0x5a5a62), 0, -0.48, 0)); }
      ask.add(p);
    }
    g.add(ask);
    // ot ve sarımsak demetleri, fenerler
    const asili = [[-G + 0.12, 4.5, -6, Math.PI / 2, 0], [-G + 0.12, 4.5, 6, Math.PI / 2, 1], [-G + 0.12, 4.5, 12, Math.PI / 2, 0], [G - 0.12, 4.5, -12, -Math.PI / 2, 1], [G - 0.12, 4.5, 12, -Math.PI / 2, 0], [-14, 4.5, -Dz + 0.12, 0, 1], [13, 4.5, -Dz + 0.12, 0, 0], [-16, 4.2, Dz - 0.12, Math.PI, 1], [16, 4.2, Dz - 0.12, Math.PI, 1], [-6, 4.6, Dz - 0.12, Math.PI, 0], [6, 4.6, Dz - 0.12, Math.PI, 1]];
    asili.forEach(([x, y, z, ry, tur]) => {
      const s = new THREE.Group(); s.position.set(x, y, z); s.rotation.y = ry;
      if (tur) { // fener
        s.add(parca(kutu(0.34, 0.46, 0.34), mat(0x2a2a2a), 0, 0, 0.3, false));
        s.add(parca(kure(0.14), mat(0xffd27a, { parla: true }), 0, 0, 0.3, false));
        s.add(parca(kutu(0.05, 0.05, 0.3), mat(0x2a2a2a), 0, 0.28, 0.14, false));
      } else { // ot demeti ve sarımsak
        for (let k = 0; k < 6; k++) s.add(parca(koni(0.09, 0.7, 6), mat(k % 2 ? 0x5a8a3a : 0x7aa04a), (k - 2.5) * 0.17, -0.3, 0.12, false).rotateX(Math.PI));
        for (let k = 0; k < 4; k++) s.add(parca(kure(0.09, 8, 6), mat(0xf0e8d8), (k - 1.5) * 0.25, -0.75, 0.14, false));
        s.add(parca(kutu(1.1, 0.06, 0.06), mat(0x6a4020), 0, 0.05, 0.1, false));
      }
      g.add(s);
    });
    // pencereler (gece, ay ışığı)
    [[-G + 0.06, 4.2, -2, Math.PI / 2], [-G + 0.06, 4.2, 10, Math.PI / 2], [G - 0.06, 4.6, -14, -Math.PI / 2], [G - 0.06, 4.6, 12.5, -Math.PI / 2], [-17, 4.8, Dz - 0.06, Math.PI]].forEach(([x, y, z, ry]) => {
      const p = new THREE.Group(); p.position.set(x, y, z); p.rotation.y = ry;
      p.add(parca(kutu(1.8, 2.2, 0.05), mat(0x2a3a7a, { parla: true }), 0, 0, 0, false));
      p.add(parca(kure(0.25, 12, 8), mat(0xfff4c8, { parla: true }), 0.4, 0.5, 0.03, false));
      p.add(parca(kutu(2.0, 0.12, 0.12), mat(0x4a2e1a), 0, 1.1, 0.04, false)); p.add(parca(kutu(2.0, 0.12, 0.12), mat(0x4a2e1a), 0, -1.1, 0.04, false));
      p.add(parca(kutu(0.12, 2.3, 0.12), mat(0x4a2e1a), 0.95, 0, 0.04, false)); p.add(parca(kutu(0.12, 2.3, 0.12), mat(0x4a2e1a), -0.95, 0, 0.04, false));
      p.add(parca(kutu(0.07, 2.2, 0.08), mat(0x4a2e1a), 0, 0, 0.04, false)); p.add(parca(kutu(1.8, 0.07, 0.08), mat(0x4a2e1a), 0, 0, 0.04, false));
      g.add(p);
    });
    // tablolar
    [[-20.5, 4.3, -Dz + 0.06, 0, 0xc84a8a], [10.5, 4.5, -Dz + 0.06, 0, 0x4a8ac8], [G - 0.06, 3.8, -4, -Math.PI / 2, 0x6ac84a], [-G + 0.06, 3.8, 16, Math.PI / 2, 0xe8a03a]].forEach(([x, y, z, ry, c]) => {
      const p = new THREE.Group(); p.position.set(x, y, z); p.rotation.y = ry;
      p.add(parca(kutu(1.6, 1.2, 0.06), mat(0x8a5a1a), 0, 0, 0, false));
      p.add(parca(kutu(1.3, 0.9, 0.07), mat(c), 0, 0, 0.01, false));
      const ay = parca(kure(0.22, 10, 8), mat(0xffe8a0), -0.2, 0.05, 0.05, false); ay.scale.set(1, 1, 0.2); p.add(ay);
      g.add(p);
    });
    // kapı (avcıların girdiği yer)
    const kapi = new THREE.Group();
    kapi.add(parca(kutu(3.4, 3.8, 0.2), mat(0x6a4020, { map: D.ahsap }), 0, 1.9, 0, false));
    for (let i = -1; i <= 1; i++) kapi.add(parca(kutu(0.12, 3.6, 0.25), mat(0x4a2a12), i * 1.05, 1.9, 0.02, false));
    kapi.add(parca(kutu(3.4, 0.16, 0.26), mat(0x2a2a2a), 0, 3.0, 0.02, false)); kapi.add(parca(kutu(3.4, 0.16, 0.26), mat(0x2a2a2a), 0, 0.8, 0.02, false));
    kapi.add(parca(kure(0.1), mat(0xd8a020), 1.3, 1.8, -0.15, false));
    kapi.position.set(0, 0, Dz - 0.1); kapi.rotation.y = Math.PI; g.add(kapi);
    // duvara asılı kaşıklar, kepçeler (şöminenin yanı)
    for (let i = 0; i < 6; i++) { const k = new THREE.Group(); k.position.set(-6.8 + i * 0.3, 3.4, -Dz + 0.08); k.add(parca(sil(0.02, 0.02, 0.7, 4), mat(0x8a5a2a), 0, 0, 0, false)); k.add(parca(kure(0.08, 8, 6), mat(i % 2 ? 0xb8b8c0 : 0x8a5a2a), 0, -0.38, 0.02, false)); g.add(k); }
    // köşelerde örümcek ağı
    [[-G, Dz], [G, -Dz], [-G, -Dz], [G, Dz]].forEach(([x, z]) => {
      const a = new THREE.Mesh(geo('ag', () => new THREE.CircleGeometry(1.4, 6, 0, Math.PI / 2)), mat(0xffffff, { parla: true, saydam: 0.18, iki: true }));
      a.position.set(x - Math.sign(x) * 0.02, H_.TAVAN - 0.02, z - Math.sign(z) * 0.02); a.rotation.x = Math.PI / 2;
      a.rotation.z = Math.atan2(-Math.sign(z), -Math.sign(x)) - Math.PI / 4; g.add(a);
    });
    // köşede süpürgeler
    [[-23.2, 11, 0.2], [22.8, 14.6, -0.25]].forEach(([x, z, e]) => { const s = supurgeYap(); s.position.set(x, 0.9, z); s.rotation.set(e, 0, 0.15); s.rotation.order = 'YXZ'; s.rotation.x = Math.PI / 2 - 0.3; g.add(s); });
  }

  // ---------- Eşyalar ----------
  const sablonlar = new Map();
  function esyaSablon(t) {
    if (sablonlar.has(t)) return sablonlar.get(t);
    const T = H_.TURLER[t], g = new THREE.Group(), r = T.r, h = T.h;
    const ek = (gg, m, x, y, z) => { const p = parca(gg, m, x, y, z); g.add(p); return p; };
    switch (T.k) {
      case 'elma': ek(kure(r), mat(0xd82a2a), 0, r, 0); ek(sil(0.015, 0.015, 0.08, 5), mat(0x5a3a1a), 0, r * 2 + 0.02, 0); ek(kure(0.04, 6, 4), mat(0x4aa83a), 0.04, r * 2 + 0.03, 0).scale.set(1, 0.4, 0.6); break;
      case 'havuc': ek(koni(r, h * 0.8, 10), mat(0xf07a1a), 0, h * 0.4, 0).rotation.x = Math.PI; for (let i = 0; i < 3; i++) ek(koni(0.03, 0.2, 5), mat(0x4aa83a), (i - 1) * 0.03, h * 0.8 + 0.08, 0).rotation.z = (i - 1) * 0.4; break;
      case 'peynir': ek(geo('peynir', () => new THREE.CylinderGeometry(r, r, h, 20, 1, false, 0, Math.PI * 1.7)), mat(0xf2c83a, { iki: true }), 0, h / 2, 0); ek(kure(0.04, 6, 4), mat(0xd8a020), r * 0.5, h, r * 0.3); break;
      case 'ekmek': ek(kure(r), mat(0xc8843a), 0, h * 0.5, 0).scale.set(1, h / r * 0.55, 0.6); for (let i = -1; i <= 1; i++) ek(kutu(0.02, 0.02, 0.1), mat(0xe8b46a), i * 0.08, h * 0.98, 0); break;
      case 'kavanoz': ek(sil(r, r, h * 0.8, 14), mat(0x9ad0e8, { saydam: 0.55 }), 0, h * 0.4, 0); ek(sil(r * 0.85, r * 0.85, h * 0.5, 12), mat(0xb02a5a), 0, h * 0.27, 0); ek(sil(r * 0.9, r * 0.9, h * 0.15, 14), mat(0xb8862a), 0, h * 0.88, 0); break;
      case 'tencere': ek(sil(r, r * 0.9, h * 0.8, 18), mat(0x5a5a62), 0, h * 0.4, 0); ek(sil(r * 1.02, r * 1.02, 0.04, 18), mat(0x7a7a82), 0, h * 0.82, 0); ek(kure(0.04, 6, 4), mat(0x2a2a2a), 0, h * 0.88, 0); ek(kutu(0.12, 0.04, 0.05), mat(0x2a2a2a), r + 0.05, h * 0.65, 0); ek(kutu(0.12, 0.04, 0.05), mat(0x2a2a2a), -r - 0.05, h * 0.65, 0); break;
      case 'caydanlik': ek(kure(r * 0.95), mat(0x3a7a8a), 0, h * 0.45, 0).scale.y = 0.85; ek(sil(0.03, 0.04, 0.22, 6), mat(0x3a7a8a), r * 0.95, h * 0.55, 0).rotation.z = -0.9; ek(simit(0.09, 0.02), mat(0x2a2a2a), -r * 0.9, h * 0.55, 0).rotation.y = Math.PI / 2; ek(kure(0.04, 6, 4), mat(0x2a2a2a), 0, h * 0.86, 0); break;
      case 'kupa': ek(sil(r, r * 0.85, h, 12), mat(0xe8e0d0), 0, h / 2, 0); ek(simit(0.05, 0.015), mat(0xe8e0d0), r + 0.02, h / 2, 0); ek(sil(r * 0.85, r * 0.85, 0.02, 12), mat(0x5a3418), 0, h - 0.02, 0); break;
      case 'iksir': ek(kure(r), mat(0xa04ae0, { isik: 0x4a1a7a, saydam: 0.88 }), 0, r, 0); ek(sil(0.04, 0.05, h - r * 2 + 0.05, 8), mat(0xc0a0e8, { saydam: 0.75 }), 0, r * 2 + (h - r * 2) / 2 - 0.02, 0); ek(sil(0.045, 0.04, 0.05, 8), mat(0x8a5a2a), 0, h - 0.02, 0); break;
      case 'mum': ek(sil(r, r, h * 0.82, 10), mat(0xf4ead0), 0, h * 0.41, 0); ek(koni(0.035, 0.09, 6), mat(0xffc83a, { parla: true }), 0, h * 0.9, 0); ek(sil(r * 1.6, r * 1.6, 0.02, 10), mat(0xb8862a), 0, 0.01, 0); break;
      case 'kitap': [0x8a2a2a, 0x2a4a8a, 0x3a6a2a].forEach((c, i) => { const k = ek(kutu(r * 1.6, h / 3 - 0.01, r * 1.2), mat(c), 0, h / 6 + i * h / 3, 0); k.rotation.y = (i - 1) * 0.25; }); break;
      case 'kabak': for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; ek(kure(r * 0.55), mat(i % 2 ? 0xe8781a : 0xf08a2a), Math.cos(a) * r * 0.45, h * 0.42, Math.sin(a) * r * 0.45); } ek(sil(0.04, 0.05, 0.12, 6), mat(0x4a6a2a), 0, h * 0.85, 0); break;
      case 'lahana': ek(kure(r * 0.8), mat(0x8ac85a), 0, h * 0.45, 0); for (let i = 0; i < 5; i++) { const a = i * 1.257; ek(kure(r * 0.6), mat(0x5aa83a), Math.cos(a) * r * 0.4, h * 0.35, Math.sin(a) * r * 0.4).scale.set(1, 0.7, 0.5); } break;
      case 'sepet': ek(sil(r, r * 0.8, h * 0.7, 14, true), mat(0xb8843a, { iki: true }), 0, h * 0.35, 0); ek(sil(r * 0.8, r * 0.8, 0.02, 14), mat(0xa8742a), 0, 0.01, 0); ek(simit(r * 0.85, 0.02, Math.PI), mat(0x9a6a2a), 0, h * 0.68, 0); for (let i = 0; i < 3; i++) ek(kure(0.08, 8, 6), mat(0xd82a2a), (i - 1) * 0.1, h * 0.6, 0); break;
      case 'mantar': ek(sil(r * 0.35, r * 0.45, h * 0.6, 8), mat(0xf0e8d8), 0, h * 0.3, 0); ek(geo('mantarSapka', () => new THREE.SphereGeometry(1, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2)), mat(0xd82a3a), 0, h * 0.55, 0).scale.set(r, h * 0.45, r); for (let i = 0; i < 4; i++) ek(kure(0.025, 5, 4), mat(0xffffff), Math.cos(i * 1.6) * r * 0.55, h * 0.85, Math.sin(i * 1.6) * r * 0.55); break;
      case 'testi': ek(kure(r), mat(0xc0603a), 0, r, 0).scale.y = 1.1; ek(sil(r * 0.4, r * 0.55, h - r * 2, 10), mat(0xc0603a), 0, r * 2 + (h - r * 2) / 2 - 0.03, 0); ek(sil(r * 0.5, r * 0.4, 0.04, 10), mat(0xa04a2a), 0, h - 0.02, 0); break;
      case 'baykus': ek(kure(r), mat(0x8a7a6a), 0, h * 0.42, 0).scale.set(1, 1.15, 0.9); ek(kure(r * 0.8), mat(0x9a8a7a), 0, h * 0.8, 0); for (let s = -1; s <= 1; s += 2) { ek(kure(0.05, 8, 6), mat(0xffe08a), s * 0.06, h * 0.82, r * 0.62); ek(kure(0.025, 6, 4), mat(0x111111), s * 0.06, h * 0.82, r * 0.68); ek(koni(0.03, 0.08, 4), mat(0x6a5a4a), s * 0.08, h * 0.98, 0); } ek(koni(0.025, 0.05, 4), mat(0xd8a020), 0, h * 0.76, r * 0.7).rotation.x = Math.PI / 2; break;
      case 'cuval': ek(kure(r), mat(0xd8c8a0), 0, h * 0.42, 0).scale.set(1, h / r * 0.45, 0.85); ek(sil(r * 0.3, r * 0.45, 0.1, 8), mat(0xd8c8a0), 0, h * 0.86, 0); ek(sil(r * 0.32, r * 0.32, 0.03, 8), mat(0x8a5a2a), 0, h * 0.82, 0); ek(kutu(0.2, 0.12, 0.01), mat(0x8a5a2a), 0, h * 0.5, r * 0.84); break;
      case 'fici': ek(sil(r * 0.9, r * 0.9, h, 16), mat(0x8a5a2a), 0, h / 2, 0); ek(sil(r, r, h * 0.6, 16), mat(0x9a6a32), 0, h / 2, 0); [0.12, 0.5, 0.88].forEach(f => ek(sil(r * (f === 0.5 ? 1.01 : 0.93), r * (f === 0.5 ? 1.01 : 0.93), 0.05, 16), mat(0x3a3a3a), 0, h * f, 0)); break;
      case 'sandik': ek(kutu(r * 1.8, h, r * 1.4), mat(0x7a4a22), 0, h / 2, 0); ek(kutu(r * 1.84, 0.06, r * 1.44), mat(0x3a3a3a), 0, h * 0.7, 0); ek(kutu(0.06, h + 0.02, r * 1.44), mat(0x3a3a3a), r * 0.5, h / 2, 0); ek(kutu(0.06, h + 0.02, r * 1.44), mat(0x3a3a3a), -r * 0.5, h / 2, 0); ek(kutu(0.12, 0.14, 0.04), mat(0xd8a020), 0, h * 0.6, r * 0.72); break;
      case 'tabure': ek(sil(r, r, 0.08, 14), mat(0x9a6a32), 0, h - 0.04, 0); for (let i = 0; i < 3; i++) { const a = i * 2.094; const b = ek(sil(0.03, 0.03, h - 0.08, 6), mat(0x7a4a22), Math.cos(a) * r * 0.65, (h - 0.08) / 2, Math.sin(a) * r * 0.65); b.rotation.z = Math.cos(a) * 0.12; b.rotation.x = -Math.sin(a) * 0.12; } break;
      case 'kazancik': ek(geo('kazancik', () => new THREE.SphereGeometry(1, 16, 10, 0, Math.PI * 2, Math.PI * 0.3, Math.PI * 0.7)), mat(0x2a262e), 0, h - Math.cos(Math.PI * 0.3) * h * 0.62, 0).scale.set(r, h * 0.62, r); ek(simit(r * 0.8, 0.04), mat(0x3a3640), 0, h, 0).rotation.x = Math.PI / 2; { const s = ek(geo('kazancikSivi', () => new THREE.CircleGeometry(1, 16)), mat(0xff6ad8, { parla: true }), 0, h - 0.04, 0); s.scale.setScalar(r * 0.78); s.rotation.x = -Math.PI / 2; } break;
      case 'sut': ek(sil(r, r, h * 0.7, 12), mat(0xf8f8f4), 0, h * 0.35, 0); ek(sil(r * 0.5, r, h * 0.2, 12), mat(0xf8f8f4), 0, h * 0.8, 0); ek(sil(r * 0.5, r * 0.5, 0.05, 10), mat(0x3a7ae8), 0, h - 0.02, 0); ek(sil(r * 1.01, r * 1.01, h * 0.2, 12), mat(0x3a7ae8), 0, h * 0.4, 0); break;
      case 'tabak': for (let i = 0; i < 5; i++) ek(sil(r - (i % 2) * 0.01, r * 0.7, 0.022, 18), mat(i % 2 ? 0xe8e0d0 : 0x6a9ad8), 0, 0.012 + i * 0.024, 0); break;
      case 'kase': ek(geo('kase', () => new THREE.SphereGeometry(1, 16, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2)), mat(0xd8a86a, { iki: true }), 0, h, 0).scale.set(r, h, r); ek(geo('kaseIc', () => new THREE.CircleGeometry(1, 16)), mat(0xf0e0b0), 0, h * 0.7, 0).scale.setScalar(r * 0.85); g.children[g.children.length - 1].rotation.x = -Math.PI / 2; break;
      case 'tuzluk': ek(sil(r * 0.8, r, h * 0.75, 10), mat(0xf0f0f0, { saydam: 0.8 }), 0, h * 0.375, 0); ek(kure(r * 0.85, 10, 6), mat(0xb8b8c0), 0, h * 0.78, 0); break;
      case 'but': ek(kure(r), mat(0xc85a4a), 0, h * 0.5, 0).scale.set(1.2, h / r * 0.5, 0.85); ek(sil(0.035, 0.035, 0.22, 6), mat(0xf4ead8), r * 1.25, h * 0.55, 0).rotation.z = Math.PI / 2; ek(kure(0.05, 6, 4), mat(0xf4ead8), r * 1.38, h * 0.55, 0); break;
      case 'yumurta': ek(kure(r, 10, 8), mat(0xf4e8d0), 0, h * 0.5, 0).scale.set(1, h / r * 0.55, 1); break;
      case 'cicek': ek(sil(r, r * 0.7, h * 0.4, 12), mat(0xb8603a), 0, h * 0.2, 0); for (let i = 0; i < 5; i++) { const a = i * 1.257; ek(kure(0.08, 8, 6), mat(i % 2 ? 0xe84a8a : 0xf0d02a), Math.cos(a) * r * 0.5, h * 0.82, Math.sin(a) * r * 0.5); } ek(kure(r * 0.7, 10, 8), mat(0x4a9a3a), 0, h * 0.62, 0).scale.y = 0.7; break;
      case 'kurabiye': ek(sil(r, r, h * 0.8, 14), mat(0xd8e8f0, { saydam: 0.5 }), 0, h * 0.4, 0); for (let i = 0; i < 4; i++) ek(sil(r * 0.7, r * 0.7, 0.04, 12), mat(0xb8743a), 0, 0.05 + i * 0.06, 0); ek(sil(r * 0.9, r * 0.9, h * 0.15, 14), mat(0x8a3a2a), 0, h * 0.88, 0); break;
      case 'kafatasi': ek(kure(r, 12, 10), mat(0xf4ead8), 0, h * 0.55, 0); ek(kutu(r * 1.1, h * 0.3, r * 1.2), mat(0xf4ead8), 0, h * 0.15, 0.02); for (let s = -1; s <= 1; s += 2) ek(kure(r * 0.3, 8, 6), mat(s > 0 ? 0xe84a8a : 0x4ac8e8), s * r * 0.4, h * 0.55, r * 0.8); break;
      case 'kristal': ek(sil(r * 0.8, r, h * 0.25, 10), mat(0x6a4a2a), 0, h * 0.12, 0); ek(kure(r, 16, 12), mat(0x8ad8ff, { isik: 0x2a5a8a, saydam: 0.75 }), 0, h * 0.25 + r * 0.95, 0); break;
    }
    sablonlar.set(t, g);
    return g;
  }
  function esyaYap(t) {
    const k = esyaSablon(t).clone();
    k.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    return k;
  }
  // Aynı türden bütün eşyaları tek seferde çiz (yüzlerce eşya hızlı görünsün)
  function esyalarKur(H) {
    esyalarTemizle();
    esyaGrup = new THREE.Group(); scene.add(esyaGrup);
    const turlere = new Map();
    H.esyalar.forEach(e => { if (!turlere.has(e.t)) turlere.set(e.t, []); turlere.get(e.t).push(e); });
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), ax = new THREE.Vector3(0, 1, 0), v = new THREE.Vector3(), s1 = new THREE.Vector3(1, 1, 1);
    turlere.forEach((liste, t) => {
      const sab = esyaSablon(t);
      sab.children.forEach(p => {
        p.updateMatrix();
        const im = new THREE.InstancedMesh(p.geometry, p.material, liste.length);
        liste.forEach((e, i) => { q.setFromAxisAngle(ax, e.yon); m4.compose(v.set(e.x, e.y, e.z), q, s1); m4.multiply(p.matrix); im.setMatrixAt(i, m4); });
        im.castShadow = true; im.receiveShadow = true;
        im.instanceMatrix.needsUpdate = true; im.computeBoundingSphere();
        esyaGrup.add(im);
      });
    });
  }
  function esyalarTemizle() { if (esyaGrup) { esyaGrup.parent?.remove(esyaGrup); esyaGrup.children.forEach(o => o.dispose()); esyaGrup = null; } }

  // ---------- Karakterler ----------
  const RENKLER = [0xe84a3a, 0x3a8ae8, 0x4ac85a, 0xf0c02a, 0xb05ae8, 0xf08a2a, 0x2ac8c8, 0xe85aa8, 0x8a5a3a, 0xd8d8e8];
  const RENK_AD = ['Kırmızı', 'Mavi', 'Yeşil', 'Sarı', 'Mor', 'Turuncu', 'Turkuaz', 'Pembe', 'Kahve', 'Beyaz'];
  // Avcı: uzun şapkalı aşçı, elinde parlayan büyülü kepçe
  function asciYap(renk) {
    const g = new THREE.Group(), c = RENKLER[renk % 10];
    const govde = new THREE.Group(); g.add(govde);
    const bacak = [];
    for (let s = -1; s <= 1; s += 2) { const b = new THREE.Group(); b.position.set(s * 0.13, 0.75, 0); b.add(parca(sil(0.09, 0.08, 0.72, 8), mat(0x3a3a4a), 0, -0.36, 0)); b.add(parca(kutu(0.16, 0.08, 0.26), mat(0x2a1a10), 0, -0.72, 0.04)); g.add(b); bacak.push(b); }
    govde.add(parca(sil(0.3, 0.34, 0.75, 12), mat(0xf4f4f0), 0, 1.1, 0));
    govde.add(parca(kutu(0.42, 0.55, 0.05), mat(c), 0, 1.05, 0.3));
    const fular = parca(simit(0.24, 0.06), mat(c), 0, 1.46, 0); fular.rotation.x = Math.PI / 2; govde.add(fular);
    govde.add(parca(kure(0.22), mat(0xf0c8a0), 0, 1.6, 0));
    for (let s = -1; s <= 1; s += 2) govde.add(parca(kure(0.035, 6, 4), mat(0x111111), s * 0.08, 1.64, 0.19, false));
    govde.add(parca(kutu(0.2, 0.05, 0.04), mat(0x4a2a1a), 0, 1.54, 0.2, false));
    govde.add(parca(sil(0.2, 0.18, 0.32, 12), mat(0xffffff), 0, 1.92, 0));
    const puf = parca(kure(0.26, 12, 8), mat(0xffffff), 0, 2.1, 0); puf.scale.set(1, 0.6, 1); govde.add(puf);
    const kol = new THREE.Group(); kol.position.set(0.36, 1.35, 0); govde.add(kol);
    const kolP = parca(sil(0.07, 0.06, 0.5, 8), mat(0xf4f4f0), 0, -0.2, 0.08); kolP.rotation.x = -0.6; kol.add(kolP);
    const kepce = new THREE.Group(); kepce.position.set(0, -0.35, 0.3); kol.add(kepce);
    const sap = parca(sil(0.025, 0.025, 0.8, 6), mat(0x8a5a2a), 0, 0, 0.25); sap.rotation.x = Math.PI / 2; kepce.add(sap);
    const uc = parca(kure(0.11, 10, 8), mat(0x7affd8, { parla: true }), 0, 0, 0.68, false); kepce.add(uc);
    const kol2 = new THREE.Group(); kol2.position.set(-0.36, 1.35, 0); govde.add(kol2);
    kol2.add(parca(sil(0.07, 0.06, 0.5, 8), mat(0xf4f4f0), 0, -0.25, 0));
    kol2.add(parca(kure(0.09, 8, 6), mat(0x8a3ae0, { saydam: 0.85 }), 0, -0.55, 0.05));   // gözcü iksiri
    g.userData.av = { govde, bacak, kol, uc, tip: 'asci', t: 0 };
    return g;
  }
  function supurgeYap() {
    const s = new THREE.Group();
    const sap = parca(sil(0.035, 0.035, 1.7, 6), mat(0x8a5a2a), 0, 0, 0); sap.rotation.x = Math.PI / 2; s.add(sap);
    const ca = parca(koni(0.2, 0.55, 10), mat(0xd8b05a), 0, 0, -1.0); ca.rotation.x = -Math.PI / 2; s.add(ca);
    s.add(parca(sil(0.06, 0.06, 0.08, 8), mat(0x8a2a2a), 0, 0, -0.72).rotateX(Math.PI / 2));
    return s;
  }
  // Saklanan: süpürgesine binmiş cadı
  function cadiYap(renk) {
    const g = new THREE.Group(), c = RENKLER[renk % 10];
    const govde = new THREE.Group(); g.add(govde);
    const sup = supurgeYap(); sup.position.set(0, 0.32, 0.05); govde.add(sup);
    govde.add(parca(koni(0.3, 0.62, 12), mat(0x3a2a5a), 0, 0.62, 0));
    const pelerin = parca(koni(0.36, 0.5, 12, true), mat(c), 0, 0.55, -0.06); pelerin.scale.set(1, 1, 0.8); govde.add(pelerin);
    govde.add(parca(kure(0.19), mat(0xb8e0a0), 0, 0.98, 0.02));
    for (let s = -1; s <= 1; s += 2) { govde.add(parca(kure(0.035, 6, 4), mat(0x111111), s * 0.07, 1.0, 0.18, false)); govde.add(parca(sil(0.03, 0.05, 0.35, 5), mat(0xe86a2a), s * 0.17, 0.85, -0.05)); }
    govde.add(parca(koni(0.035, 0.1, 5), mat(0x9ad080), 0, 0.96, 0.22).rotateX(Math.PI / 2));
    govde.add(parca(sil(0.34, 0.34, 0.03, 16), mat(0x1a1030), 0, 1.1, 0));
    govde.add(parca(sil(0.205, 0.205, 0.06, 12), mat(c), 0, 1.15, 0));
    const sapka = parca(koni(0.2, 0.5, 10), mat(0x1a1030), 0, 1.38, -0.05); sapka.rotation.x = -0.3; govde.add(sapka);
    for (let s = -1; s <= 1; s += 2) { const ayak = parca(kutu(0.08, 0.06, 0.16), mat(0x2a1a10), s * 0.14, 0.22, 0.15); govde.add(ayak); }
    g.userData.av = { govde, bacak: [], tip: 'cadi', t: Math.random() * 6 };
    return g;
  }
  // Oyuncunun görünüşü: 'asci', 'cadi' ya da eşya türü numarası
  function oyuncuYap(renk, gorunus) { const g = new THREE.Group(); gorunusDegis(g, renk, gorunus); return g; }
  function gorunusDegis(g, renk, gorunus) {
    if (g.userData.gorunus === gorunus) return;
    g.userData.gorunus = gorunus;
    const eski = g.userData.beden; if (eski) at(eski);
    const b = gorunus === 'asci' ? asciYap(renk) : gorunus === 'cadi' ? cadiYap(renk) : esyaYap(+gorunus);
    g.add(b); g.userData.beden = b;
  }
  function oyuncuOynat(g, { dt, hiz, ates, havada }) {
    const b = g.userData.beden; if (!b) return;
    const av = b.userData.av;
    if (!av) {   // eşya: yürürken zıplar
      b.userData.t = (b.userData.t || 0) + dt * (hiz > 0.1 ? 13 : 0);
      b.position.y = hiz > 0.1 && !havada ? Math.abs(Math.sin(b.userData.t)) * 0.1 : 0;
      b.rotation.z = hiz > 0.1 ? Math.sin(b.userData.t) * 0.08 : 0;
      return;
    }
    if (av.tip === 'cadi') {
      av.t += dt * 3;
      av.govde.position.y = Math.sin(av.t) * 0.05;
      av.govde.rotation.x = Math.max(-0.25, Math.min(0.25, -hiz * 0.05));
      av.govde.rotation.z = Math.sin(av.t * 0.7) * 0.05;
      return;
    }
    av.t += dt * (hiz > 0.1 ? 10 : 2);
    const s = hiz > 0.1 && !havada ? Math.sin(av.t) : 0;
    av.bacak.forEach((l, i) => { l.rotation.x = s * 0.6 * (i ? 1 : -1); });
    av.govde.position.y = Math.abs(s) * 0.04;
    av.ates = Math.max(0, (av.ates || 0) - dt * 4);
    if (ates) av.ates = 1;
    av.kol.rotation.x = -0.9 * av.ates - 0.2;
    av.uc.scale.setScalar(1 + av.ates * 0.6 + Math.sin(performance.now() / 150) * 0.1);
  }
  function kepceUcu(g) { const u = g.userData.beden?.userData.av?.uc; if (!u) return null; const v = new THREE.Vector3(); u.getWorldPosition(v); return v; }

  // ---------- İsim etiketi ----------
  function etiketYap(ad, renk) {
    const c = document.createElement('canvas'); c.width = 256; c.height = 64;
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true }));
    s.scale.set(1.6, 0.4, 1); s.renderOrder = 5;
    s.userData = { c, t, ad, renk, metin: null };
    etiketCiz(s, '');
    return s;
  }
  function etiketCiz(s, ek) {
    const u = s.userData, metin = u.ad + (ek ? ' ' + ek : '');
    if (u.metin === metin) return;
    u.metin = metin;
    const x = u.c.getContext('2d');
    x.clearRect(0, 0, 256, 64);
    x.font = '900 26px Nunito, "Segoe UI Emoji", sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.lineWidth = 7; x.strokeStyle = '#000b'; x.strokeText(metin, 128, 32); x.fillStyle = u.renk; x.fillText(metin, 128, 32);
    u.t.needsUpdate = true;
  }

  // ---------- Efektler ----------
  const parcalar = [], yazilar = [], isinlar = [], halkalar = [], ucanlar = [];
  const parcaG = new THREE.BoxGeometry(0.07, 0.07, 0.07);
  const parcaMat = new Map();
  function partikul(x, y, z, renk, sayi = 10, hiz = 3, omur = 0.6) {
    if (parcalar.length > 300) return;
    let m = parcaMat.get(renk);
    if (!m) { m = new THREE.MeshBasicMaterial({ color: renk }); parcaMat.set(renk, m); }
    for (let i = 0; i < sayi; i++) {
      const p = new THREE.Mesh(parcaG, m);
      p.position.set(x, y, z);
      const a = Math.random() * Math.PI * 2, u = Math.random();
      p.userData = { vx: Math.cos(a) * hiz * u, vy: hiz * (0.3 + Math.random() * 0.8), vz: Math.sin(a) * hiz * u, omur, t: 0 };
      scene.add(p); parcalar.push(p);
    }
  }
  function yaziGoster(x, y, z, metin, renk = '#fff', boy = 1, sure = 1.4) {
    const c = document.createElement('canvas'); c.width = 384; c.height = 96;
    const g = c.getContext('2d');
    g.font = '900 52px Nunito, "Segoe UI Emoji", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.lineWidth = 9; g.strokeStyle = '#000c'; g.strokeText(metin, 192, 50); g.fillStyle = renk; g.fillText(metin, 192, 50);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true }));
    s.scale.set(2.4 * boy, 0.6 * boy, 1); s.position.set(x, y, z); s.renderOrder = 6;
    s.userData = { t: 0, vy: 0.8, sure };
    scene.add(s); yazilar.push(s);
  }
  const isinGeo = new THREE.CylinderGeometry(1, 1, 1, 6, 1, true); isinGeo.translate(0, 0.5, 0); isinGeo.rotateX(Math.PI / 2);
  function isinCiz(a, b, renk) {
    const L = a.distanceTo(b); if (L < 0.05) return;
    const m = new THREE.Mesh(isinGeo, new THREE.MeshBasicMaterial({ color: renk, transparent: true, opacity: 0.9, depthWrite: false }));
    m.position.copy(a); m.lookAt(b); m.scale.set(0.05, 0.05, L);
    m.userData = { t: 0 };
    const ic = new THREE.Mesh(isinGeo, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, depthWrite: false }));
    ic.scale.set(0.4, 0.4, 1); m.add(ic);
    scene.add(m); isinlar.push(m);
  }
  // Yerde genişleyen halka (gözcü iksiri sonucu, zorunlu ses)
  function halka(x, y, z, renk, R, sure = 2.5) {
    const m = new THREE.Mesh(geo('halka', () => new THREE.RingGeometry(0.9, 1, 40)), new THREE.MeshBasicMaterial({ color: renk, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; m.position.set(x, y + 0.05, z); m.renderOrder = 4;
    const kubbe = new THREE.Mesh(geo('iksirKubbe', () => new THREE.SphereGeometry(1, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2)), new THREE.MeshBasicMaterial({ color: renk, transparent: true, opacity: 0.18, depthWrite: false, side: THREE.DoubleSide }));
    kubbe.position.set(x, y, z);
    m.userData = { t: 0, R, sure, kubbe };
    scene.add(m); scene.add(kubbe); halkalar.push(m);
  }
  // Atılan iksir şişesi: kavis çizerek uçar
  function iksirUcur(a, b, renk, bitince) {
    const m = parca(kure(0.12, 8, 6), mat(renk, { parla: true }), a.x, a.y, a.z, false);
    m.userData = { a: a.clone(), b: b.clone(), t: 0, sure: Math.min(0.9, 0.25 + a.distanceTo(b) / 30), bitince };
    scene.add(m); ucanlar.push(m);
  }
  // Saklananın yerleşeceği yerde gösterilen hayalet eşya
  let hayalet = null, hayaletTur = -2;
  const hayaletMat = [new THREE.MeshBasicMaterial({ color: 0x7aff8a, transparent: true, opacity: 0.45, depthWrite: false }), new THREE.MeshBasicMaterial({ color: 0xff5a4a, transparent: true, opacity: 0.35, depthWrite: false })];
  hayaletMat.forEach(m => { m.userData.paylasimli = true; });
  function hayaletGoster(t, x, y, z, yon, uygun) {
    if (t == null || t < 0) { if (hayalet) hayalet.visible = false; return; }
    if (hayaletTur !== t) {
      if (hayalet) scene.remove(hayalet);
      hayalet = esyaSablon(t).clone(); hayaletTur = t;
      hayalet.traverse(o => { if (o.isMesh) { o.castShadow = false; o.renderOrder = 3; } });
      scene.add(hayalet);
    }
    hayalet.visible = true;
    const m = hayaletMat[uygun ? 0 : 1];
    hayalet.traverse(o => { if (o.isMesh) o.material = m; });
    hayalet.position.set(x, y + Math.sin(performance.now() / 160) * 0.02, z); hayalet.rotation.y = yon;
  }
  // Saklananın göz kestirdiği eşyanın altında dönen halka
  let isaret = null;
  function isaretKoy(e) {
    if (!isaret) {
      isaret = new THREE.Mesh(new THREE.RingGeometry(0.85, 1, 28), new THREE.MeshBasicMaterial({ color: 0xffe06a, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false }));
      isaret.rotation.x = -Math.PI / 2; isaret.renderOrder = 4; scene.add(isaret);
    }
    if (!e) { isaret.visible = false; return; }
    isaret.visible = true;
    isaret.position.set(e.x, e.y + 0.03, e.z);
    const s = e.r + 0.1 + Math.sin(performance.now() / 130) * 0.03;
    isaret.scale.set(s, s, s);
  }

  function elle(poz, bak) { elPoz.copy(poz); elBak.copy(bak); }
  function sars(k) { sarsinti = Math.max(sarsinti, k); }

  function ciz() {
    const simdi = performance.now(), dt = Math.min(0.05, (simdi - sonT) / 1000); sonT = simdi;
    camera.position.copy(elPoz);
    if (sarsinti > 0) { camera.position.x += (Math.random() - 0.5) * sarsinti; camera.position.y += (Math.random() - 0.5) * sarsinti; sarsinti = Math.max(0, sarsinti - dt * 2); }
    camera.lookAt(elBak);
    for (let i = parcalar.length - 1; i >= 0; i--) {
      const p = parcalar[i], u = p.userData; u.t += dt;
      u.vy -= 8 * dt; p.position.x += u.vx * dt; p.position.y = Math.max(0.04, p.position.y + u.vy * dt); p.position.z += u.vz * dt;
      p.scale.setScalar(Math.max(0.01, 1 - u.t / u.omur));
      if (u.t >= u.omur) { scene.remove(p); parcalar.splice(i, 1); }
    }
    for (let i = yazilar.length - 1; i >= 0; i--) {
      const s = yazilar[i], u = s.userData; u.t += dt;
      s.position.y += u.vy * dt; u.vy *= 0.97; s.material.opacity = Math.max(0, 1 - Math.max(0, u.t - u.sure + 0.5) / 0.5);
      if (u.t > u.sure) { scene.remove(s); s.material.map.dispose(); s.material.dispose(); yazilar.splice(i, 1); }
    }
    for (let i = isinlar.length - 1; i >= 0; i--) {
      const m = isinlar[i]; m.userData.t += dt;
      const o = Math.max(0, 1 - m.userData.t / 0.3); m.material.opacity = 0.9 * o; m.children[0].material.opacity = 0.9 * o;
      if (o <= 0) { scene.remove(m); m.material.dispose(); m.children[0].material.dispose(); isinlar.splice(i, 1); }
    }
    for (let i = halkalar.length - 1; i >= 0; i--) {
      const m = halkalar[i], u = m.userData; u.t += dt;
      const f = Math.min(1, u.t / 0.5), s = u.R * (0.2 + 0.8 * f);
      m.scale.set(s, s, s); u.kubbe.scale.set(s, s * 0.6, s);
      const o = Math.max(0, 1 - Math.max(0, u.t - u.sure + 0.8) / 0.8);
      m.material.opacity = 0.9 * o; u.kubbe.material.opacity = 0.18 * o * (0.8 + Math.sin(u.t * 8) * 0.2);
      if (u.t > u.sure) { scene.remove(m); scene.remove(u.kubbe); m.material.dispose(); u.kubbe.material.dispose(); halkalar.splice(i, 1); }
    }
    for (let i = ucanlar.length - 1; i >= 0; i--) {
      const m = ucanlar[i], u = m.userData; u.t += dt;
      const f = Math.min(1, u.t / u.sure);
      m.position.lerpVectors(u.a, u.b, f); m.position.y += Math.sin(f * Math.PI) * Math.min(3, u.a.distanceTo(u.b) * 0.2);
      if (f >= 1) { scene.remove(m); ucanlar.splice(i, 1); u.bitince && u.bitince(); }
    }
    alevler.forEach((a, i) => { a.scale.set(1 + Math.sin(simdi / 90 + i) * 0.15, 1 + Math.sin(simdi / 70 + i * 2) * 0.25, 1); });
    mumAlevleri.forEach((a, i) => { a.scale.y = 1 + Math.sin(simdi / 60 + i * 3) * 0.2; });
    kabarciklar.forEach(b => { const u = b.userData; u.f += dt * 0.6; if (u.f > 1) { u.f = 0; u.a = Math.random() * 6; u.r = Math.random() * 1.5; } b.position.set(Math.cos(u.a) * u.r, u.y + u.f * 0.3, Math.sin(u.a) * u.r); b.scale.setScalar(Math.sin(u.f * Math.PI) + 0.01); });
    if (kazanSivi) kazanSivi.material.color.setHSL(0.36 + Math.sin(simdi / 900) * 0.05, 0.9, 0.55);
    renderer.render(scene, camera);
    return dt;
  }

  return {
    kur, at, ciz, elle, sars, esyalarKur, esyalarTemizle, esyaYap, oyuncuYap, gorunusDegis, oyuncuOynat, kepceUcu,
    etiketYap, etiketCiz, partikul, yaziGoster, isinCiz, halka, iksirUcur, hayaletGoster, isaretKoy, RENKLER, RENK_AD,
    get scene() { return scene; }, get camera() { return camera; }, get renderer() { return renderer; },
  };
})();
