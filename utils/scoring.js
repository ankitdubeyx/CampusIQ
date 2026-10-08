/**
 * ==============================================================================
 * Student Success Score & Risk Assessment Utility
 * ==============================================================================
 * 
 * Weights:
 *  - 30% Academic (CGPA normalized to 100, deducting for backlogs)
 *  - 20% Placement (Mock interview score)
 *  - 15% Attendance (Overall attendance percentage)
 *  - 15% Skills (Coding assessment score)
 *  - 10% LMS (Assignments submitted on-time percentage & activity)
 *  -  5% Engagement (Hackathons & extracurricular club participation)
 *  -  5% Feedback (Faculty & mentor qualitative sentiment)
 * 
 * Total: 100%
 * ==============================================================================
 */

/**
 * Normalizes individual category scores to a 0 - 100 range.
 * @param {Object} categories - The 7 student categories
 * @returns {Object} Normalized component scores (0 - 100 each)
 */
function normalizeCategoryScores(categories) {
  const {
    academic,
    attendance,
    lms,
    engagement,
    placement,
    skills,
    feedback
  } = categories;

  // 1. Academic (30%): CGPA is on 10.0 scale, minus penalty for active backlogs
  // Base = (CGPA / 10) * 100. Each backlog deducts 5 points.
  const academicBase = (academic.cgpa / 10) * 100;
  const backlogPenalty = (academic.backlogs || 0) * 5;
  const academicScore = Math.max(0, Math.min(100, Number((academicBase - backlogPenalty).toFixed(2))));

  // 2. Placement (20%): Mock interview score is already 0 - 100
  const placementScore = Math.max(0, Math.min(100, Number(placement.mockInterviewScore.toFixed(2))));

  // 3. Attendance (15%): Overall attendance percentage (0 - 100)
  const overallAttendance = attendance.overall !== undefined 
    ? attendance.overall 
    : (attendance.overallPercentage !== undefined ? attendance.overallPercentage : 0);
  const attendanceScore = Math.max(0, Math.min(100, Number(overallAttendance.toFixed(2))));

  // 4. Skills (15%): Coding assessment score (0 - 100)
  const skillsScore = Math.max(0, Math.min(100, Number(skills.codingAssessmentScore.toFixed(2))));

  // 5. LMS (10%): On-time assignment completion percentage (0 - 100)
  const lmsScore = Math.max(
    0,
    Math.min(100, Number(lms.assignmentsSubmittedOnTimePercentage.toFixed(2)))
  );

  // 6. Engagement (5%): Hackathons participated/won & club activities scaled to 100
  const hackathonPoints = (engagement.hackathonsParticipated || 0) * 15;
  const winPoints = (engagement.hackathonWins || 0) * 20;
  const clubPoints = (engagement.clubsOrActivities ? engagement.clubsOrActivities.length : 0) * 10;
  const engagementScore = Math.min(100, Math.max(0, hackathonPoints + winPoints + clubPoints));

  // 7. Feedback (5%): Based on strengths vs areas of improvement
  const strengthsCount = feedback.strengths ? feedback.strengths.length : 0;
  const improvementCount = feedback.areasForImprovement ? feedback.areasForImprovement.length : 0;
  // Baseline 50 + (strengths * 15) - (areas for improvement * 10)
  const feedbackScore = Math.min(100, Math.max(0, 50 + (strengthsCount * 15) - (improvementCount * 10)));

  return {
    academic: academicScore,
    placement: placementScore,
    attendance: attendanceScore,
    skills: skillsScore,
    lms: lmsScore,
    engagement: engagementScore,
    feedback: feedbackScore
  };
}

/**
 * Calculates the overall Student Success Score (0 - 100)
 * using the defined weightages.
 * 
 * @param {Object} categories - The 7 student categories
 * @returns {Object} { successScore, normalizedScores }
 */
function calculateStudentSuccessScore(categories) {
  const scores = normalizeCategoryScores(categories);

  // Apply explicit weights:
  // 30% Academic + 20% Placement + 15% Attendance + 15% Skills + 10% LMS + 5% Engagement + 5% Feedback
  const weightedSum =
    (scores.academic * 0.30) +
    (scores.placement * 0.20) +
    (scores.attendance * 0.15) +
    (scores.skills * 0.15) +
    (scores.lms * 0.10) +
    (scores.engagement * 0.05) +
    (scores.feedback * 0.05);

  const successScore = Number(Math.max(0, Math.min(100, weightedSum)).toFixed(2));

  return {
    successScore,
    normalizedScores: scores
  };
}

/**
 * Assigns a 'Risk Flag' (High, Medium, Low) based on Success Score and Placement Score.
 * Also evaluates Attendance Risk Alert if class attendance is below 75%.
 * 
 * @param {number} successScore - Weighted Success Score (0 - 100)
 * @param {number} placementScore - Mock Interview Placement Score (0 - 100)
 * @param {number} attendancePercentage - Overall Attendance (0 - 100)
 * @param {number} classAttendancePercentage - Class Attendance (0 - 100)
 * @returns {Object} { riskFlag, riskReasons, attendanceRiskAlert }
 */
function assignRiskFlag(successScore, placementScore, attendancePercentage, classAttendancePercentage) {
  let riskFlag = 'Low';
  const riskReasons = [];

  const classAttn = classAttendancePercentage !== undefined ? classAttendancePercentage : attendancePercentage;
  const isClassAttendanceRisk = classAttn < 75;

  // Critical conditions for HIGH RISK
  if (successScore < 50 || placementScore < 40) {
    riskFlag = 'High';
    if (successScore < 50) {
      riskReasons.push(`Overall Success Score is critically low (${successScore}/100 < 50)`);
    }
    if (placementScore < 40) {
      riskReasons.push(`Placement mock interview score is critically low (${placementScore}/100 < 40)`);
    }
  } 
  // Warning conditions for MEDIUM RISK
  else if (successScore < 70 || placementScore < 60 || attendancePercentage < 75 || isClassAttendanceRisk) {
    riskFlag = 'Medium';
    if (successScore < 70) {
      riskReasons.push(`Overall Success Score is moderate (${successScore}/100 < 70)`);
    }
    if (placementScore < 60) {
      riskReasons.push(`Placement score needs improvement (${placementScore}/100 < 60)`);
    }
    if (attendancePercentage < 75) {
      riskReasons.push(`Overall attendance is below mandatory 75% threshold (${attendancePercentage}%)`);
    }
  } 
  // LOW RISK
  else {
    riskFlag = 'Low';
    riskReasons.push('Strong academic, attendance, placement, and skill metrics across all categories');
  }

  // Attendance Risk Alert: Triggered if student's class attendance is below 75%
  if (isClassAttendanceRisk) {
    riskReasons.unshift(`⚠️ Attendance Risk Alert: Class attendance is below mandatory 75% threshold (${classAttn}%)`);
  }

  return {
    riskFlag,
    riskReasons,
    attendanceRiskAlert: isClassAttendanceRisk
  };
}

/**
 * Enriches a student record with calculated Success Score, Breakdown, and Risk Flag.
 * @param {Object} student - Raw student object
 * @returns {Object} Enriched student object
 */
function enrichStudent(student) {
  const { successScore, normalizedScores } = calculateStudentSuccessScore(student.categories);
  const placementScore = normalizedScores.placement;
  
  const overallAttn = student.categories.attendance.overall !== undefined 
    ? student.categories.attendance.overall 
    : (student.categories.attendance.overallPercentage || 0);

  const classAttn = student.categories.attendance.classes !== undefined 
    ? student.categories.attendance.classes 
    : overallAttn;

  const { riskFlag, riskReasons, attendanceRiskAlert } = assignRiskFlag(
    successScore,
    placementScore,
    overallAttn,
    classAttn
  );

  return {
    ...student,
    analytics: {
      successScore,
      riskFlag,
      riskReasons,
      attendanceRiskAlert,
      attendanceAlertDetails: attendanceRiskAlert ? {
        triggered: true,
        classAttendance: classAttn,
        threshold: 75,
        message: `Attendance Risk Alert: Class attendance (${classAttn}%) is below statutory 75% requirement.`
      } : {
        triggered: false,
        classAttendance: classAttn,
        threshold: 75,
        message: 'Class attendance satisfies mandatory 75% requirement.'
      },
      weightDistribution: {
        academic: '30%',
        placement: '20%',
        attendance: '15%',
        skills: '15%',
        lms: '10%',
        engagement: '5%',
        feedback: '5%'
      },
      componentScores: normalizedScores
    }
  };
}

module.exports = {
  normalizeCategoryScores,
  calculateStudentSuccessScore,
  assignRiskFlag,
  enrichStudent
};
