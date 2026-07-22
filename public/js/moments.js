/**
 * 2509班 同学点滴 — 照片网格（仅管理员可上传）
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
  var path = 'moments/' + Date.now() + '_' + Math.random().toString(36).slice(2,6) + '.' + file.name.split('.').pop();
  var r = await fetch(SB_URL + '/storage/v1/object/forum-files/' + path, {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + A.token, 'apikey': SB_KEY, 'Content-Type': file.type },
    body: file
  });
  if (!r.ok) throw new Error('上传失败');
  return SB_URL + '/storage/v1/object/public/forum-files/' + path;
}

function initFilePicker() {
  var input = document.getElementById('momentImage');
  var preview = document.getElementById('momentPreview');
  var clear = document.getElementById('clearMomentImage');
  if (!input) return;
  input.addEventListener('change', function() {
    var count = this.files.length;
    if (count === 0) return;
    preview.textContent = count === 1 ? '📷 ' + this.files[0].name : '📷 已选择 ' + count + ' 张照片';
    preview.style.display = 'inline'; clear.style.display = 'inline';
  });
  clear.addEventListener('click', function() {
    input.value = ''; preview.style.display = 'none'; this.style.display = 'none';
  });
}

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

function renderTimeline() {
  var c = document.getElementById('momentsTimeline');
  c.innerHTML = '';
  if (moments.length === 0) {
    c.style.display = 'block';
    c.innerHTML = '<div style="text-align:center;padding:4rem 1rem;color:var(--text-muted)"><p style="font-size:3rem;margin-bottom:1rem">📸</p><p style="font-size:1.1rem">还没有点滴，等待管理员上传照片</p></div>';
    return;
  }
  c.style.display = '';
  moments.forEach(function(m, i) {
    var card = document.createElement('div');
    card.className = 'moment-card';
    card.style.opacity = '0'; card.style.transform = 'translateY(20px)';
    card.style.transition = 'opacity 0.5s ease-out, transform 0.5s ease-out';
    card.style.transitionDelay = (i*0.06)+'s';
    var imgHtml = m.image_url ? '<img src="'+m.image_url+'" class="moment-image" loading="lazy" />' : '';
    card.innerHTML =
      imgHtml +
      '<div class="moment-body">'+
        (m.content ? '<p class="moment-text">'+esc(m.content)+'</p>' : '')+
        '<div class="moment-footer">'+
          '<span><span class="moment-author">'+esc(m.author)+'</span> · '+fmt(m.created_at)+'</span>'+
          (A.isAdmin ? '<span class="moment-delete" onclick="delMoment('+m.id+')">删除</span>' : '')+
        '</div>'+
      '</div>';
    c.appendChild(card);
    setTimeout(function() { card.style.opacity='1'; card.style.transform='none'; }, i*60+50);
  });
}

document.getElementById('submitMoment').addEventListener('click', async function() {
  if (!A.user || !A.isAdmin) { alert('仅管理员可上传'); return; }
  var content = document.getElementById('momentContent').value.trim();
  var imgInput = document.getElementById('momentImage');
  if (!imgInput || imgInput.files.length === 0) { alert('请选择照片'); return; }
  var btn = this;
  var files = Array.from(imgInput.files);
  btn.textContent = '上传中 0/' + files.length;
  btn.disabled = true;

  for (var i = 0; i < files.length; i++) {
    btn.textContent = '上传中 ' + (i+1) + '/' + files.length;
    try {
      var imageUrl = await uploadImage(files[i]);
      if (useServer) await saveMoment(i === files.length-1 ? content : '', imageUrl);
    } catch(e) {
      alert('第'+(i+1)+'张上传失败: '+e.message);
      btn.textContent = '发布'; btn.disabled = false;
      return;
    }
  }

  if (useServer) { await loadMoments(); renderTimeline(); }
  document.getElementById('momentContent').value = '';
  imgInput.value = '';
  document.getElementById('momentPreview').style.display = 'none';
  document.getElementById('clearMomentImage').style.display = 'none';
  btn.textContent = '发布'; btn.disabled = false;
});

async function delMoment(id) {
  if (!confirm('确认删除？')) return;
  if (useServer) { await deleteMoment(id); await loadMoments(); renderTimeline(); }
}
window.delMoment = delMoment;

function fmt(t) {
  if(!t) return ''; var d=new Date(t),n=new Date(),diff=n-d;
  var m=Math.floor(diff/60000),h=Math.floor(diff/3600000),day=Math.floor(diff/86400000);
  if(m<1) return '刚刚'; if(m<60) return m+'分钟前'; if(h<24) return h+'小时前'; if(day<7) return day+'天前';
  return d.getFullYear()+'-'+p2(d.getMonth()+1)+'-'+p2(d.getDate());
}
function p2(v) { return v<10?'0'+v:''+v; }
function esc(s) { var d=document.createElement('div'); d.textContent=s; return d.innerHTML; }

async function init() {
  if (!A.ready) return;
  useServer = await loadMoments();
  var composer = document.getElementById('momentsComposer');
  if (composer && A.isAdmin) composer.style.display = '';
  renderTimeline();
  initFilePicker();
}

window.onAuthReady = function() { init(); };
window.onAuthChanged = function() {
  var composer = document.getElementById('momentsComposer');
  if (composer && A.isAdmin) composer.style.display = '';
  else if (composer) composer.style.display = 'none';
  init();
};
if (A.ready) init();
