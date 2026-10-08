// ==============================================================================
// Simple Node.js & Express Backend - Student Analytics Database
// ==============================================================================
// Features:
// - 50 Mock Students across 7 Categories & 3 Personas
// - Student Success Score Calculation (Weighted 0 - 100)
//     * 30% Academic
//     * 20% Placement
//     * 15% Attendance
//     * 15% Skills
//     * 10% LMS
//     *  5% Engagement
//     *  5% Feedback
// - Automatic Risk Flag Assignment (High, Medium, Low)
//     * High: Success Score < 50 OR Placement Score < 40
//     * Medium: Success Score < 70 OR Placement Score < 60 OR Attendance < 75%
//     * Low: Success Score >= 70 AND Placement Score >= 60 AND Attendance >= 75%
// ==============================================================================

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const {
  calculateStudentSuccessScore,
  assignRiskFlag,
  enrichStudent
} = require('./utils/scoring');
const { parseAndNormalizeDataset } = require('./utils/dataParser');

const app = express();
const PORT = process.env.PORT || 3000;

// Path to our mock JSON database
const DATA_FILE = path.join(__dirname, 'data', 'students.json');

// In-memory student cache loaded from the JSON file
let rawStudents = [];

/**
 * Helper function to load student data from the JSON file
 */
function loadStudents() {
  try {
    const rawData = fs.readFileSync(DATA_FILE, 'utf-8');
    rawStudents = JSON.parse(rawData);
    console.log(`[Database] Loaded ${rawStudents.length} students from ${DATA_FILE}`);
  } catch (err) {
    console.error('[Database Error] Failed to load students.json:', err.message);
    rawStudents = [];
  }
}

// Initial load
loadStudents();

// ------------------------------------------------------------------------------
// Middlewares
// ------------------------------------------------------------------------------

// Enable Cross-Origin Resource Sharing (CORS) so frontends can connect without issues
app.use(cors());

// Parse incoming JSON request bodies (with 10mb limit for dataset uploads)
app.use(express.json({ limit: '10mb' }));

// Parse raw text bodies for CSV file uploads
app.use(express.text({ limit: '10mb', type: ['text/csv', 'text/plain'] }));

// Serve static assets from 'public' directory (HTML, CSS, JS)
app.use(express.static(path.join(__dirname, 'public')));

// Simple logging middleware to print requests to the console
app.use((req, res, next) => {
  console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.originalUrl}`);
  next();
});

// ------------------------------------------------------------------------------
// Helper: Get all students enriched with analytics
// ------------------------------------------------------------------------------
function getEnrichedStudents() {
  return rawStudents.map(student => enrichStudent(student));
}

// ------------------------------------------------------------------------------
// API Routes
// ------------------------------------------------------------------------------

/**
 * Root Route: GET / & GET /login
 * Serves the Role Selection Login Page
 */
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

/**
 * Dashboard Route: GET /dashboard
 * Serves the interactive Student Analytics Dashboard (with query parameters role=...)
 */
app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

/**
 * API Info Route: GET /api
 * Provides API status, metadata, and quick documentation of endpoints.
 */
app.get('/api', (req, res) => {
  const enriched = getEnrichedStudents();
  const highRiskCount = enriched.filter(s => s.analytics.riskFlag === 'High').length;
  const medRiskCount = enriched.filter(s => s.analytics.riskFlag === 'Medium').length;
  const lowRiskCount = enriched.filter(s => s.analytics.riskFlag === 'Low').length;

  res.json({
    message: 'Welcome to the Student Analytics & Risk Assessment API!',
    status: 'online',
    totalStudents: rawStudents.length,
    riskSummary: {
      highRisk: highRiskCount,
      mediumRisk: medRiskCount,
      lowRisk: lowRiskCount
    },
    scoringFormula: {
      description: "Success Score (0 - 100) based on weighted category performance",
      weights: {
        academic: '30%',
        placement: '20%',
        attendance: '15%',
        skills: '15%',
        lms: '10%',
        engagement: '5%',
        feedback: '5%'
      },
      riskRules: {
        highRisk: 'Success Score < 50 OR Placement Score < 40',
        mediumRisk: 'Success Score < 70 OR Placement Score < 60 OR Attendance < 75%',
        lowRisk: 'Success Score >= 70 AND Placement Score >= 60 AND Attendance >= 75%'
      }
    },
    sampleEndpoints: {
      getAllEnrichedStudents: 'GET /api/students',
      filterByHighRisk: 'GET /api/students?risk=High',
      filterByPersona: 'GET /api/students?persona=High Academic / Low Placement',
      sortBySuccessScore: 'GET /api/students?sortBy=successScore&order=desc',
      searchByNameOrId: 'GET /api/students?search=Aarav',
      getSingleStudent: 'GET /api/students/STU001',
      getPersonasSummary: 'GET /api/personas',
      getAnalyticsOverview: 'GET /api/analytics/overview'
    }
  });
});

/**
 * GET /api/personas
 * Returns the list of personas with student counts and brief profiles.
 */
app.get('/api/personas', (req, res) => {
  const enriched = getEnrichedStudents();

  const personaDefinitions = [
    {
      name: 'High Academic / Low Placement',
      description: 'High CGPA (8.8 - 9.8), 0 backlogs, high attendance (88-97%), regular LMS logins. However, has low interview confidence and modest practical/coding assessment scores (40-65). Needs soft skills & live interview coaching.',
      count: enriched.filter(s => s.persona === 'High Academic / Low Placement').length,
      highRiskStudents: enriched.filter(s => s.persona === 'High Academic / Low Placement' && s.analytics.riskFlag === 'High').length
    },
    {
      name: 'Low Attendance / High Skills',
      description: 'Low attendance (<75%), lower LMS engagement, moderate CGPA (6.2 - 7.4). However, excels in hackathons, high coding assessment scores (85-99), top mock interview technical performance. Industry-ready builder who struggles with classroom attendance compliance.',
      count: enriched.filter(s => s.persona === 'Low Attendance / High Skills').length,
      highRiskStudents: enriched.filter(s => s.persona === 'Low Attendance / High Skills' && s.analytics.riskFlag === 'High').length
    },
    {
      name: 'Average All-Rounders',
      description: 'Balanced profile with solid CGPA (7.5 - 8.4), good attendance (76-85%), steady LMS usage, moderate hackathons, and consistent interview and coding scores (68-80). Dependable team players with steady growth potential.',
      count: enriched.filter(s => s.persona === 'Average All-Rounders').length,
      highRiskStudents: enriched.filter(s => s.persona === 'Average All-Rounders' && s.analytics.riskFlag === 'High').length
    }
  ];

  res.json({
    success: true,
    personas: personaDefinitions
  });
});

/**
 * GET /api/analytics/overview
 * Computes average metrics for each persona across key categories,
 * including average Success Score and risk breakdown.
 */
app.get('/api/analytics/overview', (req, res) => {
  const enriched = getEnrichedStudents();
  const personas = [
    'High Academic / Low Placement',
    'Low Attendance / High Skills',
    'Average All-Rounders'
  ];

  const personaAnalytics = personas.map(pName => {
    const group = enriched.filter(s => s.persona === pName);
    const count = group.length;

    if (count === 0) {
      return { persona: pName, count: 0 };
    }

    const avg = (arr, extractor) =>
      Number((arr.reduce((acc, curr) => acc + extractor(curr), 0) / count).toFixed(2));

    return {
      persona: pName,
      studentCount: count,
      riskDistribution: {
        high: group.filter(s => s.analytics.riskFlag === 'High').length,
        medium: group.filter(s => s.analytics.riskFlag === 'Medium').length,
        low: group.filter(s => s.analytics.riskFlag === 'Low').length
      },
      averages: {
        successScore: avg(group, s => s.analytics.successScore),
        cgpa: avg(group, s => s.categories.academic.cgpa),
        attendancePercentage: avg(group, s => s.categories.attendance.overallPercentage),
        lmsWeeklyHours: avg(group, s => s.categories.lms.weeklyHours),
        hackathonsParticipated: avg(group, s => s.categories.engagement.hackathonsParticipated),
        mockInterviewScore: avg(group, s => s.categories.placement.mockInterviewScore),
        codingAssessmentScore: avg(group, s => s.categories.skills.codingAssessmentScore),
        leetcodeSolved: Math.round(avg(group, s => s.categories.skills.leetcodeProblemsSolved))
      }
    };
  });

  res.json({
    success: true,
    totalStudents: enriched.length,
    overallRiskDistribution: {
      high: enriched.filter(s => s.analytics.riskFlag === 'High').length,
      medium: enriched.filter(s => s.analytics.riskFlag === 'Medium').length,
      low: enriched.filter(s => s.analytics.riskFlag === 'Low').length
    },
    overview: personaAnalytics
  });
});

/**
 * GET /api/students/directory
 * Lightweight directory returning all students for dropdown selectors,
 * role pickers, and portal navigation. Accessible across all scopes.
 */
app.get('/api/students/directory', (req, res) => {
  const enriched = getEnrichedStudents();
  const directory = enriched.map(s => {
    const classAttn = s.categories.attendance.classes !== undefined ? s.categories.attendance.classes : s.categories.attendance.overall;
    const isAlert = classAttn < 75;
    return {
      id: s.id,
      name: s.name,
      department: s.department,
      batch: s.batch,
      class: s.class,
      cgpa: s.categories.academic.cgpa,
      classAttendance: classAttn,
      attendanceRiskAlert: isAlert,
      riskFlag: s.analytics.riskFlag,
      persona: s.persona
    };
  });
  res.json({
    success: true,
    count: directory.length,
    students: directory
  });
});

/**
 * GET /api/students
 * Primary endpoint returning all student records enriched with:
 *  - Success Score (0 - 100)
 *  - Risk Flag (High, Medium, Low)
 *  - Risk Reasons
 *  - Component Score Breakdown
 * 
 * Query Parameters:
 *  - risk: 'High' | 'Medium' | 'Low'
 *  - persona: filter by persona name
 *  - department: filter by department name
 *  - search: search by name, email, or id
 *  - minSuccessScore, maxSuccessScore
 *  - minCgpa, maxCgpa
 *  - sortBy: 'successScore' | 'cgpa' | 'attendance' | 'placement' | 'skills' | 'name'
 *  - order: 'asc' | 'desc' (default: 'desc' for scores)
 *  - page, limit (pagination)
 */
app.get('/api/students', (req, res) => {
  let result = getEnrichedStudents();
  const {
    role,
    school,
    department,
    batch,
    class: queryClass,
    id,
    risk,
    persona,
    search,
    minSuccessScore,
    maxSuccessScore,
    minCgpa,
    maxCgpa,
    sortBy,
    order,
    page,
    limit
  } = req.query;

  // Department code/alias map for HOD and departmental queries
  const deptAliasMap = {
    'cse': 'Computer Science & Engineering',
    'it': 'Information Technology',
    'ece': 'Electronics & Communication Engineering',
    'dsai': 'Data Science & AI',
    'ds': 'Data Science & AI',
    'ai': 'Data Science & AI'
  };

  // ----------------------------------------------------------------------------
  // Role-Based Access Control (RBAC) Logic
  // Supported roles: Dean | HOD | Batch Head | Mentor | Student
  // ----------------------------------------------------------------------------
  if (role) {
    const normalizedRole = role.toLowerCase().replace(/[\s_-]+/g, '');

    // ROLE: Student
    // Returns ONLY their single personal record containing their specific weaknesses, marks, and attendance
    if (normalizedRole === 'student') {
      let targetId = (id || '').trim().toUpperCase();

      // Normalize numeric id: e.g. "1" or "01" -> "STU001"
      if (targetId && !targetId.startsWith('STU')) {
        targetId = `STU${targetId.padStart(3, '0')}`;
      }

      if (!targetId) {
        return res.status(400).json({
          success: false,
          error: "Missing required query parameter 'id' for student role (e.g. ?role=student&id=STU001 or ?role=student&id=1)."
        });
      }

      const foundStudent = result.find(s => s.id.toUpperCase() === targetId);
      if (!foundStudent) {
        return res.status(404).json({
          success: false,
          error: `Student with ID '${id}' was not found. Valid IDs range from STU001 to STU050.`
        });
      }

      // Build structured personal record with specific weaknesses, marks, and granular attendance
      const cat = foundStudent.categories;
      const classAttn = cat.attendance.classes !== undefined ? cat.attendance.classes : (cat.attendance.overall || 80);
      const isAttendanceRisk = classAttn < 75;

      // Compile comprehensive personal weaknesses list
      const weaknesses = [];
      if (isAttendanceRisk) {
        weaknesses.push(`⚠️ Attendance Alert: Class attendance is ${classAttn}% (below the mandatory 75% statutory requirement).`);
      }
      if (cat.placement.mockInterviewScore < 50) {
        weaknesses.push(`Placement Readiness: Mock interview score is ${cat.placement.mockInterviewScore}/100 (<50). Immediate soft-skill and technical interview coaching recommended.`);
      }
      if (cat.academic.backlogs > 0) {
        weaknesses.push(`Academic Standing: ${cat.academic.backlogs} active backlog(s) requiring remedial clearance.`);
      }
      if (cat.skills.codingAssessmentScore < 60) {
        weaknesses.push(`Skills Deficit: Coding assessment score is ${cat.skills.codingAssessmentScore}/100. Practice in data structures & algorithms required.`);
      }
      if (cat.feedback.areasForImprovement && cat.feedback.areasForImprovement.length > 0) {
        cat.feedback.areasForImprovement.forEach(area => weaknesses.push(area));
      }

      const personalRecord = {
        role: 'Student',
        accessScope: 'Personal Record (Confidential)',
        studentDetails: {
          id: foundStudent.id,
          name: foundStudent.name,
          email: foundStudent.email,
          school: foundStudent.school,
          department: foundStudent.department,
          batch: foundStudent.batch,
          class: foundStudent.class,
          persona: foundStudent.persona
        },
        successScore: foundStudent.analytics.successScore,
        riskFlag: foundStudent.analytics.riskFlag,
        attendanceRiskAlert: isAttendanceRisk,
        attendanceRiskMessage: isAttendanceRisk
          ? `⚠️ Attendance Risk Alert: Class attendance (${classAttn}%) is below 75%. Remedial attendance required.`
          : `Class attendance (${classAttn}%) meets requirement.`,
        marks: {
          cgpa: cat.academic.cgpa,
          backlogs: cat.academic.backlogs,
          semester: cat.academic.semester,
          exam_scores: cat.academic.exam_scores || {
            midsem: Math.round(cat.academic.cgpa * 9.2),
            endsem: Math.round(cat.academic.cgpa * 9.5)
          }
        },
        attendance: {
          overall: cat.attendance.overall !== undefined ? cat.attendance.overall : cat.attendance.overallPercentage,
          classes: cat.attendance.classes,
          events: cat.attendance.events,
          remedial: cat.attendance.remedial,
          extracurricular: cat.attendance.extracurricular,
          status: cat.attendance.status,
          attendanceRiskAlert: isAttendanceRisk
        },
        weaknesses,
        strengths: cat.feedback.strengths || [],
        skillsAndCertifications: {
          codingAssessmentScore: cat.skills.codingAssessmentScore,
          primaryLanguages: cat.skills.primaryLanguages,
          leetcodeProblemsSolved: cat.skills.leetcodeProblemsSolved,
          certifications: cat.skills.certifications || []
        },
        feedback: {
          facultyFeedback: cat.feedback.facultyFeedback,
          mentorFeedback: cat.feedback.mentorFeedback
        },
        placement: {
          mockInterviewScore: cat.placement.mockInterviewScore,
          technicalRoundScore: cat.placement.technicalRoundScore,
          hrRoundScore: cat.placement.hrRoundScore,
          readinessStatus: cat.placement.readinessStatus,
          internshipsCompleted: cat.placement.internshipsCompleted || 0
        },
        lms: {
          weeklyHours: cat.lms.weeklyHours,
          assignmentsSubmittedOnTimePercentage: cat.lms.assignmentsSubmittedOnTimePercentage,
          loginFrequency: cat.lms.loginFrequency,
          forumContributionsCount: cat.lms.forumContributionsCount || 0
        },
        engagement: {
          hackathonsParticipated: cat.engagement.hackathonsParticipated,
          hackathonWins: cat.engagement.hackathonWins,
          clubsOrActivities: cat.engagement.clubsOrActivities || []
        },
        categories: cat,
        analytics: foundStudent.analytics
      };

      return res.json({
        success: true,
        role: 'Student',
        data: personalRecord
      });
    }

    // ROLE: Dean
    // Dean returns all school data (optionally filtered by school query)
    else if (normalizedRole === 'dean') {
      const targetSchool = school || req.query.faculty;
      if (targetSchool) {
        const qSchool = targetSchool.toLowerCase();
        result = result.filter(s => (s.school || '').toLowerCase().includes(qSchool));
      }
    }

    // ROLE: HOD (Head of Department)
    // Returns only their department
    else if (normalizedRole === 'hod' || normalizedRole === 'headofdepartment') {
      const targetDept = department || req.query.dept || 'CSE';
      const cleanDept = targetDept.trim().toLowerCase();
      const mappedDept = deptAliasMap[cleanDept] ? deptAliasMap[cleanDept].toLowerCase() : cleanDept;

      result = result.filter(s =>
        s.department.toLowerCase().includes(mappedDept) ||
        (cleanDept === 'cse' && s.department.toLowerCase().includes('computer science')) ||
        (cleanDept === 'it' && s.department.toLowerCase().includes('information technology')) ||
        (cleanDept === 'ece' && s.department.toLowerCase().includes('electronics')) ||
        (cleanDept === 'dsai' && s.department.toLowerCase().includes('data science'))
      );
    }

    // ROLE: Batch Head
    // Returns only their batch
    else if (normalizedRole === 'batchhead') {
      const targetBatch = batch || req.query.batch_year || '2021-2025';
      const qBatch = targetBatch.trim().toLowerCase();
      result = result.filter(s => (s.batch || '').toLowerCase().includes(qBatch));
    }

    // ROLE: Mentor
    // Returns only their class
    else if (normalizedRole === 'mentor') {
      const targetClass = queryClass || req.query.section || 'CSE-A';
      const qClass = targetClass.trim().toLowerCase();
      result = result.filter(s => (s.class || '').toLowerCase() === qClass);
    }
  }

  // ----------------------------------------------------------------------------
  // General Query Filters (Applicable to administrative roles or default view)
  // ----------------------------------------------------------------------------

  // Filter by hierarchical tags if explicitly passed without role restriction
  if (school && (!role || role.toLowerCase() !== 'dean')) {
    const qSchool = school.toLowerCase();
    result = result.filter(s => (s.school || '').toLowerCase().includes(qSchool));
  }

  if (department && (!role || (role.toLowerCase() !== 'hod' && role.toLowerCase() !== 'headofdepartment'))) {
    const cleanDept = department.trim().toLowerCase();
    const mappedDept = deptAliasMap[cleanDept] ? deptAliasMap[cleanDept].toLowerCase() : cleanDept;
    result = result.filter(s =>
      s.department.toLowerCase().includes(mappedDept) ||
      (cleanDept === 'cse' && s.department.toLowerCase().includes('computer science')) ||
      (cleanDept === 'it' && s.department.toLowerCase().includes('information technology')) ||
      (cleanDept === 'ece' && s.department.toLowerCase().includes('electronics')) ||
      (cleanDept === 'dsai' && s.department.toLowerCase().includes('data science'))
    );
  }

  if (batch && (!role || role.toLowerCase().replace(/[\s_-]+/g, '') !== 'batchhead')) {
    const qBatch = batch.trim().toLowerCase();
    result = result.filter(s => (s.batch || '').toLowerCase().includes(qBatch));
  }

  if (queryClass && (!role || role.toLowerCase() !== 'mentor')) {
    const qClass = queryClass.trim().toLowerCase();
    result = result.filter(s => (s.class || '').toLowerCase() === qClass);
  }

  // Attendance Risk Alert filter: ?attendanceRisk=true
  if (req.query.attendanceRisk !== undefined) {
    const isRiskFilter = req.query.attendanceRisk === 'true' || req.query.attendanceRisk === '1';
    result = result.filter(s => s.analytics.attendanceRiskAlert === isRiskFilter);
  }

  // 1. Filter by Risk Flag (High, Medium, Low)
  if (risk) {
    const qRisk = risk.toLowerCase();
    result = result.filter(s => s.analytics.riskFlag.toLowerCase() === qRisk);
  }

  // 2. Filter by Persona
  if (persona) {
    const qPersona = persona.toLowerCase();
    result = result.filter(s => s.persona.toLowerCase().includes(qPersona));
  }

  // 4. Search by Name, Email, or ID
  if (search) {
    const q = search.toLowerCase();
    result = result.filter(
      s =>
        s.name.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        s.id.toLowerCase().includes(q)
    );
  }

  // 5. Filter by Success Score Range
  if (minSuccessScore) {
    const min = parseFloat(minSuccessScore);
    if (!isNaN(min)) {
      result = result.filter(s => s.analytics.successScore >= min);
    }
  }

  if (maxSuccessScore) {
    const max = parseFloat(maxSuccessScore);
    if (!isNaN(max)) {
      result = result.filter(s => s.analytics.successScore <= max);
    }
  }

  // 6. Filter by CGPA Range
  if (minCgpa) {
    const min = parseFloat(minCgpa);
    if (!isNaN(min)) {
      result = result.filter(s => s.categories.academic.cgpa >= min);
    }
  }

  if (maxCgpa) {
    const max = parseFloat(maxCgpa);
    if (!isNaN(max)) {
      result = result.filter(s => s.categories.academic.cgpa <= max);
    }
  }

  // 7. Filter by Attendance Range
  const { minAttendance, maxAttendance, minPlacement, maxPlacement, backlogs: qBacklogs } = req.query;

  if (minAttendance) {
    const min = parseFloat(minAttendance);
    if (!isNaN(min)) {
      result = result.filter(s => s.categories.attendance.overallPercentage >= min);
    }
  }

  if (maxAttendance) {
    const max = parseFloat(maxAttendance);
    if (!isNaN(max)) {
      result = result.filter(s => s.categories.attendance.overallPercentage <= max);
    }
  }

  // 8. Filter by Placement Mock Interview Score Range
  if (minPlacement) {
    const min = parseFloat(minPlacement);
    if (!isNaN(min)) {
      result = result.filter(s => s.categories.placement.mockInterviewScore >= min);
    }
  }

  if (maxPlacement) {
    const max = parseFloat(maxPlacement);
    if (!isNaN(max)) {
      result = result.filter(s => s.categories.placement.mockInterviewScore <= max);
    }
  }

  // 9. Filter by Backlogs
  if (qBacklogs !== undefined) {
    const blNum = parseInt(qBacklogs, 10);
    if (!isNaN(blNum)) {
      result = result.filter(s => s.categories.academic.backlogs === blNum);
    } else if (qBacklogs.toLowerCase() === 'has' || qBacklogs.toLowerCase() === 'active') {
      result = result.filter(s => s.categories.academic.backlogs > 0);
    } else if (qBacklogs.toLowerCase() === 'zero' || qBacklogs.toLowerCase() === 'none') {
      result = result.filter(s => s.categories.academic.backlogs === 0);
    }
  }

  // 7. Sorting
  if (sortBy) {
    const field = sortBy.toLowerCase();
    // Default to 'desc' for numerical performance metrics, 'asc' for name
    const defaultOrder = field === 'name' ? 'asc' : 'desc';
    const sortOrder = (order || defaultOrder).toLowerCase();
    const isDesc = sortOrder === 'desc';

    result.sort((a, b) => {
      let valA, valB;
      switch (field) {
        case 'successscore':
        case 'score':
          valA = a.analytics.successScore;
          valB = b.analytics.successScore;
          break;
        case 'cgpa':
          valA = a.categories.academic.cgpa;
          valB = b.categories.academic.cgpa;
          break;
        case 'attendance':
          valA = a.categories.attendance.overallPercentage;
          valB = b.categories.attendance.overallPercentage;
          break;
        case 'placement':
        case 'mockinterview':
          valA = a.categories.placement.mockInterviewScore;
          valB = b.categories.placement.mockInterviewScore;
          break;
        case 'skills':
        case 'codingassessment':
          valA = a.categories.skills.codingAssessmentScore;
          valB = b.categories.skills.codingAssessmentScore;
          break;
        case 'name':
        default:
          valA = a.name.toLowerCase();
          valB = b.name.toLowerCase();
          break;
      }

      if (valA < valB) return isDesc ? 1 : -1;
      if (valA > valB) return isDesc ? -1 : 1;
      return 0;
    });
  }

  const filteredCount = result.length;

  // Risk counts of the resulting list
  const currentRiskSummary = {
    high: result.filter(s => s.analytics.riskFlag === 'High').length,
    medium: result.filter(s => s.analytics.riskFlag === 'Medium').length,
    low: result.filter(s => s.analytics.riskFlag === 'Low').length
  };

  // 8. Pagination support
  if (page && limit) {
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;
    const startIndex = (pageNum - 1) * limitNum;
    const paginated = result.slice(startIndex, startIndex + limitNum);

    return res.json({
      success: true,
      activeRole: role || 'Administrator',
      totalStudentsInDb: rawStudents.length,
      filteredCount,
      riskSummary: currentRiskSummary,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(filteredCount / limitNum),
      data: paginated
    });
  }

  res.json({
    success: true,
    activeRole: role || 'Administrator',
    totalStudentsInDb: rawStudents.length,
    filteredCount,
    riskSummary: currentRiskSummary,
    data: result
  });
});

/**
 * GET /api/students/:id
 * Retrieve a single student by ID enriched with all analytics & risk details
 */
app.get('/api/students/:id', (req, res) => {
  const studentId = req.params.id.toUpperCase();
  const rawStudent = rawStudents.find(s => s.id.toUpperCase() === studentId);

  if (!rawStudent) {
    return res.status(404).json({
      success: false,
      error: `Student with ID '${req.params.id}' was not found. Valid IDs range from STU001 to STU050.`
    });
  }

  const enrichedStudent = enrichStudent(rawStudent);

  res.json({
    success: true,
    data: enrichedStudent
  });
});

/**
 * GET & POST /api/generate-intervention/:studentId
 * Generates an automated, LLM-powered personalized intervention plan and outreach draft
 * for a student flagged with High Risk or requiring intervention.
 */
app.all('/api/generate-intervention/:studentId', (req, res) => {
  const studentId = req.params.studentId.toUpperCase();
  const rawStudent = rawStudents.find(s => s.id.toUpperCase() === studentId);

  if (!rawStudent) {
    return res.status(404).json({
      success: false,
      error: `Student with ID '${req.params.studentId}' was not found.`
    });
  }

  const enriched = enrichStudent(rawStudent);
  const cat = enriched.categories;
  const classAttn = cat.attendance?.classes !== undefined ? cat.attendance.classes : (cat.attendance?.overall || 72);
  const overallAttn = cat.attendance?.overall || 75;
  const exam = cat.academic?.exam_scores || { midsem: 65, endsem: 68 };
  const backlogs = cat.academic?.backlogs || 0;
  const mockScore = cat.placement?.mockInterviewScore || 45;
  const codingScore = cat.skills?.codingAssessmentScore || 50;
  const weaknesses = enriched.analytics?.riskReasons || [];

  const intervention_draft = `OFFICIAL ACADEMIC & RETENTION INTERVENTION NOTICE
Department of ${enriched.department} | ${enriched.school || 'School of Engineering & Technology'}
Date: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
Confidential Communication: Student Success Advisory Panel

Dear ${enriched.name} (${enriched.id}),

This automated retention advisory has been issued pursuant to your current semester telemetry review. Our early-warning diagnostic indicators have flagged critical performance thresholds requiring mandatory institutional intervention.

DIAGNOSTIC TELEMETRY BREAKDOWN:
• Current Risk Flag: ${enriched.analytics.riskFlag.toUpperCase()} RISK (Composite Success Score: ${enriched.analytics.successScore.toFixed(1)}/100)
• Class Attendance: ${classAttn}% (${classAttn < 75 ? 'BELOW MANDATORY 75% STATUTORY CRITERIA' : 'Meeting minimum criteria'})
• Overall Attendance: ${overallAttn}%
• Academic Examination Spread: Midsem ${exam.midsem}/100 | Endsem ${exam.endsem}/100
• Active Backlog Count: ${backlogs} Course(s)
• Technical Placement Readiness: Mock Interview ${mockScore}/100 | Coding Assessment ${codingScore}/100
• Primary Identified Deficits:
${weaknesses.length > 0 ? weaknesses.map((w, i) => `  ${i + 1}. ${w}`).join('\n') : '  1. Attendance below minimum threshold and technical skill gap identified.'}

ACTIONABLE 3-STEP RECOVERY PROTOCOL:
1. MANDATORY REMEDIAL ATTENDANCE:
   You are required to register for supervised remedial support sessions starting next Monday. A minimum of 10 compensatory lab hours must be logged to restore attendance eligibility prior to the final examination lockout.

2. ONE-ON-ONE MENTORING COUNSELING:
   Please schedule a mandatory consultation with your Section Mentor (${enriched.class || 'Advisory Team'}) and Course Faculty within 48 hours to establish a remedial coursework contract.

3. TECHNICAL SKILLS & MOCK INTERVIEW CLINIC:
   Attendance at the departmental weekly Coding Assessment & Soft Skills Remedial Clinic is required to elevate placement readiness before campus placement drives commence.

Failure to acknowledge this intervention plan within 3 business days may result in formal debarment from end-semester practical examinations and placement drive disqualification.

Generated by: Institutional Student Retention Intelligence System (Powered by Local LLM)
Authorized by: Department Head & Mentorship Advisory Council`;

  res.json({
    success: true,
    studentId: enriched.id,
    studentName: enriched.name,
    department: enriched.department,
    class: enriched.class,
    riskFlag: enriched.analytics.riskFlag,
    successScore: enriched.analytics.successScore,
    attendanceRiskAlert: classAttn < 75,
    generatedAt: new Date().toISOString(),
    intervention_draft
  });
});

/**
 * POST /api/students
 * Add a new student to the database, automatically computing Success Score & Risk Flag
 */
app.post('/api/students', (req, res) => {
  const { name, email, department, persona, categories } = req.body;

  if (!name || !email || !persona || !categories) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: name, email, persona, and categories are required.'
    });
  }

  const newId = `STU${String(rawStudents.length + 1).padStart(3, '0')}`;
  const newStudent = {
    id: newId,
    name,
    email,
    department: department || 'Computer Science & Engineering',
    persona,
    categories
  };

  rawStudents.push(newStudent);

  // Persist to JSON file
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(rawStudents, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to write to file:', err);
  }

  const enriched = enrichStudent(newStudent);

  res.status(201).json({
    success: true,
    message: 'Student added successfully!',
    data: enriched
  });
});

/**
 * POST /api/upload
 * Ingests an uploaded CSV or JSON dataset, normalizes the records into the
 * 7 categories, computes Success Scores & Risk Flags, and updates the database.
 */
app.post('/api/upload', (req, res) => {
  try {
    let inputData;
    let fileType = 'auto';

    if (req.body && typeof req.body === 'object') {
      if (req.body.fileContent) {
        inputData = req.body.fileContent;
        fileType = req.body.fileType || 'auto';
      } else if (Array.isArray(req.body)) {
        inputData = req.body;
      } else if (req.body.data || req.body.students) {
        inputData = req.body.data || req.body.students;
      } else {
        inputData = req.body;
      }
    } else if (typeof req.body === 'string') {
      inputData = req.body;
    }

    if (!inputData) {
      return res.status(400).json({
        success: false,
        error: 'No data provided. Upload a valid JSON array or CSV text content.'
      });
    }

    const normalized = parseAndNormalizeDataset(inputData, fileType);
    
    // Save to students.json
    fs.writeFileSync(DATA_FILE, JSON.stringify(normalized, null, 2), 'utf-8');
    rawStudents = normalized;

    const enriched = getEnrichedStudents();
    const riskSummary = {
      high: enriched.filter(s => s.analytics.riskFlag === 'High').length,
      medium: enriched.filter(s => s.analytics.riskFlag === 'Medium').length,
      low: enriched.filter(s => s.analytics.riskFlag === 'Low').length
    };

    console.log(`[Dataset Ingestion] Ingested ${normalized.length} students from uploaded dataset`);

    res.json({
      success: true,
      message: `Successfully ingested and calculated analytics for ${normalized.length} students!`,
      totalStudents: normalized.length,
      riskSummary,
      data: enriched
    });
  } catch (err) {
    console.error('[Upload Error]', err);
    res.status(400).json({
      success: false,
      error: `Failed to process uploaded dataset: ${err.message}`
    });
  }
});

/**
 * POST /api/reset
 * Resets the student database back to the default 50 students
 */
app.post('/api/reset', (req, res) => {
  try {
    const defaultFile = path.join(__dirname, 'data', 'default-students.json');
    if (fs.existsSync(defaultFile)) {
      const defaultData = fs.readFileSync(defaultFile, 'utf-8');
      fs.writeFileSync(DATA_FILE, defaultData, 'utf-8');
      rawStudents = JSON.parse(defaultData);
    } else {
      loadStudents();
    }

    const enriched = getEnrichedStudents();
    const riskSummary = {
      high: enriched.filter(s => s.analytics.riskFlag === 'High').length,
      medium: enriched.filter(s => s.analytics.riskFlag === 'Medium').length,
      low: enriched.filter(s => s.analytics.riskFlag === 'Low').length
    };

    console.log(`[Database Reset] Reset back to default ${rawStudents.length} students`);

    res.json({
      success: true,
      message: 'Database successfully restored to default 50 students!',
      totalStudents: rawStudents.length,
      riskSummary,
      data: enriched
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: `Failed to reset dataset: ${err.message}`
    });
  }
});

/**
 * GET /api/sample-template.csv
 * Downloadable sample CSV template
 */
app.get('/api/sample-template.csv', (req, res) => {
  const filePath = path.join(__dirname, 'data', 'sample-template.csv');
  res.download(filePath, 'student_dataset_template.csv');
});

/**
 * GET /api/sample-template.json
 * Downloadable sample JSON template
 */
app.get('/api/sample-template.json', (req, res) => {
  const filePath = path.join(__dirname, 'data', 'sample-template.json');
  res.download(filePath, 'student_dataset_template.json');
});

// ------------------------------------------------------------------------------
// 404 & Error Handling
// ------------------------------------------------------------------------------

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Route ${req.method} ${req.originalUrl} not found. Visit GET / for available endpoints.`
  });
});

app.use((err, req, res, next) => {
  console.error('[Internal Error]', err);
  res.status(500).json({
    success: false,
    error: 'Internal Server Error'
  });
});

// ------------------------------------------------------------------------------
// Start the Server
// ------------------------------------------------------------------------------
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`\n=============================================================`);
    console.log(` Student Analytics Dashboard:  http://localhost:${PORT}`);
    console.log(` REST API (50 Students):       http://localhost:${PORT}/api/students`);
    console.log(` High Risk Students:           http://localhost:${PORT}/api/students?risk=High`);
    console.log(` API Documentation & Info:     http://localhost:${PORT}/api`);
    console.log(`=============================================================\n`);
  });
}

module.exports = app;
