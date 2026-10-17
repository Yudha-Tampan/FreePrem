(() => {
  const { $, h, isUrl, fmt, bindForm, block, pairs, tag, initTabs, dash, count, when, linkBtn, copyBtn, actions, mediaUrl } = window.FP;

  const clock = seconds => {
    if (typeof seconds !== 'number' || seconds < 0) return '';
    const total = Math.round(seconds);
    const m = Math.floor(total / 60);
    const s = String(total % 60).padStart(2, '0');
    return m >= 60 ? Math.floor(m / 60) + ':' + String(m % 60).padStart(2, '0') + ':' + s : m + ':' + s;
  };
  const bytes = value => {
    if (typeof value !== 'number') return '';
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = value;
    let i = 0;
    while (size >= 1024 && i < units.length - 1) { size /= 1024; i += 1; }
    return size.toFixed(i ? 2 : 0) + ' ' + units[i];
  };

  const validUrl = (raw, host) => {
    try {
      const url = new URL(raw);
      return /^https?:$/.test(url.protocol) && host.test(url.hostname);
    } catch {
      return false;
    }
  };

  const statGrid = (items, cols) => h('div', { class: 'grid gap-px overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--line)] ' + cols },
    items.map(([label, value]) => h('div', { class: 'bg-[var(--sunken)] p-3' },
      h('div', { class: 'text-lg font-bold', text: value }),
      h('div', { class: 'text-xs text-[var(--muted)]', text: label }))));
  const avatar = (url, name, size, proxied) => {
    const letter = () => h('div', { class: size + ' grid shrink-0 place-items-center rounded-full bg-[var(--sunken)] font-bold', 'aria-hidden': 'true', text: (name || '?').charAt(0).toUpperCase() });
    const src = typeof url === 'string' ? url.replace(/^http:/, 'https:') : '';
    if (!isUrl(src)) return letter();
    const img = h('img', { class: size + ' shrink-0 rounded-full object-cover', src: proxied ? mediaUrl(src) : src, alt: 'Foto ' + name });
    img.addEventListener('error', () => {
      if (proxied && img.getAttribute('src') !== src) img.src = src;
      else img.replaceWith(letter());
    });
    return img;
  };

  function renderTikTok(json) {
    const meta = json.metadata || {};
    const author = meta.author || {};
    const stats = meta.stats || {};
    const video = [json.video_url, ...(Array.isArray(json.video_urls) ? json.video_urls : [])].find(isUrl) || '';
    const audio = isUrl(json.audio_url) ? json.audio_url : '';
    const cover = isUrl(json.thumbnail) ? json.thumbnail : '';
    if (!video && !audio) throw new Error('API tidak mengembalikan video atau audio untuk tautan ini.');

    const videoStatus = h('p', { class: 'text-sm text-[var(--muted)]', role: 'status' });
    const player = video
      ? h('video', { class: 'max-h-[70vh] w-full rounded-lg bg-black', controls: '', playsinline: '', preload: 'metadata', poster: cover ? mediaUrl(cover) : null, src: video, 'aria-label': 'Pemutar video' })
      : null;
    if (player) player.addEventListener('error', () => { videoStatus.textContent = 'Video tidak dapat diputar. Tautan mungkin kedaluwarsa atau diblokir. Coba buka di tab baru atau ambil ulang.'; });

    const audioStatus = h('p', { class: 'text-sm text-[var(--muted)]', role: 'status' });
    const audioEl = audio ? h('audio', { class: 'w-full', controls: '', preload: 'metadata', src: audio, 'aria-label': 'Pemutar audio' }) : null;
    if (audioEl) audioEl.addEventListener('error', () => { audioStatus.textContent = 'Audio tidak dapat diputar di sini. Coba unduh atau buka di tab baru.'; });

    const title = meta.title && String(meta.title).trim();
    const name = author.nickname || author.username || '-';
    return h('div', { class: 'result' },
      h('div', { class: 'profile' },
        avatar(author.avatar, name, 'size-14', true),
        h('div', { class: 'profile-body' },
          h('div', { class: 'profile-name', text: name }),
          h('div', { class: 'profile-sub', text: author.username ? '@' + author.username : '-' }))),
      title ? h('p', { class: 'desc', text: title }) : null,
      player ? block('Video', null, h('div', { class: 'grid gap-3' }, player, videoStatus,
        actions(linkBtn('Unduh video', video, true), linkBtn('Buka di tab baru', video, false), copyBtn('Salin URL', () => video), cover ? linkBtn('Buka sampul', mediaUrl(cover), false) : null)))
        : h('div', { class: 'alert alert-note', role: 'status', text: 'Video tidak tersedia untuk tautan ini.' }),
      audio ? block('Audio', null, h('div', { class: 'grid gap-3' }, audioEl, audioStatus,
        actions(linkBtn('Unduh audio', audio, true), linkBtn('Buka di tab baru', audio, false), copyBtn('Salin URL', () => audio))))
        : h('div', { class: 'alert alert-note', role: 'status', text: 'Audio tidak tersedia untuk tautan ini.' }),
      block('Statistik', null, statGrid([['Suka', count(stats.likes)], ['Komentar', count(stats.comments)], ['Dibagikan', count(stats.shares)], ['Tayangan', count(stats.views)]], 'grid-cols-2 sm:grid-cols-4')),
      block('Informasi', null, pairs([
        ['Status', json.status === true ? 'Berhasil' : dash(json.status)],
        ['Creator API', dash(json.creator)],
        ['Tipe', dash(json.type)],
        ['Tautan asli', dash(typeof json.original_url === 'string' ? json.original_url.trim() : json.original_url)],
        ['Dibuat', when(meta.created_at)],
        ['Waktu proses', dash(json.time_taken)]
      ])));
  }

  function fileCard(file, index) {
    const isVideo = file.file_type === 'video';
    const stream = isUrl(file.video_stream_url) ? file.video_stream_url : '';
    const preview = isUrl(file.preview_url) ? file.preview_url : '';
    const thumb = isUrl(file.thumbnail) ? file.thumbnail : '';
    const ratio = file.video_width > 0 && file.video_height > 0 ? file.video_width + ' / ' + file.video_height : '16 / 9';
    const frame = h('div', { class: 'grid max-h-[70vh] w-full place-items-center overflow-hidden rounded-lg bg-black text-sm text-white/70', style: 'aspect-ratio: ' + ratio });
    const fillThumb = () => {
      if (!thumb) { frame.replaceChildren(document.createTextNode(dash(file.file_type) + ' tanpa thumbnail')); return; }
      const img = h('img', { class: 'size-full object-contain', src: thumb, alt: 'Thumbnail ' + dash(file.file_name), loading: 'lazy', referrerpolicy: 'no-referrer' });
      img.addEventListener('error', () => frame.replaceChildren(document.createTextNode('Thumbnail tidak dapat dimuat')));
      frame.replaceChildren(img);
    };
    fillThumb();
    const status = h('p', { class: 'text-sm text-[var(--muted)]', role: 'status' });

    const buttons = [];
    if (isVideo && stream) {
      const play = h('button', { class: 'btn btn-inline', type: 'button', text: 'Putar' });
      play.addEventListener('click', () => {
        const video = h('video', { class: 'size-full object-contain', src: stream, controls: '', autoplay: '', playsinline: '', 'aria-label': 'Pemutar ' + dash(file.file_name) });
        video.addEventListener('error', () => { fillThumb(); status.textContent = 'Video tidak dapat diputar. Tautan mungkin kedaluwarsa atau diblokir. Ambil ulang daftar berkas.'; });
        status.textContent = '';
        frame.replaceChildren(video);
      });
      buttons.push(play);
    }
    if (preview) buttons.push(linkBtn('Preview', preview, false));
    if (stream) buttons.push(linkBtn('Unduh', stream, true), copyBtn('Salin tautan', () => stream));
    if (!stream && !preview) status.textContent = 'API tidak menyertakan tautan untuk berkas ini.';

    const tags = [tag(dash(file.file_type)), file.format_type ? tag(file.format_type) : null,
      tag(file.size_formatted || bytes(file.size) || 'Ukuran tidak diketahui'),
      clock(file.duration) ? tag('Durasi ' + clock(file.duration)) : null,
      file.video_width && file.video_height ? tag(file.video_width + ' x ' + file.video_height) : null];

    return h('article', { class: 'grid gap-3 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3' },
      frame,
      h('div', { class: 'min-w-0' },
        h('h4', { class: 'break-all font-semibold', text: dash(file.file_name) }),
        h('p', { class: 'break-all font-mono text-xs text-[var(--muted)]', text: 'fid ' + dash(file.fid) + ' (berkas ' + (index + 1) + ')' })),
      h('div', { class: 'tags' }, tags),
      buttons.length ? actions(buttons) : null,
      status);
  }

  function renderUcDrive(json) {
    const result = json.result;
    if (!result || typeof result !== 'object') throw new Error('Respons API tidak berisi data berbagi (result).');
    const author = result.author || {};
    const files = Array.isArray(result.files) ? result.files.filter(file => file && typeof file === 'object') : [];
    const total = typeof result.total_files === 'number' ? result.total_files : files.length;
    const name = author.nick_name || '-';
    return h('div', { class: 'result' },
      h('div', { class: 'profile' },
        avatar(author.avatar_url, name, 'size-14'),
        h('div', { class: 'profile-body' },
          h('div', { class: 'profile-name', text: dash(result.title) }),
          h('div', { class: 'profile-sub', text: name }))),
      block('Informasi berbagi', null, pairs([
        ['ID berbagi', dash(result.share_id)],
        ['Tipe anggota', dash(author.member_type)],
        ['Kedaluwarsa', when(result.expired_at)],
        ['Total berkas', count(total)]
      ])),
      block('Berkas', fmt(total) + ' berkas', files.length
        ? h('div', { class: 'grid gap-4' }, files.map(fileCard))
        : h('div', { class: 'alert alert-note', role: 'status', text: 'Tautan ini tidak berisi berkas yang bisa ditampilkan.' })));
  }

  bindForm({
    form: 'ttForm', input: 'ttUrl', button: 'btnTt', msg: 'ttMsg', out: 'ttOut',
    valid: value => validUrl(value, /(^|\.)tiktok\.com$/i), invalid: 'Masukkan tautan video TikTok yang valid, misalnya https://vt.tiktok.com/xxxx/.',
    wait: 'Mengambil media dari TikTok.', route: '/download/tiktok', params: url => ({ url }), render: renderTikTok
  });

  bindForm({
    form: 'ucForm', input: 'ucUrl', button: 'btnUc', msg: 'ucMsg', out: 'ucOut',
    valid: value => validUrl(value, /uc/i), invalid: 'Masukkan tautan berbagi UC Drive yang valid, misalnya https://uc-share.com/s/xxxx.',
    wait: 'Membaca daftar berkas. Folder besar bisa lebih lama.',
    route: '/download/ucdrive', render: renderUcDrive,
    params: url => {
      const passcode = $('ucPass').value.trim();
      return passcode ? { url, passcode } : { url };
    }
  });

  initTabs(['tiktok', 'ucdrive'], 'tiktok');
})();
