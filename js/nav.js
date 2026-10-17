(() => {
  const current = location.pathname.split('/').pop() || 'index.html';
  const ICONS = {
    star: 'M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.9L12 16.9l-5.2 2.8 1-5.9-4.3-4.1 5.9-.8z',
    stalk: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-4-4',
    download: 'M12 4v11m0 0l-4-4m4 4l4-4M5 19.5h14',
    image: 'M4 5h16v14H4zM4 16l5-5 4 4 3-3 4 4M15 9.5h.01'
  };
  const GROUPS = [
    ['premium.html', 'Premium', 'star', [['AM Prem', 'am'], ['VIU', 'viu']]],
    ['stalk.html', 'Stalk', 'stalk', [['Mobile Legends', 'ml'], ['Roblox', 'roblox'], ['Instagram', 'instagram']]],
    ['download.html', 'Download', 'download', [['TikTok', 'tiktok'], ['UC Drive', 'ucdrive']]],
    ['search.html', 'Search', 'image', [['Pixiv', 'pixiv']]]
  ];
  const FOCUS = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent)]';
  const icon = (name, size) => '<svg viewBox="0 0 24 24" class="' + size + '" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' + ICONS[name] + '"/></svg>';

  const nav = document.createElement('nav');
  nav.setAttribute('aria-label', 'Navigasi utama');
  nav.className = 'fixed inset-x-0 bottom-0 z-40 border-t border-[var(--line)] bg-[var(--surface)] pb-[var(--safe-b)]';
  nav.innerHTML =
    '<div class="mx-auto grid h-16 max-w-lg grid-cols-1 items-stretch px-2">' +
    '<div class="relative flex justify-center">' +
    '<button type="button" id="fpToggle" aria-label="Buka menu kategori" aria-expanded="false" aria-controls="fpMenu" class="group absolute -top-7 grid size-14 place-items-center rounded-full bg-[var(--accent)] text-[var(--on-accent)] shadow-lg ring-4 ring-[var(--surface)] transition-transform active:scale-95 motion-reduce:transition-none focus-visible:outline-offset-4 ' + FOCUS + '">' +
    '<span class="relative block h-3.5 w-5" aria-hidden="true">' +
    '<span class="absolute left-0 top-0 h-0.5 w-5 rounded bg-current transition-all duration-200 motion-reduce:transition-none group-aria-expanded:top-1.5 group-aria-expanded:rotate-45"></span>' +
    '<span class="absolute left-0 top-1.5 h-0.5 w-5 rounded bg-current transition-opacity duration-200 motion-reduce:transition-none group-aria-expanded:opacity-0"></span>' +
    '<span class="absolute left-0 top-3 h-0.5 w-5 rounded bg-current transition-all duration-200 motion-reduce:transition-none group-aria-expanded:top-1.5 group-aria-expanded:-rotate-45"></span>' +
    '</span></button></div></div>';

  const panel = document.createElement('div');
  panel.id = 'fpMenu';
  panel.setAttribute('role', 'region');
  panel.setAttribute('aria-label', 'Kategori fitur');
  panel.className = 'fixed bottom-[calc(var(--nav-h)+var(--safe-b)+44px)] left-1/2 z-40 grid w-[min(92vw,380px)] origin-bottom gap-3 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-3 shadow-xl transition duration-200 motion-reduce:transition-none';
  panel.innerHTML = GROUPS.map(([file, title, name, links]) =>
    '<section><h2 class="mb-1.5 px-1 text-sm font-semibold"><a href="' + file + '"' + (file === current ? ' aria-current="page"' : '') +
    ' class="inline-flex items-center gap-2 rounded text-[var(--text)] no-underline aria-[current=page]:text-[var(--accent-ink)] ' + FOCUS + '">' + icon(name, 'size-4') + title + '</a></h2>' +
    '<div class="flex flex-wrap gap-1.5">' + links.map(([label, hash]) =>
      '<a href="' + file + '#' + hash + '" class="rounded-lg border border-[var(--line)] bg-[var(--sunken)] px-3 py-1.5 text-sm font-medium text-[var(--text)] no-underline hover:border-[var(--line-strong)] ' + FOCUS + '">' + label + '</a>').join('') +
    '</div></section>').join('');

  const backdrop = document.createElement('div');
  backdrop.className = 'fixed inset-0 z-30 bg-black/30 transition-opacity duration-200 motion-reduce:transition-none';
  backdrop.setAttribute('aria-hidden', 'true');

  const HIDDEN = ['invisible', 'opacity-0', '-translate-x-1/2', 'translate-y-3', 'scale-95'];
  const SHOWN = ['visible', 'opacity-100', '-translate-x-1/2', 'translate-y-0', 'scale-100'];
  const toggle = nav.querySelector('#fpToggle');
  let open = false;

  function render() {
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Tutup menu kategori' : 'Buka menu kategori');
    panel.classList.remove(...HIDDEN, ...SHOWN);
    panel.classList.add(...(open ? SHOWN : HIDDEN));
    backdrop.classList.toggle('invisible', !open);
    backdrop.classList.toggle('opacity-0', !open);
    panel.inert = !open;
  }

  function setOpen(next, restoreFocus) {
    open = next;
    render();
    if (open) panel.querySelector('a').focus();
    else if (restoreFocus) toggle.focus();
  }

  toggle.addEventListener('click', () => setOpen(!open, true));
  backdrop.addEventListener('click', () => setOpen(false, false));
  panel.addEventListener('click', event => { if (event.target.closest('a')) setOpen(false, false); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && open) setOpen(false, true); });
  window.addEventListener('hashchange', () => { if (open) setOpen(false, false); });
  window.addEventListener('pageshow', () => { if (open) setOpen(false, false); });

  render();
  document.body.append(backdrop, panel, nav);
})();
