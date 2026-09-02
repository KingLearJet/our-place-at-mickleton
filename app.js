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

  menuButton?.addEventListener('click',()=>{const open=nav.classList.toggle('open');menuButton.setAttribute('aria-expanded',String(open));});
  nav?.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{nav.classList.remove('open');menuButton?.setAttribute('aria-expanded','false');}));
  const shareButton=document.querySelector('.share-button');
  shareButton?.addEventListener('click',async()=>{const d={title:'Our Place at Mickleton',text:'Our little family escape in Teesdale.',url:location.href.split('#')[0]};try{if(navigator.share)await navigator.share(d);else{await navigator.clipboard.writeText(d.url);shareButton.textContent='Link copied ✓';setTimeout(()=>shareButton.textContent='Share this place',1800)}}catch(err){if(err?.name!=='AbortError')console.error(err)}});

  const lightbox=document.querySelector('#lightbox');
  if(lightbox){const img=lightbox.querySelector('img');document.querySelectorAll('.gallery-item').forEach(btn=>btn.addEventListener('click',()=>{img.src=btn.dataset.full;img.alt=btn.querySelector('img')?.alt||'';lightbox.showModal()}));lightbox.querySelector('.lightbox-close')?.addEventListener('click',()=>lightbox.close());lightbox.addEventListener('click',e=>{if(e.target===lightbox)lightbox.close()});}

  const escapeHTML=(value='')=>String(value??'').replace(/[&<>'"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
  function formatMonth(value){if(!value)return'';const [y,m]=String(value).split('-').map(Number);return new Intl.DateTimeFormat('en-GB',{month:'long',year:'numeric'}).format(new Date(y,m-1,1));}
  function configured(){return Boolean(cfg.supabaseUrl&&cfg.supabaseAnonKey);}
  function headers(extra={}){return {apikey:cfg.supabaseAnonKey,Authorization:`Bearer ${cfg.supabaseAnonKey}`,...extra};}
  function endpoint(query=''){return `${cfg.supabaseUrl}/rest/v1/${cfg.tableName||'reviews'}${query}`;}

  async function apiError(res){let detail='';try{const body=await res.json();detail=body.message||body.details||body.hint||''}catch{}return `${res.status}${detail?`: ${detail}`:''}`;}
  async function loadReviews(){if(!configured())throw new Error('Guest book is not connected to the shared database.');const res=await fetch(endpoint('?select=*&order=created_at.desc'),{headers:headers(),cache:'no-store'});if(!res.ok)throw new Error(`Could not load reviews (${await apiError(res)})`);return res.json();}
  async function addReview(review){if(!configured())throw new Error('Guest book is not connected to the shared database.');const res=await fetch(endpoint(),{method:'POST',headers:headers({'Content-Type':'application/json','Prefer':'return=representation'}),body:JSON.stringify(review)});if(!res.ok)throw new Error(`Could not save review (${await apiError(res)})`);const saved=await res.json();if(!Array.isArray(saved)||!saved.length)throw new Error('Supabase did not confirm the saved review.');return saved[0];}

  function render(items){reviewsEl.innerHTML='';emptyEl.hidden=items.length>0;summaryEl.hidden=items.length===0;if(!items.length)return;const avg=items.reduce((s,r)=>s+Number(r.rating||0),0)/items.length;averageEl.textContent=avg.toFixed(1);starsEl.textContent='★'.repeat(Math.round(avg))+'☆'.repeat(5-Math.round(avg));countEl.textContent=`${items.length} ${items.length===1?'review':'reviews'}`;items.forEach(r=>{const card=document.createElement('article');card.className='review-card';const stars='★'.repeat(Number(r.rating))+'☆'.repeat(5-Number(r.rating));card.innerHTML=`<div class="review-stars" aria-label="${Number(r.rating)} out of 5 stars">${stars}</div><h3>${escapeHTML(r.title)}</h3><p class="review-text">“${escapeHTML(r.review)}”</p>${r.favourite?`<p class="review-favourite"><strong>Favourite bit:</strong> ${escapeHTML(r.favourite)}</p>`:''}<div class="review-meta"><span><strong>${escapeHTML(r.name)}</strong><small>${formatMonth(r.stay_date)}</small></span><small>${escapeHTML(r.return_answer||'')}</small></div>`;reviewsEl.appendChild(card)});}

  async function refresh(){try{render(await loadReviews());}catch(err){statusEl.textContent=err.message;console.error(err);}}
  if(!form){console.error('Review form not found');return;}
  form.addEventListener('submit',async e=>{
    e.preventDefault();
    statusEl.textContent='';
    if(!form.checkValidity()){statusEl.textContent='Please complete all the required bits above, including stars and whether you’d come back.';form.reportValidity();return;}
    const fd=new FormData(form);
    const review={name:String(fd.get('name')||'').trim(),stay_date:String(fd.get('stayDate')||''),rating:Number(fd.get('rating')),title:String(fd.get('title')||'').trim(),review:String(fd.get('review')||'').trim(),favourite:String(fd.get('favourite')||'').trim(),return_answer:String(fd.get('return')||'')};
    const button=form.querySelector('button[type="submit"]');button.disabled=true;statusEl.textContent='Saving to the shared family guest book…';
    try{await addReview(review);form.reset();const items=await loadReviews();render(items);statusEl.textContent='Saved ✓ This review is now shared across devices.';document.querySelector('#guestbook')?.scrollIntoView({behavior:'smooth'});}
    catch(err){statusEl.textContent=`Not saved: ${err.message}`;console.error(err);}
    finally{button.disabled=false;}
  });
  refresh();
})();
