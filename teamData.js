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
      desktop: { x: "50%", y: "35%" },
      mobile: { x: "50%", y: "35%" }
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
        desktop: { x: "50%", y: "3%" },
        mobile: { x: "50%", y: "3%" }
      },
      image: "https://picsum.photos/seed/faculty/400/400",
      bio: "Guiding the IEI Student Chapter with extensive academic experience and a passion for student development.",
      skills: ["Mentorship", "Academic Guidance", "Event Approval"],
      links: {
        linkedin: "https://linkedin.com",
        github: "https://github.com/"
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
        desktop: { x: "25%", y: "18%" },
        mobile: { x: "25%", y: "18%" }
      },
      image: "https://picsum.photos/seed/president/400/400",
      bio: "Leading the student chapter with a vision to innovate and connect. Responsible for overall club operations and strategic goals.",
      skills: ["Leadership", "Public Speaking", "Project Management"],
      links: {
        linkedin: "https://linkedin.com",
        github: "https://github.com"
      }
    },
    {
      id: "vice-president",
      parent: "iei-center",
      name: "Jordan T.",
      role: "Vice President",
      category: "core",
      nodeSize: "ml",
      position: {
        desktop: { x: "75%", y: "18%" },
        mobile: { x: "75%", y: "18%" }
      },
      image: "https://picsum.photos/seed/vp/400/400",
      bio: "Assisting the President in daily operations, ensuring team collaboration, and stepping in as a leader when needed.",
      skills: ["Operations", "Team Management", "Strategy"],
      links: {
        linkedin: "https://linkedin.com",
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
        desktop: { x: "15%", y: "30%" },
        mobile: { x: "15%", y: "30%" }
      },
      image: "https://picsum.photos/seed/secretary/400/400",
      bio: "Managing club communications, meeting documentation, and ensuring smooth information flow within the chapter.",
      skills: ["Communication", "Documentation", "Organization"],
      links: {
        linkedin: "https://linkedin.com",
        github: "https://github.com/"
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
        desktop: { x: "85%", y: "40%" },
        mobile: { x: "85%", y: "40%" }
      },
      image: "https://picsum.photos/seed/treasurer/400/400",
      bio: "Handling the finances of the chapter, budgeting for events, and ensuring funds are utilized effectively.",
      skills: ["Finance", "Budgeting", "Accountability"],
      links: {
        linkedin: "https://linkedin.com",
        github: "https://github.com/"
      }
    },
    {
      id: "treasurer-member-1",
      parent: "treasurer",
      name: "Fin Member",
      role: "Finance Team",
      category: "member",
      nodeSize: "xs",
      position: {
        desktop: { x: "92%", y: "52%" },
        mobile: { x: "92%", y: "52%" }
      },
      image: "https://picsum.photos/seed/mem1/400/400",
      bio: "Assists the treasurer with budgeting and tracking expenses.",
      skills: ["Excel", "Finance", "Planning"],
      links: {
        linkedin: "https://linkedin.com",
        github: "https://github.com/"
      }
    },
    {
      id: "technical-lead",
      parent: "iei-center",
      name: "Sam K.",
      role: "Technical Lead",
      category: "lead",
      nodeSize: "ml",
      position: {
        desktop: { x: "15%", y: "65%" },
        mobile: { x: "15%", y: "65%" }
      },
      image: "https://picsum.photos/seed/tech/400/400",
      bio: "Passionate about technology, innovation, software development and building impactful projects. Leads technical workshops.",
      skills: ["Web Development", "Cybersecurity", "Project Development"],
      links: {
        linkedin: "https://linkedin.com",
        github: "https://github.com"
      }
    },
    {
      id: "tech-member-1",
      parent: "technical-lead",
      name: "Tech Mem 1",
      role: "Technical Team",
      category: "member",
      nodeSize: "xs",
      position: { desktop: { x: "4%", y: "80%" }, mobile: { x: "4%", y: "80%" } },
      image: "https://picsum.photos/seed/mem2/400/400",
      bio: "Helps develop software solutions and workshops.",
      skills: ["Coding", "Problem Solving", "Web"],
      links: {
        linkedin: "https://linkedin.com",
        github: "https://github.com"
      }
    },
    {
      id: "tech-member-2",
      parent: "technical-lead",
      name: "Tech Mem 2",
      role: "Technical Team",
      category: "member",
      nodeSize: "xs",
      position: { desktop: { x: "15%", y: "85%" }, mobile: { x: "15%", y: "85%" } },
      image: "https://picsum.photos/seed/mem3/400/400",
      bio: "Focuses on backend infrastructure and APIs.",
      skills: ["Node.js", "Databases", "Linux"],
      links: {
        linkedin: "https://linkedin.com",
        github: "https://github.com"
      }
    },
    {
      id: "tech-member-3",
      parent: "technical-lead",
      name: "Tech Mem 3",
      role: "Technical Team",
      category: "member",
      nodeSize: "xs",
      position: { desktop: { x: "26%", y: "80%" }, mobile: { x: "26%", y: "80%" } },
      image: "https://picsum.photos/seed/mem4/400/400",
      bio: "Works on frontend UI and interactive components.",
      skills: ["React", "CSS", "UI/UX"],
      links: {
        linkedin: "https://linkedin.com",
        github: "https://github.com"
      }
    },
    {
      id: "event-lead",
      parent: "iei-center",
      name: "Riley P.",
      role: "Event Management Lead",
      category: "lead",
      nodeSize: "ml",
      position: {
        desktop: { x: "50%", y: "70%" },
        mobile: { x: "50%", y: "70%" }
      },
      image: "https://picsum.photos/seed/event/400/400",
      bio: "Orchestrating successful events from planning to execution. Ensures everything runs smoothly on the day of the event.",
      skills: ["Event Planning", "Logistics", "Problem Solving"],
      links: {
        linkedin: "https://linkedin.com",
        github: "https://github.com/"
      }
    },
    {
      id: "event-member-1",
      parent: "event-lead",
      name: "Event Mem 1",
      role: "Event Team",
      category: "member",
      nodeSize: "xs",
      position: { desktop: { x: "38%", y: "85%" }, mobile: { x: "38%", y: "85%" } },
      image: "https://picsum.photos/seed/mem8/400/400",
      bio: "Manages event logistics and scheduling.",
      skills: ["Management", "Organization", "Planning"],
      links: {
        linkedin: "https://linkedin.com",
        github: "https://github.com/"
      }
    },
    {
      id: "event-member-2",
      parent: "event-lead",
      name: "Event Mem 2",
      role: "Event Team",
      category: "member",
      nodeSize: "xs",
      position: { desktop: { x: "46%", y: "92%" }, mobile: { x: "46%", y: "92%" } },
      image: "https://picsum.photos/seed/mem9/400/400",
      bio: "Coordinates with speakers and guests.",
      skills: ["Communication", "Networking", "Hosting"],
      links: {
        linkedin: "https://linkedin.com",
        github: "https://github.com/"
      }
    },
    {
      id: "event-member-3",
      parent: "event-lead",
      name: "Event Mem 3",
      role: "Event Team",
      category: "member",
      nodeSize: "xs",
      position: { desktop: { x: "54%", y: "92%" }, mobile: { x: "54%", y: "92%" } },
      image: "https://picsum.photos/seed/mem10/400/400",
      bio: "Handles on-ground execution and coordination.",
      skills: ["Execution", "Quick Thinking", "Teamwork"],
      links: {
        linkedin: "https://linkedin.com",
        github: "https://github.com/"
      }
    },
    {
      id: "event-member-4",
      parent: "event-lead",
      name: "Event Mem 4",
      role: "Event Team",
      category: "member",
      nodeSize: "xs",
      position: { desktop: { x: "62%", y: "85%" }, mobile: { x: "62%", y: "85%" } },
      image: "https://picsum.photos/seed/mem11/400/400",
      bio: "Oversees attendee registration and support.",
      skills: ["Support", "Hospitality", "CRM"],
      links: {
        linkedin: "https://linkedin.com",
        github: "https://github.com/"
      }
    },
    {
      id: "creative-lead",
      parent: "iei-center",
      name: "Morgan B.",
      role: "Creative Lead",
      category: "lead",
      nodeSize: "ml",
      position: {
        desktop: { x: "85%", y: "65%" },
        mobile: { x: "85%", y: "65%" }
      },
      image: "https://picsum.photos/seed/creative/400/400",
      bio: "Directing the visual identity of the chapter. Designs posters, UI/UX, and ensures a high-quality aesthetic for all events.",
      skills: ["UI/UX Design", "Graphic Design", "Branding"],
      links: {
        linkedin: "https://linkedin.com",
        github: "https://github.com/"
      }
    },
    {
      id: "creative-member-1",
      parent: "creative-lead",
      name: "Creative 1",
      role: "Creative Team",
      category: "member",
      nodeSize: "xs",
      position: { desktop: { x: "74%", y: "80%" }, mobile: { x: "74%", y: "80%" } },
      image: "https://picsum.photos/seed/mem5/400/400",
      bio: "Creates stunning graphics and banners.",
      skills: ["Photoshop", "Illustrator", "Art"],
      links: {
        linkedin: "https://linkedin.com",
        github: "https://github.com/"
      }
    },
    {
      id: "creative-member-2",
      parent: "creative-lead",
      name: "Creative 2",
      role: "Creative Team",
      category: "member",
      nodeSize: "xs",
      position: { desktop: { x: "85%", y: "85%" }, mobile: { x: "85%", y: "85%" } },
      image: "https://picsum.photos/seed/mem6/400/400",
      bio: "Focuses on video editing and motion graphics.",
      skills: ["Premiere", "After Effects", "Editing"],
      links: {
        linkedin: "https://linkedin.com",
        github: "https://github.com/"
      }
    },
    {
      id: "creative-member-3",
      parent: "creative-lead",
      name: "Creative 3",
      role: "Creative Team",
      category: "member",
      nodeSize: "xs",
      position: { desktop: { x: "96%", y: "80%" }, mobile: { x: "96%", y: "80%" } },
      image: "https://picsum.photos/seed/mem7/400/400",
      bio: "Helps design UX flows and interactive prototypes.",
      skills: ["Figma", "Prototyping", "UX"],
      links: {
        linkedin: "https://linkedin.com",
        github: "https://github.com/"
      }
    }
  ]
};
