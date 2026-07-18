/**
 * 2509班 班级网站 — 交流区（论坛）逻辑
 * GitHub Pages 部署版 — 使用 localStorage 存储
 */

const STORAGE_KEY = 'class2509_forum_posts';

// 初始种子数据（首次访问时加载）
const SEED_POSTS = [
  {
    id: 1,
    title: '关于下周班会的通知',
    author: '李智英老师',
    role: 'teacher',
    content: '各位同学好，下周一下午班会课我们讨论本学期的学习计划和班级活动安排，请大家提前准备建议。另外，最近天气转凉，注意增添衣物。',
    timestamp: '2026-07-15T14:30:00Z',
    replies: [
      {
        id: 1,
        author: '李明',
        role: 'student',
        content: '收到！我建议我们可以组织一次班级读书分享会。',
        timestamp: '2026-07-15T15:10:00Z'
      },
      {
        id: 2,
        author: '李智英老师',
        role: 'teacher',
        content: '很好的想法！到时候可以具体讨论一下方案。',
        timestamp: '2026-07-15T15:25:00Z'
      }
    ]
  },
  {
    id: 2,
    title: '数学竞赛获奖喜报！',
    author: '张伟',
    role: 'student',
    content: '热烈祝贺我们班陈思远同学在全国高中数学联赛中获得省级一等奖！这是我们全班的骄傲，希望思远同学再接再厉，冲击全国决赛！',
    timestamp: '2026-07-12T09:00:00Z',
    replies: [
      {
        id: 3,
        author: '李智英老师',
        role: 'teacher',
        content: '非常棒！思远同学的努力大家都看在眼里，这份荣誉实至名归。',
        timestamp: '2026-07-12T09:30:00Z'
      },
      {
        id: 4,
        author: '陈思远',
        role: 'student',
        content: '谢谢大家的鼓励！我会继续努力的。',
        timestamp: '2026-07-12T10:00:00Z'
      }
    ]
  },
  {
    id: 3,
    title: '班级篮球队周末训练安排',
    author: '刘洋',
    role: 'student',
    content: '这周六下午三点在学校篮球场训练，为下周的年级篮球赛做准备。请篮球队成员务必参加，也欢迎其他同学来加油助威！',
    timestamp: '2026-07-10T16:45:00Z',
    replies: []
  }
];

let posts = [];

// ============================================
// Load Posts (localStorage)
// ============================================

function loadPosts() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      posts = JSON.parse(stored);
    } else {
      posts = JSON.parse(JSON.stringify(SEED_POSTS));
      savePosts();
    }
  } catch (err) {
    posts = JSON.parse(JSON.stringify(SEED_POSTS));
  }
  renderPostList();
}

function savePosts() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
  } catch (err) {
    console.error('保存失败，存储空间可能已满');
  }
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
// Submit Reply (localStorage)
// ============================================

function submitReply(postId) {
  const author = document.getElementById('replyAuthor').value.trim();
  const role = document.getElementById('replyRole').value;
  const content = document.getElementById('replyContent').value.trim();

  if (!author || !content) {
    alert('请填写名字和回复内容');
    return;
  }

  const post = posts.find(p => p.id === postId);
  if (!post) return;

  const reply = {
    id: post.replies.length ? Math.max(...post.replies.map(r => r.id)) + 1 : 1,
    author,
    role: role || 'student',
    content,
    timestamp: new Date().toISOString()
  };

  post.replies.push(reply);
  savePosts();
  renderPostList();

  // Re-open the updated post
  const updated = posts.find(p => p.id === postId);
  if (updated) showPostDetail(updated);
}

window._submitReply = submitReply;

// ============================================
// Submit New Post (localStorage)
// ============================================

document.getElementById('submitPost').addEventListener('click', () => {
  const author = document.getElementById('postAuthor').value.trim();
  const role = document.getElementById('postRole').value;
  const title = document.getElementById('postTitle').value.trim();
  const content = document.getElementById('postContent').value.trim();

  if (!author || !title || !content) {
    alert('请填写名字、标题和内容');
    return;
  }

  const newPost = {
    id: posts.length ? Math.max(...posts.map(p => p.id)) + 1 : 1,
    title,
    author,
    role: role || 'student',
    content,
    timestamp: new Date().toISOString(),
    replies: []
  };

  posts.unshift(newPost);
  savePosts();
  renderPostList();

  // Clear form
  document.getElementById('postTitle').value = '';
  document.getElementById('postContent').value = '';

  // Scroll to the new post
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

  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  return `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ============================================
// Init
// ============================================

window.addEventListener('DOMContentLoaded', loadPosts);
