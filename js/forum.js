/**
 * 2509班 班级网站 — 交流区（论坛）逻辑
 * 优先使用 Supabase 实时数据库（多人共享）
 * 未配置时自动降级为 localStorage（单机模式）
 */

// ============================================
// 配置 — 将下面的值替换为你的 Supabase 项目信息
// ============================================

const SUPABASE_CONFIG = {
  url: 'https://vrkvlddlpnsseldjrtpt.supabase.co',        // 例如 https://abc123.supabase.co
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZya3ZsZGRscG5zc2VsZGpydHB0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQzNDY4NDUsImV4cCI6MjA5OTkyMjg0NX0.mr_mXfRfvfTDvdBjZ37M2kv7CW4ltVvZftTAEZvLCXA' // 在 Supabase 项目 Settings > API 中找到
};

const USE_SUPABASE = SUPABASE_CONFIG.url !== 'YOUR_SUPABASE_URL';

let supabase = null;
let realtimeChannel = null;

// ============================================
// 初始化 Supabase
// ============================================

function initSupabase() {
  if (!USE_SUPABASE) return false;
  try {
    supabase = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
    return true;
  } catch (err) {
    console.warn('Supabase 初始化失败，降级到本地存储:', err.message);
    return false;
  }
}

// ============================================
// 数据层 — 统一接口
// ============================================

let posts = [];

// --- Supabase 实现 ---

async function loadPostsFromSupabase() {
  const { data, error } = await supabase
    .from('posts')
    .select('*, replies(*)')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('加载帖子失败:', error);
    return false;
  }

  posts = data.map(p => ({
    id: p.id,
    title: p.title,
    author: p.author,
    role: p.role,
    content: p.content,
    timestamp: p.created_at,
    replies: (p.replies || []).map(r => ({
      id: r.id,
      author: r.author,
      role: r.role,
      content: r.content,
      timestamp: r.created_at
    }))
  }));

  return true;
}

async function savePostToSupabase(postData) {
  const { data, error } = await supabase
    .from('posts')
    .insert({
      title: postData.title,
      author: postData.author,
      role: postData.role,
      content: postData.content
    })
    .select()
    .single();

  if (error) {
    console.error('发帖失败:', error);
    return null;
  }
  return { ...data, replies: [] };
}

async function saveReplyToSupabase(postId, replyData) {
  const { error } = await supabase
    .from('replies')
    .insert({
      post_id: postId,
      author: replyData.author,
      role: replyData.role,
      content: replyData.content
    });

  if (error) {
    console.error('回复失败:', error);
    return false;
  }
  return true;
}

function subscribeRealtime() {
  if (!supabase) return;

  realtimeChannel = supabase
    .channel('forum-changes')
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'posts' },
      () => {
        loadPostsFromSupabase().then(ok => ok && renderPostList());
      })
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'replies' },
      () => {
        loadPostsFromSupabase().then(ok => ok && renderPostList());
      })
    .subscribe();
}

// --- localStorage 实现 ---

const STORAGE_KEY = 'class2509_forum_posts';
const SEED_POSTS = [
  {
    id: 1,
    title: '欢迎来到2509班交流区！',
    author: '李智英老师',
    role: 'teacher',
    content: '同学们好！这是我们班的线上交流空间，学习问题、活动建议、班级事务都可以在这里讨论。希望大家文明发言，互相尊重，共同营造一个温暖的班级社区。',
    timestamp: '2026-07-15T14:30:00Z',
    replies: [
      {
        id: 1,
        author: '李明',
        role: 'student',
        content: '收到！终于有自己的班级论坛了，好棒！',
        timestamp: '2026-07-15T15:10:00Z'
      }
    ]
  },
  {
    id: 2,
    title: '数学竞赛获奖喜报！',
    author: '张伟',
    role: 'student',
    content: '热烈祝贺我们班陈思远同学在全国高中数学联赛中获得省级一等奖！这是我们全班的骄傲！',
    timestamp: '2026-07-12T09:00:00Z',
    replies: [
      {
        id: 2,
        author: '李智英老师',
        role: 'teacher',
        content: '非常棒！思远同学的努力大家都看在眼里。',
        timestamp: '2026-07-12T09:30:00Z'
      }
    ]
  },
  {
    id: 3,
    title: '班级篮球队周末训练安排',
    author: '刘洋',
    role: 'student',
    content: '这周六下午三点在学校篮球场训练，为下周年级篮球赛做准备。篮球队成员务必参加，也欢迎其他同学来加油！',
    timestamp: '2026-07-10T16:45:00Z',
    replies: []
  }
];

function loadPostsLocal() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    posts = stored ? JSON.parse(stored) : JSON.parse(JSON.stringify(SEED_POSTS));
    if (!stored) savePostsLocal();
  } catch {
    posts = JSON.parse(JSON.stringify(SEED_POSTS));
  }
  return true;
}

function savePostsLocal() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(posts)); } catch {}
}

function savePostLocal(postData) {
  return {
    id: posts.length ? Math.max(...posts.map(p => p.id)) + 1 : 1,
    title: postData.title,
    author: postData.author,
    role: postData.role,
    content: postData.content,
    timestamp: new Date().toISOString(),
    replies: []
  };
}

function saveReplyLocal(postId, replyData) {
  const post = posts.find(p => p.id === postId);
  if (!post) return false;
  post.replies.push({
    id: post.replies.length ? Math.max(...post.replies.map(r => r.id)) + 1 : 1,
    ...replyData,
    timestamp: new Date().toISOString()
  });
  savePostsLocal();
  return true;
}

// --- 统一加载 ---

async function loadPosts() {
  let ok = false;
  if (USE_SUPABASE && supabase) {
    ok = await loadPostsFromSupabase();
  }
  if (!ok) {
    loadPostsLocal();
  }
  renderPostList();
}

// ============================================
// Render Post List
// ============================================

function renderPostList() {
  const container = document.getElementById('forumPosts');
  container.innerHTML = '';

  if (posts.length === 0) {
    container.innerHTML = `
      <div style="text-align:center; padding: var(--space-xl); color: var(--text-muted);">
        <p style="font-family: var(--font-display); font-size: 1.2rem; margin-bottom: 0.5rem;">还没有帖子</p>
        <p>快来发布第一条帖子吧！</p>
      </div>
    `;
    return;
  }

  posts.forEach((post, i) => {
    const card = document.createElement('div');
    card.className = 'post-card reveal';
    card.style.transitionDelay = `${i * 0.05}s`;

    const initial = post.author.charAt(0);
    const date = formatDate(post.timestamp);

    card.innerHTML = `
      <div class="post-card-header">
        <div class="post-author-avatar">${initial}</div>
        <div class="post-card-meta">
          <div class="post-card-author">
            ${escapeHtml(post.author)}
            <span class="post-card-role ${post.role}">${post.role === 'teacher' ? '老师' : '同学'}</span>
          </div>
          <span class="post-card-date">${date}</span>
        </div>
      </div>
      <h3 class="post-card-title">${escapeHtml(post.title)}</h3>
      <p class="post-card-preview">${escapeHtml(post.content)}</p>
      <div class="post-card-footer">
        <span class="post-card-reply-count">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
          </svg>
          ${post.replies.length} 条回复
        </span>
      </div>
    `;

    card.addEventListener('click', () => showPostDetail(post));
    container.appendChild(card);
  });

  requestAnimationFrame(() => {
    document.querySelectorAll('#forumPosts .reveal').forEach((el, i) => {
      setTimeout(() => el.classList.add('visible'), i * 80);
    });
  });
}

// ============================================
// Post Detail Modal
// ============================================

function showPostDetail(post) {
  const modal = document.getElementById('postModal');
  const content = document.getElementById('modalContent');
  const initial = post.author.charAt(0);
  const date = formatDate(post.timestamp);

  content.innerHTML = `
    <h2 class="modal-post-title">${escapeHtml(post.title)}</h2>
    <div class="modal-post-meta">
      <div class="post-author-avatar">${initial}</div>
      <div>
        <span class="post-card-author">
          ${escapeHtml(post.author)}
          <span class="post-card-role ${post.role}">${post.role === 'teacher' ? '老师' : '同学'}</span>
        </span>
        <div class="post-card-date">${date}</div>
      </div>
    </div>
    <div class="modal-post-body">${escapeHtml(post.content)}</div>

    <h3 class="modal-replies-title">回复 (${post.replies.length})</h3>
    <div class="modal-replies">
      ${post.replies.length === 0 ? '<p style="color:var(--text-muted);font-size:0.9rem;">暂无回复，来抢沙发吧！</p>' : ''}
      ${post.replies.map(r => {
        const rInitial = r.author.charAt(0);
        const rDate = formatDate(r.timestamp);
        return `
          <div class="reply-item">
            <div class="reply-header">
              <strong class="reply-author">${escapeHtml(r.author)}</strong>
              <span class="post-card-role ${r.role}">${r.role === 'teacher' ? '老师' : '同学'}</span>
              <span class="reply-date">${rDate}</span>
            </div>
            <div class="reply-content">${escapeHtml(r.content)}</div>
          </div>
        `;
      }).join('')}
    </div>

    <div class="modal-reply-form">
      <h4>写回复</h4>
      <div style="display:flex;gap:0.5rem;margin-bottom:0.5rem;">
        <input type="text" id="replyAuthor" class="composer-input" style="flex:1;" placeholder="你的名字">
        <select id="replyRole" class="composer-input" style="width:120px;">
          <option value="student">同学</option>
          <option value="teacher">老师</option>
        </select>
      </div>
      <textarea id="replyContent" class="composer-textarea" rows="3" placeholder="写下你的回复..."></textarea>
      <button onclick="window._submitReply(${post.id})" class="btn btn-primary" style="margin-top:0.5rem;">提交回复</button>
    </div>
  `;

  modal.style.display = 'flex';
}

// ============================================
// Submit Reply
// ============================================

async function submitReply(postId) {
  const author = document.getElementById('replyAuthor').value.trim();
  const role = document.getElementById('replyRole').value;
  const content = document.getElementById('replyContent').value.trim();

  if (!author || !content) {
    alert('请填写名字和回复内容');
    return;
  }

  const replyData = { author, role: role || 'student', content };
  let ok = false;

  if (USE_SUPABASE && supabase) {
    ok = await saveReplyToSupabase(postId, replyData);
    if (ok) {
      await loadPostsFromSupabase();
      renderPostList();
    }
  }

  if (!ok) {
    saveReplyLocal(postId, replyData);
    renderPostList();
  }

  const updated = posts.find(p => p.id === postId);
  if (updated) showPostDetail(updated);
}

window._submitReply = submitReply;

// ============================================
// Submit New Post
// ============================================

document.getElementById('submitPost').addEventListener('click', async () => {
  const author = document.getElementById('postAuthor').value.trim();
  const role = document.getElementById('postRole').value;
  const title = document.getElementById('postTitle').value.trim();
  const content = document.getElementById('postContent').value.trim();

  if (!author || !title || !content) {
    alert('请填写名字、标题和内容');
    return;
  }

  const postData = { author, role: role || 'student', title, content };
  let newPost = null;

  if (USE_SUPABASE && supabase) {
    newPost = await savePostToSupabase(postData);
    if (newPost) {
      posts.unshift({
        id: newPost.id,
        title: newPost.title,
        author: newPost.author,
        role: newPost.role,
        content: newPost.content,
        timestamp: newPost.created_at,
        replies: []
      });
    }
  }

  if (!newPost) {
    newPost = savePostLocal(postData);
    posts.unshift(newPost);
    savePostsLocal();
  }

  renderPostList();

  // Clear form
  document.getElementById('postTitle').value = '';
  document.getElementById('postContent').value = '';

  // Scroll to new post
  document.getElementById('forumPosts').scrollIntoView({ behavior: 'smooth' });
});

// ============================================
// Modal Close
// ============================================

document.getElementById('closeModal').addEventListener('click', () => {
  document.getElementById('postModal').style.display = 'none';
});

document.getElementById('postModal').addEventListener('click', (e) => {
  if (e.target === document.getElementById('postModal')) {
    document.getElementById('postModal').style.display = 'none';
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.getElementById('postModal').style.display = 'none';
  }
});

// ============================================
// Helpers
// ============================================

function formatDate(isoString) {
  const d = new Date(isoString);
  const now = new Date();
  const diff = now - d;
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (mins < 1) return '刚刚';
  if (mins < 60) return `${mins} 分钟前`;
  if (hours < 24) return `${hours} 小时前`;
  if (days < 7) return `${days} 天前`;

  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ============================================
// Init
// ============================================

window.addEventListener('DOMContentLoaded', () => {
  const hasSupabase = initSupabase();
  if (hasSupabase) {
    subscribeRealtime();
    console.log('🔗 论坛已连接 Supabase 实时数据库');
  } else {
    console.log('💾 论坛使用本地存储模式（单机）');
  }
  loadPosts();
});
