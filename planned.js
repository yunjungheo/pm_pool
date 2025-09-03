document.addEventListener('DOMContentLoaded', () => {
  const tbody    = document.getElementById('planned-tbody');
  const searchEl = document.getElementById('search-planned');
  const detailEl = document.getElementById('planned-detail');
  if (!tbody) return;

  document.getElementById('openProjectRegisterBtn')
    ?.addEventListener('click', openCreate);

  // 데이터
  let all = Array.isArray(loadPlanned?.()) ? loadPlanned() : [];

  // 유틸
  const getParam = (name) => new URL(location.href).searchParams.get(name);
  const targetId = getParam('id');
  const isEdit   = getParam('edit') === '1';
  const isCreate = getParam('create') === '1'; 

  // 상단 '전체 보기' 링크(상세/수정 모드에서만)
  function ensureViewAllLink() {
    if (!targetId) return;
    if (document.querySelector('.planned-view-all')) return;

    const a = document.createElement('a');
    a.href = './planned.html';
    a.textContent = '전체 보기';
    a.className = 'link--primary planned-view-all';
    a.setAttribute('aria-label', '진행 예정 프로젝트 전체 보기');

    const right = document.querySelector('.search-filter .filter-right');
    const host  = right || document.querySelector('.search-filter') || document.body;
    if (right && right.firstChild) right.insertBefore(a, right.firstChild);
    else host.insertBefore(a, host.firstChild);
  }

  // 리스트 렌더 (프로젝트명은 상세 링크 / 관리 컬럼에 수정·삭제)
  function renderList(rows) {
    tbody.innerHTML = '';

    if (!rows.length) {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = 6;
      td.style.textAlign = 'center';
      td.textContent = '표시할 데이터가 없습니다.';
      tr.appendChild(td);
      tbody.appendChild(tr);
      return;
    }

    rows.forEach(r => {
      const tr = document.createElement('tr');

      // 프로젝트명(상세 링크) — 메인과 동일 톤
      const tdName = document.createElement('td');
      const a = document.createElement('a');
      a.className = 'link--primary';
      a.href = `./planned.html?id=${encodeURIComponent(r.id)}`; // 상세로 이동
      a.textContent = (r.projName || '').trim() || '(제목 없음)';
     tdName.appendChild(a);

      // 고객사
      const tdClient = document.createElement('td');
      tdClient.textContent = r.projClient || '';

      // 기간
      const tdPeriod = document.createElement('td');
      tdPeriod.textContent = [fmtDateDot?.(r.projStartDate), fmtDateDot?.(r.projEndDate)]
        .filter(Boolean).join(' ~ ');

      // 예산
      const tdBudget = document.createElement('td');
      tdBudget.textContent = fmtBudgetKR?.(r.budget) || '';

      // 비고
      const tdMemo = document.createElement('td');
      tdMemo.textContent = r.memo || '';

      // 관리(수정·삭제)
      const tdActions = document.createElement('td');
        tdActions.innerHTML = `
        <div class="actions-group">
            <button type="button" class="btn-outline btn-outline--edit"  data-action="edit"   data-id="${r.id}">수정</button>
            <button type="button" class="btn-outline btn-outline--delete" data-action="delete" data-id="${r.id}">삭제</button>
        </div>
        `;

      tr.append(tdName, tdClient, tdPeriod, tdBudget, tdMemo, tdActions);
      tbody.appendChild(tr);
    });
  }

  // 상세 렌더
  function renderDetail(item) {
    if (!detailEl) return;
    detailEl.hidden = false;
    tbody.closest('section')?.setAttribute('hidden', 'true');
    ensureViewAllLink();

    const period = [fmtDateDot?.(item.projStartDate), fmtDateDot?.(item.projEndDate)]
      .filter(Boolean).join(' ~ ');
    const budget = fmtBudgetKR?.(item.budget) || '';

    detailEl.innerHTML = `
      <article class="detail-card" aria-labelledby="proj-title">
        <header class="detail-head">
          <h2 id="proj-title">${item.projName || ''}</h2>
          <nav class="detail-actions actions-group">
            <button type="button" class="btn-outline btn-outline--edit"  data-action="edit"   data-id="${item.id}">수정</button>
            <button type="button" class="btn-outline btn-outline--delete" data-action="delete" data-id="${item.id}">삭제</button>
          </nav>
        </header>
        <dl class="detail-grid">
          <div><dt>고객사</dt><dd>${item.projClient || ''}</dd></div>
          <div><dt>기간</dt><dd>${period}</dd></div>
          <div><dt>예산</dt><dd>${budget}</dd></div>
          <div><dt>비고</dt><dd>${item.memo || ''}</dd></div>
        </dl>
      </article>
    `;
  }

  // 수정 렌더(인라인 폼)
  function renderEdit(item) {
    if (!detailEl) return;
    detailEl.hidden = false;
    tbody.closest('section')?.setAttribute('hidden', 'true');
    ensureViewAllLink();

    detailEl.innerHTML = `
      <article class="detail-card" aria-labelledby="edit-title">
        <h2 id="edit-title">프로젝트 수정</h2>
        <form id="editForm" class="detail-form" novalidate>
          <label>프로젝트명 <input type="text" name="projName" required value="${item.projName || ''}" /></label>
          <label>고객사 <input type="text" name="projClient" value="${item.projClient || ''}" /></label>
          <div class="form-two-col">
            <label>시작일 <input type="date" name="projStartDate" required value="${item.projStartDate || ''}" /></label>
            <label>종료일 <input type="date" name="projEndDate" required value="${item.projEndDate || ''}" /></label>
          </div>
          <label>예산(원) <input type="number" name="budget" min="0" step="1" value="${item.budget ?? ''}" /></label>
          <label>비고 <input type="text" name="memo" value="${item.memo || ''}" /></label>
          <div class="detail-actions actions-group">
            <button type="submit" class="btn-submit">저장</button>
            <a class="btn-outline btn-outline--edit" href="./planned.html?id=${item.id}" role="button">취소</a>
            <button type="button" class="btn-outline btn-outline--delete" data-action="delete" data-id="${item.id}">삭제</button>
          </div>
        </form>
      </article>
    `;

    // 저장 동작
    const form = document.getElementById('editForm');
    form?.addEventListener('submit', (e) => {
      e.preventDefault();
      const f = e.currentTarget;
      const payload = {
        id: item.id,
        projName: f.projName.value.trim(),
        projClient: f.projClient.value.trim(),
        projStartDate: f.projStartDate.value,
        projEndDate: f.projEndDate.value,
        budget: f.budget.value ? Number(f.budget.value) : null,
        memo: f.memo.value.trim()
      };
      if (!payload.projName || !payload.projStartDate || !payload.projEndDate) {
        alert('프로젝트명/기간을 확인해 주세요.');
        return;
      }
      // 저장
      const saved = loadPlanned();
      const idx = saved.findIndex(x => x.id === item.id);
      if (idx >= 0) saved[idx] = payload;
      savePlanned(saved);
      all = saved;

      // 상세 화면으로 이동
      location.href = `./planned.html?id=${encodeURIComponent(item.id)}`;
    });
  }
    // 등록 폼 열기 (이 페이지에서 렌더)
  function openCreate() {
    if (!detailEl) return;

    // 목록 숨기고 상세 영역 표시
    detailEl.hidden = false;
    tbody.closest('section')?.setAttribute('hidden', 'true');

    // 템플릿 복제
    const tpl = document.getElementById('planned-create-tpl');
    if (!tpl) return;
    detailEl.innerHTML = '';
    const node = tpl.content.cloneNode(true);
    detailEl.appendChild(node);

    // 이벤트: 취소 → 목록 복귀
    detailEl.querySelector('#btn-create-cancel')
      ?.addEventListener('click', () => {
        detailEl.hidden = true;
        tbody.closest('section')?.removeAttribute('hidden');
      });

    // 이벤트: 등록 저장
    const form = detailEl.querySelector('#projectRegisterForm');
    form?.addEventListener('submit', (e) => {
      e.preventDefault();
      const f = e.currentTarget;

      const item = {
        id: (typeof uid === 'function') ? uid() : String(Date.now()),
        projName: f.projName.value.trim(),
        projClient: f.projClient.value.trim(),
        projStartDate: f.projStartDate.value,
        projEndDate: f.projEndDate.value,
        budget: f.budget.value ? Number(f.budget.value) : null,
        memo: f.memo.value.trim()
      };

      if (!item.projName || !item.projStartDate || !item.projEndDate) {
        alert('프로젝트명/기간을 확인해 주세요.');
        return;
      }

      // 저장
      const saved = loadPlanned();
      saved.push(item);
      savePlanned(saved);
      all = saved;

      location.href = `./planned.html?id=${encodeURIComponent(item.id)}`;
    });
  }


  // 삭제(공통)
  function handleDelete(id) {
    if (!confirm('해당 프로젝트를 삭제하시겠습니까?')) return;

    const saved = loadPlanned();
    const next = saved.filter(x => x.id !== id);
    savePlanned(next);
    all = next;

    if (targetId) {
      // 상세/수정 모드에서 삭제 → 리스트로 이동
      location.href = './planned.html';
    } else {
      // 리스트 모드에서 삭제 → 현재 검색 유지 후 재렌더
      const q = String(searchEl?.value || '').trim().toLowerCase();
      const rows = (q
        ? all.filter(p =>
            (p.projName || '').toLowerCase().includes(q) ||
            (p.projClient || '').toLowerCase().includes(q)
          )
        : all.slice());
      renderList(rows);
    }
  }

// 리스트에서 edit/delete 처리
tbody.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-action]');
  if (!btn) return;
  const id  = btn.dataset.id;
  const act = btn.dataset.action;
  if (act === 'edit') {
    location.href = `./planned.html?id=${encodeURIComponent(id)}&edit=1`;
  } else if (act === 'delete') {
    handleDelete(id);
  }
});

// 상세/수정 화면에서도 edit/delete 처리
detailEl?.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-action]');
  if (!btn) return;
  const id  = btn.dataset.id;
  const act = btn.dataset.action;
  if (act === 'edit') {
    location.href = `./planned.html?id=${encodeURIComponent(id)}&edit=1`;
  } else if (act === 'delete') {
    handleDelete(id);
  }
});

// === 라우팅 분기: 상세/수정/등록/리스트 ===
if (targetId) {
  const found = all.find(p => p.id === targetId);
  if (!found) {
    // 대상 없음 → 리스트 모드로
    detailEl?.setAttribute('hidden', 'true');
    tbody.closest('section')?.removeAttribute('hidden');
    renderList(all);
    if (searchEl) {
      searchEl.disabled = false;
      searchEl.placeholder = '프로젝트명/고객사 검색';
    }
  } else {
    isEdit ? renderEdit(found) : renderDetail(found);
  }
} else if (isCreate) {
  // 등록 모드
  openCreate();
} else {
  // 리스트 모드
  detailEl?.setAttribute('hidden', 'true');
  tbody.closest('section')?.removeAttribute('hidden');
  renderList(all);

  // 검색(리스트 전용)
  searchEl?.addEventListener('input', (e) => {
    const q = String(e.target.value || '').trim().toLowerCase();
    const rows = all.filter(p =>
      (p.projName  || '').toLowerCase().includes(q) ||
      (p.projClient|| '').toLowerCase().includes(q)
    );
    renderList(rows);
  });
}

// <-- 여기까지가 DOMContentLoaded 내부 로직이고, 바로 다음 한 줄이 콜백 종료입니다.
});
