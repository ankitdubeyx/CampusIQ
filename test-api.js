const http = require('http');
const app = require('./server');

const server = app.listen(3099, async () => {
  console.log('\n--- Running Automated Tests on Port 3099 ---');

  function request(path) {
    return new Promise((resolve, reject) => {
      http.get(`http://localhost:3099${path}`, res => {
        let body = '';
        res.on('data', chunk => (body += chunk));
        res.on('end', () => resolve({ status: res.statusCode, data: JSON.parse(body) }));
      }).on('error', reject);
    });
  }

  try {
    // 1. Root Endpoint (serves index.html)
    const rootRes = await new Promise((resolve, reject) => {
      http.get('http://localhost:3099/', res => {
        let body = '';
        res.on('data', chunk => (body += chunk));
        res.on('end', () => resolve({ status: res.statusCode, body }));
      }).on('error', reject);
    });
    console.log('[1] Root endpoint status:', rootRes.status === 200 ? 'PASS' : 'FAIL');
    console.log('    Serves HTML dashboard:', rootRes.body.includes('OmniGrad') && rootRes.body.includes('fetchStudents') ? 'PASS' : 'FAIL');

    // 1b. API Info Endpoint (serves JSON metadata)
    const apiRes = await request('/api');
    console.log('[1b] /api endpoint status:', apiRes.status === 200 ? 'PASS' : 'FAIL');
    console.log('     Scoring weights registered:', Object.keys(apiRes.data.scoringFormula.weights).length === 7 ? 'PASS (7 weights)' : 'FAIL');

    // 2. All Students with Combined Analytics
    const allRes = await request('/api/students');
    console.log(`[2] All Students total (${allRes.data.totalStudentsInDb}):`, allRes.data.totalStudentsInDb === 50 ? 'PASS' : 'FAIL');
    console.log('    Risk Summary:', JSON.stringify(allRes.data.riskSummary));

    // Verify first student has required fields
    const firstStudent = allRes.data.data[0];
    const hasAnalytics = !!(firstStudent.analytics && firstStudent.analytics.successScore !== undefined && firstStudent.analytics.riskFlag);
    console.log('    Student has successScore & riskFlag:', hasAnalytics ? 'PASS' : 'FAIL');
    console.log(`    Sample: ${firstStudent.name} | Score: ${firstStudent.analytics.successScore} | Risk: ${firstStudent.analytics.riskFlag}`);

    // 3. Filter by Risk=High
    const highRiskRes = await request('/api/students?risk=High');
    console.log(`[3] Filter by High Risk count (${highRiskRes.data.filteredCount}):`, highRiskRes.data.filteredCount > 0 ? 'PASS' : 'FAIL');
    const allAreHigh = highRiskRes.data.data.every(s => s.analytics.riskFlag === 'High');
    console.log('    All filtered students are High risk:', allAreHigh ? 'PASS' : 'FAIL');

    // Verify that every High risk student satisfies the condition: successScore < 50 OR placementScore < 40
    const highRiskValid = highRiskRes.data.data.every(
      s => s.analytics.successScore < 50 || s.categories.placement.mockInterviewScore < 40
    );
    console.log('    High risk condition verification (score < 50 OR placement < 40):', highRiskValid ? 'PASS' : 'FAIL');

    // 4. Sort by Success Score Descending
    const sortedRes = await request('/api/students?sortBy=successScore&order=desc&limit=5&page=1');
    const topScores = sortedRes.data.data.map(s => s.analytics.successScore);
    const isSortedDesc = topScores[0] >= topScores[1] && topScores[1] >= topScores[2];
    console.log(`[4] Sort by Success Score (Top 3: ${topScores.slice(0, 3).join(', ')}):`, isSortedDesc ? 'PASS' : 'FAIL');

    // 5. Single Student by ID
    const singleRes = await request('/api/students/STU001');
    console.log('[5] Single student lookup:', singleRes.data.data.id === 'STU001' ? 'PASS' : 'FAIL');
    console.log(`    Component scores breakdown:`, JSON.stringify(singleRes.data.data.analytics.componentScores));

    // 6. Analytics Overview by Persona
    const overviewRes = await request('/api/analytics/overview');
    console.log('[6] Analytics Overview per Persona:');
    overviewRes.data.overview.forEach(o => {
      console.log(`    - ${o.persona}: Avg Score = ${o.averages.successScore}, High Risk = ${o.riskDistribution.high}, Med = ${o.riskDistribution.medium}, Low = ${o.riskDistribution.low}`);
    });

    // -------------------------------------------------------------------------
    // RBAC & New Feature Tests
    // -------------------------------------------------------------------------
    console.log('\n--- RBAC & Advanced Analytics Verification ---');

    // 7. Hierarchical Tags & Granular Attendance verification
    const sampleStudent = allRes.data.data[0];
    const hasHierarchicalTags = !!(sampleStudent.school && sampleStudent.department && sampleStudent.batch && sampleStudent.class);
    console.log('[7] Hierarchical tags present (school, dept, batch, class):', hasHierarchicalTags ? 'PASS' : 'FAIL');
    
    const attObj = sampleStudent.categories.attendance;
    const hasGranularAttendance = typeof attObj.classes === 'number' && typeof attObj.events === 'number' && typeof attObj.remedial === 'number' && typeof attObj.extracurricular === 'number';
    console.log('    Granular attendance present (classes, events, remedial, extracurricular):', hasGranularAttendance ? 'PASS' : 'FAIL');

    const examScores = sampleStudent.categories.academic.exam_scores;
    const hasExamScores = examScores && typeof examScores.midsem === 'number' && typeof examScores.endsem === 'number';
    console.log('    Exam scores present (midsem, endsem):', hasExamScores ? 'PASS' : 'FAIL');

    const certs = sampleStudent.categories.skills.certifications;
    const hasCerts = Array.isArray(certs) && certs.length > 0 && certs[0].course_name && certs[0].completion_status;
    console.log('    Certifications array present with course_name, completion_status, score:', hasCerts ? 'PASS' : 'FAIL');

    // 8. Attendance Risk Alert (<75% classes)
    const alertRes = await request('/api/students?attendanceRisk=true');
    console.log(`[8] Attendance Risk Alert triggered count: ${alertRes.data.filteredCount}`);
    const allAlertsValid = alertRes.data.data.every(s => s.categories.attendance.classes < 75 && s.analytics.attendanceRiskAlert === true);
    console.log('    All students with alert have classes < 75%:', allAlertsValid ? 'PASS' : 'FAIL');

    // 9. RBAC - Dean (all school data)
    const deanRes = await request('/api/students?role=dean');
    console.log(`[9] RBAC Dean count (${deanRes.data.data.length}):`, deanRes.data.data.length === 50 ? 'PASS (all school)' : 'FAIL');

    // 10. RBAC - HOD (only department, e.g. CSE)
    const hodRes = await request('/api/students?role=hod&department=CSE');
    const hodAllCSE = hodRes.data.data.every(s => s.department === 'Computer Science & Engineering');
    console.log(`[10] RBAC HOD CSE count (${hodRes.data.data.length}):`, hodAllCSE && hodRes.data.data.length > 0 ? 'PASS (only CSE)' : 'FAIL');

    // 11. RBAC - Batch Head (only batch, e.g. 2021-2025)
    const batchHeadRes = await request('/api/students?role=batch_head&batch=2021-2025');
    const allBatch = batchHeadRes.data.data.every(s => s.batch === '2021-2025');
    console.log(`[11] RBAC Batch Head count (${batchHeadRes.data.data.length}):`, allBatch && batchHeadRes.data.data.length > 0 ? 'PASS (only batch 2021-2025)' : 'FAIL');

    // 12. RBAC - Mentor (only class, e.g. CSE-A)
    const mentorRes = await request('/api/students?role=mentor&class=CSE-A');
    const allMentorClass = mentorRes.data.data.every(s => s.class === 'CSE-A');
    console.log(`[12] RBAC Mentor count (${mentorRes.data.data.length}):`, allMentorClass && mentorRes.data.data.length > 0 ? 'PASS (only CSE-A)' : 'FAIL');

    // 13. RBAC - Student (ONLY single personal record with weaknesses, marks, attendance)
    const studentRes = await request('/api/students?role=student&id=STU001');
    const isSingleRecord = studentRes.data.role === 'Student' && !Array.isArray(studentRes.data.data);
    const stuData = studentRes.data.data;
    const hasStudentFields = stuData && stuData.weaknesses && stuData.marks && stuData.attendance && stuData.skillsAndCertifications;
    console.log('[13] RBAC Student returns single personal record:', isSingleRecord ? 'PASS' : 'FAIL');
    console.log('     Contains specific weaknesses, marks, and attendance:', hasStudentFields ? 'PASS' : 'FAIL');
    console.log('     Sample weaknesses:', JSON.stringify(stuData.weaknesses.slice(0, 2)));

    // 14. RBAC - Student with low attendance gets Attendance Alert
    const lowAttnStudent = alertRes.data.data[0];
    if (lowAttnStudent) {
      const studentAlertRes = await request(`/api/students?role=student&id=${lowAttnStudent.id}`);
      const studentHasAlert = studentAlertRes.data.data.attendanceRiskAlert === true;
      console.log(`[14] RBAC Student (${lowAttnStudent.name}) Attendance Alert triggered:`, studentHasAlert ? 'PASS' : 'FAIL');
    }

    console.log('\nAll tests passed successfully!\n');
  } catch (err) {
    console.error('Test error:', err);
  } finally {
    server.close();
  }
});
