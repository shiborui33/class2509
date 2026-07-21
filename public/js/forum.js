/**
 * 2509班 论坛 — 认证版
 * 登录后发帖回帖，管理员可删帖
 */

var posts = [];
var useServer = false;

// ============================================
// API（使用 auth token）
// ============================================

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
// 数据加载
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
        replies: (p.replies || []).map(function(rp) {
          return { id: rp.id, author: rp.author, role: rp.role, content: rp.content, timestamp: rp.created_at, author_id: rp.author_id };
        })
      };
    });
    return true;
  } catch (e) {
    console.warn('加载帖子失败:', e.message);
    return false;
  }
}

async function savePostServer(author, role, title, content) {
  var body = { title: title, author: author, role: role, content: content };
  if (A.user) body.author_id = A.user.id;
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
// localStorage 降级
// ============================================

var STORAGE_KEY = 'class2509_forum_posts';
var SEED_POSTS = [
  { id: 1, title: '欢迎来到2509班交流区！', author: '李智英老师', role: 'teacher', content: '同学们好！这是我们班的线上交流空间，请大家登录后发帖讨论。', timestamp: '2026-07-15T14:30:00Z', replies: [{ id: 1, author: '李明', role: 'student', content: '收到！', timestamp: '2026-07-15T15:10:00Z' }] }
];

function loadPostsLocal() {
  try {
    var s = localStorage.getItem(STORAGE_KEY);
    posts = s ? JSON.parse(s) : JSON.parse(JSON.stringify(SEED_POSTS));
    if (!s) savePostsLocal();
  } catch (e) { posts = JSON.parse(JSON.stringify(SEED_POSTS)); }
}

function savePostsLocal() { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(posts)); } catch (e) {} }

// ============================================
// 渲染
// ============================================

function renderPostList() {
  var c = document.getElementById('forumPosts');
  c.innerHTML = '';

  // 未登录提示
  if (A.ready && !A.user && useServer) {
    var banner = document.createElement('div');
    banner.style.cssText = 'text-align:center;padding:1rem;margin-bottom:1rem;background:var(--accent-soft);border-radius:var(--radius-md);font-size:0.9rem;color:var(--accent)';
    banner.innerHTML = '🔐 <a href="#" onclick="document.getElementById(\'navLoginBtn\').click();return false" style="color:var(--accent);font-weight:600">登录</a> 后即可发帖回帖';
    c.appendChild(banner);
  }

  if (posts.length === 0) {
    c.innerHTML += '<div style="text-align:center;padding:3rem;color:var(--text-muted)"><p style="font-family:var(--font-display);font-size:1.2rem;margin-bottom:0.5rem">还没有帖子</p><p>快来发布第一条帖子吧！</p></div>';
    return;
  }

  posts.forEach(function(p, i) {
    var card = document.createElement('div');
    card.className = 'post-card reveal';
    card.style.transitionDelay = (i * 0.05) + 's';
    card.innerHTML =
      '<div class="post-card-header">' +
        '<div class="post-author-avatar">' + p.author.charAt(0) + '</div>' +
        '<div class="post-card-meta">' +
          '<div class="post-card-author">' + esc(p.author) + ' <span class="post-card-role ' + p.role + '">' + (p.role === 'teacher' ? '老师' : p.role === 'admin' ? '管理员' : '同学') + '</span></div>' +
          '<span class="post-card-date">' + fmt(p.timestamp) + '</span>' +
        '</div>' +
      '</div>' +
      '<h3 class="post-card-title">' + esc(p.title) + '</h3>' +
      '<p class="post-card-preview">' + esc(p.content) + '</p>' +
      '<div class="post-card-footer">' +
        '<span class="post-card-reply-count"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg> ' + p.replies.length + ' 条回复</span>' +
        (A.isAdmin ? '<span style="color:#e53e3e;cursor:pointer;font-size:0.75rem" class="del-post-btn" data-id="' + p.id + '">删除</span>' : '') +
      '</div>';
    card.addEventListener('click', function(e) {
      if (e.target.classList.contains('del-post-btn')) {
        e.stopPropagation();
        delPost(p.id);
        return;
      }
      showDetail(p);
    });
    c.appendChild(card);
  });

  requestAnimationFrame(function() {
    document.querySelectorAll('#forumPosts .reveal').forEach(function(el, i) {
      setTimeout(function() { el.classList.add('visible'); }, i * 80);
    });
  });
}

// ============================================
// 帖子详情弹窗
// ============================================

function showDetail(p) {
  var m = document.getElementById('postModal');
  var ct = document.getElementById('modalContent');
  ct.innerHTML =
    '<h2 class="modal-post-title">' + esc(p.title) + '</h2>' +
    '<div class="modal-post-meta">' +
      '<div class="post-author-avatar">' + p.author.charAt(0) + '</div>' +
      '<div><span class="post-card-author">' + esc(p.author) + ' <span class="post-card-role ' + p.role + '">' + (p.role === 'teacher' ? '老师' : '同学') + '</span></span>' +
      '<div class="post-card-date">' + fmt(p.timestamp) + '</div></div>' +
    '</div>' +
    '<div class="modal-post-body">' + esc(p.content) + '</div>' +
    '<h3 class="modal-replies-title">回复 (' + p.replies.length + ')</h3>' +
    '<div class="modal-replies">' + (p.replies.length === 0 ? '<p style="color:var(--text-muted);font-size:0.9rem">暂无回复，来抢沙发吧！</p>' :
      p.replies.map(function(r) {
        return '<div class="reply-item">' +
          '<div class="reply-header"><strong class="reply-author">' + esc(r.author) + '</strong> <span class="post-card-role ' + r.role + '">' + (r.role === 'teacher' ? '老师' : '同学') + '</span> <span class="reply-date">' + fmt(r.timestamp) + '</span>' +
          (A.isAdmin ? ' <span class="del-reply-btn" data-rid="' + r.id + '" data-pid="' + p.id + '" style="color:#e53e3e;cursor:pointer;font-size:0.75rem;margin-left:auto">删除</span>' : '') +
          '</div>' +
          '<div class="reply-content">' + esc(r.content) + '</div></div>';
      }).join('')) +
    '</div>' +
    (A.user ? '<div class="modal-reply-form"><h4>写回复</h4>' +
      '<textarea id="replyContent" class="composer-textarea" rows="3" placeholder="写下你的回复..."></textarea>' +
      '<button onclick="doReply(' + p.id + ')" class="btn btn-primary" style="margin-top:0.5rem">提交回复</button></div>' : '') +
    (A.isAdmin ? '<div style="margin-top:1rem;text-align:right"><button onclick="delPost(' + p.id + ')" style="background:none;border:1px solid #e53e3e;color:#e53e3e;padding:0.4rem 1rem;border-radius:100px;cursor:pointer;font-size:0.85rem">删除此帖</button></div>' : '');

  m.style.display = 'flex';

  // 删除回复按钮事件
  setTimeout(function() {
    document.querySelectorAll('.del-reply-btn').forEach(function(btn) {
      btn.addEventListener('click', function(e) {
        e.stopPropagation();
        delReply(parseInt(this.dataset.rid), parseInt(this.dataset.pid));
      });
    });
  }, 100);
}

// ============================================
// 删除
// ============================================

async function delPost(id) {
  if (!confirm('确认删除这条帖子？')) return;
  if (useServer) {
    var ok = await deletePostServer(id);
    if (ok) { await loadPostsServer(); renderPostList(); document.getElementById('postModal').style.display = 'none'; }
    else alert('删除失败');
  }
}

async function delReply(rid, pid) {
  if (!confirm('确认删除这条回复？')) return;
  if (useServer) {
    var ok = await deleteReplyServer(rid);
    if (ok) { await loadPostsServer(); renderPostList(); var p = posts.find(function(x) { return x.id === pid; }); if (p) showDetail(p); }
    else alert('删除失败');
  }
}

// ============================================
// 回复
// ============================================

async function doReply(postId) {
  if (!A.user) { alert('请先登录'); return; }
  var c = document.getElementById('replyContent').value.trim();
  if (!c) { alert('请填写回复内容'); return; }

  if (useServer) {
    var ok = await saveReplyServer(postId, A.user.display_name, A.user.role || 'student', c);
    if (ok) { await loadPostsServer(); renderPostList(); }
    else alert('回复失败');
  }

  document.getElementById('postModal').style.display = 'none';
  var updated = posts.find(function(x) { return x.id === postId; });
  if (updated) showDetail(updated);
}
window.doReply = doReply;

// ============================================
// 发帖
// ============================================

document.getElementById('submitPost').addEventListener('click', async function() {
  if (!A.user) { alert('请先登录后再发帖'); return; }

  var btn = this;
  var title = document.getElementById('postTitle').value.trim();
  var content = document.getElementById('postContent').value.trim();
  if (!title || !content) { alert('请填写标题和内容'); return; }

  // 隐藏 composer 中的 author/role 字段（已登录用户自动获取）
  document.getElementById('postAuthor').value = A.user.display_name;
  document.getElementById('postRole').value = A.user.role || 'student';

  btn.textContent = '发布中...';
  btn.disabled = true;

  var authorEl = document.getElementById('postAuthor');
  var roleEl = document.getElementById('postRole');
  var author = authorEl.value.trim();
  var role = roleEl.value;

  if (useServer) {
    var ok = await savePostServer(author, role, title, content);
    if (ok) {
      await loadPostsServer();
      renderPostList();
    } else {
      alert('发布失败，请重试');
    }
  }

  document.getElementById('postTitle').value = '';
  document.getElementById('postContent').value = '';
  btn.textContent = '发布帖子';
  btn.disabled = false;
  document.getElementById('forumPosts').scrollIntoView({ behavior: 'smooth' });
});

// ============================================
// 弹窗关闭
// ============================================

document.getElementById('closeModal').addEventListener('click', function() {
  document.getElementById('postModal').style.display = 'none';
});
document.getElementById('postModal').addEventListener('click', function(e) {
  if (e.target === this) this.style.display = 'none';
});
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') document.getElementById('postModal').style.display = 'none';
});

// ============================================
// Auth 状态变化回调
// ============================================

window.onAuthReady = function() { init(); };
window.onAuthChanged = function() { if (useServer) { loadPostsServer().then(renderPostList); } };

// ============================================
// 工具
// ============================================

function fmt(t) {
  if (!t) return '';
  var d = new Date(t), n = new Date(), diff = n - d;
  var m = Math.floor(diff / 60000), h = Math.floor(diff / 3600000), day = Math.floor(diff / 86400000);
  if (m < 1) return '刚刚';
  if (m < 60) return m + ' 分钟前';
  if (h < 24) return h + ' 小时前';
  if (day < 7) return day + ' 天前';
  return d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate());
}
function p2(v) { return v < 10 ? '0' + v : '' + v; }
function esc(s) { var d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

// ============================================
// 启动
// ============================================

async function init() {
  if (!A.ready) return; // 等待 auth 就绪
  useServer = await loadPostsServer();
  if (!useServer) loadPostsLocal();
  renderPostList();
}

// 如果 auth 已经就绪，直接初始化
if (A.ready) init();
