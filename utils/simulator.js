/**
 * ==============================================================================
 * Predictive "What-If" Academic Simulation Engine for CampusIQ
 * ==============================================================================
 * Calculates real-time projected Student Success Scores, retention risk flags,
 * and 7-vector diagnostic polygon coordinates based on advisor scenario inputs.
 * ==============================================================================
 */

const { calculateStudentSuccessScore, assignRiskFlag } = require('./scoring');

/**
 * Computes simulated telemetry and projected trajectory for a student
 */
function simulateStudentTrajectory(student, {
  projectedAttendance,
  projectedEndsem,
  projectedPlacement,
  projectedSkills,
  projectedBacklogs
}) {
  if (!student) throw new Error('Student record is required for simulation');

  const cat = student.categories || {};
  const baselineScore = student.analytics?.successScore || 0;
  const baselineRisk = student.analytics?.riskFlag || 'Medium';

  // 1. Current Baselines
  const currentAttn = cat.attendance?.classes !== undefined ? cat.attendance.classes : (cat.attendance?.overall || 80);
  const currentEndsem = cat.academic?.exam_scores?.endsem || 75;
  const currentMidsem = cat.academic?.exam_scores?.midsem || 75;
  const currentCgpa = cat.academic?.cgpa || 7.5;
  const currentPlacement = cat.placement?.mockInterviewScore || 65;
  const currentSkills = cat.skills?.codingAssessmentScore || 70;
  const currentBacklogs = cat.academic?.backlogs || 0;

  // 2. Resolve Simulated Values (fallback to baseline if undefined)
  const simAttn = projectedAttendance !== undefined ? Math.max(0, Math.min(100, Number(projectedAttendance))) : currentAttn;
  const simEndsem = projectedEndsem !== undefined ? Math.max(0, Math.min(100, Number(projectedEndsem))) : currentEndsem;
  const simPlacement = projectedPlacement !== undefined ? Math.max(0, Math.min(100, Number(projectedPlacement))) : currentPlacement;
  const simSkills = projectedSkills !== undefined ? Math.max(0, Math.min(100, Number(projectedSkills))) : currentSkills;
  const simBacklogs = projectedBacklogs !== undefined ? Math.max(0, Number(projectedBacklogs)) : currentBacklogs;

  // 3. Project New Academic Component Score
  // Examination spread: Midsem 40%, Endsem 60%
  const simulatedExamAvg = (currentMidsem * 0.4) + (simEndsem * 0.6);
  // Projected CGPA shift: blends current CGPA with projected exam average
  const projectedCgpa = Number(Math.max(1.0, Math.min(10.0, (currentCgpa * 0.5) + ((simulatedExamAvg / 10) * 0.5))).toFixed(2));
  
  // Base academic score = (CGPA / 10) * 100 minus backlogs * 5
  const academicBase = (projectedCgpa / 10) * 100;
  const backlogPenalty = simBacklogs * 5;
  const simAcademicScore = Math.max(0, Math.min(100, Number((academicBase - backlogPenalty).toFixed(2))));

  // 4. Construct Simulated Categories
  const simulatedCategories = {
    academic: {
      cgpa: projectedCgpa,
      backlogs: simBacklogs,
      semester: cat.academic?.semester || 4,
      exam_scores: {
        midsem: currentMidsem,
        endsem: simEndsem
      }
    },
    placement: {
      mockInterviewScore: simPlacement
    },
    attendance: {
      classes: simAttn,
      overall: simAttn,
      overallPercentage: simAttn
    },
    skills: {
      codingAssessmentScore: simSkills
    },
    lms: {
      assignmentsSubmittedOnTimePercentage: cat.lms?.assignmentsSubmittedOnTimePercentage || 85
    },
    engagement: {
      hackathonsParticipated: cat.engagement?.hackathonsParticipated || 1,
      hackathonWins: cat.engagement?.hackathonWins || 0,
      clubsOrActivities: cat.engagement?.clubsOrActivities || []
    },
    feedback: {
      strengths: cat.feedback?.strengths || ['Good technical aptitude'],
      areasForImprovement: cat.feedback?.areasForImprovement || ['Improve consistency']
    }
  };

  // 5. Re-run Official Scoring Engine
  const { successScore: simScore, normalizedScores } = calculateStudentSuccessScore(simulatedCategories);
  const { riskFlag: simRisk, riskReasons: simReasons } = assignRiskFlag(
    simScore,
    simPlacement,
    simAttn,
    simAttn
  );

  const scoreDelta = Number((simScore - baselineScore).toFixed(1));
  const isAttendanceAlert = simAttn < 75;
  const isHonorsEligible = simScore >= 80 && simBacklogs === 0 && simAttn >= 75;

  let standingStatus = 'Academic Good Standing';
  if (isHonorsEligible) {
    standingStatus = '🏆 Tier-1 NBA/NAAC Honors Ready';
  } else if (isAttendanceAlert) {
    standingStatus = '🚨 Statutory Attendance Debarment Warning';
  } else if (simScore < 50 || simRisk === 'High') {
    standingStatus = '⚠️ Critical Retention Intervention Required';
  } else if (simScore < 70) {
    standingStatus = '🟡 Moderate Advisory Watch';
  }

  // 6. Compute 7-Vector Polygon points
  const cx = 120;
  const cy = 100;
  const maxR = 75;
  const numPoints = 7;
  const scores = [
    normalizedScores.academic,
    normalizedScores.placement,
    normalizedScores.attendance,
    normalizedScores.skills,
    normalizedScores.lms,
    normalizedScores.engagement,
    normalizedScores.feedback
  ];

  const polygonPoints = [];
  for (let i = 0; i < numPoints; i++) {
    const angle = -Math.PI / 2 + (i * 2 * Math.PI / numPoints);
    const s = Math.max(10, Math.min(100, scores[i] || 50));
    const r = (s / 100) * maxR;
    const x = Math.round(cx + r * Math.cos(angle));
    const y = Math.round(cy + r * Math.sin(angle));
    polygonPoints.push(`${x},${y}`);
  }

  return {
    studentId: student.id,
    studentName: student.name,
    baseline: {
      score: baselineScore,
      risk: baselineRisk,
      attendance: currentAttn,
      cgpa: currentCgpa,
      endsem: currentEndsem,
      mock: currentPlacement,
      backlogs: currentBacklogs
    },
    simulated: {
      score: simScore,
      risk: simRisk,
      scoreDelta,
      attendance: simAttn,
      projectedCgpa,
      endsem: simEndsem,
      mock: simPlacement,
      skills: simSkills,
      backlogs: simBacklogs,
      isAttendanceAlert,
      isHonorsEligible,
      standingStatus,
      riskReasons: simReasons,
      componentScores: normalizedScores,
      polygonPointsStr: polygonPoints.join(' ')
    }
  };
}

module.exports = {
  simulateStudentTrajectory
};
