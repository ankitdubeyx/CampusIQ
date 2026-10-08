const fs = require('fs');
const path = require('path');

const firstNames = [
  'Aarav', 'Ananya', 'Rohan', 'Priya', 'Aditya', 'Sneha', 'Vikram', 'Isha',
  'Kunal', 'Neha', 'Kabir', 'Riya', 'Arjun', 'Meera', 'Dev', 'Pooja',
  'Siddharth', 'Kavya', 'Rahul', 'Tanvi', 'Ayush', 'Diya', 'Manish', 'Shreya',
  'Nikhil', 'Simran', 'Varun', 'Anushka', 'Harsh', 'Tara', 'Rishi', 'Kritika',
  'Abhishek', 'Swati', 'Gaurav', 'Aditi', 'Pranav', 'Nandini', 'Karan', 'Sanjana',
  'Yash', 'Bhavna', 'Akash', 'Shruti', 'Deepak', 'Payal', 'Tushar', 'Vidya',
  'Suresh', 'Mallika'
];

const lastNames = [
  'Sharma', 'Verma', 'Patel', 'Iyer', 'Gupta', 'Singh', 'Reddy', 'Mehta',
  'Nair', 'Joshi', 'Chopra', 'Rao', 'Bose', 'Kulkarni', 'Deshmukh', 'Saxena',
  'Mishra', 'Bhat', 'Malhotra', 'Chatterjee', 'Agarwal', 'Pillai', 'Menon', 'Bansal',
  'Ghosh', 'Pandey', 'Chauhan', 'Shetty', 'Venkatesh', 'Jain'
];

const departmentConfigs = [
  {
    name: 'Computer Science & Engineering',
    code: 'CSE',
    classes: ['CSE-A', 'CSE-B']
  },
  {
    name: 'Information Technology',
    code: 'IT',
    classes: ['IT-A', 'IT-B']
  },
  {
    name: 'Electronics & Communication Engineering',
    code: 'ECE',
    classes: ['ECE-A', 'ECE-B']
  },
  {
    name: 'Data Science & AI',
    code: 'DSAI',
    classes: ['DSAI-A', 'DSAI-B']
  }
];

const batches = ['2021-2025', '2022-2026'];
const schoolName = 'School of Engineering & Computing';

function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomFloat(min, max, decimals = 1) {
  const str = (Math.random() * (max - min) + min).toFixed(decimals);
  return parseFloat(str);
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const students = [];

for (let i = 1; i <= 50; i++) {
  const id = `STU${String(i).padStart(3, '0')}`;
  const firstName = firstNames[i - 1];
  const lastName = lastNames[(i * 3 + 7) % lastNames.length];
  const fullName = `${firstName} ${lastName}`;
  const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@university.edu`;

  // Hierarchical tags
  const deptConfig = departmentConfigs[i % departmentConfigs.length];
  const department = deptConfig.name;
  const school = schoolName;
  const batch = i % 5 === 0 ? batches[1] : batches[0]; // 80% senior batch 2021-2025, 20% 2022-2026
  const studentClass = deptConfig.classes[i % deptConfig.classes.length];

  let persona;
  let academic, attendance, lms, engagement, placement, skills, feedback;

  if (i <= 17) {
    // --------------------------------------------------------------------------
    // Persona 1: High Academic / Low Placement
    // --------------------------------------------------------------------------
    persona = 'High Academic / Low Placement';

    academic = {
      cgpa: randomFloat(8.8, 9.8, 2),
      backlogs: 0,
      semester: 7,
      exam_scores: {
        midsem: randomInt(88, 98),
        endsem: randomInt(90, 99)
      }
    };

    // Granular Attendance (Excellent, classes >= 88%)
    const classAttn = randomFloat(88, 96, 1);
    const eventsAttn = randomFloat(84, 94, 1);
    const remedialAttn = randomFloat(90, 98, 1);
    const extraAttn = randomFloat(80, 90, 1);
    const overallAttn = parseFloat(((classAttn * 0.6) + (eventsAttn * 0.15) + (remedialAttn * 0.15) + (extraAttn * 0.10)).toFixed(1));

    attendance = {
      overall: overallAttn,
      classes: classAttn,
      events: eventsAttn,
      remedial: remedialAttn,
      extracurricular: extraAttn,
      overallPercentage: overallAttn, // backward compatibility
      status: 'Excellent Attendance'
    };

    lms = {
      loginFrequency: randomChoice(['Daily (5-7 days/week)', 'Daily (6-7 days/week)']),
      weeklyHours: randomFloat(14.0, 22.0, 1),
      assignmentsSubmittedOnTimePercentage: randomInt(96, 100)
    };

    engagement = {
      hackathonsParticipated: randomInt(0, 1),
      hackathonWins: 0,
      clubsOrActivities: randomChoice([
        ['Academic Peer Tutor', 'Literary Society'],
        ['Math Olympiad Club'],
        ['Class Representative', 'Debate Society']
      ])
    };

    placement = {
      mockInterviewScore: randomInt(30, 58), // out of 100 (triggers placement risk for several)
      technicalRoundScore: randomInt(45, 68),
      hrRoundScore: randomInt(28, 55),
      readinessStatus: 'Needs Intensive Soft-Skill & Practical Training'
    };

    skills = {
      codingAssessmentScore: randomInt(50, 66),
      primaryLanguages: randomChoice([
        ['C++', 'Java'],
        ['Python', 'C'],
        ['Java', 'SQL']
      ]),
      leetcodeProblemsSolved: randomInt(30, 80),
      certificationsCount: 2,
      certifications: [
        {
          course_name: 'Advanced Data Structures & Algorithms (Coursera/UCSD)',
          completion_status: 'Completed',
          score: randomInt(88, 96)
        },
        {
          course_name: 'Database Systems & SQL Specialist (Oracle)',
          completion_status: 'Completed',
          score: randomInt(85, 94)
        }
      ]
    };

    feedback = {
      facultyFeedback: 'Exceptional in exams, theory, and homework submissions. Highly disciplined in lectures.',
      mentorFeedback: 'Freezes under timed live coding tests; struggles with communication and behavioral questions in mock HR rounds.',
      strengths: ['Strong theoretical concepts', 'Discipline & punctuality', 'Consistent academic score'],
      areasForImprovement: ['Live problem articulation', 'Confidence in HR interviews', 'Practical project exposure']
    };

  } else if (i <= 34) {
    // --------------------------------------------------------------------------
    // Persona 2: Low Attendance / High Skills
    // --------------------------------------------------------------------------
    persona = 'Low Attendance / High Skills';

    const isCritical = (i === 33 || i === 34);

    academic = {
      cgpa: isCritical ? randomFloat(5.2, 5.9, 2) : randomFloat(6.2, 7.4, 2),
      backlogs: isCritical ? randomChoice([2, 3]) : randomChoice([0, 1, 2]),
      semester: 7,
      exam_scores: {
        midsem: isCritical ? randomInt(52, 64) : randomInt(68, 79),
        endsem: isCritical ? randomInt(55, 66) : randomInt(70, 82)
      }
    };

    // Granular Attendance: classes < 75% -> TRIGGERS Attendance Risk Alert!
    const classAttn = isCritical ? randomFloat(42, 54, 1) : randomFloat(55, 71, 1);
    const eventsAttn = randomFloat(80, 94, 1); // high participation in hackathons/events
    const remedialAttn = randomFloat(45, 65, 1);
    const extraAttn = randomFloat(85, 96, 1);
    const overallAttn = parseFloat(((classAttn * 0.6) + (eventsAttn * 0.15) + (remedialAttn * 0.15) + (extraAttn * 0.10)).toFixed(1));

    attendance = {
      overall: overallAttn,
      classes: classAttn,
      events: eventsAttn,
      remedial: remedialAttn,
      extracurricular: extraAttn,
      overallPercentage: overallAttn, // backward compatibility
      status: isCritical ? 'Critical Attendance Shortage (<50%)' : 'Attendance Warning (<75%)'
    };

    lms = {
      loginFrequency: randomChoice(['1-2 times a week', 'Rarely (mostly before deadlines)', 'Irregular']),
      weeklyHours: isCritical ? randomFloat(1.0, 2.5, 1) : randomFloat(2.5, 6.0, 1),
      assignmentsSubmittedOnTimePercentage: isCritical ? randomInt(35, 48) : randomInt(65, 82)
    };

    engagement = {
      hackathonsParticipated: randomInt(3, 7),
      hackathonWins: randomInt(1, 3),
      clubsOrActivities: randomChoice([
        ['Open Source Club Lead', 'Competitive Programming Cell'],
        ['Hackathon Core Team', 'Robotics Society'],
        ['DevOps Community', 'AI Research Group']
      ])
    };

    placement = {
      mockInterviewScore: isCritical ? randomInt(72, 85) : randomInt(84, 96),
      technicalRoundScore: randomInt(88, 98),
      hrRoundScore: randomInt(75, 90),
      readinessStatus: 'Industry Ready (High Product Potential)'
    };

    skills = {
      codingAssessmentScore: randomInt(86, 99),
      primaryLanguages: randomChoice([
        ['TypeScript', 'Rust', 'Python', 'Go'],
        ['Python', 'JavaScript', 'C++'],
        ['Kotlin', 'Go', 'Docker', 'React']
      ]),
      leetcodeProblemsSolved: randomInt(280, 520),
      certificationsCount: 3,
      certifications: [
        {
          course_name: 'AWS Certified Solutions Architect - Associate',
          completion_status: 'Completed',
          score: randomInt(90, 98)
        },
        {
          course_name: 'Certified Kubernetes Administrator (CKA)',
          completion_status: 'Completed',
          score: randomInt(88, 95)
        },
        {
          course_name: 'Meta Full-Stack Developer Professional Certificate',
          completion_status: 'Completed',
          score: randomInt(92, 99)
        }
      ]
    };

    feedback = {
      facultyFeedback: 'Frequently absents from early morning classes and lab lectures. Needs to meet statutory 75% class attendance threshold.',
      mentorFeedback: 'Top-tier problem solver with rich production-grade projects on GitHub. Crushes live technical rounds with optimal time complexities.',
      strengths: ['System design knowledge', 'Advanced data structures & algorithms', 'Hackathon winner & builder'],
      areasForImprovement: ['Classroom attendance compliance (<75%)', 'Timely submission of academic assignments', 'Semester exam preparation']
    };

  } else {
    // --------------------------------------------------------------------------
    // Persona 3: Average All-Rounders
    // --------------------------------------------------------------------------
    persona = 'Average All-Rounders';

    academic = {
      cgpa: randomFloat(7.5, 8.4, 2),
      backlogs: randomChoice([0, 0, 0, 1]),
      semester: 7,
      exam_scores: {
        midsem: randomInt(75, 85),
        endsem: randomInt(78, 88)
      }
    };

    // Granular Attendance: classes 76 - 86%
    const classAttn = randomFloat(76, 86, 1);
    const eventsAttn = randomFloat(75, 85, 1);
    const remedialAttn = randomFloat(78, 88, 1);
    const extraAttn = randomFloat(76, 86, 1);
    const overallAttn = parseFloat(((classAttn * 0.6) + (eventsAttn * 0.15) + (remedialAttn * 0.15) + (extraAttn * 0.10)).toFixed(1));

    attendance = {
      overall: overallAttn,
      classes: classAttn,
      events: eventsAttn,
      remedial: remedialAttn,
      extracurricular: extraAttn,
      overallPercentage: overallAttn, // backward compatibility
      status: 'Good Standing'
    };

    lms = {
      loginFrequency: randomChoice(['3-4 times a week', 'Regular (4-5 days/week)']),
      weeklyHours: randomFloat(8.0, 13.0, 1),
      assignmentsSubmittedOnTimePercentage: randomInt(85, 94)
    };

    engagement = {
      hackathonsParticipated: randomInt(1, 2),
      hackathonWins: randomChoice([0, 0, 1]),
      clubsOrActivities: randomChoice([
        ['Cultural Committee', 'Web Development Club'],
        ['Placement Cell Student Volunteer'],
        ['Sports Club', 'Tech Fest Organizer']
      ])
    };

    placement = {
      mockInterviewScore: randomInt(68, 79),
      technicalRoundScore: randomInt(70, 80),
      hrRoundScore: randomInt(68, 82),
      readinessStatus: 'On Track (Balanced Potential)'
    };

    skills = {
      codingAssessmentScore: randomInt(68, 80),
      primaryLanguages: randomChoice([
        ['Java', 'SQL', 'JavaScript'],
        ['Python', 'HTML/CSS', 'MySQL'],
        ['C++', 'Python', 'React']
      ]),
      leetcodeProblemsSolved: randomInt(110, 220),
      certificationsCount: 2,
      certifications: [
        {
          course_name: 'Python for Applied Data Science & AI (IBM)',
          completion_status: 'Completed',
          score: randomInt(78, 88)
        },
        {
          course_name: 'Google Cloud Digital Leader Certification',
          completion_status: 'Completed',
          score: randomInt(76, 86)
        }
      ]
    };

    feedback = {
      facultyFeedback: 'Consistent student with steady academic and lab performance. Cooperative and dependable in team projects.',
      mentorFeedback: 'Solid fundamentals with well-rounded communication. Can crack product companies with slightly more advanced DSA practice.',
      strengths: ['Balanced profile', 'Team collaboration', 'Reliable work ethic'],
      areasForImprovement: ['Deep-dive into advanced system design', 'Complex graph/DP algorithms']
    };
  }

  students.push({
    id,
    name: fullName,
    email,
    school,
    department,
    batch,
    class: studentClass,
    persona,
    categories: {
      academic,
      attendance,
      lms,
      engagement,
      placement,
      skills,
      feedback
    }
  });
}

const outputPath = path.join(__dirname, 'students.json');
fs.writeFileSync(outputPath, JSON.stringify(students, null, 2), 'utf-8');

const backupPath = path.join(__dirname, 'default-students.json');
fs.writeFileSync(backupPath, JSON.stringify(students, null, 2), 'utf-8');

console.log(`Successfully generated ${students.length} students with hierarchical tags, granular attendance, and certifications.`);
