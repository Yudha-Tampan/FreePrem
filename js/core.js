(() => {
  const FP = window.FP;
  const $ = id => document.getElementById(id);
  const memory = {};

  const store = {
    get(key) {
      try { return localStorage.getItem(key) || memory[key] || ''; } catch { return memory[key] || ''; }
    },
    set(key, value) {
      memory[key] = value;
      try { localStorage.setItem(key, value); } catch {}
    }
  };

  let toastTimer;
  function toast(text) {
    const el = $('toast');
    el.textContent = text;
    el.classList.add('is-show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('is-show'), 2200);
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      const area = document.createElement('textarea');
      area.value = text;
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      let ok = false;
      try { ok = document.execCommand('copy'); } catch {}
      area.remove();
      return ok;
    }
  }

  async function call(route, params) {
    const url = new URL(FP.API_BASE, location.href);
    url.searchParams.set('p', route);
    Object.entries(params || {}).forEach(([key, value]) => url.searchParams.set(key, value));
    let response;
    try {
      response = await fetch(url, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(40000) });
    } catch (error) {
      if (error && error.name === 'TimeoutError') throw new Error('Server terlalu lama merespons. Coba lagi.');
      throw new Error('Tidak bisa terhubung ke server. Periksa koneksi internet lalu coba lagi.');
    }
    let json;
    try {
      json = await response.json();
    } catch {
      if (response.status === 404) throw new Error('Fungsi proxy belum terpasang (404). Pastikan folder api ikut di-deploy.');
      throw new Error('Respons server tidak valid (' + response.status + ').');
    }
    if (!response.ok || json.status === false) {
      throw new Error(json.message || json.error || 'Permintaan gagal (' + response.status + ').');
    }
    return json;
  }

  function showMessage(el, text, kind) {
    el.innerHTML = '';
    if (!text) return;
    const box = document.createElement('div');
    box.className = 'alert alert-' + kind;
    box.setAttribute('role', kind === 'err' ? 'alert' : 'status');
    box.textContent = text;
    el.appendChild(box);
  }
  const showError = (el, text) => showMessage(el, text, 'err');
  const showNote = (el, text) => showMessage(el, text, 'note');

  async function busy(button, label, task) {
    const original = button.textContent;
    button.disabled = true;
    button.setAttribute('aria-busy', 'true');
    button.textContent = label;
    try {
      return await task();
    } finally {
      button.disabled = false;
      button.removeAttribute('aria-busy');
      button.textContent = original;
    }
  }

  function h(tag, props, ...kids) {
    const el = document.createElement(tag);
    if (props) {
      Object.entries(props).forEach(([name, value]) => {
        if (value === null || value === undefined || value === false) return;
        if (name === 'class') el.className = value;
        else if (name === 'text') el.textContent = value;
        else el.setAttribute(name, value);
      });
    }
    kids.flat().forEach(kid => { if (kid !== null && kid !== undefined) el.append(kid); });
    return el;
  }

  const isUrl = value => typeof value === 'string' && value.startsWith('https://');
  const fmt = value => Number(value || 0).toLocaleString('id-ID');
  const smooth = () => (matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth');

  function fieldError(input, text) {
    const note = $(input.id + 'Err');
    if (text) input.setAttribute('aria-invalid', 'true');
    else input.removeAttribute('aria-invalid');
    note.textContent = text || '';
    note.hidden = !text;
  }

  function block(title, meta, content) {
    return h('section', { class: 'block' },
      h('h3', { class: 'block-title' }, h('span', { text: title }), meta instanceof Node ? meta : (meta ? h('span', { class: 'block-meta', text: meta }) : null)),
      content);
  }

  function pairs(items) {
    return h('dl', { class: 'cred' }, items.map(([key, value]) => h('div', null, h('dt', { text: key }), h('dd', { text: String(value) }))));
  }

  function listRows(items) {
    return h('ul', { class: 'cred' }, items.map(([main, side]) => h('li', null,
      h('span', { class: 'li-main', text: main }),
      side instanceof Node ? side : h('span', { class: 'li-meta', text: side }))));
  }

  function tag(text, kind) {
    return h('span', { class: 'tag' + (kind ? ' tag-' + kind : ''), text });
  }

  function details(title, count, content) {
    return h('details', { class: 'more' }, h('summary', null, h('span', { text: title }), h('span', { class: 'more-count', text: String(count) })), content);
  }

  function chevron(direction) {
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('aria-hidden', 'true');
    const path = document.createElementNS(ns, 'path');
    path.setAttribute('d', direction < 0 ? 'M15 5l-7 7 7 7' : 'M9 5l7 7-7 7');
    svg.appendChild(path);
    return svg;
  }

  function carousel(slides, label, cards) {
    const track = h('div', { class: 'track', tabindex: '0', role: 'group', 'aria-roledescription': 'carousel', 'aria-label': label }, slides);
    const prev = h('button', { class: 'arrow', type: 'button', 'aria-label': 'Sebelumnya' }, chevron(-1));
    const next = h('button', { class: 'arrow', type: 'button', 'aria-label': 'Berikutnya' }, chevron(1));
    const step = () => {
      const first = track.children[0];
      return first ? first.getBoundingClientRect().width + 12 : track.clientWidth;
    };
    const dots = cards ? [] : slides.map((_, index) => {
      const dot = h('button', { class: 'dot', type: 'button', 'aria-label': 'Slide ' + (index + 1) });
      dot.addEventListener('click', () => track.scrollTo({ left: index * step(), behavior: smooth() }));
      return dot;
    });
    const sync = () => {
      const index = Math.round(track.scrollLeft / step());
      dots.forEach((dot, i) => dot.setAttribute('aria-current', String(i === index)));
      prev.disabled = track.scrollLeft <= 2;
      next.disabled = track.scrollLeft + track.clientWidth >= track.scrollWidth - 2;
    };
    prev.addEventListener('click', () => track.scrollBy({ left: -step(), behavior: smooth() }));
    next.addEventListener('click', () => track.scrollBy({ left: step(), behavior: smooth() }));
    track.addEventListener('scroll', () => requestAnimationFrame(sync), { passive: true });
    window.addEventListener('resize', sync);
    requestAnimationFrame(sync);
    return h('div', { class: 'carousel' + (cards ? ' carousel-cards' : '') },
      track,
      h('div', { class: 'carousel-bar' }, h('div', { class: 'dots' }, dots), h('div', { class: 'arrows' }, prev, next)));
  }

  const dash = value => (value === null || value === undefined || value === '' ? '-' : String(value));
  const count = value => (typeof value === 'number' ? fmt(value) : '-');
  const when = value => {
    const date = new Date(value);
    return value && !isNaN(date) ? date.toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' }) : '-';
  };
  const linkBtn = (text, href, save) => h('a', { class: 'btn btn-inline', href, target: '_blank', rel: 'noopener noreferrer', download: save ? '' : null, text });
  const copyBtn = (text, getValue) => {
    const button = h('button', { class: 'btn btn-inline', type: 'button', text });
    button.addEventListener('click', async () => toast((await copyText(getValue())) ? 'Tautan disalin' : 'Gagal menyalin'));
    return button;
  };
  const actions = (...items) => h('div', { class: 'flex flex-wrap gap-2' }, ...items);
  const mediaUrl = url => FP.API_MEDIA + '?u=' + encodeURIComponent(url);

  function bindForm(cfg) {
    $(cfg.form).addEventListener('submit', async event => {
      event.preventDefault();
      const input = $(cfg.input);
      const value = input.value.trim();
      fieldError(input, '');
      showError($(cfg.msg), '');
      if (!value) { fieldError(input, cfg.required || 'Tautan wajib diisi.'); input.focus(); return; }
      if (!cfg.valid(value)) { fieldError(input, cfg.invalid); input.focus(); return; }
      $(cfg.out).innerHTML = '';
      showNote($(cfg.msg), cfg.wait);
      try {
        await busy($(cfg.button), 'Memproses', async () => {
          const node = cfg.render(await call(cfg.route, cfg.params(value)));
          showError($(cfg.msg), '');
          $(cfg.out).replaceChildren(node);
        });
      } catch (error) {
        showError($(cfg.msg), error.message);
      }
    });
  }

  function initTabs(names, fallback) {
    const buttons = document.querySelectorAll('[role="tab"]');
    const select = (tab, push) => {
      if (!names.includes(tab)) tab = fallback;
      document.body.dataset.tab = tab;
      buttons.forEach(button => button.setAttribute('aria-selected', String(button.dataset.tab === tab)));
      names.forEach(name => {
        const page = $('tab-' + name);
        page.hidden = name !== tab;
        page.classList.toggle('is-enter', name === tab && push);
      });
      if (push) {
        history.replaceState(null, '', '#' + tab);
        window.scrollTo({ top: 0 });
      }
    };
    buttons.forEach(button => button.addEventListener('click', () => select(button.dataset.tab, true)));
    window.addEventListener('hashchange', () => select(location.hash.slice(1), true));
    select(location.hash.slice(1), false);
  }

  Object.assign(FP, { $, store, toast, copyText, call, showMessage, showError, showNote, busy, h, isUrl, fmt, smooth, fieldError, block, pairs, listRows, tag, details, carousel, initTabs, dash, count, when, linkBtn, copyBtn, actions, mediaUrl, bindForm });
})();
