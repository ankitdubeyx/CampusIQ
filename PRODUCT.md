# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Primary Audience:** Institutional academic leaders and faculty mentors:
  - **Dean / Provost:** Institutional governance, accreditation benchmarks, all-school cohort analytics across all departments, and dataset upload control.
  - **Department Head (HOD):** Department-specific cohort tracking, branch-level skill gaps, and faculty mentor assignments.
  - **Batch Head:** Semester-level progression, batch attendance trends, and placement readiness monitoring.
  - **Class Mentor:** Day-to-day student monitoring, identifying attendance deficits (<75%), and dispatching recovery interventions.
- **Secondary Audience:**
  - **Undergraduate Students:** Accessing their confidential, single-record personal portal for 7-vector spider radar competency analysis and semester growth benchmarks with zero peer data leakage.

## Product Purpose

CampusIQ (OmniGrad Intelligence) transforms fragmented campus metrics into predictive retention intelligence. It detects at-risk students well before academic probation or dropout by synthesizing 7 distinct student performance vectors, automating recovery intervention notices, and providing actionable institutional dashboards.

## Positioning

Unlike conventional Learning Management Systems (LMS) or static grade sheets that only record historical marks after examinations, CampusIQ is a predictive retention engine. Its defining mechanism is the **7-Vector Weighted Student Success Score** (30% Academic, 20% Placement, 15% Attendance, 15% Skills, 10% LMS, 5% Extracurriculars, 5% Faculty Feedback) coupled with an automated **AI Intervention Notice Generator** and strict 5-tier Role-Based Access Control (RBAC).

## Operating Context

- Deployed in higher education institutions, engineering colleges, and universities.
- Used during weekly faculty reviews, semester midterms, accreditation audits (NBA/NAAC), and student counseling sessions.
- Primary operational surface is a responsive web dashboard accessed via desktop and mobile browsers, with a native Android APK companion for on-the-go institutional monitoring.

## Capabilities and Constraints

- **Capabilities:**
  - Dynamic 5-tier RBAC authentication and role gateway (`/login` and `/dashboard`).
  - Real-time filtering by department, batch, class, and predicted risk level (`High`, `Medium`, `Low`).
  - Interactive 7-vector competency radar chart and benchmark comparisons via Chart.js.
  - Automatic attendance alert generation whenever class attendance drops below 75%.
  - Local AI-driven remediation notice generation with student-tailored recovery milestones.
  - Offline-first resilience: Standalone embedded data bundle allows the entire dashboard to function offline.
- **Constraints & Stack:**
  - Lightweight Node.js + Express backend with a zero-external-dependency JSON database.
  - Client-side Tailwind CSS and vanilla JavaScript single-page application.
  - Native Android packaging via Android SDK build-tools (`com.campusiq.app`).

## Brand Commitments

- **Name:** CampusIQ (OmniGrad Intelligence Ecosystem).
- **Emblem & Logo:** Stylized Greek letter `Ω` (Omega) with royal blue background (`#004AC6`) and container accent (`#2563EB`).
- **Student Developer Attribution:** Ankit Kumar Dubey (Registration Number: `251302058`).
- **Tone:** Professional, authoritative, supportive, and academically rigorous.

## Evidence on Hand

- Synthesized dataset of 50 student records across 3 distinct personas (High Risk, Moderate Risk, Exemplary Achievers) in `data/students.json`.
- Full-stack codebase with complete API endpoints in `server.js` and responsive frontend in `public/index.html` and `public/login.html`.
- Formal project documentation in `README.md`, `STUDENT_SUCCESS_SCORE_NOTE.md`, and [`CampusIQ_Project_Report.docx`](file:///Users/ankitdubeyx/Downloads/CampusIQ_Project_Report.docx).
- Presentation deck in [`CampusIQ_Presentation.pptx`](file:///Users/ankitdubeyx/Downloads/CampusIQ_Presentation.pptx).
- Signed native Android APK in [`CampusIQ.apk`](file:///Users/ankitdubeyx/Downloads/CampusIQ.apk).

## Product Principles

1. **Intervene Before Failure:** Prioritize leading indicators (attendance trends, LMS quiz drops, skill gaps) over lagging indicators (end-of-semester exam marks).
2. **Holistic Beyond CGPA:** Evaluate multi-dimensional student competency; technical certifications and engagement are as vital to career retention as raw GPA.
3. **Strict Data Confidentiality:** Enforce role-based scoping rigorously—faculty see authorized cohort slices, and students have complete personal data privacy with zero peer leakage.
4. **Actionable Remediation:** Never present a risk alert in isolation without an immediate, concrete recovery draft and action plan.

## Accessibility & Inclusion

- Semantic HTML structure with keyboard navigation for modal dialogs and dropdowns.
- High contrast color palette conforming to WCAG AA guidelines for readability.
- Multi-viewport responsive layouts supporting small mobile screens up to wide institutional displays.
