// Leonida Platinum — offline GTA 6 trophy tracker.
// Loads app/data/trophies.json, renders the checklist, roadmap and missable
// views, and keeps progress in localStorage with JSON export and import.
// No network request is made at run time: the only fetch is the local data file.
const STORAGE_KEY = 'gta6-trophy-guide-v1';
const DATA_URL = 'data/trophies.json';

const KIND_LABELS = {
  story: 'Story', side: 'Side strand', activity: 'Activity',
  collectible: 'Collectible', robbery: 'Robbery',
  completion: '100% completion', misc: 'Miscellaneous', platinum: 'Platinum',
};

const ROADMAP_STAGES = [
  { stage: 1, title: 'Play the story — and save the Chapter 1 meditation', text: 'Play Chapters 1–5 in order for the 13 story trophies (chapters, the opening mission Gone Fishing, the named missions and the finale). Before leaving Chapter 1, do Lucia’s balcony meditation at Jason’s house after Down to Earth — the one missable interaction in the game. Make a manual save at the start and end of every chapter; there is no mission replay.' },
  { stage: 2, title: 'Side strands and character finals', text: 'Finish the 8 Strangers & Freaks strands and the five character finals (Andy, Kenton, Billy, Randy, Tyrone), plus Bret’s first unique-animal hunt, Cal’s fishing challenge and one arcade game. These unlock as the story advances, so clear them between chapters rather than leaving them all for later.' },
  { stage: 3, title: 'Activities and skills', text: 'Earn gold in all 42 Shooting Range challenges, win a Top Fun drone race at all 14 locations, win 20 different races, complete 250 stunts (300 for 100%) and 50 challenges (70 for 100%). Try each of the 9 activity types once for Master of None.' },
  { stage: 4, title: 'Collectibles and exploration', text: 'Meditate at all 18 spots, complete 3 card sets (15 for 100%), WAiNK 100 locations, discover 100 vehicles (200 for 100%), explore all 52 areas of Leonida, and register 10 vehicles in the Scooter Bros app.' },
  { stage: 5, title: 'Robberies and money', text: 'Rob 5 bank vaults (8 for 100%, unlocked in Chapter 4), an armored truck, a jewelry store undetected, one illegal operation per gang (9 gangs), and 3 shops back-to-back with your partner. Launder $250,000 in Marked Bills, spend $100,000 in shops, buy all 8 garages, and work toward 500 Criminal Profile actions.' },
  { stage: 6, title: 'Cleanup to 100% — then the platinum', text: 'Open Progress, then Stats, then 100% Completion and finish the checklist: it needs selected portions, not everything. A Long Road (gold) unlocks at 100%, and Vice Got a Price! (platinum) pops the moment the other 54 trophies are all earned.' },
];

let trophies = [];
let earned = new Set();
let selectedId = null;
let spoilerOn = false;

const $ = (id) => document.getElementById(id);

function loadProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    if (Array.isArray(data.earned)) earned = new Set(data.earned.filter((n) => Number.isInteger(n)));
    if (typeof data.spoiler === 'boolean') spoilerOn = data.spoiler;
  } catch { earned = new Set(); }
}

function saveProgress(note) {
  const data = { earned: [...earned].sort((a, b) => a - b), spoiler: spoilerOn, savedAt: new Date().toISOString() };
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch { /* storage full or blocked */ }
  if (note) $('saveNote').textContent = note;
}

function gradeCount(grade) {
  return trophies.filter((t) => t.grade === grade && earned.has(t.id)).length;
}

function renderProgress() {
  const total = trophies.length;
  const count = earned.size;
  const pct = total ? Math.round((count / total) * 100) : 0;
  $('earnedCount').textContent = String(count);
  $('progressFill').style.width = pct + '%';
  $('progressPct').textContent = pct + '% to the platinum';
  const parts = ['platinum', 'gold', 'silver', 'bronze'].map((g) => {
    const have = gradeCount(g);
    const of = trophies.filter((t) => t.grade === g).length;
    return g + ' ' + have + '/' + of;
  });
  $('gradeCounts').textContent = parts.join(' · ');
}

function trophyVisible(t) {
  const q = $('searchInput').value.trim().toLowerCase();
  const grade = $('gradeFilter').value;
  const kind = $('kindFilter').value;
  if (grade !== 'all' && t.grade !== grade) return false;
  if (kind !== 'all' && t.kind !== kind) return false;
  if ($('missableOnly').checked && !t.missable) return false;
  if ($('earnedOnly').checked && !earned.has(t.id)) return false;
  if ($('remainingOnly').checked && earned.has(t.id)) return false;
  if (q && !(t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q))) return false;
  return true;
}

function storyHidden(t) {
  return spoilerOn && t.kind === 'story' && !earned.has(t.id);
}

function renderList() {
  const list = $('trophyList');
  list.innerHTML = '';
  const shown = trophies.filter(trophyVisible);
  $('resultCount').textContent = 'Showing ' + shown.length + ' of ' + trophies.length + ' trophies' +
    (spoilerOn ? ' — spoiler mode hides unearned story trophies.' : '.');
  for (const t of shown) {
    const item = document.createElement('li');
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'trophy-item' + (earned.has(t.id) ? ' earned' : '') + (selectedId === t.id ? ' selected' : '');
    const box = document.createElement('input');
    box.type = 'checkbox';
    box.checked = earned.has(t.id);
    box.setAttribute('aria-label', 'Mark ' + t.name + ' as earned');
    box.addEventListener('click', (event) => {
      event.stopPropagation();
      if (box.checked) earned.add(t.id); else earned.delete(t.id);
      saveProgress('Progress saved in this browser.');
      renderProgress();
      renderList();
      renderDetail();
      renderRoadmap();
    });
    const body = document.createElement('div');
    const name = document.createElement('div');
    name.className = 'trophy-name';
    name.textContent = storyHidden(t) ? 'Hidden story trophy' : t.name;
    const desc = document.createElement('div');
    desc.className = 'trophy-desc';
    desc.textContent = storyHidden(t) ? 'Hidden on PlayStation until earned — turn off “Hide story spoilers” or earn it to reveal it.' : t.description;
    const meta = document.createElement('div');
    meta.className = 'trophy-meta';
    const gradeBadge = document.createElement('span');
    gradeBadge.className = 'badge ' + t.grade;
    gradeBadge.textContent = t.grade;
    meta.appendChild(gradeBadge);
    const kindBadge = document.createElement('span');
    kindBadge.className = 'badge kind';
    kindBadge.textContent = KIND_LABELS[t.kind] || t.kind;
    if (t.kind !== 'platinum') meta.appendChild(kindBadge);
    if (t.missable) {
      const m = document.createElement('span');
      m.className = 'badge missable';
      m.textContent = 'Missable';
      meta.appendChild(m);
    }
    if (t.hidden) {
      const h = document.createElement('span');
      h.className = 'badge hidden-flag';
      h.textContent = 'Hidden';
      meta.appendChild(h);
    }
    if (t.target) {
      const tg = document.createElement('span');
      tg.className = 'badge target';
      tg.textContent = 'Target: ' + t.target.value.toLocaleString('en-US') + ' ' + t.target.label;
      meta.appendChild(tg);
    }
    body.append(name, desc, meta);
    const check = document.createElement('span');
    check.textContent = earned.has(t.id) ? '✓' : '';
    check.setAttribute('aria-hidden', 'true');
    button.append(box, body, check);
    button.addEventListener('click', () => { selectedId = t.id; renderList(); renderDetail(); });
    item.appendChild(button);
    list.appendChild(item);
  }
  if (!shown.length) {
    const empty = document.createElement('li');
    empty.textContent = 'No trophies match these filters.';
    list.appendChild(empty);
  }
}

function renderDetail() {
  const pane = $('detailPane');
  const t = trophies.find((x) => x.id === selectedId);
  if (!t) {
    pane.innerHTML = '<p class="detail-empty">Select a trophy to read its guide and sources.</p>';
    return;
  }
  pane.innerHTML = '';
  const title = document.createElement('h2');
  title.textContent = storyHidden(t) ? 'Hidden story trophy' : t.name;
  const meta = document.createElement('p');
  meta.className = 'trophy-meta';
  const gradeBadge = document.createElement('span');
  gradeBadge.className = 'badge ' + t.grade;
  gradeBadge.textContent = t.grade;
  meta.appendChild(gradeBadge);
  const kindBadge = document.createElement('span');
  kindBadge.className = 'badge kind';
  kindBadge.textContent = KIND_LABELS[t.kind] || t.kind;
  if (t.kind !== 'platinum') meta.appendChild(kindBadge);
  if (t.missable) {
    const m = document.createElement('span');
    m.className = 'badge missable';
    m.textContent = 'Missable';
    meta.appendChild(m);
  }
  const desc = document.createElement('p');
  desc.innerHTML = '<strong>Official description:</strong> ';
  desc.appendChild(document.createTextNode(storyHidden(t) ? 'Hidden until earned.' : t.description));
  pane.append(title, meta, desc);
  if (storyHidden(t)) {
    const hiddenNote = document.createElement('p');
    hiddenNote.textContent = 'Its guide and sources stay hidden too — earn the trophy or turn off “Hide story spoilers” to read them.';
    pane.appendChild(hiddenNote);
    const earnedState = document.createElement('p');
    earnedState.textContent = 'Not yet earned — tick the box in the list when you earn it.';
    pane.appendChild(earnedState);
    return;
  }
  if (t.missable) {
    const note = document.createElement('div');
    note.className = 'missable-note';
    note.textContent = 'Missable: do this before leaving Chapter 1. See the guide below — there is no mission replay.';
    pane.appendChild(note);
  }
  const guideHeading = document.createElement('h3');
  guideHeading.textContent = 'Guide';
  const guide = document.createElement('p');
  guide.className = 'guide-text';
  guide.textContent = t.guide;
  pane.append(guideHeading, guide);
  const srcHeading = document.createElement('h3');
  srcHeading.textContent = 'Sources';
  const srcList = document.createElement('ul');
  srcList.className = 'sources';
  for (const s of t.sources || []) {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = s.url;
    a.textContent = s.name;
    a.target = '_blank';
    a.rel = 'noopener';
    li.appendChild(a);
    srcList.appendChild(li);
  }
  pane.append(srcHeading, srcList);
  const earnedState = document.createElement('p');
  earnedState.textContent = earned.has(t.id) ? 'Earned — ticked in your checklist.' : 'Not yet earned — tick the box in the list when you earn it.';
  pane.appendChild(earnedState);
}

function renderRoadmap() {
  const list = $('roadmapList');
  list.innerHTML = '';
  for (const s of ROADMAP_STAGES) {
    const inStage = trophies.filter((t) => t.stage === s.stage);
    const done = inStage.filter((t) => earned.has(t.id)).length;
    const li = document.createElement('li');
    const title = document.createElement('strong');
    title.textContent = s.title;
    const count = document.createElement('div');
    count.className = 'stage-count';
    count.textContent = done + ' of ' + inStage.length + ' trophies in this stage earned';
    const text = document.createElement('p');
    text.textContent = s.text;
    li.append(title, count, text);
    list.appendChild(li);
  }
}

function renderMissable() {
  const box = $('missableList');
  box.innerHTML = '';
  const missable = trophies.filter((t) => t.missable);
  for (const t of missable) {
    const card = document.createElement('div');
    card.className = 'missable-card';
    const title = document.createElement('strong');
    title.textContent = t.name + ' — ' + t.grade;
    const desc = document.createElement('p');
    desc.textContent = t.description;
    const guide = document.createElement('p');
    guide.textContent = t.guide;
    card.append(title, desc, guide);
    box.appendChild(card);
  }
  const safe = document.createElement('p');
  safe.textContent = 'All other 54 trophies: not missable. Story trophies unlock in order, side strands stay open, and collectibles, activities and robberies remain available in free roam after the story.';
  box.appendChild(safe);
}

function exportChecklist() {
  const data = { game: 'Grand Theft Auto VI', exportedAt: new Date().toISOString(), earned: [...earned].sort((a, b) => a - b) };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'gta6-trophy-checklist.json';
  a.click();
  URL.revokeObjectURL(url);
  $('saveNote').textContent = 'Checklist exported.';
}

function importChecklist(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(String(reader.result));
      const ids = Array.isArray(data) ? data : data.earned;
      if (!Array.isArray(ids)) throw new Error('no earned list');
      const valid = new Set(trophies.map((t) => t.id));
      earned = new Set(ids.filter((n) => valid.has(n)));
      saveProgress('Checklist imported: ' + earned.size + ' trophies earned.');
      renderProgress();
      renderList();
      renderDetail();
      renderRoadmap();
    } catch {
      $('saveNote').textContent = 'Import failed: that file is not a checklist export.';
    }
  };
  reader.readAsText(file);
}

function switchView(name) {
  document.querySelectorAll('.tab').forEach((tab) => {
    const active = tab.dataset.view === name;
    tab.classList.toggle('active', active);
    tab.setAttribute('aria-selected', String(active));
  });
  document.querySelectorAll('.view').forEach((view) => {
    view.classList.toggle('active', view.id === 'view-' + name);
  });
}

async function boot() {
  loadProgress();
  $('spoilerToggle').checked = spoilerOn;
  const response = await fetch(DATA_URL);
  const data = await response.json();
  trophies = data.trophies;
  document.querySelectorAll('.tab').forEach((tab) => {
    tab.addEventListener('click', () => switchView(tab.dataset.view));
  });
  for (const id of ['searchInput', 'gradeFilter', 'kindFilter', 'missableOnly', 'earnedOnly', 'remainingOnly']) {
    $(id).addEventListener('input', renderList);
    $(id).addEventListener('change', renderList);
  }
  $('spoilerToggle').addEventListener('change', () => {
    spoilerOn = $('spoilerToggle').checked;
    saveProgress('Spoiler setting saved.');
    renderList();
    renderDetail();
  });
  $('exportBtn').addEventListener('click', exportChecklist);
  $('importInput').addEventListener('change', (event) => {
    const file = event.target.files && event.target.files[0];
    if (file) importChecklist(file);
    event.target.value = '';
  });
  $('resetBtn').addEventListener('click', () => {
    if (!window.confirm('Clear all earned trophies?')) return;
    earned = new Set();
    saveProgress('Progress reset.');
    renderProgress();
    renderList();
    renderDetail();
    renderRoadmap();
  });
  renderProgress();
  renderList();
  renderDetail();
  renderRoadmap();
  renderMissable();
}

boot();
