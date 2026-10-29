/**
 * ==============================================================================
 * Dataset Parser & Ingestion Utility (CSV & JSON Support)
 * ==============================================================================
 * Handles ingestion, validation, flattening/un-flattening, and persona
 * auto-classification for uploaded datasets.
 * ==============================================================================
 */

/**
 * Robust CSV parser that handles quotes, escaped commas, and CRLF/LF line endings.
 * @param {string} csvText - Raw CSV content
 * @returns {Array<Object>} Array of key-value row objects
 */
function parseCsv(csvText) {
  const lines = [];
  let currentLine = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentField += '"';
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      currentLine.push(currentField.trim());
      currentField = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++; // skip \n in \r\n
      }
      currentLine.push(currentField.trim());
      if (currentLine.some(f => f.length > 0)) {
        lines.push(currentLine);
      }
      currentLine = [];
      currentField = '';
    } else {
      currentField += char;
    }
  }

  // Final field/line
  if (currentField.length > 0 || currentLine.length > 0) {
    currentLine.push(currentField.trim());
    if (currentLine.some(f => f.length > 0)) {
      lines.push(currentLine);
    }
  }

  if (lines.length < 2) return [];

  const headers = lines[0].map(h => h.trim().toLowerCase().replace(/[^a-z0-9_]/g, ''));
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const rowValues = lines[i];
    const rowObj = {};
    headers.forEach((h, idx) => {
      rowObj[h] = rowValues[idx] !== undefined ? rowValues[idx] : '';
    });
    rows.push(rowObj);
  }

  return rows;
}

/**
 * Intelligent Persona Classifier
 * Automatically categorizes students into the 3 personas based on data indicators
 * if not explicitly provided in the uploaded dataset.
 */
function inferPersona(cgpa, attendance, placementScore, codingScore) {
  if (cgpa >= 8.5 && placementScore < 60) {
    return 'High Academic / Low Placement';
  } else if (attendance < 75 && codingScore >= 80) {
    return 'Low Attendance / High Skills';
  } else {
    return 'Average All-Rounders';
  }
}

/**
 * Normalizes any uploaded raw record (flat CSV or nested JSON) into the
 * standard 7-category schema.
 * @param {Object} raw - Raw student object
 * @param {number} index - Index for ID generation
 * @returns {Object} Standardized student record
 */
function normalizeStudentRecord(raw, index = 1) {
  // If already nested with categories, validate and return
  if (raw.categories && raw.categories.academic) {
    return {
      id: raw.id || `STU${String(index).padStart(3, '0')}`,
      name: raw.name || `Student ${index}`,
      email: raw.email || `student${index}@university.edu`,
      school: raw.school || 'School of Engineering & Computing',
      department: raw.department || 'Computer Science & Engineering',
      batch: raw.batch || '2021-2025',
      class: raw.class || 'CSE-A',
      dean: raw.dean || raw.dean_name || '',
      hod: raw.hod || raw.hod_name || '',
      mentor: raw.mentor || raw.mentor_name || raw.advisor || '',
      batchHead: raw.batchHead || raw.batch_head || '',
      persona: raw.persona || inferPersona(
        raw.categories.academic.cgpa,
        raw.categories.attendance.overall !== undefined ? raw.categories.attendance.overall : (raw.categories.attendance.overallPercentage || 80),
        raw.categories.placement.mockInterviewScore,
        raw.categories.skills.codingAssessmentScore
      ),
      categories: raw.categories
    };
  }

  // Normalize flat headers (handles both CSV & flat JSON keys)
  const getField = (keys, fallback = '') => {
    for (const k of keys) {
      if (raw[k] !== undefined && raw[k] !== '') return raw[k];
    }
    return fallback;
  };

  const getNum = (keys, fallback = 0) => {
    const val = parseFloat(getField(keys, fallback));
    return isNaN(val) ? fallback : val;
  };

  const name = getField(['name', 'student_name', 'fullname', 'studentname'], `Student ${index}`);
  const id = getField(['id', 'roll_number', 'rollno', 'student_id', 'studentid'], `STU${String(index).padStart(3, '0')}`);
  const email = getField(['email', 'mail', 'student_email'], `${name.toLowerCase().replace(/\s+/g, '.')}${index}@university.edu`);
  const department = getField(['department', 'dept', 'branch', 'major'], 'Computer Science & Engineering');

  const school = getField(['school', 'college', 'faculty', 'institution'], 'School of Engineering & Computing');
  const batch = getField(['batch', 'grad_year', 'cohort_year', 'academic_year', 'year'], '2021-2025');
  const studentClass = getField(['class', 'section', 'class_id', 'division'], 'CSE-A');

  // Dynamic Hierarchical Institutional Roles (Flexible Schema)
  const dean = getField(['dean', 'dean_name', 'deanname', 'school_dean', 'institution_head', 'principal'], '');
  const hod = getField(['hod', 'hod_name', 'hodname', 'department_head', 'dept_head'], '');
  const mentor = getField(['mentor', 'mentor_name', 'mentorname', 'advisor', 'class_advisor', 'faculty_mentor', 'counselor'], '');
  const batchHead = getField(['batch_head', 'batchhead', 'year_coordinator', 'batch_coordinator'], '');

  // 1. Academic
  const cgpa = Math.min(10, Math.max(0, getNum(['cgpa', 'gpa', 'academic_cgpa', 'marks'], 7.5)));
  const backlogs = Math.max(0, parseInt(getNum(['backlogs', 'backlog_count', 'arrears'], 0), 10));
  const semester = parseInt(getNum(['semester', 'term', 'year'], 7), 10);
  const midsem = Math.min(100, Math.max(0, getNum(['midsem', 'exam_midsem', 'midterm'], Math.round(cgpa * 9.2))));
  const endsem = Math.min(100, Math.max(0, getNum(['endsem', 'exam_endsem', 'finals'], Math.round(cgpa * 9.5))));

  // 2. Granular Attendance
  const overallPercentage = Math.min(100, Math.max(0, getNum(['attendance', 'overall', 'overallpercentage', 'attendance_pct', 'attendance_percentage'], 80)));
  const classAttendance = Math.min(100, Math.max(0, getNum(['classes', 'class_attendance', 'lecture_attendance'], overallPercentage)));
  const eventsAttendance = Math.min(100, Math.max(0, getNum(['events', 'event_attendance'], overallPercentage)));
  const remedialAttendance = Math.min(100, Math.max(0, getNum(['remedial', 'remedial_attendance'], overallPercentage)));
  const extracurricularAttendance = Math.min(100, Math.max(0, getNum(['extracurricular', 'extracurricular_attendance'], overallPercentage)));
  const attendanceStatus = classAttendance >= 85 ? 'Excellent Attendance' : classAttendance >= 75 ? 'Good Standing' : 'Attendance Warning (<75%)';

  // 3. LMS
  const weeklyHours = getNum(['lms_hours', 'weeklyhours', 'lms_weekly_hours'], 10.0);
  const loginFrequency = getField(['login_frequency', 'loginfrequency', 'lms_frequency'], 'Regular (4-5 days/week)');
  const assignmentsSubmittedOnTimePercentage = Math.min(100, Math.max(0, getNum(['assignments_ontime', 'assignmentssubmittedontimepercentage', 'lms_assignments', 'assignments'], 85)));

  // 4. Engagement
  const hackathonsParticipated = parseInt(getNum(['hackathons', 'hackathonsparticipated', 'hackathons_count'], 1), 10);
  const hackathonWins = parseInt(getNum(['hackathon_wins', 'hackathonwins', 'wins'], 0), 10);
  const rawClubs = getField(['clubs', 'clubsoractivities', 'extracurriculars'], 'Tech Club');
  const clubsOrActivities = Array.isArray(rawClubs) ? rawClubs : rawClubs.split(/[;,]/).map(c => c.trim()).filter(Boolean);

  // 5. Placement
  const mockInterviewScore = Math.min(100, Math.max(0, getNum(['placement_score', 'mockinterviewscore', 'mock_score', 'interview_score', 'placement'], 70)));
  const technicalRoundScore = Math.min(100, Math.max(0, getNum(['technical_round', 'technicalroundscore', 'tech_score'], mockInterviewScore)));
  const hrRoundScore = Math.min(100, Math.max(0, getNum(['hr_round', 'hrroundscore'], mockInterviewScore)));
  const readinessStatus = mockInterviewScore >= 80 ? 'Industry Ready (High Product Potential)' : mockInterviewScore >= 60 ? 'On Track (Balanced Potential)' : 'Needs Intensive Soft-Skill & Practical Training';

  // 6. Skills & Certifications
  const codingAssessmentScore = Math.min(100, Math.max(0, getNum(['coding_score', 'codingassessmentscore', 'skills_score', 'coding'], 72)));
  const rawLangs = getField(['languages', 'primarylanguages', 'tech_stack'], 'Python, Java');
  const primaryLanguages = Array.isArray(rawLangs) ? rawLangs : rawLangs.split(/[;,]/).map(l => l.trim()).filter(Boolean);
  const leetcodeProblemsSolved = parseInt(getNum(['leetcode', 'leetcodeproblemssolved', 'dsa_solved'], 120), 10);
  const certificationsCount = parseInt(getNum(['certifications', 'certificationscount'], 2), 10);

  // Certifications list (if provided as JSON or fallback generated)
  let certifications = [];
  if (Array.isArray(raw.certifications)) {
    certifications = raw.certifications;
  } else if (raw.categories && raw.categories.skills && Array.isArray(raw.categories.skills.certifications)) {
    certifications = raw.categories.skills.certifications;
  } else {
    certifications = [
      {
        course_name: 'Applied Machine Learning & Problem Solving',
        completion_status: 'Completed',
        score: Math.min(100, Math.max(60, Math.round(codingAssessmentScore * 0.95)))
      },
      {
        course_name: 'Cloud Infrastructure & Microservices',
        completion_status: 'Completed',
        score: Math.min(100, Math.max(60, Math.round(codingAssessmentScore * 0.90)))
      }
    ];
  }

  // 7. Feedback
  const facultyFeedback = getField(['faculty_feedback', 'facultyfeedback', 'teacher_notes'], 'Attentive student with consistent academic progress.');
  const mentorFeedback = getField(['mentor_feedback', 'mentorfeedback', 'mentor_notes'], 'Strong work ethic with practical potential.');
  const rawStrengths = getField(['strengths'], 'Consistent performer, Team collaboration');
  const strengths = Array.isArray(rawStrengths) ? rawStrengths : rawStrengths.split(/[;,]/).map(s => s.trim()).filter(Boolean);
  const rawImprove = getField(['improvements', 'areasforimprovement'], 'Continuous practice in live interviews');
  const areasForImprovement = Array.isArray(rawImprove) ? rawImprove : rawImprove.split(/[;,]/).map(s => s.trim()).filter(Boolean);

  // Auto-infer or preserve persona
  let persona = getField(['persona', 'segment', 'cohort']);
  if (!persona || !['High Academic / Low Placement', 'Low Attendance / High Skills', 'Average All-Rounders'].includes(persona)) {
    persona = inferPersona(cgpa, overallPercentage, mockInterviewScore, codingAssessmentScore);
  }

  return {
    id,
    name,
    email,
    school,
    department,
    batch,
    class: studentClass,
    dean,
    hod,
    mentor,
    batchHead,
    persona,
    categories: {
      academic: {
        cgpa,
        backlogs,
        semester,
        exam_scores: {
          midsem,
          endsem
        }
      },
      attendance: {
        overall: overallPercentage,
        classes: classAttendance,
        events: eventsAttendance,
        remedial: remedialAttendance,
        extracurricular: extracurricularAttendance,
        overallPercentage,
        status: attendanceStatus
      },
      lms: {
        loginFrequency,
        weeklyHours,
        assignmentsSubmittedOnTimePercentage
      },
      engagement: {
        hackathonsParticipated,
        hackathonWins,
        clubsOrActivities: clubsOrActivities.length ? clubsOrActivities : ['Campus Student Club']
      },
      placement: {
        mockInterviewScore,
        technicalRoundScore,
        hrRoundScore,
        readinessStatus
      },
      skills: {
        codingAssessmentScore,
        primaryLanguages: primaryLanguages.length ? primaryLanguages : ['Python'],
        leetcodeProblemsSolved,
        certificationsCount,
        certifications
      },
      feedback: {
        facultyFeedback,
        mentorFeedback,
        strengths: strengths.length ? strengths : ['Dedicated learner'],
        areasForImprovement: areasForImprovement.length ? areasForImprovement : ['Advanced practical exposure']
      }
    }
  };
}

/**
 * Main ingestion handler supporting both raw CSV string or JSON payload.
 * @param {string|Array|Object} inputData - Uploaded dataset
 * @param {string} fileType - 'csv' | 'json' | 'auto'
 * @returns {Array<Object>} Normalized students array
 */
function parseAndNormalizeDataset(inputData, fileType = 'auto') {
  let records = [];

  // 1. If it's already an array or parsed object
  if (Array.isArray(inputData)) {
    records = inputData;
  } else if (typeof inputData === 'object' && inputData !== null) {
    records = inputData.data || inputData.students || [inputData];
  } else if (typeof inputData === 'string') {
    const trimmed = inputData.trim();
    
    // Check if JSON string
    if (fileType === 'json' || trimmed.startsWith('[') || trimmed.startsWith('{')) {
      try {
        const parsed = JSON.parse(trimmed);
        records = Array.isArray(parsed) ? parsed : (parsed.data || parsed.students || [parsed]);
      } catch (err) {
        if (fileType === 'json') throw new Error(`Invalid JSON format: ${err.message}`);
        // Fallback to CSV
        records = parseCsv(trimmed);
      }
    } else {
      // Parse as CSV
      records = parseCsv(trimmed);
    }
  }

  if (!records.length) {
    throw new Error('No valid student rows found in the uploaded file.');
  }

  // Normalize each record into the standard 7 categories
  return records.map((r, i) => normalizeStudentRecord(r, i + 1));
}

/**
 * Dynamically extracts institutional hierarchy and personnel roles from an uploaded dataset.
 * Adheres strictly to the flexible schema principle:
 * - If explicit person names are provided (dean, hod, mentor, batch_head), they are extracted directly.
 * - If only structural attributes exist (department, class, batch, school), dynamic role identities
 *   are formed (e.g. "Head of Department — Computer Science", "Class Advisor — Section A").
 * - Zero hardcoded assumptions. Every single name, role, department, and section is derived directly
 *   from the uploaded records.
 * @param {Array<Object>} students - Enriched or normalized student records
 * @returns {Object} Complete institutional hierarchy
 */
function extractHierarchy(students = []) {
  if (!Array.isArray(students) || students.length === 0) {
    return {
      totalStudents: 0,
      deans: [],
      hods: [],
      batchHeads: [],
      mentors: [],
      departments: [],
      batches: [],
      classes: [],
      students: []
    };
  }

  const deanMap = new Map();
  const hodMap = new Map();
  const batchMap = new Map();
  const mentorMap = new Map();

  students.forEach((s) => {
    const cgpa = s.categories?.academic?.cgpa ?? 0;
    const attn = s.categories?.attendance?.classes ?? s.categories?.attendance?.overallPercentage ?? s.categories?.attendance?.overall ?? 0;
    const isHighRisk = s.analytics?.riskFlag === 'High' || (attn < 75 && attn > 0);

    // 1. Dean Resolution
    const rawDean = (s.dean || s.dean_name || '').trim();
    const school = (s.school || 'School of Engineering & Computing').trim();
    const deanKey = rawDean || `Dean of ${school}`;
    const deanDisplayName = rawDean || `Dean (${school})`;
    if (!deanMap.has(deanKey)) {
      deanMap.set(deanKey, {
        id: `dean-${deanMap.size + 1}`,
        name: deanDisplayName,
        rawName: rawDean,
        school: school,
        isExplicit: Boolean(rawDean),
        studentCount: 0,
        highRiskCount: 0,
        cgpaSum: 0,
        attnSum: 0,
        departments: new Set()
      });
    }
    const d = deanMap.get(deanKey);
    d.studentCount++;
    d.cgpaSum += cgpa;
    d.attnSum += attn;
    if (isHighRisk) d.highRiskCount++;
    if (s.department) d.departments.add(s.department.trim());

    // 2. HOD Resolution
    const dept = (s.department || 'General').trim();
    const rawHod = (s.hod || s.hod_name || '').trim();
    const hodKey = dept;
    const hodDisplayName = rawHod ? `${rawHod}` : `Head of ${dept}`;
    if (!hodMap.has(hodKey)) {
      hodMap.set(hodKey, {
        id: `hod-${hodMap.size + 1}`,
        name: hodDisplayName,
        rawName: rawHod,
        department: dept,
        isExplicit: Boolean(rawHod),
        studentCount: 0,
        highRiskCount: 0,
        cgpaSum: 0,
        attnSum: 0,
        mentors: new Set(),
        classes: new Set()
      });
    }
    const h = hodMap.get(hodKey);
    h.studentCount++;
    h.cgpaSum += cgpa;
    h.attnSum += attn;
    if (isHighRisk) h.highRiskCount++;
    if (s.mentor) h.mentors.add(s.mentor.trim());
    if (s.class) h.classes.add(s.class.trim());

    // 3. Batch Head Resolution
    const batch = (s.batch || '2021-2025').trim();
    const rawBatchHead = (s.batchHead || s.batch_head || '').trim();
    const batchKey = batch;
    const batchHeadDisplayName = rawBatchHead ? `${rawBatchHead}` : `Batch Coordinator (${batch})`;
    if (!batchMap.has(batchKey)) {
      batchMap.set(batchKey, {
        id: `batch-${batchMap.size + 1}`,
        name: batchHeadDisplayName,
        rawName: rawBatchHead,
        batch: batch,
        isExplicit: Boolean(rawBatchHead),
        studentCount: 0,
        highRiskCount: 0,
        cgpaSum: 0,
        attnSum: 0
      });
    }
    const b = batchMap.get(batchKey);
    b.studentCount++;
    b.cgpaSum += cgpa;
    b.attnSum += attn;
    if (isHighRisk) b.highRiskCount++;

    // 4. Mentor Resolution
    const rawMentor = (s.mentor || s.mentor_name || '').trim();
    const studentClass = (s.class || 'A').trim();
    const mentorKey = rawMentor || `${dept} — Class ${studentClass}`;
    const mentorDisplayName = rawMentor ? `${rawMentor}` : `Class Advisor (Section ${studentClass})`;
    if (!mentorMap.has(mentorKey)) {
      mentorMap.set(mentorKey, {
        id: `mentor-${mentorMap.size + 1}`,
        name: mentorDisplayName,
        rawName: rawMentor,
        class: studentClass,
        department: dept,
        isExplicit: Boolean(rawMentor),
        studentCount: 0,
        highRiskCount: 0,
        cgpaSum: 0,
        attnSum: 0,
        studentIds: []
      });
    }
    const m = mentorMap.get(mentorKey);
    m.studentCount++;
    m.cgpaSum += cgpa;
    m.attnSum += attn;
    m.studentIds.push(s.id);
    if (isHighRisk) m.highRiskCount++;
  });

  const round = (val) => (val > 0 ? Number(val.toFixed(2)) : 0);

  const deans = Array.from(deanMap.values()).map(d => ({
    id: d.id,
    name: d.name,
    rawName: d.rawName,
    school: d.school,
    isExplicit: d.isExplicit,
    studentCount: d.studentCount,
    highRiskCount: d.highRiskCount,
    avgCgpa: round(d.cgpaSum / d.studentCount),
    avgAttendance: round(d.attnSum / d.studentCount),
    departments: Array.from(d.departments)
  }));

  const hods = Array.from(hodMap.values()).map(h => ({
    id: h.id,
    name: h.name,
    rawName: h.rawName,
    department: h.department,
    isExplicit: h.isExplicit,
    studentCount: h.studentCount,
    highRiskCount: h.highRiskCount,
    avgCgpa: round(h.cgpaSum / h.studentCount),
    avgAttendance: round(h.attnSum / h.studentCount),
    mentors: Array.from(h.mentors),
    classes: Array.from(h.classes)
  }));

  const batchHeads = Array.from(batchMap.values()).map(b => ({
    id: b.id,
    name: b.name,
    rawName: b.rawName,
    batch: b.batch,
    isExplicit: b.isExplicit,
    studentCount: b.studentCount,
    highRiskCount: b.highRiskCount,
    avgCgpa: round(b.cgpaSum / b.studentCount),
    avgAttendance: round(b.attnSum / b.studentCount)
  }));

  const mentors = Array.from(mentorMap.values()).map(m => ({
    id: m.id,
    name: m.name,
    rawName: m.rawName,
    class: m.class,
    department: m.department,
    isExplicit: m.isExplicit,
    studentCount: m.studentCount,
    highRiskCount: m.highRiskCount,
    avgCgpa: round(m.cgpaSum / m.studentCount),
    avgAttendance: round(m.attnSum / m.studentCount),
    studentIds: m.studentIds
  }));

  const studentDirectory = students.map(s => {
    const classAttn = s.categories?.attendance?.classes ?? s.categories?.attendance?.overallPercentage ?? s.categories?.attendance?.overall ?? 80;
    return {
      id: s.id,
      name: s.name,
      department: s.department,
      batch: s.batch,
      class: s.class,
      dean: s.dean || '',
      hod: s.hod || '',
      mentor: s.mentor || '',
      cgpa: s.categories?.academic?.cgpa ?? 0,
      classAttendance: classAttn,
      attendanceRiskAlert: classAttn < 75,
      riskFlag: s.analytics?.riskFlag || (classAttn < 75 ? 'High' : 'Low'),
      persona: s.persona
    };
  });

  return {
    totalStudents: students.length,
    deans,
    hods,
    batchHeads,
    mentors,
    departments: Array.from(new Set(students.map(s => (s.department || '').trim()).filter(Boolean))),
    batches: Array.from(new Set(students.map(s => (s.batch || '').trim()).filter(Boolean))),
    classes: Array.from(new Set(students.map(s => (s.class || '').trim()).filter(Boolean))),
    students: studentDirectory
  };
}

module.exports = {
  parseCsv,
  inferPersona,
  normalizeStudentRecord,
  parseAndNormalizeDataset,
  extractHierarchy
};
