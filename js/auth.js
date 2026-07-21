/**
 * 2509班 班级网站 — 认证系统
 * Supabase Auth REST API
 */

// 全局 Supabase 配置
window.SB_URL = 'https://vrkvlddlpnsseldjrtpt.supabase.co';
window.SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZya3ZsZGRscG5zc2VsZGpydHB0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQzNDY4NDUsImV4cCI6MjA5OTkyMjg0NX0.mr_mXfRfvfTDvdBjZ37M2kv7CW4ltVvZftTAEZvLCXA';

window.AUTH = {
  user: null,      // { id, email, display_name, role }
  token: null,     // JWT access token
  isAdmin: false,
  ready: false
};

var A = window.AUTH;

// ============================================
// API 请求
// ============================================

function authFetch(path, options) {
  if (!options) options = {};
  if (!options.headers) options.headers = {};
  options.headers['apikey'] = window.SB_KEY;
  if (A.token) options.headers['Authorization'] = 'Bearer ' + A.token;
  if (options.body && typeof options.body === 'object') {
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(options.body);
  }
  return fetch(window.SB_URL + path, options);
}

// ============================================
// 登录 / 注册
// ============================================

async function doLogin(email, password) {
  var r = await authFetch('/auth/v1/token?grant_type=password', {
    method: 'POST',
    body: { email: email, password: password }
  });
  if (!r.ok) {
    var e = await r.json().catch(function() { return {}; });
    throw new Error(e.error_description || e.msg || '登录失败');
  }
  var data = await r.json();
  A.token = data.access_token;
  A.user = data.user;
  await loadProfile();
}

async function doRegister(displayName, email, password) {
  var r = await authFetch('/auth/v1/signup', {
    method: 'POST',
    body: { email: email, password: password, data: { display_name: displayName } }
  });
  if (!r.ok) {
    var e = await r.json().catch(function() { return {}; });
    throw new Error(e.msg || '注册失败');
  }
  var data = await r.json();
  A.token = data.access_token || (data.session && data.session.access_token) || null;
  A.user = data.user;
  if (!A.token) {
    // 可能在Supabase开启了邮箱确认，需要先登录
    setAuthMode(true);
    showError('注册成功！请登录（如果开启了邮箱确认，请先去邮箱点击确认链接）');
    return;
  }
  await loadProfile();
  // 等待 profile 触发器创建完成
  await new Promise(function(resolve) { setTimeout(resolve, 500); });
  await loadProfile();
}

async function loadProfile() {
  try {
    var r = await authFetch('/rest/v1/profiles?id=eq.' + A.user.id + '&select=*');
    if (r.ok) {
      var profiles = await r.json();
      if (profiles.length > 0) {
        A.user.display_name = profiles[0].display_name;
        A.user.role = profiles[0].role;
        A.isAdmin = profiles[0].role === 'admin';
      }
    }
  } catch (e) {
    console.warn('加载用户资料失败:', e.message);
  }
}

async function doLogout() {
  try {
    await authFetch('/auth/v1/logout', { method: 'POST' });
  } catch (e) {}
  A.user = null;
  A.token = null;
  A.isAdmin = false;
  localStorage.removeItem('sb_token');
  localStorage.removeItem('sb_user');
}

// ============================================
// 会话持久化
// ============================================

function saveSession() {
  if (A.token) {
    localStorage.setItem('sb_token', A.token);
    localStorage.setItem('sb_user', JSON.stringify(A.user));
  }
}

function restoreSession() {
  var t = localStorage.getItem('sb_token');
  var u = localStorage.getItem('sb_user');
  if (t && u) {
    A.token = t;
    A.user = JSON.parse(u);
    return true;
  }
  return false;
}

async function verifySession() {
  try {
    var r = await authFetch('/auth/v1/user');
    if (r.ok) {
      var data = await r.json();
      A.user = data;
      A.token = localStorage.getItem('sb_token');
      await loadProfile();
      return true;
    }
  } catch (e) {}
  return false;
}

// ============================================
// UI
// ============================================

var isLoginMode = true;

function showAuthModal() {
  document.getElementById('authModal').style.display = 'flex';
  setAuthMode(true);
}

function closeAuthModal() {
  document.getElementById('authModal').style.display = 'none';
}

function setAuthMode(login) {
  isLoginMode = login;
  document.getElementById('authTitle').textContent = login ? '登录' : '注册';
  document.getElementById('authDisplayName').style.display = login ? 'none' : 'block';
  document.getElementById('authSubmitBtn').textContent = login ? '登录' : '注册';
  document.getElementById('authSwitchText').textContent = login ? '还没有账号？' : '已有账号？';
  document.getElementById('authSwitchLink').textContent = login ? '注册' : '登录';
  document.getElementById('authError').style.display = 'none';
  document.getElementById('authForm').style.display = 'block';
  document.getElementById('authUserInfo').style.display = 'none';
}

function showAuthUserInfo() {
  document.getElementById('authForm').style.display = 'none';
  document.getElementById('authUserInfo').style.display = 'block';
  document.getElementById('authUserName').textContent = A.user.display_name || A.user.email;
  var roleText = '';
  if (A.isAdmin) roleText = '🔧 管理员';
  else if (A.user.role === 'teacher') roleText = '👩‍🏫 老师';
  else roleText = '📚 同学';
  document.getElementById('authUserRole').textContent = roleText;
  document.getElementById('authTitle').textContent = '账号信息';
}

function updateNavLogin() {
  var btn = document.getElementById('navLoginBtn');
  if (A.user) {
    btn.textContent = A.user.display_name || A.user.email;
    btn.style.color = 'var(--accent)';
    // 论坛发帖区：显示表单，隐藏姓名/角色字段（自动获取）
    var tip = document.getElementById('composerLoginTip');
    var fields = document.getElementById('composerFields');
    var authorEl = document.getElementById('postAuthor');
    var roleEl = document.getElementById('postRole');
    if (tip) tip.style.display = 'none';
    if (fields) fields.style.display = '';
    if (authorEl) { authorEl.parentElement.style.display = 'none'; }
    if (roleEl) { roleEl.parentElement.style.display = 'none'; }
  } else {
    btn.textContent = '登录';
    btn.style.color = '';
    var tip = document.getElementById('composerLoginTip');
    var fields = document.getElementById('composerFields');
    var authorEl = document.getElementById('postAuthor');
    var roleEl = document.getElementById('postRole');
    if (tip) tip.style.display = 'block';
    if (fields) fields.style.display = 'none';
    if (authorEl) { authorEl.parentElement.style.display = ''; }
    if (roleEl) { roleEl.parentElement.style.display = ''; }
  }
}

function showError(msg) {
  var el = document.getElementById('authError');
  el.textContent = msg;
  el.style.display = 'block';
}

// ============================================
// 事件绑定
// ============================================

document.getElementById('navLoginBtn').addEventListener('click', function(e) {
  e.preventDefault();
  if (A.user) {
    setAuthMode(false);
    showAuthUserInfo();
    document.getElementById('authModal').style.display = 'flex';
  } else {
    showAuthModal();
  }
});

document.getElementById('closeAuthModal').addEventListener('click', closeAuthModal);
document.getElementById('authModal').addEventListener('click', function(e) {
  if (e.target === this) closeAuthModal();
});

document.getElementById('authSwitchLink').addEventListener('click', function(e) {
  e.preventDefault();
  setAuthMode(!isLoginMode);
});

document.getElementById('authSubmitBtn').addEventListener('click', async function() {
  var email = document.getElementById('authEmail').value.trim();
  var password = document.getElementById('authPassword').value.trim();
  var displayName = document.getElementById('authDisplayName').value.trim();

  if (!email || !password) { showError('请填写邮箱和密码'); return; }
  if (!isLoginMode && !displayName) { showError('请填写姓名'); return; }

  var btn = this;
  btn.textContent = '处理中...';
  btn.disabled = true;
  showError('');

  try {
    if (isLoginMode) {
      await doLogin(email, password);
    } else {
      await doRegister(displayName, email, password);
    }
    saveSession();
    updateNavLogin();
    showAuthUserInfo();
    document.getElementById('authEmail').value = '';
    document.getElementById('authPassword').value = '';
    document.getElementById('authDisplayName').value = '';
    // 通知论坛刷新（切换到认证模式）
    if (window.onAuthChanged) window.onAuthChanged();
  } catch (e) {
    showError(e.message);
  }

  btn.textContent = isLoginMode ? '登录' : '注册';
  btn.disabled = false;
});

document.getElementById('authLogoutBtn').addEventListener('click', async function() {
  await doLogout();
  updateNavLogin();
  closeAuthModal();
  if (window.onAuthChanged) window.onAuthChanged();
});

// ============================================
// 初始化
// ============================================

async function initAuth() {
  if (restoreSession()) {
    var ok = await verifySession();
    if (ok) {
      console.log('🔐 已恢复登录:', A.user.email, A.isAdmin ? '(管理员)' : '');
    } else {
      A.user = null;
      A.token = null;
      A.isAdmin = false;
      localStorage.removeItem('sb_token');
      localStorage.removeItem('sb_user');
    }
  }
  A.ready = true;
  updateNavLogin();
  if (window.onAuthReady) window.onAuthReady();
}

window.addEventListener('DOMContentLoaded', initAuth);
