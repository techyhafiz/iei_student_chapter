/* ============================================================
   TEAM NETWORK CONTROLLER - 3D & PARALLAX
   ============================================================ */

document.addEventListener("DOMContentLoaded", () => {
  const container = document.getElementById("networkContainer");
  const nodesWrapper = document.getElementById("networkNodes");
  const linesWrapper = document.getElementById("networkLines");

  const popup = document.getElementById("memberPopup");
  const popupClose = document.getElementById("memberPopupClose");

  if (!container || !nodesWrapper || !linesWrapper || !teamData) return;

  let nodes = [];
  let lines = [];
  let nodeDataMap = new Map();
  let isMobile = window.innerWidth <= 768;

  // Parallax variables
  let mouseX = 0;
  let mouseY = 0;
  let targetMouseX = 0;
  let targetMouseY = 0;
  let rafId = null;

  // Depth mapping based on node size
  const depthMap = {
    'xl': 40,
    'lg': 20,
    'ml': 10,
    'md': 0,
    'sm': -30,
    'center': 0
  };

  // Handle window resize
  window.addEventListener("resize", () => {
    const mobileCheck = window.innerWidth <= 768;
    if (mobileCheck !== isMobile) {
      isMobile = mobileCheck;
      closePopup();
    }
    renderNetwork();
  });

  // Initialize network on page load
  renderNetwork();

  function setupSVGDefs() {
    const svgNS = "http://www.w3.org/2000/svg";

    // Create an SVG element to hold defs if it doesn't exist
    let defsSvg = document.getElementById("networkSvgDefs");
    if (!defsSvg) {
      defsSvg = document.createElementNS(svgNS, "svg");
      defsSvg.setAttribute("id", "networkSvgDefs");
      defsSvg.style.position = "absolute";
      defsSvg.style.width = "0";
      defsSvg.style.height = "0";

      const defs = document.createElementNS(svgNS, "defs");

      // Default line gradient
      const gradient = document.createElementNS(svgNS, "linearGradient");
      gradient.setAttribute("id", "lineGradient");
      gradient.innerHTML = `
        <stop offset="0%" stop-color="rgba(122, 162, 255, 0.4)" />
        <stop offset="50%" stop-color="rgba(212, 160, 23, 0.2)" />
        <stop offset="100%" stop-color="rgba(212, 160, 23, 0.4)" />
      `;

      // Active line gradient
      const activeGradient = document.createElementNS(svgNS, "linearGradient");
      activeGradient.setAttribute("id", "lineGradientActive");
      activeGradient.innerHTML = `
        <stop offset="0%" stop-color="rgba(122, 162, 255, 0.8)" />
        <stop offset="50%" stop-color="rgba(212, 160, 23, 0.8)" />
        <stop offset="100%" stop-color="rgba(212, 160, 23, 1)" />
      `;

      defs.appendChild(gradient);
      defs.appendChild(activeGradient);
      defsSvg.appendChild(defs);
      document.body.appendChild(defsSvg);
    }
  }

  function renderNetwork() {
    setupSVGDefs();

    nodesWrapper.innerHTML = "";
    linesWrapper.innerHTML = "";
    nodes = [];
    lines = [];
    nodeDataMap.clear();

    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;

    // 1. Render Orbital Center Background
    const orbitalHtml = `
      <div class="orbital-system">
        <div class="orbital-ring orbital-ring-1"></div>
        <div class="orbital-ring orbital-ring-2"></div>
        <div class="orbital-ring orbital-ring-3"></div>
      </div>
    `;
    nodesWrapper.insertAdjacentHTML('beforeend', orbitalHtml);

    // 2. Render Center Node
    const centerData = teamData.organization;
    const centerPos = isMobile ? centerData.position.mobile : centerData.position.desktop;
    const centerX = (parseFloat(centerPos.x) / 100) * containerWidth;
    const centerY = (parseFloat(centerPos.y) / 100) * containerHeight;
    const centerZ = depthMap['center'];

    nodeDataMap.set(centerData.id, { ...centerData, base_x: centerX, base_y: centerY, z: centerZ });

    const centerNode = createNodeElement(centerData, true, centerZ);
    centerNode.style.left = `${centerPos.x}`;
    centerNode.style.top = `${centerPos.y}`;
    centerNode.dataset.id = centerData.id;
    centerNode.dataset.z = centerZ;
    nodesWrapper.appendChild(centerNode);

    // Get radius async
    setTimeout(() => {
      centerNode.dataset.radius = centerNode.querySelector('.node-image-wrapper').offsetWidth / 2;
    }, 10);

    // 3. Render Team Members
    teamData.members.forEach((member, i) => {
      const pos = isMobile ? member.position.mobile : member.position.desktop;
      const x = (parseFloat(pos.x) / 100) * containerWidth;
      const y = (parseFloat(pos.y) / 100) * containerHeight;
      const z = depthMap[member.nodeSize] || 0;

      nodeDataMap.set(member.id, { ...member, base_x: x, base_y: y, z });

      const nodeEl = createNodeElement(member, false, z);
      nodeEl.style.left = `${pos.x}`;
      nodeEl.style.top = `${pos.y}`;
      nodeEl.dataset.id = member.id;
      nodeEl.dataset.parent = member.parent;
      nodeEl.dataset.z = z;

      // Add slight random animation delay for organic floating
      const floatWrapper = nodeEl.querySelector('.node-float-wrapper');
      if (floatWrapper) {
        floatWrapper.style.animationDelay = `${-(Math.random() * 5)}s`;
      }

      nodesWrapper.appendChild(nodeEl);
      nodes.push(nodeEl);

      setTimeout(() => {
        nodeEl.dataset.radius = nodeEl.querySelector('.node-image-wrapper').offsetWidth / 2;
      }, 10);
    });

    nodes.push(centerNode);

    // 4. Initial SVG Draw
    setTimeout(() => {
      drawConnections();
      startParallax();
    }, 50);
  }

  function createNodeElement(data, isCenter, zDepth) {
    const node = document.createElement("div");

    const sizeClass = data.nodeSize ? `node-${data.nodeSize}` : 'node-md';
    node.className = `network-node ${sizeClass} ${isCenter ? 'center-node' : ''}`;

    // Initialize transform at Z=0 to prevent click occlusion
    node.style.transform = `translate(-50%, -50%) translate3d(0px, 0px, 0px)`;

    if (!isCenter) {
      node.setAttribute("role", "button");
      node.setAttribute("tabindex", "0");
      node.setAttribute("aria-label", `View ${data.name} details`);
    }

    // Wrap contents in float wrapper for CSS floating
    node.innerHTML = `
      <div class="node-float-wrapper">
        <div class="node-image-wrapper">
          <img src="${data.image}" alt="${data.name}" class="node-image" loading="lazy">
        </div>
        <div class="node-info">
          <div class="node-name">${data.name}</div>
          <div class="node-role">${data.role}</div>
        </div>
      </div>
    `;

    if (!isCenter) {
      node.addEventListener("mouseenter", () => handleHover(data.id, data.parent, true));
      node.addEventListener("mouseleave", () => handleHover(data.id, data.parent, false));

      node.addEventListener("click", (e) => {
        e.stopPropagation();
        openPopup(data, node);
      });

      node.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          e.stopPropagation();
          openPopup(data, node);
        }
      });
    }

    return node;
  }

  // --- Parallax & Connection Loop ---

  container.addEventListener("mousemove", (e) => {
    if (isMobile) return;
    const rect = container.getBoundingClientRect();
    // Normalize mouse coords from -1 to 1 relative to center of container
    targetMouseX = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
    targetMouseY = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
  });

  container.addEventListener("mouseleave", () => {
    targetMouseX = 0;
    targetMouseY = 0;
  });

  function startParallax() {
    if (rafId) cancelAnimationFrame(rafId);

    function animate() {
      // Lerp mouse position for smoothness
      mouseX += (targetMouseX - mouseX) * 0.05;
      mouseY += (targetMouseY - mouseY) * 0.05;

      // Update Node 3D Transforms based on depth
      nodes.forEach(node => {
        const z = parseFloat(node.dataset.z || 0);

        // Background nodes move opposite to foreground nodes
        // Scale movement intensity by z
        const moveX = mouseX * z * 0.8;
        const moveY = mouseY * z * 0.8;

        // Keep physical Z at 0 to completely prevent browser 3D click occlusion bugs,
        // but use the z depth to calculate the exact parallax movement X/Y!
        node.style.transform = `translate(-50%, -50%) translate3d(${moveX}px, ${moveY}px, 0px)`;
      });

      // Update connections visually over the nodes
      updateConnections();

      // Update anchor line if popup is open
      if (popup.classList.contains('is-open')) {
        updateAnchorLine();
      }

      rafId = requestAnimationFrame(animate);
    }
    animate();
  }

  // Initialize lines array in DOM
  function drawConnections() {
    linesWrapper.setAttribute("width", "100%");
    linesWrapper.setAttribute("height", "100%");
    linesWrapper.innerHTML = '';
    lines = [];

    nodes.forEach(node => {
      const parentId = node.dataset.parent;
      if (!parentId) return;

      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("class", "connection-line");
      line.setAttribute("data-source-id", parentId);
      line.setAttribute("data-member-id", node.dataset.id);

      linesWrapper.appendChild(line);
      lines.push({ element: line, targetNode: node, sourceId: parentId, memberId: node.dataset.id });

      // Subtly add particles to some lines
      if (Math.random() > 0.5) {
        // ... omitted to save complexity, using simple lines for clarity ...
      }
    });

    // Add anchor line to SVG
    const anchorLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
    anchorLine.setAttribute("class", "anchor-line");
    anchorLine.setAttribute("id", "popupAnchorLine");
    anchorLine.style.opacity = "0";
    linesWrapper.appendChild(anchorLine);
  }

  function updateConnections() {
    const containerRect = container.getBoundingClientRect();

    lines.forEach(lineObj => {
      const targetNode = lineObj.targetNode;
      const sourceNode = nodes.find(n => n.dataset.id === lineObj.sourceId);

      if (!sourceNode || !targetNode) return;

      // Use bounding client rect to get exact rendered 2D screen positions of the 3D transformed nodes
      const sourceRect = sourceNode.querySelector('.node-image-wrapper').getBoundingClientRect();
      const targetRect = targetNode.querySelector('.node-image-wrapper').getBoundingClientRect();

      const r1 = sourceRect.width / 2;
      const r2 = targetRect.width / 2;

      // Calculate center relative to SVG container
      const x1 = sourceRect.left + r1 - containerRect.left;
      const y1 = sourceRect.top + r1 - containerRect.top;
      const x2 = targetRect.left + r2 - containerRect.left;
      const y2 = targetRect.top + r2 - containerRect.top;

      const dx = x2 - x1;
      const dy = y2 - y1;
      const length = Math.sqrt(dx * dx + dy * dy);

      if (length === 0) return;

      const nx = dx / length;
      const ny = dy / length;

      // Add 2px gap from edge
      const edgeX1 = x1 + nx * (r1 + 2);
      const edgeY1 = y1 + ny * (r1 + 2);
      const edgeX2 = x2 - nx * (r2 + 2);
      const edgeY2 = y2 - ny * (r2 + 2);

      lineObj.element.setAttribute("x1", edgeX1);
      lineObj.element.setAttribute("y1", edgeY1);
      lineObj.element.setAttribute("x2", edgeX2);
      lineObj.element.setAttribute("y2", edgeY2);
    });
  }

  function updateAnchorLine() {
    const activeId = popup.dataset.activeNodeId;
    if (!activeId || isMobile) return;

    const activeNode = nodes.find(n => n.dataset.id === activeId);
    if (!activeNode) return;

    const anchorLine = document.getElementById("popupAnchorLine");
    if (!anchorLine) return;

    const containerRect = container.getBoundingClientRect();
    const nodeImgRect = activeNode.querySelector('.node-image-wrapper').getBoundingClientRect();
    const popupRect = popup.getBoundingClientRect();

    // Node center
    const nx = nodeImgRect.left + (nodeImgRect.width / 2) - containerRect.left;
    const ny = nodeImgRect.top + (nodeImgRect.height / 2) - containerRect.top;

    // Popup edge mapping (simplified closest edge)
    const px = popupRect.left + (popupRect.width / 2) - containerRect.left;
    const py = popupRect.top + (popupRect.height / 2) - containerRect.top;

    anchorLine.setAttribute("x1", nx);
    anchorLine.setAttribute("y1", ny);
    anchorLine.setAttribute("x2", px);
    anchorLine.setAttribute("y2", py);
  }

  // --- Hover & Active States ---

  function handleHover(targetId, parentId, isHovering) {
    if (popup.classList.contains("is-open")) return; // Don't disrupt while popup is open

    if (isHovering) {
      nodes.forEach(n => {
        if (n.dataset.id !== targetId && n.dataset.id !== parentId && !n.classList.contains('center-node')) {
          n.classList.add("dimmed");
        }
      });
      lines.forEach(l => {
        if (l.memberId === targetId || l.sourceId === targetId) {
          l.element.classList.add("active");
        } else {
          l.element.style.opacity = "0.15";
        }
      });
    } else {
      nodes.forEach(n => n.classList.remove("dimmed"));
      lines.forEach(l => {
        l.element.classList.remove("active");
        l.element.style.opacity = "0.4";
      });
    }
  }

  // --- Popup Logic with Smart Positioning ---

  function openPopup(data, nodeElement) {
    // Populate data
    document.getElementById("popupImage").src = data.image;
    document.getElementById("popupName").textContent = data.name;
    document.getElementById("popupRole").textContent = data.role;
    document.getElementById("popupBio").textContent = data.bio;

    const skillsContainer = document.getElementById("popupSkills");
    skillsContainer.innerHTML = data.skills.map(s => `<li>${s}</li>`).join("");

    const linksContainer = document.getElementById("popupLinks");
    let linksHtml = "";
    if (data.links.linkedin) linksHtml += `<a href="${data.links.linkedin}" target="_blank">LINKEDIN</a>`;
    if (data.links.instagram) linksHtml += `<a href="${data.links.instagram}" target="_blank">INSTA</a>`;
    if (data.links.github) linksHtml += `<a href="${data.links.github}" target="_blank">GITHUB</a>`;
    linksContainer.innerHTML = linksHtml;

    popup.dataset.activeNodeId = data.id;
    popup.classList.add("is-open");
    popup.setAttribute("aria-hidden", "false");

    // Manage node states
    nodes.forEach(n => n.classList.remove("active-node", "dimmed"));
    nodeElement.classList.add("active-node");

    // Dim unrelated
    nodes.forEach(n => {
      if (n.dataset.id !== data.id && n.dataset.id !== data.parent && !n.classList.contains('center-node')) {
        n.classList.add("dimmed");
      }
    });

    lines.forEach(l => {
      if (l.memberId === data.id || l.sourceId === data.id) {
        l.element.classList.add("active");
      } else {
        l.element.style.opacity = "0.1";
      }
    });

    const anchorLine = document.getElementById("popupAnchorLine");
    if (anchorLine && !isMobile) anchorLine.style.opacity = "1";

    if (!isMobile) {
      positionPopup(nodeElement);
    }
  }

  function positionPopup(nodeElement) {
    // Use getBoundingClientRect for absolute screen coordinates regardless of 3D transform
    const nodeRect = nodeElement.querySelector('.node-image-wrapper').getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();

    // Render popup briefly to get its dimensions
    const popupWidth = 320;
    const popupHeight = popup.offsetHeight || 400; // fallback if not fully rendered

    // Space required between node and popup
    const gap = 30;

    // Center of the node
    const nodeCenterX = nodeRect.left - containerRect.left + (nodeRect.width / 2);
    const nodeCenterY = nodeRect.top - containerRect.top + (nodeRect.height / 2);

    // Calculate available space in each direction
    const spaceRight = containerRect.width - (nodeRect.right - containerRect.left);
    const spaceLeft = nodeRect.left - containerRect.left;
    const spaceBottom = containerRect.height - (nodeRect.bottom - containerRect.top);
    const spaceTop = nodeRect.top - containerRect.top;

    let finalX = 0;
    let finalY = 0;

    // Prefer Horizontal Placement First (Left or Right)
    if (spaceRight > popupWidth + gap && spaceRight > spaceLeft) {
      // Place Right
      finalX = (nodeRect.right - containerRect.left) + gap;
      finalY = nodeCenterY - (popupHeight / 2); // Center vertically
    }
    else if (spaceLeft > popupWidth + gap) {
      // Place Left
      finalX = (nodeRect.left - containerRect.left) - popupWidth - gap;
      finalY = nodeCenterY - (popupHeight / 2);
    }
    // Fallback to Vertical Placement (Top or Bottom)
    else if (spaceBottom > popupHeight + gap && spaceBottom > spaceTop) {
      // Place Bottom
      finalY = (nodeRect.bottom - containerRect.top) + gap;
      finalX = nodeCenterX - (popupWidth / 2);
    }
    else {
      // Place Top
      finalY = (nodeRect.top - containerRect.top) - popupHeight - gap;
      finalX = nodeCenterX - (popupWidth / 2);
    }

    // Edge guards
    const edgePadding = 15;
    if (finalX < edgePadding) finalX = edgePadding;
    if (finalY < edgePadding) finalY = edgePadding;
    if (finalX + popupWidth > containerRect.width - edgePadding) {
      finalX = containerRect.width - popupWidth - edgePadding;
    }
    if (finalY + popupHeight > containerRect.height - edgePadding) {
      finalY = containerRect.height - popupHeight - edgePadding;
    }

    popup.style.left = `${finalX}px`;
    popup.style.top = `${finalY}px`;

    updateAnchorLine(); // initial draw
  }

  function closePopup() {
    popup.classList.remove("is-open");
    popup.setAttribute("aria-hidden", "true");
    popup.dataset.activeNodeId = "";

    const anchorLine = document.getElementById("popupAnchorLine");
    if (anchorLine) anchorLine.style.opacity = "0";

    // Reset styles
    nodes.forEach(n => n.classList.remove("active-node", "dimmed"));
    lines.forEach(l => {
      l.element.classList.remove("active");
      l.element.style.opacity = "0.4";
    });
  }

  popupClose.addEventListener("click", (e) => {
    e.stopPropagation();
    closePopup();
  });

  container.addEventListener("click", () => {
    if (popup.classList.contains("is-open")) {
      closePopup();
    }
  });

  popup.addEventListener("click", (e) => {
    e.stopPropagation();
  });

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && popup.classList.contains("is-open")) {
      closePopup();
    }
  });

});
