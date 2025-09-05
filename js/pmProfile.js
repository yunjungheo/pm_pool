// pmProfile.js
document.addEventListener('DOMContentLoaded', () => {
  const host = document.getElementById('pm-detail');
  
  // ===== 안전 로더 (common.js 없어도 동작하도록 폴백 포함) =====
  const loadPMProfiles = (typeof window.loadPMProfiles === 'function')
    ? window.loadPMProfiles
    : function () {
        try {
          const arr = JSON.parse(localStorage.getItem('PM_PROFILES') || '[]');
          return Array.isArray(arr) ? arr : [];
        } catch {
          return [];
        }
      };

  const fmtDateDot = (typeof window.fmtDateDot === 'function')
    ? window.fmtDateDot
    : function (s) { return s ? String(s).replace(/-/g, '.') : ''; };

  const computePS = (typeof window.computeProgressAndStatus === 'function')
    ? window.computeProgressAndStatus
    : function (startStr, endStr) {
        // 공통 로직 폴백: 오늘<시작=0%/투입대기, 오늘>종료=100%/지연, 그 외 경과% (종료 7일 이내=종료예정)
        if (!startStr || !endStr) return { percent: null, text: 'X', status: '투입대기' };
        const norm = s => String(s).replace(/\./g, '-');
        const s = new Date(norm(startStr));
        const e = new Date(norm(endStr));
        const t = new Date();
        if (isNaN(+s) || isNaN(+e) || e <= s) return { percent: null, text: 'X', status: '투입대기' };

        let percent;
        if (t <= s) percent = 0;
        else if (t >= e) percent = 100;
        else percent = Math.round(((t - s) / (e - s)) * 100);

        let status;
        if (t < s) status = '투입대기';
        else if (t > e) status = '지연';
        else {
          const ONE_DAY = 24 * 60 * 60 * 1000;
          const daysLeft = Math.ceil((e - t) / ONE_DAY);
          status = (daysLeft <= 7) ? '종료예정' : '투입중';
        }
        return { percent, text: (percent == null ? 'X' : `${percent}%`), status };
      };
    
    // 라벨 → 배지 클래스 매핑
  function badgeClass(label){
    switch(label){
      case '공공기관':  return 'badge-public';
      case '금융 전문가': return 'badge-finance';
      case '제조/유통':  return 'badge-manufacture';
      case '보안/ISMS':  return 'badge-security';
      case '클라우드':  return 'badge-cloud';
      case '데이터/AI':  return 'badge-data';
      default:           return '';
    }
  }

  // ===== URL 파라미터에서 id 추출 =====
  const id = new URL(location.href).searchParams.get('id');

  // ===== 데이터 조회 =====
  const all = loadPMProfiles();
  const pm  = all.find(p => p.id === id);

  if (!pm) {
    host.innerHTML = `
      <article class="detail-card" aria-labelledby="not-found">
        <header class="detail-head">
          <h2 id="not-found">예시를 위한 리스트로 PM등록후 확인해주세요.</h2>
          <nav class="detail-actions actions-group">
            <a class="btn-outline btn-outline--edit" href="./index.html" role="button">목록으로</a>
          </nav>
        </header>
        <div class="detail-grid">
          <div>잘못된 주소이거나, 브라우저 저장소(localStorage)에 데이터가 없습니다.</div>
        </div>
      </article>
    `;
    return;
  }

  // ===== 표시값 가공 =====
  const avatar = pm.avatarUrl || './imgs/profile1.png';
  const achvs  = Array.isArray(pm.achievements) ? pm.achievements : [];
  const achvHtml = achvs.length
  ? achvs.map(v => {
      const cls = badgeClass(v);
      return `<span class="badge ${cls} selected">${v}</span>`;
    }).join(' ')
  : `<span class="text-muted">없음</span>`;

  const projName   = pm.noPlanned || !pm.plannedProject   ? '(미배정)' : pm.plannedProject;
  const projClient = pm.noPlanned || !pm.plannedCustomer  ? '(미배정)' : pm.plannedCustomer;
  const period     = (pm.plannedStart && pm.plannedEnd)
    ? `${fmtDateDot(pm.plannedStart)} ~ ${fmtDateDot(pm.plannedEnd)}`
    : '-';

  const cps = computePS(pm.plannedStart, pm.plannedEnd);
  const statusClass =
    cps.status === '투입대기' ? 'status-wait' :
    cps.status === '투입중'   ? 'status-active' :
    cps.status === '종료예정' ? 'status-nearend' :
                                'status-delay';

// ===== 렌더 =====
const historyItems = (pm.history || '')
  .split(/\r?\n/)
  .map(s => s.trim())
  .filter(Boolean)
  .map(s => s.replace(/^[-•·]\s*/, ''));

host.innerHTML = `
  <article class="detail-card" style="max-width:980px;margin:24px auto;">
    <div class="pm-detail-grid">
      <!-- LEFT: 프로필 -->
      <aside class="pm-left">
        <div class="pm-avatar-wrap">
          <img src="${avatar}" alt="프로필" class="pm-avatar"/>
          <button class="status-btn ${
            cps.status === '투입대기' ? 'status-wait' :
            cps.status === '투입중'   ? 'status-active' :
            cps.status === '종료예정' ? 'status-nearend' : 'status-delay'
          }" disabled style="position:absolute;left:50%;transform:translateX(-50%);bottom:-10px;">
            ${cps.status}
          </button>
        </div>
        <div class="pm-name">${pm.name || ''}</div>
        <div class="pm-quick">
          ${pm.teams ? `<a class="quick-btn" href="${pm.teams}" target="_blank" rel="noopener">Teams</a>` : ''}
          ${pm.email ? `<a class="quick-btn" href="mailto:${pm.email}">📧</a>` : ''}
          <a class="quick-btn" href="./calendar.html">📆</a>
        </div>
        <div class="pm-block">
        <div class="block-title">투입 상황</div>
          <div class="block-body pm-plan">
            <div class="kv"><span class="kv-key">프로젝트명</span><span class="kv-val">${projName}</span></div>
            <div class="kv"><span class="kv-key">고객사</span><span class="kv-val">${projClient}</span></div>
            <div class="kv"><span class="kv-key">투입기간</span><span class="kv-val">${
              (pm.plannedStart && pm.plannedEnd)
              ? `${fmtDateDot(pm.plannedStart)} ~ ${fmtDateDot(pm.plannedEnd)}`
              : '-'
            }</span></div>
            <div class="kv pm-progress">
              <span class="kv-key">진행률</span>
              <span class="kv-val">
                ${cps.text === 'X'
                  ? 'X'
                  : `
                      <div class="progress-bar" style="width:220px;display:inline-block;vertical-align:middle;">
                        <div class="progress-bar-inner" style="width:${cps.percent}%;"></div>
                      </div>
                      <span class="progress-percent">${cps.percent}%</span>
                    `
                }
              </span>
            </div>
          </div>
        </div>
      </aside>
      <!-- RIGHT: 상세 -->
      <section class="pm-right">
        <div class="pm-kv">
          <div class="kv"><span class="kv-key">소속</span><span class="kv-val">${pm.affiliation || ''}</span></div>
          <div class="kv"><span class="kv-key">기술스택</span><span class="kv-val">${pm.skills || ''}</span></div>
        </div>
        <div class="pm-kv">
          <div class="kv-key">프로젝트 이력</div>
          <div class="block-body">
            ${
              historyItems.length
              ? `<ul class="bullet-list">${historyItems.map(li => `<li>${li}</li>`).join('')}</ul>`
              : '<span class="text-muted">등록된 이력이 없습니다.</span>'
            }
          </div>
        </div>
         <div class="pm-kv">
          <div class="kv-key">수행성과</div>
           <div class="block-body">
              ${achvHtml}
           </div>
          </div>
        </div>
        <div class="pm-actions">
          <a class="btn-outline" href="./index.html">목록으로</a>
        </div>
      </section>
    </div>
  </article>
`;
});
