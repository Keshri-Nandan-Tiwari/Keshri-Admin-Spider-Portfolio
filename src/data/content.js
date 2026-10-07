export const PROFILE = {
  name: "Keshri Nandan Tiwari",
  role: "Software Developer",
  tags: ["Java & Spring Boot", "React / Vite", "PostgreSQL & MySQL", "Docker & Kubernetes"],
  location: "Jabalpur, Madhya Pradesh, India",
  phone: "+91-6266819409",
  blurb:
    "B.Tech Computer Science Engineering graduate and full-stack software developer with hands-on experience designing and building production-ready web applications using Java, Spring Boot, React.js, and PostgreSQL.",
  email: "keshrinandantiwari08@gmail.com",
  github: "https://github.com/Keshri-Nandan-Tiwari",
  linkedin: "https://www.linkedin.com/in/keshri-nandan-tiwari-a68042290/",
  instagram: "https://www.instagram.com/keshri_08__?igsh=MTk0NXQzbTYwbndyOA==",
  x: "https://x.com/keshrinandan_08",
  resumeFile: "/resume.pdf",
};

// "About me" loop — each fact types out as a lead phrase in normal white,
// then finishes with one bold, bigger, colored highlight word/phrase.
// tone: "black" highlight · "red" important ·
//       "orange" most important · "blue" something new
export const FACTS = [
  { lead: "I am a", highlight: "Full-Stack Developer", tone: "black" },
  { lead: "EDU360 shipped", highlight: "40% faster", tone: "red" },
  { lead: "Built with", highlight: "Java & Spring Boot", tone: "black" },
  { lead: "Achieved", highlight: "100% role-based access control", tone: "orange" },
  { lead: "Right now, exploring", highlight: "Docker & Kubernetes", tone: "blue" },
  { lead: "I believe in code that", highlight: "actually ships", tone: "red" },
  { lead: "Currently", highlight: "open to opportunities", tone: "orange" },
  { lead: "Based in", highlight: "Jabalpur, India", tone: "blue" },
];

export const SKILL_GROUPS = [
  {
    title: "Languages",
    icon: "Code2",
    items: ["Java", "JavaScript (ES6+)", "C", "SQL", "HTML5", "CSS3"],
  },
  {
    title: "Backend",
    icon: "ServerCog",
    items: ["Spring Boot", "Spring MVC", "Spring Security", "REST APIs", "Microservices", "JWT", "JUnit"],
  },
  {
    title: "Frontend",
    icon: "LayoutPanelLeft",
    items: ["React.js", "Redux", "Vite", "Tailwind CSS", "Bootstrap", "Responsive UI"],
  },
  {
    title: "Databases",
    icon: "Database",
    items: ["MySQL", "PostgreSQL", "Hibernate", "DB Design", "Query Optimization"],
  },
  {
    title: "DevOps & Cloud",
    icon: "Cloud",
    items: ["Docker", "Kubernetes", "AWS (EC2, S3)", "Heroku", "Vercel", "Netlify", "GitHub Actions"],
  },
  {
    title: "Tools & Platforms",
    icon: "Wrench",
    items: ["Git", "GitHub", "Maven", "Postman", "Swagger", "IntelliJ IDEA", "VS Code"],
  },
  {
    title: "Core Concepts",
    icon: "BrainCircuit",
    items: ["DSA", "OOP", "System Design", "Unit Testing"],
  },
  {
    title: "AI & Productivity",
    icon: "Sparkles",
    items: ["ChatGPT", "Google Gemini", "GitHub Copilot", "AI-assisted workflows"],
  },
];

export const EDUCATION = [
  {
    school: "Gyan Ganga College of Technology, Jabalpur",
    place: "Jabalpur, Madhya Pradesh",
    degree: "Bachelor of Technology in Computer Science Engineering",
    period: "Sep 2022 – Jun 2026",
    icon: "GraduationCap",
  },
  {
    school: "Govt. Excellence Higher Secondary School, Maihar",
    place: "Dist. Satna, M.P.",
    degree: "Higher Secondary (XII) — Madhya Pradesh Board (MPBSE)",
    period: "Jul 2021 – Mar 2022",
    icon: "School",
  },
  {
    school: "Gandhi Higher Secondary School, Maihar",
    place: "Dist. Satna, M.P.",
    degree: "Secondary (X) — Madhya Pradesh Board (MPBSE)",
    period: "Jul 2019 – Mar 2020",
    icon: "School",
  },
];

export const CERTIFICATIONS = [
  { title: "Java Full Stack Developer", org: "EduSkills / AICTE", icon: "Award" },
  { title: "Java Programming", org: "Cisco Networking Academy", icon: "Award" },
  { title: "C Programming", org: "Cisco Networking Academy", icon: "Award" },
];

export const PROJECTS = [
  {
    title: "EDU360",
    tag: "School management platform · Frontend Developer",
    period: "Jan 2026 – Present",
    desc: "Reusable React.js component library with role-based dashboards for 5 user roles. Integrated REST APIs across Auth, Admissions, Academics, Attendance and Exams, secured with JWT.",
    metric: "40% faster feature delivery",
    stack: ["React", "Vite", "Redux", "Tailwind CSS", "Spring Boot", "JWT"],
  },
  {
    title: "Hospital Management System",
    tag: "Personal project",
    period: "Mar 2025 – Oct 2025",
    desc: "Normalized MySQL schema with optimized indexes. End-to-end REST APIs with JWT auth across Admin, Doctor and Receptionist roles, full audit logging.",
    metric: "40% faster queries · 100% role-based access",
    stack: ["Java", "Spring Boot", "MySQL", "JavaFX", "JWT", "JUnit"],
  },
  {
    title: "Animated GitHub Profile",
    tag: "Developer branding",
    period: "2026",
    desc: "Self-hosted stats cards, a dithered portrait banner, a contribution snake, and social badges — all matching a consistent brand identity.",
    metric: "Fully automated via GitHub Actions",
    stack: ["GitHub Actions", "SVG", "Design"],
  },
];

// Identity loop — sits just below the hero photo, cycles short
// "who I am" lines with a small eyebrow label and mixed bold/regular text.
export const IDENTITY_LOOP = [
  {
    eyebrow: "I am",
    parts: [
      { text: "Keshri Nandan Tiwari", bold: true },
      { text: ", a full-stack developer based in ", bold: false },
      { text: "Jabalpur, India", bold: true },
      { text: ".", bold: false },
    ],
  },
  {
    eyebrow: "I work with",
    parts: [
      { text: "Java, Spring Boot & React", bold: true },
      { text: " to ship apps that actually go to production.", bold: false },
    ],
  },
  {
    eyebrow: "Right now",
    parts: [
      { text: "open to Software Engineer roles", bold: true },
      { text: " — full-stack, backend-leaning.", bold: false },
    ],
  },
];
