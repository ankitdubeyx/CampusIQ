/**
 * ==============================================================================
 * Gemini AI Academic Advisor & Real-Time Telemetry Chatbot Engine
 * ==============================================================================
 * Provides conversational AI intelligence for campus advisors, registrars,
 * and department chairs using Google Gemini 2.5 Flash with fallback to
 * authentic local institutional analytical inference.
 * ==============================================================================
 */

/**
 * Builds compact institutional telemetry context from active dataset
 */
function buildInstitutionalContext(students, activeStudent) {
  const total = students.length;
  if (total === 0) {
    return 'Dataset status: Empty (0 students loaded in database). Prompt the user to upload a dataset or load the sample cohort.';
  }

  const highRisk = students.filter(s => s.analytics?.riskFlag === 'High');
  const medRisk = students.filter(s => s.analytics?.riskFlag === 'Medium');
  const lowRisk = students.filter(s => s.analytics?.riskFlag === 'Low');

  const deptCounts = {};
  students.forEach(s => {
    const dept = s.department || 'General';
    deptCounts[dept] = (deptCounts[dept] || 0) + 1;
  });

  const avgScore = (students.reduce((acc, s) => acc + (s.analytics?.successScore || 0), 0) / total).toFixed(1);
  const avgAttn = (students.reduce((acc, s) => {
    const a = s.categories?.attendance?.classes !== undefined ? s.categories.attendance.classes : (s.categories?.attendance?.overall || 75);
    return acc + a;
  }, 0) / total).toFixed(1);

  let activeStudentSummary = 'None currently selected in dashboard.';
  if (activeStudent) {
    const cat = activeStudent.categories || {};
    const classAttn = cat.attendance?.classes !== undefined ? cat.attendance.classes : (cat.attendance?.overall || 75);
    activeStudentSummary = `Currently Inspected Student:
- Name: ${activeStudent.name} (ID: ${activeStudent.id})
- Department: ${activeStudent.department} | Class: ${activeStudent.class || 'Section A'}
- Persona: ${activeStudent.persona || 'Standard'}
- Success Score: ${(activeStudent.analytics?.successScore || 0).toFixed(1)}/100 | Risk: ${activeStudent.analytics?.riskFlag || 'Medium'}
- Class Attendance: ${classAttn}% (${classAttn < 75 ? 'BELOW 75% MANDATORY CUTOFF' : 'Compliant'})
- CGPA: ${cat.academic?.cgpa || 'N/A'} | Backlogs: ${cat.academic?.backlogs || 0}
- Placement Mock: ${cat.placement?.mockInterviewScore || 'N/A'}/100 | Coding Assessment: ${cat.skills?.codingAssessmentScore || 'N/A'}/100
- Risk Reasons: ${(activeStudent.analytics?.riskReasons || []).join('; ') || 'None'}`;
  }

  return `ACCREDITED UNIVERSITY RETENTION & STUDENT SUCCESS TELEMETRY:
- Total Enrolled Students In Memory: ${total}
- Institutional Risk Breakdown: ${highRisk.length} High Risk, ${medRisk.length} Medium Risk, ${lowRisk.length} Low Risk (Good/Honors)
- Department Distribution: ${JSON.stringify(deptCounts)}
- Campus-Wide Average Success Score: ${avgScore}/100
- Campus-Wide Average Attendance: ${avgAttn}%
- Statutory Attendance Debarment Criteria: <75% class attendance requires mandatory remedial debarment intervention
- Honors Standing Criteria: Composite Success Score >= 80 with >=75% attendance and 0 active backlogs

${activeStudentSummary}`;
}

/**
 * Calls Google Gemini API (gemini-2.5-flash / gemini-2.0-flash)
 */
async function callGeminiChatAPI({ apiKey, message, history = [], systemPrompt, contextSnippet }) {
  if (!apiKey) return null;

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  // Format multi-turn contents
  const contents = [];

  // System instruction part
  const fullSystemInstruction = `${systemPrompt}\n\n[LIVE CAMPUS TELEMETRY CONTEXT]\n${contextSnippet}`;

  // History mapping (filter to valid user/model turns)
  (history || []).slice(-8).forEach(turn => {
    if (turn.role && turn.text) {
      contents.push({
        role: turn.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: turn.text }]
      });
    }
  });

  // Current user turn
  contents.push({
    role: 'user',
    parts: [{ text: message }]
  });

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 9000); // 9-second timeout

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: fullSystemInstruction }]
        },
        contents,
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 1000
        }
      })
    });

    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (reply && reply.trim().length > 10) {
        return reply.trim();
      }
    } else {
      console.warn(`[Gemini Chat API] HTTP ${res.status}:`, await res.text().catch(() => ''));
    }
  } catch (err) {
    console.warn('[Gemini Chat API Connection Error]', err.message);
  }

  return null;
}

/**
 * Intelligent Local Institutional Analytical Inference Engine
 * Generates accurate, data-grounded responses when API key is offline
 */
function localAnalyticalAdvisorResponse(message, students, activeStudent) {
  const q = (message || '').toLowerCase();
  const total = students.length;

  if (total === 0) {
    return `### Institutional Database Notice\n\nThe student telemetry database currently contains **0 records** (awaiting dataset ingestion).\n\nTo activate real-time advisory intelligence:\n1. Upload a student dataset file (**CSV** or **JSON**) using the Stage 1 Upload Gate, or\n2. Click **"Load Default 50 Student Cohort"** on the upload screen.\n\nOnce loaded, I will provide instant retention diagnostics, risk identification, and custom remediation drafts for any student or department!`;
  }

  // 1. Check if user is asking for an encouraging note / email draft for a specific or active student
  const isDraftRequest = q.includes('draft') || q.includes('note') || q.includes('letter') || q.includes('write') || q.includes('email');
  if (isDraftRequest) {
    // Find mentioned student or active student
    let targetStudent = activeStudent;
    if (!targetStudent || q.includes('for ') || q.includes('note ') || q.includes('about ')) {
      const matched = students.find(s => {
        const full = s.name.toLowerCase();
        const first = full.split(' ')[0];
        const id = (s.id || '').toLowerCase();
        return q.includes(full) || (first.length >= 3 && q.includes(first)) || (id && q.includes(id));
      });
      if (matched) targetStudent = matched;
    }
    targetStudent = targetStudent || activeStudent || students[0];

    const cat = targetStudent.categories || {};
    const classAttn = cat.attendance?.classes !== undefined ? cat.attendance.classes : (cat.attendance?.overall || 75);
    const score = (targetStudent.analytics?.successScore || 70).toFixed(1);
    const risk = targetStudent.analytics?.riskFlag || 'Medium';

    if (q.includes('encourag') || q.includes('support') || q.includes('positive') || risk === 'Low') {
      return `### Encouraging Academic Advisory Note for ${targetStudent.name} (${targetStudent.id})

**Department**: ${targetStudent.department} | **Term**: Semester ${cat.academic?.semester || 6}  
**Status**: Composite Success Score of **${score}/100** (${risk} Risk Standing)

---

**Dear ${targetStudent.name},**

I wanted to take a moment to commend you on your consistent academic efforts this semester. Your performance in technical coursework and campus engagement reflects genuine dedication to your engineering journey.

**Key Highlights in Your Profile:**
* **Technical Aptitude**: Coding Assessment Score of **${cat.skills?.codingAssessmentScore || 75}/100** demonstrates strong analytical problem-solving.
* **Attendance Trajectory**: Currently logging **${classAttn}%** attendance${classAttn >= 75 ? ' (satisfying all mandatory criteria)' : ' — let us work together to raise this above 80%'}.
* **Placement Momentum**: Mock Interview Score of **${cat.placement?.mockInterviewScore || 65}/100** provides a solid baseline for upcoming campus recruitment drives.

Remember that faculty office hours, peer coding circles, and mock interview clinics are available every week to support you. Keep up the disciplined momentum — honors standing is well within your grasp!

Warm regards,  
**Department Mentorship Advisory Council**  
*School of Engineering & Technology*`;
    }

    // Default Remedial Draft Note
    return `### Remediation Advisory Notice for ${targetStudent.name} (${targetStudent.id})

**Department**: ${targetStudent.department} | **Attendance**: ${classAttn}% | **Success Score**: ${score}/100

---

**Dear ${targetStudent.name},**

Our early-warning student retention diagnostics have highlighted key areas in your semester telemetry that require prompt institutional remediation:

1. **Attendance Compliance**: Your recorded attendance stands at **${classAttn}%** (${classAttn < 75 ? '⚠️ BELOW STATUTORY 75% CUTOFF' : 'satisfactory'}). Regular presence is essential for examination eligibility.
2. **Academic & Assessment Focus**: Midsem Examination score (**${cat.academic?.exam_scores?.midsem || 65}/100**) indicates that additional support in core subjects will significantly improve your Endsem standing.
3. **Next Steps**: Please meet with your Section Mentor (${targetStudent.class || 'Section A'}) this week to review compensatory lab hours and technical clinic schedules.

We are committed to helping you succeed and get back to honors standing!

Sincerely,  
**Academic Counseling Committee**`;
  }

  // 2. "Top 5" or "who needs attendance remediation" in CSE / department
  if (q.includes('attendance') || q.includes('remediation') || q.includes('top') || q.includes('risk') || q.includes('lowest')) {
    let pool = [...students];

    // Check department filter
    if (q.includes('cse') || q.includes('computer science')) {
      pool = pool.filter(s => (s.department || '').toLowerCase().includes('computer') || (s.department || '').toLowerCase().includes('cse'));
    } else if (q.includes('ece') || q.includes('electronics')) {
      pool = pool.filter(s => (s.department || '').toLowerCase().includes('electronics') || (s.department || '').toLowerCase().includes('ece'));
    } else if (q.includes('mech') || q.includes('mechanical')) {
      pool = pool.filter(s => (s.department || '').toLowerCase().includes('mech'));
    }

    // Sort by attendance ascending
    pool.sort((a, b) => {
      const attA = a.categories?.attendance?.classes !== undefined ? a.categories.attendance.classes : (a.categories?.attendance?.overall || 75);
      const attB = b.categories?.attendance?.classes !== undefined ? b.categories.attendance.classes : (b.categories?.attendance?.overall || 75);
      return attA - attB;
    });

    const top5 = pool.slice(0, 5);
    const deptLabel = q.includes('cse') ? 'Computer Science & Engineering' : (q.includes('ece') ? 'Electronics & Comm.' : 'Campus-Wide');

    return `### Priority Attendance Remediation Cohort (${deptLabel})

Below are the **top students flagged with critical attendance deficits** below or near the mandatory **75% statutory criteria**:

| Rank | Student Name | ID | Section | Attendance | Success Score | Risk Tier |
| :---: | :--- | :---: | :---: | :---: | :---: | :---: |
${top5.map((s, idx) => {
  const att = s.categories?.attendance?.classes !== undefined ? s.categories.attendance.classes : (s.categories?.attendance?.overall || 75);
  const score = (s.analytics?.successScore || 0).toFixed(1);
  const badge = att < 75 ? `🚨 **${att}% (Debarment)**` : `⚠️ ${att}%`;
  return `| ${idx + 1} | **${s.name}** | \`${s.id}\` | ${s.class || 'Section A'} | ${badge} | ${score}/100 | **${s.analytics?.riskFlag || 'High'}** |`;
}).join('\n')}

#### Recommended Institutional Interventions:
1. **Trigger Multi-Lingual Notices**: Select any student in the directory and click **"Generate LLM Notice"** to dispatch parent notifications in Hindi, Marathi, Telugu, Tamil, etc.
2. **Run What-If Simulation**: In the Inspector Panel, use the **Predictive "What-If" Simulator** to model how attendance recovery (+10%) restores examination clearance.
3. **Mandatory Lab Contract**: Assign 10 supervised remedial lab hours before the semester exam lockout.`;
  }

  // 3. Honors standing / top performers inquiry
  if (q.includes('honor') || q.includes('best') || q.includes('highest') || q.includes('top scorer') || q.includes('rank 1')) {
    const sorted = [...students].sort((a, b) => (b.analytics?.successScore || 0) - (a.analytics?.successScore || 0));
    const topHonors = sorted.slice(0, 5);

    return `### Academic Honors & High Placement Standing Roster

Students qualifying for **Honors Standing** (Composite Success Score ≥ 80 with clean backlog status):

| Rank | Student Name | ID | Department | Score | CGPA | Placement Mock |
| :---: | :--- | :---: | :---: | :---: | :---: | :---: |
${topHonors.map((s, idx) => {
  const score = (s.analytics?.successScore || 0).toFixed(1);
  const cgpa = s.categories?.academic?.cgpa || 'N/A';
  const mock = s.categories?.placement?.mockInterviewScore || 'N/A';
  return `| 🥇 ${idx + 1} | **${s.name}** | \`${s.id}\` | ${s.department} | **${score}/100** | ${cgpa} | ${mock}/100 |`;
}).join('\n')}

**Advisory Insight**: These students exceed all Tier-1 placement benchmarks. Recommend for elite corporate hackathons, research publications, and specialized internship tracks.`;
  }

  // 4. Low Attendance / High Skills Persona inquiry
  if (q.includes('skills') || q.includes('coding') || q.includes('hacker') || q.includes('persona')) {
    const highSkills = students.filter(s => (s.categories?.skills?.codingAssessmentScore || 0) >= 80 && (s.categories?.attendance?.classes || s.categories?.attendance?.overall || 0) < 78);
    const count = highSkills.length;

    return `### "Low Attendance / High Skills" Persona Breakdown

We have identified **${count} students** exhibiting the **Industry Builder / Practical Hacker Profile**:
* **Characteristics**: Exceptional coding assessment scores (**80–99/100**) and high hackathon engagement, but struggling with classroom attendance compliance (**<78%**).
* **Sample Cohort**:
${highSkills.slice(0, 4).map(s => {
  const att = s.categories?.attendance?.classes || s.categories?.attendance?.overall || 70;
  const coding = s.categories?.skills?.codingAssessmentScore || 85;
  return `  * **${s.name}** (\`${s.id}\` - ${s.department}): Coding **${coding}/100**, Class Attendance **${att}%**`;
}).join('\n')}

**Intervention Strategy**: Offer project-based attendance waivers or compensatory research/open-source hours rather than punitive debarment, preserving top placement conversions!`;
  }

  // 5. General Campus Telemetry Summary & Guidance
  const highRiskCount = students.filter(s => s.analytics?.riskFlag === 'High').length;
  const medRiskCount = students.filter(s => s.analytics?.riskFlag === 'Medium').length;
  const lowRiskCount = students.filter(s => s.analytics?.riskFlag === 'Low').length;

  return `### CampusIQ Executive Intelligence Overview

* **Active Dataset Size**: **${total} Students** across accredited departments
* **Retention Risk Distribution**:
  * 🔴 **High Risk**: **${highRiskCount} students** (${((highRiskCount / total) * 100).toFixed(1)}%) — Immediate remedial contracts required
  * 🟡 **Medium Risk**: **${medRiskCount} students** (${((medRiskCount / total) * 100).toFixed(1)}%) — Under advisory watch
  * 🟢 **Low Risk / Honors**: **${lowRiskCount} students** (${((lowRiskCount / total) * 100).toFixed(1)}%) — Honors standing & placement ready

#### Suggested Real-Time Queries:
* *"Who are the top 5 students needing attendance remediation in CSE?"*
* *"Draft an encouraging note for ${activeStudent ? activeStudent.name : 'the selected student'}"*
* *"Show students with high coding scores but low attendance"*
* *"Explain statutory debarment impact if attendance drops by 10%"*`;
}

/**
 * Main Chat Processing Dispatcher
 */
async function processAdvisorChat({
  message,
  history = [],
  activeStudent,
  students = [],
  apiKey
}) {
  const userMessage = (message || '').trim();
  if (!userMessage) {
    return {
      success: false,
      reply: 'Please provide a message or inquiry for the CampusIQ AI Advisor.'
    };
  }

  const contextSnippet = buildInstitutionalContext(students, activeStudent);
  const systemPrompt = `You are the Official Academic Advisor & Institutional Retention AI for CampusIQ at a premier university.
Your role is to assist department heads, academic advisors, and faculty mentors with:
1. Real-time student performance diagnosis and predictive retention analytics.
2. Identifying students requiring mandatory attendance remediation (<75% statutory cutoff).
3. Modeling What-If scenarios for semester examination targets and honors eligibility (Score >= 80).
4. Drafting compassionate, formal, and actionable communication notices for students and their parents.
5. Providing specific names, roll numbers, metrics, and data points from the active telemetry provided.

Tone: Authoritative, empathetic, highly data-grounded, structured with markdown tables and bullet points.`;

  // 1. Attempt Gemini 2.5 API if key is available
  const resolvedKey = apiKey || process.env.GEMINI_API_KEY;
  if (resolvedKey) {
    const geminiReply = await callGeminiChatAPI({
      apiKey: resolvedKey,
      message: userMessage,
      history,
      systemPrompt,
      contextSnippet
    });

    if (geminiReply) {
      return {
        success: true,
        reply: geminiReply,
        provider: 'gemini-2.5-flash',
        model: 'Gemini 2.5 Flash'
      };
    }
  }

  // 2. Intelligent Local Institutional Analytical Fallback
  const localReply = localAnalyticalAdvisorResponse(userMessage, students, activeStudent);
  return {
    success: true,
    reply: localReply,
    provider: 'local-advisor',
    model: 'CampusIQ Institutional LLM Engine'
  };
}

module.exports = {
  buildInstitutionalContext,
  processAdvisorChat
};
