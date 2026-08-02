/**
 * 2509班 班级网站 — 通用 UI 脚本
 * 移动端导航 + 回到顶部（forum/moments 页不加载 main.js，此处统一补齐）
 */
(function () {
  // ========== 1. 移动端导航抽屉 ==========
  var toggle = document.getElementById('navToggle');
  var links = document.querySelector('.nav-links');
  if (toggle && links) {
    var backdrop = document.querySelector('.nav-backdrop');
    if (!backdrop) {
      backdrop = document.createElement('div');
      backdrop.className = 'nav-backdrop';
      document.body.appendChild(backdrop);
    }
    function openNav() {
      links.classList.add('open');
      toggle.classList.add('open');
      backdrop.classList.add('open');
      document.body.style.overflow = 'hidden';
    }
    function closeNav() {
      links.classList.remove('open');
      toggle.classList.remove('open');
      backdrop.classList.remove('open');
      document.body.style.overflow = '';
    }
    toggle.addEventListener('click', function () {
      if (links.classList.contains('open')) closeNav(); else openNav();
    });
    backdrop.addEventListener('click', closeNav);
    links.querySelectorAll('a').forEach(function (a) { a.addEventListener('click', closeNav); });
  }

  // ========== 2. 回到顶部 ==========
  var btn = document.getElementById('backToTop');
  if (btn) {
    var ticking = false;
    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        btn.classList.toggle('visible', window.scrollY > 400);
        ticking = false;
      });
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    btn.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // ========== 3. 移动端滚动条位置修正（fixed 导航遮挡锚点） ==========
  if (document.querySelector('.nav')) {
    var navH = 64;
    document.documentElement.style.scrollPaddingTop = navH + 'px';
  }
})();
