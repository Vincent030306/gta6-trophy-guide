// The guide and tracker: one page, no network, no build step. Progress lives in localStorage; export and import move it
// between browsers. The spoiler setting hides the names and guides of story trophies until they are earned. The data
// is app/data/data.js, a plain script, so the page also works opened straight from disk (a module script would not).
(function () {
  'use strict';

  const KEY = 'leonida-deduction-board-v1';
  const doc = window.LEONIDA_DATA;
  const byId = new Map(doc.trophies.map((t) => [t.id, t]));

  const $ = (id) => document.getElementById(id);

  const state = load();

  function load() {
    const empty = { earned: [], spoiler: true, view: 'guide' };
    try {
      const raw = JSON.parse(localStorage.getItem(KEY) ?? 'null');
      if (raw === null || typeof raw !== 'object') return empty;
      const earned = Array.isArray(raw.earned) ? raw.earned.filter((id) => Number.isInteger(id) && byId.has(id)) : [];
      return { earned, spoiler: raw.spoiler !== false, view: typeof raw.view === 'string' ? raw.view : 'guide' };
    } catch {
      return empty;
    }
  }

  const earned = new Set(state.earned);

  function save(note) {
    localStorage.setItem(KEY, JSON.stringify(state));
    $('saved').textContent = note ?? 'Saved in this browser.';
  }

  const hiddenBySpoiler = (t) => state.spoiler && t.kind === 'story' && !earned.has(t.id);

  function element(tag, props, children) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(props ?? {})) {
      if (k === 'class') node.className = v;
      else if (k === 'text') node.textContent = v;
      else if (k.slice(0, 2) === 'on') node.addEventListener(k.slice(2), v);
      else node.setAttribute(k, v);
    }
    for (const c of [].concat(children ?? [])) if (c !== null && c !== undefined) node.append(c);
    return node;
  }

  function matches(t) {
    const q = $('search').value.trim().toLowerCase();
    const grade = $('grade').value;
    const kind = $('kind').value;
    const status = $('status').value;
    if (grade !== 'all' && t.grade !== grade) return false;
    if (kind !== 'all' && t.kind !== kind) return false;
    if (status === 'todo' && earned.has(t.id)) return false;
    if (status === 'done' && !earned.has(t.id)) return false;
    if (status === 'missable' && !t.missable) return false;
    if (q !== '') {
      const hay = `${t.name} ${t.description} ${t.guide} ${t.kindLabel}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  }

  function renderRows() {
    const body = $('body');
    body.replaceChildren();
    let shown = 0;
    for (const t of doc.trophies) {
      if (!matches(t)) continue;
      shown++;
      const done = earned.has(t.id);
      const spoiler = hiddenBySpoiler(t);
      const tick = element('input', { type: 'checkbox', class: 'tick', 'aria-label': `Mark ${t.name} earned` });
      tick.checked = done;
      tick.addEventListener('change', () => {
        if (tick.checked) earned.add(t.id);
        else earned.delete(t.id);
        state.earned = [...earned].sort((a, b) => a - b);
        save();
        renderRows();
        renderMeter();
        renderRoad();
      });
      const name = element('strong', { class: 't-name', text: spoiler ? `Story trophy ${t.id}` : t.name });
      const desc = element('span', {
        class: `t-desc${spoiler ? ' hidden-hint' : ''}`,
        text: spoiler ? 'Hidden by the spoiler setting: its official description and guide appear once it is earned.' : t.description,
      });
      const guide = spoiler
        ? element('p', { class: 'spoiler-hid', text: 'Hidden until earned.' })
        : element('div', {}, [element('p', { text: t.guide }), element('p', { class: 'cite', text: `Source: ${t.source}` })]);
      const miss = element('span', { class: t.missable ? 'miss-yes' : 'miss-no', text: t.missable ? 'Missable' : '-' });
      body.append(
        element('tr', { class: done ? 'done' : '' }, [
          element('td', {}, [tick]),
          element('td', {}, [name, desc]),
          element('td', {}, [element('span', { class: `chip g-${t.grade}`, text: t.grade })]),
          element('td', { class: 'guide' }, [guide]),
          element('td', {}, [miss]),
        ]),
      );
    }
    $('empty').hidden = shown > 0;
  }

  function renderMeter() {
    const n = earned.size;
    const total = doc.trophies.length;
    $('count').textContent = `${n} of ${total} earned`;
    $('pct').textContent = `${Math.round((n / total) * 100)}%`;
    $('ring').style.setProperty('--fill', (n / total) * 100);
    const others = doc.trophies.filter((t) => t.grade !== 'platinum');
    const left = others.filter((t) => !earned.has(t.id)).length;
    $('platinumState').textContent = earned.has(1)
      ? 'Platinum earned'
      : left === 0
        ? 'Platinum ready: tick it'
        : `Platinum locked (${left} to go)`;
  }

  function renderRoad() {
    const list = $('road');
    list.replaceChildren();
    for (const step of doc.road) {
      const items = step.ids.map((id) => byId.get(id)).filter(Boolean);
      const done = items.filter((t) => earned.has(t.id)).length;
      const open = items.filter((t) => !hiddenBySpoiler(t)).map((t) => t.name);
      const hidden = items.length - open.length;
      const names = open.join(', ') + (hidden === 0 ? '' : `${open.length === 0 ? '' : '. '}Plus ${hidden} story ${hidden === 1 ? 'trophy' : 'trophies'} hidden by the spoiler setting.`);
      list.append(
        element('li', {}, [
          element('h3', { text: `${step.title} (${done} of ${items.length})` }),
          element('p', { class: 'names', text: names }),
          element('p', { text: step.text }),
        ]),
      );
    }
  }

  function renderFlags() {
    const list = $('flags');
    list.replaceChildren();
    for (const f of doc.flags) {
      const t = byId.get(f.id);
      if (!t) continue;
      const done = earned.has(f.id);
      list.append(element('li', {}, [element('strong', { text: `${t.name}${done ? ' (earned)' : ''}` }), element('span', { text: f.why })]));
    }
  }

  function setView(view) {
    state.view = ['guide', 'road', 'flags'].includes(view) ? view : 'guide';
    document.documentElement.setAttribute('data-view', state.view);
    for (const v of ['guide', 'road', 'flags']) {
      $(`view-${v}`).hidden = v !== state.view;
      $(`tab-${v}`).setAttribute('aria-selected', String(v === state.view));
    }
    save();
  }

  $('tab-guide').addEventListener('click', () => setView('guide'));
  $('tab-road').addEventListener('click', () => setView('road'));
  $('tab-flags').addEventListener('click', () => setView('flags'));
  for (const id of ['search', 'grade', 'kind', 'status']) $(id).addEventListener('input', renderRows);

  $('spoiler').addEventListener('change', () => {
    state.spoiler = $('spoiler').checked;
    document.documentElement.setAttribute('data-spoiler', state.spoiler ? 'on' : 'off');
    save();
    renderRows();
    renderRoad();
  });

  $('export').addEventListener('click', () => {
    const payload = { app: 'leonida-deduction-board', version: 1, exported: new Date().toISOString(), earned: [...earned].sort((a, b) => a - b), spoiler: state.spoiler };
    const a = element('a', { href: URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })), download: 'leonida-deduction-board.json' });
    document.body.append(a);
    a.click();
    a.remove();
    save(`Exported ${payload.earned.length} earned trophies.`);
  });

  $('import').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const raw = JSON.parse(await file.text());
      const ids = Array.isArray(raw) ? raw : raw.earned;
      if (!Array.isArray(ids)) throw new Error('no earned list in that file');
      const known = ids.filter((id) => Number.isInteger(id) && byId.has(id));
      earned.clear();
      for (const id of known) earned.add(id);
      state.earned = [...earned].sort((a, b) => a - b);
      save(`Imported ${known.length} earned trophies.`);
      renderRows();
      renderMeter();
      renderRoad();
    } catch (err) {
      $('saved').textContent = `That is not a progress file: ${err.message}`;
    } finally {
      e.target.value = '';
    }
  });

  $('reset').addEventListener('click', () => {
    earned.clear();
    state.earned = [];
    save('Progress cleared.');
    renderRows();
    renderMeter();
    renderRoad();
  });

  $('spoiler').checked = state.spoiler;
  document.documentElement.setAttribute('data-spoiler', state.spoiler ? 'on' : 'off');
  renderRows();
  renderMeter();
  renderRoad();
  renderFlags();
  setView(state.view);
})();
