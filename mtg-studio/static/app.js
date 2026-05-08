/* ================================================================
   DUBBING MIXER PRO — Pipeline Frontend
   ================================================================ */

// ── State ─────────────────────────────────────────────────────────
const S = {
  jobId: null,
  step: 1,
  takes: [],
  byChar: {},
  characters: [],
  actors: [],
  combos: [],
  groups: {},
  pollInterval: null,
  lastLogMsg: null,
  // Timeline
  editedTakes: {},        // {filename: {position_ms, duration_ms, deleted, start_trim_ms}}
  pxPerMs: 0.04,          // default: 1px = 25ms
  timelineTracks: [],     // [{char, actor, takes[], type?}]
  tlTotalMs: 0,
  trackHeights: {},       // {'CHAR||ACTOR': px}
  waveformCache: {},      // {filename: [peaks]}
  virtualTakes: {},       // {virtualId: {source, startTrimMs, durationMs, positionMs, char, actor}}
  retakeTracks: {},       // {'CHAR||ACTOR': Set of filenames pushed to retake row
  toolMode: 'pointer',    // 'pointer' | 'cut'
  jobVocalsPath: null,    // vocals_path from job state
  snapEnabled: false,
  mutedTracks: new Set(),
  soloedTracks: new Set(),
  selectedBlocks: new Set(),
  undoStack: [],
  redoStack: [],
  // Streaming results
  lastRenderedComboCount: 0,
};

// ── DOM ───────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);
const stepPanels = [null, $('step-1'), $('step-2'), $('step-3'), $('step-4'), $('step-5')];
const navBtns = [null, $('nav-1'), $('nav-2'), $('nav-3'), $('nav-4'), $('nav-5')];

// ── Step navigation ───────────────────────────────────────────────
function goStep(n) {
  stepPanels.forEach((p, i) => p && p.classList.toggle('active', i === n));
  navBtns.forEach((b, i) => {
    if (!b) return;
    b.classList.toggle('active', i === n);
    if (i < n) b.classList.add('done');
  });
  S.step = n;
}

navBtns.forEach((btn, i) => {
  if (!btn || i === 0) return;
  btn.addEventListener('click', () => {
    if (!btn.disabled) goStep(i);
  });
});

// ── Helpers ───────────────────────────────────────────────────────
function esc(s) {
  return String(s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function fmtDur(ms) {
  if (!ms) return '—';
  const s = Math.round(ms / 1000);
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2,'0')}`;
}
function fmtMs(ms) {
  if (ms == null) return '—';
  const h = Math.floor(ms/3600000), r1 = ms%3600000;
  const m = Math.floor(r1/60000), r2 = r1%60000;
  const s = Math.floor(r2/1000), mil = r2%1000;
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}:${String(mil).padStart(3,'0')}`;
}
function now() { return new Date().toLocaleTimeString('pt-BR'); }

// ── Health check ─────────────────────────────────────────────────
async function checkHealth() {
  try {
    const r = await fetch('/api/health');
    const dot = $('health-badge').querySelector('.daw-dot');
    const label = $('health-badge').querySelector('span:last-child');
    if (r.ok) { dot.classList.add('online'); label.textContent = 'Online'; }
    else { dot.classList.remove('online'); label.textContent = 'Offline'; }
  } catch { }
}

// ── Log ───────────────────────────────────────────────────────────
function logAdd(msg, type = 'info') {
  if (msg === S.lastLogMsg) return;
  S.lastLogMsg = msg;
  // T2: reset dedup key after 5 s so the same message can reappear if it recurs.
  setTimeout(() => { if (S.lastLogMsg === msg) S.lastLogMsg = null; }, 5000);
  const body = $('log-body');
  const el = document.createElement('div');
  el.className = `log-entry ${type}`;
  el.textContent = `[${now()}] ${msg}`;
  body.appendChild(el);
  body.scrollTop = body.scrollHeight;
}

$('clear-log-btn').addEventListener('click', () => {
  $('log-body').innerHTML = '';
  S.lastLogMsg = null;
});

// ── Error box ─────────────────────────────────────────────────────
function showError(msg) {
  $('error-msg').textContent = msg;
  $('error-box').classList.remove('hidden');
}
function hideError() { $('error-box').classList.add('hidden'); }

// ══════════════════════════════════════════════════════════════════
//  STEP 1 — VIDEO UPLOAD
// ══════════════════════════════════════════════════════════════════
const videoDropZone = $('video-drop-zone');
const videoFileInput = $('video-file-input');

videoDropZone.addEventListener('click', (e) => {
  if (e.target.closest('label') || e.target === videoFileInput) return;
  videoFileInput.click();
});
videoFileInput.addEventListener('change', () => {
  if (videoFileInput.files[0]) handleVideoUpload(videoFileInput.files[0]);
});

videoDropZone.addEventListener('dragover', e => {
  e.preventDefault(); videoDropZone.classList.add('drag-over');
});
videoDropZone.addEventListener('dragleave', () => videoDropZone.classList.remove('drag-over'));
videoDropZone.addEventListener('drop', e => {
  e.preventDefault(); videoDropZone.classList.remove('drag-over');
  if (e.dataTransfer.files[0]) handleVideoUpload(e.dataTransfer.files[0]);
});

async function handleVideoUpload(file) {
  videoDropZone.style.display = 'none';
  const panel = $('video-info-panel');
  panel.classList.remove('hidden');

  $('video-meta-name').textContent = file.name;

  const objUrl = URL.createObjectURL(file);
  const thumb = $('video-thumb');
  thumb.src = objUrl;
  thumb.load();

  $('demucs-label').textContent = 'Enviando vídeo...';
  setDemucsStep('extract', 'active');

  const fd = new FormData();
  fd.append('file', file);

  let jobId;
  try {
    const res = await fetch('/api/upload/video', { method: 'POST', body: fd });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Erro no upload');
    jobId = data.job_id;
    S.jobId = jobId;
    _vrefSetJob(jobId);

    const vi = data.video_info || {};
    $('video-meta-dur').textContent = `⏱ ${fmtDur(vi.duration_ms)}`;
    $('video-meta-res').textContent = vi.resolution ? `📐 ${vi.resolution}` : '';
    $('video-meta-fps').textContent = vi.fps ? `🎞 ${vi.fps} fps` : '';

    $('job-indicator').style.display = 'flex';
    $('job-indicator-text').textContent = 'Demucs em execução...';
    navBtns[2].disabled = false;

    pollDemucs(jobId);
  } catch (err) {
    videoDropZone.style.display = '';
    panel.classList.add('hidden');
    showError(`Erro no upload do vídeo: ${err.message}`);
  }
}

function setDemucsStep(step, status) {
  const map = { extract: 'dp-extract', demucs: 'dp-demucs', stems: 'dp-stems' };
  const el = $(map[step]);
  if (!el) return;
  el.className = `demucs-step ${status}`;
  el.querySelector('.dp-status').className = `dp-status ${status}`;
  el.querySelector('.dp-status').textContent = status === 'done' ? 'ok' : status === 'active' ? '...' : '—';
}

function pollDemucs(jobId) {
  S.pollInterval && clearTimeout(S.pollInterval);
  let errCount = 0;
  const tick = async () => {
    try {
      const res = await fetch(`/api/job/${encodeURIComponent(jobId)}/status`);
      if (!res.ok) { errCount = Math.min(errCount + 1, 5); S.pollInterval = setTimeout(tick, Math.min(8000, 1500 * (1 + errCount))); return; }
      errCount = 0;
      const job = await res.json();
      const pct = job.percentual ?? 0;
      const msg = job.mensagem || '';

      $('demucs-bar').style.width = `${pct}%`;
      $('demucs-label').textContent = msg;

      if (pct < 30) { setDemucsStep('extract','active'); }
      else if (pct < 80) { setDemucsStep('extract','done'); setDemucsStep('demucs','active'); }
      else { setDemucsStep('extract','done'); setDemucsStep('demucs','done'); setDemucsStep('stems','active'); }

      if (job.status === 'aguardando_takes') {
        clearTimeout(S.pollInterval);
        setDemucsStep('extract','done'); setDemucsStep('demucs','done'); setDemucsStep('stems','done');
        $('demucs-label').textContent = '✓ Separação concluída';
        $('job-indicator-text').textContent = 'Aguardando takes';
        if (job.vocals_path) S.jobVocalsPath = job.vocals_path;

        if (job.me_path) {
          const mePreview = $('me-preview');
          mePreview.classList.remove('hidden');
          // N6: me_path lives inside jobs/, serve it via the job-aware stems endpoint.
          $('me-audio-player').src = `/api/job/${encodeURIComponent(S.jobId)}/stems/me`;
        }
        return;
      } else if (job.status === 'erro') {
        $('demucs-label').textContent = `❌ Erro: ${job.error}`;
        $('job-indicator').style.display = 'none';
        return;
      }
    } catch (err) { errCount = Math.min(errCount + 1, 5); logAdd(`Erro de rede (Demucs poll): ${err.message}`, 'warn'); }
    S.pollInterval = setTimeout(tick, Math.min(8000, 1500 * (1 + errCount)));
  };
  tick();
}

$('proceed-to-takes-btn').addEventListener('click', () => {
  goStep(2);
  navBtns[2].disabled = false;
});

// ══════════════════════════════════════════════════════════════════
//  STEP 2 — TAKES UPLOAD
// ══════════════════════════════════════════════════════════════════
const takesDropZone = $('takes-drop-zone');
const takesFileInput = $('takes-file-input');
const takesFolderInput = $('takes-folder-input');

$('takes-files-btn').addEventListener('click', () => takesFileInput.click());
$('takes-folder-btn').addEventListener('click', () => takesFolderInput.click());

takesFileInput.addEventListener('change', () => {
  if (takesFileInput.files.length) uploadTakesFiles(takesFileInput.files);
});
takesFolderInput.addEventListener('change', () => {
  if (takesFolderInput.files.length) uploadTakesFiles(takesFolderInput.files);
});

takesDropZone.addEventListener('dragover', e => {
  e.preventDefault(); takesDropZone.classList.add('drag-over');
});
takesDropZone.addEventListener('dragleave', () => takesDropZone.classList.remove('drag-over'));
takesDropZone.addEventListener('drop', e => {
  e.preventDefault(); takesDropZone.classList.remove('drag-over');
  const wavFiles = Array.from(e.dataTransfer.files).filter(f => f.name.toLowerCase().endsWith('.wav'));
  if (wavFiles.length) uploadTakesFiles(wavFiles);
  else if (e.dataTransfer.files.length > 0) showError('Apenas arquivos .wav são aceitos para takes.');
});

async function uploadTakesFiles(fileList) {
  if (!S.jobId) {
    showError('Faça o upload do vídeo primeiro (Etapa 1).');
    return;
  }

  const files = Array.from(fileList);
  const wavs = files.filter(f => f.name.toLowerCase().endsWith('.wav'));
  if (!wavs.length) { showError('Selecione arquivos .wav'); return; }

  const dropText = takesDropZone.querySelector('.takes-drop-text');
  if (dropText) dropText.textContent = `Enviando ${wavs.length} arquivo(s)...`;

  const fd = new FormData();
  wavs.forEach(f => fd.append('files', f));

  try {
    const res = await fetch(`/api/upload/takes/${encodeURIComponent(S.jobId)}`, { method: 'POST', body: fd });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Erro no upload de takes');
    renderTakesResult(data);
  } catch (err) {
    showError(`Erro ao enviar takes: ${err.message}`);
  } finally {
    const dropText2 = takesDropZone.querySelector('.takes-drop-text');
    if (dropText2) dropText2.textContent = 'Arraste WAVs aqui';
  }
}

function renderTakesResult(data) {
  S.byChar = data.by_character || {};
  S.characters = data.characters || [];
  // N4: merge incoming takes with any already in S.takes so re-uploads don't discard
  // takes that came from a previous upload batch (backend deduplicates by filename).
  const incomingByName = {};
  S.characters.flatMap(c => S.byChar[c] || []).forEach(t => { incomingByName[t.filename] = t; });
  S.takes.forEach(t => { if (!incomingByName[t.filename]) incomingByName[t.filename] = t; });
  S.takes = Object.values(incomingByName).sort((a, b) => a.position_ms - b.position_ms);
  S.actors = [...new Set(S.takes.map(t => t.actor).filter(Boolean))];
  S.editedTakes = {};

  $('stat-takes').textContent = data.takes_total ?? S.takes.length;
  $('stat-chars').textContent = S.characters.length;
  $('stat-actors').textContent = S.actors.length;

  const invalid = data.invalid || [];
  _renderInvalidTakes(invalid);

  // Hydrate vocals path if not already set (e.g., after page reload)
  if (!S.jobVocalsPath && S.jobId) {
    fetch(`/api/job/${encodeURIComponent(S.jobId)}/status`)
      .then(r => r.ok ? r.json() : null)
      .then(st => { if (st?.vocals_path) { S.jobVocalsPath = st.vocals_path; _tlRender(); } })
      .catch(() => {});
  }

  renderTimeline();
  fetchAndRenderCombos();

  const footer = $('step2-footer');
  if (S.takes.length > 0) {
    footer.style.display = 'flex';
    navBtns[3].disabled = false;
  }
}

function _renderInvalidTakes(invalid) {
  const stat  = $('takes-invalid-stat');
  const alert = $('takes-invalid-alert');
  const ul    = $('invalid-list');
  ul.innerHTML = '';
  if (!invalid || invalid.length === 0) {
    stat?.classList.add('hidden');
    alert?.classList.add('hidden');
    return;
  }
  stat?.classList.remove('hidden');
  $('stat-invalid').textContent = invalid.length;
  alert?.classList.remove('hidden');

  invalid.forEach(iv => {
    const li = document.createElement('li');
    li.className = 'invalid-item';
    li.dataset.filename = iv.filename;

    const parts = (iv.filename || '').replace(/\.wav$/i,'').split('_');
    const guessChar = parts[0] || '';
    const guessActor = parts[1] || '';
    const guessTC = parts[2] || '';

    li.innerHTML = `
      <span class="invalid-filename">${esc(iv.filename)}</span>
      <span class="invalid-reason">— ${esc(iv.reason)}</span>
      <button class="invalid-rename-btn" title="Renomear take">✏ Renomear</button>
      <form class="invalid-rename-form hidden">
        <input class="invalid-input" name="char"  placeholder="Personagem" value="${esc(guessChar)}" required>
        <input class="invalid-input" name="actor" placeholder="Dublador"   value="${esc(guessActor)}" required>
        <input class="invalid-input" name="tc"    placeholder="Timecode (ex: 000010500)" value="${esc(guessTC)}" required pattern="\\d{7,9}">
        <button type="submit" class="invalid-save-btn">✓ Salvar</button>
        <button type="button" class="invalid-cancel-btn">✕</button>
      </form>
    `;

    const btn  = li.querySelector('.invalid-rename-btn');
    const form = li.querySelector('.invalid-rename-form');
    const cancelBtn = li.querySelector('.invalid-cancel-btn');

    btn.addEventListener('click', () => { form.classList.toggle('hidden'); });
    cancelBtn.addEventListener('click', () => { form.classList.add('hidden'); });

    form.addEventListener('submit', async e => {
      e.preventDefault();
      const char  = form.querySelector('[name=char]').value.trim();
      const actor = form.querySelector('[name=actor]').value.trim();
      const tc    = form.querySelector('[name=tc]').value.trim();
      btn.disabled = true; btn.textContent = '…';
      try {
        const r = await fetch(`/api/job/${encodeURIComponent(S.jobId)}/rename-take`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ old_filename: iv.filename, character: char, actor, timecode: tc }),
        });
        if (!r.ok) { const d = await r.json(); throw new Error(d.detail || r.statusText); }
        const res = await r.json();
        S.takes = res.by_character ? Object.values(res.by_character).flat() : S.takes;
        S.byChar = res.by_character || S.byChar;
        S.characters = res.characters || S.characters;
        $('stat-takes').textContent = res.takes_total;
        delete S.waveformCache[iv.filename];
        _renderInvalidTakes(Array.isArray(res.invalid_remaining) ? res.invalid_remaining : []);
        renderTimeline();
        fetchAndRenderCombos();
      } catch (err) {
        logAdd(`Erro ao renomear: ${err.message}`, 'error');
        btn.disabled = false; btn.textContent = '✏ Renomear';
      }
    });

    ul.appendChild(li);
  });
}

async function fetchAndRenderCombos() {
  if (!S.jobId) return;
  try {
    const res = await fetch(`/api/job/${encodeURIComponent(S.jobId)}/combos`);
    if (!res.ok) return;
    const data = await res.json();
    S.combos = data.combos || [];
    S.groups = data.groups || {};
    renderCombosList(data.combos || []);
  } catch { }
}

function renderCombosList(combos) {
  const list = $('combos-list');
  const toggleLabel = $('daw-tl-combos-label');
  list.innerHTML = '';
  if (!combos.length) return;
  const n = combos.length;
  if (toggleLabel) toggleLabel.textContent = `Ver ${n} combinação(oes) que serão geradas ↓`;
  combos.forEach((c, i) => {
    const el = document.createElement('div');
    el.className = 'combo-item';
    el.innerHTML = `
      <span class="combo-item-label">Combo ${i+1}: ${esc(c.label)}</span>
      <span class="combo-item-output">${esc(c.output)}</span>
    `;
    list.appendChild(el);
  });
}

// ══════════════════════════════════════════════════════════════════
//  DAW TIMELINE
// ══════════════════════════════════════════════════════════════════

// Palette: distinct hues per character
const _TL_HUES = [180, 30, 270, 120, 0, 210, 60, 300, 150, 240];
const _charHue = {};
let _hueIdx = 0;
function _getCharHue(char) {
  if (!char) return _TL_HUES[0];
  if (!_charHue[char]) { _charHue[char] = _TL_HUES[_hueIdx++ % _TL_HUES.length]; }
  return _charHue[char];
}
const _TL_GRAYS = [
  'rgba(60,60,60,0.82)',
  'rgba(110,110,110,0.72)',
  'rgba(155,155,155,0.65)',
  'rgba(190,190,190,0.6)',
];
function _trackColor(char, actorIdx, actorCount) {
  // T1: mix char hue with per-actor lightness so chars get distinct colours.
  const hue = _getCharHue(char);
  const lightness = 28 + actorIdx * 10;
  const saturation = actorCount > 1 ? 55 : 45;
  return `hsla(${hue},${saturation}%,${lightness}%,0.85)`;
}

function _effectiveTake(take) {
  // Virtual takes (cuts/duplicates) live in S.virtualTakes — read fresh data
  // there so any drag/trim/cut is reflected immediately, even if the cached
  // `take` snapshot in S.timelineTracks/_tpPlaylist is stale.
  if (take && take.is_virtual) {
    const vt = S.virtualTakes[take.filename];
    if (vt) return {
      ...take,
      position_ms:   vt.positionMs,
      duration_ms:   vt.durationMs,
      start_trim_ms: vt.startTrimMs || 0,
      source_file:   vt.source || take.source_file,
      deleted:       false,
    };
  }
  const ed = S.editedTakes[take.filename] || {};
  return {
    ...take,
    position_ms:   ed.position_ms   ?? take.position_ms,
    duration_ms:   ed.duration_ms   ?? take.duration_ms ?? 2000,
    start_trim_ms: ed.start_trim_ms ?? take.start_trim_ms ?? 0,
    deleted:       ed.deleted       ?? false,
  };
}

function _tlFmtMs(ms) {
  const s = Math.floor(ms / 1000), m = Math.floor(s / 60);
  return `${String(m).padStart(2,'0')}:${String(s % 60).padStart(2,'0')}`;
}
function _allTakesWithVirtual() {
  const virts = Object.entries(S.virtualTakes).map(([id, vt]) => ({
    filename: id, character: vt.char, actor: vt.actor,
    position_ms: vt.positionMs, duration_ms: vt.durationMs,
    source_file: vt.source, start_trim_ms: vt.startTrimMs,
    is_virtual: true, timecode_formatted: _tlFmtMs(vt.positionMs),
  }));
  return [...S.takes, ...virts];
}

function renderTimeline() {
  const allTakes = _allTakesWithVirtual();
  const trackMap = {};
  allTakes.forEach(take => {
    const key = `${take.character}||${take.actor}`;
    if (!trackMap[key]) trackMap[key] = { char: take.character, actor: take.actor, takes: [] };
    trackMap[key].takes.push(take);
  });
  S.timelineTracks = Object.values(trackMap).sort((a,b) =>
    a.char < b.char ? -1 : a.char > b.char ? 1 : a.actor < b.actor ? -1 : 1);
  let maxMs = 0;
  allTakes.forEach(t => { maxMs = Math.max(maxMs, (t.position_ms||0)+(t.duration_ms||2000)); });
  S.tlTotalMs = maxMs + 5000;
  _tlComputeRetakes();
  _tlRender();
  $('daw-tl-wrapper').classList.remove('hidden');
}

function _tlRender() {
  const sidebar = $('daw-tl-sidebar'), ruler = $('daw-tl-ruler'), tracks = $('daw-tl-tracks');
  sidebar.innerHTML = ruler.innerHTML = tracks.innerHTML = '';
  const totalPx = Math.max(Math.round(S.tlTotalMs * S.pxPerMs), 800);
  ruler.style.width = tracks.style.width = totalPx + 'px';
  _tlRenderRuler(ruler, totalPx);

  if (S.jobId && S.jobVocalsPath) _tlRenderRefTrack(sidebar, tracks, totalPx);

  const charActors = {};
  S.timelineTracks.forEach(tr => {
    charActors[tr.char] = charActors[tr.char] || [];
    if (!charActors[tr.char].includes(tr.actor)) charActors[tr.char].push(tr.actor);
  });

  S.timelineTracks.forEach(track => {
    const key = `${track.char}||${track.actor}`;
    const color = _trackColor(track.char, charActors[track.char].indexOf(track.actor), charActors[track.char].length);
    const h = S.trackHeights[key] || 56;
    const retakeSet = S.retakeTracks[key] || new Set();

    const label = document.createElement('div');
    label.className = 'daw-tl-track-label';
    label.style.height = h + 'px';
    label.innerHTML = `<span class="daw-tl-label-char">${esc(track.char)}</span><span class="daw-tl-label-actor">${esc(track.actor)}</span>`;
    // Button row: ▶  M  S
    const btnRow = document.createElement('div');
    btnRow.className = 'tp-track-btn-row';
    const playBtn = document.createElement('button');
    playBtn.className = 'tp-track-play-btn'; playBtn.title = 'Tocar track'; playBtn.textContent = '▶';
    playBtn.addEventListener('click', e => {
      e.stopPropagation();
      const takesInTrack = track.takes.filter(t => !(_effectiveTake(t).deleted) && _isTrackAudible(key));
      if (takesInTrack.length) _tpSelectTake(takesInTrack[0], takesInTrack, null);
    });
    const mBtn = document.createElement('button');
    mBtn.className = 'tp-track-mute-btn' + (S.mutedTracks.has(key) ? ' active' : '');
    mBtn.textContent = 'M'; mBtn.title = 'Mute';
    mBtn.addEventListener('click', e => { e.stopPropagation(); _tlToggleMute(key); });
    const sBtn = document.createElement('button');
    sBtn.className = 'tp-track-solo-btn' + (S.soloedTracks.has(key) ? ' active' : '');
    sBtn.textContent = 'S'; sBtn.title = 'Solo';
    sBtn.addEventListener('click', e => { e.stopPropagation(); _tlToggleSolo(key); });
    btnRow.appendChild(playBtn); btnRow.appendChild(mBtn); btnRow.appendChild(sBtn);
    label.appendChild(btnRow);
    sidebar.appendChild(label);
    _tlBindLabelResize(label, key);

    const row = document.createElement('div');
    const isMuted = !_isTrackAudible(key);
    row.className = 'daw-tl-track' + (S.mutedTracks.has(key) ? ' tl-track-muted' : '') + (isMuted && !S.mutedTracks.has(key) ? ' tl-track-solo-dim' : '');
    if (isMuted && !S.mutedTracks.has(key)) label.classList.add('tl-track-solo-dim');
    if (S.mutedTracks.has(key)) label.classList.add('tl-track-muted');
    row.dataset.trackKey = key;
    row.style.width = totalPx + 'px'; row.style.height = h + 'px';
    tracks.appendChild(row);
    track.takes.forEach(take => { if (!retakeSet.has(take.filename)) _tlRenderBlock(row, take, color, h); });

    if (retakeSet.size > 0) {
      const rH = Math.max(36, h - 12);
      const rLabel = document.createElement('div');
      rLabel.className = 'daw-tl-track-label daw-tl-retake-label';
      rLabel.style.height = rH + 'px';
      rLabel.innerHTML = `<span class="daw-tl-label-char">${esc(track.char)}</span><span class="daw-tl-label-actor daw-tl-retake-tag">RETAKE</span>`;
      const mBtn = document.createElement('button');
      mBtn.className = 'daw-tl-merge-btn'; mBtn.title = 'Mesclar de volta'; mBtn.textContent = '⬆';
      mBtn.addEventListener('click', () => { delete S.retakeTracks[key]; _tlRender(); });
      rLabel.appendChild(mBtn); sidebar.appendChild(rLabel);

      const rRow = document.createElement('div');
      rRow.className = 'daw-tl-track daw-tl-retake-row'; rRow.dataset.trackKey = key + '||retake';
      rRow.style.width = totalPx + 'px'; rRow.style.height = rH + 'px';
      tracks.appendChild(rRow);
      track.takes.forEach(take => { if (retakeSet.has(take.filename)) _tlRenderBlock(rRow, take, color, rH); });
    }
  });
  _tlUpdateOverlaps();
}

function _tlRenderRefTrack(sidebar, tracks, totalPx) {
  const h = 64;
  const label = document.createElement('div');
  label.className = 'daw-tl-track-label daw-tl-ref-label'; label.style.height = h + 'px';
  label.innerHTML = `<span class="daw-tl-ref-icon">🔒</span><span class="daw-tl-label-char">VOZ ORIGINAL</span><span class="daw-tl-label-actor">REFERÊNCIA</span><span class="daw-tl-ref-badge">não inclusa no output</span>`;
  sidebar.appendChild(label);
  const row = document.createElement('div');
  row.className = 'daw-tl-track daw-tl-ref-track'; row.style.width = totalPx + 'px'; row.style.height = h + 'px';
  tracks.appendChild(row);
  const bW = Math.max(totalPx, 80), bH = h - 10;
  const block = document.createElement('div');
  block.className = 'daw-tl-block daw-tl-ref-block';
  block.style.cssText = `left:0;width:${bW}px;height:${bH}px;top:5px;background:hsl(280,35%,25%);`;
  block.innerHTML = `<canvas class="daw-tl-waveform-canvas"></canvas><span class="daw-tl-block-label">VOZ ORIGINAL — Referência</span>`;
  row.appendChild(block);
  _tlFetchWaveform(block, '__vocals__', 'hsl(280,65%,70%)', bW, bH);
}

function _tlRenderRuler(ruler, totalPx) {
  const intervalMs = _tlRulerInterval();
  for (let ms = 0; ms <= S.tlTotalMs; ms += intervalMs) {
    const x = Math.round(ms * S.pxPerMs);
    const mark = document.createElement('div');
    mark.className = 'daw-tl-ruler-mark'; mark.style.left = x + 'px';
    const major = (ms % (intervalMs * 5) === 0);
    const tick = document.createElement('div');
    tick.className = 'daw-tl-ruler-tick' + (major ? ' major' : '');
    mark.appendChild(tick);
    if (major) {
      const lbl = document.createElement('div');
      lbl.className = 'daw-tl-ruler-label'; lbl.textContent = _tlFmtMs(ms);
      mark.appendChild(lbl);
    }
    ruler.appendChild(mark);
  }
}

function _tlRulerInterval() {
  if (S.pxPerMs >= 0.5) return 500;
  if (S.pxPerMs >= 0.1) return 1000;
  if (S.pxPerMs >= 0.04) return 5000;
  if (S.pxPerMs >= 0.01) return 10000;
  return 30000;
}

// Fine-grained snap grid for drag/trim. Independent of the visual ruler so
// blocks can be moved with near-pixel precision when snap is on.
function _tlSnapInterval() {
  if (S.pxPerMs >= 1.0)  return 10;
  if (S.pxPerMs >= 0.5)  return 50;
  if (S.pxPerMs >= 0.2)  return 100;
  if (S.pxPerMs >= 0.05) return 250;
  return 500;
}

function _tlRenderBlock(row, take, color, trackH) {
  const et = _effectiveTake(take);
  if (et.deleted) return;
  const leftPx  = Math.round(et.position_ms * S.pxPerMs);
  const widthPx = Math.max(18, Math.round(et.duration_ms * S.pxPerMs));
  const blockH  = Math.max(22, (trackH || 56) - 10);

  const block = document.createElement('div');
  block.className = 'daw-tl-block';
  block.style.left = leftPx + 'px'; block.style.width = widthPx + 'px';
  block.style.height = blockH + 'px'; block.style.top = '5px';
  block.style.background = color; block.dataset.filename = take.filename;
  if (take.is_virtual) block.dataset.isVirtual = '1';

  const tc = take.timecode_formatted || _tlFmtMs(et.position_ms);
  const durStr = et.duration_ms ? `${(et.duration_ms/1000).toFixed(1)}s` : '?';
  block.innerHTML = `
    <canvas class="daw-tl-waveform-canvas"></canvas>
    <div class="daw-tl-block-tooltip">${esc(take.filename)}<br>${esc(tc)} &middot; ${durStr}</div>
    <span class="daw-tl-block-label">${esc(take.filename.replace(/\.wav$/i,''))}</span>
    <div class="daw-tl-trim-handle left"></div>
    <div class="daw-tl-trim-handle"></div>
    <button class="daw-tl-delete-btn" title="Excluir">&#10005;</button>
  `;

  block.querySelector('.daw-tl-delete-btn').addEventListener('click', e => {
    e.stopPropagation();
    _tlPushUndo();
    if (take.is_virtual) { delete S.virtualTakes[take.filename]; renderTimeline(); }
    else {
      S.editedTakes[take.filename] = { ...(S.editedTakes[take.filename] || {}), deleted: true };
      block.remove(); _tlCheckRetakeFromData(); _tlUpdateOverlaps();
    }
  });

  block.addEventListener('click', e => {
    if (e.target.classList.contains('daw-tl-delete-btn')) return;
    if (S.toolMode === 'cut') { e.stopPropagation(); _tlPushUndo(); _tlCutBlock(block, take, e); return; }
    // pointer mode: multi-select or load in transport
    if (e.shiftKey) {
      if (S.selectedBlocks.has(take.filename)) { S.selectedBlocks.delete(take.filename); block.classList.remove('tl-ms-selected'); }
      else { S.selectedBlocks.add(take.filename); block.classList.add('tl-ms-selected'); }
      return;
    }
    // plain click: clear multi-selection, select this block, load transport
    S.selectedBlocks.clear();
    document.querySelectorAll('.tl-ms-selected').forEach(b => b.classList.remove('tl-ms-selected'));
    S.selectedBlocks.add(take.filename);
    block.classList.add('tl-ms-selected');
    const trackKey = row.dataset.trackKey;
    const trackTakes = _getTrackTakes(trackKey);
    _tpSelectTake(take, trackTakes, block);
  });

  _tlBindDrag(block, take);
  _tlBindTrimHandles(block, take, trackH || 56);
  row.appendChild(block);

  _tlFetchWaveform(block, take.source_file || take.filename, color, widthPx, blockH, et.start_trim_ms, et.duration_ms);
}

// Returns the FULL duration (ms) of the original/source take, regardless of edits.
// Used to compute waveform slice bounds for cut/trimmed pieces.
function _tlSourceDurationMs(sourceFilename) {
  // R8: virtual takes reference source_file, not filename — search both fields.
  const t = S.takes.find(x => x.filename === sourceFilename || x.source_file === sourceFilename);
  return t ? (t.duration_ms || 0) : 0;
}

async function _tlFetchWaveform(block, filename, color, widthPx, blockH, sliceStartMs, sliceDurMs) {
  if (!S.jobId) return;
  let peaks = S.waveformCache[filename];
  const canvas = block.querySelector('.daw-tl-waveform-canvas');
  if (!peaks) {
    if (canvas) canvas.classList.add('daw-wf-loading');  // U1: skeleton shimmer
    try {
      const bins = Math.min(800, Math.max(80, widthPx | 0));
      const r = await fetch(`/api/job/${encodeURIComponent(S.jobId)}/waveform/${encodeURIComponent(filename)}?bins=${bins}`);
      if (!r.ok) { if (canvas) canvas.classList.remove('daw-wf-loading'); return; }
      peaks = (await r.json()).peaks || [];
      S.waveformCache[filename] = peaks;
    } catch { if (canvas) canvas.classList.remove('daw-wf-loading'); return; }
  }
  if (!block.isConnected) return;
  if (!canvas) return;
  canvas.classList.remove('daw-wf-loading');
  const totalMs = _tlSourceDurationMs(filename);
  _tlDrawWaveform(
    canvas, peaks, color,
    parseInt(block.style.width) || widthPx,
    parseInt(block.style.height) || blockH,
    sliceStartMs || 0, sliceDurMs || 0, totalMs,
  );
}

function _tlDrawWaveform(canvas, peaks, color, w, h, sliceStartMs, sliceDurMs, totalMs) {
  canvas.width = w; canvas.height = h;
  canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, w, h);
  if (!peaks || !peaks.length) return;

  // Slice peaks to the audio range this block actually represents.
  // Each cut/trim piece shows ONLY its corresponding portion of the source waveform.
  let view = peaks;
  if (totalMs > 0 && sliceDurMs > 0 && (sliceStartMs > 0 || sliceDurMs < totalMs)) {
    const i0 = Math.max(0, Math.floor(peaks.length * (sliceStartMs / totalMs)));
    const i1 = Math.min(peaks.length, Math.ceil(peaks.length * ((sliceStartMs + sliceDurMs) / totalMs)));
    if (i1 > i0) view = peaks.slice(i0, i1);
  }

  const mid = h / 2, amp = mid * 0.82, step = w / view.length;
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  for (let i = 0; i < view.length; i++) {
    const x = Math.round(i * step);
    const barW = Math.max(1, Math.round((i + 1) * step) - x);
    const ph = Math.max(1, view[i] * amp);
    ctx.fillRect(x, mid - ph, barW, ph * 2);
  }
  ctx.fillStyle = 'rgba(0,0,0,0.15)';
  ctx.fillRect(0, mid - 0.5, w, 1);
}

// Re-renders the waveform inside an existing block based on its current
// edited slice (used live during trim and after cut/duplicate).
function _tlRedrawBlockWaveform(block, take) {
  const canvas = block.querySelector('.daw-tl-waveform-canvas');
  if (!canvas) return;
  const srcFn = take.source_file || take.filename;
  const peaks = S.waveformCache[srcFn];
  if (!peaks) return;
  const et = _effectiveTake(take);
  const sliceStart = (take.is_virtual ? (take.start_trim_ms || 0) : (et.start_trim_ms ?? take.start_trim_ms ?? 0));
  // For live trim we read width/dur off the live element so it stays in sync mid-drag.
  const liveWidth = parseInt(block.style.width) || 18;
  const liveDurMs = Math.max(1, Math.round(liveWidth / S.pxPerMs));
  const totalMs = _tlSourceDurationMs(srcFn);
  _tlDrawWaveform(
    canvas, peaks, block.style.background,
    liveWidth, parseInt(block.style.height) || 46,
    sliceStart, liveDurMs, totalMs,
  );
}

function _tlBindDrag(block, take) {
  block.addEventListener('mousedown', e => {
    if (S.toolMode === 'cut') return;
    if (e.target.classList.contains('daw-tl-trim-handle')) return;
    if (e.target.classList.contains('daw-tl-delete-btn')) return;

    // Alt+drag: duplicate take as virtual, placed 30px (≈750ms at default zoom) to the right.
    // We cannot drag the new block here because renderTimeline() tears down all DOM nodes
    // (including this block), so the mousedown drag would be tracking a detached element.
    if (e.altKey) {
      e.preventDefault();
      _tlPushUndo();
      const et = _effectiveTake(take);
      const offsetMs = Math.round(30 / S.pxPerMs);
      const virtualId = `${take.filename}__dup__${Date.now()}`;
      S.virtualTakes[virtualId] = {
        id: virtualId, source: take.source_file || take.filename,
        startTrimMs: et.start_trim_ms || 0,
        durationMs: et.duration_ms,
        positionMs: et.position_ms + offsetMs,
        char: take.character, actor: take.actor,
      };
      renderTimeline();
      return;
    }

    e.preventDefault();

    let undoPushed = false;
    let moved = false;
    const startX = e.clientX;
    // For multi-drag: gather all selected blocks with their start lefts
    const isMulti = S.selectedBlocks.has(take.filename) && S.selectedBlocks.size > 1;
    const dragBlocks = [];
    if (isMulti) {
      document.querySelectorAll('.tl-ms-selected').forEach(b => {
        dragBlocks.push({ el: b, startLeft: parseInt(b.style.left) || 0 });
        b.classList.add('dragging');
      });
    } else {
      dragBlocks.push({ el: block, startLeft: parseInt(block.style.left) || 0 });
      block.classList.add('dragging');
    }

    const onMove = ev => {
      const dx = ev.clientX - startX;
      if (Math.abs(dx) < 2 && !moved) return;     // ignore micro-jitter
      if (!undoPushed) { _tlPushUndo(); undoPushed = true; }
      moved = true;
      const snapPx = S.snapEnabled ? S.pxPerMs * _tlSnapInterval() : 0;
      const snappedDx = snapPx > 0 ? Math.round(dx / snapPx) * snapPx : dx;
      dragBlocks.forEach(({ el, startLeft }) => {
        const newLeft = Math.max(0, startLeft + snappedDx);
        el.style.left = newLeft + 'px';
      });
    };

    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      if (!moved) {
        dragBlocks.forEach(({ el }) => el.classList.remove('dragging'));
        return;
      }
      dragBlocks.forEach(({ el }) => {
        el.classList.remove('dragging');
        const newMs = Math.round((parseInt(el.style.left) || 0) / S.pxPerMs);
        const fn = el.dataset.filename;
        if (!fn) return;
        if (el.dataset.isVirtual === '1') { if (S.virtualTakes[fn]) S.virtualTakes[fn].positionMs = newMs; }
        else { S.editedTakes[fn] = { ...(S.editedTakes[fn] || {}), position_ms: newMs }; }
        _tlUpdateTooltip(el, fn, newMs);
        _tpRefreshActiveSlice(fn);
      });
      _tlUpdateOverlaps(); // T3: refresh overlap highlights after drag
      _tlCheckRetakeFromData();
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });
}

function _tlBindTrimHandles(block, take, trackH) {
  const srcFn = take.source_file || take.filename;
  const blockH = parseInt(block.style.height) || (trackH - 10);

  // Live waveform redraw helper — slices peaks by current visual width/offset.
  const liveRedraw = (sliceStartMs, sliceDurMs) => {
    const canvas = block.querySelector('.daw-tl-waveform-canvas');
    const peaks  = S.waveformCache[srcFn];
    if (!canvas || !peaks) return;
    const totalMs = _tlSourceDurationMs(srcFn);
    _tlDrawWaveform(canvas, peaks, block.style.background,
      parseInt(block.style.width) || 18, blockH,
      sliceStartMs, sliceDurMs, totalMs);
  };

  const rightH = block.querySelector('.daw-tl-trim-handle:not(.left)');
  if (rightH) {
    let startX, startW, trimming = false;
    rightH.addEventListener('mousedown', e => {
      e.preventDefault(); e.stopPropagation(); trimming = true; startX = e.clientX; startW = parseInt(block.style.width) || 20;
      let undoPushed = false, moved = false, rafId = 0;
      const baseSliceStart = (_effectiveTake(take).start_trim_ms ?? 0);
      const onMove = ev => {
        if (!trimming) return;
        const dx = ev.clientX - startX;
        if (Math.abs(dx) < 2 && !moved) return;
        if (!undoPushed) { _tlPushUndo(); undoPushed = true; }
        moved = true;
        const snapPx = S.snapEnabled ? S.pxPerMs * _tlSnapInterval() : 0;
        const snappedDx = snapPx > 0 ? Math.round(dx / snapPx) * snapPx : dx;
        const newW = Math.max(18, startW + snappedDx);
        block.style.width = newW + 'px';
        if (!rafId) rafId = requestAnimationFrame(() => {
          rafId = 0;
          const liveDurMs = Math.max(1, Math.round(newW / S.pxPerMs));
          liveRedraw(baseSliceStart, liveDurMs);
        });
      };
      const onUp = () => {
        if (!trimming) return; trimming = false;
        if (rafId) cancelAnimationFrame(rafId);
        const newDurMs = Math.max(100, Math.round((parseInt(block.style.width)||18) / S.pxPerMs));
        if (take.is_virtual) { if (S.virtualTakes[take.filename]) S.virtualTakes[take.filename].durationMs = newDurMs; }
        else { S.editedTakes[take.filename] = { ...(S.editedTakes[take.filename] || {}), duration_ms: newDurMs }; }
        liveRedraw(baseSliceStart, newDurMs);
        _tpRefreshActiveSlice(take.filename);
        _tlCheckRetakeFromData();
        document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp);
      };
      document.addEventListener('mousemove', onMove); document.addEventListener('mouseup', onUp);
    });
  }
  const leftH = block.querySelector('.daw-tl-trim-handle.left');
  if (leftH) {
    let startX, startLeft, startW, trimming = false;
    leftH.addEventListener('mousedown', e => {
      e.preventDefault(); e.stopPropagation(); trimming = true; startX = e.clientX;
      startLeft = parseInt(block.style.left) || 0; startW = parseInt(block.style.width) || 20;
      let undoPushed = false, moved = false, rafId = 0;
      const et0 = _effectiveTake(take);
      const baseTrim = et0.start_trim_ms ?? 0;
      const basePos  = et0.position_ms  ?? 0;
      const onMove = ev => {
        if (!trimming) return;
        const dx = ev.clientX - startX;
        if (Math.abs(dx) < 2 && !moved) return;
        if (!undoPushed) { _tlPushUndo(); undoPushed = true; }
        moved = true;
        const snapPx = S.snapEnabled ? S.pxPerMs * _tlSnapInterval() : 0;
        const snappedDx = snapPx > 0 ? Math.round(dx / snapPx) * snapPx : dx;
        const newLeft = Math.max(0, startLeft + snappedDx);
        const newW = Math.max(18, startW - (newLeft - startLeft));
        block.style.left = newLeft + 'px';
        block.style.width = newW + 'px';
        if (!rafId) rafId = requestAnimationFrame(() => {
          rafId = 0;
          const newPosMs = Math.round(newLeft / S.pxPerMs);
          const extraTrim = newPosMs - basePos;
          const liveTrim  = Math.max(0, baseTrim + extraTrim);
          const liveDurMs = Math.max(1, Math.round(newW / S.pxPerMs));
          liveRedraw(liveTrim, liveDurMs);
        });
      };
      const onUp = () => {
        if (!trimming) return; trimming = false;
        if (rafId) cancelAnimationFrame(rafId);
        const newMs = Math.round((parseInt(block.style.left)||0) / S.pxPerMs);
        const newDurMs = Math.max(100, Math.round((parseInt(block.style.width)||18) / S.pxPerMs));
        const et = _effectiveTake(take);
        const extraTrim = newMs - (et.position_ms || 0);
        if (take.is_virtual) {
          if (S.virtualTakes[take.filename]) {
            S.virtualTakes[take.filename].positionMs  = newMs;
            S.virtualTakes[take.filename].durationMs  = newDurMs;
            S.virtualTakes[take.filename].startTrimMs = (S.virtualTakes[take.filename].startTrimMs||0) + Math.max(0, extraTrim);
          }
        } else {
          const prev = S.editedTakes[take.filename] || {};
          const prevTrim = prev.start_trim_ms ?? take.start_trim_ms ?? 0;
          S.editedTakes[take.filename] = {
            ...prev,
            position_ms: newMs,
            duration_ms: newDurMs,
            start_trim_ms: Math.max(0, prevTrim + extraTrim),
          };
        }
        _tpRefreshActiveSlice(take.filename);
        _tlCheckRetakeFromData();
        document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp);
      };
      document.addEventListener('mousemove', onMove); document.addEventListener('mouseup', onUp);
    });
  }
}

function _tlBindLabelResize(label, key) {
  const handle = document.createElement('div');
  handle.className = 'daw-tl-resize-handle';
  label.appendChild(handle);
  let startY, startH, resizing = false;
  handle.addEventListener('mousedown', e => {
    e.preventDefault(); e.stopPropagation(); resizing = true; startY = e.clientY; startH = parseInt(label.style.height) || 56;
    const onMove = ev => {
      if (!resizing) return;
      const newH = Math.max(32, startH + (ev.clientY - startY));
      label.style.height = newH + 'px';
      const row = $('daw-tl-tracks').querySelector(`[data-track-key="${CSS.escape(key)}"]`);
      if (row) row.style.height = newH + 'px';
      S.trackHeights[key] = newH;
    };
    const onUp = () => { if (!resizing) return; resizing = false; document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
    document.addEventListener('mousemove', onMove); document.addEventListener('mouseup', onUp);
  });
}

function _tlCutBlock(block, take, clickEvent) {
  const et = _effectiveTake(take);
  const rect = block.getBoundingClientRect();
  const cutOffsetMs = Math.round((clickEvent.clientX - rect.left) / S.pxPerMs);
  const minMs = 100;
  if (cutOffsetMs < minMs || cutOffsetMs > et.duration_ms - minMs) return;

  // R5: use the EFFECTIVE start_trim_ms (may have been edited) not the raw take field.
  const virtualId = `${take.filename}__split__${Date.now()}`;
  S.virtualTakes[virtualId] = {
    id: virtualId, source: take.source_file || take.filename,
    startTrimMs: (et.start_trim_ms || 0) + cutOffsetMs,
    durationMs: et.duration_ms - cutOffsetMs,
    positionMs: et.position_ms + cutOffsetMs,
    char: take.character, actor: take.actor,
  };
  if (take.is_virtual) { if (S.virtualTakes[take.filename]) S.virtualTakes[take.filename].durationMs = cutOffsetMs; }
  else { S.editedTakes[take.filename] = { ...(S.editedTakes[take.filename]||{}), duration_ms: cutOffsetMs }; }
  renderTimeline();
}

function _tlUpdateTooltip(block, filename, newMs) {
  const tt = block.querySelector('.daw-tl-block-tooltip');
  if (!tt) return;
  // R6: look up the full take object from S.takes so _effectiveTake has real duration_ms.
  const raw = S.takes.find(t => t.filename === filename) || { filename, position_ms: newMs };
  const et = _effectiveTake(raw);
  tt.innerHTML = `${esc(filename)}<br>${_tlFmtMs(newMs)} &middot; ${((et.duration_ms||2000)/1000).toFixed(1)}s`;
}

function _tlUpdateOverlaps() {
  const allBlocks = $('daw-tl-tracks').querySelectorAll('.daw-tl-block:not(.daw-tl-ref-block)');
  const byTrack = {};
  allBlocks.forEach(b => {
    const key = b.closest('[data-track-key]')?.dataset.trackKey;
    if (!key || key.includes('||retake')) return;
    byTrack[key] = byTrack[key] || [];
    byTrack[key].push(b);
  });
  allBlocks.forEach(b => b.classList.remove('overlap'));
  Object.values(byTrack).forEach(blocks => {
    const active = blocks.filter(b => !b.classList.contains('deleted'));
    for (let i = 0; i < active.length; i++) {
      for (let j = i + 1; j < active.length; j++) {
        const li = parseInt(active[i].style.left)||0, wi = parseInt(active[i].style.width)||0;
        const lj = parseInt(active[j].style.left)||0, wj = parseInt(active[j].style.width)||0;
        if (li + wi > lj && lj + wj > li) { active[i].classList.add('overlap'); active[j].classList.add('overlap'); }
      }
    }
  });
}

function _tlComputeRetakes() {
  S.timelineTracks.forEach(track => {
    const key = `${track.char}||${track.actor}`;
    const allTk = track.takes.map(t => _effectiveTake(t)).filter(t => !t.deleted);
    allTk.sort((a, b) => a.position_ms - b.position_ms);
    const overlapping = new Set();
    for (let i = 0; i < allTk.length; i++) {
      const aEnd = allTk[i].position_ms + (allTk[i].duration_ms || 2000);
      for (let j = i + 1; j < allTk.length; j++) {
        if (allTk[j].position_ms < aEnd) overlapping.add(allTk[j].filename);
      }
    }
    S.retakeTracks[key] = overlapping;
  });
}

function _tlCheckRetakeFromData() {
  const before = JSON.stringify(Object.fromEntries(
    Object.entries(S.retakeTracks).map(([k, v]) => [k, [...v]])
  ));
  _tlComputeRetakes();
  const after = JSON.stringify(Object.fromEntries(
    Object.entries(S.retakeTracks).map(([k, v]) => [k, [...v]])
  ));
  if (before !== after) _tlRender();
  else _tlUpdateOverlaps();
}

function _tlSetToolMode(mode) {
  S.toolMode = mode;
  const scroll = $('daw-tl-scroll');
  if (mode === 'cut') { scroll.classList.add('cut-mode'); $('tl-cut-btn')?.classList.add('active'); $('tl-pointer-btn')?.classList.remove('active'); }
  else { scroll.classList.remove('cut-mode'); $('tl-cut-btn')?.classList.remove('active'); $('tl-pointer-btn')?.classList.add('active'); }
}

// Cut line preview
$('daw-tl-tracks')?.addEventListener('mousemove', e => {
  if (S.toolMode !== 'cut') return;
  let line = document.getElementById('daw-tl-cut-line');
  if (!line) {
    line = document.createElement('div'); line.id = 'daw-tl-cut-line'; line.className = 'daw-tl-cut-line';
    $('daw-tl-scroll').appendChild(line);
  }
  const scrollEl = $('daw-tl-scroll'), rect = scrollEl.getBoundingClientRect();
  line.style.left = (e.clientX - rect.left + scrollEl.scrollLeft) + 'px';
  line.style.display = 'block';
});
$('daw-tl-tracks')?.addEventListener('mouseleave', () => {
  const line = document.getElementById('daw-tl-cut-line');
  if (line) line.style.display = 'none';
});

// Zoom
$('tl-zoom-in').addEventListener('click', () => {
  S.pxPerMs = Math.min(S.pxPerMs * 1.6, 2.0);
  _tlUpdateZoomLabel();
  _tlRender();
});
$('tl-zoom-out').addEventListener('click', () => {
  S.pxPerMs = Math.max(S.pxPerMs / 1.6, 0.004);
  _tlUpdateZoomLabel();
  _tlRender();
});
function _tlUpdateZoomLabel() {
  const zoom = (S.pxPerMs / 0.04).toFixed(1).replace(/\.0$/, '');
  $('tl-zoom-val').textContent = zoom + '×';
}

// Scroll/pinch zoom (Ctrl+wheel or trackpad pinch on macOS)
$('daw-tl-scroll')?.addEventListener('wheel', e => {
  if (e.ctrlKey || e.metaKey) {
    e.preventDefault();
    const factor = e.deltaY > 0 ? (1 / 1.2) : 1.2;
    S.pxPerMs = Math.min(Math.max(S.pxPerMs * factor, 0.004), 2.0);
    _tlUpdateZoomLabel();
    _tlRender();
  }
}, { passive: false });

// Snap toggle button
$('tl-snap-btn')?.addEventListener('click', () => {
  S.snapEnabled = !S.snapEnabled;
  $('tl-snap-btn').classList.toggle('active', S.snapEnabled);
});

// Tool mode buttons
$('tl-pointer-btn')?.addEventListener('click', () => _tlSetToolMode('pointer'));
$('tl-cut-btn')?.addEventListener('click', () => _tlSetToolMode('cut'));

// Reset edits — wipe local state AND tell backend to restore originals,
// then refetch the canonical take list so visuals match the persisted truth.
$('tl-reset-btn').addEventListener('click', async () => {
  S.editedTakes   = {};
  S.virtualTakes  = {};
  S.retakeTracks  = {};
  S.mutedTracks   = new Set();
  S.soloedTracks  = new Set();
  S.toolMode      = 'pointer';
  $('daw-tl-scroll')?.classList.remove('cut-mode');

  if (S.jobId) {
    try {
      await fetch(`/api/job/${encodeURIComponent(S.jobId)}/reset_edits`, { method: 'POST' });
      const r = await fetch(`/api/job/${encodeURIComponent(S.jobId)}/status`);
      if (r.ok) {
        const st = await r.json();
        if (Array.isArray(st.takes)) S.takes = st.takes;
      }
    } catch (err) {
      console.warn('reset_edits failed:', err);
    }
  }
  renderTimeline();
});

// Combos collapse toggle
$('daw-tl-combos-toggle').addEventListener('click', () => {
  const body = $('daw-tl-combos-body');
  const label = $('daw-tl-combos-label');
  const open = !body.classList.contains('hidden');
  body.classList.toggle('hidden', open);
  if (!open) label.textContent = label.textContent.replace('↓', '↑');
  else label.textContent = label.textContent.replace('↑', '↓');
});

$('proceed-to-config-btn').addEventListener('click', async () => {
  await saveTimelineEdits();
  goStep(3);
  navBtns[3].disabled = false;
});

async function saveTimelineEdits() {
  if (!S.jobId) return;
  const hasEdits = Object.keys(S.editedTakes).length > 0;
  const hasVirtual = Object.keys(S.virtualTakes).length > 0;
  if (!hasEdits && !hasVirtual) return;

  const edits = Object.entries(S.editedTakes).map(([filename, e]) => ({
    filename,
    position_ms: e.position_ms ?? null,
    duration_ms: e.duration_ms ?? null,
    start_trim_ms: e.start_trim_ms ?? null,
    deleted: e.deleted ?? false,
    is_virtual: false,
  }));

  const virtualEdits = Object.entries(S.virtualTakes).map(([id, vt]) => ({
    filename: id,
    source_file: vt.source,
    position_ms: vt.positionMs,
    duration_ms: vt.durationMs,
    start_trim_ms: vt.startTrimMs || 0,
    deleted: false,
    is_virtual: true,
  }));

  try {
    const res = await fetch(`/api/job/${encodeURIComponent(S.jobId)}/takes`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify([...edits, ...virtualEdits]),
    });
    // T4: surface backend errors so users know edits were not saved.
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      logAdd(`Aviso: edições não salvas — ${d.detail || res.statusText}`, 'warn');
    }
  } catch (err) {
    logAdd(`Erro ao salvar edições da timeline: ${err.message}`, 'error');
  }
}

// ══════════════════════════════════════════════════════════════════
//  STEP 3 — CONFIG
// ══════════════════════════════════════════════════════════════════
$('conf-me-vol').addEventListener('input', () => {
  $('conf-me-val').textContent = `${$('conf-me-vol').value}%`;
});
$('conf-dlg-vol').addEventListener('input', () => {
  $('conf-dlg-val').textContent = `${$('conf-dlg-vol').value}%`;
});

$('start-process-btn').addEventListener('click', startProcessing);

async function startProcessing() {
  if (!S.jobId) { showError('Nenhum job ativo.'); return; }
  hideError();
  S.lastRenderedComboCount = 0;

  // Flush all timeline edits (drag/trim/cut/delete) to backend before pipeline starts.
  // Safety net for users who navigate via top-nav buttons instead of the Proceed flow.
  try { await saveTimelineEdits(); } catch (_) {}

  const settings = {
    volume_me: parseInt($('conf-me-vol').value) / 100,
    volume_dialogos: parseInt($('conf-dlg-vol').value) / 100,
    lipsync_trim: $('conf-lipsync').checked,
    muted_tracks:  [...S.mutedTracks],
    soloed_tracks: [...S.soloedTracks],
  };

  try {
    const res = await fetch(`/api/job/${encodeURIComponent(S.jobId)}/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Erro ao iniciar');

    goStep(4);
    navBtns[4].disabled = false;
    $('job-indicator').style.display = 'flex';
    $('job-indicator-text').textContent = 'Processando pipeline...';
    pollProcess();
  } catch (err) {
    showError(err.message);
  }
}

// ══════════════════════════════════════════════════════════════════
//  STEP 4 — PIPELINE POLLING
// ══════════════════════════════════════════════════════════════════
const PIPELINE_NODES = {
  demucs_concluido: 'pn-demucs',
  carregando: 'pn-analysis',
  time_stretch: 'pn-stretch',
  mixando: 'pn-mix',
  exportando: 'pn-export',
  exportado: 'pn-export',
};

function updatePipelineNode(etapa, pct) {
  const nodeIds = ['pn-demucs','pn-analysis','pn-stretch','pn-mix','pn-export'];
  const order = ['demucs_concluido','carregando','time_stretch','mixando','exportando'];
  const curIdx = order.indexOf(etapa);
  nodeIds.forEach((nid, i) => {
    const el = $(nid);
    if (!el) return;
    const status = el.querySelector('.pn-status');
    if (i < curIdx) {
      el.classList.remove('active'); el.classList.add('done');
      if (status) { status.className = 'pn-status done'; status.textContent = '✓'; }
    } else if (i === curIdx) {
      el.classList.add('active'); el.classList.remove('done');
      if (status) { status.className = 'pn-status active'; status.textContent = '...'; }
    } else {
      el.classList.remove('active','done');
      if (status) { status.className = 'pn-status pending'; status.textContent = 'aguardando'; }
    }
  });
}

function pollProcess() {
  S.pollInterval && clearTimeout(S.pollInterval);
  let errCount = 0;
  const tick = async () => {
    if (!S.jobId) { S.pollInterval = setTimeout(tick, 1200); return; }
    try {
      const res = await fetch(`/api/job/${encodeURIComponent(S.jobId)}/status`);
      if (!res.ok) { errCount = Math.min(errCount + 1, 5); S.pollInterval = setTimeout(tick, Math.min(8000, 1200 * (1 + errCount))); return; }
      errCount = 0;
      const job = await res.json();
      const pct = job.percentual ?? 0;
      const etapa = job.etapa || '';
      const msg = job.mensagem || '';

      $('process-bar').style.width = `${pct}%`;
      $('process-label').textContent = msg;
      updatePipelineNode(etapa, pct);

      if (msg) {
        logAdd(msg, etapa === 'erro' ? 'error' : pct === 100 ? 'success' : 'info');
        const comboLabel = $('combo-progress-label');
        if (comboLabel && msg !== S.lastLogMsg) comboLabel.textContent = msg;
      }

      // Streaming: render results as they arrive
      const partialResults = job.combos_results || [];
      if (partialResults.length > S.lastRenderedComboCount) {
        S.lastRenderedComboCount = partialResults.length;
        renderResultsGrid(partialResults);
        navBtns[5].disabled = false;
      }

      const warns = job.warnings || [];
      if (warns.length) {
        $('warnings-panel').classList.remove('hidden');
        $('warnings-count').textContent = warns.length;
        const ul = $('warnings-list');
        ul.innerHTML = '';
        warns.forEach(w => {
          const li = document.createElement('li');
          li.textContent = w;
          ul.appendChild(li);
          logAdd(w, 'warn');
        });
      }

      if (job.status === 'concluido') {
        $('job-indicator').style.display = 'none';
        logAdd('Pipeline concluído com sucesso.', 'success');
        renderResult(job);
        navBtns[5].disabled = false;
        goStep(5);
        return;
      } else if (job.status === 'erro') {
        $('job-indicator').style.display = 'none';
        logAdd(`Erro: ${job.error}`, 'error');
        $('process-label').textContent = `Erro: ${job.error}`;
        return;
      }
    } catch (err) { errCount = Math.min(errCount + 1, 5); logAdd(`Erro de rede ao consultar status: ${err.message}`, 'warn'); }
    S.pollInterval = setTimeout(tick, Math.min(8000, 1200 * (1 + errCount)));
  };
  tick();
}

// ══════════════════════════════════════════════════════════════════
//  STEP 5 — RESULTADO
// ══════════════════════════════════════════════════════════════════
function renderResult(job) {
  const combosResults = job.combos_results || [];
  renderResultsGrid(combosResults);

  const zipBtn = $('download-all-btn');
  if (combosResults.length > 1) {
    zipBtn.href = `/api/job/${encodeURIComponent(S.jobId)}/results-zip`;
    zipBtn.classList.remove('hidden');
  }

  const grid = $('report-grid');
  grid.innerHTML = '';
  const stats = [
    { label: 'Takes', val: S.takes.length || '—' },
    { label: 'Personagens', val: S.characters.length || '—' },
    { label: 'Dubladores', val: S.actors.length || '—' },
    { label: 'Vídeos Gerados', val: combosResults.filter(r => r.output_file).length },
  ];
  stats.forEach(s => {
    const el = document.createElement('div');
    el.className = 'report-stat';
    el.innerHTML = `<span class="report-stat-label">${esc(s.label)}</span><span class="report-stat-val">${esc(String(s.val))}</span>`;
    grid.appendChild(el);
  });

  const warns = job.warnings || [];
  if (warns.length) {
    $('report-warnings').classList.remove('hidden');
    const ul = $('report-warnings-list');
    ul.innerHTML = '';
    warns.forEach(w => { const li = document.createElement('li'); li.textContent = w; ul.appendChild(li); });
  }
}

function renderResultsGrid(results) {
  const grid = $('results-grid');
  grid.innerHTML = '';
  if (!results.length) {
    grid.innerHTML = `<div class="results-empty-state"><p>Nenhum resultado ainda. Inicie o pipeline na Etapa 4.</p></div>`;
    return;
  }

  results.forEach(r => {
    const card = document.createElement('div');
    card.className = 'result-card';

    if (r.error) {
      card.innerHTML = `
        <div class="result-card-header">
          <span class="result-card-title">${esc(r.label || r.combo_id)}</span>
          <span style="color:var(--danger)">✗ Erro</span>
        </div>
        <div class="result-card-error">${esc(r.error)}</div>
      `;
    } else {
      const dlUrl = r.download_url || `/api/download/${encodeURIComponent(r.output_file || '')}`;
      card.innerHTML = `
        <div class="result-card-header">
          <span class="result-card-title" title="${esc(r.label)}">${esc(r.label || r.combo_id)}</span>
          <span style="color:var(--success);font-size:0.75rem">✓</span>
        </div>
        <video controls preload="metadata" src="${esc(dlUrl)}"></video>
        <div class="result-card-actions">
          <a class="daw-btn daw-btn-outline daw-btn-xs" href="${dlUrl}" download="${esc(r.output_file || 'resultado.mp4')}">
            Baixar
          </a>
        </div>
      `;
    }
    grid.appendChild(card);
  });
}

// ══════════════════════════════════════════════════════════════════
//  TRANSPORT PLAYER
// ══════════════════════════════════════════════════════════════════
const _tpAudio   = $('tl-audio-el');
const _tpBar     = $('tl-transport');
const _tpPlayEl  = $('tp-play-btn');
const _tpSeekEl  = $('tp-seek');
const _tpTimeEl  = $('tp-time');
const _tpTrkEl   = $('tp-track-name');
const _tpTakEl   = $('tp-take-name');
const _tpPhEl    = $('daw-tl-playhead');
const _tpPhTcEl  = $('daw-tl-playhead-tc');
const _tpScroll  = $('daw-tl-scroll');

let _tpPlaylist  = [];  // array of takes for current track
let _tpIndex     = 0;   // index into _tpPlaylist
let _tpCurBlock  = null; // currently highlighted DOM block
let _tpSliceEnded = false; // T6: guard to prevent double _tpNext() call

function _getTrackTakes(trackKey) {
  if (!trackKey) return [];
  const track = S.timelineTracks.find(t => `${t.char}||${t.actor}` === trackKey);
  if (!track) return [];
  return track.takes.filter(t => !(_effectiveTake(t).deleted));
}

function _tpFmtSec(s) {
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.floor(s % 60)).padStart(2,'0')}`;
}

function _tpSelectTake(take, playlist, blockEl) {
  _tpPlaylist = playlist || [take];
  _tpIndex    = _tpPlaylist.findIndex(t => t.filename === take.filename);
  if (_tpIndex < 0) _tpIndex = 0;
  _tpLoadCurrent(blockEl);
}

function _tpLoadCurrent(blockEl) {
  const take = _tpPlaylist[_tpIndex];
  if (!take) return;

  // highlight block
  document.querySelectorAll('.tl-block-selected').forEach(b => b.classList.remove('tl-block-selected'));
  if (blockEl) {
    blockEl.classList.add('tl-block-selected');
    _tpCurBlock = blockEl;
  } else {
    // find block by filename
    const found = document.querySelector(`.daw-tl-block[data-filename="${CSS.escape(take.filename)}"]`);
    if (found) { found.classList.add('tl-block-selected'); _tpCurBlock = found; }
  }

  // update transport info
  const parts = (take.character || '') + ' — ' + (take.actor || '');
  _tpTrkEl.textContent = parts;
  _tpTakEl.textContent = take.filename.replace(/\.wav$/i,'');

  // load audio — virtual takes (cuts/dups) reuse the original source file.
  // Always read via _effectiveTake so post-drag/trim positions are correct.
  const et = _effectiveTake(take);
  const audioFn = et.source_file || et.filename;
  const sliceStartSec = (et.start_trim_ms || 0) / 1000;
  const sliceEndSec   = ((et.start_trim_ms || 0) + (et.duration_ms || 0)) / 1000;
  _tpAudio._sliceStart = sliceStartSec;
  _tpAudio._sliceEnd   = sliceEndSec > sliceStartSec ? sliceEndSec : 0;
  _tpAudio.src = `/api/download/${encodeURIComponent(audioFn)}`;
  _tpAudio.load();
  const seekAndPlay = () => {
    if (sliceStartSec > 0) { try { _tpAudio.currentTime = sliceStartSec; } catch(_) {} }
    _tpAudio.play().catch(() => {});
  };
  if (_tpAudio.readyState >= 1) seekAndPlay();
  else _tpAudio.addEventListener('loadedmetadata', seekAndPlay, { once: true });
  _tpPlayEl.textContent = '⏸';
  _tpPlayEl.classList.add('playing');

  _tpBar.classList.remove('hidden');

  // Sync video reference player and start playback once the seek lands.
  _vrefSeekAndPlay(take);
}

function _tpNext() {
  if (_tpIndex + 1 < _tpPlaylist.length) {
    _tpIndex++;
    _tpLoadCurrent(null);
  } else {
    _tpStop();
  }
}

// Re-arm transport audio slice if the currently-loaded take was just edited.
// Called by drag/trim onUp so right-trim during playback stops at the new end,
// left-trim shifts the active source seek, and drags update the playhead origin.
function _tpRefreshActiveSlice(filename) {
  const cur = _tpPlaylist[_tpIndex];
  if (!cur || cur.filename !== filename) return;
  const et = _effectiveTake(cur);
  _tpAudio._sliceStart = (et.start_trim_ms || 0) / 1000;
  _tpAudio._sliceEnd   = ((et.start_trim_ms || 0) + (et.duration_ms || 0)) / 1000;
}

function _tpFmtMs(ms) {
  const h = Math.floor(ms / 3600000), r1 = ms % 3600000;
  const m = Math.floor(r1 / 60000), r2 = r1 % 60000;
  const s = Math.floor(r2 / 1000);
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

function _tpUpdatePlayhead() {
  const raw = _tpPlaylist[_tpIndex];
  if (!raw || !_tpPhEl) return;
  const take = _effectiveTake(raw);
  const posMs = (take.position_ms || 0) + (_tpAudio.currentTime * 1000) - (take.start_trim_ms || 0);
  const x = Math.round(posMs * S.pxPerMs);
  _tpPhEl.style.display = 'block';
  _tpPhEl.style.left = x + 'px';
  if (_tpPhTcEl) _tpPhTcEl.textContent = _tpFmtMs(posMs);
  // auto-scroll to keep needle visible
  if (_tpScroll) {
    const scrollW = _tpScroll.clientWidth;
    const scrollL = _tpScroll.scrollLeft;
    if (x < scrollL + 40 || x > scrollL + scrollW - 80) {
      _tpScroll.scrollLeft = Math.max(0, x - scrollW / 3);
    }
  }
}

function _tpStop() {
  _tpAudio.pause();
  _tpAudio.currentTime = 0;
  _tpPlayEl.textContent = '▶';
  _tpPlayEl.classList.remove('playing');
  document.querySelectorAll('.tl-block-selected').forEach(b => b.classList.remove('tl-block-selected'));
  if (_tpPhEl) _tpPhEl.style.display = 'none';
  _vrefStop();
}

// Audio events
_tpAudio.addEventListener('ended', () => { if (!_tpSliceEnded) _tpNext(); _tpSliceEnded = false; });
_tpAudio.addEventListener('timeupdate', () => {
  if (!_tpAudio.duration || isNaN(_tpAudio.duration)) return;
  // T6: Respect the trimmed slice: when we pass start_trim_ms + duration_ms, advance.
  // Set _tpSliceEnded so the 'ended' event doesn't call _tpNext a second time.
  const sliceEnd   = _tpAudio._sliceEnd   || 0;
  const sliceStart = _tpAudio._sliceStart || 0;
  if (sliceEnd > 0 && _tpAudio.currentTime >= sliceEnd) { _tpSliceEnded = true; _tpNext(); return; }
  // B1: normalise seek bar against the SLICE, not the full file duration.
  const sliceDur = sliceEnd > sliceStart ? (sliceEnd - sliceStart) : _tpAudio.duration;
  _tpSeekEl.value = sliceDur > 0 ? Math.min(1, Math.max(0, (_tpAudio.currentTime - sliceStart) / sliceDur)) : 0;
  const elapsed = _tpAudio.currentTime - sliceStart;
  _tpTimeEl.textContent = `${_tpFmtSec(Math.max(0, elapsed))} / ${_tpFmtSec(sliceDur)}`;
  _tpUpdatePlayhead();
});
_tpAudio.addEventListener('play',  () => { _tpPlayEl.textContent = '⏸'; _tpPlayEl.classList.add('playing'); _vrefPlay(); });
_tpAudio.addEventListener('pause', () => { _tpPlayEl.textContent = '▶'; _tpPlayEl.classList.remove('playing'); _vrefPause(); });

// Transport button listeners
_tpPlayEl.addEventListener('click', () => {
  if (_tpAudio.paused) _tpAudio.play().catch(() => {});
  else _tpAudio.pause();
});
$('tp-stop-btn').addEventListener('click', () => _tpStop());
$('tp-close-btn').addEventListener('click', () => {
  _tpStop();
  _tpBar.classList.add('hidden');
  if (_tpPhEl) _tpPhEl.style.display = 'none';
});
_tpSeekEl.addEventListener('input', () => {
  if (_tpAudio.duration) {
    // B2: seek within the slice bounds, not the full file.
    const sliceStart = _tpAudio._sliceStart || 0;
    const sliceEnd   = _tpAudio._sliceEnd   || 0;
    const sliceDur   = sliceEnd > sliceStart ? (sliceEnd - sliceStart) : _tpAudio.duration;
    const target = sliceStart + Math.min(1, Math.max(0, parseFloat(_tpSeekEl.value))) * sliceDur;
    _tpAudio.currentTime = Math.min(target, sliceEnd > 0 ? sliceEnd - 0.01 : _tpAudio.duration);
    const raw = _tpPlaylist[_tpIndex];
    if (raw && window._vrefVideo) {
      const take = _effectiveTake(raw);
      const startTrim = (take.start_trim_ms || 0) / 1000;
      window._vrefVideo.currentTime =
        (take.position_ms || 0) / 1000 + (_tpAudio.currentTime - startTrim);
    }
  }
});

// T7: Single merged keydown handler (was two separate listeners).
// ── Undo / Redo buttons ──────────────────────────────────────────
$('tl-undo-btn')?.addEventListener('click', () => _tlUndo());
$('tl-redo-btn')?.addEventListener('click', () => _tlRedo());

// ── Keyboard shortcuts ───────────────────────────────────────────
document.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return;
  // Space: play/pause transport
  if (e.key === ' ' && !_tpBar.classList.contains('hidden')) {
    e.preventDefault();
    if (_tpAudio.paused) _tpAudio.play().catch(() => {}); else _tpAudio.pause();
    return;
  }
  if (e.key === 'v' || e.key === 'V') _tlSetToolMode('pointer');
  else if (e.key === 'c' || e.key === 'C') _tlSetToolMode('cut');
  else if (e.key === 's' || e.key === 'S') {
    S.snapEnabled = !S.snapEnabled;
    $('tl-snap-btn')?.classList.toggle('active', S.snapEnabled);
  }
  else if ((e.metaKey || e.ctrlKey) && !e.shiftKey && (e.key === 'z' || e.key === 'Z')) { e.preventDefault(); _tlUndo(); }
  else if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === 'z' || e.key === 'Z')) { e.preventDefault(); _tlRedo(); }
});

// ══════════════════════════════════════════════════════════════════
//  UNDO / REDO
// ══════════════════════════════════════════════════════════════════
function _tlPushUndo() {
  S.undoStack.push({
    editedTakes:  JSON.parse(JSON.stringify(S.editedTakes)),
    virtualTakes: JSON.parse(JSON.stringify(S.virtualTakes)),
    retakeTracks: JSON.parse(JSON.stringify(
      Object.fromEntries(Object.entries(S.retakeTracks).map(([k, v]) => [k, [...v]]))
    )),
  });
  if (S.undoStack.length > 60) S.undoStack.shift();
  S.redoStack = [];
  _tlUpdateUndoRedoBtns();
}

function _tlRestoreSnapshot(snap) {
  S.editedTakes  = snap.editedTakes;
  S.virtualTakes = snap.virtualTakes;
  S.retakeTracks = Object.fromEntries(
    Object.entries(snap.retakeTracks).map(([k, v]) => [k, new Set(v)])
  );
}

function _tlUndo() {
  if (!S.undoStack.length) return;
  const cur = {
    editedTakes:  JSON.parse(JSON.stringify(S.editedTakes)),
    virtualTakes: JSON.parse(JSON.stringify(S.virtualTakes)),
    retakeTracks: JSON.parse(JSON.stringify(
      Object.fromEntries(Object.entries(S.retakeTracks).map(([k, v]) => [k, [...v]]))
    )),
  };
  S.redoStack.push(cur);
  _tlRestoreSnapshot(S.undoStack.pop());
  renderTimeline();
  _tlUpdateUndoRedoBtns();
}

function _tlRedo() {
  if (!S.redoStack.length) return;
  const cur = {
    editedTakes:  JSON.parse(JSON.stringify(S.editedTakes)),
    virtualTakes: JSON.parse(JSON.stringify(S.virtualTakes)),
    retakeTracks: JSON.parse(JSON.stringify(
      Object.fromEntries(Object.entries(S.retakeTracks).map(([k, v]) => [k, [...v]]))
    )),
  };
  S.undoStack.push(cur);
  _tlRestoreSnapshot(S.redoStack.pop());
  renderTimeline();
  _tlUpdateUndoRedoBtns();
}

function _tlUpdateUndoRedoBtns() {
  const u = $('tl-undo-btn'), r = $('tl-redo-btn');
  if (u) u.disabled = S.undoStack.length === 0;
  if (r) r.disabled = S.redoStack.length === 0;
}

// ══════════════════════════════════════════════════════════════════
//  MUTE / SOLO
// ══════════════════════════════════════════════════════════════════
function _isTrackAudible(key) {
  if (S.mutedTracks.has(key)) return false;
  if (S.soloedTracks.size > 0 && !S.soloedTracks.has(key)) return false;
  return true;
}

function _tlToggleMute(key) {
  if (S.mutedTracks.has(key)) S.mutedTracks.delete(key);
  else S.mutedTracks.add(key);
  _tlRender();
}

function _tlToggleSolo(key) {
  if (S.soloedTracks.has(key)) S.soloedTracks.delete(key);
  else S.soloedTracks.add(key);
  _tlRender();
}

// ══════════════════════════════════════════════════════════════════
//  RUBBER-BAND SELECT
// ══════════════════════════════════════════════════════════════════
(function _initRubberBand() {
  const tracksEl = $('daw-tl-tracks');
  if (!tracksEl) return;
  let rbEl = null, rbStartX = 0, rbStartY = 0, rbActive = false;

  tracksEl.addEventListener('mousedown', e => {
    if (S.toolMode === 'cut') return;
    if (e.target !== tracksEl && !e.target.classList.contains('daw-tl-track')) return;
    rbActive = true;
    const rect = tracksEl.getBoundingClientRect();
    const scrollEl = $('daw-tl-scroll');
    rbStartX = e.clientX - rect.left + (scrollEl?.scrollLeft || 0);
    rbStartY = e.clientY - rect.top;
    rbEl = document.createElement('div');
    rbEl.className = 'tl-select-rect';
    rbEl.style.cssText = `left:${rbStartX}px;top:${rbStartY}px;width:0;height:0;`;
    tracksEl.appendChild(rbEl);
  });

  document.addEventListener('mousemove', e => {
    if (!rbActive || !rbEl) return;
    const rect = tracksEl.getBoundingClientRect();
    const scrollEl = $('daw-tl-scroll');
    const curX = e.clientX - rect.left + (scrollEl?.scrollLeft || 0);
    const curY = e.clientY - rect.top;
    const x = Math.min(rbStartX, curX), y = Math.min(rbStartY, curY);
    const w = Math.abs(curX - rbStartX), h = Math.abs(curY - rbStartY);
    rbEl.style.cssText = `left:${x}px;top:${y}px;width:${w}px;height:${h}px;`;
  });

  document.addEventListener('mouseup', e => {
    if (!rbActive || !rbEl) return;
    rbActive = false;
    const rect = tracksEl.getBoundingClientRect();
    const scrollEl = $('daw-tl-scroll');
    const curX = e.clientX - rect.left + (scrollEl?.scrollLeft || 0);
    const curY = e.clientY - rect.top;
    const selX1 = Math.min(rbStartX, curX), selX2 = Math.max(rbStartX, curX);
    const selY1 = Math.min(rbStartY, curY), selY2 = Math.max(rbStartY, curY);

    if (selX2 - selX1 > 4) {
      if (!e.shiftKey) {
        S.selectedBlocks.clear();
        document.querySelectorAll('.tl-ms-selected').forEach(b => b.classList.remove('tl-ms-selected'));
      }
      tracksEl.querySelectorAll('.daw-tl-block').forEach(b => {
        const bLeft = parseInt(b.style.left) || 0;
        const bTop  = b.offsetTop;
        const bW    = parseInt(b.style.width) || 0;
        const bH    = parseInt(b.style.height) || 0;
        const overlaps = bLeft < selX2 && bLeft + bW > selX1 && bTop < selY2 && bTop + bH > selY1;
        if (overlaps && b.dataset.filename) {
          S.selectedBlocks.add(b.dataset.filename);
          b.classList.add('tl-ms-selected');
        }
      });
    }
    rbEl.remove(); rbEl = null;
  });
})();

// ══════════════════════════════════════════════════════════════════
//  INTERACTIVE RULER — click / drag to set playhead
// ══════════════════════════════════════════════════════════════════
(function _initRulerInteraction() {
  const rulerEl = $('daw-tl-ruler');
  if (!rulerEl) return;
  let dragging = false;

  function _rulerSeek(e) {
    const scrollEl = $('daw-tl-scroll');
    const rect = rulerEl.getBoundingClientRect();
    const x = e.clientX - rect.left + (scrollEl?.scrollLeft || 0);
    const posMs = Math.max(0, x / S.pxPerMs);
    if (_tpPhEl) {
      _tpPhEl.style.display = 'block';
      _tpPhEl.style.left = Math.round(posMs * S.pxPerMs) + 'px';
    }
    if (_tpPhTcEl) _tpPhTcEl.textContent = _tpFmtMs(posMs);
    // if transport is active, seek audio to the new position. The audio file
    // is played from `start_trim_ms` onward, so the in-file seek target is
    // (elapsed-on-timeline) + start_trim.
    if (!_tpAudio.paused && _tpPlaylist[_tpIndex]) {
      const take = _effectiveTake(_tpPlaylist[_tpIndex]);
      const startTrim = (take.start_trim_ms || 0) / 1000;
      const seekSec = (posMs - (take.position_ms || 0)) / 1000 + startTrim;
      if (seekSec >= 0 && seekSec <= _tpAudio.duration) {
        _tpAudio.currentTime = seekSec;
      }
    }
  }

  rulerEl.addEventListener('mousedown', e => {
    e.preventDefault(); dragging = true; _rulerSeek(e);
  });
  document.addEventListener('mousemove', e => { if (dragging) _rulerSeek(e); });
  document.addEventListener('mouseup', () => { dragging = false; });
})();

// ══════════════════════════════════════════════════════════════════
//  FLOATING VIDEO REFERENCE PLAYER
// ══════════════════════════════════════════════════════════════════
(function _initVrefPlayer() {
  const panel   = $('vref-panel');
  const titlebar= $('vref-titlebar');
  const body    = $('vref-body');
  const video   = $('vref-video');
  const minBtn  = $('vref-min-btn');
  const maxBtn  = $('vref-max-btn');
  const closeBtn= $('vref-close-btn');
  const volSlider = $('vref-vol');
  const timecode  = $('vref-timecode');
  const openBtn   = $('tl-video-btn');
  if (!panel || !video) return;

  // Drag logic
  let dragDx = 0, dragDy = 0, dragging = false;
  titlebar.addEventListener('mousedown', e => {
    if (e.target !== titlebar && e.target.className !== 'vref-title') return;
    dragging = true;
    dragDx = e.clientX - panel.getBoundingClientRect().left;
    dragDy = e.clientY - panel.getBoundingClientRect().top;
    e.preventDefault();
  });
  document.addEventListener('mousemove', e => {
    if (!dragging) return;
    panel.style.right = 'auto';
    panel.style.left = (e.clientX - dragDx) + 'px';
    panel.style.top  = (e.clientY - dragDy) + 'px';
  });
  document.addEventListener('mouseup', () => { dragging = false; });

  // Min / Max / Close
  minBtn.addEventListener('click', () => panel.classList.toggle('vref-minimized'));
  maxBtn.addEventListener('click', () => panel.classList.toggle('vref-maximized'));
  closeBtn.addEventListener('click', () => { panel.style.display = 'none'; });
  openBtn?.addEventListener('click', () => {
    panel.style.display = '';
    panel.classList.remove('vref-minimized');
  });

  // Volume
  video.volume = parseFloat(volSlider?.value ?? '0.5');
  volSlider?.addEventListener('input', () => { video.volume = parseFloat(volSlider.value); });

  // Timecode display
  video.addEventListener('timeupdate', () => {
    if (timecode) timecode.textContent = _tpFmtSec(video.currentTime);
  });

  // Expose for transport sync
  window._vrefVideo = video;
})();

// Guard flag: true while a programmatic seek is in flight.
// Prevents the audio 'play' event from triggering _vrefPlay() and making
// the video start from 0 before the seek to the correct timecode lands.
let _vrefSeeking = false;

// Helper to sync video to a take position (seek-only, no auto-play).
function _vrefSyncToTake(take) {
  const v = window._vrefVideo;
  if (!v || !v.src || !take) return;
  const targetSec = (_effectiveTake(take).position_ms || 0) / 1000;
  const apply = () => { try { v.currentTime = targetSec; } catch (_) {} };
  if (v.readyState >= 1) apply();
  else v.addEventListener('loadedmetadata', apply, { once: true });
}

// Seek the video to the take's timeline position AND start playback only after
// the seek lands. Sets _vrefSeeking=true for the duration so that any spurious
// _vrefPlay() calls from the audio 'play' event are ignored.
function _vrefSeekAndPlay(take) {
  const v = window._vrefVideo;
  if (!v || !v.src || !take) return;
  const targetSec = (_effectiveTake(take).position_ms || 0) / 1000;

  const seekThenPlay = () => {
    const fire = () => { _vrefSeeking = false; v.play().catch(() => {}); };
    _vrefSeeking = true;
    if (Math.abs(v.currentTime - targetSec) < 0.05) { fire(); return; }
    v.addEventListener('seeked', fire, { once: true });
    try { v.currentTime = targetSec; } catch (_) { fire(); }
  };

  if (v.readyState >= 1) seekThenPlay();
  else v.addEventListener('loadedmetadata', seekThenPlay, { once: true });
}
// Only resumes video if no programmatic seek is pending.
function _vrefPlay()  { if (_vrefSeeking) return; window._vrefVideo?.play().catch(() => {}); }
function _vrefPause() { window._vrefVideo?.pause(); }
function _vrefStop()  { const v = window._vrefVideo; if (v) { v.pause(); v.currentTime = 0; } }

// Set video src when a job becomes active (call from upload flow)
function _vrefSetJob(jobId) {
  const v = window._vrefVideo;
  const btn = $('tl-video-btn');
  if (!v || !jobId) return;
  v.src = `/api/job/${encodeURIComponent(jobId)}/video`;
  v.load();
  if (btn) btn.classList.remove('hidden');
}

// ── Init ──────────────────────────────────────────────────────────
(function init() {
  checkHealth();
  setInterval(checkHealth, 15000);
})();
