// arch-player.js — AWS アーキテクチャ通信アニメーションプレーヤー
// data/aws-animation/*.json 形式(拡張あり)を SVG で再生する。依存なしの ES モジュール。
const NS = 'http://www.w3.org/2000/svg';
const SPEEDS = [0.5, 1, 2];
const DEF_PACKET = '#ffb347';
const DEF_EDGE = '#ed922b';
const DEF_DUR = 1900;
const NODE_H = 40;
const KIND_LABEL = { alternate_route: '代替経路', association: '関連付け', async: '非同期', replication: 'レプリケーション' };

const el = (tag, attrs = {}, parent) => {
  const n = document.createElementNS(NS, tag);
  for (const k in attrs) if (attrs[k] != null) n.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(n);
  return n;
};
const h = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
};
const textW = (s, size = 13) => {
  let w = 0;
  for (const ch of String(s)) w += /[　-鿿＀-￯]/.test(ch) ? size : (/[A-Z0-9]/.test(ch) ? size * 0.64 : size * 0.54);
  return w;
};
const splitName = (s) => {
  const words = String(s).split(' ');
  if (words.length < 2) return [s];
  let best = null;
  for (let i = 1; i < words.length; i++) {
    const a = words.slice(0, i).join(' '), b = words.slice(i).join(' ');
    const m = Math.max(textW(a), textW(b));
    if (!best || m < best.m) best = { m, lines: [a, b] };
  }
  return best.lines;
};

export class ArchPlayer {
  constructor(host, opts = {}) {
    this.host = host;
    this.opts = opts;
    this.speed = 1;
    this.playing = false;
    this.stepOnce = false;
    this.idx = 0;
    this.t = 0;
    this.raf = 0;
    this.last = 0;
    this.selected = null;
    this.arch = null;
    this.reduce = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    this._build();
  }

  /* ---------- DOM skeleton ---------- */
  _build() {
    const host = this.host;
    host.classList.add('ap-root');
    if (!host.hasAttribute('tabindex')) host.tabIndex = 0;
    host.innerHTML = '';
    this.cap = h('div', 'ap-caption');
    this.capHead = h('div', 'ap-cap-head');
    this.capDesc = h('div', 'ap-cap-desc');
    this.cap.append(this.capHead, this.capDesc);
    this.cap.setAttribute('aria-live', 'polite');
    this.stage = h('div', 'ap-stage');
    this.notesEl = h('div', 'ap-notes');
    this.legendEl = h('div', 'ap-legend');

    const bar = h('div', 'ap-controls');
    this.btnPlay = h('button', 'ap-btn ap-btn-primary', '▶ 再生');
    this.btnStep = h('button', 'ap-btn', 'ステップ ⏭');
    this.btnReset = h('button', 'ap-btn', '↺ リセット');
    for (const b of [this.btnPlay, this.btnStep, this.btnReset]) b.type = 'button';
    this.btnStep.title = '1ステップ進める (→)';
    this.btnReset.title = '最初に戻す (Home)';
    this.btnPlay.title = '再生 / 一時停止 (Space)';
    const seg = h('div', 'ap-speed');
    seg.setAttribute('role', 'group');
    seg.setAttribute('aria-label', '再生速度');
    this.speedBtns = SPEEDS.map((s) => {
      const b = h('button', 'ap-btn ap-seg', `${s}×`);
      b.type = 'button';
      b.dataset.speed = s;
      seg.appendChild(b);
      return b;
    });
    this.progress = h('span', 'ap-progress', '0 / 0');
    bar.append(this.btnPlay, this.btnStep, this.btnReset, seg, this.progress);

    // 各ステップで止めるか(説明をじっくり読むため)
    const hold = h('label', 'ap-hold');
    this.chkHold = h('input');
    this.chkHold.type = 'checkbox';
    try { this.chkHold.checked = localStorage.getItem('aaa.ap.hold') === '1'; } catch (e) { /* noop */ }
    hold.append(this.chkHold, ' 1ステップごとに止める');
    bar.insertBefore(hold, this.progress);

    this.info = h('div', 'ap-info');
    // ステップの説明一覧(全ステップを常に表示し、再生中のステップを強調)
    const listBox = h('div', 'ap-logbox');
    listBox.append(h('div', 'ap-sub', 'ステップの説明(押すとそのステップへ)'));
    this.logEl = h('ol', 'ap-log ap-steps');
    listBox.append(this.logEl);
    const side = h('div', 'ap-side');
    side.append(listBox, this.info);
    const left = h('div', 'ap-left');
    left.append(this.cap, this.stage, this.legendEl, this.notesEl, bar);
    const main = h('div', 'ap-main');
    main.append(left, side);

    host.append(main);

    // listeners
    this._on = [];
    const on = (t, ev, fn) => { t.addEventListener(ev, fn); this._on.push([t, ev, fn]); };
    on(this.btnPlay, 'click', () => this.toggle());
    on(this.btnStep, 'click', () => this.step());
    on(this.btnReset, 'click', () => this.reset());
    on(this.chkHold, 'change', () => { try { localStorage.setItem('aaa.ap.hold', this.chkHold.checked ? '1' : '0'); } catch (e) { /* noop */ } });
    on(this.logEl, 'click', (e) => {
      const li = e.target.closest && e.target.closest('[data-k]');
      if (!li) return;
      const wasPlaying = this.playing;
      this.pause();
      this.go(+li.dataset.k);
      if (wasPlaying) this.play();
    });
    this.speedBtns.forEach((b) => on(b, 'click', () => this.setSpeed(+b.dataset.speed)));
    on(host, 'keydown', (e) => {
      if (e.target.closest && e.target.closest('button') && (e.key === ' ' || e.key === 'Enter')) return;
      if (e.target.closest && e.target.closest('.ap-node') && e.key === 'Enter') return;
      if (e.key === ' ') { e.preventDefault(); this.toggle(); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); this.step(); }
      else if (e.key === 'Home') { e.preventDefault(); this.reset(); }
    });
    if (typeof IntersectionObserver === 'function') {
      this.io = new IntersectionObserver((ents) => {
        for (const en of ents) if (!en.isIntersecting && this.playing) this.pause();
      }, { threshold: 0.05 });
      this.io.observe(host);
    }
    this._syncSpeed();
  }

  /* ---------- public API ---------- */
  load(arch, { autoplay = false, start = 0 } = {}) {
    this._stop();
    this.playing = false;
    this.stepOnce = false;
    this.selected = null;
    this.arch = ArchPlayer.vertical(arch || { nodes: [], steps: [] });
    this._spread();
    const nodes = this.arch.nodes || [];
    this.nodeMap = new Map(nodes.map((n) => [n.id, n]));
    this.steps = [...(this.arch.steps || [])]
      .filter((s) => this.nodeMap.has(s.source) && this.nodeMap.has(s.target))
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    this._renderSvg();
    this._renderNotes();
    this._renderLegend();
    this._renderInfo();
    this.go(start);
    if (autoplay) this.play();
  }

  /** 流れが横向きの図は x と y を入れ替えて縦向き(上 → 下)にする */
  static vertical(a) {
    const nodes = a.nodes || [];
    const pos = new Map(nodes.map((n) => [n.id, n]));
    let dx = 0, dy = 0;
    for (const st of a.steps || []) {
      const path = [st.source, ...(st.via || []), st.target].map((id) => pos.get(id)).filter(Boolean);
      for (let i = 1; i < path.length; i++) { dx += Math.abs(path[i].x - path[i - 1].x); dy += Math.abs(path[i].y - path[i - 1].y); }
    }
    if (!(dx > dy * 1.1)) return { ...a, nodes: nodes.map((n) => ({ ...n })) };
    const W = a.canvas?.width || 660, H = a.canvas?.height || 450;
    return {
      ...a,
      canvas: { width: H, height: W },
      nodes: nodes.map((n) => ({ ...n, x: n.y, y: n.x, _box: undefined })),
      zones: (a.zones || []).map((z) => ({ ...z, x: z.y, y: z.x, width: z.height, height: z.width })),
    };
  }

  /** ノードの枠が重なる場合は、座標(とゾーン)を引き伸ばして重ならないようにする */
  _spread() {
    const a = this.arch, ns = a.nodes || [];
    let kx = 1, ky = 1;
    for (let i = 0; i < ns.length; i++) for (let j = i + 1; j < ns.length; j++) {
      const p = ns[i], q = ns[j], bp = this._box(p), bq = this._box(q);
      const dx = Math.abs(p.x - q.x), dy = Math.abs(p.y - q.y);
      const needX = (bp.w + bq.w) / 2 + 18, needY = (bp.h + bq.h) / 2 + 22;
      if (dx >= needX || dy >= needY) continue;
      if (dx >= dy && dx > 0) kx = Math.max(kx, needX / dx);
      else if (dy > 0) ky = Math.max(ky, needY / dy);
      else kx = Math.max(kx, 2);
    }
    kx = Math.min(kx, 3); ky = Math.min(ky, 3);
    if (kx === 1 && ky === 1) return;
    ns.forEach((n) => { n.x *= kx; n.y *= ky; });
    a.zones = (a.zones || []).map((z) => ({ ...z, x: z.x * kx, y: z.y * ky, width: z.width * kx, height: z.height * ky }));
    a.canvas = { width: (a.canvas?.width || 660) * kx, height: (a.canvas?.height || 450) * ky };
  }

  play() {
    if (!this.steps || !this.steps.length) return;
    if (this.idx >= this.steps.length) this.go(0);
    this.playing = true;
    if (this.t === 0) this._beginStep();
    this._loop();
    this._ui();
  }

  pause() {
    this.playing = false;
    this.stepOnce = false;
    this._stop();
    this._ui();
  }

  toggle() { this.playing ? this.pause() : this.play(); }

  step() {
    if (!this.steps || !this.steps.length) return;
    if (this.idx >= this.steps.length) return;
    this.stepOnce = true;
    if (!this.playing) {
      this.playing = true;
      if (this.t === 0) this._beginStep();
      this._loop();
    }
    this._ui();
  }

  reset() {
    this.pause();
    this.go(0);
  }

  go(i) {
    if (!this.steps) return;
    const n = this.steps.length;
    i = Math.max(0, Math.min(n, Math.floor(+i || 0)));
    this.idx = i;
    this.t = 0;
    this.arrowLayer.textContent = '';
    this._renderSteps();
    for (let k = 0; k < i; k++) this._drawArrow(this.steps[k], false);
    this._hidePacket();
    this._clearActive();
    if (this.playing && i < n) this._beginStep();
    else if (i < n) this._previewStep();
    this._caption();
    this._ui();
  }

  setSpeed(s) {
    if (SPEEDS.includes(s)) this.speed = s;
    this._syncSpeed();
  }

  destroy() {
    this._stop();
    this.playing = false;
    for (const [t, ev, fn] of this._on || []) t.removeEventListener(ev, fn);
    this._on = [];
    if (this.io) this.io.disconnect();
    this.io = null;
    this.host.classList.remove('ap-root');
    this.host.innerHTML = '';
  }

  /* ---------- rendering ---------- */
  _box(n) {
    if (n._box) return n._box;
    const name = String(n.name ?? n.id);
    let lines = [name];
    let fs = 13;
    if (textW(name) + 24 > 150) {
      const sp = splitName(name);
      if (sp.length === 2) lines = sp;
      else fs = Math.max(10, Math.floor(13 * 150 / (textW(name) + 24)));
    }
    const w = Math.max(104, Math.ceil(Math.max(...lines.map((l) => textW(l, fs)))) + 28);
    const hh = lines.length > 1 ? 70 : 58;
    n._box = { w, h: hh, lines, fs };
    return n._box;
  }

  _renderSvg() {
    const a = this.arch;
    const W = a.canvas?.width || 660, H = a.canvas?.height || 450;
    this.stage.textContent = '';
    const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, class: 'ap-svg', role: 'img', 'aria-label': a.title || 'アーキテクチャ図' });
    this.svg = svg;
    this.defs = el('defs', {}, svg);
    this.markers = new Map();
    const zl = el('g', { class: 'ap-zones' }, svg);
    for (const z of a.zones || []) {
      const az = /availability zone|^az\b|subnet/i.test(z.label || '');
      el('rect', { x: z.x, y: z.y, width: z.width, height: z.height, rx: 12, class: 'ap-zone' + (az ? ' ap-zone-az' : '') }, zl);
      const t = el('text', { x: z.x + 10, y: z.y + 17, class: 'ap-zone-label' }, zl);
      t.textContent = z.label || '';
    }
    const xl = el('g', { class: 'ap-extras' }, svg);
    for (const c of a.extra_connections || []) {
      const s = this.nodeMap.get(c.source), t = this.nodeMap.get(c.target);
      if (!s || !t) continue;
      const [p, q] = this._clipSeg(s, t);
      const g = el('g', { class: 'ap-extra' }, xl);
      el('line', { x1: p.x, y1: p.y, x2: q.x, y2: q.y }, g);
      el('line', { x1: p.x, y1: p.y, x2: q.x, y2: q.y, class: 'ap-extra-hit' }, g);
      el('title', {}, g).textContent = `${c.label || KIND_LABEL[c.kind] || c.kind || '関連'}: ${s.name} ↔ ${t.name}`;
    }
    this.arrowLayer = el('g', { class: 'ap-arrows' }, svg);
    const nl = el('g', { class: 'ap-nodes' }, svg);
    this.nodeEls = new Map();
    for (const n of a.nodes || []) {
      const b = this._box(n);
      const g = el('g', { class: 'ap-node', transform: `translate(${n.x},${n.y})`, tabindex: 0, role: 'button', 'aria-label': `${n.name}: ${n.description || ''}` }, nl);
      el('rect', { x: -b.w / 2 - 5, y: -b.h / 2 - 5, width: b.w + 10, height: b.h + 10, rx: 13, class: 'ap-node-glow' }, g);
      el('rect', { x: -b.w / 2, y: -b.h / 2, width: b.w, height: b.h, rx: 9, class: 'ap-node-box' }, g);
      // サービスの所属(カテゴリ)ごとに枠の色を分け、アイコン(略称)を上に表示
      const m = this._meta(n);
      g.classList.add('c-' + m.color);
      const icon = el('text', { x: 0, y: -b.h / 2 + 18, class: 'ap-node-icon', 'text-anchor': 'middle', 'dominant-baseline': 'central' }, g);
      icon.textContent = m.abbr;
      icon.setAttribute('font-size', m.abbr.length > 3 ? 11 : m.abbr.length > 2 ? 13 : 17);
      const lh = b.fs + 3;
      const top = -b.h / 2 + 38;
      b.lines.forEach((l, i) => {
        const t = el('text', { x: 0, y: top + i * lh, class: 'ap-node-text', 'font-size': b.fs, 'dominant-baseline': 'central', 'text-anchor': 'middle' }, g);
        t.textContent = l;
      });
      const sel = () => this._select(n.id);
      g.addEventListener('click', sel);
      g.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); sel(); } });
      this.nodeEls.set(n.id, g);
    }
    // packet
    this.pkt = el('g', { class: 'ap-packet', style: 'display:none' }, svg);
    this.pktCircle = el('circle', { r: 7 }, this.pkt);
    this.pktLabel = el('text', { y: -13, 'text-anchor': 'middle', class: 'ap-packet-label' }, this.pkt);
    this.stage.appendChild(svg);
    // 余白を詰めて、図の内容がある範囲だけを表示する(スマホで図が小さくなりすぎないように)
    {
      const xs = [], ys = [];
      (a.zones || []).forEach((z) => { xs.push(z.x, z.x + z.width); ys.push(z.y, z.y + z.height); });
      (a.nodes || []).forEach((n) => { const b = n._box || { w: 96, h: 40 }; xs.push(n.x - b.w / 2 - 6, n.x + b.w / 2 + 6); ys.push(n.y - b.h / 2 - 22, n.y + b.h / 2 + 8); });
      if (xs.length) {
        const pad = 14;
        const x0 = Math.max(0, Math.min(...xs) - pad), y0 = Math.max(0, Math.min(...ys) - pad);
        const x1 = Math.min(W, Math.max(...xs) + pad), y1 = Math.min(H, Math.max(...ys) + pad);
        if (x1 - x0 > 80 && y1 - y0 > 60) svg.setAttribute('viewBox', `${x0} ${y0} ${x1 - x0} ${y1 - y0}`);
      }
    }
  }

  _renderNotes() {
    const notes = this.arch.notes;
    this.notesEl.textContent = '';
    const list = Array.isArray(notes) ? notes : (notes ? [notes] : []);
    if (!list.length) { this.notesEl.hidden = true; return; }
    this.notesEl.hidden = false;
    const ul = h('ul', 'ap-notes-list');
    for (const s of list) ul.append(h('li', null, s));
    this.notesEl.append(h('span', 'ap-notes-head', '注記'), ul);
  }

  _renderInfo() {
    this.info.textContent = '';
    this.info.append(h('div', 'ap-sub', 'ノード詳細'));
    const n = this.selected && this.nodeMap.get(this.selected);
    if (!n) {
      this.info.append(h('p', 'ap-info-empty', '図のノードをクリックすると、役割の説明を表示します。'));
      return;
    }
    this.info.append(h('div', 'ap-info-name', n.name), h('p', 'ap-info-desc', n.description || '説明はありません。'));
    if (n.svc && typeof this.opts.onNode === 'function') {
      const b = h('button', 'ap-btn ap-btn-link', 'このサービスの解説へ →');
      b.type = 'button';
      b.addEventListener('click', () => this.opts.onNode(n.svc));
      this.info.append(b);
    }
  }

  _select(id) {
    this.selected = this.selected === id ? null : id;
    for (const [k, g] of this.nodeEls) g.classList.toggle('ap-selected', k === this.selected);
    this._renderInfo();
  }

  /* ---------- geometry ---------- */
  /** ノードの所属(カテゴリ)・色・アイコン。meta が無いノードは外部(利用者・オンプレミス)扱い */
  _meta(n) {
    let m = null;
    if (n.svc && typeof this.opts.meta === 'function') { try { m = this.opts.meta(n.svc) || null; } catch { m = null; } }
    const ext = !n.svc || ['user', 'onprem', 'internet'].includes(n.svc);
    return {
      color: (!ext && m?.color) || 'gray',
      abbr: ext ? (n.svc === 'onprem' ? '⌂' : '◎') : (m?.abbr || String(n.name || n.id).slice(0, 3)),
      cat: ext ? '利用者・外部' : (m?.cat || 'その他'),
    };
  }

  _renderLegend() {
    const seen = new Map();
    for (const n of this.arch.nodes || []) { const m = this._meta(n); if (!seen.has(m.cat)) seen.set(m.cat, m.color); }
    this.legendEl.textContent = '';
    this.legendEl.hidden = seen.size < 2;
    for (const [cat, color] of seen) {
      const c = h('span', 'ap-leg c-' + color);
      c.append(h('i'), cat);
      this.legendEl.append(c);
    }
  }

  _edgePt(n, toward) {
    const b = this._box(n);
    const dx = toward.x - n.x, dy = toward.y - n.y;
    if (!dx && !dy) return { x: n.x, y: n.y };
    const hw = b.w / 2 + 3, hh = b.h / 2 + 3;
    const s = Math.min(dx ? hw / Math.abs(dx) : Infinity, dy ? hh / Math.abs(dy) : Infinity);
    return { x: n.x + dx * s, y: n.y + dy * s };
  }
  _clipSeg(a, b) { return [this._edgePt(a, b), this._edgePt(b, a)]; }

  _segments(st) {
    const ids = [st.source, ...((st.via || []).filter((v) => this.nodeMap.has(v))), st.target];
    const segs = [];
    for (let i = 0; i < ids.length - 1; i++) {
      const a = this.nodeMap.get(ids[i]), b = this.nodeMap.get(ids[i + 1]);
      if (a === b) continue;
      let [p, q] = this._clipSeg(a, b);
      // 往復の矢印が重ならないよう方向ごとに少しずらす
      const dx = q.x - p.x, dy = q.y - p.y, len = Math.hypot(dx, dy) || 1;
      const off = 6; // 法線は進行方向で反転するので往路・復路が左右に分かれる
      const ox = (-dy / len) * off, oy = (dx / len) * off;
      p = { x: p.x + ox, y: p.y + oy };
      q = { x: q.x + ox, y: q.y + oy };
      segs.push({ p, q, len: Math.hypot(q.x - p.x, q.y - p.y) });
    }
    return segs;
  }

  _marker(color) {
    if (this.markers.has(color)) return this.markers.get(color);
    const id = `ap-m-${Math.random().toString(36).slice(2, 8)}`;
    const m = el('marker', { id, viewBox: '0 0 10 10', refX: 8.5, refY: 5, markerWidth: 6, markerHeight: 6, orient: 'auto-start-reverse' }, this.defs);
    el('path', { d: 'M1,1 L9,5 L1,9', fill: 'none', stroke: color, 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, m);
    this.markers.set(color, id);
    return id;
  }

  _drawArrow(st, current) {
    if (st.source === st.target) return;
    const color = st.edge_color || DEF_EDGE;
    const mk = this._marker(color);
    const g = el('g', { class: 'ap-arrow' + (current ? ' ap-arrow-current' : '') }, this.arrowLayer);
    const segs = this._segments(st);
    for (const s of segs) {
      el('line', { x1: s.p.x, y1: s.p.y, x2: s.q.x, y2: s.q.y, stroke: color, 'marker-end': `url(#${mk})` }, g);
    }
    // 操作名(GetItem など)を矢印の中央、線の横に表示する(再生中の矢印だけ)
    if (st.operation && segs.length) {
      const s0 = segs[Math.floor((segs.length - 1) / 2)];
      const mx = (s0.p.x + s0.q.x) / 2, my = (s0.p.y + s0.q.y) / 2;
      const dx = s0.q.x - s0.p.x, dy = s0.q.y - s0.p.y, len = Math.hypot(dx, dy) || 1;
      const horiz = Math.abs(dx) >= Math.abs(dy);
      const t = el('text', horiz
        ? { x: mx, y: my - 11, 'text-anchor': 'middle', class: 'ap-arrow-op' }
        : { x: mx + (dy > 0 ? -12 : 12), y: my, 'text-anchor': dy > 0 ? 'end' : 'start', 'dominant-baseline': 'central', class: 'ap-arrow-op' }, g);
      t.textContent = st.operation;
      t.setAttribute('fill', color);
    }
    el('title', {}, g).textContent = `${st.order ?? ''}. ${st.title || ''} (${st.operation || ''})`;
    return g;
  }

  /* ---------- playback ---------- */
  /** 到着後に説明を読むための待ち時間(説明が長いほど長く。速度に合わせて短縮) */
  _hold(st) {
    const len = String(st.title || '').length + String(st.description || '').length;
    return Math.min(7000, Math.max(1400, 900 + len * 45)) / this.speed;
  }

  _stepBar(f) {
    const li = this.logEl.children[this.idx];
    if (li) li.style.setProperty('--ap-p', (f * 100).toFixed(1) + '%');
  }

  _dur(st) { return (+st.duration_ms > 0 ? +st.duration_ms : DEF_DUR) / this.speed; }

  _clearActive() {
    for (const g of this.nodeEls.values()) g.classList.remove('ap-active', 'ap-pulse');
    for (const g of this.arrowLayer.querySelectorAll('.ap-arrow-current')) g.classList.remove('ap-arrow-current');
  }

  _markActive(st) {
    this._clearActive();
    if (st.source === st.target) this.nodeEls.get(st.source)?.classList.add('ap-active', 'ap-pulse');
    else for (const id of [st.source, ...(st.via || []), st.target]) this.nodeEls.get(id)?.classList.add('ap-active');
  }

  _previewStep() {
    // 一時停止中に現在ステップを開始位置で表示
    const st = this.steps[this.idx];
    if (!st) return;
    this._markActive(st);
    this._curSegs = this._segments(st);
    if (st.source !== st.target && this._curSegs.length && this.idx > 0) this._placePacket(st, 0);
    else this._hidePacket();
  }

  _beginStep() {
    const st = this.steps[this.idx];
    if (!st) return;
    this.t = 0;
    this._markActive(st);
    this._curSegs = this._segments(st);
    this._curArrow = this._drawArrow(st, true);
    if (st.source === st.target || !this._curSegs.length) this._hidePacket();
    else this._placePacket(st, this.reduce ? 1 : 0);
    this._caption();
  }

  _placePacket(st, f) {
    const segs = this._curSegs || [];
    const total = segs.reduce((s, x) => s + x.len, 0);
    let d = total * Math.max(0, Math.min(1, f));
    let pt = segs.length ? segs[0].p : { x: 0, y: 0 };
    for (const s of segs) {
      if (d <= s.len) { const r = s.len ? d / s.len : 0; pt = { x: s.p.x + (s.q.x - s.p.x) * r, y: s.p.y + (s.q.y - s.p.y) * r }; break; }
      d -= s.len;
      pt = s.q;
    }
    this.pkt.style.display = '';
    this.pkt.setAttribute('transform', `translate(${pt.x.toFixed(1)},${pt.y.toFixed(1)})`);
    this.pktCircle.setAttribute('fill', st.packet_color || DEF_PACKET);
    if (this.pktLabel.textContent) this.pktLabel.textContent = '';
  }

  _hidePacket() { if (this.pkt) this.pkt.style.display = 'none'; }

  _completeStep() {
    const k = this.idx;
    if (this._curArrow) this._curArrow.classList.remove('ap-arrow-current');
    this._curArrow = null;
    this._appendLog(k);
    this.idx++;
    this.t = 0;
    this._hidePacket();
    if (this.idx >= this.steps.length) {
      this.playing = false;
      this.stepOnce = false;
      this._clearActive();
    } else if (this.stepOnce || this.chkHold.checked) {
      this.playing = false;
      this.stepOnce = false;
      this._previewStep();
    } else {
      this._beginStep();
    }
    this._caption();
    this._ui();
  }

  _loop() {
    if (this.raf) return;
    this.last = performance.now();
    const tick = (now) => {
      this.raf = 0;
      if (!this.playing) return;
      const dt = Math.min(100, now - this.last);
      this.last = now;
      const st = this.steps[this.idx];
      if (!st) { this.pause(); return; }
      this.t += dt;
      const dur = this._dur(st);
      const hold = this._hold(st);
      if (st.source !== st.target && !this.reduce) this._placePacket(st, Math.min(1, this.t / dur));
      this._stepBar(Math.min(1, this.t / (dur + hold)));
      if (this.t >= dur + hold) this._completeStep();
      if (this.playing) this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }

  _stop() { if (this.raf) cancelAnimationFrame(this.raf); this.raf = 0; }

  _name(id) { return this.nodeMap.get(id)?.name ?? id; }

  _renderSteps() {
    this.logEl.textContent = '';
    this.steps.forEach((st, k) => {
      const path = st.source === st.target
        ? `${this._name(st.source)} 内で処理`
        : [st.source, ...(st.via || []), st.target].map((id) => this._name(id)).join(' → ');
      const li = h('li', 'ap-log-item');
      li.dataset.k = k;
      li.tabIndex = 0;
      li.style.setProperty('--ap-c', st.edge_color || DEF_EDGE);
      const head = h('div', 'ap-st-head');
      head.append(h('span', 'ap-st-no', String(k + 1)), h('b', 'ap-st-title', st.title || ''));
      if (st.operation) head.append(h('span', 'ap-st-op', st.operation));
      li.append(head, h('div', 'ap-st-route', path));
      if (st.description) li.append(h('div', 'ap-st-desc', st.description));
      this.logEl.appendChild(li);
    });
    this._markSteps();
  }

  _markSteps() {
    const items = this.logEl.children;
    for (let k = 0; k < items.length; k++) {
      const li = items[k];
      li.classList.toggle('ap-done', k < this.idx);
      li.classList.toggle('ap-cur', k === this.idx);
      if (k !== this.idx) li.style.removeProperty('--ap-p');
    }
    const cur = items[this.idx];
    if (cur) {
      const box = this.logEl;
      const top = cur.offsetTop - box.offsetTop;
      if (top < box.scrollTop || top + cur.offsetHeight > box.scrollTop + box.clientHeight) box.scrollTo({ top: Math.max(0, top - 8), behavior: this.reduce ? 'auto' : 'smooth' });
    }
  }

  _appendLog() { this._markSteps(); }

  _caption() {
    const n = this.steps?.length || 0;
    if (!n) { this.capHead.textContent = this.arch?.title || ''; this.capDesc.textContent = 'ステップがありません。'; return; }
    if (this.idx >= n) {
      this.capHead.textContent = `完了 · 全${n}ステップ`;
      this.capDesc.textContent = '↺ リセットでもう一度再生できます。';
      return;
    }
    if (this.idx === 0 && this.t === 0 && !this.playing) {
      this.capHead.textContent = this.arch.title || '通信フロー';
      this.capDesc.textContent = `▶ 再生で ${n} ステップの通信の流れを順に表示します。`;
      return;
    }
    const st = this.steps[this.idx];
    this.capHead.textContent = '';
    this.capHead.append(h('span', 'ap-cap-step', `STEP ${this.idx + 1}/${n}`), ` · ${st.title || ''} `);
    if (st.operation) this.capHead.append(h('span', 'ap-cap-op', `[${st.operation}]`));
    const route = st.source === st.target ? `${this._name(st.source)} 内で処理` : `${this._name(st.source)} → ${this._name(st.target)}`;
    this.capDesc.textContent = st.description ? `${route} — ${st.description}` : route;
  }

  _syncSpeed() {
    for (const b of this.speedBtns) {
      const on = +b.dataset.speed === this.speed;
      b.classList.toggle('ap-on', on);
      b.setAttribute('aria-pressed', on);
    }
  }

  _ui() {
    const n = this.steps?.length || 0;
    this.btnPlay.textContent = this.playing ? '⏸ 一時停止' : '▶ 再生';
    this.btnPlay.setAttribute('aria-pressed', this.playing);
    this.btnStep.disabled = this.idx >= n;
    this.progress.textContent = `${Math.min(this.idx, n)} / ${n}`;
    this._markSteps();
    this.host.classList.toggle('ap-playing', this.playing);
  }
}

export default ArchPlayer;
