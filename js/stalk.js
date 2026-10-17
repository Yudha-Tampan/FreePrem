(() => {
  const { $, store, toast, copyText, call, showError, showNote, busy, h, isUrl, fmt, fieldError, block, pairs, listRows, tag, details, carousel, initTabs } = window.FP;
  const ML_STORE = 'freeprem_ml';
  const RB_STORE = 'freeprem_roblox';
  const IG_STORE = 'freeprem_instagram';
  function imageSlide(url, caption) {
    const img = h('img', { class: 'slide-img', src: url, alt: caption, loading: 'lazy', decoding: 'async', referrerpolicy: 'no-referrer' });
    img.addEventListener('error', () => img.replaceWith(h('div', { class: 'slide-img slide-fallback', text: 'Gambar tidak dapat dimuat' })));
    return h('figure', { class: 'slide' }, img, h('figcaption', { text: caption }));
  }

  function badgeSlide(badge) {
    const img = isUrl(badge.imageUrl)
      ? h('img', { class: 'badge-img', src: badge.imageUrl, alt: '', loading: 'lazy', referrerpolicy: 'no-referrer' })
      : null;
    if (img) img.addEventListener('error', () => img.remove());
    return h('article', { class: 'slide' }, h('div', { class: 'badge-card' },
      img,
      h('strong', { text: badge.name || 'Badge' }),
      h('p', { text: badge.description || '' })));
  }

  function loadSaved(key) {
    try { return JSON.parse(store.get(key)) || {}; } catch { return {}; }
  }

  const savedMl = loadSaved(ML_STORE);
  $('mlUser').value = savedMl.userId || '';
  $('mlServer').value = savedMl.serverId || '';
  $('rbUser').value = store.get(RB_STORE);
  $('igUser').value = store.get(IG_STORE);

  const isEvent = item => /^\d+\s*\+\s*\d+$/.test(String(item.title || '').trim());

  function renderMl(json) {
    const result = json.result || {};
    const profile = result.profile || {};
    const bind = result.bind || {};
    const events = result.events || {};
    const list = Array.isArray(events.details) ? events.details : [];
    const bonus = list.filter(isEvent);
    const bundles = list.filter(item => !isEvent(item));
    const eventRows = items => listRows(items.map(item => [
      item.title,
      tag(item.available ? 'Tersedia' : 'Tidak tersedia', item.available ? 'ok' : 'err')
    ]));

    const tags = h('div', { class: 'tags' },
      profile.country ? tag(profile.country) : null,
      events.region ? tag('Region ' + events.region) : null);

    const bindEntries = Object.entries(bind).filter(([key]) => key !== 'error');
    let bindNode;
    if (bind.error) {
      bindNode = h('div', { class: 'alert alert-note', role: 'status', text: 'Status bind akun belum bisa dimuat karena server game terlalu lama merespons. Coba cek ulang nanti.' });
    } else if (bindEntries.length) {
      bindNode = pairs(bindEntries.map(([key, value]) => [key, typeof value === 'object' ? JSON.stringify(value) : value]));
    } else {
      bindNode = h('div', { class: 'alert alert-note', role: 'status', text: 'Tidak ada data bind untuk akun ini.' });
    }

    return h('div', { class: 'result' },
      h('div', { class: 'profile' },
        h('div', { class: 'profile-visual', 'aria-hidden': 'true', text: profile.flag || '' }),
        h('div', { class: 'profile-body' },
          h('div', { class: 'profile-name', text: profile.nickname || 'Tanpa nama' }),
          h('div', { class: 'profile-sub', text: 'ID ' + (profile.userID || '-') + ' (' + (profile.serverID || '-') + ')' }),
          tags)),
      block('Status bind', null, bindNode),
      bonus.length ? block('Bonus double diamond', bonus.filter(item => item.available).length + ' dari ' + bonus.length + ' tersedia', eventRows(bonus)) : null,
      bundles.length ? block('Bundle', null, eventRows(bundles)) : null,
      json.time_taken ? h('p', { class: 'block-meta', text: 'Selesai dalam ' + json.time_taken }) : null);
  }

  $('mlForm').addEventListener('submit', async event => {
    event.preventDefault();
    const userId = $('mlUser').value.trim();
    const serverId = $('mlServer').value.trim();
    fieldError($('mlUser'), '');
    fieldError($('mlServer'), '');
    showError($('mlMsg'), '');
    $('mlOut').innerHTML = '';
    let invalid = null;
    if (!/^\d{5,15}$/.test(userId)) {
      fieldError($('mlUser'), userId ? 'User ID harus berupa angka, minimal 5 digit.' : 'User ID wajib diisi.');
      invalid = $('mlUser');
    }
    if (!/^\d{3,6}$/.test(serverId)) {
      fieldError($('mlServer'), serverId ? 'Server ID harus berupa angka, 3 sampai 6 digit.' : 'Server ID wajib diisi.');
      invalid = invalid || $('mlServer');
    }
    if (invalid) { invalid.focus(); return; }
    showNote($('mlMsg'), 'Mengambil data akun. Proses bisa memakan waktu hingga 15 detik.');
    try {
      await busy($('btnMl'), 'Memeriksa', async () => {
        const json = await call('/stalk/mlbb', { userId, serverId });
        if (!json.result || !json.result.profile) throw new Error('Akun tidak ditemukan. Periksa User ID dan Server ID.');
        store.set(ML_STORE, JSON.stringify({ userId, serverId }));
        showError($('mlMsg'), '');
        $('mlOut').replaceChildren(renderMl(json));
      });
    } catch (error) {
      showError($('mlMsg'), error.message);
    }
  });

  const PRESENCE = { 0: 'Offline', 1: 'Online', 2: 'Sedang bermain', 3: 'Di Roblox Studio' };

  function renderRoblox(user) {
    const avatar = user.avatar || {};
    const social = user.social || {};
    const presence = user.presence || {};
    const assets = ((avatar.details || {}).assets) || [];
    const outfits = ((avatar.details || {}).outfits) || avatar.outfits || [];
    const groups = (user.groups || {}).list || [];
    const bundles = (user.catalog || {}).bundles || [];
    const ach = user.achievements || {};
    const badges = [...(ach.robloxBadges || []), ...(ach.badges || [])];

    const views = [];
    const seen = new Set();
    [
      [avatar.fullBody || avatar.thumbnail, 'Tubuh penuh'],
      [avatar.bust, 'Setengah badan'],
      [avatar.headshot, 'Wajah']
    ].forEach(([url, caption]) => {
      if (isUrl(url) && !seen.has(url)) { seen.add(url); views.push(imageSlide(url, caption)); }
    });

    const created = user.created ? new Date(user.created) : null;
    const online = presence.userPresenceType;
    const headshot = isUrl(avatar.headshot)
      ? h('img', { class: 'profile-visual', src: avatar.headshot, alt: 'Foto profil ' + (user.username || ''), referrerpolicy: 'no-referrer' })
      : h('div', { class: 'profile-visual', 'aria-hidden': 'true', text: (user.displayName || user.username || '?').charAt(0).toUpperCase() });

    return h('div', { class: 'result' },
      h('div', { class: 'profile' },
        headshot,
        h('div', { class: 'profile-body' },
          h('div', { class: 'profile-name', text: user.displayName || user.username || '-' }),
          h('div', { class: 'profile-sub', text: '@' + (user.username || '-') }),
          h('div', { class: 'tags' },
            tag(PRESENCE[online] || 'Offline', online > 0 ? 'ok' : null),
            user.hasVerifiedBadge ? tag('Terverifikasi', 'ok') : null,
            user.isBanned ? tag('Dibanned', 'err') : null))),
      user.description ? h('p', { class: 'desc', text: user.description }) : null,
      views.length ? block('Avatar', views.length + ' tampilan', carousel(views, 'Tampilan avatar')) : null,
      h('div', { class: 'stats' },
        h('div', null, h('div', { class: 'stat-v', text: fmt(social.friendsCount) }), h('div', { class: 'stat-l', text: 'Teman' })),
        h('div', null, h('div', { class: 'stat-v', text: fmt(social.followersCount) }), h('div', { class: 'stat-l', text: 'Pengikut' })),
        h('div', null, h('div', { class: 'stat-v', text: fmt(social.followingCount) }), h('div', { class: 'stat-l', text: 'Mengikuti' }))),
      block('Informasi', null, pairs([
        ['User ID', user.id || '-'],
        ['Bergabung', created && !isNaN(created) ? created.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'],
        ['Lokasi terakhir', presence.lastLocation || '-'],
        ['Tipe avatar', (avatar.details || {}).playerAvatarType || '-'],
        ['Outfit tersimpan', fmt(outfits.length)]
      ])),
      badges.length ? block('Badge', fmt(badges.length) + ' badge', carousel(badges.map(badgeSlide), 'Daftar badge', true)) : null,
      assets.length ? details('Item dipakai', assets.length, listRows(assets.map(item => [item.name, (item.assetType || {}).name || '']))) : null,
      groups.length ? details('Grup', groups.length, listRows(groups.map(item => [item.name, item.role ? item.role + ', ' + fmt(item.memberCount) + ' anggota' : fmt(item.memberCount) + ' anggota']))) : null,
      bundles.length ? details('Bundle avatar', bundles.length, listRows(bundles.map(item => [item.name, item.bundleType || '']))) : null);
  }

  $('rbForm').addEventListener('submit', async event => {
    event.preventDefault();
    const username = $('rbUser').value.trim();
    fieldError($('rbUser'), '');
    showError($('rbMsg'), '');
    $('rbOut').innerHTML = '';
    if (!/^[A-Za-z0-9_]{3,20}$/.test(username)) {
      fieldError($('rbUser'), username ? 'Username 3 sampai 20 karakter: huruf, angka, atau garis bawah.' : 'Username wajib diisi.');
      $('rbUser').focus();
      return;
    }
    try {
      await busy($('btnRb'), 'Mencari', async () => {
        const json = await call('/stalk/roblox', { username });
        if (!json.data) throw new Error('Pengguna tidak ditemukan.');
        store.set(RB_STORE, username);
        $('rbOut').replaceChildren(renderRoblox(json.data));
      });
    } catch (error) {
      showError($('rbMsg'), error.message);
    }
  });

  const MEDIA_STATS = [
    ['like_count', 'suka'], ['likes', 'suka'], ['comment_count', 'komentar'], ['comments_count', 'komentar'],
    ['comments', 'komentar'], ['view_count', 'tayangan'], ['play_count', 'tayangan'], ['views', 'tayangan']
  ];
  const TEXT_KEYS = ['caption', 'text', 'title', 'description'];
  const LINK_KEYS = ['permalink', 'post_url', 'link', 'url'];

  function pickMedia(item) {
    const images = [];
    const videos = [];
    const walk = (value, depth) => {
      if (typeof value === 'string') {
        if (!isUrl(value)) return;
        const clean = value.split('?')[0].toLowerCase();
        if (/\.(mp4|mov|webm)$/.test(clean)) videos.push(value);
        else if (/\.(jpe?g|png|webp)$/.test(clean) || /cdninstagram|fbcdn/.test(value)) images.push(value);
        return;
      }
      if (depth > 3 || !value || typeof value !== 'object') return;
      if (!Array.isArray(value) && value.type === 'video' && isUrl(value.download_url)) videos.push(value.download_url);
      Object.values(value).forEach(next => walk(next, depth + 1));
    };
    walk(item, 0);
    const uniqueVideos = [...new Set(videos)];
    return { images: [...new Set(images)].filter(url => !uniqueVideos.includes(url)), videos: uniqueVideos };
  }

  function pickText(item) {
    if (!item || typeof item !== 'object') return '';
    for (const key of TEXT_KEYS) {
      const value = item[key];
      if (typeof value === 'string' && value.trim()) return value.trim();
      if (value && typeof value.text === 'string' && value.text.trim()) return value.text.trim();
    }
    return '';
  }

  function pickLink(item) {
    if (!item || typeof item !== 'object') return '';
    for (const key of LINK_KEYS) {
      const value = item[key];
      if (isUrl(value) && /instagram\.com/.test(value)) return value;
    }
    return '';
  }

  function mediaFrame(media, alt, label) {
    const image = media.images[0];
    const video = media.videos[0];
    const frame = h('div', { class: 'media-frame' });
    if (video) {
      const player = h('video', { src: video, poster: image || null, controls: '', preload: 'none', playsinline: '', 'aria-label': label });
      player.addEventListener('error', () => frame.replaceChildren(document.createTextNode('Video tidak dapat diputar. Gunakan tombol unduh.')));
      frame.append(player);
    } else if (image) {
      const img = h('img', { src: image, alt, loading: 'lazy', decoding: 'async', referrerpolicy: 'no-referrer' });
      img.addEventListener('error', () => frame.replaceChildren(document.createTextNode('Gambar tidak dapat dimuat')));
      frame.append(img);
    } else {
      frame.append(document.createTextNode('Media tidak tersedia'));
    }
    return frame;
  }

  function downloadLink(text, href) {
    return h('a', { class: 'btn btn-inline', href, target: '_blank', rel: 'noopener noreferrer', text });
  }

  function mediaSlide(item, label) {
    const media = pickMedia(item);
    const parts = Array.isArray(item.items) && item.items.length > 1 ? item.items : null;
    const caption = pickText(item);
    const alt = caption || item.accessibility_caption || label;
    const link = pickLink(item);
    const image = media.images[0];
    const video = media.videos[0];

    const visual = parts
      ? carousel(parts.map((part, index) => h('figure', { class: 'slide' }, mediaFrame(pickMedia(part), alt + ' ' + (index + 1), label))), label + ' dengan beberapa media')
      : mediaFrame(media, alt, label);

    const tags = [];
    if (parts) tags.push(tag(parts.length + ' item'));
    else if (item.type === 'video') tags.push(tag('Video'));
    else if (item.type === 'image') tags.push(tag('Foto'));
    const used = new Set();
    MEDIA_STATS.forEach(([key, word]) => {
      const value = item[key];
      if ((typeof value === 'number' || /^\d+$/.test(String(value || ''))) && !used.has(word)) {
        used.add(word);
        tags.push(tag(fmt(value) + ' ' + word));
      }
    });

    let downloads;
    if (parts) {
      const rows = parts.map((part, index) => {
        const found = pickMedia(part);
        const href = found.videos[0] || found.images[0];
        const kind = found.videos[0] ? 'Video' : 'Foto';
        return [kind + ' ' + (index + 1), href ? downloadLink('Unduh', href) : h('span', { class: 'li-meta', text: 'Tidak tersedia' })];
      });
      downloads = details('Unduh media', parts.length, listRows(rows));
    } else {
      downloads = h('div', { class: 'media-actions' },
        video ? downloadLink('Unduh video', video) : null,
        image ? downloadLink(video ? 'Unduh sampul' : 'Unduh foto', image) : null,
        link ? downloadLink('Buka', link) : null);
    }

    return h('article', { class: 'slide' }, h('div', { class: 'post-card' },
      visual,
      caption ? h('p', { class: 'post-caption', text: caption }) : null,
      tags.length ? h('div', { class: 'tags' }, tags) : null,
      downloads,
      parts && link ? h('div', { class: 'media-actions' }, downloadLink('Buka', link)) : null));
  }

  function mediaBlock(title, list, total, label) {
    if (!list.length) return null;
    const carouselEl = carousel(list.map(item => mediaSlide(item, label)), title, true);
    const toggle = h('button', { class: 'btn btn-inline', type: 'button', 'aria-pressed': 'false', text: 'Lihat semua' });
    toggle.addEventListener('click', () => {
      const grid = carouselEl.classList.toggle('is-grid');
      toggle.setAttribute('aria-pressed', String(grid));
      toggle.textContent = grid ? 'Geser' : 'Lihat semua';
    });
    const count = Number(total) > list.length ? fmt(list.length) + ' dari ' + fmt(total) : fmt(list.length) + ' item';
    const meta = h('span', { class: 'block-tools' }, h('span', { class: 'block-meta', text: count }), toggle);
    const note = Number(total) > list.length
      ? h('p', { class: 'block-meta note-gap', text: 'Server hanya mengirim ' + fmt(list.length) + ' ' + label.toLowerCase() + ' terbaru dari total ' + fmt(total) + '.' })
      : null;
    return h('div', { class: 'block-wrap' }, block(title, meta, carouselEl), note);
  }

  function renderInstagram(user) {
    const stats = user.stats || {};
    const posts = Array.isArray(user.recent_posts) ? user.recent_posts : [];
    const reels = Array.isArray(user.recent_reels) ? user.recent_reels : [];
    const picture = [user.profile_pic_url_hd, user.profile_pic_download].find(isUrl);
    const name = user.full_name || user.username || '-';
    const visual = picture
      ? h('img', { class: 'profile-visual', src: picture, alt: 'Foto profil ' + (user.username || ''), referrerpolicy: 'no-referrer' })
      : h('div', { class: 'profile-visual', 'aria-hidden': 'true', text: name.charAt(0).toUpperCase() });
    if (picture) visual.addEventListener('error', () => visual.replaceWith(h('div', { class: 'profile-visual', 'aria-hidden': 'true', text: name.charAt(0).toUpperCase() })));
    const bio = user.biography || user.bio || user.description || '';
    const postsTotal = user.posts_count !== undefined && user.posts_count !== null ? user.posts_count : stats.posts;

    return h('div', { class: 'result' },
      h('div', { class: 'profile' },
        visual,
        h('div', { class: 'profile-body' },
          h('div', { class: 'profile-name', text: name }),
          h('div', { class: 'profile-sub', text: '@' + (user.username || '-') }))),
      bio ? h('p', { class: 'desc', text: bio }) : null,
      isUrl(user.url) ? h('div', { class: 'actions-row' }, h('a', { class: 'btn btn-secondary', href: user.url, target: '_blank', rel: 'noopener noreferrer', text: 'Buka di Instagram' })) : null,
      h('div', { class: 'stats' },
        h('div', null, h('div', { class: 'stat-v', text: fmt(stats.posts) }), h('div', { class: 'stat-l', text: 'Postingan' })),
        h('div', null, h('div', { class: 'stat-v', text: fmt(stats.followers) }), h('div', { class: 'stat-l', text: 'Pengikut' })),
        h('div', null, h('div', { class: 'stat-v', text: fmt(stats.following) }), h('div', { class: 'stat-l', text: 'Mengikuti' }))),
      mediaBlock('Postingan', posts, user.posts_count, 'Postingan'),
      mediaBlock('Reels', reels, user.reels_count, 'Reel'),
      !posts.length && !reels.length
        ? h('div', { class: 'alert alert-note', role: 'status', text: 'Belum ada postingan atau reels yang bisa ditampilkan. Akun mungkin privat atau belum punya konten publik.' })
        : null,
      block('Informasi', null, pairs([
        ['Postingan di feed', fmt(postsTotal)],
        ['Reels', fmt(user.reels_count)]
      ])));
  }

  $('igForm').addEventListener('submit', async event => {
    event.preventDefault();
    const username = $('igUser').value.trim().replace(/^@/, '');
    fieldError($('igUser'), '');
    showError($('igMsg'), '');
    $('igOut').innerHTML = '';
    if (!/^[A-Za-z0-9._]{1,30}$/.test(username)) {
      fieldError($('igUser'), username ? 'Username hanya boleh huruf, angka, titik, atau garis bawah (maksimal 30).' : 'Username wajib diisi.');
      $('igUser').focus();
      return;
    }
    try {
      await busy($('btnIg'), 'Mencari', async () => {
        const json = await call('/stalk/instagram', { username });
        if (!json.data) throw new Error('Akun tidak ditemukan.');
        store.set(IG_STORE, username);
        $('igOut').replaceChildren(renderInstagram(json.data));
      });
    } catch (error) {
      showError($('igMsg'), error.message);
    }
  });

  initTabs(['ml', 'roblox', 'instagram'], 'ml');
})();
