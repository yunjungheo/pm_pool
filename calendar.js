document.addEventListener('DOMContentLoaded', () => {
  
  // ===== 데이터 로드 =====
  function loadPMData() {
    try { return JSON.parse(localStorage.getItem('pmTableData')) || []; }
    catch { return []; }
  }
  const pmTableData = loadPMData();

  // ===== 유틸 =====
  const $ = (sel) => document.querySelector(sel);

  function ymd(date){ // YYYY-MM-DD
    const y=date.getFullYear(), m=String(date.getMonth()+1).padStart(2,'0'), d=String(date.getDate()).padStart(2,'0');
    return `${y}-${m}-${d}`;
  }
  function firstDayOfMonth(d){ return new Date(d.getFullYear(), d.getMonth(), 1); }
  function lastDayOfMonth(d){ return new Date(d.getFullYear(), d.getMonth()+1, 0); }

  // 진행률→상태 (지연/진행중/완료)
  function deriveStatus(progress){
    if (+progress >= 100) return '완료';
    if (+progress >= 50)  return '진행중';
    return '지연';
  }
  // 캘린더 뱃지용: 투입대기/투입중/완료
  function computeAssignState(row){
    const today = new Date();
    const s = new Date(row.start);
    const e = row.end ? new Date(row.end) : null;
    if (today < s) return 'pending';
    if (+row.progress >= 100) return 'done';
    if (e && today > e) return 'done';
    return 'active';
  }

  // ===== 캘린더 셀 빌드 =====
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
        const dateStr = ymd(dt);

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

  // ===== 아이템 렌더: 시작일에만 꽂기 =====
  function renderCalendarItems(baseDate){
    const filter = $('#calStateFilter')?.value || 'all';
    const wraps = new Map(Array.from(document.querySelectorAll('.cal-items')).map(el => [el.dataset.date, el]));

    const y = baseDate.getFullYear();
    const m = baseDate.getMonth();
    const monthFirst = new Date(y, m, 1);
    const monthLast  = lastDayOfMonth(monthFirst);

    for (const row of pmTableData){
      if (!row.start) continue;
      const start = new Date(row.start);
      if (start < monthFirst || start > monthLast) continue;

      const state = computeAssignState(row); // 'active' | 'pending' | 'done'
      if (filter !== 'all' && state !== filter) continue;

      const wrap = wraps.get(ymd(start));
      if (!wrap) continue;

      const item = document.createElement('div');
      item.className = 'cal-item';
      const pill = document.createElement('span');
      pill.className = 'pill ' + (state==='active' ? 'pill-active' : state==='pending' ? 'pill-pending' : 'pill-done');
      pill.textContent = state==='active' ? '투입중' : state==='pending' ? '투입대기' : '완료';

      const who = document.createElement('span'); who.className = 'who'; who.textContent = row.name || '';
      const text = document.createElement('span'); text.textContent = ` ${row.projectName || ''}`;

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

  // ===== 이벤트/초기화 =====
  $('#btnBackToList')?.addEventListener('click', () => location.href = 'index.html');

 const monthInput = document.getElementById('calMonthInput');
if (monthInput && !monthInput.value) {
  const t = new Date();
  monthInput.value = `${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,'0')}`;
}
  $('#calPrevBtn')?.addEventListener('click', () => {
    const d = new Date(monthInput.value + '-01'); d.setMonth(d.getMonth()-1);
    monthInput.value = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    renderCalendar();
  });
  $('#calNextBtn')?.addEventListener('click', () => {
    const d = new Date(monthInput.value + '-01'); d.setMonth(d.getMonth()+1);
    monthInput.value = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    renderCalendar();
  });
  $('#calStateFilter')?.addEventListener('change', renderCalendar);

  // 첫 렌더
  renderCalendar();
});
