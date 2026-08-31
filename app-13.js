// AlatiphA Report Cards — app-13.js
const APP_VERSION = 'v13';

/* ---------- storage helpers ---------- */
const DB = {
  get(key, fallback) {
    try {
      const v = JSON.parse(localStorage.getItem(key));
      return v === null || v === undefined ? fallback : v;
    } catch (e) { return fallback; }
  },
  set(key, val) { localStorage.setItem(key, JSON.stringify(val)); }
};

const KEYS = {
  settings: 'arc_settings',
  classes: 'arc_classes',
  subjects: 'arc_subjects',
  students: 'arc_students',
  grades: 'arc_grades',
  remarks: 'arc_remarks'
};

const DEFAULT_SUBJECTS = [
  'English Language','Mathematics','Science','History',
  'Rel. & Moral Edu. (RME)','Creative Arts','Computing','Ghanaian Language'
];

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

function ensureDefaults() {
  if (DB.get(KEYS.subjects, null) === null) {
    DB.set(KEYS.subjects, DEFAULT_SUBJECTS.map(name => ({ id: uid(), name })));
  }
  if (DB.get(KEYS.settings, null) === null) {
    DB.set(KEYS.settings, {
      schoolName: '', address: '', email: '', logo: '',
      currentTerm: 'Term 1', currentYear: '', attendanceOutOf: '', nextTermBegins: '',
      reportLayout: 'standard'
    });
  }
  if (DB.get(KEYS.classes, null) === null) DB.set(KEYS.classes, []);
  if (DB.get(KEYS.students, null) === null) DB.set(KEYS.students, []);
  if (DB.get(KEYS.grades, null) === null) DB.set(KEYS.grades, {});
  if (DB.get(KEYS.remarks, null) === null) DB.set(KEYS.remarks, {});
}

/* ---------- grading & remark bands (school's own scale) ---------- */
const GRADE_BANDS = [
  { min: 80, grade: 1 }, { min: 75, grade: 2 }, { min: 70, grade: 3 },
  { min: 65, grade: 4 }, { min: 60, grade: 5 }, { min: 50, grade: 6 },
  { min: 45, grade: 7 }, { min: 40, grade: 8 }, { min: 0, grade: 9 }
];
const REMARK_BANDS = [
  { min: 80, label: 'Highly Proficient' },
  { min: 54, label: 'Proficient' },
  { min: 46, label: 'Approaching Proficiency' },
  { min: 40, label: 'Developing' },
  { min: 0, label: 'Emerging' }
];

function getGradeFor(total) {
  for (const b of GRADE_BANDS) { if (total >= b.min) return b.grade; }
  return 9;
}
function getRemarkFor(total) {
  for (const b of REMARK_BANDS) { if (total >= b.min) return b.label; }
  return 'Emerging';
}

function gradeKey(classId, term, year) { return `${classId}__${term}__${year}`; }

function clampScore(raw, max) {
  if (raw === '') return '';
  let n = Number(raw);
  if (isNaN(n)) return '';
  if (n < 0) n = 0;
  if (n > max) n = max;
  return n;
}

// Class Score is out of 60, scaled down to 50. Exam Score is out of 100,
// scaled down to 50. The two combine into a Total out of 100.
function scaleClass(raw) { return Math.round((raw / 60) * 50); }
function scaleExam(raw) { return Math.round((raw / 100) * 50); }

function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

/* ---------- view switching ---------- */
const views = ['setup', 'classes', 'students', 'subjects', 'grades', 'remarks', 'reports'];
function showView(name) {
  views.forEach(v => {
    document.getElementById('view-' + v).classList.toggle('hidden', v !== name);
  });
  document.querySelectorAll('.tab-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.view === name);
  });
  if (name === 'students') renderStudentClassSelect();
  if (name === 'grades') renderGradesClassSelect();
  if (name === 'remarks') renderRemarksClassSelect();
  if (name === 'reports') renderReportsClassSelect();
  renderClasses();
  renderStudents();
  renderSubjects();
}

/* ---------- Setup ---------- */
function loadSettingsForm() {
  const s = DB.get(KEYS.settings, {});
  document.getElementById('schoolName').value = s.schoolName || '';
  document.getElementById('schoolAddress').value = s.address || '';
  document.getElementById('schoolEmail').value = s.email || '';
  document.getElementById('currentTerm').value = s.currentTerm || 'Term 1';
  document.getElementById('currentYear').value = s.currentYear || '';
  document.getElementById('attendanceOutOf').value = s.attendanceOutOf || '';
  document.getElementById('nextTermBegins').value = s.nextTermBegins || '';
  document.getElementById('reportLayout').value = s.reportLayout || 'standard';
  const wrap = document.getElementById('logoPreviewWrap');
  const img = document.getElementById('logoPreview');
  if (s.logo) { img.src = s.logo; wrap.classList.remove('hidden'); }
  else { wrap.classList.add('hidden'); }
  updateTermBadge();
}

function updateTermBadge() {
  const s = DB.get(KEYS.settings, {});
  document.getElementById('termBadge').textContent = s.currentTerm && s.currentYear
    ? `${s.currentTerm} · ${s.currentYear}` : 'Set up term';
}

document.getElementById('schoolLogo').addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const s = DB.get(KEYS.settings, {});
    s.logo = reader.result;
    DB.set(KEYS.settings, s);
    loadSettingsForm();
  };
  reader.readAsDataURL(file);
});

document.getElementById('removeLogo').addEventListener('click', () => {
  const s = DB.get(KEYS.settings, {});
  s.logo = '';
  DB.set(KEYS.settings, s);
  loadSettingsForm();
});

document.getElementById('saveSettings').addEventListener('click', () => {
  const s = DB.get(KEYS.settings, {});
  s.schoolName = document.getElementById('schoolName').value.trim();
  s.address = document.getElementById('schoolAddress').value.trim();
  s.email = document.getElementById('schoolEmail').value.trim();
  s.currentTerm = document.getElementById('currentTerm').value;
  s.currentYear = document.getElementById('currentYear').value.trim();
  s.attendanceOutOf = document.getElementById('attendanceOutOf').value.trim();
  s.nextTermBegins = document.getElementById('nextTermBegins').value;
  s.reportLayout = document.getElementById('reportLayout').value;
  DB.set(KEYS.settings, s);
  updateTermBadge();
  alert('Settings saved. School name on report: ' + (s.schoolName || '(not set)'));
});

/* ---------- Classes ---------- */
let editingClassId = null;

function renderClasses() {
  const list = document.getElementById('classList');
  const classes = DB.get(KEYS.classes, []);
  list.innerHTML = '';
  if (!classes.length) { list.innerHTML = '<li class="empty">No classes yet — add one below to get started.</li>'; return; }
  classes.forEach(c => {
    const students = DB.get(KEYS.students, []).filter(s => s.classId === c.id);
    const li = document.createElement('li');
    if (editingClassId === c.id) {
      li.innerHTML = `<div class="edit-row">
        <input type="text" class="edit-class-name" value="${escapeHtml(c.name)}">
        <div class="edit-actions">
          <button class="save-btn save-class" data-id="${c.id}">Save</button>
          <button class="cancel-btn cancel-class">Cancel</button>
        </div>
      </div>`;
    } else {
      li.innerHTML = `<div><strong>${escapeHtml(c.name)}</strong><div class="meta">${students.length} student(s) on roll</div></div>
        <div class="actions">
          <button data-id="${c.id}" class="edit-class">Edit</button>
          <button data-id="${c.id}" class="del-class">Delete</button>
        </div>`;
    }
    list.appendChild(li);
  });
  list.querySelectorAll('.edit-class').forEach(btn => {
    btn.addEventListener('click', () => { editingClassId = btn.dataset.id; renderClasses(); });
  });
  list.querySelectorAll('.cancel-class').forEach(btn => {
    btn.addEventListener('click', () => { editingClassId = null; renderClasses(); });
  });
  list.querySelectorAll('.save-class').forEach(btn => {
    btn.addEventListener('click', () => {
      const li = btn.closest('li');
      const name = li.querySelector('.edit-class-name').value.trim();
      if (!name) return;
      const classes = DB.get(KEYS.classes, []);
      const c = classes.find(x => x.id === btn.dataset.id);
      if (c) c.name = name;
      DB.set(KEYS.classes, classes);
      editingClassId = null;
      renderClasses();
    });
  });
  list.querySelectorAll('.del-class').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!confirm('Delete this class and its students/grades?')) return;
      const id = btn.dataset.id;
      DB.set(KEYS.classes, DB.get(KEYS.classes, []).filter(c => c.id !== id));
      DB.set(KEYS.students, DB.get(KEYS.students, []).filter(s => s.classId !== id));
      const grades = DB.get(KEYS.grades, {});
      Object.keys(grades).forEach(k => { if (k.startsWith(id + '__')) delete grades[k]; });
      DB.set(KEYS.grades, grades);
      const remarks = DB.get(KEYS.remarks, {});
      Object.keys(remarks).forEach(k => { if (k.startsWith(id + '__')) delete remarks[k]; });
      DB.set(KEYS.remarks, remarks);
      renderClasses();
    });
  });
}

document.getElementById('addClassBtn').addEventListener('click', () => {
  const input = document.getElementById('newClassName');
  const name = input.value.trim();
  if (!name) return;
  const classes = DB.get(KEYS.classes, []);
  classes.push({ id: uid(), name });
  DB.set(KEYS.classes, classes);
  input.value = '';
  renderClasses();
});

/* ---------- Students ---------- */
function renderStudentClassSelect() {
  const sel = document.getElementById('studentClassSelect');
  fillClassSelect(sel);
  renderStudents();
}

function fillClassSelect(sel) {
  const classes = DB.get(KEYS.classes, []);
  const prev = sel.value;
  sel.innerHTML = classes.length
    ? classes.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('')
    : '<option value="">No classes yet</option>';
  if (classes.some(c => c.id === prev)) sel.value = prev;
}

let editingStudentId = null;

function renderStudents() {
  const sel = document.getElementById('studentClassSelect');
  if (!sel.options.length) fillClassSelect(sel);
  const classId = sel.value;
  const list = document.getElementById('studentList');
  const students = DB.get(KEYS.students, []).filter(s => s.classId === classId);
  list.innerHTML = '';
  if (!classId) { list.innerHTML = '<li class="empty">Add a class first.</li>'; return; }
  if (!students.length) { list.innerHTML = '<li class="empty">No students yet — add one below.</li>'; return; }
  students.forEach(st => {
    const li = document.createElement('li');
    if (editingStudentId === st.id) {
      li.innerHTML = `<div class="edit-row">
        <input type="text" class="edit-student-name" value="${escapeHtml(st.name)}" placeholder="Full name">
        <input type="text" class="edit-student-id" value="${st.admissionId ? escapeHtml(st.admissionId) : ''}" placeholder="Student ID (optional)">
        <select class="edit-student-gender">
          <option value="M" ${st.gender === 'M' ? 'selected' : ''}>Male</option>
          <option value="F" ${st.gender === 'F' ? 'selected' : ''}>Female</option>
        </select>
        <div class="edit-actions">
          <button class="save-btn save-student" data-id="${st.id}">Save</button>
          <button class="cancel-btn cancel-student">Cancel</button>
        </div>
      </div>`;
    } else {
      const idPart = st.admissionId ? ` · ID ${escapeHtml(st.admissionId)}` : '';
      li.innerHTML = `<div><strong>${escapeHtml(st.name)}</strong><div class="meta">${st.gender}${idPart}</div></div>
        <div class="actions">
          <button data-id="${st.id}" class="edit-student">Edit</button>
          <button data-id="${st.id}" class="del-student">Delete</button>
        </div>`;
    }
    list.appendChild(li);
  });
  list.querySelectorAll('.edit-student').forEach(btn => {
    btn.addEventListener('click', () => { editingStudentId = btn.dataset.id; renderStudents(); });
  });
  list.querySelectorAll('.cancel-student').forEach(btn => {
    btn.addEventListener('click', () => { editingStudentId = null; renderStudents(); });
  });
  list.querySelectorAll('.save-student').forEach(btn => {
    btn.addEventListener('click', () => {
      const li = btn.closest('li');
      const name = li.querySelector('.edit-student-name').value.trim();
      if (!name) return;
      const admissionId = li.querySelector('.edit-student-id').value.trim();
      const gender = li.querySelector('.edit-student-gender').value;
      const students = DB.get(KEYS.students, []);
      const st = students.find(x => x.id === btn.dataset.id);
      if (st) { st.name = name; st.admissionId = admissionId; st.gender = gender; }
      DB.set(KEYS.students, students);
      editingStudentId = null;
      renderStudents();
      renderClasses();
    });
  });
  list.querySelectorAll('.del-student').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!confirm('Delete this student and their grades?')) return;
      const id = btn.dataset.id;
      DB.set(KEYS.students, DB.get(KEYS.students, []).filter(s => s.id !== id));
      const grades = DB.get(KEYS.grades, {});
      Object.keys(grades).forEach(k => { if (grades[k][id]) delete grades[k][id]; });
      DB.set(KEYS.grades, grades);
      const remarks = DB.get(KEYS.remarks, {});
      Object.keys(remarks).forEach(k => { if (remarks[k][id]) delete remarks[k][id]; });
      DB.set(KEYS.remarks, remarks);
      renderStudents();
      renderClasses();
    });
  });
}

document.getElementById('studentClassSelect').addEventListener('change', renderStudents);

document.getElementById('addStudentBtn').addEventListener('click', () => {
  const classId = document.getElementById('studentClassSelect').value;
  if (!classId) { alert('Add a class first.'); return; }
  const nameInput = document.getElementById('newStudentName');
  const name = nameInput.value.trim();
  if (!name) return;
  const gender = document.getElementById('newStudentGender').value;
  const admissionId = document.getElementById('newStudentId').value.trim();
  const students = DB.get(KEYS.students, []);
  students.push({ id: uid(), classId, name, gender, admissionId });
  DB.set(KEYS.students, students);
  nameInput.value = '';
  document.getElementById('newStudentId').value = '';
  renderStudents();
  renderClasses();
});

// Bulk add: one student per line, optionally "Name, ID". Gender is left
// unset — use Edit on each student afterward if it needs to be recorded.
document.getElementById('bulkAddStudentsBtn').addEventListener('click', () => {
  const classId = document.getElementById('studentClassSelect').value;
  if (!classId) { alert('Add a class first.'); return; }
  const textarea = document.getElementById('bulkStudentInput');
  const lines = textarea.value.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  if (!lines.length) return;
  const students = DB.get(KEYS.students, []);
  lines.forEach(line => {
    const parts = line.split(',');
    const name = parts[0].trim();
    if (!name) return;
    const admissionId = parts.length > 1 ? parts.slice(1).join(',').trim() : '';
    students.push({ id: uid(), classId, name, gender: '', admissionId });
  });
  DB.set(KEYS.students, students);
  textarea.value = '';
  renderStudents();
  renderClasses();
  alert(`Added ${lines.length} student(s).`);
});

/* ---------- Subjects ---------- */
let editingSubjectId = null;

function renderSubjects() {
  const list = document.getElementById('subjectList');
  const subjects = DB.get(KEYS.subjects, []);
  list.innerHTML = '';
  if (!subjects.length) { list.innerHTML = '<li class="empty">No subjects yet — add one below.</li>'; return; }
  subjects.forEach(sub => {
    const li = document.createElement('li');
    if (editingSubjectId === sub.id) {
      li.innerHTML = `<div class="edit-row">
        <input type="text" class="edit-subject-name" value="${escapeHtml(sub.name)}">
        <div class="edit-actions">
          <button class="save-btn save-subject" data-id="${sub.id}">Save</button>
          <button class="cancel-btn cancel-subject">Cancel</button>
        </div>
      </div>`;
    } else {
      li.innerHTML = `<div>${escapeHtml(sub.name)}</div>
        <div class="actions">
          <button data-id="${sub.id}" class="edit-subject">Edit</button>
          <button data-id="${sub.id}" class="del-subject">Delete</button>
        </div>`;
    }
    list.appendChild(li);
  });
  list.querySelectorAll('.edit-subject').forEach(btn => {
    btn.addEventListener('click', () => { editingSubjectId = btn.dataset.id; renderSubjects(); });
  });
  list.querySelectorAll('.cancel-subject').forEach(btn => {
    btn.addEventListener('click', () => { editingSubjectId = null; renderSubjects(); });
  });
  list.querySelectorAll('.save-subject').forEach(btn => {
    btn.addEventListener('click', () => {
      const li = btn.closest('li');
      const name = li.querySelector('.edit-subject-name').value.trim();
      if (!name) return;
      const subjects = DB.get(KEYS.subjects, []);
      const sub = subjects.find(x => x.id === btn.dataset.id);
      if (sub) sub.name = name;
      DB.set(KEYS.subjects, subjects);
      editingSubjectId = null;
      renderSubjects();
    });
  });
  list.querySelectorAll('.del-subject').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!confirm('Delete this subject from all classes?')) return;
      const id = btn.dataset.id;
      DB.set(KEYS.subjects, DB.get(KEYS.subjects, []).filter(s => s.id !== id));
      renderSubjects();
    });
  });
}

document.getElementById('addSubjectBtn').addEventListener('click', () => {
  const input = document.getElementById('newSubjectName');
  const name = input.value.trim();
  if (!name) return;
  const subjects = DB.get(KEYS.subjects, []);
  subjects.push({ id: uid(), name });
  DB.set(KEYS.subjects, subjects);
  input.value = '';
  renderSubjects();
});

/* ---------- Grades entry (Class Score /60 + Exam Score /100 per subject) ---------- */
function renderGradesClassSelect() {
  const sel = document.getElementById('gradesClassSelect');
  fillClassSelect(sel);
  renderGradesTable();
}

function renderGradesTable() {
  const classId = document.getElementById('gradesClassSelect').value;
  const wrap = document.getElementById('gradesTableWrap');
  if (!classId) { wrap.innerHTML = '<p class="empty">Add a class first.</p>'; return; }
  const students = DB.get(KEYS.students, []).filter(s => s.classId === classId);
  const subjects = DB.get(KEYS.subjects, []);
  if (!students.length || !subjects.length) {
    wrap.innerHTML = '<p class="empty">Add students and subjects first.</p>';
    return;
  }
  const settings = DB.get(KEYS.settings, {});
  const simple = settings.reportLayout === 'simple';
  const key = gradeKey(classId, settings.currentTerm, settings.currentYear);
  const allGrades = DB.get(KEYS.grades, {});
  const classGrades = allGrades[key] || {};

  let html = '';
  if (simple) {
    html += '<p class="hint">Simple layout is active — Class Score is hidden and not used. Enter Exam Score only.</p>';
  }
  html += '<div class="table-scroll"><table class="grades-table"><thead>';
  html += '<tr><th class="name-col" rowspan="2">Student</th>';
  subjects.forEach(sub => { html += `<th colspan="${simple ? 1 : 2}">${escapeHtml(sub.name)}</th>`; });
  html += '</tr><tr>';
  subjects.forEach(() => {
    html += simple ? '<th class="sub-col">Exam /100</th>' : '<th class="sub-col">Class /60</th><th class="sub-col">Exam /100</th>';
  });
  html += '</tr></thead><tbody>';
  students.forEach(st => {
    html += `<tr><td class="name-col">${escapeHtml(st.name)}</td>`;
    subjects.forEach(sub => {
      const entry = classGrades[st.id] && classGrades[st.id][sub.id];
      const eVal = entry && entry.e !== undefined ? entry.e : '';
      if (!simple) {
        const cVal = entry && entry.c !== undefined ? entry.c : '';
        html += `<td><input type="number" min="0" max="60" inputmode="numeric" data-student="${st.id}" data-subject="${sub.id}" data-part="c" value="${cVal}"></td>`;
      }
      html += `<td><input type="number" min="0" max="100" inputmode="numeric" data-student="${st.id}" data-subject="${sub.id}" data-part="e" value="${eVal}"></td>`;
    });
    html += '</tr>';
  });
  html += '</tbody></table></div>';
  wrap.innerHTML = html;

  // Live-clamp so an out-of-range value never sits waiting to be saved.
  wrap.querySelectorAll('input[type="number"]').forEach(input => {
    const max = input.dataset.part === 'c' ? 60 : 100;
    input.addEventListener('input', () => {
      const clamped = clampScore(input.value, max);
      if (String(clamped) !== input.value) input.value = clamped;
    });
    input.addEventListener('blur', () => {
      input.value = clampScore(input.value, max);
    });
  });
}

document.getElementById('gradesClassSelect').addEventListener('change', renderGradesTable);

document.getElementById('saveGradesBtn').addEventListener('click', () => {
  const classId = document.getElementById('gradesClassSelect').value;
  if (!classId) return;
  const settings = DB.get(KEYS.settings, {});
  if (!settings.currentTerm || !settings.currentYear) {
    alert('Set the current Term and Academic Year in Setup first.');
    return;
  }
  const key = gradeKey(classId, settings.currentTerm, settings.currentYear);
  const allGrades = DB.get(KEYS.grades, {});
  const classGrades = allGrades[key] || {};
  document.querySelectorAll('#gradesTableWrap input').forEach(input => {
    const studentId = input.dataset.student;
    const subjectId = input.dataset.subject;
    const part = input.dataset.part;
    const max = part === 'c' ? 60 : 100;
    const clamped = clampScore(input.value, max);
    if (!classGrades[studentId]) classGrades[studentId] = {};
    if (!classGrades[studentId][subjectId]) classGrades[studentId][subjectId] = {};
    if (clamped === '') { delete classGrades[studentId][subjectId][part]; }
    else { classGrades[studentId][subjectId][part] = clamped; }
  });
  allGrades[key] = classGrades;
  DB.set(KEYS.grades, allGrades);
  alert('Grades saved.');
});

/* ---------- Remarks (attendance, conduct, fees, comments) ---------- */
function renderRemarksClassSelect() {
  const sel = document.getElementById('remarksClassSelect');
  fillClassSelect(sel);
  renderRemarksForm();
}

function renderRemarksForm() {
  const classId = document.getElementById('remarksClassSelect').value;
  const wrap = document.getElementById('remarksFormWrap');
  if (!classId) { wrap.innerHTML = '<p class="empty">Add a class first.</p>'; return; }
  const students = DB.get(KEYS.students, []).filter(s => s.classId === classId);
  if (!students.length) { wrap.innerHTML = '<p class="empty">No students in this class.</p>'; return; }
  const settings = DB.get(KEYS.settings, {});
  const key = gradeKey(classId, settings.currentTerm, settings.currentYear);
  const allRemarks = DB.get(KEYS.remarks, {});
  const classRemarks = allRemarks[key] || {};

  let html = '';
  students.forEach(st => {
    const r = classRemarks[st.id] || {};
    html += `<div class="remarks-card" data-student="${st.id}">
      <h3>${escapeHtml(st.name)}</h3>
      <label>Attendance (days present)
        <input type="number" min="0" class="rm-attendance" value="${r.attendance !== undefined ? r.attendance : ''}">
      </label>
      <label>Promoted / Repeated to
        <input type="text" class="rm-promoted" placeholder="e.g. Basic Two (2)" value="${r.promoted ? escapeHtml(r.promoted) : ''}">
      </label>
      <label>Fees Due (GH¢)
        <input type="number" min="0" step="0.01" class="rm-fees" value="${r.feesDue !== undefined ? r.feesDue : ''}">
      </label>
      <label>Conduct / Character
        <input type="text" class="rm-conduct" placeholder="e.g. Faithfully performs classroom tasks" value="${r.conduct ? escapeHtml(r.conduct) : ''}">
      </label>
      <label>Attitude
        <input type="text" class="rm-attitude" placeholder="e.g. Shows enthusiasm for classroom activities" value="${r.attitude ? escapeHtml(r.attitude) : ''}">
      </label>
      <label>Form Teacher's Comment
        <input type="text" class="rm-comment" placeholder="e.g. Keep it up" value="${r.comment ? escapeHtml(r.comment) : ''}">
      </label>
    </div>`;
  });
  wrap.innerHTML = html;
}

document.getElementById('remarksClassSelect').addEventListener('change', renderRemarksForm);

document.getElementById('saveRemarksBtn').addEventListener('click', () => {
  const classId = document.getElementById('remarksClassSelect').value;
  if (!classId) return;
  const settings = DB.get(KEYS.settings, {});
  if (!settings.currentTerm || !settings.currentYear) {
    alert('Set the current Term and Academic Year in Setup first.');
    return;
  }
  const key = gradeKey(classId, settings.currentTerm, settings.currentYear);
  const allRemarks = DB.get(KEYS.remarks, {});
  const classRemarks = allRemarks[key] || {};
  document.querySelectorAll('.remarks-card').forEach(card => {
    const studentId = card.dataset.student;
    classRemarks[studentId] = {
      attendance: card.querySelector('.rm-attendance').value.trim(),
      promoted: card.querySelector('.rm-promoted').value.trim(),
      feesDue: card.querySelector('.rm-fees').value.trim(),
      conduct: card.querySelector('.rm-conduct').value.trim(),
      attitude: card.querySelector('.rm-attitude').value.trim(),
      comment: card.querySelector('.rm-comment').value.trim()
    };
  });
  allRemarks[key] = classRemarks;
  DB.set(KEYS.remarks, allRemarks);
  alert('Remarks saved.');
});

// Aggregate = sum of grades of the first 4 subjects (in the order
// subjects are listed) + the 2 best (lowest-numbered, i.e. best) grades
// among the remaining subjects. Lower aggregate is better; 6 is the
// best possible score. This mirrors standard BECE-style aggregate scoring.
function computeAggregate(entries) {
  if (!entries.length) return null;
  const core = entries.slice(0, 4);
  const electives = entries.slice(4);
  const coreSum = core.reduce((a, b) => a + b.grade, 0);
  const bestTwo = electives.slice().sort((a, b) => a.grade - b.grade).slice(0, 2);
  const bestTwoSum = bestTwo.reduce((a, b) => a + b.grade, 0);
  return coreSum + bestTwoSum;
}

/* ---------- Results computation ---------- */
function computeClassResults(classId, term, year) {
  const students = DB.get(KEYS.students, []).filter(s => s.classId === classId);
  const subjects = DB.get(KEYS.subjects, []);
  const key = gradeKey(classId, term, year);
  const classGrades = DB.get(KEYS.grades, {})[key] || {};
  const settings = DB.get(KEYS.settings, {});
  const simple = settings.reportLayout === 'simple';

  const results = students.map(st => {
    const scores = classGrades[st.id] || {};
    // entries follow the subjects list order — required for "first 4" to be meaningful
    const entries = subjects
      .filter(sub => {
        const sc = scores[sub.id];
        if (!sc) return false;
        return simple ? sc.e !== undefined : (sc.c !== undefined && sc.e !== undefined);
      })
      .map(sub => {
        const raw = scores[sub.id];
        if (simple) {
          // Simple layout: Class Score is never entered or used — Exam
          // Score alone (already out of 100) is the subject's Total.
          const total = Number(raw.e);
          return {
            subject: sub, rawExam: Number(raw.e), total,
            grade: getGradeFor(total), remark: getRemarkFor(total)
          };
        }
        const classScaled = scaleClass(Number(raw.c));
        const examScaled = scaleExam(Number(raw.e));
        const total = classScaled + examScaled;
        return {
          subject: sub, rawClass: Number(raw.c), rawExam: Number(raw.e),
          classScaled, examScaled, total,
          grade: getGradeFor(total), remark: getRemarkFor(total)
        };
      });
    const totalSum = entries.reduce((a, b) => a + b.total, 0);
    const avg = entries.length ? totalSum / entries.length : 0;
    const aggregate = computeAggregate(entries);
    return {
      student: st, entries, totalSum, avg, aggregate,
      overallRemark: entries.length ? getRemarkFor(avg) : null
    };
  });

  // Rank by aggregate ascending — lower aggregate is better, matching
  // how the aggregate is actually used to place students.
  const ranked = results.filter(r => r.aggregate !== null).slice().sort((a, b) => a.aggregate - b.aggregate);
  let rank = 0, lastAgg = null, seen = 0;
  ranked.forEach(r => {
    seen++;
    if (r.aggregate !== lastAgg) { rank = seen; lastAgg = r.aggregate; }
    r.position = rank;
    r.outOf = ranked.length;
  });
  results.forEach(r => {
    const match = ranked.find(x => x.student.id === r.student.id);
    r.position = match ? match.position : null;
    r.outOf = ranked.length;
  });
  return results;
}

// Per-subject class-wide position: e.g. "8th in Mathematics" for this class/term.
function computeSubjectPositions(classId, term, year) {
  const students = DB.get(KEYS.students, []).filter(s => s.classId === classId);
  const subjects = DB.get(KEYS.subjects, []);
  const key = gradeKey(classId, term, year);
  const classGrades = DB.get(KEYS.grades, {})[key] || {};
  const settings = DB.get(KEYS.settings, {});
  const simple = settings.reportLayout === 'simple';
  const positions = {};

  subjects.forEach(sub => {
    const rows = [];
    students.forEach(st => {
      const sc = classGrades[st.id] && classGrades[st.id][sub.id];
      if (!sc) return;
      const has = simple ? sc.e !== undefined : (sc.c !== undefined && sc.e !== undefined);
      if (!has) return;
      const total = simple ? Number(sc.e) : (scaleClass(Number(sc.c)) + scaleExam(Number(sc.e)));
      rows.push({ studentId: st.id, total });
    });
    rows.sort((a, b) => b.total - a.total);
    let rank = 0, last = null, seen = 0;
    const map = {};
    rows.forEach(r => {
      seen++;
      if (r.total !== last) { rank = seen; last = r.total; }
      map[r.studentId] = { position: rank, outOf: rows.length };
    });
    positions[sub.id] = map;
  });
  return positions;
}

/* ---------- Reports ---------- */
function renderReportsClassSelect() {
  const sel = document.getElementById('reportsClassSelect');
  fillClassSelect(sel);
  renderReportsStudentList();
}

function renderReportsStudentList() {
  const classId = document.getElementById('reportsClassSelect').value;
  const list = document.getElementById('reportsStudentList');
  list.innerHTML = '';
  if (!classId) { list.innerHTML = '<li class="empty">Add a class first.</li>'; return; }
  const settings = DB.get(KEYS.settings, {});
  const results = computeClassResults(classId, settings.currentTerm, settings.currentYear);
  if (!results.length) { list.innerHTML = '<li class="empty">No students in this class.</li>'; return; }
  results.forEach(r => {
    const li = document.createElement('li');
    li.innerHTML = `<div><strong>${escapeHtml(r.student.name)}</strong>
        <div class="meta">${r.entries.length} subject(s) · Avg ${r.avg.toFixed(1)}</div></div>
      <div class="actions"><button class="gen" data-id="${r.student.id}">Generate PDF</button></div>`;
    list.appendChild(li);
  });
  list.querySelectorAll('.gen').forEach(btn => {
    btn.addEventListener('click', () => {
      const studentId = btn.dataset.id;
      const result = results.find(r => r.student.id === studentId);
      const positions = computeSubjectPositions(classId, settings.currentTerm, settings.currentYear);
      const numOnRoll = DB.get(KEYS.students, []).filter(s => s.classId === classId).length;
      const classInfo = DB.get(KEYS.classes, []).find(c => c.id === classId);
      const remarksAll = DB.get(KEYS.remarks, {})[gradeKey(classId, settings.currentTerm, settings.currentYear)] || {};
      generateSinglePDF(result, positions, numOnRoll, classInfo, remarksAll[studentId] || {});
    });
  });
}

document.getElementById('reportsClassSelect').addEventListener('change', renderReportsStudentList);

document.getElementById('generateAllBtn').addEventListener('click', () => {
  const classId = document.getElementById('reportsClassSelect').value;
  if (!classId) { alert('Add a class first.'); return; }
  const settings = DB.get(KEYS.settings, {});
  const results = computeClassResults(classId, settings.currentTerm, settings.currentYear);
  if (!results.length) { alert('No students in this class.'); return; }
  const positions = computeSubjectPositions(classId, settings.currentTerm, settings.currentYear);
  const numOnRoll = DB.get(KEYS.students, []).filter(s => s.classId === classId).length;
  const classInfo = DB.get(KEYS.classes, []).find(c => c.id === classId);
  const remarksAll = DB.get(KEYS.remarks, {})[gradeKey(classId, settings.currentTerm, settings.currentYear)] || {};
  generateBatchPDF(results, positions, numOnRoll, classInfo, remarksAll);
});

/* ---------- PDF generation ---------- */
const INK = [22, 36, 28];
const GOLD = [162, 128, 33];
const RED_INK = [150, 55, 40];

function drawReportPage(doc, result, settings, positions, numOnRoll, classInfo, studentRemarks) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const left = 15, right = pageWidth - 15;
  let y = 18;

  doc.setTextColor(INK[0], INK[1], INK[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  const schoolName = (settings.schoolName && settings.schoolName.trim()) ? settings.schoolName.trim() : 'School Name Not Set';
  doc.text(schoolName, pageWidth / 2, y, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  let subY = y + 6;
  if (settings.address) { doc.text(settings.address, pageWidth / 2, subY, { align: 'center' }); subY += 5; }
  if (settings.email) { doc.text(settings.email, pageWidth / 2, subY, { align: 'center' }); subY += 5; }
  y = subY + 2;

  doc.setDrawColor(GOLD[0], GOLD[1], GOLD[2]);
  doc.setLineWidth(0.8);
  doc.line(pageWidth / 2 - 30, y, pageWidth / 2 + 30, y);
  y += 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('REPORT CARD', pageWidth / 2, y, { align: 'center' });
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.2);
  doc.setTextColor(0, 0, 0);

  if (settings.logo) {
    try { doc.addImage(settings.logo, 'PNG', left, 12, 20, 20); }
    catch (e) { try { doc.addImage(settings.logo, 'JPEG', left, 12, 20, 20); } catch (e2) {} }
  }

  // Every "Label: value" pair on the report uses this one helper, so the
  // label is always bold, the value always normal weight, and the value
  // always starts right after the label's actual measured width — never
  // a guessed fixed offset that can overlap a long label.
  doc.setFontSize(9.5);
  const field = (label, value, x, yPos) => {
    doc.setFont('helvetica', 'bold');
    const labelText = label + ': ';
    doc.text(labelText, x, yPos);
    const w = doc.getTextWidth(labelText);
    doc.setFont('helvetica', 'normal');
    doc.text(String(value === undefined || value === null || value === '' ? '-' : value), x + w, yPos);
  };

  y += 10;
  doc.setFontSize(10);
  field('Name', result.student.name, left, y);
  field('ID', result.student.admissionId || '-', right - 35, y);
  y += 6;
  field('Class', classInfo ? classInfo.name : '', left, y);
  field('Term', settings.currentTerm || '', left + 70, y);
  field('Year', settings.currentYear || '', right - 35, y);
  y += 6;

  const simple = settings.reportLayout === 'simple';

  // Grade, subject position and aggregate are maintained in both layouts —
  // the only difference is that Simple never enters or uses a Class Score,
  // so Grade/Position/Aggregate are derived from Exam Score alone.
  field('Class Position', result.position ? ordinal(result.position) : '-', left, y);
  field('Total Score', result.totalSum, left + 70, y);
  field('Aggregate', result.aggregate !== null ? result.aggregate : '-', right - 35, y);
  doc.setFontSize(9.5);

  y += 8;
  // Results table. Standard: Subject | Class | Exam | Total | Grade | Position | Remark.
  // Simple: Subject | Score | Grade | Position | Remark — no Class column,
  // since Class Score is never entered or used in this layout. Column
  // widths always sum to the full printable width edge-to-edge.
  const colW = simple ? [48, 20, 18, 20, 74] : [46, 19, 19, 19, 15, 18, 44];
  const colX = [left];
  colW.forEach(w => colX.push(colX[colX.length - 1] + w));
  const headers = simple ? ['Subject', 'Score', 'Grade', 'Position', 'Remark'] : ['Subject', 'Class', 'Exam', 'Total', 'Grade', 'Position', 'Remark'];
  const rowH = 8;
  const lastCol = colW.length;
  const centerCols = simple ? [1, 2, 3] : [1, 2, 3, 4, 5]; // numeric columns center; Subject/Remark stay left-aligned

  const cellText = (text, i, yPos, bold, forceCenter) => {
    if (bold) doc.setFont('helvetica', 'bold'); else doc.setFont('helvetica', 'normal');
    if (forceCenter || centerCols.includes(i)) {
      doc.text(text, colX[i] + colW[i] / 2, yPos, { align: 'center' });
    } else {
      doc.text(text, colX[i] + 3, yPos);
    }
  };

  doc.setFillColor(INK[0], INK[1], INK[2]);
  doc.setTextColor(255, 255, 255);
  doc.rect(left, y, colX[lastCol] - left, rowH, 'F');
  doc.setFontSize(9);
  headers.forEach((h, i) => cellText(h, i, y + 5.5, true, true));
  y += rowH;
  doc.setTextColor(0, 0, 0);

  result.entries.forEach(en => {
    const weak = en.grade >= 7;
    const pos = positions[en.subject.id] && positions[en.subject.id][result.student.id];
    doc.rect(left, y, colX[lastCol] - left, rowH);
    for (let i = 1; i < lastCol; i++) doc.line(colX[i], y, colX[i], y + rowH);
    doc.setFontSize(8.5);
    if (simple) {
      cellText(String(en.subject.name), 0, y + 5.5, false);
      cellText(String(en.total), 1, y + 5.5, false);
      if (weak) doc.setTextColor(RED_INK[0], RED_INK[1], RED_INK[2]);
      cellText(String(en.grade), 2, y + 5.5, false);
      doc.setTextColor(0, 0, 0);
      cellText(pos ? ordinal(pos.position) : '-', 3, y + 5.5, false);
      cellText(en.remark, 4, y + 5.5, false);
    } else {
      cellText(String(en.subject.name), 0, y + 5.5, false);
      cellText(String(en.classScaled), 1, y + 5.5, false);
      cellText(String(en.examScaled), 2, y + 5.5, false);
      cellText(String(en.total), 3, y + 5.5, false);
      if (weak) doc.setTextColor(RED_INK[0], RED_INK[1], RED_INK[2]);
      cellText(String(en.grade), 4, y + 5.5, false);
      doc.setTextColor(0, 0, 0);
      cellText(pos ? ordinal(pos.position) : '-', 5, y + 5.5, false);
      cellText(en.remark, 6, y + 5.5, false);
    }
    y += rowH;
  });

  y += 8;

  // Attendance / roll / promotion / fees / next term
  doc.setFontSize(9.5);
  const attOutOf = settings.attendanceOutOf || '-';
  field('Attendance', `${studentRemarks.attendance || 0} out of ${attOutOf}`, left, y);
  field('Number on Roll', numOnRoll, right - 55, y);
  y += 6;
  field('Promoted/Repeated', studentRemarks.promoted || '-', left, y);
  field('Fees Due', `GH¢ ${studentRemarks.feesDue || '0.00'}`, right - 55, y);
  y += 6;
  field('Next Term Begins', settings.nextTermBegins || '-', left, y);
  y += 10;

  field('Conduct/Character', studentRemarks.conduct || '-', left, y);
  y += 7;
  field('Attitude', studentRemarks.attitude || '-', left, y);
  y += 7;
  field("Form Teacher's Comment", studentRemarks.comment || '-', left, y);
  y += 7;

  y += 10;
  // Signature lines: an actual drawn line above each label, evenly
  // distributed across the row width and centered under its own line.
  const sigLineWidth = 60;
  const halfWidth = (right - left) / 2;
  const leftSigCenter = left + halfWidth / 2;
  const rightSigCenter = left + halfWidth + halfWidth / 2;

  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.line(leftSigCenter - sigLineWidth / 2, y, leftSigCenter + sigLineWidth / 2, y);
  doc.line(rightSigCenter - sigLineWidth / 2, y, rightSigCenter + sigLineWidth / 2, y);
  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Class Teacher', leftSigCenter, y, { align: 'center' });
  doc.text('Head Teacher', rightSigCenter, y, { align: 'center' });

  y += 10;
  doc.setFontSize(8);
  doc.text(`Date: ${new Date().toLocaleDateString()}`, pageWidth / 2, y, { align: 'center' });

  // Compact grading/remarks legend footer — centered under the signature row
  y += 10;
  doc.setFontSize(7);
  doc.setTextColor(90, 90, 90);
  doc.text('Grading: 80-100=1  75-79=2  70-74=3  65-69=4  60-64=5  50-59=6  45-49=7  40-44=8  0-39=9', pageWidth / 2, y, { align: 'center' });
  y += 4;
  doc.text('Remarks: 80-100 Highly Proficient · 54-79 Proficient · 46-53 Approaching Proficiency · 40-45 Developing · 0-39 Emerging', pageWidth / 2, y, { align: 'center' });
  doc.setTextColor(GOLD[0], GOLD[1], GOLD[2]);
  doc.setFontSize(8);
  doc.text('Generated with AlatiphA Report Cards', pageWidth / 2, doc.internal.pageSize.getHeight() - 8, { align: 'center' });
  doc.setTextColor(0, 0, 0);
}

function generateSinglePDF(result, positions, numOnRoll, classInfo, studentRemarks) {
  if (!result.entries.length) { alert('No grades entered for this student yet.'); return; }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const settings = DB.get(KEYS.settings, {});
  drawReportPage(doc, result, settings, positions, numOnRoll, classInfo, studentRemarks);
  doc.save(`${result.student.name.replace(/\s+/g, '_')}_report.pdf`);
}

function generateBatchPDF(results, positions, numOnRoll, classInfo, remarksAll) {
  const usable = results.filter(r => r.entries.length > 0);
  if (!usable.length) { alert('No grades entered for this class yet.'); return; }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const settings = DB.get(KEYS.settings, {});
  usable.forEach((r, i) => {
    if (i > 0) doc.addPage();
    drawReportPage(doc, r, settings, positions, numOnRoll, classInfo, remarksAll[r.student.id] || {});
  });
  doc.save('class_report_cards.pdf');
}

/* ---------- utils ---------- */
function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, m => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[m]));
}

/* ---------- nav ---------- */
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => showView(btn.dataset.view));
});

/* ---------- init ---------- */
ensureDefaults();
loadSettingsForm();
showView('setup');

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}
