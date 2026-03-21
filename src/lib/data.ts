import type { Subject, Course } from "@/types";

// ─── Subjects & Courses ───────────────────────────────────────────────────────
// iconName values map to Lucide icon names resolved in UI components.
// comingSoon: true means the course is not yet available.

export const subjects: Subject[] = [
  {
    id: "power-engineering",
    title: "Electrical Power Engineering",
    shortTitle: "Power Engineering",
    description:
      "Master electrical power systems, machine design, protection relaying, and renewable energy integration.",
    iconName: "Zap",
    color: "#f5a623",
    gradient: "linear-gradient(135deg, #f5a623 0%, #ef4444 100%)",
    category: "power-engineering",
    courses: [
      {
        id: "what-is-electricity",
        title: "What is Electricity?",
        description:
          "Build a rock-solid foundation — understand what electricity is, how charge, voltage, current, and resistance work together, and how power is generated and delivered.",
        duration: "3h 00m",
        level: "Beginner",
        lessons: 12,
        subjectId: "power-engineering",
        tags: ["Fundamentals", "Voltage", "Current", "Power"],
        comingSoon: false,
      },
      {
        id: "what-is-machine",
        title: "What is an Electrical Machine?",
        description:
          "Fundamentals of transformers, motors, and generators — energy conversion principles from first principles.",
        duration: "4h 30m",
        level: "Beginner",
        lessons: 18,
        subjectId: "power-engineering",
        tags: ["Transformers", "Motors", "Generators"],
        comingSoon: true,
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
        tags: ["Relays", "Protection", "Fault Analysis"],
        comingSoon: true,
      },
      {
        id: "lv-design",
        title: "Low Voltage System Design",
        description:
          "Design compliant LV distribution systems: cable sizing, switchgear selection, coordination studies.",
        duration: "5h 45m",
        level: "Intermediate",
        lessons: 21,
        subjectId: "power-engineering",
        tags: ["LV Design", "IEC 60364", "Cable Sizing"],
        comingSoon: true,
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
        tags: ["Solar", "Inverters", "Grid-Tied"],
        comingSoon: true,
      },
    ],
  },
  {
    id: "networking",
    title: "Networking Engineering",
    shortTitle: "Networking",
    description:
      "Build expertise in network architecture, protocols, security, and cloud infrastructure design.",
    iconName: "Network",
    color: "#4f9eff",
    gradient: "linear-gradient(135deg, #4f9eff 0%, #7c3aed 100%)",
    category: "networking",
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
        tags: ["OSI Model", "TCP/IP", "Subnetting"],
        comingSoon: true,
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
        tags: ["Firewalls", "VPN", "Zero Trust"],
        comingSoon: true,
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
        tags: ["AWS", "Azure", "Terraform"],
        comingSoon: true,
      },
    ],
  },
  {
    id: "coding",
    title: "Software & Coding",
    shortTitle: "Coding",
    description:
      "From programming fundamentals to professional software development with industry-standard languages.",
    iconName: "Code2",
    color: "#a78bfa",
    gradient: "linear-gradient(135deg, #a78bfa 0%, #4f9eff 100%)",
    category: "coding",
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
        tags: ["Fundamentals", "Logic", "Algorithms"],
        comingSoon: true,
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
        tags: ["Python", "OOP", "Automation"],
        comingSoon: true,
      },
      {
        id: "java-oracle-basics",
        title: "Java Oracle Basics",
        description:
          "Core Java programming aligned with Oracle OCA certification: types, classes, inheritance, and exceptions.",
        duration: "10h 00m",
        level: "Intermediate",
        lessons: 40,
        subjectId: "coding",
        tags: ["Java", "OCA", "OOP"],
        comingSoon: true,
      },
    ],
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
