// 메모 데이터 저장용 (로컬스토리지 사용)
let memos = JSON.parse(localStorage.getItem('memos') || '[]');
let editingId = null;

// 편지 데이터 저장용 (로컬스토리지 사용)
let letters = JSON.parse(localStorage.getItem('letters') || '[]');
let currentLetterPage = 1;

// DOM 요소
const memoList = document.getElementById('memoList');
const todoList = document.getElementById('todoList');
const addBtn = document.getElementById('addBtn');
const modal = document.getElementById('modal');
const closeModal = document.getElementById('closeModal');
const memoForm = document.getElementById('memoForm');
const modalType = document.getElementById('modalType');
const modalAuthor = document.getElementById('modalAuthor');
const modalContent = document.getElementById('modalContent');
const modalTitle = document.getElementById('modalTitle');
const saveBtn = document.getElementById('saveBtn');
const search = document.getElementById('search');
const typeFilter = document.getElementById('typeFilter');
const authorFilter = document.getElementById('authorFilter');

// 편지함 DOM
const sendLetterBtn = document.getElementById('sendLetter');
const letterContentInput = document.getElementById('letterContent');
const letterToInput = document.getElementById('letterTo');
const letterListDiv = document.getElementById('letterList');

// 페이지네이션 상태
let memoPage = 1;
let todoPage = 1;
const ITEMS_PER_PAGE = 3;

// ===================== 오늘의 질문 기능 =====================
// ---- 오늘의 질문 날짜/시간 유틸 함수 ----
function getSeoulDateStr(date = new Date()) {
  return new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
}
function getSeoulDateYMD(date = new Date()) {
  const d = getSeoulDateStr(date);
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
}
function getSeoulDateTimeStr(date = new Date()) {
  const d = getSeoulDateStr(date);
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0') + ' ' + String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0');
}

// DOM 요소 (탭 전환 코드보다 위에 위치해야 함)
const questionSection = document.getElementById('question-section');
const questionTitle = document.getElementById('questionTitle');
const questionNumber = document.getElementById('questionNumber');
const questionDate = document.getElementById('questionDate');

// 렌더링 함수
function render() {
  memoList.innerHTML = '';
  todoList.innerHTML = '';
  const searchVal = search.value.toLowerCase();
  const typeVal = typeFilter.value;
  const authorVal = authorFilter.value;

  // 일기 필터링 및 페이지네이션
  const filteredMemos = memos.filter(memo =>
    (typeVal === 'all' || memo.type === typeVal) &&
    (authorVal === 'all' || memo.author === authorVal) &&
    (memo.content.toLowerCase().includes(searchVal) || memo.type.toLowerCase().includes(searchVal)) &&
    memo.type === 'memo'
  );
  const memoTotalPages = Math.ceil(filteredMemos.length / ITEMS_PER_PAGE) || 1;
  if (memoPage > memoTotalPages) memoPage = memoTotalPages;
  const memoStart = (memoPage - 1) * ITEMS_PER_PAGE;
  const memoPageItems = filteredMemos.slice(memoStart, memoStart + ITEMS_PER_PAGE);
  memoPageItems.forEach(memo => memoList.appendChild(createMemoCard(memo)));
  renderPagination(memoList, memoTotalPages, memoPage, p => { memoPage = p; render(); });

  // 할 일 필터링 및 페이지네이션
  const filteredTodos = memos.filter(memo =>
    (typeVal === 'all' || memo.type === typeVal) &&
    (authorVal === 'all' || memo.author === authorVal) &&
    (memo.content.toLowerCase().includes(searchVal) || memo.type.toLowerCase().includes(searchVal)) &&
    memo.type === 'todo'
  );
  const todoTotalPages = Math.ceil(filteredTodos.length / ITEMS_PER_PAGE) || 1;
  if (todoPage > todoTotalPages) todoPage = todoTotalPages;
  const todoStart = (todoPage - 1) * ITEMS_PER_PAGE;
  const todoPageItems = filteredTodos.slice(todoStart, todoStart + ITEMS_PER_PAGE);
  todoPageItems.forEach(memo => todoList.appendChild(createTodoCard(memo)));
  renderPagination(todoList, todoTotalPages, todoPage, p => { todoPage = p; render(); });
}

function renderPagination(container, totalPages, currentPage, onPageChange) {
  let pag = document.createElement('div');
  pag.className = 'pagination';
  pag.style.justifyContent = 'center';
  pag.style.marginTop = '18px';
  for (let i = 1; i <= totalPages; i++) {
    let btn = document.createElement('button');
    btn.textContent = i;
    btn.style.background = 'none';
    btn.style.border = 'none';
    btn.style.color = i === currentPage ? '#ff7b9c' : '#222';
    btn.style.fontWeight = i === currentPage ? 'bold' : 'normal';
    btn.style.fontSize = '0.5em';
    btn.style.margin = '0 18px';
    btn.style.padding = '0';
    btn.style.cursor = 'pointer';
    if (i === currentPage) btn.className = 'active';
    btn.onclick = () => onPageChange(i);
    pag.appendChild(btn);
  }
  container.appendChild(pag);
}

// 카드 생성
function createMemoCard(memo) {
  const card = document.createElement('div');
  card.className = 'memo-card';
  card.innerHTML = `
    <div class="title"><span class="memo-icon"><i class="fas fa-pen-to-square"></i> 하루 한 줄, 나에게 선물하기</span></div>
    <div class="date">Date: ${memo.date}  From: ${memo.author}</div>
    <div class="content">${memo.content}</div>
    <div class="card-btns">
      <button class="edit" title="수정"><i class="fas fa-pen"></i></button>
      <button class="delete" title="삭제"><i class="fas fa-trash"></i></button>
    </div>
  `;
  card.querySelector('.edit').onclick = () => openModal('edit', memo);
  card.querySelector('.delete').onclick = () => deleteMemo(memo.id);
  return card;
}
function createTodoCard(memo) {
  const card = document.createElement('div');
  card.className = 'todo-card';
  card.innerHTML = `
    <div class="title">${memo.author}의 할 일
      <span class="todo-check" style="float:right;cursor:pointer;">
        <i class="fas ${memo.completed ? 'fa-check-square' : 'fa-square'}"></i>
      </span>
    </div>
    <div class="date">Date: ${memo.date}  From: ${memo.author}</div>
    <div class="content">${memo.content}</div>
    <div class="card-btns">
      <button class="edit" title="수정"><i class="fas fa-pen"></i></button>
      <button class="delete" title="삭제"><i class="fas fa-trash"></i></button>
    </div>
  `;
  card.querySelector('.edit').onclick = () => openModal('edit', memo);
  card.querySelector('.delete').onclick = () => deleteMemo(memo.id);
  // 체크 아이콘 클릭 시 완료 토글
  card.querySelector('.todo-check').onclick = () => {
    memo.completed = !memo.completed;
    localStorage.setItem('memos', JSON.stringify(memos));
    render();
  };
  return card;
}

// 모달 열기/닫기
function openModal(mode, memo = null) {
  modal.style.display = 'flex';
  if (mode === 'edit' && memo) {
    modalTitle.textContent = '일기 수정';
    modalType.value = memo.type;
    modalAuthor.value = memo.author;
    modalContent.value = memo.content;
    editingId = memo.id;
  } else {
    modalTitle.textContent = '일기 추가';
    modalType.value = 'memo';
    modalAuthor.value = 'J.W';
    modalContent.value = '';
    editingId = null;
  }
}
function closeModalFunc() {
  modal.style.display = 'none';
  memoForm.reset();
  editingId = null;
}

// 일기기 추가/수정
memoForm.onsubmit = function(e) {
  e.preventDefault();
  const now = new Date();
  const dateStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}, ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
  if (editingId) {
    // 수정
    memos = memos.map(m => m.id === editingId ? { ...m, type: modalType.value, author: modalAuthor.value, content: modalContent.value } : m);
  } else {
    // 추가
    memos.push({
      id: Date.now(),
      type: modalType.value,
      author: modalAuthor.value,
      content: modalContent.value,
      date: dateStr
    });
  }
  localStorage.setItem('memos', JSON.stringify(memos));
  render();
  closeModalFunc();
};

// 일기 삭제
function deleteMemo(id) {
  if (confirm('정말 삭제하시겠습니까?')) {
    memos = memos.filter(m => m.id !== id);
    localStorage.setItem('memos', JSON.stringify(memos));
    render();
  }
}

// 이벤트 바인딩
addBtn.onclick = () => openModal('add');
closeModal.onclick = closeModalFunc;
window.onclick = function(e) {
  if (e.target === modal) closeModalFunc();
};
search.oninput = render;
typeFilter.onchange = render;
authorFilter.onchange = render;

// 만난 날짜(2025-04-12)부터 오늘까지 일수 계산 및 표시
function updateDdayDisplay() {
  const startDate = new Date('2025-04-12');
  const today = new Date();
  startDate.setHours(0,0,0,0);
  today.setHours(0,0,0,0);
  const diffTime = today - startDate;
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
  const h1 = document.querySelector('h1');
  if (h1) {
    // 특별한 날짜 체크
    let special = false;
    let specialMsg = '';
    if (diffDays % 100 === 0) {
      special = true;
      specialMsg = `🎉 ${diffDays}일 축하해요! 🎉`;
    } else if (diffDays % 365 === 0) {
      special = true;
      specialMsg = `💝 ${diffDays/365}주년 축하해요! 💝`;
    }
    h1.innerHTML = `우리 만난지 <span style="color:#ff7b9c;font-weight:bold;">${diffDays}</span><span style="color:#ff6b6b;font-weight:bold;">일 째</span>♥` + (special ? `<div class='special-dday'>${specialMsg}</div>` : '');
    if (special) {
      h1.classList.add('special-h1');
    } else {
      h1.classList.remove('special-h1');
    }
  }
}

document.addEventListener('DOMContentLoaded', updateDdayDisplay);
render();
updateDdayDisplay();

// ===================== 편지함 기능 =====================

// 편지함 검색 상태
let letterSearchText = '';
let letterSearchAuthor = 'all';

function createLetterCard(letter) {
  const card = document.createElement('div');
  card.className = 'letter-card';
  card.style.background = '#ffe9ec';
  card.style.borderRadius = '12px';
  card.style.padding = '18px 18px 12px 18px';
  card.style.marginBottom = '16px';
  card.style.position = 'relative';
  card.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:flex-start;">
      <div style="flex:1;">
        <div style="font-weight:bold;font-size:1.08em;margin-bottom:6px;">${letter.content}</div>
        <div style="font-size:0.95em;color:#888;margin-bottom:2px;">date: ${letter.date}</div>
        <div style="font-size:0.95em;color:#ff7b7b;font-weight:bold;">from: ${letter.from}</div>
        <div style="font-size:0.95em;color:#228be6;">to: ${letter.to}</div>
      </div>
      <button class="delete-letter" title="삭제" style="background:none;border:none;cursor:pointer;margin-left:10px;"><i class="fas fa-trash"></i></button>
    </div>
  `;
  card.querySelector('.delete-letter').onclick = () => deleteLetter(letter.id);
  return card;
}

function renderLetters() {
  letterListDiv.innerHTML = '';
  // 검색 필터 적용
  let filteredLetters = letters.filter(letter => {
    const contentMatch = letter.content.toLowerCase().includes(letterSearchText.toLowerCase());
    const authorMatch = (letterSearchAuthor === 'all' || letter.to === letterSearchAuthor);
    return contentMatch && authorMatch;
  });
  const totalPages = Math.ceil(filteredLetters.length / ITEMS_PER_PAGE) || 1;
  if (currentLetterPage > totalPages) currentLetterPage = totalPages;
  const start = (currentLetterPage - 1) * ITEMS_PER_PAGE;
  const pageItems = filteredLetters.slice(start, start + ITEMS_PER_PAGE);
  pageItems.forEach(letter => {
    letterListDiv.appendChild(createLetterCard(letter));
  });
  renderPagination(letterListDiv, totalPages, currentLetterPage, (page) => { currentLetterPage = page; renderLetters(); });
}

function deleteLetter(id) {
  if (confirm('정말 삭제하시겠습니까?')) {
    letters = letters.filter(l => l.id !== id);
    localStorage.setItem('letters', JSON.stringify(letters));
    renderLetters();
  }
}

sendLetterBtn.onclick = function() {
  const content = letterContentInput.value.trim();
  const to = letterToInput.value;
  if (!content) {
    alert('편지 내용을 입력하세요!');
    return;
  }
  const now = new Date();
  const dateStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}, ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
  letters.unshift({
    id: Date.now(),
    content,
    from: '나',
    to,
    date: dateStr
  });
  localStorage.setItem('letters', JSON.stringify(letters));
  letterContentInput.value = '';
  currentLetterPage = 1;
  renderLetters();
};

// ===================== 탭 전환 로직 =====================
const tabs = document.querySelectorAll('.tab');
const mainSection = document.querySelector('.main');
const letterSection = document.getElementById('letter-section');
const noteFilters = document.getElementById('noteFilters');
const letterSearchBar = document.querySelector('.letter-search-bar');
const albumSection = document.getElementById('album-section');

// 앨범 데이터
let albums = JSON.parse(localStorage.getItem('albums') || '[]');

// 앨범 입력 폼 요소
const albumDate = document.getElementById('albumDate');
const albumPlace = document.getElementById('albumPlace');
const albumCategory = document.getElementById('albumCategory');
const albumImage = document.getElementById('albumImage');
const albumDesc = document.getElementById('albumDesc');
const addAlbumBtn = document.getElementById('addAlbum');
const albumListDiv = document.getElementById('albumList');

// 앨범 검색 상태
let albumSearchDate = '';
let albumSearchPlace = '';

// 앨범 미리보기 모달 관련
const albumPreviewModal = document.getElementById('albumPreviewModal');
const albumPreviewImg = document.getElementById('albumPreviewImg');
const albumPreviewDate = document.getElementById('albumPreviewDate');
const albumPreviewPlace = document.getElementById('albumPreviewPlace');
const albumPreviewDesc = document.getElementById('albumPreviewDesc');
const closeAlbumPreview = document.getElementById('closeAlbumPreview');

function openAlbumPreview(album) {
  albumPreviewImg.src = album.image;
  albumPreviewDate.textContent = album.date || '';
  albumPreviewPlace.textContent = album.place || '';
  albumPreviewDesc.textContent = album.desc || '';
  albumPreviewModal.style.display = 'flex';
}
function closeAlbumPreviewFunc() {
  albumPreviewModal.style.display = 'none';
  albumPreviewImg.src = '';
  albumPreviewDate.textContent = '';
  albumPreviewPlace.textContent = '';
  albumPreviewDesc.textContent = '';
}
closeAlbumPreview.onclick = closeAlbumPreviewFunc;
window.addEventListener('click', function(e) {
  if (e.target === albumPreviewModal) closeAlbumPreviewFunc();
});

function renderAlbums() {
  albumListDiv.innerHTML = '';
  // 카테고리별 그룹핑
  const categories = [
    { key: 'funny', label: '엽사', icon: '😆', color: '#ffb84d' },
    { key: 'best', label: '인생샷', icon: '⭐', color: '#4dabf7' },
    { key: 'edit', label: '보정요청', icon: '🛠️', color: '#ff6b81' }
  ];
  if (!window.albumSlideIndexes) window.albumSlideIndexes = {};
  let filteredAlbums = albums.filter(a => {
    let dateMatch = !albumSearchDate || a.date === albumSearchDate;
    let placeMatch = !albumSearchPlace || (a.place && a.place.includes(albumSearchPlace));
    return dateMatch && placeMatch;
  });
  categories.forEach(cat => {
    const catAlbums = filteredAlbums.filter(a => a.category === cat.key);
    if (catAlbums.length === 0) return;
    const catTitle = document.createElement('div');
    catTitle.style.fontWeight = 'bold';
    catTitle.style.fontSize = '1.1em';
    catTitle.style.margin = '18px 0 8px 0';
    catTitle.innerHTML = `<span style="background:${cat.color};color:#fff;padding:4px 12px;border-radius:10px;font-size:0.95em;">${cat.icon} ${cat.label}</span>`;
    albumListDiv.appendChild(catTitle);
    // 슬라이드 row 컨테이너
    const slideWrap = document.createElement('div');
    slideWrap.className = 'album-slide-wrap';
    // 슬라이드 row
    const row = document.createElement('div');
    row.className = 'album-slide-row';
    const cardWidth = 150 + 18; // 카드+gap
    const isMobile = window.innerWidth <= 700;
    const VISIBLE = isMobile ? 2 : 4;
    if (window.albumSlideIndexes[cat.key] === undefined) window.albumSlideIndexes[cat.key] = 0;
    let slideIdx = window.albumSlideIndexes[cat.key];
    // 카드 생성 (slice로 DOM에 보이는 카드만 추가)
    function renderCards() {
      row.innerHTML = '';
      catAlbums.slice(slideIdx, slideIdx + VISIBLE).forEach(album => {
        row.appendChild(createAlbumCard(album, cat.key));
      });
    }
    // 슬라이드 이동 함수
    function updateSlide() {
      const maxIdx = Math.max(0, catAlbums.length - VISIBLE);
      if (slideIdx < 0) slideIdx = 0;
      if (slideIdx > maxIdx) slideIdx = maxIdx;
      window.albumSlideIndexes[cat.key] = slideIdx;
      leftBtn.disabled = slideIdx === 0;
      rightBtn.disabled = slideIdx === maxIdx;
      renderCards();
    }
    // 좌우 버튼
    const leftBtn = document.createElement('button');
    leftBtn.className = 'album-slide-btn left';
    leftBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';
    leftBtn.onclick = () => { slideIdx--; updateSlide(); };
    const rightBtn = document.createElement('button');
    rightBtn.className = 'album-slide-btn right';
    rightBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
    rightBtn.onclick = () => { slideIdx++; updateSlide(); };
    slideWrap.appendChild(leftBtn);
    slideWrap.appendChild(rightBtn);
    slideWrap.appendChild(row);
    albumListDiv.appendChild(slideWrap);
    // 최초 렌더
    renderCards();
  });
}

function createAlbumCard(album, catKey) {
  const card = document.createElement('div');
  card.className = 'album-card';
  card.style.background = '#fff5f5';
  card.style.borderRadius = '14px';
  card.style.padding = '12px 10px 10px 10px';
  card.style.marginBottom = '10px';
  card.style.width = '150px';
  card.style.boxShadow = '0 1px 4px #ffe0ec';
  card.style.border = '2px solid #ffd8d8';
  card.style.display = 'flex';
  card.style.flexDirection = 'column';
  card.style.alignItems = 'center';
  card.innerHTML = `
    <div class="album-img-wrap" style="width:100px;height:120px;overflow:hidden;border-radius:10px;margin-bottom:8px;background:#eee;display:flex;align-items:center;justify-content:center;cursor:pointer;">
      <img src="${album.image}" alt="앨범 이미지" style="width:100%;height:100%;object-fit:cover;">
    </div>
    <div style="font-size:0.9em;color:#ff7b9c;font-weight:bold;margin-bottom:2px;">${album.date || ''}</div>
    <div style="font-size:0.9em;color:#888;margin-bottom:2px;">${album.place || ''}</div>
    <div style="font-size:0.95em;color:#222;margin-bottom:2px;">${album.desc || ''}</div>
    <button class="delete-album" style="background:#ffd8d8;color:#ff6b6b;border:none;border-radius:8px;padding:2px 10px;font-size:0.9em;margin-top:4px;cursor:pointer;">삭제</button>
  `;
  card.querySelector('.delete-album').onclick = () => deleteAlbum(album.id);
  card.querySelector('.album-img-wrap').onclick = () => openAlbumPreview(album);
  return card;
}

function deleteAlbum(id) {
  if (confirm('정말 삭제하시겠습니까?')) {
    albums = albums.filter(a => a.id !== id);
    localStorage.setItem('albums', JSON.stringify(albums));
    renderAlbums();
  }
}

addAlbumBtn.onclick = function() {
  const date = albumDate.value;
  const place = albumPlace.value.trim();
  const category = albumCategory.value;
  const desc = albumDesc.value.trim();
  const file = albumImage.files[0];
  if (!date || !category || !file) {
    alert('날짜, 카테고리, 이미지는 필수입니다!');
    return;
  }
  // 이미지 리사이즈(최대 300KB, 최대 800px)
  const img = new Image();
  const reader = new FileReader();
  reader.onload = function(e) {
    img.onload = function() {
      const MAX_SIZE = 800;
      let w = img.width, h = img.height;
      if (w > h && w > MAX_SIZE) { h *= MAX_SIZE / w; w = MAX_SIZE; }
      else if (h > w && h > MAX_SIZE) { w *= MAX_SIZE / h; h = MAX_SIZE; }
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      let quality = 0.8, dataUrl;
      do {
        dataUrl = canvas.toDataURL('image/jpeg', quality);
        quality -= 0.1;
      } while (dataUrl.length > 300 * 1024 && quality > 0.3);
      albums.unshift({
        id: Date.now(),
        date,
        place,
        category,
        desc,
        image: dataUrl
      });
      try {
        localStorage.setItem('albums', JSON.stringify(albums));
      } catch (e) {
        alert('이미지 용량이 너무 큽니다. 더 작은 이미지를 선택해주세요.');
        albums.shift();
        return;
      }
      renderAlbums();
      albumDate.value = '';
      albumPlace.value = '';
      albumCategory.value = 'funny';
      albumImage.value = '';
      albumDesc.value = '';
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
};

tabs.forEach((tab, idx) => {
  tab.addEventListener('click', () => {
    tabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    if (idx === 0) {
      mainSection.style.display = '';
      letterSection.style.display = 'none';
      noteFilters.style.display = '';
      letterSearchBar.style.display = 'none';
      albumSection.style.display = 'none';
      questionSection.style.display = 'none';
    } else if (idx === 1) {
      mainSection.style.display = 'none';
      letterSection.style.display = '';
      noteFilters.style.display = 'none';
      letterSearchBar.style.display = '';
      renderLetters && renderLetters();
      albumSection.style.display = 'none';
      questionSection.style.display = 'none';
    } else if (idx === 2) {
      mainSection.style.display = 'none';
      letterSection.style.display = 'none';
      noteFilters.style.display = 'none';
      letterSearchBar.style.display = 'none';
      albumSection.style.display = '';
      renderAlbums && renderAlbums();
      questionSection.style.display = 'none';
    } else if (idx === 3) {
      mainSection.style.display = 'none';
      letterSection.style.display = 'none';
      noteFilters.style.display = 'none';
      letterSearchBar.style.display = 'none';
      albumSection.style.display = 'none';
      questionSection.style.display = '';
      renderQuestion();
      renderQuestionAnswers();
    } else {
      mainSection.style.display = '';
      letterSection.style.display = 'none';
      noteFilters.style.display = '';
      letterSearchBar.style.display = 'none';
      albumSection.style.display = 'none';
      questionSection.style.display = 'none';
    }
  });
});

// 편지함 검색 이벤트
const letterSearchInput = document.getElementById('letterSearchInput');
const letterAuthorFilter = document.getElementById('letterAuthorFilter');
const letterSearchBtn = document.getElementById('letterSearchBtn');

letterSearchInput.oninput = function() {
  letterSearchText = letterSearchInput.value;
  currentLetterPage = 1;
  renderLetters();
};
letterAuthorFilter.onchange = function() {
  letterSearchAuthor = letterAuthorFilter.value;
  currentLetterPage = 1;
  renderLetters();
};
letterSearchBtn.onclick = function() {
  letterSearchText = letterSearchInput.value;
  letterSearchAuthor = letterAuthorFilter.value;
  currentLetterPage = 1;
  renderLetters();
};

// 초기화
renderLetters();
noteFilters.style.display = '';
letterSearchBar.style.display = 'none';
albumSection.style.display = 'none';
renderAlbums();

// 앨범 검색창 이벤트
const albumSearchDateInput = document.getElementById('albumSearchDate');
const albumSearchPlaceInput = document.getElementById('albumSearchPlace');
const albumSearchBtn = document.getElementById('albumSearchBtn');
albumSearchDateInput.oninput = function() {
  albumSearchDate = albumSearchDateInput.value;
  renderAlbums();
};
albumSearchPlaceInput.oninput = function() {
  albumSearchPlace = albumSearchPlaceInput.value;
  renderAlbums();
};
albumSearchBtn.onclick = function() {
  albumSearchDate = albumSearchDateInput.value;
  albumSearchPlace = albumSearchPlaceInput.value;
  renderAlbums();
};

// ===================== 오늘의 질문 기능 =====================
// 예시 질문 데이터 (실제 서비스라면 서버에서 받아옴)
const firstQuestionDate = '2025-05-23';
// 질문 리스트
const questionList = [
  // 연애초기
  '어떤 기념일들을 챙기고 싶어?',
  '화날 때 시간이 필요한 스타일이야?',
  '평소에 스트레스는 어떻게 해결해?',
  '연애할 때 남사친/여사친들의 허용 범위는 뭐야?',
  '어떤 데이트들을 좋아해?',
  '데이트 로망이 있어?',
  '마지막 연애는 어떤 이유로 헤어졌어?',
  '연애하면서 꼭 지켜줬으면 하는 게 있어?',
  '질투는 많은 편이야?',
  '일주일에 얼마만큼의 시간을 혼자 보내야 해?',
  '자기 자신을 한 가지 단어로 표현하자면 뭐야?',
  '"사랑해"라는 단어를 얼마나 신중하게 생각해?',
  '요즘 취미 생활은 뭐야?',
  '가장 좋아하는 집안일은 뭐야?',
  '가장 좋아하는 음식이 뭐야?',
  '가장 싫어하는 음식이 뭐야?',
  '본인이 생각하는 본인의 단점은 뭐야?',
  '결혼에 대해 어떻게 생각해?',
  '이성을 볼 때 제일 먼저 보는 게 뭐야?',
  '나의 어떤 점이 제일 좋아?',
  // 연애중, 말기
  '연애하면서 권태기가 온 적 있어?',
  '권태기가 오면 어떻게 해결하고 싶어?',
  '나에게 권태기가 왔을때 (그/녀)가 말투나 행동, 연락 빈도 등을 어떻게 해주면 좋을 것 같아?',
  '함께 해보고 싶은 일 세 가지는?',
  '그(녀)의 가장 사랑스러운 점은?',
  '그(녀)의 눈동자를 바라봤던 어떤 느낌이 들어?',
  '그(녀)의 강한 점은?',
  '그(녀)에게 당부하고 싶은 것은?',
  '사랑하기 때문에 _______ 수 있다.',
  '그(녀)를 만나고 내가 바뀐 점이 있다면?',
  '해보고 싶은 소박한 데이트는?',
  '연인과 길을 걸을 때 어떤 기분이 들어?',
  '그(녀)의 얼굴에서 내가 가장 좋아하는 부분은 어디야?',
  '이것만큼은 욕심을 부려도 된다고 생각하는 것이 있다면?',
  '삶에서 가슴 벅차오르는 순간은?',
  '내가 좋아하는 시 구절은?',
  '그(녀)의 한결같은 모습은?',
  '가장 두려워하는 것은 뭐야?',
  '그(녀)의 가장 매력적인 부분은?',
  '아픔은 사람을 성숙하게 할까?',
  '그(녀)의 매력포인트는?',
  '불안감을 느낄 때는 언제야?',
  '행복은 어디에 있다고 생각해?',
  '좀비 아포칼립스 시대에 애인이 좀비에게 물렸다면?',
  '제일 기쁠 때는 언제야?',
  '나의 마음에 집이 있다고 상상해 봐. 그(녀)는 어느 방에서 무엇을 하고 있어?',
  '사과하지 못하고 지나간 일은?',
  '그(녀)의 성격은 어때?',
  '최근에 가장 잘한 일은 뭐야?',
  '요즘 애정표현이 부족하다고 느낀 적 있어?',
  '내가 말을 안 해서 답답했던 적 있어?',
  '요즘 너무 편하게만 만나서 서운했던 적 있어?',
  '연락 빈도는 괜찮은 거 같아?',
  '결혼은 대충 언제쯤에 하고 싶어?',
  '내가 무심코 내뱉은 말 또는 행동에 상처받았던 적 있어?',
  '기분이 상하거나 상처 받았을 때 혼자 쌓아두는 편이야?',
  '데이트 비용이 부담된 적 있어?',
  '우리가 함께하면서 더 좋은 방향으로 발전한다고 생각해?',
  '더 나은 연애를 위해 어떤 점을 노력했으면 좋겠어?',
  '나와 꼭 함께 가고 싶은 해외 여행지는 어디야?',
  '혹시 아직까지 말 못 한 성향/비밀이 있어?',
  '내가 솔직하게 하는 말 중에 부담이 되는 게 있어?',
  '앞으로 어떤 연애생활을 이어나가고 싶어?',
  '이거는 고쳐줬으면 좋겠다 하는 부분이 있어?',
  '여태 데이트 중에 뭐가 제일 기억에 남아?',
  '갔던 맛집들 중에 어디가 제일 맛있었어?',
  '다음 기념일에 가지고 싶은 선물은 뭐야?',
  
  // 예비신랑신부
  '원하는 자녀 계획이 있어?',
  '결혼 어떻게 했으면 좋겠어?',
  '집안일은 어떻게 분배하고 싶어?',
  '육아는 어떻게 했으면 좋겠어?',
  '돈관리는 어떻게 하고 싶어?',
  '명절에 관련된 활동은 어떻게 하고 싶어?',
  '각방에 대해 어떻게 생각해?',
  '타협이 어려운 갈등이 생겼을 때 어떻게 해결하는 게 좋을 거 같아?',
  '신혼여행이랑 결혼식에 얼마까지 지출할 수 있어?',
  '언제 가장 혼자 있고 싶어?',
  '같이 살면 어떻게 했으면 좋겠어?',
  '서로의 부모님께 어떻게 하는 게 좋을 거 같아?',
  '만약 부모님이 날 마음에 안 들어 하면 어떻게 할거야?',
  '잠자리는 얼마나 중요하다고 생각해?',
  '어려울 때 가정내 의견 차이를 어떻게 해결했으면 해?',
  '돈을 가장 많이 쓸 곳은 어디야?',
  '얼마나 안정적인 삶을 꿈꿔?',
  '한달에 저축과 지출은 얼마 정도야?',
  '직장 때문에 이사를 가야 한다면 이사를 갈 수 있어?',
  '반려동물 키우고 싶은 생각 있어?',
];
const today = getSeoulDateStr();
const startDate = new Date(firstQuestionDate + 'T00:00:00+09:00');
startDate.setHours(0,0,0,0);
const diffDays = Math.floor((today - startDate) / (1000*60*60*24)) + 1;
const todayQuestion = {
  number: diffDays,
  date: getSeoulDateYMD(),
  title: questionList[(diffDays-1) % questionList.length],
  authors: ['J.W', 'H.N']
};
// 내 이름(로컬스토리지에 저장, 없으면 첫 진입 시 prompt)
let myName = localStorage.getItem('myName');
if (!myName || !['J.W','H.N'].includes(myName)) {
  myName = prompt('이름을 선택하세요 (J.W 또는 H.N)', 'J.W');
  if (!['J.W','H.N'].includes(myName)) myName = 'J.W';
  localStorage.setItem('myName', myName);
}
let otherName = todayQuestion.authors.find(n => n !== myName);
// 답변 데이터 (로컬스토리지)
let answers = JSON.parse(localStorage.getItem('todayAnswers') || '{}');
if (!answers[todayQuestion.number]) answers[todayQuestion.number] = {};

function renderQuestion() {
  questionTitle.textContent = todayQuestion.title;
  questionNumber.textContent = `#${todayQuestion.number}번째 질문`;
  questionDate.textContent = todayQuestion.date + ' (KST)';
}

// 오늘의 질문 답변 리스트 기능
const questionAnswerForm = document.getElementById('questionAnswerForm');
const questionAnswerInput = document.getElementById('questionAnswerInput');
const questionAnswerAuthor = document.getElementById('questionAnswerAuthor');
const questionAnswerList = document.getElementById('questionAnswerList');
// 검색바 DOM
const questionAnswerSearchInput = document.getElementById('questionAnswerSearchInput');
const questionAnswerAuthorFilter = document.getElementById('questionAnswerAuthorFilter');
const questionAnswerSearchBtn = document.getElementById('questionAnswerSearchBtn');
// 검색 상태
let questionAnswerSearchText = '';
let questionAnswerSearchAuthor = 'all';
if (questionAnswerSearchInput && questionAnswerAuthorFilter && questionAnswerSearchBtn) {
  questionAnswerSearchInput.oninput = function() {
    questionAnswerSearchText = questionAnswerSearchInput.value;
    renderQuestionAnswers();
  };
  questionAnswerAuthorFilter.onchange = function() {
    questionAnswerSearchAuthor = questionAnswerAuthorFilter.value;
    renderQuestionAnswers();
  };
  questionAnswerSearchBtn.onclick = function() {
    questionAnswerSearchText = questionAnswerSearchInput.value;
    questionAnswerSearchAuthor = questionAnswerAuthorFilter.value;
    renderQuestionAnswers();
  };
}
let allAnswers = JSON.parse(localStorage.getItem('allQuestionAnswers') || '{}');
function renderQuestionAnswers() {
  const qKey = todayQuestion.number + '_' + todayQuestion.title;
  let list = (allAnswers[qKey] || []).slice().sort((a,b)=>b.time.localeCompare(a.time));
  // 검색 필터 적용
  if (questionAnswerSearchText) {
    list = list.filter(ans => ans.content.toLowerCase().includes(questionAnswerSearchText.toLowerCase()));
  }
  if (questionAnswerSearchAuthor !== 'all') {
    list = list.filter(ans => ans.author === questionAnswerSearchAuthor);
  }
  questionAnswerList.innerHTML = '';
  list.forEach((ans, idx) => {
    const card = document.createElement('div');
    card.className = 'question-answer-item';
    card.innerHTML = `
      <div class="answer-title">${todayQuestion.title}<span>🎁</span>
        <button class="delete-answer-btn" title="삭제"><i class="fas fa-trash"></i></button>
      </div>
      <div class="answer-content">${ans.content}</div>
      <div class="answer-meta">date: ${ans.time}</div>
      <div class="answer-author">from: ${ans.author}</div>
    `;
    card.querySelector('.delete-answer-btn').onclick = () => {
      if (confirm('정말 삭제하시겠습니까?')) {
        allAnswers[qKey].splice(idx, 1);
        localStorage.setItem('allQuestionAnswers', JSON.stringify(allAnswers));
        renderQuestionAnswers();
      }
    };
    questionAnswerList.appendChild(card);
  });
}
questionAnswerForm.onsubmit = function(e) {
  e.preventDefault();
  const content = questionAnswerInput.value.trim();
  const author = questionAnswerAuthor.value;
  if (!content) return;
  const qKey = todayQuestion.number + '_' + todayQuestion.title;
  if (!allAnswers[qKey]) allAnswers[qKey] = [];
  allAnswers[qKey].push({
    content,
    author,
    time: getSeoulDateTimeStr()
  });
  localStorage.setItem('allQuestionAnswers', JSON.stringify(allAnswers));
  questionAnswerInput.value = '';
  renderQuestionAnswers();
};