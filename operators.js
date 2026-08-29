/* ============================================================
   OPERATOR LEADERS — SOLO CARD BOARD
   Three rows: administrative (top), operational leads, members.
   Each card: photo + name + one-line title + LinkedIn link. No navigation.
   ============================================================ */

document.addEventListener("DOMContentLoaded", () => {
  const OPERATORS_DATA = [
    {
      name: "Dr. Rajesh Kumar",
      title: "Head of Department (HOD)",
      linkedin: "https://www.linkedin.com/",
      image: "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=600&h=700&q=80",
      group: "faculty"
    },
    {
      name: "Prof. Priya Nair",
      title: "Faculty Coordinator",
      linkedin: "https://www.linkedin.com/",
      image: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=600&h=700&q=80",
      group: "faculty"
    },
    {
      name: "Aarav Sharma",
      title: "President",
      linkedin: "https://www.linkedin.com/",
      image: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=600&h=700&q=80",
      group: "admin"
    },
    {
      name: "Ananya Iyer",
      title: "Vice President",
      linkedin: "https://www.linkedin.com/",
      image: "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?auto=format&fit=crop&w=600&h=700&q=80",
      group: "admin"
    },
    {
      name: "Rohan Mehta",
      title: "Treasurer",
      linkedin: "https://www.linkedin.com/",
      image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&h=700&q=80",
      group: "admin"
    },
    {
      name: "Diya Krishnan",
      title: "General Secretary",
      linkedin: "https://www.linkedin.com/",
      image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&h=700&q=80",
      group: "admin"
    },
    {
      name: "Vihaan Reddy",
      title: "Technical Lead",
      team: "TECHNICAL",
      linkedin: "https://www.linkedin.com/",
      image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=600&h=700&q=80",
      group: "lead",
      members: [
        { name: "Aditya Verma", linkedin: "https://www.linkedin.com/" },
        { name: "Neha Gupta", linkedin: "https://www.linkedin.com/" },
        { name: "Arjun Nair", linkedin: "https://www.linkedin.com/" }
      ]
    },
    {
      name: "Ishita Desai",
      title: "Events Lead",
      team: "EVENTS",
      linkedin: "https://www.linkedin.com/",
      image: "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=600&h=700&q=80",
      group: "lead",
      members: [
        { name: "Kavya Pillai", linkedin: "https://www.linkedin.com/" },
        { name: "Dev Patel", linkedin: "https://www.linkedin.com/" },
        { name: "Sana Sheikh", linkedin: "https://www.linkedin.com/" }
      ]
    },
    {
      name: "Kabir Malhotra",
      title: "PR Lead",
      team: "PR",
      linkedin: "https://www.linkedin.com/",
      image: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=600&h=700&q=80",
      group: "lead",
      members: [
        { name: "Rahul Joshi", linkedin: "https://www.linkedin.com/" },
        { name: "Meera Menon", linkedin: "https://www.linkedin.com/" },
        { name: "Tanvi Kulkarni", linkedin: "https://www.linkedin.com/" }
      ]
    },
    {
      name: "Anika Bose",
      title: "Creative Lead",
      team: "CREATIVE",
      linkedin: "https://www.linkedin.com/",
      image: "https://images.unsplash.com/photo-1534751516642-a171edd26cb0?auto=format&fit=crop&w=600&h=700&q=80",
      group: "lead",
      members: [
        { name: "Vivaan Chatterjee", linkedin: "https://www.linkedin.com/" },
        { name: "Nisha Rathod", linkedin: "https://www.linkedin.com/" },
        { name: "Aisha Fernandes", linkedin: "https://www.linkedin.com/" }
      ]
    }
  ];

  const board = document.getElementById("opSoloBoard");
  if (!board) return;

  const LINKEDIN_ICON = `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.47-.9 1.63-1.85 3.36-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.56V9h3.56v11.45z"/></svg>`;

  function renderMemberList(members) {
    if (!members || !members.length) return "";
    return `
      <div class="lead-card-members">
        <p class="lead-card-members-label mono">MEMBERS</p>
        <ul>
          ${members
            .map(
              (m) => `
            <li class="member-line">
              <span class="member-line-name">${m.name}</span>
              <a class="member-line-link" href="${m.linkedin}" target="_blank" rel="noopener noreferrer" aria-label="${m.name} on LinkedIn">
                ${LINKEDIN_ICON}
              </a>
            </li>
          `
            )
            .join("")}
        </ul>
      </div>
    `;
  }

  function renderRow(label, members, withMemberLists, cardsClass = "") {
    return `
      <div class="solo-row">
        <div class="sec-divider" aria-hidden="true">
          <span class="sec-divider-line"></span>
          <span class="sec-divider-badge mono">◆ ${label.toUpperCase()} ◆</span>
          <span class="sec-divider-line"></span>
        </div>
        <div class="solo-cards ${cardsClass}">
          ${members
            .map(
              (op) => `
            <article class="solo-card${withMemberLists && op.members ? " solo-card--lead" : ""}">
              <div class="solo-card-photo">
                <img src="${op.image}" alt="${op.name} portrait" loading="lazy" draggable="false" />
              </div>
              <h3 class="solo-card-name">${op.name}</h3>
              <p class="solo-card-title">${op.title}</p>
              <a class="profile-btn-icon" href="${op.linkedin}" target="_blank" rel="noopener noreferrer" aria-label="${op.name} on LinkedIn">
                ${LINKEDIN_ICON}
              </a>
              ${withMemberLists ? renderMemberList(op.members) : ""}
            </article>
          `
            )
            .join("")}
        </div>
      </div>
    `;
  }

  function renderTeamRow(label, leads) {
    return `
      <div class="solo-row">
        <div class="sec-divider" aria-hidden="true">
          <span class="sec-divider-line"></span>
          <span class="sec-divider-badge mono">◆ ${label.toUpperCase()} ◆</span>
          <span class="sec-divider-line"></span>
        </div>
        <div class="team-cards">
          ${leads
            .map((op) => {
              const teamName = (op.team || op.title.replace(/\s*lead$/i, "").toUpperCase()) + " TEAM";
              return `
                <article class="team-card">
                  <div class="team-card-lead-pod-box">
                    <div class="solo-card-photo">
                      <img src="${op.image}" alt="${op.name} portrait" loading="lazy" draggable="false" />
                    </div>
                    <p class="team-card-lead-pod-name">${op.name}</p>
                    <span class="lead-tag mono">LEAD</span>
                    <a class="profile-btn-icon" href="${op.linkedin}" target="_blank" rel="noopener noreferrer" aria-label="${op.name} on LinkedIn">
                      ${LINKEDIN_ICON}
                    </a>
                  </div>
                  <div class="team-card-right">
                    <h3 class="team-card-team">${teamName}</h3>
                    ${renderMemberList(op.members)}
                  </div>
                </article>
              `;
            })
            .join("")}
        </div>
      </div>
    `;
  }

  const faculty = OPERATORS_DATA.filter((op) => op.group === "faculty");
  const admins = OPERATORS_DATA.filter((op) => op.group === "admin");
  const leads = OPERATORS_DATA.filter((op) => op.group === "lead");

  const facultyCardsWrap = document.getElementById("facultyCards");
  if (facultyCardsWrap) {
    facultyCardsWrap.innerHTML = faculty
      .map(
        (op) => `
      <article class="solo-card solo-card--faculty-item">
        <div class="solo-card-photo">
          <img src="${op.image}" alt="${op.name} portrait" loading="lazy" draggable="false" />
        </div>
        <div class="solo-card-content">
          <h3 class="solo-card-name">${op.name}</h3>
          <p class="solo-card-title">${op.title}</p>
          <a class="profile-btn-icon" href="${op.linkedin}" target="_blank" rel="noopener noreferrer" aria-label="${op.name} on LinkedIn">
            ${LINKEDIN_ICON}
          </a>
        </div>
      </article>
    `
      )
      .join("");
  }

  if (board) {
    board.innerHTML =
      renderRow("Executive Committee", admins, false, "solo-cards--fourth solo-cards--admins") +
      renderTeamRow("Teams & Leads", leads);
  }
});
