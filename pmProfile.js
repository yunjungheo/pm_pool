(function () {
  // ---------- 1) URL 파라미터에서 id 읽기 ----------
  const params = new URLSearchParams(location.search);
  const pmId = params.get('id');

  // ---------- 2) 하드코딩 데이터(예시) ----------
  const PM_DATA = {
    pm001: {
      name: '박과천',
      role: 'PM',
      status: '재직',
      org: 'ITCEN CTS',
      avatar: './imgs/profile1.png',
      teams: 'https://teams.microsoft.com/',  // 실제 Teams 개인/채널 링크로 교체
      email: 'mailto:park@example.com',
      skills: [
        '클라우드(AWS, Azure, GCP) 이해',
        '네트워크/인프라 기본 지식',
        'DevOps · CI/CD 흐름 이해',
        '정보보안(ISMS, 개인정보보호법 등)'
      ],
      projects: [
        'AI 기반 재난종합상황정보 시스템 구축(투입기간: 10개월)',
        '통합관리시스템 개발·시험 인프라 증설(투입기간: 22개월)',
        '20XX년 정보시스템 통합유지보수(투입기간: 18개월)',
        '상용인터넷망 무선 인프라 개선사업(투입기간: 12개월)'
      ],
      badges: ['공공기관', '금융 전문가']
    },
    // pm002, pm003 ... 추가
  };

  // ---------- 3) 엘리먼트 참조 ----------
  const $ = (sel) => document.querySelector(sel);
  const elModal = $('#pmProfileModal');
  const elClose = $('#pmProfileClose');

  const elAvatar = $('#pmProfAvatar');
  const elStatus = $('#pmProfStatus');
  const elName = $('#pmProfName');
  const elRole = $('#pmProfRole');
  const elTeams = $('#pmProfTeams');
  const elEmail = $('#pmProfEmail');
  const elCal = $('#pmProfCal');
  const elOrg = $('#pmProfOrg');
  const elSkills = $('#pmProfSkills');
  const elProjects = $('#pmProfProjects');
  const elBadges = $('#pmProfBadges .dot-list');
  // PM수행성과 뱃지를 정의하는곳 
  const badgeClassMap = {
  '공공기관': 'badge--green',
  '금융 전문가': 'badge--blue',
  // 필요하면 계속 추가
};
  // ---------- 4) 렌더링 ----------
  function render(pm) {
    if (!pm) {
      elName.textContent = 'PM 정보를 찾을 수 없습니다';
      elRole.textContent = '';
      elStatus.textContent = '미확인';
      elOrg.textContent = '';
      return;
    }
    elAvatar.src = pm.avatar || './imgs/profile_default.png';
    elStatus.textContent = pm.status || '상태';
    elName.textContent = pm.name || '이름';
    elRole.textContent = pm.role || '';
    elTeams.href = pm.teams || '#';
    elEmail.href = pm.email || '#';
    // 캘린더에 동일 id를 넘기고 싶으면 아래처럼 쿼리 추가
    elCal.href = `./calendar.html?pm=${encodeURIComponent(pmId)}`;
    elOrg.textContent = pm.org || '';

    // 리스트 렌더(초기화 후 채우기)
    elSkills.innerHTML = '';
    (pm.skills || []).forEach(s => {
      const li = document.createElement('li');
      li.textContent = s;
      elSkills.appendChild(li);
    });

    elProjects.innerHTML = '';
    (pm.projects || []).forEach(p => {
      const li = document.createElement('li');
      li.innerHTML = p; 
      elProjects.appendChild(li);
    });
    // 수행성과 뱃지 
    elBadges.innerHTML = '';
    (pm.badges || []).forEach(text => {
      const li = document.createElement('li');
      li.className = `badge ${badgeClassMap[text] || 'badge--gray'}`; // ← 색상 클래스 적용
      li.textContent = text;
      elBadges.appendChild(li);
    });

    // 모달이 hidden이었다면 표시
    elModal?.removeAttribute('hidden');
  }

  render(PM_DATA[pmId]);

  // ---------- 5) 닫기(X) → 메인으로 ----------
  elClose?.addEventListener('click', () => {
    if (history.length > 1) {
      history.back();
    } else {
      location.href = 'index.html';
    }
  });

  // (선택) ESC 키로 닫기
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') elClose?.click();
  });
})();
