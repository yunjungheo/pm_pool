document.addEventListener('DOMContentLoaded', () => {
  // ===== 로컬 저장소 유틸 =====
  const LS_PM_KEY = 'pmTableData';
  const LS_PLANNED_KEY = 'plannedProjects';

  function savePMData(arr) {
    try { localStorage.setItem(LS_PM_KEY, JSON.stringify(arr)); } catch {}
  }
  function loadPMData() {
    try { return JSON.parse(localStorage.getItem(LS_PM_KEY)) || []; } catch { return []; }
  }

  function savePlanned(arr) {
    try { localStorage.setItem(LS_PLANNED_KEY, JSON.stringify(arr)); } catch {}
  }
  function loadPlanned() {
    try { return JSON.parse(localStorage.getItem(LS_PLANNED_KEY)) || []; } catch { return []; }
  }


  // ===== 유틸 & 통계 함수 (맨 위) =====
  function deriveStatus(progress) {
    if (progress >= 100) return '완료';
    if (progress >= 50)  return '진행중';
    return '지연';
  }

  // 보이는 행만 집계
  function computeCountsFromDOM() {
    const rows = Array.from(tbody?.rows || []);
    const isVisible = (el) => el && !el.hidden && el.style.display !== 'none' && el.offsetParent !== null;
    const visibleRows = rows.filter(isVisible);

    const counts = { total: visibleRows.length, progress: 0, complete: 0, delay: 0 };
    for (const r of visibleRows) {
      const st = r.getAttribute('data-status');
      if (st === '완료') counts.complete++;
      else if (st === '진행중') counts.progress++;
      else if (st === '지연') counts.delay++;
    }
    return counts;
  }

  function updateProjectStats() {
    const counts = computeCountsFromDOM();
    if (statTotalEl)  statTotalEl.textContent  = String(counts.total);
    if (statProgEl)   statProgEl.textContent   = String(counts.progress);
    if (statCompEl)   statCompEl.textContent   = String(counts.complete);
    if (statDelayEl)  statDelayEl.textContent  = String(counts.delay);
  }















  // ===== 기본 요소 =====
  const searchInput = document.getElementById('search-project');
  const statusFilter = document.getElementById('status-filter');
  const tbody = document.getElementById('project-tbody');
  const selectAllCheckbox = document.getElementById('select-all');
  const hamburger = document.getElementById('hamburger');

  // ===== 통계 카드 요소 =====
  // 예시: <strong id="stat-total"></strong> 같은 곳에 숫자가 들어갑니다.
  const statTotalEl   = document.getElementById('stat-total');
  const statProgEl    = document.getElementById('stat-progress');  // 진행중
  const statCompEl    = document.getElementById('stat-complete');  // 완료
  const statDelayEl   = document.getElementById('stat-delay');     // 지연

  // ===== 사이드패널 & 탭 =====
  const sidePanel = document.getElementById('sidePanel');
  const closePanelBtn = document.getElementById('closePanelBtn');
  const tabButtons = sidePanel ? sidePanel.querySelectorAll('.tab-btn') : [];
  const tabContents = sidePanel ? sidePanel.querySelectorAll('.tab-content') : [];

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

// ===== 상태 집계 =====
// (A) 데이터 모델(pmTableData)에서 집계
function computeCountsFromData(dataArr) {
  const counts = { total: 0, progress: 0, complete: 0, delay: 0 };
  counts.total = dataArr.length;
  for (const row of dataArr) {
    const st = deriveStatus(Number(row.progress ?? 0));
    if (st === '완료') counts.complete++;
    else if (st === '진행중') counts.progress++;
    else counts.delay++;
  }
  return counts;
}
  // ===== 통계 (보이는 행 기준) =====
function computeCountsFromDOM() {
  const tableBody = document.getElementById('project-tbody');
  const rows = Array.from(tableBody?.rows || []);
  const isVisible = (el) => el && !el.hidden && el.style.display !== 'none' && el.offsetParent !== null;
  const visibleRows = rows.filter(isVisible);

  const counts = { total: visibleRows.length, progress: 0, complete: 0, delay: 0 };
  for (const r of visibleRows) {
    const st = r.getAttribute('data-status');
    if (st === '완료') counts.complete++;
    else if (st === '진행중') counts.progress++;
    else if (st === '지연') counts.delay++;
  }
  return counts;
}
function updateProjectStats() {
  const counts = computeCountsFromDOM();
  if (statTotalEl)  statTotalEl.textContent  = String(counts.total);
  if (statProgEl)   statProgEl.textContent   = String(counts.progress);
  if (statCompEl)   statCompEl.textContent   = String(counts.complete);
  if (statDelayEl)  statDelayEl.textContent  = String(counts.delay);
}



  // 공통: 사이드패널 열고 원하는 탭으로 이동
  function openSidePanelAndTab(tabId) {
    openPanel();
    // 모든 탭/패널 비활성화
    tabButtons.forEach(b => {
      b.classList.remove('active');
      b.setAttribute('aria-selected', 'false');
    });
    tabContents.forEach(p => p.classList.remove('active'));

    // 지정 탭 활성화
    const tabBtn = document.getElementById('tab-' + tabId);  // 예: tab-pmRegister
    const tabPanel = document.getElementById(tabId);         // 예: pmRegister
    tabBtn?.classList.add('active');
    tabBtn?.setAttribute('aria-selected', 'true');
    tabPanel?.classList.add('active');
  }

  // 헤더/패널 제어
  hamburger?.addEventListener('click', openPanel);
  closePanelBtn?.addEventListener('click', closePanel);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closePanel();
  });

  // 탭 버튼 클릭 시 전환
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      tabButtons.forEach(b => { b.classList.remove('active'); b.setAttribute('aria-selected','false'); });
      btn.classList.add('active'); btn.setAttribute('aria-selected','true');

      const target = btn.getAttribute('data-tab');
      tabContents.forEach(content => {
        content.classList.toggle('active', content.id === target);
      });
    });
  });

  // ===== "PM 등록" / "프로젝트 등록" 버튼 → 각 탭으로 이동 =====
  const openPMBtn = document.getElementById('openRegisterModalBtn');       // PM풀 탐색 영역의 "PM 등록"
  const openProjectBtn = document.getElementById('openProjectRegisterBtn'); // 진행 예정 카드의 "프로젝트 등록"
  openPMBtn?.addEventListener('click', () => openSidePanelAndTab('pmRegister'));
  openProjectBtn?.addEventListener('click', () => openSidePanelAndTab('projectRegister'));

  // ===== 검색 & 필터 =====
  function filterProjects() {
    const searchText = (searchInput?.value || '').trim().toLowerCase();
    const statusValue = statusFilter?.value || '전체';

    Array.from(tbody?.rows || []).forEach(row => {
      const projectName = (row.getAttribute('data-project') || '').toLowerCase();
      const status = row.getAttribute('data-status');

      const matchesSearch = projectName.includes(searchText);
      const matchesStatus = statusValue === '전체' || status === statusValue;

      row.style.display = (matchesSearch && matchesStatus) ? '' : 'none';
    });
    updateProjectStats();
  }

  searchInput?.addEventListener('input', filterProjects);
  statusFilter?.addEventListener('change', filterProjects);

  // ===== 전체 선택 체크박스 =====
  selectAllCheckbox?.addEventListener('change', () => {
    const checked = selectAllCheckbox.checked;
    Array.from(tbody?.querySelectorAll('input[type="checkbox"]') || []).forEach(cb => {
      cb.checked = checked;
    });
  });

  // ===== PM 등록 폼 제출 → 메인 테이블에 행 추가 =====
  const pmForm = document.getElementById('registerFormSidebar'); // 사이드패널의 PM 등록 폼
  pmForm?.addEventListener('submit', (e) => {
  e.preventDefault();

  const name = pmForm.elements['name']?.value?.trim();
  const projectName = pmForm.elements['projectName']?.value?.trim();
  const client = pmForm.elements['client']?.value?.trim();

  // 날짜 값 가져오기 (name 기반 + 보정용 id 기반)
  const start = pmForm.elements['startDate']?.value || pmForm.querySelector('#pmStartDate')?.value || '';
  const end   = pmForm.elements['endDate']?.value   || pmForm.querySelector('#pmEndDate')?.value   || '';

  // 진행률 숫자 검증/정규화
  const progressRaw = Number(pmForm.elements['progress']?.value);
  if (!Number.isFinite(progressRaw)) {
    alert('진행률을 숫자로 입력해주세요.');
    return;
  }
  const progress = Math.max(0, Math.min(100, Math.round(progressRaw)));

  // ✅ 진행률에서 상태를 ‘항상’ 자동 계산 (폼의 status 입력값은 무시)
  const status = deriveStatus(progress);

  // 필수값 검증 (status는 위에서 자동산출)
  if (!name || !projectName || !client || !start || !end) {
    alert('모든 항목을 올바르게 입력해주세요.');
    return;
  }
  //✅ 저장할 데이터 객체
  const rowData = { name, projectName, client, start, end, progress };

  // ✅ 메모리 모델에 추가 + localStorage 저장
  pmTableData.push(rowData);
  savePMData(pmTableData);

  
  // ✅ 통계 업데이트
  updateProjectStats();
  pmForm.reset();
  // ✅ 화면에 그리기(공통 함수)
  addRowFromData(rowData);
  // ✅ 통계 갱신
  updateProjectStats();
  // ✅ 폼 리셋
  pmForm.reset();
});

  // ===== 진행 예정 프로젝트 리스트: 프로젝트명만 관리 + 더보기/간단히 =====
  const plannedListEl = document.getElementById('planned-projects-list');
  const plannedMoreBtn = document.getElementById('planned-more-btn');
  //let plannedProjects = [];     // 프로젝트명만 저장
  let plannedCollapsed = true;  // true: 5개만 표시
  // ===== 데이터 모델 (메모리) =====
  let pmTableData = loadPMData();     // PM 테이블 데이터(객체 배열)
  let plannedProjects = loadPlanned(); // 진행 예정 프로젝트명 리스트 (문자열 배열)
  // ===== 테이블 행 렌더링 =====
function addRowFromData(data) {
  const { name, projectName, client, start, end, progress } = data;
  const status = deriveStatus(Number(progress) || 0);

  // "YYYY-MM" 혹은 "YYYY-MM-DD"를 "YYYY.MM"으로 보이게
  const fmt = (v='') => String(v).replace(/-/g, '.').slice(0, 7);
  const periodText = `${fmt(start)} - ${fmt(end)}`;

  const tr = document.createElement('tr');
  tr.setAttribute('data-status', status);
  tr.setAttribute('data-project', projectName || '');

  // 체크박스
  const tdCheck = document.createElement('td');
  const cb = document.createElement('input');
  cb.type = 'checkbox';
  tdCheck.appendChild(cb);

  // 기본 셀들
  const tdName   = document.createElement('td'); tdName.textContent   = name || '';
  const tdProj   = document.createElement('td'); tdProj.textContent   = projectName || '';
  const tdClient = document.createElement('td'); tdClient.textContent = client || '';
  const tdPeriod = document.createElement('td'); tdPeriod.textContent = periodText;

  // 진행률 영역
  const tdProg = document.createElement('td'); tdProg.className = 'progress-cell';
  const bar = document.createElement('div');   bar.className = 'progress-bar';
  const inner = document.createElement('div'); inner.className = 'progress-bar-inner';
  inner.style.width = `${Math.max(0, Math.min(100, Number(progress) || 0))}%`;
  if (status === '지연') inner.style.backgroundColor = '#a94442';
  bar.appendChild(inner);
  const percent = document.createElement('span'); percent.className = 'progress-percent'; percent.textContent = `${progress}%`;
  tdProg.append(bar, percent);

  // 상태 버튼
  const tdStatus = document.createElement('td');
  const statusBtn = document.createElement('button');
  statusBtn.className = 'status-btn';
  if (status === '진행중') statusBtn.classList.add('status-progress');
  else if (status === '완료') statusBtn.classList.add('status-complete');
  else statusBtn.classList.add('status-delay');
  statusBtn.textContent = status;
  statusBtn.disabled = true;
  tdStatus.appendChild(statusBtn);

  tr.append(tdCheck, tdName, tdProj, tdClient, tdPeriod, tdProg, tdStatus);
  tbody?.appendChild(tr);
}


  function renderPlannedProjects() {
    if (!plannedListEl) return;

    plannedListEl.innerHTML = '';
    const limit = 5;
    const items = plannedCollapsed ? plannedProjects.slice(0, limit) : plannedProjects;

    for (const name of items) {
      const li = document.createElement('li');
      li.textContent = name;
      plannedListEl.appendChild(li);
    }

    if (plannedMoreBtn) {
      if (plannedProjects.length > limit) {
        plannedMoreBtn.hidden = false;
        plannedMoreBtn.innerHTML = plannedCollapsed
          ? '더보기 <span class="icon">▼</span>'
          : '간단히 <span class="icon">▲</span>';
        plannedMoreBtn.setAttribute('aria-expanded', String(!plannedCollapsed));
      } else {
        plannedMoreBtn.hidden = true;
      }
    }
  }

  plannedMoreBtn?.addEventListener('click', () => {
    plannedCollapsed = !plannedCollapsed;
    renderPlannedProjects();
  });

  // "진행 예정 프로젝트" 카드의 버튼 → 프로젝트 등록 탭 열기
  document.getElementById('openProjectRegisterBtn')?.addEventListener('click', () => {
    openSidePanelAndTab('projectRegister');
  });

  // 프로젝트 등록 폼 제출 → 진행 예정 리스트에 '프로젝트명'만 추가
  const projectRegisterForm = document.getElementById('projectRegisterForm');
  projectRegisterForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const form = e.currentTarget;

    const projName = form.elements['projName']?.value?.trim();
    if (!projName) {
      alert('프로젝트명을 입력하세요.');
      return;
    }

    // (선택) 중복 방지 원하면 주석 해제
    // if (plannedProjects.includes(projName)) {
    //   alert('이미 등록된 프로젝트명입니다.');
    //   return;
    // }

    plannedProjects.push(projName);
    savePlanned(plannedProjects); 
    renderPlannedProjects();

    form.reset();
    // 필요 시 패널 닫기 원하면 주석 해제
    // closePanel();
  });
  // 저장된 PM 데이터로 테이블 채우기
  pmTableData.forEach(addRowFromData);

  // 진행 예정 리스트 렌더
  renderPlannedProjects();

  // 초기 통계 세팅
  updateProjectStats();
});
