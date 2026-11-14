/* Maison Moinet — la pastille du Bassin de Vichy en volume (WebGL 1, sans dépendance).
   Un octogone allongé à bords chanfreinés. Le relief « BASSIN DE VICHY » (rebord relevé, cuvette,
   lettres en saillie) est dessiné dans un canvas 2D, adouci, puis converti en carte de normales.
   API : MoinetPastille.create(canvas) -> { draw({ spin, tiltX, tiltZ, bounce }), resize() } ou null
   si WebGL n'est pas disponible (la page garde alors l'image fixe). */
(() => {
  'use strict';

  /* Proportions relevées sur la photo des pastilles (hauteur = 1) */
  const A = 0.7, B = 0.5, CX = 0.34, CY = 0.26, HZ = 0.15, BEVEL = 0.05;
  const OUTLINE = [[A - CX, B], [CX - A, B], [-A, B - CY], [-A, CY - B], [CX - A, -B], [A - CX, -B], [A, CY - B], [A, B - CY]];
  const DIST = 4.6, FOV = 26 * Math.PI / 180;

  const norm2 = (x, y) => { const l = Math.hypot(x, y) || 1; return [x / l, y / l]; };
  const edgeNormal = (p, q) => norm2(q[1] - p[1], p[0] - q[0]);
  const inset = (poly, c) => poly.map((p, i) => {
    const prev = poly[(i + poly.length - 1) % poly.length], next = poly[(i + 1) % poly.length];
    const n0 = edgeNormal(prev, p), n1 = edgeNormal(p, next);
    const d0 = n0[0] * p[0] + n0[1] * p[1] - c, d1 = n1[0] * p[0] + n1[1] * p[1] - c;
    const det = n0[0] * n1[1] - n0[1] * n1[0];
    return [(d0 * n1[1] - d1 * n0[1]) / det, (n0[0] * d1 - n1[0] * d0) / det];
  });

  /* ---------- Maillage : 2 faces, 2 chanfreins, 1 tranche (64 triangles) ---------- */
  function buildMesh() {
    const v = [];
    const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
    const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
    const nrm = (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
    const tri = (p, n, uv, f) => {            /* l'ordre des sommets est corrigé pour regarder vers l'extérieur */
      const g = cross(sub(p[1], p[0]), sub(p[2], p[0]));
      const out = g[0] * (n[0][0] + n[1][0] + n[2][0]) + g[1] * (n[0][1] + n[1][1] + n[2][1]) + g[2] * (n[0][2] + n[1][2] + n[2][2]);
      (out < 0 ? [0, 2, 1] : [0, 1, 2]).forEach((k) => v.push(p[k][0], p[k][1], p[k][2], n[k][0], n[k][1], n[k][2], uv[k][0], uv[k][1], f));
    };
    const Z = [0, 0];
    const quad = (p, n) => { tri([p[0], p[1], p[2]], [n[0], n[1], n[2]], [Z, Z, Z], 0); tri([p[0], p[2], p[3]], [n[0], n[2], n[3]], [Z, Z, Z], 0); };
    const inner = inset(OUTLINE, BEVEL), N = OUTLINE.length, zs = HZ - BEVEL;
    [1, -1].forEach((s) => {                  /* dessus, puis dessous (texte lisible des deux côtés) */
      const nz = [0, 0, s], z = s * HZ;
      const uv = (p) => [s * p[0] / (2 * A) + 0.5, p[1] / (2 * B) + 0.5];
      for (let i = 0; i < N; i++) {
        const a = inner[i], b = inner[(i + 1) % N], o1 = OUTLINE[i], o2 = OUTLINE[(i + 1) % N], e = edgeNormal(o1, o2);
        tri([[0, 0, z], [a[0], a[1], z], [b[0], b[1], z]], [nz, nz, nz], [uv([0, 0]), uv(a), uv(b)], s);
        /* chanfrein aux normales adoucies : un bord de comprimé, pas une arête vive */
        const nt = nrm([e[0] * 0.5, e[1] * 0.5, s]), nb = nrm([e[0], e[1], s * 0.5]);
        quad([[a[0], a[1], z], [b[0], b[1], z], [o2[0], o2[1], s * zs], [o1[0], o1[1], s * zs]], [nt, nt, nb, nb]);
      }
    });
    for (let i = 0; i < N; i++) {
      const o1 = OUTLINE[i], o2 = OUTLINE[(i + 1) % N], e = edgeNormal(o1, o2), n = [e[0], e[1], 0];
      quad([[o1[0], o1[1], zs], [o2[0], o2[1], zs], [o2[0], o2[1], -zs], [o1[0], o1[1], -zs]], [n, n, n, n]);
    }
    return new Float32Array(v);
  }

  /* ---------- Relief : hauteur dessinée en 2D -> carte de normales (RVB) + hauteur (alpha) ---------- */
  function buildRelief(font) {
    const W = 1024, H = 512, K = 1000;
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.setTransform(W / (2 * A * K), 0, 0, H / (2 * B * K), W / 2, H / 2);   /* unités : millièmes, y vers le bas */
    const path = (poly) => { g.beginPath(); poly.forEach((p, i) => (i ? g.lineTo(p[0] * K, -p[1] * K) : g.moveTo(p[0] * K, -p[1] * K))); g.closePath(); };
    g.fillStyle = 'rgb(206,206,206)'; g.fillRect(-K, -K, 2 * K, 2 * K);      /* rebord relevé */
    g.fillStyle = 'rgb(64,64,64)'; path(inset(OUTLINE, 0.105)); g.fill();     /* cuvette */
    g.fillStyle = 'rgb(232,232,232)'; g.textBaseline = 'alphabetic'; g.textAlign = 'left';
    const size = 218, track = 15;
    g.font = `500 ${size}px ${font}`;
    const line = (text, base) => {
      const ws = [...text].map((ch) => g.measureText(ch).width);
      let x = -(ws.reduce((a, b) => a + b, 0) + track * (text.length - 1)) / 2;
      [...text].forEach((ch, i) => { g.fillText(ch, x, base); x += ws[i] + track; });
    };
    line('BASSIN', -165); line('DE', 75); line('VICHY', 315);

    const px = g.getImageData(0, 0, W, H).data;
    let h = new Float32Array(W * H);
    for (let i = 0; i < W * H; i++) h[i] = px[i * 4] / 255;
    const blur = (src, rx, ry) => {            /* flou en boîte séparable */
      const tmp = new Float32Array(W * H), out = new Float32Array(W * H);
      for (let y = 0; y < H; y++) {
        let acc = 0; const row = y * W;
        for (let x = -rx; x <= rx; x++) acc += src[row + Math.min(W - 1, Math.max(0, x))];
        for (let x = 0; x < W; x++) {
          tmp[row + x] = acc / (2 * rx + 1);
          acc += src[row + Math.min(W - 1, x + rx + 1)] - src[row + Math.max(0, x - rx)];
        }
      }
      for (let x = 0; x < W; x++) {
        let acc = 0;
        for (let y = -ry; y <= ry; y++) acc += tmp[Math.min(H - 1, Math.max(0, y)) * W + x];
        for (let y = 0; y < H; y++) {
          out[y * W + x] = acc / (2 * ry + 1);
          acc += tmp[Math.min(H - 1, y + ry + 1) * W + x] - tmp[Math.max(0, y - ry) * W + x];
        }
      }
      return out;
    };
    h = blur(blur(blur(h, 5, 3), 4, 3), 3, 2);
    const DEPTH = 0.046, dx = (2 * A) / W, dy = (2 * B) / H;
    const out = new Uint8Array(W * H * 4);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const i = y * W + x;
        const sx = (h[y * W + Math.min(W - 1, x + 1)] - h[y * W + Math.max(0, x - 1)]) / (2 * dx) * DEPTH;
        const sy = (h[Math.max(0, y - 1) * W + x] - h[Math.min(H - 1, y + 1) * W + x]) / (2 * dy) * DEPTH;
        const l = Math.hypot(sx, sy, 1);
        out[i * 4] = (-sx / l * 0.5 + 0.5) * 255;
        out[i * 4 + 1] = (-sy / l * 0.5 + 0.5) * 255;
        out[i * 4 + 2] = (1 / l * 0.5 + 0.5) * 255;
        out[i * 4 + 3] = h[i] * 255;
      }
    }
    return { W, H, data: out };
  }

  const VS = `
attribute vec3 aPos; attribute vec3 aNor; attribute vec2 aUv; attribute float aFace;
uniform mat4 uProj; uniform mat4 uModel; uniform mat3 uRot;
varying vec3 vNor; varying vec3 vTan; varying vec3 vBit; varying vec2 vUv; varying float vFace; varying vec3 vObj; varying vec3 vWorld;
void main() {
  vNor = uRot * aNor; vTan = uRot * vec3(aFace, 0.0, 0.0); vBit = uRot * vec3(0.0, 1.0, 0.0);
  vUv = aUv; vFace = abs(aFace); vObj = aPos;
  vec4 w = uModel * vec4(aPos, 1.0); vWorld = w.xyz;
  gl_Position = uProj * w;
}`;

  const FS = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform sampler2D uRelief; uniform vec3 uBounce;
varying vec3 vNor; varying vec3 vTan; varying vec3 vBit; varying vec2 vUv; varying float vFace; varying vec3 vObj; varying vec3 vWorld;
float hash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
void main() {
  vec3 n = normalize(vNor);
  float h = 0.8;
  if (vFace > 0.5) {
    vec4 t = texture2D(uRelief, vUv);
    vec3 nt = t.rgb * 2.0 - 1.0;
    n = normalize(nt.x * normalize(vTan) + nt.y * normalize(vBit) + nt.z * n);
    h = t.a;
  }
  /* grain du sucre comprimé */
  vec3 cell = floor(vObj * 210.0);
  float g1 = hash(cell), g2 = hash(cell + 7.3);
  n = normalize(n + (vec3(g1, g2, 0.5) - 0.5) * 0.085);

  vec3 V = normalize(-vWorld);
  vec3 L = normalize(vec3(-0.52, 0.70, 0.62));
  float wrap = clamp((dot(n, L) + 0.28) / 1.28, 0.0, 1.0);
  float fill = max(dot(n, normalize(vec3(0.75, -0.30, 0.55))), 0.0);
  /* ciel : ce qui regarde vers le haut et vers nous ; sol : ce qui regarde vers le bas reçoit la couleur du fond */
  float hemi = clamp(dot(n, normalize(vec3(0.0, 0.72, 0.70))) * 0.5 + 0.5, 0.0, 1.0);
  vec3 sky = vec3(1.0, 0.985, 0.96) * 0.50;
  vec3 ground = mix(vec3(0.42), uBounce, 0.7) * 0.46;
  float ao = mix(0.70, 1.0, smoothstep(0.22, 0.8, h));
  vec3 albedo = vec3(0.96, 0.955, 0.935) * (0.97 + 0.06 * g1);
  vec3 col = albedo * (mix(ground, sky, hemi) * ao
    + vec3(1.0, 0.975, 0.93) * wrap * wrap * 1.02
    + mix(vec3(0.55), uBounce, 0.6) * fill * 0.16);
  float fres = pow(1.0 - max(dot(n, V), 0.0), 3.0);
  col += mix(vec3(1.0), uBounce, 0.5) * fres * 0.07;
  col = pow(clamp(col, 0.0, 1.0), vec3(0.4545));
  gl_FragColor = vec4(col, 1.0);
}`;

  const mul3 = (a, b) => {
    const o = new Array(9);
    for (let c = 0; c < 3; c++) for (let r = 0; r < 3; r++) o[c * 3 + r] = a[r] * b[c * 3] + a[3 + r] * b[c * 3 + 1] + a[6 + r] * b[c * 3 + 2];
    return o;
  };
  const rotX = (a) => { const c = Math.cos(a), s = Math.sin(a); return [1, 0, 0, 0, c, s, 0, -s, c]; };
  const rotY = (a) => { const c = Math.cos(a), s = Math.sin(a); return [c, 0, -s, 0, 1, 0, s, 0, c]; };
  const rotZ = (a) => { const c = Math.cos(a), s = Math.sin(a); return [c, s, 0, -s, c, 0, 0, 0, 1]; };
  const srgb = (c) => c.map((x) => Math.pow(x, 2.2));

  function create(canvas) {
    let gl = null;
    try { gl = canvas.getContext('webgl', { alpha: true, antialias: true, premultipliedAlpha: true, powerPreference: 'low-power' }); } catch (e) { /* pas de WebGL */ }
    if (!gl) return null;

    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null; };
    let prog, loc, tex, count = 0, ready = false;
    const setup = () => {
      const vs = sh(gl.VERTEX_SHADER, VS), fs = sh(gl.FRAGMENT_SHADER, FS);
      if (!vs || !fs) return false;
      prog = gl.createProgram(); gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return false;
      gl.useProgram(prog);
      const mesh = buildMesh(); count = mesh.length / 9;
      gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer()); gl.bufferData(gl.ARRAY_BUFFER, mesh, gl.STATIC_DRAW);
      const attr = (name, size, off) => { const l = gl.getAttribLocation(prog, name); gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, size, gl.FLOAT, false, 36, off); };
      attr('aPos', 3, 0); attr('aNor', 3, 12); attr('aUv', 2, 24); attr('aFace', 1, 32);
      loc = {}; ['uProj', 'uModel', 'uRot', 'uRelief', 'uBounce'].forEach((u) => { loc[u] = gl.getUniformLocation(prog, u); });
      tex = gl.createTexture();
      relief('Jost, Futura, "Century Gothic", sans-serif');
      gl.enable(gl.DEPTH_TEST); gl.enable(gl.CULL_FACE); gl.clearColor(0, 0, 0, 0);
      return true;
    };
    const relief = (font) => {
      const r = buildRelief(font);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, r.W, r.H, 0, gl.RGBA, gl.UNSIGNED_BYTE, r.data);
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      const ext = gl.getExtension('EXT_texture_filter_anisotropic');
      if (ext) gl.texParameterf(gl.TEXTURE_2D, ext.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(8, gl.getParameter(ext.MAX_TEXTURE_MAX_ANISOTROPY_EXT)));
    };
    ready = setup();
    if (!ready) return null;

    let last = null;
    const api = {
      resize() {
        const r = canvas.getBoundingClientRect(), d = Math.min(window.devicePixelRatio || 1, 2);
        const w = Math.max(2, Math.round(r.width * d)), h = Math.max(2, Math.round(r.height * d));
        if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
        gl.viewport(0, 0, canvas.width, canvas.height);
        if (last) api.draw(last);
      },
      /* spin : tour autour de l'axe vertical ; tiltX, tiltZ : inclinaisons ; bounce : couleur du fond [r,v,b] 0–1 */
      draw(s) {
        if (!ready || gl.isContextLost()) return;
        last = s;
        const rot = mul3(rotZ(s.tiltZ || 0), mul3(rotX(s.tiltX || 0), rotY(s.spin || 0)));
        const f = 1 / Math.tan(FOV / 2), asp = canvas.width / canvas.height, near = 1, far = 12;
        gl.uniformMatrix4fv(loc.uProj, false, [f / asp, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) / (near - far), -1, 0, 0, 2 * far * near / (near - far), 0]);
        gl.uniformMatrix4fv(loc.uModel, false, [rot[0], rot[1], rot[2], 0, rot[3], rot[4], rot[5], 0, rot[6], rot[7], rot[8], 0, 0, 0, -DIST, 1]);
        gl.uniformMatrix3fv(loc.uRot, false, rot);
        gl.uniform3fv(loc.uBounce, srgb(s.bounce || [0.5, 0.5, 0.5]));
        gl.uniform1i(loc.uRelief, 0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.drawArrays(gl.TRIANGLES, 0, count);
      }
    };
    canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); ready = false; });
    canvas.addEventListener('webglcontextrestored', () => { ready = setup(); api.resize(); });
    /* la gravure est redessinée quand Jost est chargée */
    if (document.fonts && document.fonts.load) {
      document.fonts.load('500 64px Jost').then(() => { if (ready && !gl.isContextLost()) { relief('Jost, Futura, "Century Gothic", sans-serif'); if (last) api.draw(last); } }).catch(() => {});
    }
    api.resize();
    return api;
  }

  window.MoinetPastille = { create };
})();
