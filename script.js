document.addEventListener('DOMContentLoaded', () => {
  // ===== 기본 요소 =====
  const searchInput       = document.getElementById('search-project');
  const statusFilter      = document.getElementById('status-filter');
  const tbody             = document.getElementById('project-tbody');
  const selectAllCheckbox = document.getElementById('select-all');


  // ===== 높이 동기화 유틸 =====
  function syncCardHeights() {
    const left  = document.querySelector('.cards .card');
    const right = document.querySelector('.cards .card-summary');
    if (!left || !right) return;

    left.style.removeProperty('min-height');
    left.style.removeProperty('height');
    right.style.removeProperty('min-height');
    right.style.removeProperty('height');

    requestAnimationFrame(() => {
      const rightHeight = right.getBoundingClientRect().height;
      const leftHeight  = left.getBoundingClientRect().height;
      if (leftHeight < rightHeight) {
        left.style.minHeight = rightHeight + 'px';
      }
    });
  }

  // ===== 사이드패널 & 탭 =====
  const sidePanel     = document.getElementById('sidePanel');
  const closePanelBtn = document.getElementById('closePanelBtn');
  const hamburger         = document.getElementById('hamburger');
  // const tabButtons    = sidePanel ? sidePanel.querySelectorAll('.tab-btn') : [];
  // const tabContents   = sidePanel ? sidePanel.querySelectorAll('.tab-content') : [];

  const openPanel = () => {
    if (!sidePanel) return;
    sidePanel.classList.add('active');
    sidePanel.setAttribute('aria-hidden', 'false');
  };
  const closePanel = () => {
    if (!sidePanel) return;
    sidePanel.classList.remove('active');
    sidePanel.setAttribute('aria-hidden', 'true');
  };

  // 사이드패널
  // function openSidePanelAndTab(tabId) {
  //   openPanel();
  //   tabButtons.forEach(b => { b.classList.remove('active'); b.setAttribute('aria-selected','false'); });
  //   tabContents.forEach(p => p.classList.remove('active'));

  //   const tabBtn   = document.getElementById('tab-' + tabId);
  //   const tabPanel = document.getElementById(tabId);
  //   tabBtn?.classList.add('active');
  //   tabBtn?.setAttribute('aria-selected','true');
  //   tabPanel?.classList.add('active');
  // }

  hamburger?.addEventListener('click', openPanel);
  closePanelBtn?.addEventListener('click', closePanel);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closePanel(); });

  // 사이드패널
  // tabButtons.forEach(btn => {
  //   btn.addEventListener('click', () => {
  //     tabButtons.forEach(b => { b.classList.remove('active'); b.setAttribute('aria-selected','false'); });
  //     btn.classList.add('active'); btn.setAttribute('aria-selected','true');
  //     const target = btn.getAttribute('data-tab');
  //     tabContents.forEach(content => content.classList.toggle('active', content.id === target));
  //   });
  // });
  // const openParam = new URL(location.href).searchParams.get('open');
  // if (openParam) openSidePanelAndTab(openParam);

  // ===== PM등록시 데이터 리스트에 뿌려줌 =====
  let pmTableData     = loadPMData(); 
  let plannedProjects = loadPlanned();

  // ===== 날짜 유틸/상태 계산 =====
  function toDate(dstr) {
    if (!dstr) return null;
    const s = dstr.replace(/\./g, '-');
    const d = new Date(s + (s.length === 10 ? 'T00:00:00' : ''));
    return isNaN(d) ? null : d;
  }

  function pctElapsed(startStr, endStr, today = new Date()) {
    const s = toDate(startStr);
    const e = toDate(endStr);
    if (!s || !e || e <= s) return 0;
    const t = today;
    if (t <= s) return 0;
    if (t >= e) return 100;
    const total = e - s;
    const gone  = t - s;
    return Math.round((gone / total) * 100);
  }

  // 오늘 < 시작: 투입대기 / 기간 내: (종료 7일 전부터 종료예정, 그 외 투입중) / 오늘 > 종료: 지연
  function deriveStatusByDates(startStr, endStr, today = new Date()) {
    const s = toDate(startStr);
    const e = toDate(endStr);
    if (!s || !e || e <= s) return '투입대기';
    const t = today;
    if (t < s) return '투입대기';
    if (t > e) return '지연';
    const ONE_DAY  = 24 * 60 * 60 * 1000;
    const daysLeft = Math.ceil((e - t) / ONE_DAY);
    if (daysLeft <= 7) return '종료예정';
    return '투입중';
  }

  function fmtDateDot(s) {
    if (!s) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s.replace(/-/g, '.');
    return s;
  }

  // ===== 테이블 렌더 =====
  function addRowFromData(data) {
    const { name, projectName, client, start, end, noPlanned } = data;

    let percentVal, status, periodText;
    if (noPlanned) {
      percentVal = 0;
      status     = '투입대기';
      periodText = '-';
    } else {
      percentVal = pctElapsed(start, end);
      status     = deriveStatusByDates(start, end);
      periodText = [fmtDateDot(start), fmtDateDot(end)].filter(Boolean).join(' ~ ');
    }

    const tr = document.createElement('tr');
    tr.setAttribute('data-status', status);
    tr.setAttribute('data-project', projectName || '');

    // 체크박스
    const tdCheck = document.createElement('td');
    const cb      = document.createElement('input');
    cb.type = 'checkbox';
    tdCheck.appendChild(cb);

    // 텍스트 셀
    const tdName   = document.createElement('td'); tdName.textContent   = name || '';
    const tdProj   = document.createElement('td'); tdProj.textContent   = projectName || '';
    const tdClient = document.createElement('td'); tdClient.textContent = client || '';
    const tdPeriod = document.createElement('td'); tdPeriod.textContent = periodText;

    // 진행률
    const tdProg = document.createElement('td'); tdProg.className = 'progress-cell';
    const bar    = document.createElement('div'); bar.className = 'progress-bar';
    const inner  = document.createElement('div'); inner.className = 'progress-bar-inner';
    inner.style.width = `${percentVal}%`;
    if (status === '지연') inner.style.backgroundColor = '#a94442';
    bar.appendChild(inner);
    const percent = document.createElement('span'); percent.className = 'progress-percent';
    percent.textContent = `${percentVal}%`;
    tdProg.append(bar, percent);

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

    tr.append(tdCheck, tdName, tdProj, tdClient, tdPeriod, tdProg, tdStatus);
    tbody?.appendChild(tr);
  }

  // ===== 통계(보이는 행 기준) =====
  function computeCountsFromDOM() {
    const rows = Array.from(tbody?.rows || []);
    const isVisible   = (el) => el && !el.hidden && el.style.display !== 'none' && el.offsetParent !== null;
    const visibleRows = rows.filter(isVisible);

    const counts = { total: visibleRows.length, wait: 0, active: 0, nearend: 0, delay: 0 };
    for (const r of visibleRows) {
      const st = r.getAttribute('data-status');
      if (st === '투입대기') counts.wait++;
      else if (st === '투입중') counts.active++;
      else if (st === '종료예정') counts.nearend++;
      else if (st === '지연') counts.delay++;
    }
    return counts;
  }

  function updateProjectStats() {
    const c = computeCountsFromDOM();
    document.getElementById('stat-total') ?.replaceChildren(document.createTextNode(String(c.total)));
    document.getElementById('stat-wait')  ?.replaceChildren(document.createTextNode(String(c.wait)));
    document.getElementById('stat-active')?.replaceChildren(document.createTextNode(String(c.active)));
    document.getElementById('stat-nearend')?.replaceChildren(document.createTextNode(String(c.nearend)));
    document.getElementById('stat-delay') ?.replaceChildren(document.createTextNode(String(c.delay)));
  }

  // ===== 검색 & 필터 =====
  function filterProjects() {
    const q  = (searchInput?.value || '').trim().toLowerCase();
    const st = statusFilter?.value || '전체';

    Array.from(tbody?.rows || []).forEach(row => {
      const projectName = (row.getAttribute('data-project') || '').toLowerCase();
      const status      = row.getAttribute('data-status');
      const matchesSearch = projectName.includes(q);
      const matchesStatus = st === '전체' || status === st;
      row.style.display = (matchesSearch && matchesStatus) ? '' : 'none';
    });

    updateProjectStats();
    syncCardHeights();
  }
  searchInput?.addEventListener('input',  filterProjects);
  statusFilter?.addEventListener('change', filterProjects);

  // ===== 전체 선택 체크박스 =====
  selectAllCheckbox?.addEventListener('change', () => {
    const checked = selectAllCheckbox.checked;
    Array.from(tbody?.querySelectorAll('input[type="checkbox"]') || [])
      .forEach(cb => { cb.checked = checked; });
  });

  // ===== "PM 등록" / "프로젝트 등록" 버튼 → 탭 열기 =====
  document.getElementById('openRegisterModalBtn')
    ?.addEventListener('click', () => openSidePanelAndTab('pmRegister'));
  document.getElementById('openProjectRegisterBtn')
    ?.addEventListener('click', () => openSidePanelAndTab('projectRegister'));

  // ===== PM 등록 폼: 기간 없음 체크 처리 + 저장 =====
  const pmForm        = document.getElementById('registerFormSidebar');
  const pmStartInput  = document.getElementById('pmStartDate');
  const pmEndInput    = document.getElementById('pmEndDate');
  const noPlannedCb   = document.getElementById('noPlannedProject');

  function syncPlannedCheckbox() {
    if (!pmStartInput || !pmEndInput || !noPlannedCb) return;
    if (noPlannedCb.checked) {
      pmStartInput.removeAttribute('required');
      pmEndInput.removeAttribute('required');
      pmStartInput.setAttribute('disabled', 'disabled');
      pmEndInput.setAttribute('disabled', 'disabled');
      pmStartInput.value = '';
      pmEndInput.value   = '';
    } else {
      pmStartInput.removeAttribute('disabled');
      pmEndInput.removeAttribute('disabled');
      pmStartInput.setAttribute('required', 'required');
      pmEndInput.setAttribute('required', 'required');
    }
  }
  noPlannedCb?.addEventListener('change', syncPlannedCheckbox);
  syncPlannedCheckbox();

  pmForm?.addEventListener('submit', (e) => {
    e.preventDefault();

    const name        = pmForm.elements['name']?.value?.trim();
    const projectName = pmForm.elements['projectName']?.value?.trim();
    const client      = pmForm.elements['client']?.value?.trim();

    const start     = pmStartInput?.value || '';
    const end       = pmEndInput?.value   || '';
    const noPlanned = !!noPlannedCb?.checked;

    // 기간은 noPlanned이면 생략 허용
    if (!name || !projectName || !client || (!noPlanned && (!start || !end))) {
      alert('항목을 확인해 주세요. (기간은 "계획된 프로젝트 없음" 체크 시 생략 가능)');
      return;
    }

    const rowData = { name, projectName, client, start, end, noPlanned };
    pmTableData.push(rowData);
    savePMData(pmTableData);

    addRowFromData(rowData);
    updateProjectStats();
    pmForm.reset();
    syncPlannedCheckbox();
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
      const rowH    = firstLi ? firstLi.getBoundingClientRect().height : 30;
      plannedListEl.style.height  = `${rowH * rowCount}px`;
      plannedListEl.style.overflow = 'auto';
    });
  }

  function renderPlannedPreview() {
    const listEl = document.getElementById('planned-projects-list');
    const moreBtn = document.getElementById('planned-more-btn');
    if (!listEl) return;

    plannedProjects = Array.isArray(loadPlanned?.()) ? loadPlanned() : [];
    listEl.innerHTML = '';

    const items = plannedCollapsed
      ? plannedProjects.slice(0, PLANNED_VISIBLE)
      : plannedProjects;

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
      const showMore = plannedProjects.length >= 4;
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

  const projectRegisterForm = document.getElementById('projectRegisterForm');
  projectRegisterForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const f = e.currentTarget;

    const item = {
      id: uid(),
      projName:     f.projName.value.trim(),
      projClient:   f.projClient.value.trim(),
      projStartDate:f.projStartDate.value,
      projEndDate:  f.projEndDate.value,
      budget:       f.budget.value ? Number(f.budget.value) : null,
      memo:         f.memo.value.trim()
    };

    if (!item.projName || !item.projStartDate || !item.projEndDate) {
      alert('프로젝트명/기간을 확인해 주세요.');
      return;
    }

    plannedProjects.push(item);
    savePlanned(plannedProjects);
    renderPlannedPreview();
    alert('등록되었습니다.');
    f.reset();
  });

  // ===== 초기 렌더 =====
  pmTableData.forEach(addRowFromData);
  updateProjectStats();
  renderPlannedPreview();
  syncCardHeights();

  // ===== 리사이즈 대응 =====
  window.addEventListener('resize', syncCardHeights);
});
