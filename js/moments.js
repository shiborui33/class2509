/**
 * 2509班 同学点滴 — 照片网格+评论+点赞
 */
var A = window.AUTH;
var moments = [], useServer = false;

function sf(path, options) {
  if (!options) options = {};
  if (!options.headers) options.headers = {};
  options.headers['apikey'] = SB_KEY;
  if (A.token) options.headers['Authorization'] = 'Bearer ' + A.token;
  if (options.body && typeof options.body === 'object') {
    options.headers['Content-Type'] = 'application/json';
    options.headers['Prefer'] = 'return=representation';
    options.body = JSON.stringify(options.body);
  }
  return fetch(SB_URL + path, options);
}

async function uploadImage(file) {
  if (file.size > 10485760) throw new Error('图片不能超过10MB');
  var p = 'moments/' + Date.now() + '_' + Math.random().toString(36).slice(2,6) + '.' + file.name.split('.').pop();
  var r = await fetch(SB_URL + '/storage/v1/object/forum-files/' + p, {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + A.token, 'apikey': SB_KEY, 'Content-Type': file.type },
    body: file
  });
  if (!r.ok) throw new Error('上传失败');
  return SB_URL + '/storage/v1/object/public/forum-files/' + p;
}

function zoomImage(url) {
  var o = document.createElement('div');
  o.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.92);z-index:9999;display:flex;align-items:center;justify-content:center;cursor:pointer';
  o.innerHTML = '<img src="'+url+'" style="max-width:95vw;max-height:95vh;object-fit:contain;border-radius:4px" />';
  o.addEventListener('click', function() { o.remove(); });
  document.addEventListener('keydown', function esc(e) { if(e.key==='Escape'){o.remove();document.removeEventListener('keydown',esc);} });
  document.body.appendChild(o);
}

function initFilePicker() {
  var i = document.getElementById('momentImage');
  var p = document.getElementById('momentPreview');
  var c = document.getElementById('clearMomentImage');
  if (!i) return;
  i.addEventListener('change', function() {
    var n = this.files.length; if (n===0) return;
    p.textContent = n===1 ? '📷 '+this.files[0].name : '📷 已选择 '+n+' 张照片';
    p.style.display='inline'; c.style.display='inline';
  });
  c.addEventListener('click', function() { i.value=''; p.style.display='none'; this.style.display='none'; });
}

async function loadMoments() {
  try {
    var r = await sf('/rest/v1/moments?select=*,moment_comments(*),moment_likes(*)&order=created_at.desc&limit=50');
    if (!r.ok) throw new Error(r.status);
    moments = await r.json();
    return true;
  } catch (e) { console.warn(e.message); return false; }
}

async function saveMoment(content, imageUrl) {
  var b = { content: content, author: A.user.display_name };
  if (A.user) b.author_id = A.user.id;
  if (imageUrl) b.image_url = imageUrl;
  var r = await sf('/rest/v1/moments', { method: 'POST', body: b });
  return r.ok;
}

async function saveComment(mid, content) {
  var r = await sf('/rest/v1/moment_comments', { method: 'POST',
    body: { moment_id: mid, author: A.user.display_name, author_id: A.user.id, content: content } });
  return r.ok;
}

async function deleteMoment(id) { var r = await sf('/rest/v1/moments?id=eq.'+id, { method:'DELETE' }); return r.ok; }
async function deleteComment(id) { var r = await sf('/rest/v1/moment_comments?id=eq.'+id, { method:'DELETE' }); return r.ok; }

async function toggleLike(mid) {
  var m = moments.find(function(x){return x.id===mid;});
  if (!m) return false;
  var ls = m.moment_likes||[];
  var my = ls.find(function(l){return l.user_id===A.user.id;});
  if (my) { var r = await sf('/rest/v1/moment_likes?id=eq.'+my.id, { method:'DELETE' }); return r.ok; }
  else { var r = await sf('/rest/v1/moment_likes', { method:'POST', body:{moment_id:mid,user_id:A.user.id} }); return r.ok; }
}

function renderTimeline() {
  var c = document.getElementById('momentsTimeline'); c.innerHTML = '';
  if (moments.length === 0) {
    c.style.display='block';
    c.innerHTML = '<div style="text-align:center;padding:4rem 1rem;color:var(--text-muted)"><p style="font-size:3rem;margin-bottom:1rem">📸</p><p style="font-size:1.1rem">还没有点滴，等待管理员上传照片</p></div>';
    return;
  }
  c.style.display='';

  moments.forEach(function(m, i) {
    var cmts = m.moment_comments||[], likes=m.moment_likes||[];
    var lk = likes.length, liked = A.user && likes.some(function(l){return l.user_id===A.user.id;});

    var card = document.createElement('div');
    card.className = 'moment-card';
    card.style.opacity='0'; card.style.transform='translateY(20px)';
    card.style.transition='opacity 0.5s ease-out,transform 0.5s ease-out';
    card.style.transitionDelay=(i*0.06)+'s';

    var thumb = m.image_url ? m.image_url.replace('/storage/v1/object/public/', '/storage/v1/render/image/public/')+'?width=600&quality=75' : '';
    var full = m.image_url||'';
    var img = full ? '<img src="'+thumb+'" class="moment-image" loading="lazy" onclick="zoomImage(\''+full+'\')" />' : '';

    card.innerHTML =
      img +
      '<div class="moment-body">'+
        (m.content ? '<p class="moment-text">'+esc(m.content)+'</p>' : '')+
        '<div class="moment-footer">'+
          '<span>'+fmt(m.created_at)+'</span>'+
          '<span style="display:flex;align-items:center;gap:0.8rem">'+
            '<span class="moment-like-btn" onclick="doLike('+m.id+')" style="cursor:pointer;font-size:0.85rem;'+(liked?'color:#e53e3e;font-weight:600':'color:var(--text-muted)')+'">'+(liked?'❤️':'🤍')+' '+lk+'</span>'+
            '<span class="moment-comment-btn" onclick="showCommentInput('+m.id+')" style="cursor:pointer;color:var(--accent);font-size:0.8rem">💬 '+cmts.length+'</span>'+
            (A.isAdmin ? '<span class="moment-delete" style="opacity:1" onclick="delMoment('+m.id+')">删除</span>' : '')+
          '</span>'+
        '</div>'+
        (cmts.length>0 ? '<div class="moment-comments-list" id="comments-'+m.id+'">'+cmts.slice(0,2).map(function(x){return '<div class="moment-comment"><strong>'+esc(x.author)+'</strong> '+esc(x.content)+(A.isAdmin?' <span class="moment-delete" style="opacity:1" onclick="delComment('+x.id+','+m.id+')">×</span>':'')+'</div>';}).join('')+(cmts.length>2?'<div class="moment-comment" style="color:var(--text-muted);cursor:pointer" onclick="showAllComments('+m.id+')">查看全部 '+cmts.length+' 条评论</div>':'')+'</div>' : '')+
      '</div>';

    c.appendChild(card);
    setTimeout(function() { card.style.opacity='1'; card.style.transform='none'; }, i*60+50);
  });
}

async function doLike(mid) {
  if (!A.user) { alert('请先登录'); return; }
  if (useServer) { await toggleLike(mid); await loadMoments(); renderTimeline(); }
}
window.doLike = doLike;

function showCommentInput(mid) {
  if (document.getElementById('comment-input-'+mid)) return;
  var el = document.getElementById('comments-'+mid);
  var parent = el ? el.parentElement : document.querySelector('.moment-card .moment-body');
  var div = document.createElement('div');
  div.id = 'comment-input-'+mid;
  div.style.cssText = 'margin-top:0.5rem;display:flex;gap:0.3rem';
  div.innerHTML = '<input type="text" id="comment-text-'+mid+'" class="composer-input" style="flex:1;font-size:0.85rem" placeholder="写评论..."><button onclick="submitComment('+mid+')" class="btn btn-primary" style="font-size:0.8rem;padding:0.4rem 0.8rem">发送</button>';
  if (el) el.parentElement.insertBefore(div, el.nextSibling);
  else if (parent) parent.appendChild(div);
  document.getElementById('comment-text-'+mid).focus();
}
window.showCommentInput = showCommentInput;

async function submitComment(mid) {
  if (!A.user) { alert('请先登录'); return; }
  var c = document.getElementById('comment-text-'+mid).value.trim();
  if (!c) return;
  if (useServer) { await saveComment(mid, c); await loadMoments(); renderTimeline(); }
}
window.submitComment = submitComment;

function showAllComments(mid) {
  var m = moments.find(function(x){return x.id===mid;});
  if (!m) return;
  var el = document.getElementById('comments-'+mid);
  if (!el) return;
  el.innerHTML = (m.moment_comments||[]).map(function(x){
    return '<div class="moment-comment"><strong>'+esc(x.author)+'</strong> '+esc(x.content)+(A.isAdmin?' <span class="moment-delete" style="opacity:1" onclick="delComment('+x.id+','+mid+')">×</span>':'')+'</div>';
  }).join('');
}
window.showAllComments = showAllComments;

async function delMoment(id) { if(!confirm('确认删除？'))return; if(useServer){await deleteMoment(id);await loadMoments();renderTimeline();} }
async function delComment(cid,mid) { if(!confirm('删除评论？'))return; if(useServer){await deleteComment(cid);await loadMoments();renderTimeline();} }
window.delMoment = delMoment; window.delComment = delComment;

document.getElementById('submitMoment').addEventListener('click', async function() {
  if (!A.user||!A.isAdmin) { alert('仅管理员可上传'); return; }
  var ct = document.getElementById('momentContent').value.trim();
  var fi = document.getElementById('momentImage');
  if (!fi||fi.files.length===0) { alert('请选择照片'); return; }
  var btn=this, files=Array.from(fi.files);
  btn.textContent='上传中 0/'+files.length; btn.disabled=true;
  for(var i=0;i<files.length;i++) {
    btn.textContent='上传中 '+(i+1)+'/'+files.length;
    try { var url=await uploadImage(files[i]); if(useServer)await saveMoment(i===files.length-1?ct:'',url); }
    catch(e){alert('第'+(i+1)+'张失败:'+e.message);btn.textContent='发布';btn.disabled=false;return;}
  }
  if(useServer){await loadMoments();renderTimeline();}
  document.getElementById('momentContent').value=''; fi.value='';
  document.getElementById('momentPreview').style.display='none';
  document.getElementById('clearMomentImage').style.display='none';
  btn.textContent='发布'; btn.disabled=false;
});

function fmt(t) {
  if(!t) return ''; var d=new Date(t),n=new Date(),diff=n-d;
  var m=Math.floor(diff/60000),h=Math.floor(diff/3600000),day=Math.floor(diff/86400000);
  if(m<1)return'刚刚';if(m<60)return m+'分钟前';if(h<24)return h+'小时前';if(day<7)return day+'天前';
  return d.getFullYear()+'-'+p2(d.getMonth()+1)+'-'+p2(d.getDate());
}
function p2(v){return v<10?'0'+v:''+v;}
function esc(s){var d=document.createElement('div');d.textContent=s;return d.innerHTML;}

async function init() {
  if(!A.ready)return;
  useServer = await loadMoments();
  var cp=document.getElementById('momentsComposer');
  if(cp&&A.isAdmin)cp.style.display='';
  renderTimeline(); initFilePicker();
}
window.onAuthReady=function(){init();};
window.onAuthChanged=function(){
  var cp=document.getElementById('momentsComposer');
  if(cp&&A.isAdmin)cp.style.display=''; else if(cp)cp.style.display='none';
  init();
};
if(A.ready)init();
