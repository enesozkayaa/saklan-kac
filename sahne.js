// =============================================================
// SaklanKaç - 3D SAHNE: büyük büyücü mutfağı, mobilyalar, yüzlerce küçük eşya,
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
    scene.background = new THREE.Color(0x141a3a);
    scene.fog = new THREE.Fog(0x1a2040, 45, 120);
    camera = new THREE.PerspectiveCamera(66, 1, 0.05, 400);
    gokyuzu();
    scene.add(new THREE.HemisphereLight(0xffe8d0, 0x4a4060, 1.05));
    const ay = new THREE.DirectionalLight(0xc8d4ff, 0.85);
    ay.position.set(-25, 45, 35); ay.castShadow = true;
    ay.shadow.mapSize.set(telefon ? 1024 : 2048, telefon ? 1024 : 2048);
    Object.assign(ay.shadow.camera, { left: -48, right: 48, top: 48, bottom: -48, near: 1, far: 140 });
    ay.shadow.bias = -0.0008;
    ay.target.position.set(0, 0, 10); scene.add(ay.target);
    scene.add(ay);
    // sıcak iç ışıklar (telefonda daha az)
    const isiklar = [[0, 1.4, -15.8, 0xff8a3a, 2.4, 14], [0, 2.4, -5, 0x6aff7a, 1.6, 9], [-9, 4.4, 4.3, 0xffc87a, 1.6, 12], [-4, -1.5, -6, 0xffb05a, 2.0, 16], [-15, 11, -10, 0xffc87a, 1.4, 14], [15, 11, -2, 0xc88aff, 1.6, 14], [18, 1.6, -13.6, 0xff7a2a, 1.4, 7], [0, 4, 21, 0xffd27a, 1.3, 14]];
    (telefon ? isiklar.slice(0, 6) : isiklar).forEach(([x, y, z, c, g, m]) => { const p = new THREE.PointLight(c, g, m, 1.3); p.position.set(x, y, z); scene.add(p); });
    yapiKur();
    window.addEventListener('resize', boyut); boyut();
  }
  function boyut() {
    const w = innerWidth, h = innerHeight;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  // Gece gökyüzü: renk geçişli kubbe, yıldızlar, ay
  function gokyuzu() {
    const c = document.createElement('canvas'); c.width = 4; c.height = 256;
    const g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 256);
    gr.addColorStop(0, '#05081a'); gr.addColorStop(0.42, '#1a2458'); gr.addColorStop(0.5, '#3a3a6a'); gr.addColorStop(0.53, '#4a3a5a'); gr.addColorStop(1, '#1a1428');
    g.fillStyle = gr; g.fillRect(0, 0, 4, 256);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    scene.add(new THREE.Mesh(new THREE.SphereGeometry(300, 24, 16), new THREE.MeshBasicMaterial({ map: t, side: THREE.BackSide, fog: false })));
    const n = 700, p = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, b = Math.random() * 1.3 + 0.1, r = 280; p[i * 3] = Math.cos(a) * Math.cos(b) * r; p[i * 3 + 1] = Math.sin(b) * r; p[i * 3 + 2] = Math.sin(a) * Math.cos(b) * r; }
    const bg = new THREE.BufferGeometry(); bg.setAttribute('position', new THREE.BufferAttribute(p, 3));
    scene.add(new THREE.Points(bg, new THREE.PointsMaterial({ color: 0xffffff, size: 1.6, sizeAttenuation: false, fog: false })));
    const ay = new THREE.Mesh(new THREE.SphereGeometry(12, 24, 16), new THREE.MeshBasicMaterial({ color: 0xfff4d0, fog: false }));
    ay.position.set(-110, 150, 160); scene.add(ay);
    const hale = new THREE.Mesh(new THREE.SphereGeometry(20, 24, 16), new THREE.MeshBasicMaterial({ color: 0xfff4d0, transparent: true, opacity: 0.12, fog: false, depthWrite: false }));
    hale.position.copy(ay.position); scene.add(hale);
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
  const benek = (g, w, h, n, renkler, b = 2) => { for (let i = 0; i < n; i++) { g.fillStyle = renkler[i % renkler.length]; g.fillRect(Math.random() * w, Math.random() * h, b, b); } };
  const D = {};
  function dokulariYap() {
    D.tas = doku(256, 256, g => {
      g.fillStyle = '#3a2e30'; g.fillRect(0, 0, 256, 256);
      for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) { const v = 92 + Math.random() * 26; g.fillStyle = `rgb(${v + 12},${v},${v - 6})`; g.fillRect(x * 128 + 4, y * 128 + 4, 120, 120); }
      benek(g, 256, 256, 900, ['#0000001a', '#ffffff10']);
    });
    D.tugla = doku(256, 256, g => {
      g.fillStyle = '#4a2e28'; g.fillRect(0, 0, 256, 256);
      for (let y = 0; y < 8; y++) for (let x = -1; x < 5; x++) { const v = 125 + Math.random() * 40, ox = (y % 2) * 32; g.fillStyle = `rgb(${v},${v * 0.6},${v * 0.47})`; g.fillRect(x * 64 + ox + 3, y * 32 + 3, 58, 26); }
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
    D.cim = doku(256, 256, g => {
      g.fillStyle = '#2e5a2a'; g.fillRect(0, 0, 256, 256);
      benek(g, 256, 256, 3000, ['#3a6e32', '#264a22', '#4a7a3a', '#33622c'], 3);
    });
    D.toprak = doku(128, 128, g => { g.fillStyle = '#4a3020'; g.fillRect(0, 0, 128, 128); benek(g, 128, 128, 900, ['#5a3a26', '#3a2416', '#6a4a30'], 3); });
    D.cati = doku(128, 128, g => {
      g.fillStyle = '#6a2a20'; g.fillRect(0, 0, 128, 128);
      for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { const v = 120 + Math.random() * 30, ox = (y % 2) * 16; g.fillStyle = `rgb(${v},${v * 0.42},${v * 0.32})`; g.beginPath(); g.arc(x * 32 + ox + 16, y * 32 + 30, 15, Math.PI, 0); g.fill(); }
    });
    D.siva = doku(128, 128, g => { g.fillStyle = '#d8c8b0'; g.fillRect(0, 0, 128, 128); benek(g, 128, 128, 700, ['#c8b8a0', '#e4d6c0'], 3); });
    D.hali = doku(256, 256, g => {
      g.fillStyle = '#7a1a2a'; g.fillRect(0, 0, 256, 256);
      g.strokeStyle = '#e8b84a'; g.lineWidth = 8; g.strokeRect(12, 12, 232, 232);
      g.strokeStyle = '#2a4a8a'; g.lineWidth = 5; g.strokeRect(30, 30, 196, 196);
      g.fillStyle = '#e8b84a'; for (let i = 0; i < 6; i++) { g.save(); g.translate(128, 128); g.rotate(i * Math.PI / 3); g.beginPath(); g.ellipse(0, 50, 14, 40, 0, 0, 7); g.fill(); g.restore(); }
      g.fillStyle = '#2a4a8a'; g.beginPath(); g.arc(128, 128, 22, 0, 7); g.fill();
    });
    D.hali.wrapS = D.hali.wrapT = THREE.ClampToEdgeWrapping;
    D.yol = doku(128, 128, g => {
      g.fillStyle = '#2e5a2a'; g.fillRect(0, 0, 128, 128);
      for (let i = 0; i < 9; i++) { const v = 110 + Math.random() * 40; g.fillStyle = `rgb(${v},${v - 5},${v - 12})`; g.beginPath(); g.ellipse((i % 3) * 42 + 20, Math.floor(i / 3) * 42 + 20, 18, 15, Math.random(), 0, 7); g.fill(); }
    });
  }
  const GOLGESIZ = ['cim', 'toprak', 'tasZemin', 'tahtaZemin', 'cati', 'tugla', 'siva', 'cam', 'tasKoyu'];
  // Kutu türü → malzeme
  function kutuMat(k) {
    const kapak = /Kapak$/.test(k), ust = /Ust$/.test(k), ad = k.replace(/(Kapak|Ust)$/, '');
    if (ad === 'buz') return mat(kapak ? 0xd8e8f4 : 0xc8dcec, {});
    if (ad === 'cam') return mat(0x9ad8f0, { saydam: 0.22 });
    const renk = { ahsap: 0xffffff, koyu: 0x8a6a5a, mor: 0x9a7ab8, yesil: 0x8ab88a, kirmizi: 0xd88a7a, tas: 0xb8b0a8, tasKoyu: 0x4a4040, tasZemin: 0xffffff, tahtaZemin: 0xd8b090, tugla: 0xffffff, kasa: 0xffffff, odun: 0xffffff, cim: 0xffffff, toprak: 0xffffff, cati: 0xffffff, siva: 0xffffff, metal: 0x8a8a92, agac: 0x6a4a2a }[ad] ?? 0xffffff;
    const map = { tas: D.tas, tasKoyu: D.tas, tasZemin: D.tas, tugla: D.tugla, kasa: D.kasa, odun: D.odun, cim: D.cim, toprak: D.toprak, cati: D.cati, siva: D.siva, metal: null, agac: D.ahsap }[ad] ?? D.ahsap;
    const c = new THREE.Color(renk);
    if (kapak) c.multiplyScalar(1.12); if (ust) c.multiplyScalar(1.25);
    return mat(c.getHex(), { map });
  }
  // Birçok kutuyu malzemesine göre tek parça yapar (çizim hızlı olsun)
  function kutulariBirlestir(liste) {
    const gruplar = new Map();
    liste.forEach(k => {
      const m = kutuMat(k.m), golge = !GOLGESIZ.includes(k.m.replace(/(Kapak|Ust)$/, ''));
      const anahtar = m.uuid + golge;
      if (!gruplar.has(anahtar)) gruplar.set(anahtar, { m, golge, kl: [] });
      gruplar.get(anahtar).kl.push(k);
    });
    const g = new THREE.Group();
    gruplar.forEach(({ m, golge, kl }) => {
      const poz = [], nor = [], uv = [], idx = [];
      kl.forEach(k => {
        const w = k.x1 - k.x0, h = k.y1 - k.y0, d = k.z1 - k.z0;
        const b = new THREE.BoxGeometry(w, h, d);
        b.translate((k.x0 + k.x1) / 2, (k.y0 + k.y1) / 2, (k.z0 + k.z1) / 2);
        const P = b.attributes.position, N = b.attributes.normal, U = b.attributes.uv, I = b.index;
        const bas = poz.length / 3;
        const boyut = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
        const ox = [k.z0, k.z0, k.x0, k.x0, k.x0, k.x0], oy = [k.y0, k.y0, k.z0, k.z0, k.y0, k.y0];
        for (let i = 0; i < P.count; i++) {
          poz.push(P.getX(i), P.getY(i), P.getZ(i)); nor.push(N.getX(i), N.getY(i), N.getZ(i));
          const yuz = Math.floor(i / 4), [su, sv] = boyut[yuz];
          uv.push(U.getX(i) * su + ox[yuz], U.getY(i) * sv + oy[yuz]);
        }
        for (let i = 0; i < I.count; i++) idx.push(I.getX(i) + bas);
        b.dispose();
      });
      const bg = new THREE.BufferGeometry();
      bg.setAttribute('position', new THREE.Float32BufferAttribute(poz, 3));
      bg.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
      bg.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      bg.setIndex(idx);
      const me = new THREE.Mesh(bg, m); me.castShadow = golge; me.receiveShadow = true; g.add(me);
    });
    return g;
  }

  // ---------- Ev, bahçe ----------
  function yapiKur() {
    dokulariYap();
    const g = new THREE.Group(); scene.add(g);
    g.add(kutulariBirlestir(H_.KUTULAR));
    H_.DAIRELER.forEach(d => g.add(d.m === 'kazan' ? kazanYap(d) : silindirYap(d)));
    H_.SUSLER.forEach(s => { const o = susYap(s); if (o) g.add(o); });
    elleSusler(g);
    susHedefKur(g);
  }
  function silindirYap(d) {
    const h = d.y1 - d.y0, m = kutuMat(d.m);
    const o = parca(sil(d.r, d.r * (d.m === 'agac' ? 1.15 : 1), h, 20), m, d.x, d.y0 + h / 2, d.z);
    if (d.m === 'metal') { const g = new THREE.Group(); g.add(o); [0.25, 0.75].forEach(f => g.add(parca(sil(d.r * 1.03, d.r * 1.03, 0.08, 20), mat(0x5a5a62), d.x, d.y0 + h * f, d.z))); g.add(parca(koni(d.r * 1.05, 0.5, 20), mat(0x6a6a72), d.x, d.y1 + 0.25, d.z)); return g; }
    return o;
  }
  function kazanYap(m) {
    const g = new THREE.Group(); g.position.set(m.x, 0, m.z);
    const govde = parca(geo('kazanGovde', () => new THREE.SphereGeometry(m.r, 30, 18, 0, Math.PI * 2, Math.PI * 0.3, Math.PI * 0.7)), mat(0x2a2630));
    govde.scale.y = 0.78; govde.position.y = m.y1 - Math.cos(Math.PI * 0.3) * m.r * 0.78; g.add(govde);
    const agiz = parca(simit(m.r * 0.82, 0.16), mat(0x45404c), 0, m.y1, 0); agiz.rotation.x = Math.PI / 2; g.add(agiz);
    kazanSivi = parca(geo('kazanSivi', () => new THREE.CircleGeometry(m.r * 0.8, 30)), new THREE.MeshBasicMaterial({ color: 0x5aff6a }), 0, m.y1 - 0.06, 0, false);
    kazanSivi.rotation.x = -Math.PI / 2; g.add(kazanSivi);
    for (let i = 0; i < 9; i++) { const b = parca(kure(0.14, 8, 6), mat(0xaaffaa, { parla: true }), 0, m.y1, 0, false); b.userData = { a: Math.random() * 6, r: Math.random() * m.r * 0.6, f: Math.random(), y: m.y1 }; g.add(b); kabarciklar.push(b); }
    for (let i = 0; i < 5; i++) { const a = parca(koni(0.3, 0.7, 7), mat(i % 2 ? 0xffa83a : 0xff6a1a, { parla: true }), Math.sin(i * 1.25) * 0.7, 0.3, Math.cos(i * 1.25) * 0.7, false); alevler.push(a); g.add(a); }
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
      g.add(parca(sil(0.02, 0.02, 1.4, 4), mat(0x2a2a2a), 0, 1.2, 0, false));
      g.add(parca(geo('asiliKazan', () => new THREE.SphereGeometry(0.4, 14, 10, 0, Math.PI * 2, Math.PI * 0.35, Math.PI * 0.65)), mat(0x2a2630), 0, 0.85, 0));
      return g;
    }
    if (s.tip === 'buzIsik') { g.add(parca(kutu(1.2, 0.04, 0.4), mat(0xd8f4ff, { parla: true }), s.x, s.y, s.z, false)); return g; }
    if (s.tip === 'bodrumIsik') { g.add(parca(sil(0.01, 0.01, 1.0, 4), mat(0x2a2a2a), s.x, s.y + 0.6, s.z, false)); g.add(parca(kure(0.18), mat(0xffd27a, { parla: true }), s.x, s.y, s.z, false)); return g; }
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
      const kol = new THREE.Group(); kol.rotation.y = { 'x+': -Math.PI / 2, 'x-': Math.PI / 2, 'z+': 0, 'z-': Math.PI }[s.on] || 0; b.position.set(0, 0.38, 0.15); kol.add(b); g.add(kol);
      return g;
    }
    if (s.tip === 'kulp') { const [x, z] = s.n; g.add(parca(kure(0.04, 6, 4), mat(0xd8a020), x, s.y, z, false)); return g; }
    if (s.tip === 'askiRaf') { for (const x of [s.x0 + 0.2, s.x1 - 0.2]) g.add(parca(sil(0.015, 0.015, s.ust - s.y, 4), mat(0x2a2a2a), x, (s.ust + s.y) / 2, s.z, false)); return g; }
    if (s.tip === 'merdiven') {
      const L = s.y1 - s.y0;
      for (const dx of [-0.3, 0.3]) g.add(parca(kutu(0.06, L, 0.06), mat(0x6a4020), s.x + dx, s.y0 + L / 2, s.z, false));
      for (let y = s.y0 + 0.3; y < s.y1; y += 0.4) g.add(parca(kutu(0.6, 0.05, 0.05), mat(0x8a5a2a), s.x, y, s.z, false));
      return g;
    }
    if (s.tip === 'agac') {
      g.position.set(s.x, s.y, s.z);
      [[0, 1.2, 0, 2.4], [1.4, 0.6, 0.5, 1.6], [-1.3, 0.7, -0.4, 1.7], [0.3, 0.6, -1.4, 1.5], [-0.4, 0.4, 1.3, 1.5]].forEach(([x, y, z, r]) => g.add(parca(kure(r, 12, 9), mat(0x2e6a2a), x, y, z)));
      for (let i = 0; i < 14; i++) { const a = i * 2.4, r = 1.6 + (i % 3) * 0.4; g.add(parca(kure(0.13, 8, 6), mat(0xd82a2a), Math.cos(a) * r, 0.2 + (i % 4) * 0.5, Math.sin(a) * r, false)); }
      return g;
    }
    if (s.tip === 'kuyu') {
      g.position.set(s.x, 0, s.z);
      for (const dx of [-1.0, 1.0]) g.add(parca(kutu(0.15, 2.4, 0.15), mat(0x5a3a1a), dx, 1.2, 0));
      const cati = parca(kutu(2.6, 0.12, 1.8), mat(0x6a2a20, { map: D.cati }), 0, 2.5, 0); cati.rotation.x = 0.0; g.add(cati);
      const silindir = parca(sil(0.12, 0.12, 2.0, 8), mat(0x6a4020), 0, 1.9, 0); silindir.rotation.z = Math.PI / 2; g.add(silindir);
      g.add(parca(sil(0.01, 0.01, 1.0, 4), mat(0x8a7a5a), 0.2, 1.4, 0, false));
      g.add(parca(sil(0.18, 0.15, 0.25, 10), mat(0x6a4020), 0.2, 0.85, 0));
      const su = parca(geo('kuyuSu', () => new THREE.CircleGeometry(0.9, 18)), mat(0x1a3a6a, { parla: true }), 0, 0.7, 0, false); su.rotation.x = -Math.PI / 2; g.add(su);
      return g;
    }
    return null;
  }
  // Sadece görüntü olan süsler: halılar, kapı kanatları, örümcek ağları, süpürgeler, bahçe yolu, çit, çiçekler, havuz
  function elleSusler(g) {
    const G = H_.GEN, Dz = H_.DER, S = H_.SINIR;
    [[-9, 4.3, 9, 6.5, 0], [0, -13.6, 7, 3.4, 0], [-3.5, 10.1, 6, 4.5, 0], [-21.5, -12, 5, 4, H_.KAT1], [0, 5, 6, 6, H_.KAT1], [15, -4, 7, 5, H_.KAT1], [-4, -5.5, 6, 5, H_.BODRUM]].forEach(([x, z, w, d, y]) => {
      const h = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat(0xffffff, { map: D.hali })); h.rotation.x = -Math.PI / 2; h.position.set(x, y + 0.012, z); h.receiveShadow = true; g.add(h);
    });
    // açık kapı kanatları (ön kapı)
    for (const s of [-1, 1]) { const k = parca(kutu(0.12, 4.1, 2.4), mat(0x6a4020, { map: D.ahsap }), s * 2.45, 2.05, 19.6, false); k.rotation.y = s * 0.25; g.add(k); }
    // bahçe yolu
    const yolT = D.yol.clone(); yolT.repeat.set(1, 12); yolT.needsUpdate = true;
    const yol = new THREE.Mesh(new THREE.PlaneGeometry(3, 25), new THREE.MeshLambertMaterial({ map: yolT })); yol.rotation.x = -Math.PI / 2; yol.position.set(0, 0.015, 31); yol.receiveShadow = true; g.add(yol);
    // çit (sınır boyunca)
    const cit = (x0, z0, x1, z1) => {
      const L = Math.hypot(x1 - x0, z1 - z0), n = Math.floor(L / 2);
      for (let i = 0; i <= n; i++) { const f = i / n; g.add(parca(kutu(0.14, 1.3, 0.14), mat(0x8a6a4a), x0 + (x1 - x0) * f, 0.65, z0 + (z1 - z0) * f)); }
      for (const y of [0.45, 1.05]) { const r = parca(kutu(L, 0.08, 0.06), mat(0xa08060), (x0 + x1) / 2, y, (z0 + z1) / 2); r.rotation.y = -Math.atan2(z1 - z0, x1 - x0); g.add(r); }
    };
    const e = 0.2;
    cit(S.x0 + e, S.z0 + e, S.x1 - e, S.z0 + e); cit(S.x0 + e, S.z0 + e, S.x0 + e, S.z1 - e); cit(S.x1 - e, S.z0 + e, S.x1 - e, S.z1 - e);
    cit(S.x0 + e, S.z1 - e, -2.5, S.z1 - e); cit(2.5, S.z1 - e, S.x1 - e, S.z1 - e);
    // havuz
    const havuz = new THREE.Mesh(geo('havuz', () => new THREE.CircleGeometry(4, 28)), mat(0x2a5a9a, { parla: true, saydam: 0.85 })); havuz.rotation.x = -Math.PI / 2; havuz.position.set(-28, 0.02, 28); g.add(havuz);
    for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; g.add(parca(kure(0.35, 8, 6), mat(0x8a8a8a), -28 + Math.cos(a) * 4.1, 0.1, 28 + Math.sin(a) * 4.1)); }
    // süs çiçekleri (vurulmaz, sadece renk)
    for (let i = 0; i < 70; i++) {
      const x = ((i * 37) % 76) - 38, z = 20 + ((i * 53) % 23);
      if (Math.abs(x) < 3 || (x > -21 && x < -5 && z < 33) || (x > 11 && x < 21 && z > 23 && z < 33) || (x > 25 && z > 27 && z < 37)) continue;
      const c = [0xe84a8a, 0xf0d02a, 0x8a5ae8, 0xffffff][i % 4];
      g.add(parca(sil(0.015, 0.015, 0.3, 4), mat(0x3a7a2a), x, 0.15, z, false)); g.add(parca(kure(0.07, 6, 4), mat(c), x, 0.32, z, false));
    }
    // örümcek ağları (mutfak ve bodrum köşeleri)
    [[-G, Dz, H_.KAT1_ALT], [G, -Dz, H_.KAT1_ALT], [-G, -Dz, H_.KAT1_ALT], [G, Dz, H_.KAT1_ALT], [-16, -16, -0.4], [8, 4, -0.4]].forEach(([x, z, y]) => {
      const a = new THREE.Mesh(geo('ag', () => new THREE.CircleGeometry(1.4, 6, 0, Math.PI / 2)), mat(0xffffff, { parla: true, saydam: 0.18, iki: true }));
      a.position.set(x - Math.sign(x) * 0.02, y - 0.02, z - Math.sign(z) * 0.02); a.rotation.x = Math.PI / 2;
      a.rotation.z = Math.atan2(-Math.sign(z), -Math.sign(x)) - Math.PI / 4; g.add(a);
    });
    // köşede süpürgeler
    [[-23.2, 11], [22.8, 14.6]].forEach(([x, z]) => { const s = supurgeYap(); s.position.set(x, 0.9, z); s.rotation.set(Math.PI / 2 - 0.3, 0, 0.15); g.add(s); });
  }

  // ---------- Vurulabilen süsler (fener, avize, tablo, tencere…) ----------
  const susNesne = new Map();   // id → { pivot, govde, tip, salin, donus }
  function susHedefKur(g) {
    H_.SUS_HEDEF.forEach(s => {
      const pivot = new THREE.Group();
      const asili = ['fener', 'ot', 'kasik', 'asiliTencere', 'avize'].includes(s.tip);
      let govde;
      if (s.tip === 'askiCubuk') {
        g.add(parca(kutu(5, 0.08, 0.08), mat(0x2a2a2a), s.x, s.y, s.z, false));
        for (const dx of [-2.3, 2.3]) g.add(parca(sil(0.015, 0.015, s.ip - s.y, 4), mat(0x2a2a2a), s.x + dx, (s.ip + s.y) / 2, s.z, false));
        return;
      }
      const tur = H_.TUR_NO[H_.SUS_TUR[s.tip] || s.tip];
      govde = tur !== undefined ? esyaYap(tur) : new THREE.Group();
      if (s.tip === 'tablo' && s.renk) govde.traverse(o => { if (o.isMesh && o.userData.tuval) o.material = mat(s.renk); });
      // asılı olanlar tepedeki bir noktadan sallanır
      const ust = s.ip ?? (s.y + s.h + 0.05);
      if (asili) {
        pivot.position.set(s.x, ust, s.z);
        govde.position.set(0, s.y - ust, 0);
        if (s.ip !== undefined || s.tip === 'asiliTencere') pivot.add(parca(sil(0.012, 0.012, ust - s.y - s.h, 4), mat(0x2a2a2a), 0, (s.y + s.h - ust) / 2, 0, false));
        else pivot.add(parca(kutu(0.05, 0.05, 0.3), mat(0x2a2a2a), 0, -0.02, 0.15 * (s.ry !== undefined ? 1 : 0), false));
      } else {
        pivot.position.set(s.x, s.y, s.z);
      }
      if (s.ry !== undefined) pivot.rotation.y = s.ry;
      pivot.add(govde);
      g.add(pivot);
      susNesne.set(s.id, { pivot, govde, tip: s.tip, asili, s, salX: 0, salZ: 0, hX: 0, hZ: 0, egik: 0, sars: 0 });
    });
  }
  // Domates süse çarptı: sallanır, döner, eğrilir
  function susVur(id, dx, dz) {
    const n = susNesne.get(id); if (!n) return;
    const s = n.s, cx = s.x, cy = s.y + s.h / 2, cz = s.z;
    if (n.asili) { n.hX += dz * 2.2; n.hZ -= dx * 2.2; }
    else if (n.tip === 'tablo') { n.egik += (Math.random() < 0.5 ? -1 : 1) * (0.15 + Math.random() * 0.35); n.sars = 0.4; }
    else n.sars = 0.6;
    partikul(cx, cy, cz, n.tip === 'fener' || n.tip === 'direkFener' || n.tip === 'avize' ? 0xffd27a : 0xd8a86a, 12, 2.5, 0.6);
    if (n.tip === 'fener' || n.tip === 'direkFener' || n.tip === 'avize') partikul(cx, cy, cz, 0xffffff, 6, 3.5, 0.4);
  }
  function suslerAdim(dt) {
    susNesne.forEach(n => {
      if (n.asili) {
        // basit sarkaç
        n.hX += -n.salX * 30 * dt; n.hZ += -n.salZ * 30 * dt;
        n.hX *= Math.exp(-1.2 * dt); n.hZ *= Math.exp(-1.2 * dt);
        n.salX += n.hX * dt; n.salZ += n.hZ * dt;
        n.pivot.rotation.x = n.salX; n.pivot.rotation.z = n.salZ;
      } else if (n.sars > 0 || n.egik) {
        n.sars = Math.max(0, n.sars - dt);
        const t = performance.now() / 30;
        n.govde.rotation.z = n.egik + Math.sin(t) * n.sars * 0.15;
        n.govde.position.x = Math.sin(t * 1.3) * n.sars * 0.05;
      }
    });
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
      case 'sulama': ek(sil(r * 0.75, r * 0.85, h * 0.75, 14), mat(0x4a9a5a), 0, h * 0.375, 0); { const o = ek(sil(0.025, 0.04, r * 1.6, 8), mat(0x4a9a5a), r * 1.0, h * 0.55, 0); o.rotation.z = -1.0; } ek(sil(0.06, 0.03, 0.06, 10), mat(0x3a7a4a), r * 1.6, h * 0.95, 0); { const o = ek(simit(r * 0.45, 0.025, Math.PI), mat(0x3a7a4a), -r * 0.1, h * 0.8, 0); } break;
      case 'kova': ek(sil(r, r * 0.8, h, 14, true), mat(0x9a9aa8, { iki: true }), 0, h / 2, 0); ek(sil(r * 0.8, r * 0.8, 0.02, 14), mat(0x8a8a98), 0, 0.01, 0); { const o = ek(simit(r, 0.012, Math.PI), mat(0x5a5a62), 0, h, 0); o.rotation.x = 0.3; } break;
      case 'cuce': ek(koni(r, h * 0.5, 10), mat(0x3a6ad8), 0, h * 0.25, 0); ek(kure(r * 0.6, 10, 8), mat(0xf0c8a0), 0, h * 0.58, 0); { const o = ek(koni(r * 0.5, h * 0.3, 8), mat(0xf8f8f8), 0, h * 0.42, r * 0.3); o.rotation.x = Math.PI; } ek(koni(r * 0.65, h * 0.38, 10), mat(0xd82a2a), 0, h * 0.8, 0); ek(kure(0.035, 6, 4), mat(0xe8806a), 0, h * 0.57, r * 0.6); break;
      case 'saman': ek(kutu(r * 1.8, h, r * 1.25), mat(0xe0c060), 0, h / 2, 0); for (const dx of [-0.25, 0.25]) ek(kutu(0.03, h + 0.01, r * 1.27), mat(0x8a6a2a), dx * r * 1.8, h / 2, 0); break;
      case 'sarap': ek(sil(r, r, h * 0.6, 10), mat(0x1a4a2a, { saydam: 0.9 }), 0, h * 0.3, 0); ek(sil(r * 0.4, r, h * 0.15, 10), mat(0x1a4a2a, { saydam: 0.9 }), 0, h * 0.67, 0); ek(sil(r * 0.4, r * 0.4, h * 0.2, 8), mat(0x1a4a2a), 0, h * 0.85, 0); ek(sil(r * 0.45, r * 0.45, h * 0.08, 8), mat(0x8a1a2a), 0, h * 0.96, 0); ek(kutu(r * 1.4, h * 0.2, 0.01), mat(0xf0e0b0), 0, h * 0.3, r * 1.0); break;
      case 'fener': ek(kutu(r * 1.5, h * 0.65, r * 1.5), mat(0x2a2a2a), 0, h * 0.4, 0); ek(kure(r * 0.6, 10, 8), mat(0xffd27a, { parla: true }), 0, h * 0.4, 0); ek(koni(r * 1.1, h * 0.2, 4), mat(0x2a2a2a), 0, h * 0.82, 0).rotation.y = Math.PI / 4; ek(simit(r * 0.4, 0.015), mat(0x2a2a2a), 0, h * 0.97, 0); break;
      case 'yastik': ek(kure(r, 14, 8), mat(0xf4e8f0), 0, h * 0.5, 0).scale.set(1, h / r * 0.5, 0.7); ek(kutu(r * 0.6, 0.01, r * 0.4), mat(0xe86aa8), 0, h * 0.97, 0); break;
      case 'ayi': ek(kure(r * 0.75, 12, 10), mat(0xa8743a), 0, h * 0.3, 0); ek(kure(r * 0.55, 12, 10), mat(0xa8743a), 0, h * 0.72, 0); for (const sx of [-1, 1]) { ek(kure(r * 0.2, 8, 6), mat(0x8a5a2a), sx * r * 0.42, h * 0.92, 0); ek(kure(r * 0.25, 8, 6), mat(0xa8743a), sx * r * 0.7, h * 0.35, r * 0.2); ek(kure(0.02, 6, 4), mat(0x111111), sx * r * 0.18, h * 0.76, r * 0.5); } ek(kure(r * 0.2, 8, 6), mat(0xe8c8a0), 0, h * 0.68, r * 0.48); ek(sil(r * 0.6, r * 0.6, 0.04, 12), mat(0xd82a5a), 0, h * 0.53, 0); break;
      case 'saat': { const o = ek(sil(r, r, r * 0.8, 16), mat(0xd8302a), 0, h * 0.55, 0); o.rotation.x = Math.PI / 2; const y = ek(sil(r * 0.85, r * 0.85, 0.02, 16), mat(0xf8f4e8), 0, h * 0.55, r * 0.41); y.rotation.x = Math.PI / 2; for (const sx of [-1, 1]) { ek(kure(r * 0.35, 8, 6), mat(0xd8a020), sx * r * 0.6, h * 0.95, 0); ek(sil(0.012, 0.012, h * 0.3, 4), mat(0x2a2a2a), sx * r * 0.6, h * 0.12, 0); } ek(kutu(0.012, r * 0.6, 0.01), mat(0x111111), 0, h * 0.62, r * 0.43); break; }
      case 'sapka': ek(sil(r, r, 0.03, 18), mat(0x2a1a4a), 0, 0.015, 0); { const o = ek(koni(r * 0.55, h * 0.95, 12), mat(0x2a1a4a), 0, h * 0.5, 0); o.rotation.z = 0.15; } ek(sil(r * 0.53, r * 0.56, 0.05, 14), mat(0x8a3ae0), 0, 0.06, 0); ek(kutu(0.06, 0.06, 0.02), mat(0xffd36a), 0, 0.06, r * 0.55); break;
      case 'tablo': ek(kutu(r * 2, h, 0.05), mat(0x8a5a1a), 0, h / 2, 0.025); { const t = ek(kutu(r * 1.65, h * 0.78, 0.06), mat(0xc84a8a), 0, h / 2, 0.03); t.userData.tuval = true; } ek(kure(0.16, 10, 8), mat(0xffe8a0), -r * 0.3, h * 0.55, 0.065).scale.z = 0.2; ek(kutu(r * 1.4, h * 0.12, 0.065), mat(0x2a4a2a), 0, h * 0.22, 0.032); break;
      case 'pencere': { const c = mat(0x4a2e1a); ek(kutu(r * 2, 0.12, 0.12), c, 0, 0.06, 0.06); ek(kutu(r * 2, 0.12, 0.12), c, 0, h - 0.06, 0.06); ek(kutu(0.12, h, 0.12), c, -r + 0.06, h / 2, 0.06); ek(kutu(0.12, h, 0.12), c, r - 0.06, h / 2, 0.06); ek(kutu(0.07, h, 0.08), c, 0, h / 2, 0.06); ek(kutu(r * 2, 0.07, 0.08), c, 0, h / 2, 0.06); ek(kutu(r * 2 - 0.1, h - 0.1, 0.02), mat(0x9ad8f0, { saydam: 0.3 }), 0, h / 2, 0.05); ek(kutu(r * 2 + 0.2, 0.08, 0.25), c, 0, 0.02, 0.12); break; }
      case 'ot': ek(kutu(r * 2.2, 0.06, 0.06), mat(0x6a4020), 0, h - 0.03, 0.06); for (let k = 0; k < 6; k++) { const o = ek(koni(0.08, h * 0.75, 6), mat(k % 2 ? 0x5a8a3a : 0x7aa04a), (k - 2.5) * r * 0.36, h * 0.6, 0.08); o.rotation.x = Math.PI; } for (let k = 0; k < 4; k++) ek(kure(0.08, 8, 6), mat(0xf0e8d8), (k - 1.5) * r * 0.5, h * 0.12, 0.1); break;
      case 'kasik': ek(sil(0.02, 0.02, h * 0.8, 6), mat(0x8a5a2a), 0, h * 0.58, 0.04); { const o = ek(kure(0.09, 10, 8), mat(0xb8b8c0), 0, h * 0.12, 0.06); o.scale.set(1, 0.6, 1); } ek(simit(0.03, 0.008), mat(0x2a2a2a), 0, h * 0.98, 0.04); break;
      case 'direk': ek(sil(0.07, 0.1, h * 0.85, 8), mat(0x2a2a30), 0, h * 0.425, 0); ek(kutu(0.32, 0.4, 0.32), mat(0x2a2a30), 0, h * 0.88, 0); ek(kure(0.12, 10, 8), mat(0xffd27a, { parla: true }), 0, h * 0.88, 0); ek(koni(0.25, 0.18, 4), mat(0x2a2a30), 0, h * 0.98, 0).rotation.y = Math.PI / 4; ek(sil(0.18, 0.22, 0.12, 8), mat(0x2a2a30), 0, 0.06, 0); break;
      case 'avize': { const o = ek(simit(r * 0.85, 0.05), mat(0x3a2a1a), 0, h * 0.25, 0); o.rotation.x = Math.PI / 2; for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; ek(sil(0.05, 0.05, 0.25, 6), mat(0xf4ead0), Math.cos(a) * r * 0.85, h * 0.25 + 0.15, Math.sin(a) * r * 0.85); ek(koni(0.04, 0.12, 5), mat(0xffc83a, { parla: true }), Math.cos(a) * r * 0.85, h * 0.25 + 0.34, Math.sin(a) * r * 0.85); } for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; const z = ek(sil(0.01, 0.01, r * 0.9, 4), mat(0x2a2a2a), Math.cos(a) * r * 0.42, h * 0.6, Math.sin(a) * r * 0.42); z.rotation.z = Math.cos(a) * 1.1; z.rotation.x = -Math.sin(a) * 1.1; } break; }
      case 'sandalye': ek(kutu(0.5, 0.05, 0.5), mat(0x9a6a32), 0, 0.475, 0); for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) ek(kutu(0.06, 0.45, 0.06), mat(0x6a4224), a * 0.2, 0.225, b * 0.2); ek(kutu(0.5, 0.6, 0.06), mat(0x9a6a32), 0, 0.8, -0.22); break;
      case 'kasa': ek(kutu(r * 1.7, h, r * 1.7), mat(0xffffff, { map: D.kasa }), 0, h / 2, 0); break;
      case 'supurge': ek(sil(0.03, 0.03, h * 0.7, 6), mat(0x8a5a2a), 0, h * 0.62, 0); ek(koni(r, h * 0.35, 10), mat(0xd8b05a), 0, h * 0.17, 0).rotation.x = Math.PI; ek(sil(0.05, 0.05, 0.06, 8), mat(0x8a2a2a), 0, h * 0.36, 0); break;
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
    esyaYeri.clear();
    turlere.forEach((liste, t) => {
      const sab = esyaSablon(t);
      sab.children.forEach(p => {
        p.updateMatrix();
        const im = new THREE.InstancedMesh(p.geometry, p.material, liste.length);
        liste.forEach((e, i) => {
          q.setFromAxisAngle(ax, e.yon); m4.compose(v.set(e.x, e.y, e.z), q, s1); m4.multiply(p.matrix); im.setMatrixAt(i, m4);
          if (!esyaYeri.has(e.id)) esyaYeri.set(e.id, []);
          esyaYeri.get(e.id).push({ im, i, pm: p.matrix.clone() });
        });
        im.castShadow = true; im.receiveShadow = true;
        im.instanceMatrix.needsUpdate = true; im.computeBoundingSphere();
        esyaGrup.add(im);
      });
    });
  }
  // Bir eşyanın çizimini yeni yerine taşı (gizle = görünmez yap)
  const esyaYeri = new Map();   // id → [{ im, i, pm }]
  const _m4 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _ax = new THREE.Vector3(0, 1, 0), _v = new THREE.Vector3(), _s = new THREE.Vector3();
  function esyaMatris(id, x, y, z, yon, gizle) {
    (esyaYeri.get(id) || []).forEach(({ im, i, pm }) => {
      _q.setFromAxisAngle(_ax, yon); _m4.compose(_v.set(x, y, z), _q, _s.setScalar(gizle ? 0.0001 : 1)); _m4.multiply(pm);
      im.setMatrixAt(i, _m4); im.instanceMatrix.needsUpdate = true;
    });
  }
  // Vurulan eşya verilen yol boyunca uçar, döner, sonra yeni yerine konar
  const ucanEsyalar = [];
  function esyaUcur(e, yol, yon, bitince) {
    if (!esyaGrup) return;
    esyaMatris(e.id, e.x, e.y, e.z, e.yon, true);
    const m = esyaYap(e.t); m.position.set(...yol[0]); m.rotation.y = e.yon; scene.add(m);
    const ex = ucanEsyalar.find(u => u.e === e); if (ex) { scene.remove(ex.m); ucanEsyalar.splice(ucanEsyalar.indexOf(ex), 1); }
    ucanEsyalar.push({ e, m, yol, yon, t: 0, sure: Math.max(0.25, (yol.length - 1) * 0.1), donX: (Math.random() - 0.5) * 18, donZ: (Math.random() - 0.5) * 18, bitince });
    partikul(yol[0][0], yol[0][1] + 0.2, yol[0][2], 0xffe8a0, 10, 3, 0.5);
  }
  function ucanlarAdim(dt) {
    for (let i = ucanEsyalar.length - 1; i >= 0; i--) {
      const u = ucanEsyalar[i]; u.t += dt;
      const f = Math.min(1, u.t / u.sure), k = f * (u.yol.length - 1), a = Math.floor(k), b = Math.min(u.yol.length - 1, a + 1), w = k - a;
      const A = u.yol[a], B = u.yol[b];
      u.m.position.set(A[0] + (B[0] - A[0]) * w, A[1] + (B[1] - A[1]) * w, A[2] + (B[2] - A[2]) * w);
      if (u.yol.length < 3) { u.m.position.y += Math.sin(f * Math.PI) * 0.25; u.m.rotation.z = Math.sin(f * 20) * 0.3 * (1 - f); }
      else { u.m.rotation.x = u.donX * f * (1 - f) * 2; u.m.rotation.z = u.donZ * f * (1 - f) * 2; u.m.rotation.y = u.e.yon + (u.yon - u.e.yon) * f; }
      if (f >= 1) {
        scene.remove(u.m); ucanEsyalar.splice(i, 1);
        const son = u.yol[u.yol.length - 1];
        u.e.x = son[0]; u.e.y = son[1]; u.e.z = son[2]; u.e.yon = u.yon;
        esyaMatris(u.e.id, u.e.x, u.e.y, u.e.z, u.e.yon, false);
        if (u.yol.length >= 3) partikul(son[0], son[1] + 0.1, son[2], 0xc8a878, 8, 2, 0.4);
        u.bitince && u.bitince();
      }
    }
  }
  function esyalarTemizle() { ucanEsyalar.forEach(u => scene.remove(u.m)); ucanEsyalar.length = 0; if (esyaGrup) { esyaGrup.parent?.remove(esyaGrup); esyaGrup.children.forEach(o => o.dispose()); esyaGrup = null; } }

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
  // Aşçının fırlattığı büyülü domates: döne döne uçar, çarptığı yerde patlar ve leke bırakır
  const domatesler = [], lekeler = [];
  let lekeDoku = null;
  function domatesAt(a, b, sure, bitince) {
    const g = new THREE.Group();
    g.add(parca(kure(0.14, 12, 10), mat(0xe8281a, { isik: 0x5a0a04 }), 0, 0, 0, false));
    g.add(parca(koni(0.07, 0.06, 5), mat(0x3a9a2a), 0, 0.15, 0, false));
    const iz = parca(kure(0.22, 8, 6), mat(0xff6a4a, { parla: true, saydam: 0.35 }), 0, 0, 0, false); g.add(iz);
    g.position.copy(a); scene.add(g);
    domatesler.push({ g, a: a.clone(), b: b.clone(), t: 0, sure: Math.max(0.05, sure), bitince });
  }
  function domatesAdim(dt) {
    for (let i = domatesler.length - 1; i >= 0; i--) {
      const d = domatesler[i]; d.t += dt;
      const f = Math.min(1, d.t / d.sure);
      d.g.position.lerpVectors(d.a, d.b, f);
      d.g.rotation.x += dt * 14; d.g.rotation.z += dt * 9;
      if (Math.random() < 0.6) partikul(d.g.position.x, d.g.position.y, d.g.position.z, Math.random() < 0.5 ? 0xff5a3a : 0xffd27a, 1, 0.6, 0.3);
      if (f >= 1) {
        scene.remove(d.g); domatesler.splice(i, 1);
        patla(d.b);
        d.bitince && d.bitince();
      }
    }
  }
  function patla(p) {
    partikul(p.x, p.y, p.z, 0xe8281a, 16, 3.5, 0.6);
    partikul(p.x, p.y, p.z, 0xff8a6a, 8, 2, 0.5);
    partikul(p.x, p.y, p.z, 0xffe06a, 5, 4, 0.35);
    if (!lekeDoku) {
      const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
      g.fillStyle = '#c8180c'; g.beginPath(); g.arc(32, 32, 16, 0, 7); g.fill();
      for (let i = 0; i < 9; i++) { const a = Math.random() * 7, r = 14 + Math.random() * 14; g.beginPath(); g.arc(32 + Math.cos(a) * r, 32 + Math.sin(a) * r, 3 + Math.random() * 5, 0, 7); g.fill(); }
      lekeDoku = new THREE.CanvasTexture(c); lekeDoku.colorSpace = THREE.SRGBColorSpace;
    }
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: lekeDoku, transparent: true, depthWrite: false }));
    s.position.copy(p); s.scale.setScalar(0.5 + Math.random() * 0.3); s.userData = { t: 0 };
    scene.add(s); lekeler.push(s);
    if (lekeler.length > 40) { const l = lekeler.shift(); scene.remove(l); l.material.dispose(); }
  }
  function lekelerAdim(dt) {
    for (let i = lekeler.length - 1; i >= 0; i--) {
      const l = lekeler[i]; l.userData.t += dt;
      l.material.opacity = Math.max(0, 1 - Math.max(0, l.userData.t - 5) / 2);
      if (l.userData.t > 7) { scene.remove(l); l.material.dispose(); lekeler.splice(i, 1); }
    }
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
    ucanlarAdim(dt); domatesAdim(dt); lekelerAdim(dt); suslerAdim(dt);
    kabarciklar.forEach(b => { const u = b.userData; u.f += dt * 0.6; if (u.f > 1) { u.f = 0; u.a = Math.random() * 6; u.r = Math.random() * 1.5; } b.position.set(Math.cos(u.a) * u.r, u.y + u.f * 0.3, Math.sin(u.a) * u.r); b.scale.setScalar(Math.sin(u.f * Math.PI) + 0.01); });
    if (kazanSivi) kazanSivi.material.color.setHSL(0.36 + Math.sin(simdi / 900) * 0.05, 0.9, 0.55);
    renderer.render(scene, camera);
    return dt;
  }

  return {
    kur, at, ciz, elle, sars, esyalarKur, esyalarTemizle, esyaYap, oyuncuYap, gorunusDegis, oyuncuOynat, kepceUcu,
    etiketYap, etiketCiz, partikul, yaziGoster, isinCiz, halka, iksirUcur, hayaletGoster, isaretKoy, RENKLER, RENK_AD,
    esyaUcur, domatesAt, patla, susVur, susNesne,
    get scene() { return scene; }, get camera() { return camera; }, get renderer() { return renderer; },
  };
})();
