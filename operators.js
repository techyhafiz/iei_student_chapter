/* ============================================================
   3D STACKED DECK OPERATORS CONTROLLER
   ============================================================ */

document.addEventListener("DOMContentLoaded", () => {
  const OPERATORS_DATA = [
    {
      name: "Technical Team",
      role: "TECHNICAL // PROJECTS & EVENTS",
      bio: "Responsible for technical planning, technical events, workshops, projects, cybersecurity activities, competitions, and technical content.",
      origin: "CYBERSEC",
      specialty: "TECHNICAL PLANNING",
      clearance: "LEVEL 5",
      image: "https://picsum.photos/seed/tech-team/800/1000",
      dossier: "#tech"
    },
    {
      name: "PR Team",
      role: "PUBLIC RELATIONS // COMMUNICATIONS",
      bio: "Responsible for communication, outreach, announcements, promotions, coordination with students, and maintaining the chapter's public presence.",
      origin: "CYBERSEC",
      specialty: "COMMUNICATION",
      clearance: "LEVEL 4",
      image: "https://picsum.photos/seed/pr-team/800/1000",
      dossier: "#pr"
    },
    {
      name: "Event Team",
      role: "EVENTS // LOGISTICS",
      bio: "Responsible for planning and executing chapter events, coordinating logistics, managing participants, and ensuring events run smoothly.",
      origin: "CYBERSEC",
      specialty: "EVENT MGMT",
      clearance: "LEVEL 4",
      image: "https://picsum.photos/seed/event-team/800/1000",
      dossier: "#event"
    },
    {
      name: "Creative Team",
      role: "CREATIVE // DESIGN & BRANDING",
      bio: "Responsible for visual content, posters, social media creatives, event designs, branding, and other creative requirements.",
      origin: "CYBERSEC",
      specialty: "DESIGN",
      clearance: "LEVEL 3",
      image: "https://picsum.photos/seed/creative-team/800/1000",
      dossier: "#creative"
    },
    {
      name: "Treasurer",
      role: "TREASURER // FINANCE",
      bio: "Responsible for handling and maintaining the chapter's financial activities and related responsibilities.",
      origin: "CYBERSEC",
      specialty: "FINANCE",
      clearance: "LEVEL 5",
      image: "https://picsum.photos/seed/treasurer/800/1000",
      dossier: "#treasurer"
    }
  ];

  const cardsWrapper = document.getElementById("opCardsStack");
  const textPanel = document.getElementById("opTextPanel");
  const prevBtn = document.getElementById("opPrevBtn");
  const nextBtn = document.getElementById("opNextBtn");

  if (!cardsWrapper || !textPanel) return;

  let currentIndex = 0;
  const total = OPERATORS_DATA.length;

  // Render 3D cards stack with professional hover hint overlay
  cardsWrapper.innerHTML = OPERATORS_DATA.map((op, idx) => `
    <div class="deck-card" data-index="${idx}" data-pos="${idx}">
      <img src="${op.image}" alt="${op.name} Portrait" loading="eager" draggable="false" />
      <div class="deck-card-hover-hint mono">
        <span>NEXT OPERATOR</span>
        <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2.5" fill="none"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
      </div>
      <div class="deck-card-overlay">
        <span class="deck-card-tag mono">${op.role.split("//")[0]}</span>
        <h4 class="deck-card-title">${op.name}</h4>
      </div>
    </div>
  `).join("");

  const cardElements = cardsWrapper.querySelectorAll(".deck-card");

  function updateDeck(newIndex) {
    if (newIndex === currentIndex) return;

    // Trigger text fade animation
    textPanel.classList.add("is-animating");

    setTimeout(() => {
      currentIndex = (newIndex + total) % total;
      const op = OPERATORS_DATA[currentIndex];

      // Update text panel content
      document.getElementById("opRole").textContent = op.role;
      document.getElementById("opName").textContent = op.name;
      document.getElementById("opBio").textContent = op.bio;
      document.getElementById("opOrigin").textContent = op.origin;
      document.getElementById("opSpec").textContent = op.specialty;
      document.getElementById("opClearance").textContent = op.clearance;
      const linkEl = document.getElementById("opLink");
      if (linkEl) linkEl.href = op.dossier;

      // Update counter indicator
      const counterEl = document.getElementById("opCounter");
      if (counterEl) {
        const formattedCurr = String(currentIndex + 1).padStart(2, "0");
        const formattedTotal = String(total).padStart(2, "0");
        counterEl.textContent = `${formattedCurr} / ${formattedTotal}`;
      }

      // Update 3D card stack positions
      cardElements.forEach((card, idx) => {
        const relPos = (idx - currentIndex + total) % total;
        if (relPos < 4) {
          card.setAttribute("data-pos", relPos.toString());
        } else {
          card.setAttribute("data-pos", "hidden");
        }
      });

      // Remove animation state
      setTimeout(() => {
        textPanel.classList.remove("is-animating");
      }, 50);
    }, 200);
  }

  let autoplayTimer = null;
  const AUTOPLAY_DELAY = 4000; // Auto advances every 4 seconds unless hovered

  function startAutoplay() {
    stopAutoplay();
    autoplayTimer = setInterval(() => {
      updateDeck(currentIndex + 1);
    }, AUTOPLAY_DELAY);
  }

  function stopAutoplay() {
    if (autoplayTimer) {
      clearInterval(autoplayTimer);
      autoplayTimer = null;
    }
  }

  // Stop slideshow when hovering over text panel OR card deck image area
  textPanel.addEventListener("mouseenter", stopAutoplay);
  textPanel.addEventListener("mouseleave", startAutoplay);

  cardsWrapper.addEventListener("mouseenter", stopAutoplay);
  cardsWrapper.addEventListener("mouseleave", startAutoplay);

  // Start autoplay initially
  startAutoplay();

  // Next / Prev controls with robust event delegation
  document.addEventListener("click", (e) => {
    const btn = e.target.closest("#opNextBtn, #opPrevBtn");
    if (!btn) return;
    e.preventDefault();
    stopAutoplay();
    if (btn.id === "opNextBtn") {
      updateDeck(currentIndex + 1);
    } else if (btn.id === "opPrevBtn") {
      updateDeck(currentIndex - 1);
    }
    startAutoplay();
  });

  // Click on active image or stacked card to advance to next person
  cardElements.forEach((card) => {
    card.addEventListener("click", () => {
      const idx = parseInt(card.getAttribute("data-index"), 10);
      stopAutoplay();
      if (idx === currentIndex) {
        updateDeck(currentIndex + 1);
      } else {
        updateDeck(idx);
      }
      startAutoplay();
    });
  });

  // Keyboard left/right navigation when section in view
  window.addEventListener("keydown", (e) => {
    const section = document.getElementById("team");
    if (!section) return;
    const rect = section.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) {
      if (e.key === "ArrowRight") updateDeck(currentIndex + 1);
      if (e.key === "ArrowLeft") updateDeck(currentIndex - 1);
    }
  });
});
