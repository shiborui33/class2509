/**
 * 2509班 班级网站 — 交流区（论坛）逻辑
 * 通过 Supabase REST API 实现多人实时共享
 * API 不通时自动降级为 localStorage
 */

// ============================================
// 配置
// ============================================

const SB_URL  = 'https://vrkvlddlpnsseldjrtpt.supabase.co';
const SB_KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZya3ZsZGRscG5zc2VsZGpydHB0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQzNDY4NDUsImV4cCI6MjA5OTkyMjg0NX0.mr_mXfRfvfTDvdBjZ37M2kv7CW4ltVvZftTAEZvLCXA';

let posts = [];
let useServer = false; // 检测到 Supabase 可用才切换

// ============================================
// API 封装 — 纯 fetch，不依赖任何 SDK
// ============================================

function sb(path, options) {
  if (!options) options = {};
  if (!options.headers) options.headers = {};
  options.headers['apikey'] = SB_KEY;
  options.headers['Authorization'] = 'Bearer ' + SB_KEY;
  if (!options.headers['Content-Type'] && (options.body || options.method === 'POST' || options.method === 'PATCH')) {
    options.headers['Content-Type'] = 'application/json';
    options.headers['Prefer'] = 'return=representation';
  }
  return fetch(SB_URL + path, options);
}

// ============================================
// 数据层
// ============================================

async function loadPostsServer() {
  try {
    var r = await sb('/rest/v1/posts?select=*,replies(*)&order=created_at.desc');
    if (!r.ok) throw new Error(r.status);
    var data = await r.json();
    posts = data.map(function(p) {
      return {
        id: p.id,
        title: p.title,
        author: p.author,
        role: p.role,
        content: p.content,
        timestamp: p.created_at,
        replies: (p.replies || []).map(function(rp) {
          return { id: rp.id, author: rp.author, role: rp.role, content: rp.content, timestamp: rp.created_at };
        })
      };
    });
    return true;
  } catch (e) {
    console.warn('加载线上帖子失败:', e.message);
    return false;
  }
}

async function savePostServer(author, role, title, content) {
  try {
    var r = await sb('/rest/v1/posts', {
      method: 'POST',
      body: JSON.stringify({ title: title, author: author, role: role, content: content })
    });
    return r.ok;
  } catch (e) {
    return false;
  }
}

async function saveReplyServer(postId, author, role, content) {
  try {
    var r = await sb('/rest/v1/replies', {
      method: 'POST',
      body: JSON.stringify({ post_id: postId, author: author, role: role, content: content })
    });
    return r.ok;
  } catch (e) {
    return false;
  }
}

// ============================================
// localStorage 降级
// ============================================

var STORAGE_KEY = 'class2509_forum_posts';
var SEED_POSTS = [
  { id: 1, title: '欢迎来到2509班交流区！', author: '李智英老师', role: 'teacher', content: '同学们好！这是我们班的线上交流空间，学习问题、活动建议、班级事务都可以在这里讨论。希望大家文明发言，互相尊重，共同营造一个温暖的班级社区。', timestamp: '2026-07-15T14:30:00Z', replies: [{ id: 1, author: '李明', role: 'student', content: '收到！终于有自己的班级论坛了，好棒！', timestamp: '2026-07-15T15:10:00Z' }] },
  { id: 2, title: '数学竞赛获奖喜报！', author: '张伟', role: 'student', content: '热烈祝贺我们班陈思远同学在全国高中数学联赛中获得省级一等奖！', timestamp: '2026-07-12T09:00:00Z', replies: [{ id: 2, author: '李智英老师', role: 'teacher', content: '非常棒！思远同学的努力大家都看在眼里。', timestamp: '2026-07-12T09:30:00Z' }] },
  { id: 3, title: '班级篮球队周末训练安排', author: '刘洋', role: 'student', content: '这周六下午三点在学校篮球场训练，为下周年级篮球赛做准备。', timestamp: '2026-07-10T16:45:00Z', replies: [] }
];

function loadPostsLocal() {
  try {
    var s = localStorage.getItem(STORAGE_KEY);
    posts = s ? JSON.parse(s) : JSON.parse(JSON.stringify(SEED_POSTS));
    if (!s) savePostsLocal();
  } catch (e) {
    posts = JSON.parse(JSON.stringify(SEED_POSTS));
  }
}

function savePostsLocal() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(posts)); } catch (e) {}
}

function addPostLocal(author, role, title, content) {
  return { id: Date.now(), title: title, author: author, role: role, content: content, timestamp: new Date().toISOString(), replies: [] };
}

function addReplyLocal(postId, author, role, content) {
  var p = posts.find(function(x) { return x.id === postId; });
  if (!p) return false;
  p.replies.push({ id: Date.now(), author: author, role: role, content: content, timestamp: new Date().toISOString() });
  savePostsLocal();
  return true;
}

// ============================================
// 初始化 — 检测 Supabase
// ============================================

async function init() {
  var ok = await loadPostsServer();
  if (ok) {
    useServer = true;
    console.log('🔗 论坛已连接 Supabase');
  } else {
    loadPostsLocal();
    console.log('💾 论坛使用本地存储');
  }
  renderPostList();
}

// ============================================
// 渲染帖子列表
// ============================================

function renderPostList() {
  var c = document.getElementById('forumPosts');
  c.innerHTML = '';
  if (posts.length === 0) {
    c.innerHTML = '<div style="text-align:center;padding:3rem;color:var(--text-muted)"><p style="font-family:var(--font-display);font-size:1.2rem;margin-bottom:0.5rem">还没有帖子</p><p>快来发布第一条帖子吧！</p></div>';
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
          '<div class="post-card-author">' + esc(p.author) + ' <span class="post-card-role ' + p.role + '">' + (p.role === 'teacher' ? '老师' : '同学') + '</span></div>' +
          '<span class="post-card-date">' + fmt(p.timestamp) + '</span>' +
        '</div>' +
      '</div>' +
      '<h3 class="post-card-title">' + esc(p.title) + '</h3>' +
      '<p class="post-card-preview">' + esc(p.content) + '</p>' +
      '<div class="post-card-footer">' +
        '<span class="post-card-reply-count"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg> ' + p.replies.length + ' 条回复</span>' +
      '</div>';
    card.addEventListener('click', function() { showDetail(p); });
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
        return '<div class="reply-item"><div class="reply-header"><strong class="reply-author">' + esc(r.author) + '</strong> <span class="post-card-role ' + r.role + '">' + (r.role === 'teacher' ? '老师' : '同学') + '</span> <span class="reply-date">' + fmt(r.timestamp) + '</span></div><div class="reply-content">' + esc(r.content) + '</div></div>';
      }).join('')) +
    '</div>' +
    '<div class="modal-reply-form"><h4>写回复</h4>' +
      '<div style="display:flex;gap:0.5rem;margin-bottom:0.5rem">' +
        '<input type="text" id="replyAuthor" class="composer-input" style="flex:1" placeholder="你的名字">' +
        '<select id="replyRole" class="composer-input" style="width:120px"><option value="student">同学</option><option value="teacher">老师</option></select>' +
      '</div>' +
      '<textarea id="replyContent" class="composer-textarea" rows="3" placeholder="写下你的回复..."></textarea>' +
      '<button onclick="doReply(' + p.id + ')" class="btn btn-primary" style="margin-top:0.5rem">提交回复</button>' +
    '</div>';
  m.style.display = 'flex';
}

// ============================================
// 回复
// ============================================

async function doReply(postId) {
  var a = document.getElementById('replyAuthor').value.trim();
  var r = document.getElementById('replyRole').value;
  var c = document.getElementById('replyContent').value.trim();
  if (!a || !c) { alert('请填写名字和回复内容'); return; }

  if (useServer) {
    var ok = await saveReplyServer(postId, a, r || 'student', c);
    if (ok) await loadPostsServer();
    else { addReplyLocal(postId, a, r || 'student', c); posts = posts; }
  } else {
    addReplyLocal(postId, a, r || 'student', c);
  }

  renderPostList();
  var updated = posts.find(function(x) { return x.id === postId; });
  if (updated) showDetail(updated);
}
window.doReply = doReply;

// ============================================
// 发帖
// ============================================

document.getElementById('submitPost').addEventListener('click', async function() {
  var btn = this;
  var author = document.getElementById('postAuthor').value.trim();
  var role = document.getElementById('postRole').value;
  var title = document.getElementById('postTitle').value.trim();
  var content = document.getElementById('postContent').value.trim();
  if (!author || !title || !content) { alert('请填写名字、标题和内容'); return; }

  btn.textContent = '发布中...';
  btn.disabled = true;

  if (useServer) {
    var ok = await savePostServer(author, role || 'student', title, content);
    if (ok) {
      await loadPostsServer();
      renderPostList();
    }
  }
  if (!useServer || !ok) {
    posts.unshift(addPostLocal(author, role || 'student', title, content));
    savePostsLocal();
    renderPostList();
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
// 工具函数
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

function esc(s) {
  var div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

// ============================================
// 启动
// ============================================

window.addEventListener('DOMContentLoaded', init);
