// ─── Service Worker ───────────────────────────────────────────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js'));
}

// ─── State ────────────────────────────────────────────────────────
const DB_KEY = 'luft_jobs';
let jobs = [];
let currentJobId = null;
let openingCount = 0;
const canvasState = {};
const photoState = {};
const STAMP_TOOLS = ['handle', 'slide-l', 'slide-r', 'chev-r', 'chev-l'];
const COLORS = ['#1a1a1a','#c0392b','#2980b9','#27ae60','#8e44ad','#e67e22'];
const STROKES = [1.5, 2.5, 4];
const WINDOW_TYPES = ['Turn & Tilt','Picture','Hopper','Specialty/Arch','Lift & Slide','Smoovio','Multislide','French','Entry'];

// ─── Storage ──────────────────────────────────────────────────────
function loadJobs() {
  try { jobs = JSON.parse(localStorage.getItem(DB_KEY) || '[]'); } catch { jobs = []; }
}
function saveJobs() {
  localStorage.setItem(DB_KEY, JSON.stringify(jobs));
}

// ─── Screens ──────────────────────────────────────────────────────
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('screen-' + id).classList.add('active');
}

function goBack() {
  showScreen('list');
  renderJobList();
}

// ─── Job List ─────────────────────────────────────────────────────
function renderJobList() {
  loadJobs();
  const list = document.getElementById('job-list');
  const empty = document.getElementById('job-list-empty');
  list.innerHTML = '';
  if (!jobs.length) { empty.style.display = 'block'; list.style.display = 'none'; return; }
  empty.style.display = 'none'; list.style.display = 'flex';
  jobs.slice().reverse().forEach(job => {
    const card = document.createElement('div');
    card.className = 'job-card';
    const name = job.customer || 'Unnamed job';
    const addr = job.address || 'No address';
    const date = job.date ? new Date(job.date).toLocaleDateString('en-US', {month:'short',day:'numeric',year:'numeric'}) : '';
    const count = (job.openings || []).length;
    card.innerHTML = `
      <div class="job-card-info" onclick="editJob('${job.id}')">
        <div class="job-card-name">${name}</div>
        <div class="job-card-addr">${addr}</div>
        <div class="job-card-meta">${date}${date && count ? ' · ' : ''}${count ? count + ' opening' + (count !== 1 ? 's' : '') : ''}</div>
      </div>
      <div class="job-card-actions">
        <button class="job-edit-btn" onclick="editJob('${job.id}')">Open</button>
        <button class="job-del-btn" onclick="deleteJob('${job.id}', event)">Delete</button>
      </div>
    `;
    list.appendChild(card);
  });
}

function newJob() {
  currentJobId = 'job_' + Date.now();
  openingCount = 0;
  Object.keys(canvasState).forEach(k => delete canvasState[k]);
  Object.keys(photoState).forEach(k => delete photoState[k]);
  clearForm();
  document.getElementById('openings-container').innerHTML = '';
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('f-cdate').value = today;
  showScreen('form');
  addOpening();
}

function editJob(id) {
  loadJobs();
  const job = jobs.find(j => j.id === id);
  if (!job) return;
  currentJobId = id;
  openingCount = 0;
  Object.keys(canvasState).forEach(k => delete canvasState[k]);
  Object.keys(photoState).forEach(k => delete photoState[k]);
  document.getElementById('openings-container').innerHTML = '';
  loadFormFromJob(job);
  showScreen('form');
}

function deleteJob(id, e) {
  e.stopPropagation();
  if (!confirm('Delete this job? This cannot be undone.')) return;
  jobs = jobs.filter(j => j.id !== id);
  saveJobs();
  renderJobList();
  toast('Job deleted');
}

// ─── Form Load / Save ─────────────────────────────────────────────
function clearForm() {
  ['f-cname','f-caddr','f-cdate','f-crep','f-extcolor','f-intcolor','f-glaze','f-hinge','f-handle'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  ['p-s8000','p-linear','p-smoovio','p-multislide'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.checked = false;
  });
}

function loadFormFromJob(job) {
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
  set('f-cname', job.customer);
  set('f-caddr', job.address);
  set('f-cdate', job.date);
  set('f-crep', job.rep);
  set('f-extcolor', job.frame?.ext);
  set('f-intcolor', job.frame?.int);
  set('f-glaze', job.glaze);
  set('f-hinge', job.hinge);
  set('f-handle', job.handle);
  const prods = job.products || [];
  document.getElementById('p-s8000').checked = prods.includes('S8000');
  document.getElementById('p-linear').checked = prods.includes('Linear');
  document.getElementById('p-smoovio').checked = prods.includes('Smoovio');
  document.getElementById('p-multislide').checked = prods.includes('MultiSlide');
  (job.openings || []).forEach(op => addOpening(null, op));
}

function collectFormData() {
  const products = [];
  if (document.getElementById('p-s8000').checked) products.push('S8000');
  if (document.getElementById('p-linear').checked) products.push('Linear');
  if (document.getElementById('p-smoovio').checked) products.push('Smoovio');
  if (document.getElementById('p-multislide').checked) products.push('MultiSlide');
  const openings = [];
  for (const id in canvasState) {
    const canvas = document.getElementById('canvas-' + id);
    openings.push({
      id,
      room: document.getElementById('room-' + id)?.value || '',
      type: document.getElementById('wtype-' + id)?.value || '',
      qty: document.getElementById('qty-' + id)?.value || '1',
      iw: document.getElementById('iw-' + id)?.value || '',
      ih: document.getElementById('ih-' + id)?.value || '',
      ow: document.getElementById('ow-' + id)?.value || '',
      oh: document.getElementById('oh-' + id)?.value || '',
      notes: document.getElementById('notes-' + id)?.value || '',
      paths: canvasState[id].paths,
      drawingDataUrl: canvas ? canvas.toDataURL('image/png') : null,
      photos: photoState[id] || []
    });
  }
  return {
    id: currentJobId,
    customer: document.getElementById('f-cname').value,
    address: document.getElementById('f-caddr').value,
    date: document.getElementById('f-cdate').value,
    rep: document.getElementById('f-crep').value,
    products,
    frame: {
      ext: document.getElementById('f-extcolor').value,
      int: document.getElementById('f-intcolor').value
    },
    glaze: document.getElementById('f-glaze').value,
    hinge: document.getElementById('f-hinge').value,
    handle: document.getElementById('f-handle').value,
    openings,
    updatedAt: Date.now()
  };
}

function saveJob() {
  loadJobs();
  const job = collectFormData();
  const idx = jobs.findIndex(j => j.id === job.id);
  if (idx >= 0) jobs[idx] = job; else jobs.push(job);
  saveJobs();
  toast('Job saved');
}

// ─── Openings ─────────────────────────────────────────────────────
function addOpening(cloneId, loadData) {
  openingCount++;
  const id = openingCount;
  const div = document.createElement('div');
  div.className = 'opening-card';
  div.id = 'op-' + id;

  const src = cloneId ? canvasState[cloneId] : null;
  const gv = (fid) => {
    if (loadData) return loadData[fid] || '';
    if (src) return document.getElementById(fid + '-' + cloneId)?.value || '';
    return '';
  };
  const gQty = loadData ? (loadData.qty || '1') : src ? (document.getElementById('qty-' + cloneId)?.value || '1') : '1';
  const wtype = loadData ? (loadData.type || '') : src ? (document.getElementById('wtype-' + cloneId)?.value || '') : '';

  div.innerHTML = `
    <div class="opening-header">
      <div class="opening-title">Opening ${id}${src ? ` <span style="font-size:11px;color:#aaa">(copy of ${cloneId})</span>` : ''}</div>
      <div class="opening-actions">
        <button class="dup-btn" onclick="addOpening(${id})">Duplicate</button>
        <button class="del-btn" onclick="removeOpening(${id})">Remove</button>
      </div>
    </div>
    <div class="opening-grid4">
      <div class="field"><label>Room</label><input type="text" id="room-${id}" placeholder="Living room" value="${gv('room')}" autocomplete="off"></div>
      <div class="field"><label>Type</label>
        <select id="wtype-${id}">
          <option value="">Select</option>
          ${WINDOW_TYPES.map(t => `<option${t === wtype ? ' selected' : ''}>${t}</option>`).join('')}
        </select>
      </div>
      <div class="field"><label>Inside W x H (in)</label>
        <div class="dim-row">
          <input type="number" id="iw-${id}" placeholder="W" value="${gv('iw')}">
          <span class="dim-sep">x</span>
          <input type="number" id="ih-${id}" placeholder="H" value="${gv('ih')}">
        </div>
      </div>
      <div class="field"><label>Qty</label><input type="number" id="qty-${id}" min="1" value="${gQty}" style="text-align:center;font-weight:600"></div>
    </div>
    <div class="opening-grid" style="margin-bottom:10px">
      <div class="field"><label>Outside W x H (in)</label>
        <div class="dim-row">
          <input type="number" id="ow-${id}" placeholder="W" value="${gv('ow')}">
          <span class="dim-sep">x</span>
          <input type="number" id="oh-${id}" placeholder="H" value="${gv('oh')}">
        </div>
      </div>
    </div>
    <div class="toolbar-wrap">
      ${makeToolbar(id)}
    </div>
    <div class="canvas-wrap"><canvas id="canvas-${id}" height="280"></canvas></div>
    <div class="field" style="margin-top:8px"><label>Notes</label><textarea id="notes-${id}" rows="2" placeholder="Conditions, special requests...">${gv('notes')}</textarea></div>
    <div style="margin-top:10px">
      <div class="photo-section-label">Photos</div>
      <div class="photo-grid" id="photo-grid-${id}"></div>
      <label class="photo-add-btn">
        <input type="file" accept="image/*" capture="environment" multiple style="display:none" onchange="handlePhotos(${id}, this)">
        <span>+ Add photos</span>
      </label>
    </div>
  `;
  document.getElementById('openings-container').appendChild(div);

  canvasState[id] = {
    tool: 'pen', color: '#1a1a1a', stroke: 2.5,
    paths: src ? JSON.parse(JSON.stringify(src.paths)) : (loadData?.paths ? JSON.parse(JSON.stringify(loadData.paths)) : []),
    redoStack: [], drawing: false, startX: 0, startY: 0, snapshot: null
  };

  photoState[id] = loadData?.photos ? [...loadData.photos] : (src ? [...(photoState[cloneId] || [])] : []);
  renderPhotos(id);

  initCanvas(id);
  div.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function removeOpening(id) {
  const el = document.getElementById('op-' + id);
  if (el) el.remove();
  delete canvasState[id];
  delete photoState[id];
}

function makeToolbar(id) {
  return `
    <div class="tb-row">
      <span class="tg-label">Draw</span>
      <button class="tbtn active" id="btn-pen-${id}" onclick="setTool(${id},'pen')">Pen</button>
      <button class="tbtn" id="btn-line-${id}" onclick="setTool(${id},'line')">Line</button>
      <button class="tbtn" id="btn-rect-${id}" onclick="setTool(${id},'rect')">Rect</button>
      <button class="tbtn" id="btn-text-${id}" onclick="setTool(${id},'text')">Text</button>
      <div class="tb-divider"></div>
      <span class="tg-label">Stamps</span>
      <button class="tbtn amber" id="btn-handle-${id}" onclick="setTool(${id},'handle')">Handle</button>
      <button class="tbtn amber" id="btn-slide-l-${id}" onclick="setTool(${id},'slide-l')">&#8592; Slide</button>
      <button class="tbtn amber" id="btn-slide-r-${id}" onclick="setTool(${id},'slide-r')">Slide &#8594;</button>
      <div class="tb-divider"></div>
      <span class="tg-label">Chevron</span>
      <button class="tbtn amber chev" id="btn-chev-l-${id}" onclick="setTool(${id},'chev-l')">&lt;</button>
      <button class="tbtn amber chev" id="btn-chev-r-${id}" onclick="setTool(${id},'chev-r')">&gt;</button>
      <div class="tb-divider"></div>
      <div id="colors-${id}" style="display:flex;gap:4px;align-items:center">
        ${COLORS.map((c,i) => `<div class="color-dot${i===0?' active':''}" style="background:${c}" onclick="setColor(${id},'${c}',this)"></div>`).join('')}
      </div>
      <div class="tb-divider"></div>
      <div id="strokes-${id}" style="display:flex;gap:4px">
        ${STROKES.map((s,i) => `<div class="stroke-opt${i===1?' active':''}" onclick="setStroke(${id},${s},this)">${s}</div>`).join('')}
      </div>
      <div style="flex:1"></div>
      <button class="tbtn act-sm" onclick="undoCanvas(${id})">Undo</button>
      <button class="tbtn act-sm" onclick="clearCanvas(${id})">Clear</button>
    </div>
    <div id="hint-${id}" class="hint-bar" style="display:none">Tap on the drawing to place symbol</div>
  `;
}

// ─── Canvas ───────────────────────────────────────────────────────
function initCanvas(id) {
  const canvas = document.getElementById('canvas-' + id);
  const wrap = canvas.parentElement;
  const dpr = window.devicePixelRatio || 1;

  function resize() {
    const w = wrap.offsetWidth;
    canvas.width = w * dpr;
    canvas.height = 280 * dpr;
    canvas.style.width = w + 'px';
    canvas.style.height = '280px';
    canvas.getContext('2d').scale(dpr, dpr);
    redraw(id);
  }
  resize();
  new ResizeObserver(resize).observe(wrap);

  const getPos = (e) => {
    const r = canvas.getBoundingClientRect();
    const src = e.touches ? e.touches[0] : e;
    return { x: src.clientX - r.left, y: src.clientY - r.top };
  };

  canvas.addEventListener('mousedown', e => onStart(e, id));
  canvas.addEventListener('mousemove', e => onMove(e, id));
  canvas.addEventListener('mouseup', e => onEnd(e, id));
  canvas.addEventListener('touchstart', e => onStart(e, id), { passive: false });
  canvas.addEventListener('touchmove', e => onMove(e, id), { passive: false });
  canvas.addEventListener('touchend', e => onEnd(e, id), { passive: false });
}

function onStart(e, id) {
  e.preventDefault();
  const s = canvasState[id];
  if (!s) return;
  const canvas = document.getElementById('canvas-' + id);
  const r = canvas.getBoundingClientRect();
  const src = e.touches ? e.touches[0] : e;
  const x = src.clientX - r.left, y = src.clientY - r.top;

  if (STAMP_TOOLS.includes(s.tool)) {
    s.paths.push({ tool: s.tool, color: s.color, stroke: s.stroke, x, y });
    s.redoStack = [];
    redraw(id);
    return;
  }
  s.drawing = true; s.startX = x; s.startY = y;
  if (s.tool === 'text') {
    const txt = prompt('Enter label:');
    if (txt) { s.paths.push({ tool: 'text', color: s.color, stroke: s.stroke, text: txt, x, y }); redraw(id); }
    s.drawing = false; return;
  }
  if (s.tool === 'pen') s.paths.push({ tool: 'pen', color: s.color, stroke: s.stroke, points: [{ x, y }] });
  s.snapshot = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height);
}

function onMove(e, id) {
  e.preventDefault();
  const s = canvasState[id];
  if (!s || !s.drawing) return;
  const canvas = document.getElementById('canvas-' + id);
  const r = canvas.getBoundingClientRect();
  const src = e.touches ? e.touches[0] : e;
  const x = src.clientX - r.left, y = src.clientY - r.top;
  const ctx = canvas.getContext('2d');
  if (s.tool === 'pen') {
    const path = s.paths[s.paths.length - 1];
    path.points.push({ x, y });
    ctx.strokeStyle = s.color; ctx.lineWidth = s.stroke; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const pts = path.points;
    if (pts.length > 1) { ctx.beginPath(); ctx.moveTo(pts[pts.length-2].x, pts[pts.length-2].y); ctx.lineTo(x, y); ctx.stroke(); }
  } else {
    ctx.putImageData(s.snapshot, 0, 0);
    ctx.strokeStyle = s.color; ctx.lineWidth = s.stroke; ctx.lineCap = 'round';
    ctx.beginPath();
    if (s.tool === 'line') { ctx.moveTo(s.startX, s.startY); ctx.lineTo(x, y); }
    if (s.tool === 'rect') { ctx.rect(s.startX, s.startY, x - s.startX, y - s.startY); }
    ctx.stroke();
  }
}

function onEnd(e, id) {
  e.preventDefault();
  const s = canvasState[id];
  if (!s || !s.drawing) return;
  s.drawing = false;
  const canvas = document.getElementById('canvas-' + id);
  const r = canvas.getBoundingClientRect();
  const ev = e.changedTouches ? e.changedTouches[0] : e;
  const x = ev.clientX - r.left, y = ev.clientY - r.top;
  if (s.tool === 'line' || s.tool === 'rect') {
    s.paths.push({ tool: s.tool, color: s.color, stroke: s.stroke, x1: s.startX, y1: s.startY, x2: x, y2: y });
  }
  s.redoStack = [];
}

function drawSymbol(ctx, p) {
  ctx.strokeStyle = p.color; ctx.fillStyle = p.color;
  ctx.lineWidth = p.stroke; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const { x, y } = p;

  if (p.tool === 'handle') {
    const SZ = 36;
    ctx.beginPath(); ctx.rect(x-4, y-SZ/2, 8, SZ); ctx.stroke();
    ctx.beginPath(); ctx.rect(x-14, y-5, 10, 10); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x-4, y); ctx.lineTo(x-14, y); ctx.stroke();
  }
  if (p.tool === 'slide-l') {
    const len = 56, ah = 10;
    ctx.beginPath(); ctx.moveTo(x+len/2, y); ctx.lineTo(x-len/2, y); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x-len/2, y); ctx.lineTo(x-len/2+ah, y-ah);
    ctx.moveTo(x-len/2, y); ctx.lineTo(x-len/2+ah, y+ah);
    ctx.stroke();
    ctx.font = `bold ${Math.round(p.stroke*2+8)}px -apple-system,sans-serif`;
    const tw = ctx.measureText('SLIDE').width;
    ctx.fillText('SLIDE', x-tw/2, y+20);
  }
  if (p.tool === 'slide-r') {
    const len = 56, ah = 10;
    ctx.beginPath(); ctx.moveTo(x-len/2, y); ctx.lineTo(x+len/2, y); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x+len/2, y); ctx.lineTo(x+len/2-ah, y-ah);
    ctx.moveTo(x+len/2, y); ctx.lineTo(x+len/2-ah, y+ah);
    ctx.stroke();
    ctx.font = `bold ${Math.round(p.stroke*2+8)}px -apple-system,sans-serif`;
    const tw = ctx.measureText('SLIDE').width;
    ctx.fillText('SLIDE', x-tw/2, y+20);
  }
  if (p.tool === 'chev-r') {
    const H = 52, W = 30; ctx.lineWidth = p.stroke + 1;
    ctx.beginPath(); ctx.moveTo(x-W/2, y-H/2); ctx.lineTo(x+W/2, y); ctx.lineTo(x-W/2, y+H/2); ctx.stroke();
  }
  if (p.tool === 'chev-l') {
    const H = 52, W = 30; ctx.lineWidth = p.stroke + 1;
    ctx.beginPath(); ctx.moveTo(x+W/2, y-H/2); ctx.lineTo(x-W/2, y); ctx.lineTo(x+W/2, y+H/2); ctx.stroke();
  }
}

function redraw(id) {
  const canvas = document.getElementById('canvas-' + id);
  if (!canvas) return;
  const dpr = window.devicePixelRatio || 1;
  const ctx = canvas.getContext('2d');
  ctx.save(); ctx.setTransform(1,0,0,1,0,0); ctx.clearRect(0,0,canvas.width,canvas.height); ctx.restore();
  const s = canvasState[id];
  if (!s) return;
  for (const p of s.paths) {
    if (STAMP_TOOLS.includes(p.tool)) { drawSymbol(ctx, p); continue; }
    ctx.strokeStyle = p.color; ctx.lineWidth = p.stroke; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.fillStyle = p.color;
    if (p.tool === 'pen' && p.points?.length > 1) {
      ctx.beginPath(); ctx.moveTo(p.points[0].x, p.points[0].y);
      for (let i = 1; i < p.points.length; i++) ctx.lineTo(p.points[i].x, p.points[i].y);
      ctx.stroke();
    }
    if (p.tool === 'line') { ctx.beginPath(); ctx.moveTo(p.x1,p.y1); ctx.lineTo(p.x2,p.y2); ctx.stroke(); }
    if (p.tool === 'rect') { ctx.beginPath(); ctx.rect(p.x1,p.y1,p.x2-p.x1,p.y2-p.y1); ctx.stroke(); }
    if (p.tool === 'text') { ctx.font = `${Math.round(p.stroke*5+10)}px -apple-system,sans-serif`; ctx.fillText(p.text, p.x, p.y); }
  }
}

function setTool(id, tool) {
  canvasState[id].tool = tool;
  ['pen','line','rect','text',...STAMP_TOOLS].forEach(t => {
    const b = document.getElementById('btn-' + t + '-' + id);
    if (b) b.classList.toggle('active', t === tool);
  });
  const hint = document.getElementById('hint-' + id);
  if (hint) hint.style.display = STAMP_TOOLS.includes(tool) ? 'block' : 'none';
}
function setColor(id, color, el) {
  canvasState[id].color = color;
  el.closest('#colors-' + id).querySelectorAll('.color-dot').forEach(d => d.classList.remove('active'));
  el.classList.add('active');
}
function setStroke(id, stroke, el) {
  canvasState[id].stroke = stroke;
  el.closest('#strokes-' + id).querySelectorAll('.stroke-opt').forEach(d => d.classList.remove('active'));
  el.classList.add('active');
}
function undoCanvas(id) { const s = canvasState[id]; if (s?.paths.length) { s.redoStack.push(s.paths.pop()); redraw(id); } }
function clearCanvas(id) { if (canvasState[id]) { canvasState[id].paths = []; canvasState[id].redoStack = []; redraw(id); } }

// ─── Photos ───────────────────────────────────────────────────────
function handlePhotos(id, input) {
  const files = Array.from(input.files);
  if (!files.length) return;
  if (!photoState[id]) photoState[id] = [];
  let loaded = 0;
  files.forEach(file => {
    const reader = new FileReader();
    reader.onload = (e) => {
      photoState[id].push({ dataUrl: e.target.result, name: file.name });
      loaded++;
      if (loaded === files.length) renderPhotos(id);
    };
    reader.readAsDataURL(file);
  });
  input.value = '';
}

function renderPhotos(id) {
  const grid = document.getElementById('photo-grid-' + id);
  if (!grid) return;
  const photos = photoState[id] || [];
  grid.innerHTML = '';
  photos.forEach((photo, idx) => {
    const wrap = document.createElement('div');
    wrap.className = 'photo-thumb-wrap';
    wrap.innerHTML = `
      <img src="${photo.dataUrl}" class="photo-thumb" onclick="viewPhoto('${id}',${idx})">
      <button class="photo-del" onclick="deletePhoto(${id},${idx})" title="Remove">×</button>
    `;
    grid.appendChild(wrap);
  });
}

function deletePhoto(id, idx) {
  if (!photoState[id]) return;
  photoState[id].splice(idx, 1);
  renderPhotos(id);
}

function viewPhoto(id, idx) {
  const photo = (photoState[id] || [])[idx];
  if (!photo) return;
  const overlay = document.createElement('div');
  overlay.className = 'photo-overlay';
  overlay.innerHTML = `
    <div class="photo-overlay-inner" onclick="event.stopPropagation()">
      <img src="${photo.dataUrl}" style="max-width:100%;max-height:80vh;border-radius:8px;display:block">
      <button onclick="this.closest('.photo-overlay').remove()" style="margin-top:12px;width:100%;padding:12px;background:#1a2744;color:white;border:none;border-radius:8px;font-size:15px;cursor:pointer">Close</button>
    </div>
  `;
  overlay.addEventListener('click', () => overlay.remove());
  document.body.appendChild(overlay);
}

// ─── PDF Export ───────────────────────────────────────────────────
async function exportPDF() {
  const { jsPDF } = window.jspdf;
  const job = collectFormData();
  const doc = new jsPDF({ unit: 'pt', format: 'letter' });
  const PW = 612, PH = 792;
  const ML = 48, MR = 48, MT = 48;
  let y = MT;
  const navy = [26, 39, 68];
  const gray = [100, 100, 100];
  const lightGray = [220, 220, 220];

  function checkPage(needed) {
    if (y + needed > PH - 48) { doc.addPage(); y = MT; }
  }

  // Header bar
  doc.setFillColor(...navy);
  doc.rect(0, 0, PW, 56, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18); doc.setFont('helvetica','bold');
  doc.text('LUFT WINDOWS & DOORS', ML, 35);
  doc.setFontSize(10); doc.setFont('helvetica','normal');
  doc.text('Project Intake Form', ML, 48);
  y = 80;

  // Customer block
  doc.setTextColor(...navy);
  doc.setFontSize(9); doc.setFont('helvetica','bold');
  doc.text('CUSTOMER INFO', ML, y); y += 14;
  doc.setDrawColor(...lightGray); doc.line(ML, y, PW - MR, y); y += 10;

  const col2 = PW / 2;
  const rows = [
    [['Customer', job.customer || '—'], ['Address', job.address || '—']],
    [['Date', job.date ? new Date(job.date + 'T12:00').toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'}) : '—'], ['Sales Rep', job.rep || '—']]
  ];
  rows.forEach(pair => {
    pair.forEach(([lbl, val], i) => {
      const x = i === 0 ? ML : col2;
      doc.setFontSize(8); doc.setFont('helvetica','normal'); doc.setTextColor(...gray);
      doc.text(lbl, x, y);
      doc.setFontSize(11); doc.setFont('helvetica','bold'); doc.setTextColor(...navy);
      doc.text(val, x, y + 12);
    });
    y += 26;
  });
  y += 6;

  // Products & hardware
  doc.setTextColor(...navy);
  doc.setFontSize(9); doc.setFont('helvetica','bold');
  doc.text('PRODUCT & HARDWARE SELECTION', ML, y); y += 14;
  doc.setDrawColor(...lightGray); doc.line(ML, y, PW - MR, y); y += 10;

  const hw = [
    ['Products', (job.products||[]).join(', ') || '—'],
    ['Exterior color', job.frame?.ext || '—'],
    ['Interior color', job.frame?.int || '—'],
    ['Glaze', job.glaze || '—'],
    ['Hinge type', job.hinge || '—'],
    ['Handle type', job.handle || '—']
  ];
  const hcols = 3, hcolW = (PW - ML - MR) / hcols;
  hw.forEach(([lbl, val], i) => {
    const col = i % hcols;
    const x = ML + col * hcolW;
    if (col === 0 && i > 0) y += 26;
    doc.setFontSize(8); doc.setFont('helvetica','normal'); doc.setTextColor(...gray);
    doc.text(lbl, x, y);
    doc.setFontSize(10); doc.setFont('helvetica','bold'); doc.setTextColor(...navy);
    doc.text(String(val), x, y + 12);
  });
  y += 32;

  // Openings
  for (const op of (job.openings || [])) {
    checkPage(200);
    doc.setFillColor(240, 243, 250);
    doc.rect(ML, y, PW - ML - MR, 22, 'F');
    doc.setTextColor(...navy);
    doc.setFontSize(10); doc.setFont('helvetica','bold');
    const label = `Opening — ${op.room || 'Unknown room'} · ${op.type || 'Unknown type'} · Qty: ${op.qty || 1}`;
    doc.text(label, ML + 8, y + 14);
    y += 28;

    const dimCols = [
      { label: 'Inside dimensions', val: op.iw && op.ih ? `${op.iw}" W  x  ${op.ih}" H` : '—' },
      { label: 'Outside dimensions', val: op.ow && op.oh ? `${op.ow}" W  x  ${op.oh}" H` : '—' },
      { label: 'Notes', val: op.notes || '—' }
    ];
    dimCols.forEach(({ label, val }, i) => {
      const x = ML + i * ((PW - ML - MR) / 3);
      doc.setFontSize(8); doc.setFont('helvetica','normal'); doc.setTextColor(...gray);
      doc.text(label, x, y);
      doc.setFontSize(11); doc.setFont('helvetica','bold'); doc.setTextColor(...navy);
      doc.text(val, x, y + 13, { maxWidth: (PW - ML - MR) / 3 - 8 });
    });
    y += 30;

    if (op.drawingDataUrl) {
      const imgW = PW - ML - MR;
      const imgH = imgW * (280 / 600);
      checkPage(imgH + 20);
      try {
        doc.addImage(op.drawingDataUrl, 'PNG', ML, y, imgW, imgH);
        doc.setDrawColor(...lightGray);
        doc.rect(ML, y, imgW, imgH);
        y += imgH + 12;
      } catch {}
    }

    if (op.photos && op.photos.length) {
      checkPage(30);
      doc.setFontSize(8); doc.setFont('helvetica','bold'); doc.setTextColor(...navy);
      doc.text(`Photos (${op.photos.length})`, ML, y); y += 10;
      const photoCols = 2;
      const photoW = (PW - ML - MR - 8) / photoCols;
      const photoH = photoW * 0.7;
      for (let pi = 0; pi < op.photos.length; pi++) {
        const col = pi % photoCols;
        if (col === 0) checkPage(photoH + 12);
        const px = ML + col * (photoW + 8);
        try {
          doc.addImage(op.photos[pi].dataUrl, 'JPEG', px, y, photoW, photoH);
          doc.setDrawColor(...lightGray);
          doc.rect(px, y, photoW, photoH);
        } catch {}
        if (col === photoCols - 1 || pi === op.photos.length - 1) y += photoH + 8;
      }
      y += 4;
    }

    y += 10;
  }

  // Footer
  doc.setFontSize(8); doc.setFont('helvetica','normal'); doc.setTextColor(...gray);
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.text(`Luft Windows & Doors · luftwindows.com · Page ${i} of ${pageCount}`, PW/2, PH - 24, { align: 'center' });
  }

  const filename = `luft-${(job.customer||'intake').replace(/\s+/g,'-').toLowerCase()}-${job.date||'draft'}.pdf`;
  doc.save(filename);
  toast('PDF saved');
}

// ─── Toast ────────────────────────────────────────────────────────
function toast(msg) {
  let el = document.getElementById('toast');
  if (!el) { el = document.createElement('div'); el.id = 'toast'; el.className = 'toast'; document.body.appendChild(el); }
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show'), 2200);
}

// ─── Init ─────────────────────────────────────────────────────────
loadJobs();
renderJobList();
