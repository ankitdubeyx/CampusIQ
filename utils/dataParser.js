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

  const school = getField(['school', 'college', 'faculty'], 'School of Engineering & Computing');
  const batch = getField(['batch', 'grad_year', 'cohort_year'], '2021-2025');
  const studentClass = getField(['class', 'section', 'class_id'], 'CSE-A');

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

module.exports = {
  parseCsv,
  inferPersona,
  normalizeStudentRecord,
  parseAndNormalizeDataset
};
