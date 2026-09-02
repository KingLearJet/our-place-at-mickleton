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

  const commentStyles = document.createElement('style');
  commentStyles.textContent = `
    .review-comments{border-top:1px solid rgba(36,54,45,.14);margin-top:18px;padding-top:16px}
    .review-comments-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px}
    .review-comments-head strong{font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:#536158}
    .comment-list{display:grid;gap:9px;margin-bottom:12px}
    .comment-item{background:#f4f6f1;border-radius:10px;padding:9px 11px;font-size:12px;color:#56635d}
    .comment-item strong{display:block;color:#344b3f;margin-bottom:2px;font-size:12px}
    .comment-empty{font-size:12px;color:#7b867f;margin:0 0 12px}
    .comment-toggle{border:0;background:transparent;padding:0;color:#344b3f;font-weight:800;font-size:12px;cursor:pointer}
    .comment-form{display:none;grid-template-columns:1fr;gap:8px;margin-top:10px}
    .comment-form.open{display:grid}
    .comment-form input,.comment-form textarea{width:100%;border:1px solid #d5d9d1;background:white;border-radius:9px;padding:9px 10px;font-size:12px;outline:none}
    .comment-form textarea{resize:vertical;min-height:66px}
    .comment-form button{border:0;border-radius:9px;background:#344b3f;color:white;padding:9px 12px;font-weight:800;font-size:12px;cursor:pointer}
    .comment-status{font-size:11px;color:#68746d;min-height:16px;margin:0}
  `;
  document.head.appendChild(commentStyles);

  menuButton?.addEventListener('click',()=>{const open=nav.classList.toggle('open');menuButton.setAttribute('aria-expanded',String(open));});
  nav?.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{nav.classList.remove('open');menuButton?.setAttribute('aria-expanded','false');}));

  const lightbox=document.querySelector('#lightbox');
  if(lightbox){const img=lightbox.querySelector('img');document.querySelectorAll('.gallery-item').forEach(btn=>btn.addEventListener('click',()=>{img.src=btn.dataset.full;img.alt=btn.querySelector('img')?.alt||'';lightbox.showModal()}));lightbox.querySelector('.lightbox-close')?.addEventListener('click',()=>lightbox.close());lightbox.addEventListener('click',e=>{if(e.target===lightbox)lightbox.close()});}

  const escapeHTML=(value='')=>String(value??'').replace(/[&<>'"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
  function formatMonth(value){if(!value)return'';const [y,m]=String(value).split('-').map(Number);return new Intl.DateTimeFormat('en-GB',{month:'long',year:'numeric'}).format(new Date(y,m-1,1));}
  function configured(){return Boolean(cfg.supabaseUrl&&cfg.supabaseAnonKey);}
  function headers(extra={}){return {apikey:cfg.supabaseAnonKey,Authorization:`Bearer ${cfg.supabaseAnonKey}`,...extra};}
  function endpoint(table,query=''){return `${cfg.supabaseUrl}/rest/v1/${table}${query}`;}

  async function apiError(res){let detail='';try{const body=await res.json();detail=body.message||body.details||body.hint||''}catch{}return `${res.status}${detail?`: ${detail}`:''}`;}
  async function loadReviews(){
    if(!configured())throw new Error('Guest book is not connected to the shared database.');
    const res=await fetch(endpoint(cfg.tableName||'reviews','?select=*&order=created_at.desc'),{headers:headers(),cache:'no-store'});
    if(!res.ok)throw new Error(`Could not load reviews (${await apiError(res)})`);
    const reviews=await res.json();
    if(!reviews.length)return reviews;
    const ids=reviews.map(r=>r.id).filter(Boolean);
    const filter=encodeURIComponent(`(${ids.join(',')})`);
    const commentsRes=await fetch(endpoint('review_comments',`?select=*&review_id=in.${filter}&order=created_at.asc`),{headers:headers(),cache:'no-store'});
    if(!commentsRes.ok)throw new Error(`Could not load comments (${await apiError(commentsRes)})`);
    const comments=await commentsRes.json();
    const byReview=new Map();
    comments.forEach(c=>{if(!byReview.has(c.review_id))byReview.set(c.review_id,[]);byReview.get(c.review_id).push(c);});
    return reviews.map(r=>({...r,comments:byReview.get(r.id)||[]}));
  }
  async function addReview(review){if(!configured())throw new Error('Guest book is not connected to the shared database.');const res=await fetch(endpoint(cfg.tableName||'reviews'),{method:'POST',headers:headers({'Content-Type':'application/json','Prefer':'return=representation'}),body:JSON.stringify(review)});if(!res.ok)throw new Error(`Could not save review (${await apiError(res)})`);const saved=await res.json();if(!Array.isArray(saved)||!saved.length)throw new Error('Supabase did not confirm the saved review.');return saved[0];}
  async function addComment(reviewId,name,comment){const res=await fetch(endpoint('review_comments'),{method:'POST',headers:headers({'Content-Type':'application/json','Prefer':'return=representation'}),body:JSON.stringify({review_id:reviewId,name,comment})});if(!res.ok)throw new Error(`Could not save comment (${await apiError(res)})`);return res.json();}

  function render(items){
    reviewsEl.innerHTML='';emptyEl.hidden=items.length>0;summaryEl.hidden=items.length===0;if(!items.length)return;
    const avg=items.reduce((s,r)=>s+Number(r.rating||0),0)/items.length;averageEl.textContent=avg.toFixed(1);starsEl.textContent='★'.repeat(Math.round(avg))+'☆'.repeat(5-Math.round(avg));countEl.textContent=`${items.length} ${items.length===1?'review':'reviews'}`;
    items.forEach(r=>{
      const card=document.createElement('article');card.className='review-card';const stars='★'.repeat(Number(r.rating))+'☆'.repeat(5-Number(r.rating));
      const comments=Array.isArray(r.comments)?r.comments:[];
      const commentsHtml=comments.length?comments.map(c=>`<div class="comment-item"><strong>${escapeHTML(c.name)}</strong>${escapeHTML(c.comment)}</div>`).join(''):'<p class="comment-empty">No comments yet — be the first.</p>';
      card.innerHTML=`<div class="review-stars" aria-label="${Number(r.rating)} out of 5 stars">${stars}</div><h3>${escapeHTML(r.title)}</h3><p class="review-text">“${escapeHTML(r.review)}”</p>${r.favourite?`<p class="review-favourite"><strong>Favourite bit:</strong> ${escapeHTML(r.favourite)}</p>`:''}<div class="review-meta"><span><strong>${escapeHTML(r.name)}</strong><small>${formatMonth(r.stay_date)}</small></span><small>${r.return_answer?`<strong>Would you stay again?</strong><br>${escapeHTML(r.return_answer)}`:''}</small></div><div class="review-comments"><div class="review-comments-head"><strong>Comments (${comments.length})</strong><button class="comment-toggle" type="button">+ Add comment</button></div><div class="comment-list">${commentsHtml}</div><form class="comment-form" data-review-id="${escapeHTML(r.id)}"><input name="commentName" maxlength="60" required placeholder="Your name"><textarea name="commentText" maxlength="500" required placeholder="Write a comment…"></textarea><button type="submit">Post comment</button><p class="comment-status" role="status"></p></form></div>`;
      const toggle=card.querySelector('.comment-toggle');const commentForm=card.querySelector('.comment-form');
      toggle.addEventListener('click',()=>{const open=commentForm.classList.toggle('open');toggle.textContent=open?'Cancel':'+ Add comment';if(open)commentForm.querySelector('input')?.focus();});
      commentForm.addEventListener('submit',async e=>{e.preventDefault();const fd=new FormData(commentForm);const name=String(fd.get('commentName')||'').trim();const comment=String(fd.get('commentText')||'').trim();const cs=commentForm.querySelector('.comment-status');const button=commentForm.querySelector('button[type="submit"]');if(!name||!comment){cs.textContent='Please add your name and a comment.';return;}button.disabled=true;cs.textContent='Posting…';try{await addComment(r.id,name,comment);cs.textContent='Comment added ✓';await refresh();}catch(err){cs.textContent=`Not posted: ${err.message}`;console.error(err);}finally{button.disabled=false;}});
      reviewsEl.appendChild(card);
    });
  }

  async function refresh(){try{render(await loadReviews());}catch(err){statusEl.textContent=err.message;console.error(err);}}
  if(!form){console.error('Review form not found');return;}
  form.addEventListener('submit',async e=>{
    e.preventDefault();statusEl.textContent='';
    if(!form.checkValidity()){statusEl.textContent='Please complete all the required bits above, including stars and whether you’d come back.';form.reportValidity();return;}
    const fd=new FormData(form);const review={name:String(fd.get('name')||'').trim(),stay_date:String(fd.get('stayDate')||''),rating:Number(fd.get('rating')),title:String(fd.get('title')||'').trim(),review:String(fd.get('review')||'').trim(),favourite:String(fd.get('favourite')||'').trim(),return_answer:String(fd.get('return')||'')};
    const button=form.querySelector('button[type="submit"]');button.disabled=true;statusEl.textContent='Saving to the shared family guest book…';
    try{await addReview(review);form.reset();await refresh();statusEl.textContent='Saved ✓ This review is now shared across devices.';document.querySelector('#guestbook')?.scrollIntoView({behavior:'smooth'});}catch(err){statusEl.textContent=`Not saved: ${err.message}`;console.error(err);}finally{button.disabled=false;}
  });
  refresh();
})();
