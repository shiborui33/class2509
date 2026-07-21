/**
 * 2509班 班级网站 — 认证系统
 * 账号+密码登录（无需邮箱）
 */

window.SB_URL = 'https://vrkvlddlpnsseldjrtpt.supabase.co';
window.SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZya3ZsZGRscG5zc2VsZGpydHB0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQzNDY4NDUsImV4cCI6MjA5OTkyMjg0NX0.mr_mXfRfvfTDvdBjZ37M2kv7CW4ltVvZftTAEZvLCXA';

window.AUTH = { user: null, token: null, isAdmin: false, ready: false };
var A = window.AUTH;

function af(path, options) {
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
// 账号 -> 邮箱 转换
// ============================================

function toEmail(username) {
  return username.trim().toLowerCase().replace(/\s+/g, '') + '@2509.local';
}

// ============================================
// 登录 / 注册
// ============================================

async function doLogin(username, password) {
  var r = await af('/auth/v1/token?grant_type=password', {
    method: 'POST',
    body: { email: toEmail(username), password: password }
  });
  if (!r.ok) {
    var e = await r.json().catch(function() { return {}; });
    throw new Error(e.error_description || '账号或密码错误');
  }
  var data = await r.json();
  A.token = data.access_token;
  A.user = data.user;
  await loadProfile();
}

async function doRegister(username, displayName, password) {
  var email = toEmail(username);
  var r = await af('/auth/v1/signup', {
    method: 'POST',
    body: { email: email, password: password, data: { display_name: displayName } }
  });
  if (!r.ok) {
    var e = await r.json().catch(function() { return {}; });
    if (e.msg && e.msg.includes('already')) throw new Error('该账号已被注册');
    throw new Error(e.msg || '注册失败');
  }
  var data = await r.json();
  A.user = data.user;
  // 注册后自动登录
  var loginR = await af('/auth/v1/token?grant_type=password', {
    method: 'POST',
    body: { email: email, password: password }
  });
  if (loginR.ok) {
    var loginData = await loginR.json();
    A.token = loginData.access_token;
  }
  // 等待profile触发器
  await new Promise(function(resolve) { setTimeout(resolve, 800); });
  await loadProfile();
  // 确保 display_name 被设置
  if (!A.user.display_name || A.user.display_name === A.user.email) {
    try {
      await af('/rest/v1/profiles?id=eq.' + A.user.id, {
        method: 'PATCH',
        body: { display_name: displayName }
      });
      A.user.display_name = displayName;
    } catch (e) {}
  }
}

async function loadProfile() {
  try {
    var r = await af('/rest/v1/profiles?id=eq.' + A.user.id + '&select=*');
    if (r.ok) {
      var profiles = await r.json();
      if (profiles.length > 0) {
        A.user.display_name = profiles[0].display_name;
        A.user.role = profiles[0].role;
        A.isAdmin = profiles[0].role === 'admin';
      }
    }
  } catch (e) {}
}

async function doLogout() {
  try { await af('/auth/v1/logout', { method: 'POST' }); } catch (e) {}
  A.user = null; A.token = null; A.isAdmin = false;
  localStorage.removeItem('sb_token'); localStorage.removeItem('sb_user');
}

// ============================================
// 会话持久化
// ============================================

function saveSession() {
  if (A.token) { localStorage.setItem('sb_token', A.token); localStorage.setItem('sb_user', JSON.stringify(A.user)); }
}

function restoreSession() {
  var t = localStorage.getItem('sb_token'), u = localStorage.getItem('sb_user');
  if (t && u) { A.token = t; A.user = JSON.parse(u); return true; }
  return false;
}

async function verifySession() {
  try {
    var r = await af('/auth/v1/user');
    if (r.ok) { A.user = await r.json(); A.token = localStorage.getItem('sb_token'); await loadProfile(); return true; }
  } catch (e) {}
  return false;
}

// ============================================
// UI
// ============================================

var isLogin = true;

function showAuthModal() { document.getElementById('authModal').style.display = 'flex'; setMode(true); }
function closeAuthModal() { document.getElementById('authModal').style.display = 'none'; }

function setMode(login) {
  isLogin = login;
  document.getElementById('authTitle').textContent = login ? '登录' : '注册';
  document.getElementById('authDisplayName').style.display = login ? 'none' : 'block';
  document.getElementById('authHint').style.display = login ? 'none' : 'block';
  document.getElementById('authSubmitBtn').textContent = login ? '登录' : '注册';
  document.getElementById('authSwitchText').textContent = login ? '还没有账号？' : '已有账号？';
  document.getElementById('authSwitchLink').textContent = login ? '注册' : '登录';
  document.getElementById('authError').style.display = 'none';
  document.getElementById('authForm').style.display = 'block';
  document.getElementById('authUserInfo').style.display = 'none';
  document.getElementById('authUsername').placeholder = login ? '输入你的账号' : '设置账号（英文或数字）';
}

function showUserInfo() {
  document.getElementById('authForm').style.display = 'none';
  document.getElementById('authUserInfo').style.display = 'block';
  document.getElementById('authUserName').textContent = A.user.display_name || A.user.email;
  var r = A.isAdmin ? '🔧 管理员' : (A.user.role === 'teacher' ? '👩‍🏫 老师' : '📚 同学');
  document.getElementById('authUserRole').textContent = r;
  document.getElementById('authTitle').textContent = '账号信息';
}

function updateNav() {
  var b = document.getElementById('navLoginBtn');
  if (!b) return;
  if (A.user) { b.textContent = A.user.display_name || A.user.email; b.style.color = 'var(--accent)'; }
  else { b.textContent = '登录'; b.style.color = ''; }

  var tip = document.getElementById('composerLoginTip');
  var fields = document.getElementById('composerFields');
  var ae = document.getElementById('postAuthor'), re = document.getElementById('postRole');
  if (tip) tip.style.display = A.user ? 'none' : 'block';
  if (fields) fields.style.display = A.user ? '' : 'none';
  if (ae) ae.parentElement.style.display = A.user ? 'none' : '';
  if (re) re.parentElement.style.display = A.user ? 'none' : '';
}

// ============================================
// 事件
// ============================================

document.getElementById('navLoginBtn').addEventListener('click', function(e) {
  e.preventDefault();
  if (A.user) { showUserInfo(); document.getElementById('authModal').style.display = 'flex'; }
  else showAuthModal();
});

document.getElementById('closeAuthModal').addEventListener('click', closeAuthModal);
document.getElementById('authModal').addEventListener('click', function(e) { if (e.target === this) closeAuthModal(); });

document.getElementById('authSwitchLink').addEventListener('click', function(e) {
  e.preventDefault(); setMode(!isLogin);
});

document.getElementById('authUsername').addEventListener('input', function() {
  var u = this.value.trim();
  if (u && !isLogin) document.getElementById('authHintName').textContent = u;
});

document.getElementById('authSubmitBtn').addEventListener('click', async function() {
  var username = document.getElementById('authUsername').value.trim();
  var password = document.getElementById('authPassword').value.trim();
  var displayName = document.getElementById('authDisplayName').value.trim();

  if (!username || !password) { document.getElementById('authError').textContent = '请填写账号和密码'; document.getElementById('authError').style.display = 'block'; return; }
  if (!isLogin && !displayName) { document.getElementById('authError').textContent = '请填写真实姓名'; document.getElementById('authError').style.display = 'block'; return; }

  var b = this; b.textContent = '处理中...'; b.disabled = true;
  document.getElementById('authError').style.display = 'none';

  try {
    if (isLogin) await doLogin(username, password);
    else await doRegister(username, displayName, password);
    saveSession(); updateNav(); showUserInfo();
    document.getElementById('authUsername').value = '';
    document.getElementById('authPassword').value = '';
    document.getElementById('authDisplayName').value = '';
    if (window.onAuthChanged) window.onAuthChanged();
  } catch (e) {
    document.getElementById('authError').textContent = e.message;
    document.getElementById('authError').style.display = 'block';
  }
  b.textContent = isLogin ? '登录' : '注册'; b.disabled = false;
});

document.getElementById('authLogoutBtn').addEventListener('click', async function() {
  await doLogout(); updateNav(); closeAuthModal();
  if (window.onAuthChanged) window.onAuthChanged();
});

// ============================================
// 初始化
// ============================================

async function initAuth() {
  if (restoreSession()) {
    var ok = await verifySession();
    if (!ok) { A.user = null; A.token = null; A.isAdmin = false; localStorage.removeItem('sb_token'); localStorage.removeItem('sb_user'); }
  }
  A.ready = true; updateNav();
  if (window.onAuthReady) window.onAuthReady();
}

window.addEventListener('DOMContentLoaded', initAuth);
