/* =========================================
   모든 페이지 공통 (로컬스토리지/유틸/사이드패널)
   ========================================= */

/* ===== LocalStorage Keys (호환 유지) ===== */
const LS_PM_KEY          = 'pmTableData';        // (레거시: index/캘린더에서 사용 가능)
const LS_PLANNED_KEY     = 'plannedProjects';    // 예정 프로젝트
const LS_PM_PROFILES_KEY = 'PM_PROFILES';        // PM 프로필(정식)

/* ===== 유틸 ===== */
function uid() {
  return 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
function fmtDateDot(s){ return s ? String(s).replace(/-/g, '.') : ''; }
function fmtBudgetKR(n){ return (n===null||n===undefined||isNaN(n)) ? '' : Number(n).toLocaleString('ko-KR')+'원'; }

/* ===== PM 테이블(레거시) 저장/로드 (호환 유지) ===== */
function savePMData(arr){ try{ localStorage.setItem(LS_PM_KEY, JSON.stringify(arr)); }catch{} }
function loadPMData(){ try{ return JSON.parse(localStorage.getItem(LS_PM_KEY)) || []; }catch{ return []; } }

/* ===== PM 프로필 저장/로드 (정식) ===== */
function savePMProfiles(arr){
  try{ localStorage.setItem(LS_PM_PROFILES_KEY, JSON.stringify(Array.isArray(arr)?arr:[])); }catch{}
}
function loadPMProfiles(){
  try{
    const arr = JSON.parse(localStorage.getItem(LS_PM_PROFILES_KEY) || '[]');
    return Array.isArray(arr) ? arr : [];
  }catch{ return []; }
}

/* ===== 예정 프로젝트 normalize & 저장/로드 (호환 유지) ===== */
function normalizePlannedArray(arrRaw) {
  if (Array.isArray(arrRaw) && arrRaw.length && typeof arrRaw[0] !== 'object') {
    return arrRaw.map(name => ({
      id: uid(), projName: String(name || '(제목 없음)'),
      projClient: '', projStartDate: '', projEndDate: '', budget: null, memo: ''
    }));
  }
  if (Array.isArray(arrRaw)) {
    return arrRaw.map(p => ({
      id: p?.id || uid(),
      projName: p?.projName || p?.name || '(제목 없음)',
      projClient: p?.projClient || p?.client || '',
      projStartDate: p?.projStartDate || p?.start || '',
      projEndDate: p?.projEndDate || p?.end || '',
      budget: (p?.budget ?? null),
      memo: p?.memo || ''
    }));
  }
  if (arrRaw && typeof arrRaw === 'object') return normalizePlannedArray([arrRaw]);
  if (typeof arrRaw === 'string') return normalizePlannedArray([arrRaw]);
  return [];
}
function savePlanned(arrOrItem) {
  try {
    const arr = Array.isArray(arrOrItem) ? arrOrItem : [arrOrItem];
    localStorage.setItem(LS_PLANNED_KEY, JSON.stringify(arr));
  } catch {}
}
function loadPlanned() {
  try {
    const raw = JSON.parse(localStorage.getItem(LS_PLANNED_KEY));
    const normalized = normalizePlannedArray(raw);
    if (JSON.stringify(normalized) !== JSON.stringify(raw)) savePlanned(normalized);
    return normalized;
  } catch { return []; }
}

/* ===== PM 진행률/상태 규칙(공통) =====
   - 기간 없음: 진행률 'X', 상태 '투입대기'
   - 오늘 < 시작: '투입대기'
   - 시작~종료 사이: '투입중'
   - 오늘 > 종료: '종료예정'
======================================== */
function computeProgressAndStatus(startStr, endStr) {
  // 1) 날짜 포맷 정규화: YYYY.MM.DD → YYYY-MM-DD
  const norm = (s) => (s || '').replace(/\./g, '-');

  const sStr = norm(startStr);
  const eStr = norm(endStr);

  // 기간이 없으면 투입대기
  if (!sStr || !eStr) return { percent: null, text: 'X', status: '투입대기' };

  const s = new Date(sStr);
  const e = new Date(eStr);
  if (isNaN(+s) || isNaN(+e) || e <= s) {
    return { percent: null, text: 'X', status: '투입대기' };
  }

  const today = new Date();

  // 진행률 계산 (0~100)
  let ratio;
  if (today <= s) {
    ratio = 0;
  } else if (today >= e) {
    ratio = 1;
  } else {
    ratio = (today - s) / (e - s);
  }
  const percent = Math.round(Math.max(0, Math.min(1, ratio)) * 100);

  // 상태 결정
  let status;
  if (today < s) {
    status = '투입대기';
  } else if (today > e) {
    status = '지연';
  } else {
    const ONE_DAY = 24 * 60 * 60 * 1000;
    const daysLeft = Math.ceil((e - today) / ONE_DAY);
    status = (daysLeft <= 7) ? '종료예정' : '투입중';
  }

  return { percent, text: `${percent}%`, status };
}

/* ===== UI: 햄버거/사이드패널 (공통) =====
   CSS는 .side-panel / .side-panel.open 규칙을 사용합니다.
======================================== */
document.addEventListener('DOMContentLoaded', () => {
  const hamburger = document.getElementById('hamburger');
  const sidePanel = document.getElementById('sidePanel');
  const closeBtn  = document.getElementById('closePanelBtn');

  const openPanel = () => {
    if (!sidePanel) return;
    sidePanel.classList.add('open');
    sidePanel.setAttribute('aria-hidden', 'false');
    hamburger?.setAttribute('aria-expanded', 'true');
  };
  const closePanel = () => {
    if (!sidePanel) return;
    sidePanel.classList.remove('open');
    sidePanel.setAttribute('aria-hidden', 'true');
    hamburger?.setAttribute('aria-expanded', 'false');
  };

  hamburger?.addEventListener('click', openPanel);
  hamburger?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openPanel(); }
  });
  closeBtn?.addEventListener('click', closePanel);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && sidePanel?.classList.contains('open')) closePanel();
  });
});
