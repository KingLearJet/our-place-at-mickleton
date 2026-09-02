(() => {
  const cfg = window.MICKLETON_CONFIG || {};
  const form = document.querySelector('#review-form');
  const reviewsEl = document.querySelector('#reviews');
  const emptyEl = document.querySelector('#empty-reviews');
  const summaryEl = document.querySelector('#rating-summary');
  const averageEl = document.querySelector('#average-rating');
  const starsEl = document.querySelector('#average-stars');
  const countEl = document.querySelector('#review-count');
  const statusEl = document.querySelector('#form-status');
  const menuButton = document.querySelector('.menu-button');
  const nav = document.querySelector('.main-nav');
  const key = 'mickleton-reviews-v1';

  menuButton?.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    menuButton.setAttribute('aria-expanded', String(open));
  });
  nav?.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
    nav.classList.remove('open');
    menuButton?.setAttribute('aria-expanded', 'false');
  }));
  const shareButton = document.querySelector('.share-button');
  shareButton?.addEventListener('click', async () => {
    const shareData = { title: 'Our Place at Mickleton', text: 'Our little family escape in Teesdale.', url: location.href.split('#')[0] };
    try {
      if (navigator.share) await navigator.share(shareData);
      else { await navigator.clipboard.writeText(shareData.url); shareButton.textContent = 'Link copied ✓'; setTimeout(() => shareButton.textContent = 'Share this place', 1800); }
    } catch (err) { if (err?.name !== 'AbortError') console.error(err); }
  });

  const lightbox = document.querySelector('#lightbox');
  const lightboxImg = lightbox.querySelector('img');
  document.querySelectorAll('.gallery-item').forEach(btn => btn.addEventListener('click', () => {
    lightboxImg.src = btn.dataset.full;
    lightboxImg.alt = btn.querySelector('img').alt;
    lightbox.showModal();
  }));
  lightbox.querySelector('.lightbox-close').addEventListener('click', () => lightbox.close());
  lightbox.addEventListener('click', e => { if (e.target === lightbox) lightbox.close(); });

  function escapeHTML(value='') {
    return value.replace(/[&<>'"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
  }
  function formatMonth(value) {
    if (!value) return '';
    const [y,m] = value.split('-').map(Number);
    return new Intl.DateTimeFormat('en-GB',{month:'long',year:'numeric'}).format(new Date(y,m-1,1));
  }
  function localReviews() {
    try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; }
  }
  function saveLocal(items) { localStorage.setItem(key, JSON.stringify(items)); }
  function usingSupabase() { return Boolean(cfg.supabaseUrl && cfg.supabaseAnonKey); }
  function apiHeaders(extra = {}) {
    const headers = { apikey: cfg.supabaseAnonKey, ...extra };
    if (String(cfg.supabaseAnonKey).startsWith('eyJ')) headers.Authorization = `Bearer ${cfg.supabaseAnonKey}`;
    return headers;
  }

  async function loadReviews() {
    if (!usingSupabase()) return localReviews();
    const endpoint = `${cfg.supabaseUrl}/rest/v1/${cfg.tableName || 'reviews'}?select=*&order=created_at.desc`;
    const res = await fetch(endpoint, { headers: apiHeaders() });
    if (!res.ok) throw new Error('Could not load reviews');
    return res.json();
  }

  async function addReview(review) {
    if (!usingSupabase()) {
      const items = localReviews();
      items.unshift({ ...review, id: crypto.randomUUID?.() || String(Date.now()), created_at: new Date().toISOString() });
      saveLocal(items);
      return;
    }
    const endpoint = `${cfg.supabaseUrl}/rest/v1/${cfg.tableName || 'reviews'}`;
    const res = await fetch(endpoint, {
      method:'POST',
      headers:apiHeaders({ 'Content-Type':'application/json', Prefer:'return=minimal' }),
      body:JSON.stringify(review)
    });
    if (!res.ok) throw new Error('Could not save review');
  }

  function render(items) {
    reviewsEl.innerHTML = '';
    emptyEl.hidden = items.length > 0;
    summaryEl.hidden = items.length === 0;
    if (!items.length) return;
    const avg = items.reduce((s,r) => s + Number(r.rating || 0), 0) / items.length;
    averageEl.textContent = avg.toFixed(1);
    starsEl.textContent = '★'.repeat(Math.round(avg)) + '☆'.repeat(5-Math.round(avg));
    countEl.textContent = `${items.length} ${items.length === 1 ? 'review' : 'reviews'}`;

    items.forEach(r => {
      const card = document.createElement('article');
      card.className = 'review-card';
      const stars = '★'.repeat(Number(r.rating)) + '☆'.repeat(5-Number(r.rating));
      card.innerHTML = `
        <div class="review-stars" aria-label="${Number(r.rating)} out of 5 stars">${stars}</div>
        <h3>${escapeHTML(r.title)}</h3>
        <p class="review-text">“${escapeHTML(r.review)}”</p>
        ${r.favourite ? `<p class="review-favourite"><strong>Favourite bit:</strong> ${escapeHTML(r.favourite)}</p>` : ''}
        <div class="review-meta"><span><strong>${escapeHTML(r.name)}</strong><small>${formatMonth(r.stay_date || r.stayDate)}</small></span><small>${escapeHTML(r.return_answer || r.return || '')}</small></div>`;
      reviewsEl.appendChild(card);
    });
  }

  async function refresh() {
    try { render(await loadReviews()); }
    catch (err) {
      statusEl.textContent = 'Reviews could not be loaded just now.';
      console.error(err);
    }
  }

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const fd = new FormData(form);
    const review = {
      name: String(fd.get('name') || '').trim(),
      stay_date: String(fd.get('stayDate') || ''),
      rating: Number(fd.get('rating')),
      title: String(fd.get('title') || '').trim(),
      review: String(fd.get('review') || '').trim(),
      favourite: String(fd.get('favourite') || '').trim(),
      return_answer: String(fd.get('return') || '')
    };
    const button = form.querySelector('button[type="submit"]');
    button.disabled = true; statusEl.textContent = 'Adding your review…';
    try {
      await addReview(review);
      form.reset();
      statusEl.textContent = 'Done — your review is now in the guest book. ★';
      await refresh();
      document.querySelector('#guestbook').scrollIntoView({behavior:'smooth'});
    } catch (err) {
      statusEl.textContent = 'That didn’t save. Please try again.';
      console.error(err);
    } finally { button.disabled = false; }
  });

  refresh();
})();
