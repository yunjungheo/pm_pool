/* =========================================
   index.html 전용
   - PM 리스트 렌더/검색/통계
   - 진행 예정 프로젝트 미리보기
   ========================================= */

document.addEventListener('DOMContentLoaded', () => {
  // ===== 요소 =====
  const searchInput       = document.getElementById('search-project');
  const statusFilter      = document.getElementById('status-filter');
  const tbody             = document.getElementById('project-tbody');
  const selectAllCheckbox = document.getElementById('select-all');

  // ===== 카드 높이 동기화 =====
  function syncCardHeights() {
    const left  = document.querySelector('.cards .card');
    const right = document.querySelector('.cards .card-summary');
    if (!left || !right) return;

    left.style.removeProperty('min-height');
    right.style.removeProperty('min-height');

    requestAnimationFrame(() => {
      const lh = left.getBoundingClientRect().height;
      const rh = right.getBoundingClientRect().height;
      if (lh < rh) left.style.minHeight = rh + 'px';
    });
  }

  // ===== 날짜 유틸 =====
  const normalizeDate = (s) => !s ? '' : String(s).replace(/\./g, '-'); // 'YYYY.MM.DD' → 'YYYY-MM-DD'
  const showPeriod    = (s, e) => {
    if (!s && !e) return '-';
    const sd = s ? s.replace(/-/g, '.') : '';
    const ed = e ? e.replace(/-/g, '.') : '';
    return [sd, ed].filter(Boolean).join(' ~ ');
  };


 // ===== 한 행 렌더 (PM_PROFILES → 테이블 스키마) =====
function addRowFromProfile(pm) {
  const name = pm.name || '';

  const noPlanned  = !!pm.noPlanned || (!pm.plannedProject && !pm.plannedCustomer && !pm.plannedStart && !pm.plannedEnd);
  const projectName = noPlanned || !pm.plannedProject   ? '(미배정)' : pm.plannedProject;
  const client      = noPlanned || !pm.plannedCustomer  ? '(미배정)' : pm.plannedCustomer;

  const startRaw = normalizeDate(pm.plannedStart || '');
  const endRaw   = normalizeDate(pm.plannedEnd   || '');

  // 진행률/상태(공통 로직)
  const { percent, status } = computeProgressAndStatus(startRaw, endRaw);
  const percentVal = (percent == null) ? 0 : percent;
  const periodText = (startRaw || endRaw) ? showPeriod(startRaw, endRaw) : '-';

  // ── 행 생성 ─────────────────────────────────────
  const tr = document.createElement('tr');
  tr.setAttribute('data-status', status);
  tr.setAttribute('data-project', projectName || '');

  // 체크박스
  const tdCheck = document.createElement('td');
  const cb = document.createElement('input');
  cb.type = 'checkbox';
  tdCheck.appendChild(cb);

  // 성함(상세 링크)
  const tdName = document.createElement('td');
  if (pm && pm.id) {
    const a = document.createElement('a');
    a.className = 'pm-link';
    a.textContent = name || '';
    // 실제 파일명과 대소문자 반드시 일치: pmProfile.html 기준
    a.href = `./pmProfile.html?id=${encodeURIComponent(pm.id)}`;
    tdName.appendChild(a);
  } else {
    tdName.textContent = name || '';
  }

  // 프로젝트/고객사/기간
  const tdProj   = document.createElement('td'); tdProj.textContent   = projectName;
  const tdClient = document.createElement('td'); tdClient.textContent = client;
  const tdPeriod = document.createElement('td'); tdPeriod.textContent = periodText;

  // 진행률
  const tdProg = document.createElement('td'); tdProg.className = 'progress-cell';
  const bar    = document.createElement('div'); bar.className = 'progress-bar';
  const inner  = document.createElement('div'); inner.className = 'progress-bar-inner';
  inner.style.width = (percent == null ? '0%' : `${percentVal}%`);
  if (status === '지연') inner.style.backgroundColor = '#8D3C3F'; // 선택
  bar.appendChild(inner);
  const percentSpan = document.createElement('span'); percentSpan.className = 'progress-percent';
  percentSpan.textContent = (percent == null ? 'X' : `${percentVal}%`);
  tdProg.append(bar, percentSpan);

  // 상태 뱃지
  const tdStatus = document.createElement('td');
  const statusBtn = document.createElement('button');
  statusBtn.className =
    'status-btn ' +
    (status === '투입대기' ? 'status-wait' :
     status === '투입중'   ? 'status-active' :
     status === '종료예정' ? 'status-nearend' :
                             'status-delay');
  statusBtn.textContent = status;
  statusBtn.disabled = true;
  tdStatus.appendChild(statusBtn);

  // 행 조립
  tr.append(tdCheck, tdName, tdProj, tdClient, tdPeriod, tdProg, tdStatus);
  tbody?.appendChild(tr);
}

  // ===== 통계(보이는 행 기준) =====
  function computeCountsFromDOM() {
    const rows = Array.from(tbody?.rows || []);
    const visible = rows.filter(r => r && r.style.display !== 'none' && r.offsetParent !== null);
    const c = { total: visible.length, wait: 0, active: 0, nearend: 0, delay: 0 };
    for (const r of visible) {
      const st = r.getAttribute('data-status');
      if (st === '투입대기') c.wait++;
      else if (st === '투입중') c.active++;
      else if (st === '종료예정') c.nearend++;
      else if (st === '지연') c.delay++;
    }
    return c;
  }
  function updateProjectStats() {
    const c = computeCountsFromDOM();
    const elTotal   = document.getElementById('stat-total');   if (elTotal)   elTotal.textContent   = String(c.total);
    const elWait    = document.getElementById('stat-wait');    if (elWait)    elWait.textContent    = String(c.wait);
    const elActive  = document.getElementById('stat-active');  if (elActive)  elActive.textContent  = String(c.active);
    const elNearend = document.getElementById('stat-nearend'); if (elNearend) elNearend.textContent = String(c.nearend);
    const elDelay   = document.getElementById('stat-delay');   if (elDelay)   elDelay.textContent   = String(c.delay);

  }

  // ===== 검색 & 필터 =====
  function filterProjects() {
    const q  = (searchInput?.value || '').trim().toLowerCase();
    const st = statusFilter?.value || '전체';

    Array.from(tbody?.rows || []).forEach(row => {
      const projectName = (row.getAttribute('data-project') || '').toLowerCase();
      const status      = row.getAttribute('data-status');
      const okSearch = projectName.includes(q);
      const okStatus = (st === '전체') || (status === st);
      row.style.display = (okSearch && okStatus) ? '' : 'none';
    });

    updateProjectStats();
    syncCardHeights();
  }
  searchInput?.addEventListener('input',  filterProjects);
  statusFilter?.addEventListener('change', filterProjects);

  // ===== 전체 선택 체크박스 =====
  selectAllCheckbox?.addEventListener('change', () => {
    const checked = selectAllCheckbox.checked;
    Array.from(tbody?.querySelectorAll('input[type="checkbox"]') || []).forEach(cb => { cb.checked = checked; });
  });

  // ===== 진행 예정 프로젝트(미리보기) =====
  const plannedListEl   = document.getElementById('planned-projects-list');
  const plannedMoreBtn  = document.getElementById('planned-more-btn');
  const PLANNED_VISIBLE = 3;
  const PLANNED_LOCK_ROWS = 3;
  let plannedCollapsed  = true;

  function lockPlannedListHeight(rowCount = PLANNED_LOCK_ROWS) {
    if (!plannedListEl) return;
    requestAnimationFrame(() => {
      const firstLi = plannedListEl.querySelector('li');
      const rowH = firstLi ? firstLi.getBoundingClientRect().height : 30;
      plannedListEl.style.height  = `${rowH * rowCount}px`;
      plannedListEl.style.overflow = 'auto';
    });
  }

  function renderPlannedPreview() {
    const listEl = plannedListEl;
    const moreBtn = plannedMoreBtn;
    if (!listEl) return;

    const projects = Array.isArray(loadPlanned?.()) ? loadPlanned() : [];
    listEl.innerHTML = '';

    const items = plannedCollapsed ? projects.slice(0, PLANNED_VISIBLE) : projects;
    items.forEach(p => {
      const li = document.createElement('li');
      const a  = document.createElement('a');
      a.className = 'planned-link';
      const title  = (p?.projName ?? p)?.toString() || '(제목 없음)';
      const client = (p?.projClient ?? '')?.toString();
      a.textContent = client ? `${title} (${client})` : title;
      a.href = p?.id ? `./planned.html?id=${encodeURIComponent(p.id)}` : './planned.html';
      a.setAttribute('aria-label', `${title} 상세 보기`);
      li.appendChild(a);
      listEl.appendChild(li);
    });

    if (moreBtn) {
      const showMore = projects.length >= 4;
      moreBtn.hidden = !showMore;
      if (showMore) {
        moreBtn.textContent = plannedCollapsed ? '더보기' : '간단히';
        moreBtn.setAttribute('aria-expanded', String(!plannedCollapsed));
      }
    }

    lockPlannedListHeight();
    syncCardHeights();
  }
  plannedMoreBtn?.addEventListener('click', () => {
    plannedCollapsed = !plannedCollapsed;
    renderPlannedPreview();
    syncCardHeights();
  });

  // ===== 초기 렌더 =====
  const profiles = Array.isArray(loadPMProfiles?.()) ? loadPMProfiles() : [];
  profiles.forEach(addRowFromProfile);
  updateProjectStats();
  renderPlannedPreview();
  syncCardHeights();

  // ===== 리사이즈 대응 =====
  window.addEventListener('resize', syncCardHeights);
});
