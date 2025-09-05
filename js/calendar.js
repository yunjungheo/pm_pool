document.addEventListener('DOMContentLoaded', () => {
  /* =========== 데이터 로드 (PM_PROFILES 우선, 레거시 pmTableData 백업) =========== */
  function loadPMProfiles() {
    try { return JSON.parse(localStorage.getItem('PM_PROFILES')) || []; }
    catch { return []; }
  }
  function loadPMTableLegacy() {
    try { return JSON.parse(localStorage.getItem('pmTableData')) || []; }
    catch { return []; }
  }

  // 캘린더가 사용할 통합 데이터: PM_PROFILES → (fallback) pmTableData
  function loadCalendarRows() {
    const profiles = loadPMProfiles();
    if (Array.isArray(profiles) && profiles.length) {
      // PM_PROFILES 스키마 → 캘린더 표준 스키마로 변환
      return profiles.map(p => ({
        id: p.id,
        name: p.name || '',
        projectName: p.plannedProject || '(미배정)',
        start: (p.plannedStart || '').replace(/\./g, '-'),
        end:   (p.plannedEnd   || '').replace(/\./g, '-')
      }));
    }
    // 레거시 스키마
    const legacy = loadPMTableLegacy();
    return legacy.map(r => ({
      id: r.id,
      name: r.name || '',
      projectName: r.projectName || '(미배정)',
      start: (r.start || '').replace(/\./g, '-'),
      end:   (r.end   || '').replace(/\./g, '-')
    }));
  }

  let rows = loadCalendarRows();

  /* =================== 유틸 =================== */
  const $ = (sel) => document.querySelector(sel);
  function ymd(date){ // YYYY-MM
    const y=date.getFullYear(), m=String(date.getMonth()+1).padStart(2,'0');
    return `${y}-${m}`;
  }
  function ymdDay(date){ // YYYY-MM-DD
    const y=date.getFullYear(), m=String(date.getMonth()+1).padStart(2,'0'), d=String(date.getDate()).padStart(2,'0');
    return `${y}-${m}-${d}`;
  }
  function firstDayOfMonth(d){ return new Date(d.getFullYear(), d.getMonth(), 1); }
  function lastDayOfMonth(d){ return new Date(d.getFullYear(), d.getMonth()+1, 0); }

  // 진행률/상태 규칙: common.js에 있으면 그걸 사용, 없으면 동일 로직 폴백
  const computePS = (typeof window.computeProgressAndStatus === 'function')
    ? window.computeProgressAndStatus
    : function computeProgressAndStatus(startStr, endStr) {
        const norm = (s) => (s || '').replace(/\./g, '-');
        const sStr = norm(startStr), eStr = norm(endStr);
        if (!sStr || !eStr) return { percent: null, text: 'X', status: '투입대기' };
        const s = new Date(sStr), e = new Date(eStr);
        if (isNaN(+s) || isNaN(+e) || e <= s) return { percent: null, text: 'X', status: '투입대기' };

        const today = new Date();
        let ratio;
        if (today <= s)      ratio = 0;
        else if (today >= e) ratio = 1;
        else                 ratio = (today - s) / (e - s);
        const percent = Math.round(Math.max(0, Math.min(1, ratio)) * 100);

        let status;
        if (today < s) status = '투입대기';
        else if (today > e) status = '지연';
        else {
          const ONE_DAY = 24*60*60*1000;
          const daysLeft = Math.ceil((e - today) / ONE_DAY);
          status = (daysLeft <= 7) ? '종료예정' : '투입중';
        }
        return { percent, text: `${percent}%`, status };
      };

  // 캘린더 필터 값 호환 (기존: all/active/pending/done → 새: 전체/투입중/투입대기/종료예정/지연)
  function normalizeFilterValue(v) {
    switch (v) {
      case 'all': return '전체';
      case 'active': return '투입중';
      case 'pending': return '투입대기';
      case 'done': return '종료예정'; // 과거 'done'을 종료예정으로 매핑(완료 개념 없으니 가깝게)
      default: return v || '전체';
    }
  }

  /* =================== 캘린더 빌드 =================== */
  function buildCalendarCells(baseDate){
    const body = $('#calBody');
    body.innerHTML = '';

    const first = firstDayOfMonth(baseDate);
    const last  = lastDayOfMonth(baseDate);
    const startWeekday = first.getDay();     // 0=Sun
    const totalDays    = last.getDate();
    const totalCells   = Math.ceil((startWeekday + totalDays) / 7) * 7; // 35 또는 42

    for (let i=0; i<totalCells; i++){
      const cell = document.createElement('div');
      cell.className = 'cal-cell';

      const dayNum = i - startWeekday + 1; // 1..totalDays
      if (dayNum>=1 && dayNum<=totalDays){
        const dt = new Date(baseDate.getFullYear(), baseDate.getMonth(), dayNum);
        const dateStr = ymdDay(dt);

        const dateEl = document.createElement('div');
        dateEl.className = 'cal-date';
        dateEl.textContent = `${dayNum}`;
        cell.appendChild(dateEl);

        const items = document.createElement('div');
        items.className = 'cal-items';
        items.dataset.date = dateStr;
        cell.appendChild(items);
      }
      body.appendChild(cell);
    }
  }

  /* =================== 렌더 (시작일에만 꽂기) =================== */
  function renderCalendarItems(baseDate){
    const rawFilter = $('#calStateFilter')?.value || '전체';
    const filter = normalizeFilterValue(rawFilter);
    const wraps = new Map(Array.from(document.querySelectorAll('.cal-items')).map(el => [el.dataset.date, el]));

    const y = baseDate.getFullYear();
    const m = baseDate.getMonth();
    const monthFirst = new Date(y, m, 1);
    const monthLast  = lastDayOfMonth(monthFirst);

    for (const row of rows){
      if (!row.start) continue;
      const start = new Date(row.start.replace(/\./g, '-'));
      if (isNaN(+start)) continue;
      if (start < monthFirst || start > monthLast) continue;

      // 동일 규칙으로 상태/퍼센트 산출
      const { status } = computePS(row.start, row.end);

      // 필터
      if (filter !== '전체' && status !== filter) continue;

      const wrap = wraps.get(ymdDay(start));
      if (!wrap) continue;

      // 뱃지 클래스 매핑 (필요시 CSS에 색상 추가)
      const pillClass =
      status === '투입대기' ? 'status-wait' :
      status === '투입중'   ? 'status-active' :
      status === '종료예정' ? 'status-nearend' :
                            'status-delay';

      const item = document.createElement('div');
      item.className = 'cal-item';

      const pill = document.createElement('span');
      pill.className = 'pill ' + pillClass;
      pill.textContent = status;

      const who  = document.createElement('span'); 
      who.className = 'who'; 
      who.textContent = row.name || '';

      const text = document.createElement('span'); 
      text.textContent = ` ${row.projectName || ''}`;

      item.append(pill, who, text);
      wrap.appendChild(item);
    }
  }

  function renderCalendar(){
    const input = $('#calMonthInput');
    const base  = input?.value ? new Date(input.value + '-01') : new Date();
    buildCalendarCells(base);
    renderCalendarItems(base);
  }

  /* =================== 이벤트/초기화 =================== */
  $('#btnBackToList')?.addEventListener('click', () => location.href = 'index.html');

  const monthInput = document.getElementById('calMonthInput');
  if (monthInput && !monthInput.value) {
    monthInput.value = ymd(new Date());
  }

  $('#calPrevBtn')?.addEventListener('click', () => {
    const d = new Date(monthInput.value + '-01'); d.setMonth(d.getMonth()-1);
    monthInput.value = ymd(d);
    renderCalendar();
  });
  $('#calNextBtn')?.addEventListener('click', () => {
    const d = new Date(monthInput.value + '-01'); d.setMonth(d.getMonth()+1);
    monthInput.value = ymd(d);
    renderCalendar();
  });
  $('#calStateFilter')?.addEventListener('change', renderCalendar);

  // 첫 렌더
  renderCalendar();
});
