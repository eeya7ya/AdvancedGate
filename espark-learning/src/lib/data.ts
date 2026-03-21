import type { Subject, Course, Achievement, UserStats, EnrolledCourse } from "@/types";

export const subjects: Subject[] = [
  {
    id: "power-engineering",
    title: "Electrical Power Engineering",
    shortTitle: "Power Eng.",
    description:
      "Master electrical power systems, machine design, protection relaying, and renewable energy integration.",
    icon: "⚡",
    color: "#f5a623",
    gradient: "linear-gradient(135deg, #f5a623 0%, #ef4444 100%)",
    category: "power-engineering",
    totalStudents: 1240,
    courses: [
      {
        id: "what-is-machine",
        title: "What is an Electrical Machine?",
        description:
          "Fundamentals of transformers, motors, and generators — energy conversion principles from first principles.",
        duration: "4h 30m",
        level: "Beginner",
        lessons: 18,
        subjectId: "power-engineering",
        thumbnail: "⚡",
        tags: ["Transformers", "Motors", "Generators"],
      },
      {
        id: "power-system-relaying",
        title: "Power System Protection & Relaying",
        description:
          "Understand distance, differential, and overcurrent protection schemes used in modern power grids.",
        duration: "6h 15m",
        level: "Intermediate",
        lessons: 24,
        subjectId: "power-engineering",
        thumbnail: "🛡️",
        tags: ["Relays", "Protection", "Fault Analysis"],
      },
      {
        id: "lv-design",
        title: "Low Voltage (LV) System Design",
        description:
          "Design compliant LV distribution systems: cable sizing, switchgear selection, coordination studies.",
        duration: "5h 45m",
        level: "Intermediate",
        lessons: 21,
        subjectId: "power-engineering",
        thumbnail: "🔌",
        tags: ["LV Design", "IEC 60364", "Cable Sizing"],
      },
      {
        id: "pv-system",
        title: "PV Solar System Design",
        description:
          "Photovoltaic systems from panel fundamentals to utility-scale grid-tied installations and storage.",
        duration: "7h 00m",
        level: "Intermediate",
        lessons: 28,
        subjectId: "power-engineering",
        thumbnail: "☀️",
        tags: ["Solar", "Inverters", "Grid-Tied"],
      },
    ],
  },
  {
    id: "networking",
    title: "Networking Engineering",
    shortTitle: "Networking",
    description:
      "Build expertise in network architecture, protocols, security, and cloud infrastructure design.",
    icon: "🌐",
    color: "#4f9eff",
    gradient: "linear-gradient(135deg, #4f9eff 0%, #7c3aed 100%)",
    category: "networking",
    totalStudents: 980,
    courses: [
      {
        id: "intro-networking",
        title: "Introduction to Networking Engineering",
        description:
          "OSI model, TCP/IP stack, subnetting, routing fundamentals, and the life of a network packet.",
        duration: "5h 00m",
        level: "Beginner",
        lessons: 20,
        subjectId: "networking",
        thumbnail: "🌐",
        tags: ["OSI Model", "TCP/IP", "Subnetting"],
      },
      {
        id: "network-security",
        title: "Network Security Fundamentals",
        description:
          "Firewalls, VPNs, intrusion detection, and zero-trust architecture for enterprise environments.",
        duration: "6h 30m",
        level: "Intermediate",
        lessons: 25,
        subjectId: "networking",
        thumbnail: "🔒",
        tags: ["Firewalls", "VPN", "Zero Trust"],
      },
      {
        id: "cloud-networking",
        title: "Cloud Networking & Infrastructure",
        description:
          "Design and deploy scalable cloud networks on AWS, Azure, and GCP with IaC practices.",
        duration: "8h 00m",
        level: "Advanced",
        lessons: 32,
        subjectId: "networking",
        thumbnail: "☁️",
        tags: ["AWS", "Azure", "Terraform"],
      },
    ],
  },
  {
    id: "coding",
    title: "Software & Coding",
    shortTitle: "Coding",
    description:
      "From programming fundamentals to professional software development with industry-standard languages.",
    icon: "💻",
    color: "#a78bfa",
    gradient: "linear-gradient(135deg, #a78bfa 0%, #4f9eff 100%)",
    category: "coding",
    totalStudents: 2100,
    courses: [
      {
        id: "what-is-coding",
        title: "What is Coding?",
        description:
          "No-experience introduction: what computers do, how code works, and your first programs.",
        duration: "2h 30m",
        level: "Beginner",
        lessons: 10,
        subjectId: "coding",
        thumbnail: "💻",
        tags: ["Fundamentals", "Logic", "Algorithms"],
      },
      {
        id: "python-basics",
        title: "Python Basics",
        description:
          "Learn Python from scratch: variables, functions, OOP, file I/O, and real automation scripts.",
        duration: "8h 00m",
        level: "Beginner",
        lessons: 32,
        subjectId: "coding",
        thumbnail: "🐍",
        tags: ["Python", "OOP", "Automation"],
      },
      {
        id: "java-oracle-basics",
        title: "Java Oracle Basics",
        description:
          "Core Java programming aligned with Oracle's OCA certification: types, classes, inheritance, and exceptions.",
        duration: "10h 00m",
        level: "Intermediate",
        lessons: 40,
        subjectId: "coding",
        thumbnail: "☕",
        tags: ["Java", "OCA", "OOP"],
      },
    ],
  },
  {
    id: "coming-soon-1",
    title: "Mechanical Engineering",
    shortTitle: "Mechanical",
    description: "HVAC systems, thermodynamics, fluid mechanics, and more.",
    icon: "⚙️",
    color: "#64748b",
    gradient: "linear-gradient(135deg, #64748b 0%, #475569 100%)",
    category: "coming-soon",
    totalStudents: 0,
    courses: [],
  },
  {
    id: "coming-soon-2",
    title: "Project Management",
    shortTitle: "PM",
    description: "PMP certification preparation and agile methodologies.",
    icon: "📊",
    color: "#64748b",
    gradient: "linear-gradient(135deg, #64748b 0%, #475569 100%)",
    category: "coming-soon",
    totalStudents: 0,
    courses: [],
  },
];

export const mockUserStats: UserStats = {
  level: 7,
  xp: 2840,
  xpToNextLevel: 3500,
  totalCourses: 3,
  completedCourses: 1,
  streak: 5,
  rank: "Practitioner",
};

export const mockEnrolledCourses: EnrolledCourse[] = [
  {
    courseId: "python-basics",
    subjectId: "coding",
    progress: 65,
    enrolledAt: "2026-02-10",
    lastAccessed: "2026-03-20",
    completedLessons: 21,
  },
  {
    courseId: "intro-networking",
    subjectId: "networking",
    progress: 30,
    enrolledAt: "2026-03-01",
    lastAccessed: "2026-03-18",
    completedLessons: 6,
  },
  {
    courseId: "what-is-machine",
    subjectId: "power-engineering",
    progress: 100,
    enrolledAt: "2026-01-15",
    lastAccessed: "2026-02-28",
    completedLessons: 18,
  },
];

export const achievements: Achievement[] = [
  {
    id: "first-enroll",
    title: "First Steps",
    description: "Enrolled in your first course",
    icon: "🚀",
    unlockedAt: "2026-01-15",
    locked: false,
    xp: 50,
  },
  {
    id: "course-complete",
    title: "Course Graduate",
    description: "Completed your first course",
    icon: "🎓",
    unlockedAt: "2026-02-28",
    locked: false,
    xp: 200,
  },
  {
    id: "streak-5",
    title: "Streak Keeper",
    description: "5-day learning streak",
    icon: "🔥",
    unlockedAt: "2026-03-20",
    locked: false,
    xp: 100,
  },
  {
    id: "power-explorer",
    title: "Power Explorer",
    description: "Enroll in a Power Engineering course",
    icon: "⚡",
    locked: true,
    xp: 150,
  },
  {
    id: "polymath",
    title: "Polymath",
    description: "Enroll in 3 different subjects",
    icon: "🧠",
    locked: true,
    xp: 300,
  },
  {
    id: "speed-learner",
    title: "Speed Learner",
    description: "Complete a course in under 7 days",
    icon: "⚡",
    locked: true,
    xp: 250,
  },
];

export function getSubjectById(id: string): Subject | undefined {
  return subjects.find((s) => s.id === id);
}

export function getCourseById(
  courseId: string
): { course: Course; subject: Subject } | undefined {
  for (const subject of subjects) {
    const course = subject.courses.find((c) => c.id === courseId);
    if (course) return { course, subject };
  }
  return undefined;
}
