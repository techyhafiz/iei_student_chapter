// ============================================================
// IEI STUDENT CHAPTER TEAM DATA
// Update team member details and images here
// ============================================================

// Update the IEI central logo image here
const IEI_LOGO = "assets/iei-logo.png";

const teamData = {
  // Center organization node
  organization: {
    id: "iei-center",
    name: "IEI GHRCEM",
    role: "Student Chapter",
    image: IEI_LOGO,
    nodeSize: "center",
    position: {
      desktop: { x: "50%", y: "45%" },
      mobile: { x: "50%", y: "50%" }
    }
  },

  // Team Members
  members: [
    {
      id: "faculty-coordinator",
      parent: "iei-center",
      name: "Dr. Example Name",
      role: "Faculty Coordinator",
      category: "core",
      nodeSize: "xl",
      position: {
        desktop: { x: "50%", y: "10%" },
        mobile: { x: "50%", y: "10%" }
      },
      image: "https://picsum.photos/seed/faculty/400/400",
      bio: "Guiding the IEI Student Chapter with extensive academic experience and a passion for student development.",
      skills: ["Mentorship", "Academic Guidance", "Event Approval"],
      links: {
        linkedin: "https://linkedin.com",
        instagram: "https://instagram.com",
        github: ""
      }
    },
    {
      id: "president",
      parent: "iei-center",
      name: "Alex M.",
      role: "President",
      category: "core",
      nodeSize: "lg",
      position: {
        desktop: { x: "25%", y: "25%" },
        mobile: { x: "25%", y: "25%" }
      },
      image: "https://picsum.photos/seed/president/400/400",
      bio: "Leading the student chapter with a vision to innovate and connect. Responsible for overall club operations and strategic goals.",
      skills: ["Leadership", "Public Speaking", "Project Management"],
      links: {
        linkedin: "https://linkedin.com",
        instagram: "https://instagram.com",
        github: "https://github.com"
      }
    },
    {
      id: "vice-president",
      parent: "iei-center",
      name: "Jordan T.",
      role: "Vice President",
      category: "core",
      nodeSize: "ml", // Medium-large
      position: {
        desktop: { x: "75%", y: "25%" },
        mobile: { x: "75%", y: "25%" }
      },
      image: "https://picsum.photos/seed/vp/400/400",
      bio: "Assisting the President in daily operations, ensuring team collaboration, and stepping in as a leader when needed.",
      skills: ["Operations", "Team Management", "Strategy"],
      links: {
        linkedin: "https://linkedin.com",
        instagram: "https://instagram.com",
        github: "https://github.com"
      }
    },
    {
      id: "secretary",
      parent: "iei-center",
      name: "Taylor R.",
      role: "Secretary",
      category: "core",
      nodeSize: "md",
      position: {
        desktop: { x: "15%", y: "55%" },
        mobile: { x: "20%", y: "45%" }
      },
      image: "https://picsum.photos/seed/secretary/400/400",
      bio: "Managing club communications, meeting documentation, and ensuring smooth information flow within the chapter.",
      skills: ["Communication", "Documentation", "Organization"],
      links: {
        linkedin: "https://linkedin.com",
        instagram: "https://instagram.com",
        github: ""
      }
    },
    {
      id: "treasurer",
      parent: "iei-center",
      name: "Casey L.",
      role: "Treasurer",
      category: "core",
      nodeSize: "md",
      position: {
        desktop: { x: "85%", y: "55%" },
        mobile: { x: "80%", y: "45%" }
      },
      image: "https://picsum.photos/seed/treasurer/400/400",
      bio: "Handling the finances of the chapter, budgeting for events, and ensuring funds are utilized effectively.",
      skills: ["Finance", "Budgeting", "Accountability"],
      links: {
        linkedin: "https://linkedin.com",
        instagram: "https://instagram.com",
        github: ""
      }
    },
    {
      id: "technical-lead",
      parent: "iei-center",
      name: "Sam K.",
      role: "Technical Lead",
      category: "lead",
      nodeSize: "sm",
      position: {
        desktop: { x: "25%", y: "82%" },
        mobile: { x: "25%", y: "70%" }
      },
      image: "https://picsum.photos/seed/tech/400/400",
      bio: "Passionate about technology, innovation, software development and building impactful projects. Leads technical workshops.",
      skills: ["Web Development", "Cybersecurity", "Project Development"],
      links: {
        linkedin: "https://linkedin.com",
        instagram: "https://instagram.com",
        github: "https://github.com"
      }
    },
    {
      id: "creative-lead",
      parent: "iei-center",
      name: "Morgan B.",
      role: "Creative Lead",
      category: "lead",
      nodeSize: "sm",
      position: {
        desktop: { x: "75%", y: "82%" },
        mobile: { x: "75%", y: "70%" }
      },
      image: "https://picsum.photos/seed/creative/400/400",
      bio: "Directing the visual identity of the chapter. Designs posters, UI/UX, and ensures a high-quality aesthetic for all events.",
      skills: ["UI/UX Design", "Graphic Design", "Branding"],
      links: {
        linkedin: "https://linkedin.com",
        instagram: "https://instagram.com",
        github: ""
      }
    },
    {
      id: "event-lead",
      parent: "iei-center",
      name: "Riley P.",
      role: "Event Management Lead",
      category: "lead",
      nodeSize: "sm",
      position: {
        desktop: { x: "50%", y: "90%" },
        mobile: { x: "50%", y: "88%" }
      },
      image: "https://picsum.photos/seed/event/400/400",
      bio: "Orchestrating successful events from planning to execution. Ensures everything runs smoothly on the day of the event.",
      skills: ["Event Planning", "Logistics", "Problem Solving"],
      links: {
        linkedin: "https://linkedin.com",
        instagram: "https://instagram.com",
        github: ""
      }
    }
  ]
};
