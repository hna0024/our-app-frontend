// Firebase 초기화 확인
if (!firebaseInitialized) {
  console.error('Firebase is not initialized');
  alert('데이터베이스 연결에 실패했습니다. 페이지를 새로고침해주세요.');
} else {
  const db = firebase.database();
  const storage = firebase.storage();

  let editingId = null; // 현재 수정 중인 메모 ID를 저장
  let editingAlbum = null;
  let editingLetter = null;
  const editLetterModal = document.getElementById('editLetterModal');
  const editLetterContent = document.getElementById('editLetterContent');
  const saveEditLetterBtn = document.getElementById('saveEditLetterBtn');
  const closeEditLetterModal = document.getElementById('closeEditLetterModal');
  const calendarMonthLabel = document.getElementById('calendarMonth');
  const calendarGrid = document.getElementById('calendarGrid');
  const prevMonthBtn = document.getElementById('prevMonth');
  const nextMonthBtn = document.getElementById('nextMonth');
  const calendarEvents = {};  // firebase에서 불러온 일정 저장용
  let currentMonth = new Date();

  const sampleEvents = {
    '2025-5-26': [{ title: '전시회', author: 'J.W' }],
    '2025-5-28': [{ title: '데이트', author: 'H.N' }]
  };

  window.onclick = function(e) {
    if (e.target === editLetterModal) editLetterModal.style.display = 'none';
    if (e.target === addCalendarEventModal) closeAddCalendarEventModalFunc();
  };
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
  const modalDate = document.getElementById('modalDate');
  const saveBtn = document.getElementById('saveBtn');
  const search = document.getElementById('search');
  const typeFilter = document.getElementById('typeFilter');
  const authorFilter = document.getElementById('authorFilter');

  // 편지함 DOM
  const sendLetterBtn = document.getElementById('sendLetter');
  const letterContentInput = document.getElementById('letterContent');
  const letterToInput = document.getElementById('letterTo');
  const letterListDiv = document.getElementById('letterList');
  const editLetterDate = document.getElementById('editLetterDate');

  // 페이지네이션 상태
  let memoPage = 1;
  let todoPage = 1;
  const ITEMS_PER_PAGE = 3;

  // 메모 데이터
  let memos = [];
  let letters = [];
  let currentLetterPage = 1;
  let letterSearchText = '';
  let letterSearchAuthor = 'all';
  let questionAnswerPage = 1;

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

  // 1-2. 메모 불러오기 (render 함수 전에 추가)
  function loadMemosFromFirebase() {
    db.ref('memos').on('value', snapshot => {
      memos = [];
      snapshot.forEach(child => {
        const memo = child.val();
        memo.id = child.key;
        memos.push(memo);
      });
      render();
    });
  }

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
    filteredMemos.sort((a, b) => new Date(b.date) - new Date(a.date)); //내림차순 정렬렬
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
    filteredTodos.sort((a, b) => new Date(b.date) - new Date(a.date)); //내림차순 정렬렬
    const todoTotalPages = Math.ceil(filteredTodos.length / ITEMS_PER_PAGE) || 1;
    if (todoPage > todoTotalPages) todoPage = todoTotalPages;
    const todoStart = (todoPage - 1) * ITEMS_PER_PAGE;
    const todoPageItems = filteredTodos.slice(todoStart, todoStart + ITEMS_PER_PAGE);
    todoPageItems.forEach(memo => todoList.appendChild(createTodoCard(memo)));
    renderPagination(todoList, todoTotalPages, todoPage, p => { todoPage = p; render(); });
  }

  function renderCalendar() {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    calendarMonthLabel.textContent = `${year}년 ${month + 1}월`;
  
    const firstDay = new Date(year, month, 1).getDay();
    const lastDate = new Date(year, month + 1, 0).getDate();
  
    calendarGrid.innerHTML = '';
  
    const days = ['SUN','MON','TUE','WED','THU','FRI','SAT'];
    days.forEach(d => {
      const cell = document.createElement('div');
      cell.textContent = d;
      cell.style.fontWeight = 'bold';
      cell.style.textAlign = 'center';
      calendarGrid.appendChild(cell);
    });
  
    for (let i = 0; i < firstDay; i++) {
      const empty = document.createElement('div');
      calendarGrid.appendChild(empty);
    }
  
    // 오늘 날짜 정보 가져오기
    const today = new Date();
    const todayYear = today.getFullYear();
    const todayMonth = today.getMonth();
    const todayDate = today.getDate();
  
    for (let date = 1; date <= lastDate; date++) {
      const cell = document.createElement('div');
      cell.className = 'calendar-cell';
  
      // 오늘 날짜인지 확인
      const isToday = (year === todayYear && month === todayMonth && date === todayDate);
      if (isToday) {
        cell.classList.add('today');
      }
  
      const dateSpan = document.createElement('div');
      dateSpan.className = 'date';
      dateSpan.textContent = date;
      cell.appendChild(dateSpan);
  
      // 오늘 날짜인 경우 하트 아이콘 추가
      if (isToday) {
        const heartIcon = document.createElement('div');
        heartIcon.className = 'today-heart';
        heartIcon.innerHTML = '<i class="fas fa-heart"></i>';
        cell.appendChild(heartIcon);
      }
  
      const key = `${year}-${month + 1}-${date}`;
      const events = calendarEvents[key] || [];
  
      events.forEach(e => {
        const tag = document.createElement('div');
        tag.className = e.author === 'J.W' ? 'event-jw' : 'event-hn';
        tag.textContent = e.title;
        tag.dataset.eventId = e.id; // 이벤트 ID 저장
        tag.onclick = (event) => { // event 객체를 인자로 받도록 수정
          event.stopPropagation(); // 이벤트 버블링 중지
          editingCalendarEventId = e.id;
          editCalendarEventDate.value = e.date; // 날짜 필드 채우기
          editCalendarEventTitle.value = e.title; // 제목 필드 채우기
          // editCalendarEventAuthor.textContent = e.author; // 작성자 표시 (선택 사항)
          // '일정 등록' 모달이 열려있으면 닫기
          closeAddCalendarEventModalFunc();
          editCalendarEventModal.style.display = 'flex'; // '일정 수정' 모달 열기
        };
        cell.appendChild(tag);
      });
  
      // 캘린더 셀 클릭 시 '일정 등록' 모달 열기 (새로 추가)
      cell.onclick = () => {
        // '일정 수정' 모달이 열려있으면 닫기
        closeEditCalendarEventModalFunc();
        // 클릭된 날짜로 모달 필드 채우기
        const clickedDate = new Date(year, month, date);
        const yyyy = clickedDate.getFullYear();
        const mm = String(clickedDate.getMonth() + 1).padStart(2, '0'); // 월은 0부터 시작하므로 1을 더하고 두 자리로 포맷
        const dd = String(clickedDate.getDate()).padStart(2, '0'); // 일을 두 자리로 포맷
        const dateString = `${yyyy}-${mm}-${dd}`;
        modalCalendarEventDate.value = dateString;
        // 클릭된 날짜로 종료 날짜도 초기 설정 (새로 추가)
        modalCalendarEventEndDate.value = dateString;
        modalCalendarEventTitle.value = ''; // 제목 필드는 비워둠
        // 작성자는 기본값('J.W')으로 설정되도록 select 태그를 그대로 사용

        addCalendarEventModal.style.display = 'flex'; // '일정 등록' 모달 열기
      };
  
      calendarGrid.appendChild(cell);
    }
  }
  
  prevMonthBtn.onclick = () => {
    currentMonth.setMonth(currentMonth.getMonth() - 1);
    renderCalendar();
  };
  nextMonthBtn.onclick = () => {
    currentMonth.setMonth(currentMonth.getMonth() + 1);
    renderCalendar();
  };
  
  function loadCalendarEventsFromFirebase() {
    db.ref('calendarEvents').on('value', snapshot => {
      Object.keys(calendarEvents).forEach(k => delete calendarEvents[k]); // 초기화
      snapshot.forEach(child => {
        const event = child.val();
        // event 객체와 date 속성이 유효한지 확인
        if (event && typeof event.date === 'string') {
          const [y, m, d] = event.date.split('-');
          const key = `${+y}-${+m}-${+d}`;
          if (!calendarEvents[key]) calendarEvents[key] = [];
          calendarEvents[key].push(event);
        } else {
          console.warn('Skipping invalid calendar event data:', event);
        }
      });
      renderCalendar();
    });
  }

  // 기존 일정 추가 버튼 클릭 리스너 (새로운 모달의 버튼으로 변경)
  const addCalendarEventBtn = document.getElementById('modalAddCalendarEventBtn'); // ID 변경
  const calendarEventDate = document.getElementById('modalCalendarEventDate'); // ID 변경
  const calendarEventTitle = document.getElementById('modalCalendarEventTitle'); // ID 변경
  const calendarEventAuthor = document.getElementById('modalCalendarEventAuthor'); // ID 변경
  // 일정 등록 모달 종료 날짜 변수 추가
  const modalCalendarEventEndDate = document.getElementById('modalCalendarEventEndDate');
  
  addCalendarEventBtn.onclick = () => {
    const date = calendarEventDate.value;
    const title = calendarEventTitle.value.trim();
    const author = calendarEventAuthor.value;
    const endDate = modalCalendarEventEndDate.value; // 종료 날짜 값 가져오기
  
    if (!date || !title || !endDate) { // 종료 날짜 유효성 검사 추가
      alert('시작 날짜, 종료 날짜, 제목을 입력하세요!');
      return;
    }

    const startDateObj = new Date(date);
    const endDateObj = new Date(endDate);

    if (startDateObj > endDateObj) { // 시작 날짜가 종료 날짜보다 늦으면 경고
      alert('종료 날짜는 시작 날짜보다 빠를 수 없습니다!');
      return;
    }

    const eventPromises = [];
    // 시작 날짜부터 종료 날짜까지 각 날짜에 대해 일정 추가
    for (let d = new Date(startDateObj); d <= endDateObj; d.setDate(d.getDate() + 1)) {
      const eventDateString = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const ref = db.ref('calendarEvents').push();
      const data = {
        id: ref.key,
        date: eventDateString,
        title,
        author
      };
      eventPromises.push(ref.set(data));
    }

    // 모든 일정이 추가된 후 처리
    Promise.all(eventPromises).then(() => {
      calendarEventTitle.value = '';
      modalCalendarEventDate.value = ''; // 시작 날짜 초기화
      modalCalendarEventEndDate.value = ''; // 종료 날짜 초기화
      loadCalendarEventsFromFirebase();
      closeAddCalendarEventModalFunc(); // 일정 등록 후 모달 닫기
    }).catch(error => {
      console.error('일정 등록 중 오류 발생:', error);
      alert('일정 등록에 실패했습니다.');
    });
  };
  
  function renderPagination(container, totalPages, currentPage, onPageChange) {
    // 기존 페이지네이션 삭제 (중복 방지)
    const existingPag = container.querySelector('.pagination');
    if (existingPag) {
        container.removeChild(existingPag);
    }

    if (totalPages <= 1) {
        return; // 페이지가 1개 이하면 페이지네이션 숨김
    }

    let pag = document.createElement('div');
    pag.className = 'pagination';

    // 이전 페이지 버튼
    let prevBtn = document.createElement('button');
    prevBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';
    prevBtn.className = 'page-btn prev';
    prevBtn.onclick = () => { if (currentPage > 1) onPageChange(currentPage - 1); };
    if (currentPage === 1) prevBtn.disabled = true;
    pag.appendChild(prevBtn);

    // 페이지 번호 버튼
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
      pag.appendChild(btn);
    }

    // 다음 페이지 버튼
    let nextBtn = document.createElement('button');
    nextBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
    nextBtn.className = 'page-btn next';
    nextBtn.onclick = () => { if (currentPage < totalPages) onPageChange(currentPage + 1); };
    if (currentPage === totalPages) nextBtn.disabled = true;
    pag.appendChild(nextBtn);

    // 컨테이너의 마지막 자식으로 페이지네이션 추가
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
      db.ref(`memos/${memo.id}`).update({ completed: memo.completed });
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
      
      // 기존 날짜를 datetime-local 형식으로 변환
      if (memo.date) {
        const dateParts = memo.date.split(', ');
        const dateStr = dateParts[0];
        const timeStr = dateParts[1] || '00:00';
        const [year, month, day] = dateStr.split('-');
        const [hour, minute] = timeStr.split(':');
        const formattedDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;
        modalDate.value = formattedDate;
      }
      
      editingId = memo.id;
    } else {
      modalTitle.textContent = '일기 추가';
      modalType.value = 'memo';
      modalAuthor.value = 'J.W';
      modalContent.value = '';
      
      // 현재 날짜와 시간으로 설정
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
    memoForm.reset();
    editingId = null;
  }

  // 1. 메모 저장 로직 수정 (기존 memoForm.onsubmit 교체)
  memoForm.onsubmit = function(e) {
    e.preventDefault();
  
    // datetime-local 값을 기존 형식으로 변환
    const dateTimeValue = modalDate.value;
    const dateTime = new Date(dateTimeValue);
    const dateStr = `${dateTime.getFullYear()}-${String(dateTime.getMonth()+1).padStart(2,'0')}-${String(dateTime.getDate()).padStart(2,'0')}, ${String(dateTime.getHours()).padStart(2,'0')}:${String(dateTime.getMinutes()).padStart(2,'0')}`;
  
    const memo = {
      type: modalType.value,
      author: modalAuthor.value,
      content: modalContent.value,
      date: dateStr
    };
  
    if (editingId) {
      // 수정 모드 - 날짜도 함께 수정
      db.ref(`memos/${editingId}`).update(memo).then(() => showTabAlert('note'));
    } else {
      // 추가 모드
      const newRef = db.ref('memos').push();
      memo.id = newRef.key;
      memo.completed = false;
      newRef.set(memo).then(() => showTabAlert('note'));
    }
  
    closeModalFunc();
  };

  // 일기 삭제
  function deleteMemo(id) {
    if (confirm('정말 삭제하시겠습니까?')) {
      db.ref(`memos/${id}`).remove().then(() => showTabAlert('note'));
    }
  }

  // 이벤트 바인딩
  addBtn.onclick = () => openModal('add');
  closeModal.onclick = closeModalFunc;
  window.onclick = function(e) {
    if (e.target === modal) closeModalFunc();
    if (e.target === editCalendarEventModal) closeEditCalendarEventModalFunc();
    if (e.target === addCalendarEventModal) closeAddCalendarEventModalFunc();
  };
  search.oninput = render;
  typeFilter.onchange = render;
  authorFilter.onchange = render;

  // 노트 섹션 텍스트 입력 필드에 Enter 키 이벤트 핸들러 추가
  modalContent.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const cursorPos = this.selectionStart;
      const textBefore = this.value.substring(0, cursorPos);
      const textAfter = this.value.substring(cursorPos);
      this.value = textBefore + '\n' + textAfter;
      this.selectionStart = this.selectionEnd = cursorPos + 1;
    }
  });

  // 편지함 섹션 텍스트 입력 필드에 Enter 키 이벤트 핸들러 추가
  letterContentInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const cursorPos = this.selectionStart;
      const textBefore = this.value.substring(0, cursorPos);
      const textAfter = this.value.substring(cursorPos);
      this.value = textBefore + '\n' + textAfter;
      this.selectionStart = this.selectionEnd = cursorPos + 1;
    }
  });

  // 편지함 편집 모달 텍스트 입력 필드에 Enter 키 이벤트 핸들러 추가
  editLetterContent.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const cursorPos = this.selectionStart;
      const textBefore = this.value.substring(0, cursorPos);
      const textAfter = this.value.substring(cursorPos);
      this.value = textBefore + '\n' + textAfter;
      this.selectionStart = this.selectionEnd = cursorPos + 1;
    }
  });

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
        specialMsg = `�� ${diffDays/365}주년 축하해요! 💝`;
      }
      h1.innerHTML = `우리 만난지 <span style="color:#ff7b9c;font-weight:bold;">${diffDays}</span><span style="color:#ff6b6b;font-weight:bold;">일 째</span>♥` + (special ? `<div class='special-dday'>${specialMsg}</div>` : '');
      if (special) {
        h1.classList.add('special-h1');
      } else {
        h1.classList.remove('special-h1');
      }
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    updateDdayDisplay();
    renderCalendar();
    loadCalendarEventsFromFirebase();
    loadMemosFromFirebase();
    loadLettersFromFirebase();
    loadAlbumsFromFirebase();
    renderQuestionAnswers();

    // ↓ 초기 진입 시 달력만 보이도록 수정
    const tabContents = document.querySelectorAll('.tab-content');
    const mainSection = document.querySelector('.main');
    const noteFilters = document.getElementById('noteFilters');
    const calendarSection = document.getElementById('calendar-section'); // 달력 섹션 DOM 추가

    // 모든 tab-content 숨기고 달력만 보이게
    tabContents.forEach(sec => sec.style.display = 'none');
    mainSection.style.display = 'none'; // 노트 섹션 숨김
    noteFilters.style.display = 'none'; // 노트 필터 숨김
    calendarSection.style.display = ''; // 달력 섹션 보이게

    // Note: 탭 버튼의 active 클래스는 index.html에서 설정합니다.

    // 사용자 환영 메시지 표시
    const userWelcome = document.getElementById('user-welcome');
    let myName = localStorage.getItem('myName');
    if (userWelcome && myName) {
      userWelcome.textContent = `${myName}님 환영합니다! 🐰`;
    }
  });

  const editAlbumModal = document.getElementById('editAlbumModal');
  const editAlbumDate = document.getElementById('editAlbumDate');
  const editAlbumPlace = document.getElementById('editAlbumPlace');
  const editAlbumDesc = document.getElementById('editAlbumDesc');
  const saveEditAlbumBtn = document.getElementById('saveEditAlbumBtn');
  const closeEditAlbumModal = document.getElementById('closeEditAlbumModal');

  closeEditAlbumModal.onclick = () => {
    editAlbumModal.style.display = 'none';
    editingAlbum = null;
  };
  window.onclick = function(e) {
    if (e.target === editAlbumModal) editAlbumModal.style.display = 'none';
    if (e.target === modal) closeModalFunc();
    if (e.target === addCalendarEventModal) closeAddCalendarEventModalFunc();
  };


  // ===================== 편지함 기능 =====================

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
          <div style="font-size:1rem;margin-bottom:6px;white-space:pre-wrap;">${letter.content}</div>
          <div style="font-size:0.95em;color:#888;margin-bottom:2px;">date: ${letter.date}</div>
          <div style="font-size:0.95em;color:#ff7b7b;font-weight:bold;">from: ${letter.from}</div>
          <div style="font-size:0.95em;color:#228be6;">to: ${letter.to}</div>
        </div>
        <button class="edit-letter letter-icon" title="수정" style="background:none;border:none;cursor:pointer;margin-left:8px;color:#228be6;"><i class="fas fa-pen"></i></button>
        <button class="delete-letter letter-icon" title="삭제" style="background:none;border:none;cursor:pointer;margin-left:10px; color:#ff6b6b;"><i class="fas fa-trash"></i></button>
      </div>
    `;
    card.querySelector('.edit-letter').onclick = () => {
      editingLetter = letter;
      editLetterContent.value = letter.content;
      
      // 기존 날짜를 datetime-local 형식으로 변환
      if (letter.date) {
        const dateParts = letter.date.split(', ');
        const dateStr = dateParts[0];
        const timeStr = dateParts[1] || '00:00';
        const [year, month, day] = dateStr.split('-');
        const [hour, minute] = timeStr.split(':');
        const formattedDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;
        editLetterDate.value = formattedDate;
      }
      
      editLetterModal.style.display = 'flex';
    };
    
    card.querySelector('.delete-letter').onclick = () => deleteLetter(letter.id);
    return card;
  }

  saveEditLetterBtn.onclick = () => {
    if (!editingLetter) return;
  
    // datetime-local 값을 기존 형식으로 변환
    const dateTimeValue = editLetterDate.value;
    const dateTime = new Date(dateTimeValue);
    const dateStr = `${dateTime.getFullYear()}-${String(dateTime.getMonth()+1).padStart(2,'0')}-${String(dateTime.getDate()).padStart(2,'0')}, ${String(dateTime.getHours()).padStart(2,'0')}:${String(dateTime.getMinutes()).padStart(2,'0')}`;
  
    const updated = {
      content: editLetterContent.value,
      date: dateStr
    };
  
    db.ref(`letters/${editingLetter.id}`).update(updated).then(() => {
      editLetterModal.style.display = 'none';
      editingLetter = null;
      renderLetters();
    });
  };
  // 편지 모달 닫기 버튼 핸들러러
  closeEditLetterModal.onclick = () => {
    editLetterModal.style.display = 'none';
    editingLetter = null;
  };
  

  function loadLettersFromFirebase() {
    db.ref('letters').on('value', snapshot => {
      letters = [];
      snapshot.forEach(child => {
        const letter = child.val();
        letter.id = child.key;
        letters.push(letter);
      });
      renderLetters();
    });
  }

  function renderLetters() {
    letterListDiv.innerHTML = '';
    // 검색 필터 적용
    let filteredLetters = letters.filter(letter => {
      const contentMatch = letter.content.toLowerCase().includes(letterSearchText.toLowerCase());
      const authorMatch = (letterSearchAuthor === 'all' || letter.to === letterSearchAuthor);
      return contentMatch && authorMatch;
    });
    filteredLetters.sort((a, b) => new Date(b.date) - new Date(a.date));  // 최신순 정렬
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
      db.ref(`letters/${id}`).remove().then(() => showTabAlert('letter'));
    }
  }
  
  function updateLetter(id, updatedContent) {
    db.ref(`letters/${id}`).update({
      content: updatedContent
    });
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
    
    // Firebase 저장용 객체
    const letter = {
      content,
      from: myName,
      to,
      date: dateStr
    };
    
    // Firebase에 저장
    const newRef = db.ref('letters').push(); // Firebase 고유 키 생성
    letter.id = newRef.key;                  // 키를 id로 부여
    newRef.set(letter).then(() => showTabAlert('letter'));
    
    // 화면 초기화
    letterContentInput.value = '';
    currentLetterPage = 1;
    renderLetters();
  };

  // ===================== 탭 전환 로직 =====================
  const tabs = document.querySelectorAll('.tab');
  const tabContents = document.querySelectorAll('.tab-content');
  const mainSection = document.querySelector('.main');
  const letterSection = document.getElementById('letter-section');
  const noteFilters = document.getElementById('noteFilters');
  const letterSearchBar = document.querySelector('.letter-search-bar');
  const albumSection = document.getElementById('album-section');
  const calendarSection = document.getElementById('calendar-section'); // 달력 섹션

  // 앨범 데이터
  let albums = [];

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

  // 앨범 카테고리 모달 열기 함수 (새로 추가)
  function openAlbumCategoryModal(categoryLabel, albums) {
    const modal = document.getElementById('albumCategoryModal');
    const modalTitle = document.getElementById('albumCategoryModalTitle');
    const modalGrid = document.getElementById('albumCategoryModalGrid');
    const closeModalBtn = document.getElementById('closeAlbumCategoryModal');

    modalTitle.textContent = `${categoryLabel} 전체 사진`;
    modalGrid.innerHTML = ''; // 이전 내용 지우기

    if (albums.length === 0) {
        modalGrid.innerHTML = '<div class="no-results">이 카테고리에는 사진이 없습니다.</div>';
    } else {
        albums.forEach(album => {
          const imgWrap = document.createElement('div');
          imgWrap.className = 'album-category-grid-item';
          imgWrap.innerHTML = `<img src="${album.image}" alt="${album.desc || '앨범 이미지'}">`;
          imgWrap.onclick = () => {
              modal.style.display = 'none'; // 현재 모달 닫기
              openAlbumPreview(album); // 개별 사진 미리보기 모달 열기
          };
          modalGrid.appendChild(imgWrap);
        });
    }

    modal.style.display = 'flex';

    closeModalBtn.onclick = () => {
      modal.style.display = 'none';
    };
  }
  window.addEventListener('click', function(e) {
      const modal = document.getElementById('albumCategoryModal');
      if (e.target === modal) {
          modal.style.display = 'none';
      }
  });


  // 3-2. 앨범 불러오기
 function loadAlbumsFromFirebase() {
  db.ref('albums').on('value', snapshot => {
    albums = [];
    snapshot.forEach(child => {
      const album = child.val();
      album.id = child.key;
      albums.push(album);
    });
    renderAlbums();
  });
}


  function renderAlbums() {
    albumListDiv.innerHTML = '';
    const categories = [
      { key: 'funny', label: '엽사', icon: '😆', color: '#ffb84d' },
      { key: 'best', label: '인생샷', icon: '⭐', color: '#4dabf7' },
      { key: 'edit', label: '일상', icon: '🖇️', color: '#ff6b81' }
    ];
  
    if (!window.albumSlideIndexes) window.albumSlideIndexes = {};
  
    const filteredAlbums = albums.filter(a => {
      const dateMatch = !albumSearchDate || a.date === albumSearchDate;
      const placeMatch = !albumSearchPlace || (a.place && a.place.includes(albumSearchPlace));
      return dateMatch && placeMatch;
    });
  
    categories.forEach(cat => {
      const catAlbums = filteredAlbums.filter(a => a.category === cat.key);
      catAlbums.sort((a, b) => new Date(b.date.replace(',', '')) - new Date(a.date.replace(',', '')));
      
      if (catAlbums.length === 0) return;
  
      const catTitle = document.createElement('div');
      catTitle.style.fontWeight = 'bold';
      catTitle.style.fontSize = '1.1em';
      catTitle.style.margin = '18px 0 8px 0';
      catTitle.innerHTML = `<span style="background:${cat.color};color:#fff;padding:4px 12px;border-radius:10px;font-size:0.95em;">${cat.icon} ${cat.label}</span>`;
      
      const viewAllBtn = document.createElement('button');
      viewAllBtn.className = 'view-all-btn';
      viewAllBtn.innerHTML = '<i class="fas fa-file-lines"></i>';
      viewAllBtn.title = '전체 보기';
      viewAllBtn.onclick = () => openAlbumCategoryModal(cat.label, catAlbums);
      catTitle.appendChild(viewAllBtn);
      
      albumListDiv.appendChild(catTitle);
  
      const slideWrap = document.createElement('div');
      slideWrap.className = 'album-slide-wrap';
  
      const row = document.createElement('div');
      row.className = 'album-slide-row';
  
      const isMobile = window.innerWidth <= 700;
      const VISIBLE = isMobile ? 2 : 4;
  
      // 안전한 초기화
      if (typeof window.albumSlideIndexes[cat.key] !== 'number') {
        window.albumSlideIndexes[cat.key] = 0;
      }
      let slideIdx = window.albumSlideIndexes[cat.key];
  
      function renderCards() {
        row.innerHTML = '';
  
        const maxIdx = Math.max(0, catAlbums.length - VISIBLE);
        if (slideIdx < 0) slideIdx = 0;
        if (slideIdx > maxIdx) slideIdx = maxIdx;
  
        window.albumSlideIndexes[cat.key] = slideIdx;
  
        const sliceStart = slideIdx;
        const sliceEnd = Math.min(catAlbums.length, slideIdx + VISIBLE);
        const albumsToShow = catAlbums.slice(sliceStart, sliceEnd);
  
        if (albumsToShow.length === 0 && catAlbums.length > 0) {
          // fallback 렌더링
          row.appendChild(createAlbumCard(catAlbums[0], cat.key));
        } else {
          albumsToShow.forEach(album => {
            row.appendChild(createAlbumCard(album, cat.key));
          });
        }
      }
  
      function updateSlide() {
        const maxIdx = Math.max(0, catAlbums.length - VISIBLE);
        if (slideIdx < 0) slideIdx = 0;
        if (slideIdx > maxIdx) slideIdx = maxIdx;
        window.albumSlideIndexes[cat.key] = slideIdx;
  
        leftBtn.disabled = slideIdx === 0;
        rightBtn.disabled = slideIdx === maxIdx;
        renderCards();
      }
  
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
  
      renderCards(); // 최초 렌더링
    });
  }
  


  function createAlbumCard(album, catKey) {
    if (!album || !album.image) {
      console.warn("앨범 데이터가 유효하지 않음:", album);
      return document.createElement('div');  // 빈 카드라도 리턴
    }

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
      <div style="display: flex; gap: 8px; margin-top: 6px;">
      <button class="edit-album">수정</button>
      <button class="delete-album">삭제</button>
    </div>`;
    // image 필드는 앨범 객체에 존재해야 함
    card.querySelector('.edit-album').onclick = () => {
      editingAlbum = album;
      editAlbumDate.value = album.date || '';
      editAlbumPlace.value = album.place || '';
      editAlbumDesc.value = album.desc || '';
      editAlbumModal.style.display = 'flex';
    };
    card.querySelector('.delete-album').onclick = () => deleteAlbum(album.id, album.image);
    card.querySelector('.album-img-wrap').onclick = () => openAlbumPreview(album);
    return card;
  }

  saveEditAlbumBtn.onclick = () => {
    if (!editingAlbum) return;
  
    const updated = {
      date: editAlbumDate.value,
      place: editAlbumPlace.value,
      desc: editAlbumDesc.value,
    };
  
    db.ref(`albums/${editingAlbum.id}`).update(updated).then(() => {
      editAlbumModal.style.display = 'none';
      editingAlbum = null;
      renderAlbums(); // 수정 후 새로 반영
    });
  };
  

  function deleteAlbum(id, imageUrl) {
    if (confirm('정말 삭제하시겠습니까?')) {
      db.ref(`albums/${id}`).remove().then(() => showTabAlert('album'));
      const storageRef = firebase.storage().refFromURL(imageUrl);
      storageRef.delete().catch(err => console.warn('이미지 삭제 실패:', err));
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
  
    console.log('앨범 업로드 시작');
  
    const fileRef = storage.ref().child(`albums/${Date.now()}_${file.name}`);
    fileRef.put(file)
      .then(snapshot => {
        console.log('이미지 업로드 성공');
        return snapshot.ref.getDownloadURL();
      })
      .then(url => {
        console.log('다운로드 URL 얻음:', url);
        const album = {
          date, place, category, desc, image: url
        };
        const newRef = db.ref('albums').push();
        album.id = newRef.key;
        newRef.set(album)
          .then(() => { console.log('앨범 DB 저장 성공:', album); showTabAlert('album'); })
          .catch(err => console.error('앨범 DB 저장 실패:', err));
      })
      .catch(err => {
        console.error('이미지 업로드 또는 URL 실패:', err);
        alert('이미지 업로드 실패');
      });
  };
  

  tabs.forEach((tab, idx) => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      // 모든 tab-content 섹션 숨기기
      tabContents.forEach(sec => sec.style.display = 'none');
      // 노트(메인) 섹션은 별도 처리
      mainSection.style.display = 'none';
      noteFilters.style.display = 'none';

      if (idx === 0) { // 달력
        document.getElementById('calendar-section').style.display = '';
        renderCalendar();
      } else if (idx === 1) { // 노트
        mainSection.style.display = '';
        noteFilters.style.display = '';
        render();
      } else if (idx === 2) { // 편지함
        document.getElementById('letter-section').style.display = '';
        document.querySelector('.letter-search-bar').style.display = '';
        renderLetters && renderLetters();
      } else if (idx === 3) { // 앨범함
        document.getElementById('album-section').style.display = '';
        renderAlbums && renderAlbums();
      } else if (idx === 4) { // 오늘의 질문
        document.getElementById('question-section').style.display = '';
        renderQuestion && renderQuestion();
        renderQuestionAnswers && renderQuestionAnswers();
      }
    });
  });

  // 초기 진입 시
  // 모든 tab-content 숨기고 노트만 보이게
  tabContents.forEach(sec => sec.style.display = 'none');
  mainSection.style.display = '';
  noteFilters.style.display = '';

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
  const firstQuestionDate = '2025-05-25';
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
    '어려울 때 가장 가족 의견 차이를 어떻게 해결했으면 해?',
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
  const currentQuestionTitle = questionList[(diffDays-1) % questionList.length];
  const todayQuestion = {
    number: diffDays,
    date: getSeoulDateYMD(),
    title: currentQuestionTitle,
    key: `${diffDays}_${currentQuestionTitle.replace(/[.#$[\]]/g, '')}`, // Firebase에 안전한 키
    authors: ['J.W', 'H.N', 'Guest']
  };
  // 내 이름(로컬스토리지에서 가져옴)
  let myName = localStorage.getItem('myName');
  let otherName = todayQuestion.authors.find(n => n !== myName);
  // 답변 데이터
  let answers = {};
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
      questionAnswerSearchAuthor = questionAnswerAuthorFilter.value;
      questionAnswerPage = 1; // 검색 시 첫 페이지로
      renderQuestionAnswers();
    };
    questionAnswerAuthorFilter.onchange = function() {
      questionAnswerSearchAuthor = questionAnswerAuthorFilter.value;
      questionAnswerPage = 1; // 검색 시 첫 페이지로
      renderQuestionAnswers();
    };
    questionAnswerSearchBtn.onclick = function() {
      questionAnswerSearchText = questionAnswerSearchInput.value;
      questionAnswerSearchAuthor = questionAnswerAuthorFilter.value;
      questionAnswerPage = 1; // 검색 시 첫 페이지로
      renderQuestionAnswers();
    };
  }

  function deleteAnswer(qKey, answerId) {
    if (confirm('정말 삭제하시겠습니까?')) {
      db.ref(`questionAnswers/${qKey}/${answerId}`).remove().then(() => { showTabAlert('question'); renderQuestionAnswers(); });
    }
  }

  function createAnswerCard(ans, questionTitle) {
    const card = document.createElement('div');
    card.className = 'question-answer-item';
    card.innerHTML = `
      <div class="answer-title">${questionTitle}<span>🎁</span></div>
      <div class="answer-content">${ans.content || ''}</div>
      <div class="answer-meta">date: ${ans.time}</div>
      <div class="answer-author">from: ${ans.author}</div>
      <button class="delete-answer-btn" title="삭제"><i class="fas fa-trash"></i></button>
      ${ans.author === myName ? '<button class="edit-answer-btn" title="수정" style="position:absolute;top:16px;right:48px;background:none;border:none;cursor:pointer;font-size:1.3em;color:#228be6;padding:0;margin:0;"><i class="fas fa-pen"></i></button>' : ''}
    `;
    card.querySelector('.delete-answer-btn').onclick = () => {
      deleteAnswer(ans.questionKey, ans.id);
    };
    if (ans.author === myName) {
      card.querySelector('.edit-answer-btn').onclick = () => {
        editingQuestionAnswer = ans;
        // 날짜를 datetime-local로 변환
        if (ans.time) {
          const dateParts = ans.time.split(' ');
          const dateStr = dateParts[0];
          const timeStr = dateParts[1] || '00:00';
          const [year, month, day] = dateStr.split('-');
          const [hour, minute] = timeStr.split(':');
          document.getElementById('editQuestionAnswerDate').value = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;
        }
        document.getElementById('editQuestionAnswerContent').value = ans.content || '';
        document.getElementById('editQuestionAnswerModal').style.display = 'flex';
      };
    }
    return card;
  }

  function renderQuestionAnswers() {
    const isSearching = questionAnswerSearchText.trim() !== '' || questionAnswerSearchAuthor !== 'all';
    questionAnswerList.innerHTML = '';
    const paginationContainer = document.getElementById('questionPagination');
    if (paginationContainer) paginationContainer.innerHTML = '';


    if (isSearching) {
      // 모든 질문에서 답변 검색
      db.ref('questionAnswers').once('value').then(snapshot => {
        let allAnswers = [];
        snapshot.forEach(questionSnapshot => {
          const qKey = questionSnapshot.key;
          const questionNumber = parseInt(qKey.split('_')[0], 10);
          
          if (!isNaN(questionNumber) && questionNumber > 0 && questionNumber <= questionList.length) {
            const originalTitle = questionList[questionNumber - 1];
            questionSnapshot.forEach(answerSnapshot => {
              const answer = answerSnapshot.val();
              if (answer) {
                answer.id = answerSnapshot.key;
                answer.questionKey = qKey;
                allAnswers.push({ ...answer, questionTitle: originalTitle });
              }
            });
          }
        });

        // 검색어로 필터링
        const filteredList = allAnswers.filter(ans => {
            const authorMatch = (questionAnswerSearchAuthor === 'all' || ans.author === questionAnswerSearchAuthor);
            const contentMatch = !questionAnswerSearchText.trim() || (ans.content && typeof ans.content === 'string' && ans.content.toLowerCase().includes(questionAnswerSearchText.toLowerCase()));
            return authorMatch && contentMatch;
        });

        filteredList.sort((a, b) => b.time.localeCompare(a.time));

        if (filteredList.length === 0) {
          questionAnswerList.innerHTML = '<div class="no-results">검색 결과가 없습니다.</div>';
        } else {
          const totalPages = Math.ceil(filteredList.length / ITEMS_PER_PAGE);
          if (questionAnswerPage > totalPages) questionAnswerPage = totalPages;
          const start = (questionAnswerPage - 1) * ITEMS_PER_PAGE;
          const pageItems = filteredList.slice(start, start + ITEMS_PER_PAGE);

          pageItems.forEach(ans => questionAnswerList.appendChild(createAnswerCard(ans, ans.questionTitle)));
          
          renderPagination(questionAnswerList, totalPages, questionAnswerPage, (page) => {
            questionAnswerPage = page;
            renderQuestionAnswers();
          });
        }
      }).catch(error => {
        console.error("질문 답변 검색 중 오류 발생:", error);
        questionAnswerList.innerHTML = '<div class="no-results">검색 중 오류가 발생했습니다.</div>';
      });
    } else {
      // 기본: 오늘의 질문에 대한 답변만 표시
      const qKey = todayQuestion.key;
      db.ref(`questionAnswers/${qKey}`).once('value').then(snapshot => {
        let list = [];
        snapshot.forEach(child => {
          const val = child.val();
          if (val) {
            val.id = child.key;
            val.questionKey = qKey;
            list.push(val);
          }
        });

        list.sort((a, b) => b.time.localeCompare(a.time));

        if (list.length === 0) {
          questionAnswerList.innerHTML = '<div class="no-results">오늘의 질문에 대한 답변이 아직 없습니다.</div>';
        } else {
          const totalPages = Math.ceil(list.length / ITEMS_PER_PAGE);
          if (questionAnswerPage > totalPages) questionAnswerPage = totalPages;
          const start = (questionAnswerPage - 1) * ITEMS_PER_PAGE;
          const pageItems = list.slice(start, start + ITEMS_PER_PAGE);

          pageItems.forEach(ans => questionAnswerList.appendChild(createAnswerCard(ans, todayQuestion.title)));
          
          renderPagination(questionAnswerList, totalPages, questionAnswerPage, (page) => {
            questionAnswerPage = page;
            renderQuestionAnswers();
          });
        }
      });
    }
  }

  // 4. 오늘의 질문 답변 저장 (questionAnswerForm.onsubmit 수정)
  questionAnswerForm.onsubmit = function(e) {
    e.preventDefault();
    const content = questionAnswerInput.value.trim();
    const author = questionAnswerAuthor.value;
    if (!content) return;
    const now = new Date();
    const time = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')} ${now.getHours()}:${now.getMinutes()}`;
    const answer = { author, content, time };
    const qKey = todayQuestion.key;
    const newRef = db.ref(`questionAnswers/${qKey}`).push();
    newRef.set(answer).then(() => showTabAlert('question'));
    questionAnswerInput.value = '';
    renderQuestionAnswers();
  };

  // 알림 상태 관리 변수
  let alertStatus = {};
  const ALERT_STORAGE_KEY = 'ourapp_alert_status';

  // 로컬 스토리지에서 알림 상태 불러오기
  function loadAlertStatus() {
    const savedStatus = localStorage.getItem(ALERT_STORAGE_KEY);
    if (savedStatus) {
      try {
        alertStatus = JSON.parse(savedStatus);
      } catch (e) {
        console.error('Failed to parse alert status from localStorage', e);
        alertStatus = {};
      }
    }
    // 각 섹션별로 사용자 상태 초기화 (필요시)
    ['note', 'letter', 'album', 'question'].forEach(section => {
      if (!alertStatus[section]) alertStatus[section] = {};
      if (typeof alertStatus[section][myName] === 'undefined') alertStatus[section][myName] = false;
      if (typeof alertStatus[section][otherName] === 'undefined') alertStatus[section][otherName] = false;
    });
  }

  // 알림 상태 로컬 스토리지에 저장
  function saveAlertStatus() {
    localStorage.setItem(ALERT_STORAGE_KEY, JSON.stringify(alertStatus));
  }

  // 탭별 알림 아이콘 DOM 변수 (기존 코드에 추가)
  const noteAlert = document.getElementById('noteAlert');
  const letterAlert = document.getElementById('letterAlert');
  const albumAlert = document.getElementById('albumAlert');
  const questionAlert = document.getElementById('questionAlert');

  // 특정 탭의 알림 표시 (데이터 변경 시 호출)
  function showTabAlert(type) {
    if (alertStatus[type]) {
      alertStatus[type][myName] = true; // 변경을 알림 (본인)
      alertStatus[type][otherName] = true; // 변경을 알림 (상대방)
      saveAlertStatus();
      renderTabAlerts(); // 알림 상태 다시 렌더링
    }
  }

  // 현재 사용자의 알림 상태에 따라 알림 아이콘 렌더링
  function renderTabAlerts() {
    noteAlert.style.display = alertStatus.note && alertStatus.note[myName] ? 'inline-block' : 'none';
    letterAlert.style.display = alertStatus.letter && alertStatus.letter[myName] ? 'inline-block' : 'none';
    albumAlert.style.display = alertStatus.album && alertStatus.album[myName] ? 'inline-block' : 'none';
    questionAlert.style.display = alertStatus.question && alertStatus.question[myName] ? 'inline-block' : 'none';
  }

  // 탭 클릭 이벤트 핸들러 (알림 해제 로직 포함)
  function handleTabClick(sectionType) {
    // 현재 탭의 active 클래스 관리 (기존 로직 유지)
    tabs.forEach(t => t.classList.remove('active'));
    document.querySelector(`.tab[data-section="${sectionType}"]`).classList.add('active');

    // 모든 tab-content 섹션 숨기기
    tabContents.forEach(sec => sec.style.display = 'none');

    // 해당 섹션만 보이기
    if (sectionType === 'calendar') {
      document.getElementById('calendar-section').style.display = '';
      renderCalendar();
    } else if (sectionType === 'note') {
      document.querySelector('.main').style.display = '';
      document.getElementById('noteFilters').style.display = '';
      render();
    } else if (sectionType === 'letter') {
      document.getElementById('letter-section').style.display = '';
      document.querySelector('.letter-search-bar').style.display = '';
      renderLetters && renderLetters();
    } else if (sectionType === 'album') {
      document.getElementById('album-section').style.display = '';
      renderAlbums && renderAlbums();
    } else if (sectionType === 'question') {
      document.getElementById('question-section').style.display = '';
      renderQuestion && renderQuestion();
      renderQuestionAnswers && renderQuestionAnswers();
    }

    // 현재 사용자의 해당 섹션 알림 상태 해제
    if (alertStatus[sectionType]) {
       alertStatus[sectionType][myName] = false;
       saveAlertStatus();
       renderTabAlerts(); // 알림 상태 다시 렌더링
    }
  }

  // DOMContentLoaded 리스너 수정 (초기 알림 로딩 및 렌더링 추가)
  document.addEventListener('DOMContentLoaded', () => {
    updateDdayDisplay();
    renderCalendar();
    loadCalendarEventsFromFirebase();
    loadMemosFromFirebase();
    loadLettersFromFirebase();
    loadAlbumsFromFirebase();
    renderQuestionAnswers();

    loadAlertStatus(); // 알림 상태 로딩
    renderTabAlerts(); // 초기 알림 아이콘 렌더링

    // ↓ 초기 진입 시 달력만 보이도록 수정
    const tabContents = document.querySelectorAll('.tab-content');
    const mainSection = document.querySelector('.main');
    const noteFilters = document.getElementById('noteFilters');
    const calendarSection = document.getElementById('calendar-section'); // 달력 섹션 DOM 추가

    // 모든 tab-content 숨기고 달력만 보이게
    tabContents.forEach(sec => sec.style.display = 'none');
    mainSection.style.display = 'none'; // 노트 섹션 숨김
    noteFilters.style.display = 'none'; // 노트 필터 숨김
    calendarSection.style.display = ''; // 달력 섹션 보이게

    // Note: 탭 버튼의 active 클래스는 index.html에서 설정합니다.
  });

  // 탭 버튼 클릭 이벤트 리스너 수정
  tabs.forEach(tab => {
     // data-section 속성을 탭 버튼에 추가하여 어떤 섹션인지 구분합니다.
     if (tab.textContent.includes('달력')) tab.dataset.section = 'calendar';
     else if (tab.textContent.includes('노트')) tab.dataset.section = 'note';
     else if (tab.textContent.includes('편지함')) tab.dataset.section = 'letter';
     else if (tab.textContent.includes('앨범함')) tab.dataset.section = 'album';
     else if (tab.textContent.includes('오늘의 질문')) tab.dataset.section = 'question';

     tab.addEventListener('click', () => {
       const sectionType = tab.dataset.section;
       handleTabClick(sectionType);
     });
  });

  // Firebase 데이터 변경 시 showTabAlert 호출 (기존 로직 유지)
  // 각 데이터 로딩 함수 또는 저장/수정/삭제 완료 시 showTabAlert(섹션 타입) 호출 필요
  // 예: db.ref('memos').on('value', snapshot => { ... render(); showTabAlert('note'); });
  // 현재 showTabAlert 호출은 대부분 `.then(() => showTabAlert('...'))` 형태로 되어 있습니다.

  // 일정 수정/삭제 모달 관련 DOM
  const editCalendarEventModal = document.getElementById('editCalendarEventModal');
  const closeEditCalendarEventModal = document.getElementById('closeEditCalendarEventModal');
  const editCalendarEventDate = document.getElementById('editCalendarEventDate');
  const editCalendarEventTitle = document.getElementById('editCalendarEventTitle');
  const saveEditCalendarEventBtn = document.getElementById('saveEditCalendarEventBtn');
  const deleteCalendarEventBtn = document.getElementById('deleteCalendarEventBtn');

  let editingCalendarEventId = null; // 현재 수정/삭제할 일정 ID

  // 일정 수정/삭제 모달 닫기
  function closeEditCalendarEventModalFunc() {
    editCalendarEventModal.style.display = 'none';
    editingCalendarEventId = null;
  }
  closeEditCalendarEventModal.onclick = () => {
    closeEditCalendarEventModalFunc();
  };

  // 일정 수정 완료 버튼 클릭
  saveEditCalendarEventBtn.onclick = () => {
    if (!editingCalendarEventId) return;

    const updatedDate = editCalendarEventDate.value;
    const updatedTitle = editCalendarEventTitle.value.trim();
    // 작성자는 수정하지 않고 기존 값 사용

    if (!updatedDate || !updatedTitle) {
       alert('날짜와 제목을 입력하세요!');
       return;
    }

    db.ref(`calendarEvents/${editingCalendarEventId}`).update({
      date: updatedDate,
      title: updatedTitle
      // author는 수정하지 않음
    }).then(() => {
      editCalendarEventModal.style.display = 'none';
      editingCalendarEventId = null;
      loadCalendarEventsFromFirebase(); // 데이터 다시 불러오고 렌더링
    }).catch(error => {
      console.error("일정 수정 실패:", error);
      alert("일정 수정에 실패했습니다.");
    });
  };

  // 일정 삭제 버튼 클릭
  deleteCalendarEventBtn.onclick = () => {
    if (!editingCalendarEventId) return;

    if (confirm('정말 이 일정을 삭제하시겠습니까?')) {
      db.ref(`calendarEvents/${editingCalendarEventId}`).remove().then(() => {
        editCalendarEventModal.style.display = 'none';
        editingCalendarEventId = null;
        loadCalendarEventsFromFirebase(); // 데이터 다시 불러오고 렌더링
      }).catch(error => {
        console.error("일정 삭제 실패:", error);
        alert("일정 삭제에 실패했습니다.");
      });
    }
  };

  // 일정 등록 모달 닫기 함수 (새로 추가)
  function closeAddCalendarEventModalFunc() {
    addCalendarEventModal.style.display = 'none';
    // 모달 닫을 때 입력 필드 초기화 (선택 사항)
    modalCalendarEventDate.value = '';
    modalCalendarEventEndDate.value = '';
    modalCalendarEventTitle.value = '';
    modalCalendarEventAuthor.value = 'J.W'; // 기본값으로 설정
  }
  closeAddCalendarEventModal.onclick = () => {
    closeAddCalendarEventModalFunc();
  };

  // ===================== 질문 답변 수정 모달 기능 =====================
  let editingQuestionAnswer = null;
  const editQuestionAnswerModal = document.getElementById('editQuestionAnswerModal');
  const closeEditQuestionAnswerModal = document.getElementById('closeEditQuestionAnswerModal');
  const editQuestionAnswerDate = document.getElementById('editQuestionAnswerDate');
  const editQuestionAnswerContent = document.getElementById('editQuestionAnswerContent');
  const saveEditQuestionAnswerBtn = document.getElementById('saveEditQuestionAnswerBtn');

  closeEditQuestionAnswerModal.onclick = () => {
    editQuestionAnswerModal.style.display = 'none';
    editingQuestionAnswer = null;
  };
  window.onclick = function(e) {
    if (e.target === editQuestionAnswerModal) {
      editQuestionAnswerModal.style.display = 'none';
      editingQuestionAnswer = null;
    }
    // ... existing code ...
  };
  saveEditQuestionAnswerBtn.onclick = () => {
    if (!editingQuestionAnswer) return;
    // datetime-local 값을 기존 형식으로 변환
    const dateTimeValue = editQuestionAnswerDate.value;
    const dateTime = new Date(dateTimeValue);
    const dateStr = `${dateTime.getFullYear()}-${String(dateTime.getMonth()+1).padStart(2,'0')}-${String(dateTime.getDate()).padStart(2,'0')} ${String(dateTime.getHours()).padStart(2,'0')}:${String(dateTime.getMinutes()).padStart(2,'0')}`;
    const updated = {
      content: editQuestionAnswerContent.value,
      time: dateStr
    };
    db.ref(`questionAnswers/${editingQuestionAnswer.questionKey}/${editingQuestionAnswer.id}`).update(updated).then(() => {
      editQuestionAnswerModal.style.display = 'none';
      editingQuestionAnswer = null;
      renderQuestionAnswers();
    });
  };
}