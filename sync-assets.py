import json
import os
import re

ROOT = os.path.dirname(os.path.abspath(__file__))
DATA_FILE = os.path.join(ROOT, 'data', 'students.json')
PUBLIC_INDEX = os.path.join(ROOT, 'public', 'index.html')
PUBLIC_LOGIN = os.path.join(ROOT, 'public', 'login.html')
ANDROID_WWW = os.path.join(ROOT, 'android-app', 'assets', 'www')
ANDROID_INDEX = os.path.join(ANDROID_WWW, 'index.html')
ANDROID_LOGIN = os.path.join(ANDROID_WWW, 'login.html')
ANDROID_DATA = os.path.join(ANDROID_WWW, 'students.json')

# 1. Read student data
with open(DATA_FILE, 'r', encoding='utf-8') as f:
    students_data = json.load(f)

# Copy students.json to android www
with open(ANDROID_DATA, 'w', encoding='utf-8') as f:
    json.dump(students_data, f, indent=2)

high = len([s for s in students_data if s.get('predictedRiskLevel') == 'High'])
med = len([s for s in students_data if s.get('predictedRiskLevel') == 'Medium'])
low = len([s for s in students_data if s.get('predictedRiskLevel') == 'Low'])

payload = {
    'success': True,
    'activeRole': 'dean',
    'totalStudentsInDb': len(students_data),
    'filteredCount': len(students_data),
    'riskSummary': {'high': high, 'medium': med, 'low': low},
    'data': students_data
}
payload_json = json.dumps(payload)

# 2. Synchronize login.html
with open(PUBLIC_LOGIN, 'r', encoding='utf-8') as f:
    login_html = f.read()

# Make login.html seamlessly support file:// in Android WebView
login_html_android = login_html.replace(
    'href="/dashboard?role=dean"',
    'href="/dashboard?role=dean" onclick="if(window.location.protocol===\'file:\'){this.href=\'index.html?role=dean\';}"'
)
login_html_android = login_html_android.replace(
    "window.location.href = `/dashboard?role=hod&department=${encodeURIComponent(dept)}`;",
    "const base = window.location.protocol === 'file:' ? 'index.html' : '/dashboard'; window.location.href = `${base}?role=hod&department=${encodeURIComponent(dept)}`;"
)
login_html_android = login_html_android.replace(
    "window.location.href = `/dashboard?role=batch_head&batch=${encodeURIComponent(batch)}`;",
    "const base = window.location.protocol === 'file:' ? 'index.html' : '/dashboard'; window.location.href = `${base}?role=batch_head&batch=${encodeURIComponent(batch)}`;"
)
login_html_android = login_html_android.replace(
    "window.location.href = `/dashboard?role=mentor&class=${encodeURIComponent(sec)}`;",
    "const base = window.location.protocol === 'file:' ? 'index.html' : '/dashboard'; window.location.href = `${base}?role=mentor&class=${encodeURIComponent(sec)}`;"
)
login_html_android = login_html_android.replace(
    "window.location.href = `/dashboard?role=student&id=${encodeURIComponent(id)}`;",
    "const base = window.location.protocol === 'file:' ? 'index.html' : '/dashboard'; window.location.href = `${base}?role=student&id=${encodeURIComponent(id)}`;"
)

with open(ANDROID_LOGIN, 'w', encoding='utf-8') as f:
    f.write(login_html_android)

# 3. Synchronize index.html
with open(PUBLIC_INDEX, 'r', encoding='utf-8') as f:
    index_html = f.read()

offline_helper = """
    function getOfflineRoleData() {
      const payload = window.__OFFLINE_PAYLOAD__ || { data: [] };
      const urlParams = new URLSearchParams(window.location.search);
      const role = (urlParams.get('role') || 'dean').toLowerCase();
      const department = urlParams.get('department');
      const batch = urlParams.get('batch');
      const className = urlParams.get('class');
      const studentId = urlParams.get('id') || 'STU001';

      let all = payload.data || [];
      if (role === 'student') {
        const stu = all.find(s => s.id === studentId) || (all.length > 0 ? all[0] : null);
        if (!stu) {
          return {
            success: true,
            role: 'Student',
            data: {
              studentDetails: { id: studentId || 'STU000', name: 'No Student Loaded', department: 'N/A', batch: 'N/A', class: 'N/A', cgpa: 0 },
              performanceVectors: { academic: 0, placement: 0, attendance: 0, skills: 0, lms: 0, engagement: 0, feedback: 0 },
              overallSuccessScore: 0,
              predictedRiskLevel: 'N/A',
              attendanceSummary: { overallPercentage: 0, atRisk: false },
              subjectWiseAttendance: {},
              academicRecords: {},
              placementReadiness: {},
              lmsAndEngagement: {},
              skillsAndCertifications: {}
            }
          };
        }
        return {
          success: true,
          role: 'Student',
          data: {
            studentDetails: {
              id: stu.id,
              name: stu.name,
              department: stu.department,
              batch: stu.batch,
              class: stu.class,
              cgpa: stu.academics ? stu.academics.cgpa : 8.5
            },
            performanceVectors: stu.radarMetrics || {
              academic: 85, placement: 80, attendance: 90, skills: 85, lms: 80, engagement: 75, feedback: 80
            },
            overallSuccessScore: stu.overallSuccessScore || 85,
            predictedRiskLevel: stu.predictedRiskLevel || 'Low',
            attendanceSummary: {
              overallPercentage: stu.attendance ? stu.attendance.classes : 88,
              atRisk: (stu.attendance ? stu.attendance.classes : 88) < 75
            },
            subjectWiseAttendance: (stu.attendance && stu.attendance.subjectWise) || {},
            academicRecords: stu.academics || {},
            placementReadiness: stu.placement || {},
            lmsAndEngagement: stu.lmsEngagement || {},
            skillsAndCertifications: stu.skillsCertifications || {}
          }
        };
      }

      let filtered = [...all];
      if (role === 'hod' && department) {
        filtered = filtered.filter(s => s.department && s.department.toLowerCase() === department.toLowerCase());
      } else if (role === 'batch_head' && batch) {
        filtered = filtered.filter(s => s.batch === batch);
      } else if (role === 'mentor' && className) {
        filtered = filtered.filter(s => s.class === className);
      }

      const high = filtered.filter(s => s.predictedRiskLevel === 'High').length;
      const medium = filtered.filter(s => s.predictedRiskLevel === 'Medium').length;
      const low = filtered.filter(s => s.predictedRiskLevel === 'Low').length;

      return {
        success: true,
        activeRole: role,
        totalStudentsInDb: all.length,
        filteredCount: filtered.length,
        riskSummary: { high, medium, low },
        data: filtered
      };
    }
"""

offline_script = f"""
  <script id="offline-data-bundle">
    window.__OFFLINE_PAYLOAD__ = {payload_json};
  </script>
"""

index_with_offline = index_html.replace(
    'async function fetchStudents() {',
    offline_helper + '\n    async function fetchStudents() {\n      if (location.protocol === "file:" || !navigator.onLine) { const off = getOfflineRoleData(); if (off.role === "Student") { renderStudentPortal(off.data); } else { updateKpis(off); renderTable(off.data); if (off.data.length > 0) { selectStudent(off.data[0].id); } else { clearStudentInspector(); } } return; }\n'
)

index_with_offline = index_with_offline.replace('</body>', offline_script + '\n</body>')

with open(ANDROID_INDEX, 'w', encoding='utf-8') as f:
    f.write(index_with_offline)

print("Synchronized all assets successfully!")
