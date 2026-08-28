/* ============================================================
   OPERATOR LEADERS — SOLO CARD BOARD
   Three rows: administrative (top), operational leads, members.
   Each card: photo + name + one-line title + LinkedIn link. No navigation.
   ============================================================ */

const API_URL = 'http://localhost:5000/api';

document.addEventListener("DOMContentLoaded", () => {
  const board = document.getElementById("opSoloBoard");
  const facultyBoard = document.getElementById("facultyCards");
  
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
              ${m.linkedin ? `<a class="member-line-link" href="${m.linkedin}" target="_blank" rel="noopener noreferrer" aria-label="${m.name} on LinkedIn">
                ${LINKEDIN_ICON}
              </a>` : ''}
            </li>
          `
            )
            .join("")}
        </ul>
      </div>
    `;
  }

  function renderRow(label, members, withMemberLists, cardsClass = "") {
    if (!members || members.length === 0) return "";
    return `
      <div class="solo-row">
        <p class="solo-row-label mono">${label}</p>
        <div class="solo-cards ${cardsClass}">
          ${members
            .map(
              (op) => `
            <article class="solo-card${withMemberLists && op.members ? " solo-card--lead" : ""}">
              <div class="solo-card-photo">
                <img src="${op.image || ''}" alt="${op.name} portrait" loading="lazy" draggable="false" />
              </div>
              <h3 class="solo-card-name">${op.name}</h3>
              <p class="solo-card-title">${op.title}</p>
              ${op.linkedin ? `<a class="solo-card-link mono" href="${op.linkedin}" target="_blank" rel="noopener noreferrer" aria-label="${op.name} on LinkedIn">
                ${LINKEDIN_ICON}
                <span>LINKEDIN</span>
              </a>` : ''}
              ${withMemberLists ? renderMemberList(op.members) : ""}
            </article>
          `
            )
            .join("")}
        </div>
      </div>
    `;
  }

  function renderTeamRow(label, teams) {
    if (!teams || teams.length === 0) return "";
    return `
      <div class="solo-row">
        <p class="solo-row-label mono">${label}</p>
        <div class="team-cards">
          ${teams
            .map((apiTeam) => {
              const teamName = (apiTeam.name || "TEAM").toUpperCase();
              const op = apiTeam.lead;
              
              if (op) {
                return `
                  <article class="team-card">
                    <div class="team-card-left">
                      <div class="solo-card-photo">
                        <img src="${op.image || ''}" alt="${op.name} portrait" loading="lazy" draggable="false" />
                      </div>
                      <p class="team-card-name">${op.name}</p>
                    </div>
                    <div class="team-card-right">
                      <h3 class="team-card-team">${teamName}</h3>
                      <div class="team-card-lead-box">
                        <span class="lead-tag mono">LEAD</span>
                        ${op.linkedin ? `<a class="team-card-lead-link" href="${op.linkedin}" target="_blank" rel="noopener noreferrer" aria-label="${op.name} on LinkedIn">
                          <span class="team-card-lead-name">${op.name}</span>
                          ${LINKEDIN_ICON}
                        </a>` : `<div class="team-card-lead-link" style="pointer-events: none;">
                          <span class="team-card-lead-name">${op.name}</span>
                        </div>`}
                      </div>
                      ${renderMemberList(apiTeam.members)}
                    </div>
                  </article>
                `;
              } else {
                return `
                  <article class="team-card">
                    <div class="team-card-left" style="justify-content: center;">
                      <div class="solo-card-photo" style="display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.02); border: 1px dashed var(--border);">
                        <span style="color: var(--muted); font-size: 0.8rem; text-align: center; padding: 1rem;">No Photo</span>
                      </div>
                      <p class="team-card-name" style="color: var(--muted);">VACANT</p>
                    </div>
                    <div class="team-card-right">
                      <h3 class="team-card-team">${teamName}</h3>
                      <div class="team-card-lead-box">
                        <span class="lead-tag mono" style="background: var(--border); color: var(--muted);">LEAD</span>
                        <div class="team-card-lead-link" style="pointer-events: none; opacity: 0.6;">
                          <span class="team-card-lead-name">LEAD POSITION VACANT</span>
                        </div>
                      </div>
                      ${renderMemberList(apiTeam.members)}
                    </div>
                  </article>
                `;
              }
            })
            .join("")}
        </div>
      </div>
    `;
  }

  function renderFacultyCards(faculty) {
    if (!faculty || faculty.length === 0) return "<p style='color:var(--muted); grid-column: 1 / -1; text-align: center;'>No faculty members currently listed.</p>";
    return faculty.map(op => `
      <article class="solo-card">
        <div class="solo-card-photo">
          <img src="${op.image || ''}" alt="${op.name} portrait" loading="lazy" draggable="false" />
        </div>
        <h3 class="solo-card-name">${op.name}</h3>
        <p class="solo-card-title">${op.title}</p>
        ${op.linkedin ? `<a class="solo-card-link mono" href="${op.linkedin}" target="_blank" rel="noopener noreferrer" aria-label="${op.name} on LinkedIn">
          ${LINKEDIN_ICON}
          <span>LINKEDIN</span>
        </a>` : ''}
      </article>
    `).join("");
  }

  function mapMember(m) {
    if (!m) return null;
    return {
      name: m.name,
      title: m.position,
      linkedin: m.linkedin_url,
      image: m.image_url
    };
  }

  async function loadTeams() {
    board.innerHTML = '<p style="color: var(--muted); text-align: center;">Loading team data...</p>';
    if (facultyBoard) facultyBoard.innerHTML = '<p style="color: var(--muted); text-align: center; grid-column: 1 / -1;">Loading faculty data...</p>';

    try {
      const res = await fetch(`${API_URL}/team`);
      if (!res.ok) throw new Error('Failed to load team data');
      const data = await res.json();
      
      if (!data.success) throw new Error('Invalid data format');

      const faculty = (data.faculty || []).map(mapMember);
      const executive = (data.executive || []).map(mapMember);
      const teams = (data.teams || []).map(t => ({
        name: t.name,
        lead: mapMember(t.lead),
        members: (t.members || []).map(mapMember)
      }));

      if (facultyBoard) {
        facultyBoard.innerHTML = renderFacultyCards(faculty);
      }

      let boardHtml = "";
      if (executive.length > 0) {
        boardHtml += renderRow("// 01 \u2014 EXECUTIVE", executive, false, "solo-cards--fourth solo-cards--admins");
      }
      if (teams.length > 0) {
        boardHtml += renderTeamRow("// 02 \u2014 TEAMS", teams);
      }
      
      if (!boardHtml) {
        boardHtml = '<p style="color: var(--muted); text-align: center;">No team members currently listed.</p>';
      }
      
      board.innerHTML = boardHtml;

    } catch (error) {
      console.error(error);
      board.innerHTML = '<p style="color: var(--accent); text-align: center;">Unable to load team data at this time. Please check back later.</p>';
      if (facultyBoard) {
        facultyBoard.innerHTML = '<p style="color: var(--accent); text-align: center; grid-column: 1 / -1;">Unable to load faculty data at this time.</p>';
      }
    }
  }

  loadTeams();
});
