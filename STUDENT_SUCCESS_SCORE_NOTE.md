# Student Success Score & Retention Intelligence System
### Institutional Deliverable Note

---

## 1. Executive Summary

The **OmniGrad Student Success & Retention Intelligence System** is an end-to-end academic analytics and retention platform engineered for higher education institutions. Designed to bridge the gap between reactive grade reviews and proactive retention, OmniGrad models student outcomes across **7 weighted telemetry vectors**, supports strict **Role-Based Access Control (RBAC)** across academic hierarchies, and automates early interventions powered by local intelligence.

---

## 2. 7-Vector Student Success Score (Formula & Weights)

Every student's composite **Student Success Score (0–100)** is calculated in real time using a multi-dimensional weighted model:

$$\text{Success Score} = \sum_{i=1}^{7} (W_i \times S_i)$$

| Vector | Weight | Evaluation Criteria & Telemetry Inputs |
| :--- | :---: | :--- |
| **1. Academic Performance** | **30%** | Normalized CGPA (scaled 0–100), Midsem/Endsem marks, with active backlog deduction penalties. |
| **2. Placement & Career Readiness** | **20%** | Mock interview assessments, quantitative aptitude test percentiles, coding challenge scores. |
| **3. Granular Attendance** | **15%** | Decomposed attendance across core lectures, remedial classes, lab sessions, and campus events. Triggers **Attendance Risk Alert** if core attendance $< 75\%$. |
| **4. Technical Skills & Certifications** | **15%** | Verified course certifications (NPTEL, AWS, Coursera), verified project completions, GitHub activity. |
| **5. LMS Platform Engagement** | **10%** | LMS portal login frequency, timely assignment submissions, course video hours logged. |
| **6. Campus Engagement & Co-Curriculars** | **5%** | Hackathon participation & wins, student technical clubs, leadership activities. |
| **7. Faculty & Mentor Feedback** | **5%** | Standardized mentor evaluation and behavioral ratings (scaled 0–100). |

### Risk Matrix & Early Warning System
- **High Risk (Score < 50 or Attendance < 75%)**: Flagged for immediate administrative intervention.
- **Moderate Risk (Score 50–74)**: Monitored for performance drift; targeted support recommended.
- **Low Risk (Score $\ge$ 75)**: On track for honours, placement eligibility, and academic excellence.

---

## 3. Role-Based Access Control (RBAC) Architecture

The platform enforces strict privacy and contextual hierarchy through backend filtering (`/api/students?role=...`):

1. **Dean / Provost (`/dashboard?role=dean`)**
   - **Scope**: Entire institution (all schools, departments, and batches).
   - **Capabilities**: Institution-wide spider charts, cross-department comparisons, dataset upload/reset control, accreditation metrics.
2. **Head of Department - HOD (`/dashboard?role=hod&department=...`)**
   - **Scope**: Department-only cohort (e.g., Computer Science & Engineering).
   - **Capabilities**: Department subject performance, pass/fail spread, faculty feedback audits, department top & weak performers.
3. **Batch Head (`/dashboard?role=batch_head&batch=...`)**
   - **Scope**: Specific academic year cohort (e.g., Batch 2024–2028).
   - **Capabilities**: Progression tracking across semesters, placement drive readiness.
4. **Class Mentor (`/dashboard?role=mentor&class=...`)**
   - **Scope**: Specific class section (e.g., CSE-A).
   - **Capabilities**: Granular section attendance monitoring, remedial session tracking, direct student intervention triggers.
5. **Student Portal (`/dashboard?role=student&id=...`)**
   - **Scope**: Strict single-record isolation (`/api/students?role=student&id=STU001`).
   - **Capabilities**: Personal 7-Vector Competency Radar, granular attendance breakdown, certifications status, exam score trajectory, and AI-recommended study pathway. Zero exposure to peer data.

---

## 4. Key Features & Deliverables

- **Explainable AI Diagnostics**: Every student record provides human-readable explanations detailing primary risk factors, strengths, and targeted remediation steps.
- **Local LLM Automated Intervention Generation**:
  - Small **"Generate Intervention"** button beside all **High Risk** students in Management View.
  - Dedicated endpoint: `GET/POST /api/generate-intervention/:studentId`.
  - Centers a Tailwind CSS modal displaying tailored academic & attendance recovery notices.
  - Includes **"Copy to Clipboard"** and **"Send Email"** actions for rapid administrative workflow.
- **Subject Benchmark & Score Spread Comparison**:
  - Interactive multi-subject bar charts comparing Midsem, Endsem, and Section Averages.
  - Subject selector dropdown with dynamic class telemetry recalculation.
- **Visual Analytics**:
  - 7-Vector Radar / Spider chart with fully responsive SVG viewports and Chart.js integration.
  - Interactive KPI filter pills (filtering by High Risk, Low Attendance, At Risk CGPA).
- **Custom Dataset Ingestion**:
  - Ingestion modal supporting custom `.csv` and `.json` student uploads (`POST /api/upload`).
  - One-click restore to default institutional baseline (`POST /api/reset`).

---

## 5. Technology Stack

- **Backend**: Node.js & Express REST API (`server.js`) with JSON mock database and dynamic scoring utilities (`utils/scoring.js`, `utils/dataParser.js`).
- **Frontend**: Clean single-page application (`public/index.html`) and role selection gateway (`public/login.html`) styled with Tailwind CSS, Chart.js, and Google Material Symbols.
- **Runtime**: Self-contained local server running on `http://localhost:3000`.
