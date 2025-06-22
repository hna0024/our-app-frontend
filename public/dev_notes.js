// Firebase 초기화 확인
if (!firebaseInitialized) {
  console.error('Firebase is not initialized');
  alert('데이터베이스 연결에 실패했습니다. 페이지를 새로고침해주세요.');
} else {
  const db = firebase.database();

  let editingId = null; 

  // DOM 요소
  const devNoteList = document.getElementById('devNoteList');
  const addBtn = document.getElementById('addBtn');
  const modal = document.getElementById('modal');
  const closeModal = document.getElementById('closeModal');
  const devNoteForm = document.getElementById('devNoteForm');
  const modalContent = document.getElementById('modalContent');
  const modalDate = document.getElementById('modalDate');
  const modalTitle = document.getElementById('modalTitle');
  const modalTitleInput = document.getElementById('modalTitleInput');
  const saveBtn = document.getElementById('saveBtn');
  const search = document.getElementById('search');

  // 페이지네이션 상태
  let devNotePage = 1;
  const ITEMS_PER_PAGE = 3;

  // 데이터
  let devNotes = [];

  // 데이터 불러오기
  function loadDevNotesFromFirebase() {
    db.ref('devNotes').on('value', snapshot => {
      devNotes = [];
      snapshot.forEach(child => {
        const note = child.val();
        note.id = child.key;
        devNotes.push(note);
      });
      render();
    });
  }

  // 렌더링 함수
  function render() {
    devNoteList.innerHTML = '';
    const searchVal = search.value.toLowerCase();

    const filteredNotes = devNotes.filter(note =>
      (note.content.toLowerCase().includes(searchVal))
    );
    filteredNotes.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    const totalPages = Math.ceil(filteredNotes.length / ITEMS_PER_PAGE) || 1;
    if (devNotePage > totalPages) devNotePage = totalPages;
    const start = (devNotePage - 1) * ITEMS_PER_PAGE;
    const pageItems = filteredNotes.slice(start, start + ITEMS_PER_PAGE);
    
    pageItems.forEach(note => devNoteList.appendChild(createDevNoteCard(note)));
    renderPagination(totalPages, devNotePage, p => { devNotePage = p; render(); });
  }

  function createDevNoteCard(note) {
    const card = document.createElement('div');
    card.className = 'memo-card'; // 기존 스타일 재사용
    card.innerHTML = `
      <div class="title">${note.title}</div>
      <div class="date">Date: ${note.date}  From: ${note.author}</div>
      <div class="content" style="white-space: pre-wrap;">${note.content}</div>
      <div class="card-btns">
        <button class="edit" title="수정"><i class="fas fa-pen"></i></button>
        <button class="delete" title="삭제"><i class="fas fa-trash"></i></button>
      </div>
    `;
    card.querySelector('.edit').onclick = () => openModal('edit', note);
    card.querySelector('.delete').onclick = () => deleteDevNote(note.id);
    return card;
  }

  // 모달 열기/닫기
  function openModal(mode, note = null) {
    modal.style.display = 'flex';
    if (mode === 'edit' && note) {
      modalTitle.textContent = '개발노트 수정';
      modalTitleInput.value = note.title || '';
      modalContent.value = note.content;
      
      if (note.date) {
        const dateParts = note.date.split(', ');
        const dateStr = dateParts[0];
        const timeStr = dateParts[1] || '00:00';
        const [year, month, day] = dateStr.split('-');
        const [hour, minute] = timeStr.split(':');
        const formattedDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;
        modalDate.value = formattedDate;
      }
      editingId = note.id;
    } else {
      modalTitle.textContent = '개발노트 추가';
      modalTitleInput.value = '';
      modalContent.value = '';
      
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hour = String(now.getHours()).padStart(2, '0');
      const minute = String(now.getMinutes()).padStart(2, '0');
      modalDate.value = `${year}-${month}-${day}T${hour}:${minute}`;
      
      editingId = null;
    }
  }

  function closeModalFunc() {
    modal.style.display = 'none';
    devNoteForm.reset();
    editingId = null;
  }

  devNoteForm.onsubmit = function(e) {
    e.preventDefault();
  
    const dateTimeValue = modalDate.value;
    const dateTime = new Date(dateTimeValue);
    const dateStr = `${dateTime.getFullYear()}-${String(dateTime.getMonth()+1).padStart(2,'0')}-${String(dateTime.getDate()).padStart(2,'0')}, ${String(dateTime.getHours()).padStart(2,'0')}:${String(dateTime.getMinutes()).padStart(2,'0')}`;
  
    const note = {
      title: modalTitleInput.value,
      author: localStorage.getItem('myName') || 'Guest',
      content: modalContent.value,
      date: dateStr
    };
  
    if (editingId) {
      db.ref(`devNotes/${editingId}`).update(note);
    } else {
      const newRef = db.ref('devNotes').push();
      note.id = newRef.key;
      newRef.set(note);
    }
  
    closeModalFunc();
  };

  function deleteDevNote(id) {
    if (confirm('정말 삭제하시겠습니까?')) {
      db.ref(`devNotes/${id}`).remove();
    }
  }

  function renderPagination(totalPages, currentPage, onPageChange) {
    const pagContainer = document.getElementById('pagination');
    pagContainer.innerHTML = '';

    if (totalPages <= 1) return;

    let prevBtn = document.createElement('button');
    prevBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';
    prevBtn.className = 'page-btn prev';
    prevBtn.onclick = () => { if (currentPage > 1) onPageChange(currentPage - 1); };
    if (currentPage === 1) prevBtn.disabled = true;
    pagContainer.appendChild(prevBtn);

    const maxPages = 8;
    let startPage, endPage;
    if (totalPages <= maxPages) {
        startPage = 1;
        endPage = totalPages;
    } else {
        const maxPagesBeforeCurrentPage = Math.floor(maxPages / 2) -1;
        const maxPagesAfterCurrentPage = Math.ceil(maxPages / 2);
        if (currentPage <= maxPagesBeforeCurrentPage +1) {
            startPage = 1;
            endPage = maxPages;
        } else if (currentPage + maxPagesAfterCurrentPage >= totalPages) {
            startPage = totalPages - maxPages + 1;
            endPage = totalPages;
        } else {
            startPage = currentPage - maxPagesBeforeCurrentPage;
            endPage = currentPage + maxPagesAfterCurrentPage-1;
        }
    }

    for (let i = startPage; i <= endPage; i++) {
      let btn = document.createElement('button');
      btn.textContent = i;
        btn.className = 'page-btn';
        if (i === currentPage) btn.classList.add('active');
      btn.onclick = () => onPageChange(i);
      pagContainer.appendChild(btn);
    }

    let nextBtn = document.createElement('button');
    nextBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
    nextBtn.className = 'page-btn next';
    nextBtn.onclick = () => { if (currentPage < totalPages) onPageChange(currentPage + 1); };
    if (currentPage === totalPages) nextBtn.disabled = true;
    pagContainer.appendChild(nextBtn);
  }

  // 이벤트 바인딩
  addBtn.onclick = () => openModal('add');
  closeModal.onclick = closeModalFunc;
  window.onclick = function(e) {
    if (e.target === modal) closeModalFunc();
  };
  search.oninput = render;

  loadDevNotesFromFirebase();
} 