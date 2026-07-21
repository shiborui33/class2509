/**
 * 2509班 论坛 — 认证版（含图片/视频上传）
 */
var A = window.AUTH;
var posts = [], useServer = false, pendingMediaUrl = null, pendingMediaType = null;

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

// ============================================
// 文件上传
// ============================================

async function uploadFile(file) {
  var ext = file.name.split('.').pop().toLowerCase();
  var type = ['mp4','webm','mov','avi'].includes(ext) ? 'video' : 'image';
  if (file.size > 10485760) throw new Error('文件不能超过10MB');
  var path = Date.now() + '_' + Math.random().toString(36).slice(2,6) + '.' + ext;
  var r = await fetch(SB_URL + '/storage/v1/object/forum-files/' + path, {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + A.token, 'apikey': SB_KEY, 'Content-Type': file.type },
    body: file
  });
  if (!r.ok) {
    var err = await r.json().catch(function(){return {};});
    throw new Error(err.message || '上传失败');
  }
  return { url: SB_URL + '/storage/v1/object/public/forum-files/' + path, type: type };
}

// 文件选择器
function initFilePicker() {
  var input = document.getElementById('postMedia');
  var preview = document.getElementById('mediaPreview');
  var clearBtn = document.getElementById('clearMedia');
  if (!input) return;
  input.addEventListener('change', function() {
    var f = this.files[0];
    if (!f) return;
    preview.textContent = '📎 ' + f.name + ' (' + (f.size/1024/1024).toFixed(1) + 'MB)';
    preview.style.display = 'inline';
    clearBtn.style.display = 'inline';
  });
  clearBtn.addEventListener('click', function() {
    input.value = ''; preview.style.display = 'none'; this.style.display = 'none';
    pendingMediaUrl = null; pendingMediaType = null;
  });
}

// ============================================
// 数据
// ============================================

async function loadPostsServer() {
  try {
    var r = await sf('/rest/v1/posts?select=*,replies(*)&order=created_at.desc');
    if (!r.ok) throw new Error(r.status);
    var data = await r.json();
    posts = data.map(function(p) {
      return {
        id: p.id, title: p.title, author: p.author, role: p.role,
        content: p.content, timestamp: p.created_at, author_id: p.author_id,
        media_url: p.media_url, media_type: p.media_type,
        replies: (p.replies || []).map(function(rp) {
          return { id: rp.id, author: rp.author, role: rp.role, content: rp.content, timestamp: rp.created_at };
        })
      };
    });
    return true;
  } catch (e) { console.warn('加载失败:', e.message); return false; }
}

async function savePostServer(author, role, title, content, mediaUrl, mediaType) {
  var body = { title: title, author: author, role: role, content: content };
  if (A.user) body.author_id = A.user.id;
  if (mediaUrl) { body.media_url = mediaUrl; body.media_type = mediaType; }
  var r = await sf('/rest/v1/posts', { method: 'POST', body: body });
  return r.ok;
}

async function saveReplyServer(postId, author, role, content) {
  var body = { post_id: postId, author: author, role: role, content: content };
  if (A.user) body.author_id = A.user.id;
  var r = await sf('/rest/v1/replies', { method: 'POST', body: body });
  return r.ok;
}

async function deletePostServer(postId) {
  var r = await sf('/rest/v1/posts?id=eq.' + postId, { method: 'DELETE' });
  return r.ok;
}

async function deleteReplyServer(replyId) {
  var r = await sf('/rest/v1/replies?id=eq.' + replyId, { method: 'DELETE' });
  return r.ok;
}

// ============================================
// localStorage
// ============================================

var STORAGE_KEY = 'class2509_forum_posts';
var SEED = [{ id:1, title:'欢迎来到2509班交流区！', author:'李智英老师', role:'teacher', content:'这里是班级线上交流空间，请先登录后发帖。', timestamp:'2026-07-15T14:30:00Z', replies:[] }];

function loadPostsLocal() {
  try { var s=localStorage.getItem(STORAGE_KEY); posts=s?JSON.parse(s):JSON.parse(JSON.stringify(SEED)); if(!s) savePostsLocal(); }
  catch(e) { posts=JSON.parse(JSON.stringify(SEED)); }
}
function savePostsLocal() { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(posts)); } catch(e) {} }

// ============================================
// 渲染
// ============================================

function renderPostList() {
  var c = document.getElementById('forumPosts'); c.innerHTML = '';
  if (A.ready && !A.user && useServer) {
    var b = document.createElement('div');
    b.style.cssText = 'text-align:center;padding:1rem;margin-bottom:1rem;background:var(--accent-soft);border-radius:var(--radius-md);font-size:0.9rem;color:var(--accent)';
    b.innerHTML = '🔐 <a href="#" onclick="document.getElementById(\'navLoginBtn\').click();return false" style="color:var(--accent);font-weight:600">登录</a> 后即可发帖回帖';
    c.appendChild(b);
  }
  if (posts.length === 0) {
    c.innerHTML += '<div style="text-align:center;padding:3rem;color:var(--text-muted)"><p style="font-family:var(--font-display);font-size:1.2rem;margin-bottom:0.5rem">还没有帖子</p><p>快来发布第一条帖子吧！</p></div>';
    return;
  }
  posts.forEach(function(p, i) {
    var card = document.createElement('div');
    card.className = 'post-card reveal';
    card.style.transitionDelay = (i*0.05)+'s';
    var mediaHtml = p.media_url ? '<div style="margin-top:0.5rem">'+(p.media_type==='video'?'<video src="'+p.media_url+'" controls style="max-width:100%;max-height:200px;border-radius:8px"></video>':'<img src="'+p.media_url+'" style="max-width:100%;max-height:200px;border-radius:8px;object-fit:cover" />')+'</div>' : '';
    card.innerHTML =
      '<div class="post-card-header"><div class="post-author-avatar">'+p.author.charAt(0)+'</div><div class="post-card-meta"><div class="post-card-author">'+esc(p.author)+' <span class="post-card-role '+p.role+'">'+(p.role==='teacher'?'老师':p.role==='admin'?'管理员':'同学')+'</span></div><span class="post-card-date">'+fmt(p.timestamp)+'</span></div></div>'+
      '<h3 class="post-card-title">'+esc(p.title)+'</h3><p class="post-card-preview">'+esc(p.content)+'</p>'+mediaHtml+
      '<div class="post-card-footer"><span class="post-card-reply-count"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg> '+p.replies.length+' 条回复</span>'+(A.isAdmin?'<span style="color:#e53e3e;cursor:pointer;font-size:0.75rem" class="del-post-btn" data-id="'+p.id+'">删除</span>':'')+'</div>';
    card.addEventListener('click', function(e) {
      if (e.target.classList.contains('del-post-btn')) { e.stopPropagation(); delPost(p.id); return; }
      showDetail(p);
    });
    c.appendChild(card);
  });
  requestAnimationFrame(function() {
    document.querySelectorAll('#forumPosts .reveal').forEach(function(el,i) { setTimeout(function(){el.classList.add('visible');},i*80); });
  });
}

// ============================================
// 帖子详情
// ============================================

function showDetail(p) {
  var m = document.getElementById('postModal');
  var ct = document.getElementById('modalContent');
  var mediaHtml = p.media_url ? '<div style="margin-top:1rem">'+(p.media_type==='video'?'<video src="'+p.media_url+'" controls style="max-width:100%;max-height:400px;border-radius:12px"></video>':'<img src="'+p.media_url+'" style="max-width:100%;max-height:400px;border-radius:12px;object-fit:contain" />')+'</div>' : '';
  ct.innerHTML =
    '<h2 class="modal-post-title">'+esc(p.title)+'</h2>'+
    '<div class="modal-post-meta"><div class="post-author-avatar">'+p.author.charAt(0)+'</div><div><span class="post-card-author">'+esc(p.author)+' <span class="post-card-role '+p.role+'">'+(p.role==='teacher'?'老师':'同学')+'</span></span><div class="post-card-date">'+fmt(p.timestamp)+'</div></div></div>'+
    '<div class="modal-post-body">'+esc(p.content)+'</div>'+mediaHtml+
    '<h3 class="modal-replies-title">回复 ('+p.replies.length+')</h3>'+
    '<div class="modal-replies">'+(p.replies.length===0?'<p style="color:var(--text-muted);font-size:0.9rem">暂无回复</p>':p.replies.map(function(r){return '<div class="reply-item"><div class="reply-header"><strong class="reply-author">'+esc(r.author)+'</strong> <span class="post-card-role '+r.role+'">'+(r.role==='teacher'?'老师':'同学')+'</span> <span class="reply-date">'+fmt(r.timestamp)+'</span>'+(A.isAdmin?' <span class="del-reply-btn" data-rid="'+r.id+'" data-pid="'+p.id+'" style="color:#e53e3e;cursor:pointer;font-size:0.75rem;margin-left:auto">删除</span>':'')+'</div><div class="reply-content">'+esc(r.content)+'</div></div>';}).join(''))+'</div>'+
    (A.user?'<div class="modal-reply-form"><h4>写回复</h4><textarea id="replyContent" class="composer-textarea" rows="3" placeholder="写下你的回复..."></textarea><button onclick="doReply('+p.id+')" class="btn btn-primary" style="margin-top:0.5rem">提交回复</button></div>':'')+
    (A.isAdmin?'<div style="margin-top:1rem;text-align:right"><button onclick="delPost('+p.id+')" style="background:none;border:1px solid #e53e3e;color:#e53e3e;padding:0.4rem 1rem;border-radius:100px;cursor:pointer;font-size:0.85rem">删除此帖</button></div>':'');
  m.style.display = 'flex';
  setTimeout(function() {
    document.querySelectorAll('.del-reply-btn').forEach(function(btn) {
      btn.addEventListener('click', function(e) { e.stopPropagation(); delReply(parseInt(this.dataset.rid), parseInt(this.dataset.pid)); });
    });
  }, 100);
}

async function delPost(id) {
  if (!confirm('确认删除？')) return;
  if (useServer) { var ok = await deletePostServer(id); if (ok) { await loadPostsServer(); renderPostList(); document.getElementById('postModal').style.display = 'none'; } }
}
async function delReply(rid, pid) {
  if (!confirm('确认删除？')) return;
  if (useServer) { var ok = await deleteReplyServer(rid); if (ok) { await loadPostsServer(); renderPostList(); var p=posts.find(function(x){return x.id===pid;}); if(p) showDetail(p); } }
}

async function doReply(postId) {
  if (!A.user) { alert('请先登录'); return; }
  var c = document.getElementById('replyContent').value.trim();
  if (!c) { alert('请填写回复'); return; }
  if (useServer) {
    var ok = await saveReplyServer(postId, A.user.display_name, A.user.role||'student', c);
    if (ok) { await loadPostsServer(); renderPostList(); }
    else alert('回复失败');
  }
  document.getElementById('postModal').style.display = 'none';
  var updated = posts.find(function(x){return x.id===postId;});
  if (updated) showDetail(updated);
}
window.doReply = doReply;

// ============================================
// 发帖
// ============================================

window.addEventListener('DOMContentLoaded', function() {
  var btn = document.getElementById('submitPost');
  if (!btn) { console.error('submitPost按钮未找到'); return; }
  console.log('✅ 发帖按钮已绑定');

  btn.addEventListener('click', async function() {
    console.log('🖱️ 发帖按钮被点击');
    if (!A.user) { alert('请先登录后再发帖'); console.log('❌ 未登录'); return; }
  var btn = this;
  var title = document.getElementById('postTitle').value.trim();
  var content = document.getElementById('postContent').value.trim();
  if (!title || !content) { alert('请填写标题和内容'); return; }

  document.getElementById('postAuthor').value = A.user.display_name;
  document.getElementById('postRole').value = A.user.role || 'student';
  var author = A.user.display_name;
  var role = A.user.role || 'student';

  btn.textContent = '发布中...'; btn.disabled = true;
  pendingMediaUrl = null; pendingMediaType = null;

  // 上传文件
  var fileInput = document.getElementById('postMedia');
  if (fileInput && fileInput.files[0]) {
    try {
      var up = await uploadFile(fileInput.files[0]);
      pendingMediaUrl = up.url; pendingMediaType = up.type;
    } catch(e) { alert('文件上传失败: '+e.message); btn.textContent='发布帖子'; btn.disabled=false; return; }
  }

  if (useServer) {
    var ok = await savePostServer(author, role, title, content, pendingMediaUrl, pendingMediaType);
    if (ok) { await loadPostsServer(); renderPostList(); }
    else alert('发布失败');
  }

  document.getElementById('postTitle').value = '';
  document.getElementById('postContent').value = '';
  fileInput.value = '';
  document.getElementById('mediaPreview').style.display = 'none';
  document.getElementById('clearMedia').style.display = 'none';
  btn.textContent = '发布帖子'; btn.disabled = false;
  document.getElementById('forumPosts').scrollIntoView({ behavior: 'smooth' });
  });
});

// ============================================
// Modal close
// ============================================

document.getElementById('closeModal').addEventListener('click', function() { document.getElementById('postModal').style.display='none'; });
document.getElementById('postModal').addEventListener('click', function(e) { if(e.target===this) this.style.display='none'; });
document.addEventListener('keydown', function(e) { if(e.key==='Escape') document.getElementById('postModal').style.display='none'; });

// ============================================
// Auth hooks
// ============================================

window.onAuthReady = function() { init(); };
window.onAuthChanged = function() { if(useServer){loadPostsServer().then(renderPostList);} };

// ============================================
// Utils
// ============================================

function fmt(t) {
  if(!t) return ''; var d=new Date(t),n=new Date(),diff=n-d;
  var m=Math.floor(diff/60000),h=Math.floor(diff/3600000),day=Math.floor(diff/86400000);
  if(m<1) return '刚刚'; if(m<60) return m+' 分钟前'; if(h<24) return h+' 小时前'; if(day<7) return day+' 天前';
  return d.getFullYear()+'-'+p2(d.getMonth()+1)+'-'+p2(d.getDate());
}
function p2(v) { return v<10?'0'+v:''+v; }
function esc(s) { var d=document.createElement('div'); d.textContent=s; return d.innerHTML; }

// ============================================
// Init
// ============================================

async function init() {
  if (!A.ready) return;
  useServer = await loadPostsServer();
  if (!useServer) loadPostsLocal();
  renderPostList();
  initFilePicker();
}
if (A.ready) init();
