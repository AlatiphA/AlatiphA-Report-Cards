// AlatiphA Report Cards — app-3.js
const APP_VERSION = 'v3';

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
  grades: 'arc_grades'
};

const DEFAULT_SUBJECTS = [
  'English Language','Mathematics','Integrated Science','Social Studies',
  'Religious and Moral Education','Ghanaian Language','Computing',
  'Career Technology','Creative Arts and Design'
];

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

function ensureDefaults() {
  if (DB.get(KEYS.subjects, null) === null) {
    DB.set(KEYS.subjects, DEFAULT_SUBJECTS.map(name => ({ id: uid(), name })));
  }
  if (DB.get(KEYS.settings, null) === null) {
    DB.set(KEYS.settings, { schoolName: '', address: '', logo: '', currentTerm: 'Term 1', currentYear: '' });
  }
  if (DB.get(KEYS.classes, null) === null) DB.set(KEYS.classes, []);
  if (DB.get(KEYS.students, null) === null) DB.set(KEYS.students, []);
  if (DB.get(KEYS.grades, null) === null) DB.set(KEYS.grades, {});
}

/* ---------- BECE / JHS 9-point grading scale ---------- */
function getGrade(score) {
  if (score >= 80) return { grade: 1, remark: 'Highest' };
  if (score >= 70) return { grade: 2, remark: 'Higher' };
  if (score >= 60) return { grade: 3, remark: 'High' };
  if (score >= 55) return { grade: 4, remark: 'High Average' };
  if (score >= 50) return { grade: 5, remark: 'Average' };
  if (score >= 45) return { grade: 6, remark: 'Low Average' };
  if (score >= 40) return { grade: 7, remark: 'Low' };
  if (score >= 35) return { grade: 8, remark: 'Lower' };
  return { grade: 9, remark: 'Lowest' };
}

function gradeKey(classId, term, year) { return `${classId}__${term}__${year}`; }

function clampScore(raw) {
  if (raw === '') return '';
  let n = Number(raw);
  if (isNaN(n)) return '';
  if (n < 0) n = 0;
  if (n > 100) n = 100;
  return n;
}

/* ---------- view switching ---------- */
const views = ['setup', 'classes', 'students', 'subjects', 'grades', 'reports'];
function showView(name) {
  views.forEach(v => {
    document.getElementById('view-' + v).classList.toggle('hidden', v !== name);
  });
  document.querySelectorAll('.tab-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.view === name);
  });
  if (name === 'students') renderStudentClassSelect();
  if (name === 'grades') renderGradesClassSelect();
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
  document.getElementById('currentTerm').value = s.currentTerm || 'Term 1';
  document.getElementById('currentYear').value = s.currentYear || '';
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
  s.currentTerm = document.getElementById('currentTerm').value;
  s.currentYear = document.getElementById('currentYear').value.trim();
  DB.set(KEYS.settings, s);
  updateTermBadge();
  alert('Settings saved. School name on report: ' + (s.schoolName || '(not set)'));
});

/* ---------- Classes ---------- */
function renderClasses() {
  const list = document.getElementById('classList');
  const classes = DB.get(KEYS.classes, []);
  list.innerHTML = '';
  if (!classes.length) { list.innerHTML = '<li class="empty">No classes yet.</li>'; return; }
  classes.forEach(c => {
    const students = DB.get(KEYS.students, []).filter(s => s.classId === c.id);
    const li = document.createElement('li');
    li.innerHTML = `<div><strong>${escapeHtml(c.name)}</strong><div class="meta">${students.length} student(s)</div></div>
      <div class="actions"><button data-id="${c.id}" class="del-class">Delete</button></div>`;
    list.appendChild(li);
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

function renderStudents() {
  const sel = document.getElementById('studentClassSelect');
  if (!sel.options.length) fillClassSelect(sel);
  const classId = sel.value;
  const list = document.getElementById('studentList');
  const students = DB.get(KEYS.students, []).filter(s => s.classId === classId);
  list.innerHTML = '';
  if (!classId) { list.innerHTML = '<li class="empty">Add a class first.</li>'; return; }
  if (!students.length) { list.innerHTML = '<li class="empty">No students in this class.</li>'; return; }
  students.forEach(st => {
    const li = document.createElement('li');
    li.innerHTML = `<div><strong>${escapeHtml(st.name)}</strong><div class="meta">${st.gender}</div></div>
      <div class="actions"><button data-id="${st.id}" class="del-student">Delete</button></div>`;
    list.appendChild(li);
  });
  list.querySelectorAll('.del-student').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!confirm('Delete this student and their grades?')) return;
      const id = btn.dataset.id;
      DB.set(KEYS.students, DB.get(KEYS.students, []).filter(s => s.id !== id));
      const grades = DB.get(KEYS.grades, {});
      Object.keys(grades).forEach(k => { if (grades[k][id]) delete grades[k][id]; });
      DB.set(KEYS.grades, grades);
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
  const students = DB.get(KEYS.students, []);
  students.push({ id: uid(), classId, name, gender });
  DB.set(KEYS.students, students);
  nameInput.value = '';
  renderStudents();
  renderClasses();
});

/* ---------- Subjects ---------- */
function renderSubjects() {
  const list = document.getElementById('subjectList');
  const subjects = DB.get(KEYS.subjects, []);
  list.innerHTML = '';
  if (!subjects.length) { list.innerHTML = '<li class="empty">No subjects yet.</li>'; return; }
  subjects.forEach(sub => {
    const li = document.createElement('li');
    li.innerHTML = `<div>${escapeHtml(sub.name)}</div>
      <div class="actions"><button data-id="${sub.id}" class="del-subject">Delete</button></div>`;
    list.appendChild(li);
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

/* ---------- Grades entry ---------- */
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
  const key = gradeKey(classId, settings.currentTerm, settings.currentYear);
  const allGrades = DB.get(KEYS.grades, {});
  const classGrades = allGrades[key] || {};

  let html = '<div class="table-scroll"><table class="grades-table"><thead><tr><th class="name-col">Student</th>';
  subjects.forEach(sub => { html += `<th>${escapeHtml(sub.name)}</th>`; });
  html += '</tr></thead><tbody>';
  students.forEach(st => {
    html += `<tr><td class="name-col">${escapeHtml(st.name)}</td>`;
    subjects.forEach(sub => {
      const val = (classGrades[st.id] && classGrades[st.id][sub.id] !== undefined) ? classGrades[st.id][sub.id] : '';
      html += `<td><input type="number" min="0" max="100" inputmode="numeric" data-student="${st.id}" data-subject="${sub.id}" value="${val}"></td>`;
    });
    html += '</tr>';
  });
  html += '</tbody></table></div>';
  wrap.innerHTML = html;

  // Live-clamp scores to 0-100 as the teacher types, so an out-of-range
  // value never sits in the field waiting to be saved by mistake.
  wrap.querySelectorAll('input[type="number"]').forEach(input => {
    input.addEventListener('input', () => {
      const clamped = clampScore(input.value);
      if (String(clamped) !== input.value) input.value = clamped;
    });
    input.addEventListener('blur', () => {
      const clamped = clampScore(input.value);
      input.value = clamped;
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
    const clamped = clampScore(input.value);
    if (!classGrades[studentId]) classGrades[studentId] = {};
    if (clamped === '') { delete classGrades[studentId][subjectId]; }
    else { classGrades[studentId][subjectId] = clamped; }
  });
  allGrades[key] = classGrades;
  DB.set(KEYS.grades, allGrades);
  alert('Grades saved.');
});

/* ---------- Reports ---------- */
function renderReportsClassSelect() {
  const sel = document.getElementById('reportsClassSelect');
  fillClassSelect(sel);
  renderReportsStudentList();
}

function computeClassResults(classId, term, year) {
  const students = DB.get(KEYS.students, []).filter(s => s.classId === classId);
  const subjects = DB.get(KEYS.subjects, []);
  const key = gradeKey(classId, term, year);
  const classGrades = DB.get(KEYS.grades, {})[key] || {};

  const results = students.map(st => {
    const scores = classGrades[st.id] || {};
    const entries = subjects
      .filter(sub => scores[sub.id] !== undefined)
      .map(sub => ({ subject: sub, score: Number(scores[sub.id]) }));
    const total = entries.reduce((a, b) => a + b.score, 0);
    const avg = entries.length ? total / entries.length : 0;
    return { student: st, entries, total, avg };
  });

  const ranked = results.filter(r => r.entries.length > 0).slice().sort((a, b) => b.avg - a.avg);
  let rank = 0, lastAvg = null, seen = 0;
  ranked.forEach(r => {
    seen++;
    if (r.avg !== lastAvg) { rank = seen; lastAvg = r.avg; }
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
      generateSinglePDF(result);
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
  generateBatchPDF(results);
});

/* ---------- PDF generation ---------- */
function drawReportPage(doc, result, settings) {
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 18;

  // School name and header text are drawn FIRST, independent of the logo,
  // so a logo image issue can never keep the school name off the page.
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  const schoolName = (settings.schoolName && settings.schoolName.trim()) ? settings.schoolName.trim() : 'School Name Not Set';
  doc.text(schoolName, pageWidth / 2, y, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  if (settings.address) {
    y += 6;
    doc.text(settings.address, pageWidth / 2, y, { align: 'center' });
  }

  y += 9;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('TERMINAL REPORT', pageWidth / 2, y, { align: 'center' });

  // Logo drawn last, small, top-left corner — cannot affect text above.
  if (settings.logo) {
    try { doc.addImage(settings.logo, 'PNG', 15, 12, 20, 20); }
    catch (e) { try { doc.addImage(settings.logo, 'JPEG', 15, 12, 20, 20); } catch (e2) {} }
  }

  y += 12;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Name: ${result.student.name}`, 15, y);
  doc.text(`Gender: ${result.student.gender}`, pageWidth - 60, y);
  y += 6;
  doc.text(`Term: ${settings.currentTerm || ''}`, 15, y);
  doc.text(`Academic Year: ${settings.currentYear || ''}`, pageWidth - 60, y);
  y += 6;
  doc.text(`Position: ${result.position ? result.position + ' of ' + result.outOf : '-'}`, 15, y);
  doc.text(`Average: ${result.avg.toFixed(1)}%`, pageWidth - 60, y);

  y += 8;
  const colX = [15, 105, 130, 155, pageWidth - 15];
  const rowH = 8;
  doc.setFont('helvetica', 'bold');
  doc.rect(colX[0], y, colX[4] - colX[0], rowH);
  doc.line(colX[1], y, colX[1], y + rowH);
  doc.line(colX[2], y, colX[2], y + rowH);
  doc.line(colX[3], y, colX[3], y + rowH);
  doc.text('Subject', colX[0] + 2, y + 5.5);
  doc.text('Score', colX[1] + 2, y + 5.5);
  doc.text('Grade', colX[2] + 2, y + 5.5);
  doc.text('Remark', colX[3] + 2, y + 5.5);
  y += rowH;

  doc.setFont('helvetica', 'normal');
  result.entries.forEach(en => {
    const g = getGrade(en.score);
    doc.rect(colX[0], y, colX[4] - colX[0], rowH);
    doc.line(colX[1], y, colX[1], y + rowH);
    doc.line(colX[2], y, colX[2], y + rowH);
    doc.line(colX[3], y, colX[3], y + rowH);
    doc.text(String(en.subject.name), colX[0] + 2, y + 5.5);
    doc.text(String(en.score), colX[1] + 2, y + 5.5);
    doc.text(String(g.grade), colX[2] + 2, y + 5.5);
    doc.text(g.remark, colX[3] + 2, y + 5.5);
    y += rowH;
  });

  y += 10;
  doc.text(`Total Score: ${result.total}`, 15, y);
  y += 14;
  doc.text("Teacher's Remark: _______________________________________________", 15, y);
  y += 14;
  doc.text('Class Teacher: ____________________', 15, y);
  doc.text('Head Teacher: ____________________', pageWidth - 90, y);
  y += 14;
  doc.setFontSize(8);
  doc.setTextColor(120);
  doc.text('Generated with AlatiphA Report Cards', pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });
  doc.setTextColor(0);
}

function generateSinglePDF(result) {
  if (!result.entries.length) { alert('No grades entered for this student yet.'); return; }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const settings = DB.get(KEYS.settings, {});
  drawReportPage(doc, result, settings);
  doc.save(`${result.student.name.replace(/\s+/g, '_')}_report.pdf`);
}

function generateBatchPDF(results) {
  const usable = results.filter(r => r.entries.length > 0);
  if (!usable.length) { alert('No grades entered for this class yet.'); return; }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const settings = DB.get(KEYS.settings, {});
  usable.forEach((r, i) => {
    if (i > 0) doc.addPage();
    drawReportPage(doc, r, settings);
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
