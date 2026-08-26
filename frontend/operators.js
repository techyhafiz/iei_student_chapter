/* ============================================================
   OPERATOR LEADERS — SOLO CARD BOARD
   Three rows: administrative (top), operational leads, members.
   Each card: photo + name + one-line title + LinkedIn link. No navigation.
   ============================================================ */

document.addEventListener("DOMContentLoaded", () => {
  const OPERATORS_DATA = [
    {
      name: "Aarav Sharma",
      title: "President",
      linkedin: "https://www.linkedin.com/",
      image: "https://picsum.photos/seed/lead-one/300/360",
      group: "admin"
    },
    {
      name: "Ananya Iyer",
      title: "Vice President",
      linkedin: "https://www.linkedin.com/",
      image: "https://picsum.photos/seed/lead-two/300/360",
      group: "admin"
    },
    {
      name: "Rohan Mehta",
      title: "Treasurer",
      linkedin: "https://www.linkedin.com/",
      image: "https://picsum.photos/seed/lead-three/300/360",
      group: "admin"
    },
    {
      name: "Diya Krishnan",
      title: "General Secretary",
      linkedin: "https://www.linkedin.com/",
      image: "https://picsum.photos/seed/lead-four/300/360",
      group: "admin"
    },
    {
      name: "Vihaan Reddy",
      title: "Technical Lead",
      team: "TECHNICAL",
      linkedin: "https://www.linkedin.com/",
      image: "https://picsum.photos/seed/lead-five/300/360",
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
      image: "https://picsum.photos/seed/lead-six/300/360",
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
      image: "https://picsum.photos/seed/lead-seven/300/360",
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
      image: "https://picsum.photos/seed/lead-eight/300/360",
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
        <p class="solo-row-label mono">${label}</p>
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
              <a class="solo-card-link mono" href="${op.linkedin}" target="_blank" rel="noopener noreferrer" aria-label="${op.name} on LinkedIn">
                ${LINKEDIN_ICON}
                <span>LINKEDIN</span>
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
        <p class="solo-row-label mono">${label}</p>
        <div class="team-cards">
          ${leads
            .map((op) => {
              const teamName = (op.team || op.title.replace(/\s*lead$/i, "").toUpperCase()) + " TEAM";
              return `
            <article class="team-card">
              <div class="team-card-left">
                <div class="solo-card-photo">
                  <img src="${op.image}" alt="${op.name} portrait" loading="lazy" draggable="false" />
                </div>
                <p class="team-card-name">${op.name}</p>
              </div>
              <div class="team-card-right">
                <h3 class="team-card-team">${teamName}</h3>
                <div class="team-card-lead-box">
                  <span class="lead-tag mono">LEAD</span>
                  <a class="team-card-lead-link" href="${op.linkedin}" target="_blank" rel="noopener noreferrer" aria-label="${op.name} on LinkedIn">
                    <span class="team-card-lead-name">${op.name}</span>
                    ${LINKEDIN_ICON}
                  </a>
                </div>
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

  const admins = OPERATORS_DATA.filter((op) => op.group === "admin");
  const leads = OPERATORS_DATA.filter((op) => op.group === "lead");

  board.innerHTML =
    renderRow("// 01 — ADMINISTRATIVE", admins, false, "solo-cards--fourth solo-cards--admins") + renderTeamRow("// 02 — LEADS & MEMBER TEAMS", leads);
});
