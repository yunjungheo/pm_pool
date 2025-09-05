document.addEventListener('DOMContentLoaded', () => {
  // ===== 요소 =====
  const group       = document.getElementById('achvGroup');
  const sink        = document.getElementById('achievements');
  const avatarImg   = document.getElementById('avatar');        // (없어도 동작)
  const uploadInput = document.getElementById('avatarUpload');  // <input type="file">
  const form        = document.getElementById('pmProfileForm');

  // ====== 투입 예정 관련 요소 ======
  const noPlannedCb = document.getElementById('noPlannedProject');
  const plannedInputs = [...document.querySelectorAll('input[name="plannedProject"]')];
  const plannedNameInput     = plannedInputs[0] || document.querySelector('input[name="plannedProjectName"]');
  const plannedCustomerInput = plannedInputs[1] || document.querySelector('input[name="plannedCustomer"]');
  const plannedStartInput = document.getElementById('plannedStart');
  const plannedEndInput   = document.getElementById('plannedEnd');

  // ====== "계획된 프로젝트 없음" → 입력 비활성화 ======
  function applyNoPlannedState() {
    const off = !!(noPlannedCb && noPlannedCb.checked);
    [plannedNameInput, plannedCustomerInput, plannedStartInput, plannedEndInput]
      .filter(Boolean)
      .forEach(el => { el.disabled = off; if (off) el.value = ''; });
  }
  noPlannedCb?.addEventListener('change', applyNoPlannedState);
  applyNoPlannedState();

  // 업로드된 아바타 DataURL 저장
  let uploadedAvatarDataUrl = '';

  // ===== 뱃지 토글 =====
  if (group && sink) {
    const syncHidden = () => {
      const selected = [...group.querySelectorAll('.badge.selected')].map(b => b.dataset.value);
      sink.value = JSON.stringify(selected);
    };
    group.addEventListener('click', (e) => {
      const btn = e.target.closest('.badge');
      if (!btn) return;
      btn.classList.toggle('selected');
      btn.setAttribute('aria-pressed', btn.classList.contains('selected'));
      syncHidden();
    });
    syncHidden();
  }

  // ===== 아바타 업로드 미리보기 =====
  if (uploadInput && avatarImg) {
    uploadInput.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        uploadedAvatarDataUrl = String(ev.target?.result || '');
        avatarImg.src = uploadedAvatarDataUrl;
      };
      reader.readAsDataURL(file);
    });
  }

  // ===== 폼 제출 =====
  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    const frm = e.currentTarget;

    // 안전 접근
    const get = (name) => frm?.elements?.[name];
    const val = (name) => (get(name)?.value ?? '').trim();

    // 필수값: 성함만 체크
    const nameVal = val('name');
    if (!nameVal) {
      alert('성함을 입력해 주세요.');
      return;
    }
    const affVal = val('affiliation'); // 선택 항목

    // 아바타
    const avatarRadio = frm.querySelector('input[name="avatar"]:checked');
    const avatarKey   = avatarRadio?.value || 'profile_default';
    const avatarMap   = { profile_default: './imgs/profile1.png' };
    const finalAvatarUrl = uploadedAvatarDataUrl || avatarMap[avatarKey] || './imgs/profile1.png';

    // "계획된 프로젝트 없음"
    const noPlanned = !!noPlannedCb?.checked;

    // 프로젝트명/고객사
    const plannedProjectName = (plannedNameInput?.value ?? val('plannedProjectName')).trim();
    const plannedCustomer    = (plannedCustomerInput?.value ?? val('plannedCustomer')).trim();

    // 기간
    const plannedStart = noPlanned ? '' : (plannedStartInput?.value || '');
    const plannedEnd   = noPlanned ? '' : (plannedEndInput?.value   || '');

    // 진행률/상태 (common.js의 함수 사용)
    const { percent, text: progressText, status } = computeProgressAndStatus(plannedStart, plannedEnd);

    // 뱃지
    let achievementsArr = [];
    try {
      achievementsArr = JSON.parse(sink?.value || '[]');
      if (!Array.isArray(achievementsArr)) achievementsArr = [];
    } catch { achievementsArr = []; }

    // payload
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
      progressPercent: percent,
      progressText,
      status,
      createdAt: new Date().toISOString()
    };

    // 저장: PM_PROFILES
    const KEY = 'PM_PROFILES';
    const prev = JSON.parse(localStorage.getItem(KEY) || '[]');
    prev.push(payload);
    localStorage.setItem(KEY, JSON.stringify(prev));

    // 레거시 백업: pmTableData
    const GRID_KEY = 'pmTableData';
    const table = JSON.parse(localStorage.getItem(GRID_KEY) || '[]');
    table.push({
      id: payload.id,
      name: payload.name,
      projectName: (noPlanned || !plannedProjectName) ? '(미배정)' : plannedProjectName,
      client:      (noPlanned || !plannedCustomer)    ? '(미배정)' : plannedCustomer,
      start: plannedStart,
      end:   plannedEnd,
      progress: (percent == null ? 0 : percent),
    });
    localStorage.setItem(GRID_KEY, JSON.stringify(table));

    alert('PM 프로필이 등록되었습니다.');
    location.href = './index.html';
  });
});
