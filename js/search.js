(() => {
  const { $, h, isUrl, fmt, bindForm, block, tag, details, carousel, initTabs, dash, count, when, linkBtn, copyBtn, mediaUrl } = window.FP;

  const isAdult = item =>
    (Array.isArray(item.tags) && item.tags.some(value => /^r-?18g?$/i.test(String(value).trim()))) ||
    String(item.title || '').includes('🔞');

  function visual(item, adult) {
    const frame = h('div', { class: 'media-frame', style: 'aspect-ratio: 1 / 1' });
    if (!isUrl(item.thumbnail)) {
      frame.textContent = 'Tanpa thumbnail';
      return frame;
    }
    const img = h('img', {
      src: mediaUrl(item.thumbnail),
      alt: 'Karya ' + dash(item.title) + ' oleh ' + dash(item.author),
      loading: 'lazy',
      style: 'grid-area: 1 / 1;' + (adult ? ' filter: blur(24px);' : '')
    });
    img.addEventListener('error', () => frame.replaceChildren(document.createTextNode('Gambar tidak dapat dimuat. Coba buka di Pixiv.')));
    frame.append(img);
    if (adult) {
      const reveal = h('button', { class: 'btn btn-inline', type: 'button', style: 'grid-area: 1 / 1; z-index: 1', text: 'Konten dewasa - Tampilkan' });
      reveal.addEventListener('click', () => {
        img.style.filter = '';
        reveal.remove();
      });
      frame.append(reveal);
    }
    return frame;
  }

  function slide(item) {
    const adult = isAdult(item);
    const tags = Array.isArray(item.tags) ? item.tags.map(String).filter(Boolean) : [];
    const link = isUrl(item.url) ? item.url : '';
    const thumb = isUrl(item.thumbnail) ? mediaUrl(item.thumbnail) : '';
    const badges = [
      adult ? tag('R-18') : null,
      item.pageCount > 1 ? tag(item.pageCount + ' halaman') : null,
      item.width > 0 && item.height > 0 ? tag(item.width + ' x ' + item.height) : null,
      tag('Bookmark ' + count(item.bookmarks)),
      tag('Dilihat ' + count(item.views))
    ];
    const save = thumb ? h('a', { class: 'btn btn-inline', href: thumb, download: 'pixiv-' + dash(item.id) + '.jpg', text: 'Unduh thumbnail' }) : null;

    return h('article', { class: 'slide' }, h('div', { class: 'post-card' },
      visual(item, adult),
      h('div', { class: 'min-w-0' },
        h('h4', { class: 'break-words font-semibold', text: dash(item.title) }),
        h('p', { class: 'text-sm text-[var(--muted)]', text: dash(item.author) + ' - ID ' + dash(item.userId) })),
      h('div', { class: 'tags' }, badges),
      tags.length ? details('Tag', tags.length, h('div', { class: 'tags' }, tags.map(tag))) : null,
      h('p', { class: 'font-mono text-xs text-[var(--muted)]', text: 'ID karya ' + dash(item.id) + ' - ' + when(item.scrapedAt) }),
      h('div', { class: 'media-actions' }, link ? linkBtn('Buka di Pixiv', link, false) : null, save, link ? copyBtn('Salin tautan', () => link) : null)));
  }

  function renderPixiv(json) {
    const items = Array.isArray(json.result) ? json.result.filter(item => item && typeof item === 'object') : [];
    if (!items.length) {
      return h('div', { class: 'alert alert-note', role: 'status', text: 'Tidak ada karya ditemukan untuk "' + dash(json.query) + '".' });
    }
    const carouselEl = carousel(items.map(slide), 'Hasil pencarian Pixiv', true);
    const toggle = h('button', { class: 'btn btn-inline', type: 'button', 'aria-pressed': 'false', text: 'Lihat semua' });
    toggle.addEventListener('click', () => {
      const grid = carouselEl.classList.toggle('is-grid');
      toggle.setAttribute('aria-pressed', String(grid));
      toggle.textContent = grid ? 'Geser' : 'Lihat semua';
    });
    const total = typeof json.total === 'number' ? json.total : items.length;
    const meta = h('span', { class: 'block-tools' }, h('span', { class: 'block-meta', text: fmt(items.length) + ' dari ' + count(total) + ' karya' }), toggle);
    return h('div', { class: 'result' },
      block('Hasil "' + dash(json.query) + '"', meta, carouselEl),
      h('p', { class: 'block-meta note-gap', text: 'Waktu proses ' + dash(json.time_taken) + '. Karya R-18 diburamkan sampai kamu menekan Tampilkan.' }));
  }

  bindForm({
    form: 'pxForm', input: 'pxQuery', button: 'btnPx', msg: 'pxMsg', out: 'pxOut',
    required: 'Kata kunci wajib diisi.', valid: value => value.length <= 100, invalid: 'Kata kunci maksimal 100 karakter.',
    wait: 'Mencari karya di Pixiv.', route: '/search/pixiv', params: query => ({ query }), render: renderPixiv
  });

  initTabs(['pixiv'], 'pixiv');
})();
