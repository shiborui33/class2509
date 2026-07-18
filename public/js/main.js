/**
 * 高三(1)班 班级网站 — 主逻辑
 * 班级介绍、班干部、同学录渲染 + 导航 + 滚动动画
 */

// ============================================
// Data loading
// ============================================

let classData = null;
let allStudents = [];

async function loadData() {
  try {
    const res = await fetch('data/students.json');
    classData = await res.json();
    allStudents = classData.students;
    renderClassIntro();
    renderLeaders();
    renderStudents(allStudents);
  } catch (err) {
    console.error('加载数据失败:', err);
  }
}

// ============================================
// Class Intro
// ============================================

function renderClassIntro() {
  const info = classData.classInfo;
  document.getElementById('introDescription').textContent = info.description;
  document.getElementById('infoFounded').textContent = info.foundedAt;
  document.getElementById('infoTeacher').textContent = info.classTeacher;
  document.getElementById('infoCount').textContent = info.totalStudents + '人';
  document.getElementById('infoSubjects').textContent = info.subjects.join('、');
  document.getElementById('heroMotto').textContent = info.motto;
}

// ============================================
// Leaders Section
// ============================================

function renderLeaders() {
  const grid = document.getElementById('leadersGrid');
  grid.innerHTML = '';

  classData.leaders.forEach((leader, i) => {
    const nameDisplay = leader.name;
    const initial = nameDisplay.charAt(0);

    const card = document.createElement('div');
    card.className = 'leader-card reveal';
    card.style.transitionDelay = `${i * 0.06}s`;
    card.innerHTML = `
      <div class="leader-avatar">${initial}</div>
      <h3 class="leader-name">${nameDisplay}</h3>
      <span class="leader-role">${leader.role}</span>
      <p class="leader-bio">${leader.bio}</p>
      <div class="leader-hobbies">
        ${leader.hobbies.map(h => `<span class="leader-hobby-tag">${h}</span>`).join('')}
      </div>
      <p class="leader-motto">「${leader.motto}」</p>
    `;
    grid.appendChild(card);
  });

  // Trigger reveal animation after DOM update
  requestAnimationFrame(() => {
    document.querySelectorAll('#leadersGrid .reveal').forEach((el, i) => {
      setTimeout(() => el.classList.add('visible'), i * 80);
    });
  });
}

// ============================================
// Students Section
// ============================================

function renderStudents(students) {
  const grid = document.getElementById('studentsGrid');
  grid.innerHTML = '';

  students.forEach((student, i) => {
    const initial = student.name.charAt(0);
    const card = document.createElement('div');
    card.className = 'student-card reveal';
    card.style.transitionDelay = `${i * 0.03}s`;
    card.innerHTML = `
      <div class="student-avatar">${initial}</div>
      <div class="student-info">
        <div class="student-name">${student.name}</div>
        ${student.role ? `<span class="student-role-badge">${student.role}</span>` : ''}
        <p class="student-bio">${student.bio}</p>
      </div>
    `;
    card.addEventListener('click', () => showStudentDetail(student));
    grid.appendChild(card);
  });

  requestAnimationFrame(() => {
    document.querySelectorAll('#studentsGrid .reveal').forEach((el, i) => {
      setTimeout(() => el.classList.add('visible'), i * 50);
    });
  });
}

// Student Detail Modal
function showStudentDetail(student) {
  const existing = document.querySelector('.student-detail-overlay');
  if (existing) existing.remove();

  const initial = student.name.charAt(0);
  const overlay = document.createElement('div');
  overlay.className = 'student-detail-overlay';
  overlay.innerHTML = `
    <div class="student-detail">
      <button class="student-detail-close">&times;</button>
      <div class="student-detail-avatar">${initial}</div>
      <h2 class="student-detail-name">${student.name}</h2>
      ${student.role ? `<div class="student-detail-role">${student.role}</div>` : ''}
      <p class="student-detail-bio">${student.bio}</p>
      <div class="student-detail-hobbies">
        ${student.hobbies.map(h => `<span class="leader-hobby-tag">${h}</span>`).join('')}
      </div>
      <p class="student-detail-motto">「${student.motto}」</p>
    </div>
  `;

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay || e.target.classList.contains('student-detail-close')) {
      overlay.remove();
    }
  });

  document.addEventListener('keydown', function escClose(e) {
    if (e.key === 'Escape') {
      overlay.remove();
      document.removeEventListener('keydown', escClose);
    }
  });

  document.body.appendChild(overlay);
}

// Search & Filter
document.getElementById('studentSearch').addEventListener('input', (e) => {
  filterStudents();
});

document.querySelectorAll('.filter-tag').forEach(tag => {
  tag.addEventListener('click', function () {
    document.querySelectorAll('.filter-tag').forEach(t => t.classList.remove('active'));
    this.classList.add('active');
    filterStudents();
  });
});

function filterStudents() {
  const query = document.getElementById('studentSearch').value.trim();
  const filter = document.querySelector('.filter-tag.active').dataset.filter;

  let filtered = allStudents;

  if (filter === '班干部') {
    // Match role keywords for leaders
    const leaderRoles = ['班长', '副班长', '学习委员', '数学课代表', '文艺委员', '体育委员', '生活委员', '劳动委员', '语文课代表', '物理课代表', '英语课代表'];
    filtered = filtered.filter(s => leaderRoles.includes(s.role));
  } else if (filter === '课代表') {
    filtered = filtered.filter(s => s.role && s.role.includes('课代表'));
  }

  if (query) {
    filtered = filtered.filter(s => s.name.includes(query));
  }

  renderStudents(filtered);
}

// ============================================
// Scroll animations
// ============================================

function handleScrollReveal() {
  const reveals = document.querySelectorAll('.reveal:not(.visible)');
  const windowHeight = window.innerHeight;
  reveals.forEach(el => {
    const top = el.getBoundingClientRect().top;
    if (top < windowHeight - 80) {
      el.classList.add('visible');
    }
  });
}

// ============================================
// Navigation
// ============================================

function updateActiveNav() {
  const sections = ['intro', 'leaders', 'students', 'forum'];
  const navLinks = document.querySelectorAll('.nav-links a');
  const scrollPos = window.scrollY + 120;

  let current = '';
  sections.forEach(id => {
    const el = document.getElementById(id);
    if (el && el.offsetTop <= scrollPos) {
      current = id;
    }
  });

  navLinks.forEach(link => {
    link.classList.toggle('active', link.dataset.section === current);
  });
}

// Nav scroll effect
window.addEventListener('scroll', () => {
  const nav = document.getElementById('nav');
  nav.classList.toggle('scrolled', window.scrollY > 50);
  updateActiveNav();
});

// Mobile nav: create backdrop
const navBackdrop = document.createElement('div');
navBackdrop.className = 'nav-backdrop';
document.body.appendChild(navBackdrop);

function openMobileNav() {
  document.querySelector('.nav-links').classList.add('open');
  document.getElementById('navToggle').classList.add('open');
  navBackdrop.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeMobileNav() {
  document.querySelector('.nav-links').classList.remove('open');
  document.getElementById('navToggle').classList.remove('open');
  navBackdrop.classList.remove('open');
  document.body.style.overflow = '';
}

document.getElementById('navToggle').addEventListener('click', () => {
  const isOpen = document.querySelector('.nav-links').classList.contains('open');
  isOpen ? closeMobileNav() : openMobileNav();
});

navBackdrop.addEventListener('click', closeMobileNav);

// Close mobile nav on link click
document.querySelectorAll('.nav-links a').forEach(link => {
  link.addEventListener('click', closeMobileNav);
});

// ============================================
// Init
// ============================================

window.addEventListener('DOMContentLoaded', () => {
  loadData();
  // Initial reveal check
  setTimeout(handleScrollReveal, 300);
});

window.addEventListener('scroll', handleScrollReveal, { passive: true });
