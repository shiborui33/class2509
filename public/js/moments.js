/**
 * 2509班 同学点滴 — 照片+文字时间线
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

// 上传图片
async function uploadImage(file) {
  if (file.size > 10485760) throw new Error('图片不能超过10MB');
  var path = 'moments/' + Date.now() + '_' + Math.random().toString(36).slice(2,6) + '.' + file.name.split('.').pop();
  var r = await fetch(SB_URL + '/storage/v1/object/forum-files/' + path, {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + A.token, 'apikey': SB_KEY, 'Content-Type': file.type },
    body: file
  });
  if (!r.ok) throw new Error('上传失败');
  return SB_URL + '/storage/v1/object/public/forum-files/' + path;
}

// 文件选择预览
function initFilePicker() {
  var input = document.getElementById('momentImage');
  var preview = document.getElementById('momentPreview');
  var clear = document.getElementById('clearMomentImage');
  if (!input) return;
  input.addEventListener('change', function() {
    var f = this.files[0];
    if (!f) return;
    preview.textContent = '📷 ' + f.name;
    preview.style.display = 'inline'; clear.style.display = 'inline';
  });
  clear.addEventListener('click', function() {
    input.value = ''; preview.style.display = 'none'; this.style.display = 'none';
  });
}

// ============================================
// 数据
// ============================================

async function loadMoments() {
  try {
    var r = await sf('/rest/v1/moments?select=*&order=created_at.desc&limit=50');
    if (!r.ok) throw new Error(r.status);
    moments = await r.json();
    return true;
  } catch (e) { console.warn('加载失败:', e.message); return false; }
}

async function saveMoment(content, imageUrl) {
  var body = { content: content, author: A.user.display_name };
  if (A.user) body.author_id = A.user.id;
  if (imageUrl) body.image_url = imageUrl;
  var r = await sf('/rest/v1/moments', { method: 'POST', body: body });
  return r.ok;
}

async function deleteMoment(id) {
  var r = await sf('/rest/v1/moments?id=eq.' + id, { method: 'DELETE' });
  return r.ok;
}

// ============================================
// 渲染
// ============================================

function renderTimeline() {
  var c = document.getElementById('momentsTimeline');
  c.innerHTML = '';

  if (moments.length === 0) {
    c.innerHTML = '<div style="text-align:center;padding:3rem;color:var(--text-muted)"><p style="font-size:3rem;margin-bottom:1rem">📸</p><p>还没有点滴，来分享第一张照片吧</p></div>';
    return;
  }

  moments.forEach(function(m, i) {
    var card = document.createElement('div');
    card.style.cssText = 'background:var(--card);border-radius:var(--radius-lg);padding:1.2rem;margin-bottom:1rem;box-shadow:0 1px 2px rgba(13,13,26,0.03),0 4px 16px rgba(13,13,26,0.05);border:1px solid var(--border);opacity:0;transform:translateY(20px);transition:opacity 0.6s ease-out,transform 0.6s ease-out';
    card.style.transitionDelay = (i*0.05)+'s';

    var imgHtml = m.image_url ? '<div style="margin-top:0.8rem"><img src="'+m.image_url+'" style="width:100%;border-radius:8px;max-height:500px;object-fit:cover" loading="lazy" /></div>' : '';

    card.innerHTML =
      '<div style="display:flex;align-items:center;gap:0.7rem;margin-bottom:0.5rem">'+
        '<div style="width:36px;height:36px;border-radius:50%;background:var(--bg-alt);display:flex;align-items:center;justify-content:center;font-family:Ma+Shan+Zheng,cursive;font-size:1.1rem;color:var(--accent);flex-shrink:0">'+m.author.charAt(0)+'</div>'+
        '<div style="flex:1"><strong style="font-size:0.9rem">'+esc(m.author)+'</strong><br><span style="font-size:0.75rem;color:var(--text-light)">'+fmt(m.created_at)+'</span></div>'+
        (A.isAdmin ? '<span style="color:#e53e3e;cursor:pointer;font-size:0.75rem" onclick="delMoment('+m.id+')">删除</span>' : '')+
      '</div>'+
      (m.content ? '<p style="font-size:0.95rem;line-height:1.7;color:var(--ink-light);margin-bottom:0">'+esc(m.content)+'</p>' : '')+
      imgHtml;

    c.appendChild(card);

    // 触发动画
    setTimeout(function() { card.style.opacity = '1'; card.style.transform = 'none'; }, i*60+100);
  });
}

// ============================================
// 发点滴
// ============================================

document.getElementById('submitMoment').addEventListener('click', async function() {
  if (!A.user) { alert('请先登录'); return; }
  var content = document.getElementById('momentContent').value.trim();
  var imageInput = document.getElementById('momentImage');
  if (!content && (!imageInput || !imageInput.files[0])) { alert('请填写文字或选择照片'); return; }

  var btn = this; btn.textContent = '发布中...'; btn.disabled = true;

  var imageUrl = null;
  if (imageInput && imageInput.files[0]) {
    try { imageUrl = await uploadImage(imageInput.files[0]); }
    catch(e) { alert('图片上传失败: '+e.message); btn.textContent='发布'; btn.disabled=false; return; }
  }

  if (useServer) {
    var ok = await saveMoment(content, imageUrl);
    if (ok) { await loadMoments(); renderTimeline(); }
    else alert('发布失败');
  }

  document.getElementById('momentContent').value = '';
  if (imageInput) imageInput.value = '';
  document.getElementById('momentPreview').style.display = 'none';
  document.getElementById('clearMomentImage').style.display = 'none';
  btn.textContent = '发布'; btn.disabled = false;
});

// ============================================
// 删除
// ============================================

async function delMoment(id) {
  if (!confirm('确认删除？')) return;
  if (useServer) { await deleteMoment(id); await loadMoments(); renderTimeline(); }
}
window.delMoment = delMoment;

// ============================================
// Utils
// ============================================

function fmt(t) {
  if(!t) return ''; var d=new Date(t),n=new Date(),diff=n-d;
  var m=Math.floor(diff/60000),h=Math.floor(diff/3600000),day=Math.floor(diff/86400000);
  if(m<1) return '刚刚'; if(m<60) return m+'分钟前'; if(h<24) return h+'小时前'; if(day<7) return day+'天前';
  return d.getFullYear()+'-'+p2(d.getMonth()+1)+'-'+p2(d.getDate());
}
function p2(v) { return v<10?'0'+v:''+v; }
function esc(s) { var d=document.createElement('div'); d.textContent=s; return d.innerHTML; }

// ============================================
// Init
// ============================================

async function init() {
  if (!A.ready) return;
  useServer = await loadMoments();
  renderTimeline();
  initFilePicker();
}

window.onAuthReady = function() { init(); };
if (A.ready) init();
