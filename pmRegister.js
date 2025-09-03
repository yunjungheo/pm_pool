document.addEventListener('DOMContentLoaded', () => {  
  // ===== 요소 =====
  const group       = document.getElementById('achvGroup');
  const sink        = document.getElementById('achievements');
  const avatarImg   = document.getElementById('avatar');        // 미리보기 <img>
  const uploadInput = document.getElementById('avatarUpload');  // <input type="file">
  const form        = document.getElementById('pmProfileForm');

  const hamburger = document.getElementById('hamburger');
  const sidePanel = document.getElementById('sidePanel');
  const closeBtn  = document.getElementById('closePanelBtn');

  if (hamburger && sidePanel) {
    hamburger.addEventListener('click', () => {
      sidePanel.classList.add('open');
      sidePanel.setAttribute('aria-hidden', 'false');
    });
  }

  if (closeBtn && sidePanel) {
    closeBtn.addEventListener('click', () => {
      sidePanel.classList.remove('open');
      sidePanel.setAttribute('aria-hidden', 'true');
    });
  }

  // ESC 키로 닫기
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && sidePanel.classList.contains('open')) {
      sidePanel.classList.remove('open');
      sidePanel.setAttribute('aria-hidden', 'true');
    }
  });
  // ====== [추가] 투입 예정 관련 요소 ======
  const noPlannedCb = document.getElementById('noPlannedProject');
  // 동일 name(plannedProject)이 2개인 현재 마크업을 고려해 두 가지 방식을 모두 지원
  const plannedInputs = [...document.querySelectorAll('input[name="plannedProject"]')];
  const plannedNameInput     = plannedInputs[0] || document.querySelector('input[name="plannedProjectName"]');
  const plannedCustomerInput = plannedInputs[1] || document.querySelector('input[name="plannedCustomer"]');
  const plannedStartInput = document.getElementById('plannedStart');
  const plannedEndInput   = document.getElementById('plannedEnd');

  // ====== [추가] "계획된 프로젝트 없음" 토글 시 입력 비활성화 ======
  function applyNoPlannedState() {
    const off = !!(noPlannedCb && noPlannedCb.checked);
    [plannedNameInput, plannedCustomerInput, plannedStartInput, plannedEndInput]
      .filter(Boolean)
      .forEach(el => { el.disabled = off; if (off) el.value = ''; });
  }
  if (noPlannedCb) {
    noPlannedCb.addEventListener('change', applyNoPlannedState);
    applyNoPlannedState();
  }

  // ====== [추가] 진행률/상태 계산 유틸 ======
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

  // 업로드된 아바타(미리보기/저장용) 데이터URL을 보관
  let uploadedAvatarDataUrl = '';

  // ===== 뱃지 토글 =====
  if (group && sink) {
    const syncHidden = () => {
      const selected = [...group.querySelectorAll('.badge.selected')]
        .map(b => b.dataset.value);
      sink.value = JSON.stringify(selected);
    };

    group.addEventListener('click', (e) => {
      const btn = e.target.closest('.badge');
      if (!btn) return;
      btn.classList.toggle('selected');
      btn.setAttribute('aria-pressed', btn.classList.contains('selected'));
      syncHidden();
    });

    // 초기 동기화(새로고침 대비)
    syncHidden();
  }

  // ===== 아바타 업로드: 미리보기 + 저장 시 우선 적용 =====
  if (uploadInput && avatarImg) {
    uploadInput.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (ev) => {
        uploadedAvatarDataUrl = String(ev.target?.result || '');
        // 즉시 미리보기 교체
        avatarImg.src = uploadedAvatarDataUrl;
      };
      reader.readAsDataURL(file);
    });
  }

  // ===== 폼 제출 =====
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const frm = e.currentTarget;

    // ---- 안전 접근 헬퍼 ----
    const get = (name) => frm?.elements?.[name];
    const val = (name) => (get(name)?.value ?? '').trim();

    // 기본 필수값 체크
    const nameVal = val('name');
    const affVal  = val('affiliation');
    if (!nameVal || !affVal) {
      alert('성함/소속을 입력해 주세요.');
      return;
    }

    // 아바타 처리 (업로드 우선, 없으면 라디오 선택, 없으면 기본)
    const avatarRadio = frm.querySelector('input[name="avatar"]:checked');
    const avatarKey   = avatarRadio?.value || 'profile_default';

    // pmRegister.js 상단에서 만들어둔 uploadedAvatarDataUrl을 재사용
    // 없으면 기본 이미지로.
    const avatarMap = {
      profile_default: '/imgs/profile1.png'
    };
    const finalAvatarUrl = (typeof uploadedAvatarDataUrl === 'string' && uploadedAvatarDataUrl)
      ? uploadedAvatarDataUrl
      : (avatarMap[avatarKey] || '/imgs/profile1.png');

    // "계획된 프로젝트 없음" 체크박스
    const noPlanned = !!document.getElementById('noPlannedProject')?.checked;

    // 현재 마크업(프로젝트명/고객사 모두 name="plannedProject")을 지원
    const dupInputs = [...document.querySelectorAll('input[name="plannedProject"]')];
    const plannedProjectName = (dupInputs[0]?.value ?? val('plannedProjectName')).trim();
    const plannedCustomer    = (dupInputs[1]?.value ?? val('plannedCustomer')).trim();

    const plannedStart = noPlanned ? '' : (document.getElementById('plannedStart')?.value || '');
    const plannedEnd   = noPlanned ? '' : (document.getElementById('plannedEnd')?.value || '');

    // 진행률/상태 계산 유틸 (로컬로 정의: 외부 함수 없어도 동작)
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

    const { percent, text: progressText, status } =
      computeProgressAndStatus(plannedStart, plannedEnd);

    // 뱃지 hidden(JSON 문자열) 안전 파싱
    let achievementsArr = [];
    try {
      achievementsArr = JSON.parse(document.getElementById('achievements')?.value || '[]');
      if (!Array.isArray(achievementsArr)) achievementsArr = [];
    } catch { achievementsArr = []; }

    // 최종 payload
    const payload = {
      id: (Date.now()+''+Math.random()).slice(0,16),
      name: nameVal,
      affiliation: affVal,
      email: val('email'),
      teams: val('teams'),
      skills: val('skills'),
      history: val('history'),
      achievements: achievementsArr,
      avatar: avatarKey,
      avatarUrl: finalAvatarUrl,

      // 투입 예정 관련
      noPlanned,
      plannedProject: plannedProjectName,
      plannedCustomer,
      plannedStart,
      plannedEnd,
      progressPercent: percent,     // null 또는 0~100
      progressText,                 // 'X' 또는 'NN%'
      status,                       // '투입대기' | '투입중' | '종료예정'

      createdAt: new Date().toISOString()
    };

    // 저장: PM_PROFILES
    const KEY = 'PM_PROFILES';
    const prev = JSON.parse(localStorage.getItem(KEY) || '[]');
    prev.push(payload);
    localStorage.setItem(KEY, JSON.stringify(prev));

    // 메인 그리드 백업(pmTableData)도 동일 규칙 저장
    const projectDisplay  = (noPlanned || !plannedProjectName) ? '(미배정)' : plannedProjectName;
    const customerDisplay = (noPlanned || !plannedCustomer) ? '(미배정)' : plannedCustomer;

    const GRID_KEY = 'pmTableData';
    const table = JSON.parse(localStorage.getItem(GRID_KEY) || '[]');
    table.push({
      id: payload.id,
      name: payload.name,
      projectName: projectDisplay,
      client: customerDisplay,
      start: plannedStart,  // index에서 포맷 변환
      end:   plannedEnd,
      progressPercent: percent,  // null이면 X로 표기
      progressText,
      status
    });
    localStorage.setItem(GRID_KEY, JSON.stringify(table));

    alert('PM 프로필이 등록되었습니다.');
    location.href = './index.html';
    });
  }


});
