/* =========================================
   common.js : 모든 페이지 공통 스크립트
   ========================================= */

/* ===== LocalStorage Keys (호환 유지) ===== */
const LS_PM_KEY         = 'pmTableData';        // (레거시 백업용)
const LS_PLANNED_KEY    = 'plannedProjects';    // 예정 프로젝트
const LS_PM_PROFILES_KEY= 'PM_PROFILES';        // PM 프로필(정식)

/* ===== 유틸 ===== */
function uid() {
  return 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
function deriveStatus(p){ p = Number(p)||0; return p>=100?'완료':p>=50?'진행중':'지연'; } // (기존 호환)
function fmtDateDot(s){ return s ? String(s).replace(/-/g, '.') : ''; }
function fmtBudgetKR(n){ return (n===null||n===undefined||isNaN(n)) ? '' : Number(n).toLocaleString('ko-KR')+'원'; }

/* ===== PM 테이블(레거시 백업) 저장/로드 (호환 유지) ===== */
function savePMData(arr){ try{ localStorage.setItem(LS_PM_KEY, JSON.stringify(arr)); }catch{} }
function loadPMData(){ try{ return JSON.parse(localStorage.getItem(LS_PM_KEY)) || []; }catch{ return []; } }

/* ===== PM 프로필 저장/로드 (정식) ===== */
function savePMProfiles(arr){
  try{
    localStorage.setItem(LS_PM_PROFILES_KEY, JSON.stringify(Array.isArray(arr)?arr:[]));
  }catch{}
}
function loadPMProfiles(){
  try{
    const arr = JSON.parse(localStorage.getItem(LS_PM_PROFILES_KEY) || '[]');
    return Array.isArray(arr) ? arr : [];
  }catch{ return []; }
}

/* ===== 예정 프로젝트 normalize & 저장/로드 (호환 유지) ===== */
function normalizePlannedArray(arrRaw) {
  // 문자열 배열 → 객체 배열
  if (Array.isArray(arrRaw) && arrRaw.length && typeof arrRaw[0] !== 'object') {
    return arrRaw.map(name => ({
      id: uid(), projName: String(name || '(제목 없음)'),
      projClient: '', projStartDate: '', projEndDate: '', budget: null, memo: ''
    }));
  }
  // 객체 배열 → id/필드 보정
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
  // 단일 객체/문자열 → 1개짜리 배열로 승격
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
    // 비정상 저장 상태라면 교정 저장
    if (JSON.stringify(normalized) !== JSON.stringify(raw)) {
      savePlanned(normalized);
    }
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
  const hasPeriod = !!(startStr && endStr);
  if (!hasPeriod) return { percent: null, text: 'X', status: '투입대기' };

  const today = new Date();
  const s = new Date(startStr);
  const e = new Date(endStr);
  const total = e - s;
  const elapsed = today - s;
  if (isNaN(total) || total <= 0) return { percent: null, text: 'X', status: '투입대기' };

  let ratio = elapsed / total;
  if (ratio < 0) ratio = 0;
  if (ratio > 1) ratio = 1;
  const percent = Math.round(ratio * 100);

  let status = '투입중';
  if (today < s) status = '투입대기';
  else if (today > e) status = '종료예정';

  return { percent, text: `${percent}%`, status };
}

/* ===== UI: 햄버거/사이드패널 (공통) ===== */
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
    if (e.key === 'Escape' && sidePanel?.classList.contains('open')) {
      closePanel();
    }
  });
});
