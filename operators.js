/* ============================================================
   3D STACKED DECK OPERATORS CONTROLLER
   ============================================================ */

document.addEventListener("DOMContentLoaded", () => {
  const OPERATORS_DATA = [
    {
      name: "Aria Vance",
      role: "PRESIDENT // CRYPTOGRAPHY",
      bio: "Runs the ship with strategic vision and relentless energy. A three-time intercollegiate CTF team captain, Aria specializes in advanced cryptanalysis and lattice-based cipher research, believing every protocol hides a vulnerable secret waiting to be uncovered.",
      origin: "SEATTLE",
      specialty: "CRYPTANALYSIS",
      clearance: "LEVEL 5",
      image: "https://picsum.photos/seed/aria-vance/800/1000",
      dossier: "#aria"
    },
    {
      name: "Dev Okafor",
      role: "VICE PRESIDENT // RED TEAM",
      bio: "Breaks high-security perimeters professionally and leads our offensive operations team. When Dev spots an authentication portal or complex system boundary, he dissects its protocol layer, uncovering misconfigurations and bypasses before attackers ever get the chance.",
      origin: "AUSTIN",
      specialty: "PEN TESTING",
      clearance: "LEVEL 5",
      image: "https://picsum.photos/seed/dev-okafor/800/1000",
      dossier: "#dev"
    },
    {
      name: "Maya Lin",
      role: "CTF CAPTAIN // RESEARCH",
      bio: "Pioneers our vulnerability research group and regularly files CVE disclosures. Maya leads weekly exploit development dojos, guiding members through binary reverse engineering, memory corruption mechanics, kernel debugging, and real-world payload development.",
      origin: "SAN FRANCISCO",
      specialty: "EXPLOIT DEV",
      clearance: "LEVEL 4",
      image: "https://picsum.photos/seed/maya-lin/800/1000",
      dossier: "#maya"
    },
    {
      name: "Sam Rivera",
      role: "WORKSHOPS LEAD // BLUE TEAM",
      bio: "Transforms complex defense theory into battle-tested operational infrastructure. Sam architected our isolated campus malware lab and designs hands-on workshops covering threat hunting, SIEM log analysis, network defense, and active incident mitigation.",
      origin: "CHICAGO",
      specialty: "NET DEFENSE",
      clearance: "LEVEL 4",
      image: "https://picsum.photos/seed/sam-rivera/800/1000",
      dossier: "#sam"
    },
    {
      name: "Zoe Adeyemi",
      role: "OUTREACH & OPS // OSINT",
      bio: "Powers our strategic partnerships, event operations, and open-source intelligence labs. Zoe connects the club with industry mentors while training squad members in ethical OSINT, social engineering diagnostics, digital forensics, and footprint analysis.",
      origin: "NEW YORK",
      specialty: "SOCIAL ENG",
      clearance: "LEVEL 3",
      image: "https://picsum.photos/seed/zoe-adeyemi/800/1000",
      dossier: "#zoe"
    }
  ];

  const cardsWrapper = document.getElementById("opCardsStack");
  const textPanel = document.getElementById("opTextPanel");
  const prevBtn = document.getElementById("opPrevBtn");
  const nextBtn = document.getElementById("opNextBtn");

  if (!cardsWrapper || !textPanel) return;

  let currentIndex = 0;
  const total = OPERATORS_DATA.length;

  // Render 3D cards stack
  cardsWrapper.innerHTML = OPERATORS_DATA.map((op, idx) => `
    <div class="deck-card" data-index="${idx}" data-pos="${idx}">
      <img src="${op.image}" alt="${op.name} Portrait" loading="eager" draggable="false" />
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
  const AUTOPLAY_DELAY = 2000; // Auto advances every 2 seconds unless hovered

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

  const teamSection = document.getElementById("team");
  if (teamSection) {
    teamSection.addEventListener("mouseenter", stopAutoplay);
    teamSection.addEventListener("mouseleave", startAutoplay);
  }

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
