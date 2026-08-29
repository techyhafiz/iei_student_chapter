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
              <a class="member-line-name" href="${m.linkedin}" target="_blank" rel="noopener noreferrer" aria-label="${m.name} on LinkedIn">${m.name}</a>
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
              <a class="solo-card-photo" href="${op.linkedin}" target="_blank" rel="noopener noreferrer" aria-label="${op.name} on LinkedIn">
                <img src="${op.image}" alt="${op.name} portrait" loading="lazy" draggable="false" />
              </a>
              <a class="solo-card-name-link" href="${op.linkedin}" target="_blank" rel="noopener noreferrer" aria-label="${op.name} on LinkedIn">
                <h3 class="solo-card-name">${op.name}</h3>
              </a>
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
      <div class="solo-row solo-row--teams">
        <div class="sec-divider" aria-hidden="true">
          <span class="sec-divider-line"></span>
          <span class="sec-divider-badge mono">◆ ${label.toUpperCase()} ◆</span>
          <span class="sec-divider-line"></span>
        </div>
        <div class="team-cards">
          ${leads
            .map((op) => {
              const teamKey = (op.team || "").toLowerCase();
              const teamName = (op.team || op.title.replace(/\s*lead$/i, "").toUpperCase()) + " TEAM";
              return `
                <article class="team-card" data-team="${teamKey}">
                  <div class="team-card-lead-pod-box">
                    <span class="lead-pod-tag mono">LEAD</span>
                    <a class="solo-card-photo" href="${op.linkedin}" target="_blank" rel="noopener noreferrer" aria-label="${op.name} on LinkedIn">
                      <img src="${op.image}" alt="${op.name} portrait" loading="lazy" draggable="false" />
                    </a>
                    <a class="team-card-lead-pod-name-link" href="${op.linkedin}" target="_blank" rel="noopener noreferrer" aria-label="${op.name} on LinkedIn">
                      <p class="team-card-lead-pod-name">${op.name}</p>
                    </a>
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
        <a class="solo-card-photo" href="${op.linkedin}" target="_blank" rel="noopener noreferrer" aria-label="${op.name} on LinkedIn">
          <img src="${op.image}" alt="${op.name} portrait" loading="lazy" draggable="false" />
        </a>
        <div class="solo-card-content">
          <a class="solo-card-name-link" href="${op.linkedin}" target="_blank" rel="noopener noreferrer" aria-label="${op.name} on LinkedIn">
            <h3 class="solo-card-name">${op.name}</h3>
          </a>
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
    if (window.ScrollTrigger) {
      ScrollTrigger.refresh();
    }
  }

  /* ------------------------------------------------------------
     STICKY SEGMENTED TEAM FILTER (OFFICERS, TECHNICAL, EVENTS, PR, CREATIVE)
     ------------------------------------------------------------ */
  const filterBtns = document.querySelectorAll(".team-filter-btn");
  if (filterBtns.length && board) {
    function applyTeamFilter(filter) {
      const execRow = board.querySelector(".solo-row:first-child");
      const teamsRow = board.querySelector(".solo-row:last-child");
      const teamCards = board.querySelectorAll(".team-card");

      if (filter === "admin") {
        if (execRow) execRow.style.display = "";
        if (teamsRow) teamsRow.style.display = "none";
      } else {
        if (execRow) execRow.style.display = "none";
        if (teamsRow) teamsRow.style.display = "";
        teamCards.forEach((card) => {
          const cardTeam = (card.getAttribute("data-team") || "").toLowerCase();
          if (cardTeam === filter.toLowerCase()) {
            card.style.display = "";
          } else {
            card.style.display = "none";
          }
        });
      }

      if (window.ScrollTrigger) {
        ScrollTrigger.refresh();
      }
    }

    filterBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        filterBtns.forEach((b) => {
          b.classList.remove("is-active");
          b.setAttribute("aria-selected", "false");
        });
        btn.classList.add("is-active");
        btn.setAttribute("aria-selected", "true");

        const filter = btn.getAttribute("data-team-filter");
        applyTeamFilter(filter);
      });
    });

    // Default: initialize with the active tab (Officers)
    const initialActive = document.querySelector(".team-filter-btn.is-active");
    if (initialActive) {
      applyTeamFilter(initialActive.getAttribute("data-team-filter") || "admin");
    }
  }

  /* ------------------------------------------------------------
     MOBILE BOTTOM SHEET PROFILE PREVIEWS
     ------------------------------------------------------------ */
  function openMemberSheet(name, title, image, linkedin, badge) {
    if (typeof window.openBottomSheet !== "function") return;
    const content = `
      <div style="display:flex; flex-direction:column; align-items:center; text-align:center; gap:12px; padding:10px 0 20px;">
        <div style="position:relative; width:100px; height:100px; border-radius:24px; overflow:hidden; border:2px solid rgba(216, 180, 254, 0.4); box-shadow:0 0 20px rgba(168, 85, 247, 0.3);">
          <img src="${image || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&h=700&q=80'}" alt="${name}" style="width:100%; height:100%; object-fit:cover;" />
        </div>
        <span class="lead-pod-tag mono" style="font-size:9px; letter-spacing:0.18em;">${badge || 'IEI OPERATOR'}</span>
        <h3 style="font-size:1.3rem; font-weight:800; color:var(--ink); margin:0;">${name}</h3>
        <p style="font-size:0.95rem; color:var(--tx2); margin:0;">${title || 'Core Team Member'}</p>
        <p class="mono" style="font-size:0.75rem; color:var(--lav2); letter-spacing:0.1em; margin:4px 0 12px;">CYBERSECURITY DEPT · GHRCEMP</p>
        <a href="${linkedin || 'https://www.linkedin.com/'}" target="_blank" rel="noopener noreferrer" class="specular-button specular-button--md is-primary" style="width:100%; max-width:280px; min-height:48px; border-radius:999px;">
          <span class="specular-button__label">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.2V10.9H6.46M7.83 6.45a1.62 1.62 0 1 0 0 3.24 1.62 1.62 0 0 0 0-3.24z"/></svg>
            Connect on LinkedIn →
          </span>
        </a>
      </div>
    `;
    window.openBottomSheet(content);
  }
});
