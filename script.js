// Performance helpers (keep these)
const prefersReduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const isTouch = matchMedia('(hover: none)').matches;
const root = document.documentElement;
const systemTheme = window.matchMedia('(prefers-color-scheme: light)');
let pageVisible = true;
document.addEventListener('visibilitychange', () => { pageVisible = !document.hidden; });

// === Luxe cinematic animated background themes ===
const themes = [
  { name: "Obsidian", gradient: "radial-gradient(ellipse 70% 45% at 18% 14%, rgba(77, 141, 255, 0.22), transparent 62%), radial-gradient(ellipse 45% 35% at 82% 22%, rgba(255, 122, 217, 0.13), transparent 60%), linear-gradient(180deg, #020712 0%, #071325 52%, #030814 100%)" },
  { name: "Siri", gradient: "radial-gradient(ellipse 58% 38% at 24% 24%, rgba(114, 231, 255, 0.2), transparent 62%), radial-gradient(ellipse 50% 38% at 76% 36%, rgba(164, 140, 255, 0.16), transparent 64%), linear-gradient(180deg, #020712 0%, #06101f 54%, #030814 100%)" },
  { name: "Pale Blue", gradient: "radial-gradient(ellipse 68% 45% at 28% 18%, rgba(191, 232, 255, 0.17), transparent 64%), radial-gradient(ellipse 42% 34% at 82% 46%, rgba(95, 183, 255, 0.14), transparent 62%), linear-gradient(180deg, #030915 0%, #08172a 58%, #040815 100%)" }
];

// === Smooth Gradient Transition ===
let currentTheme = 0;
const bg = document.getElementById("background");
let nextTheme = 1;
let gradientT = 0;

function animateGradient() {
  if (!bg) return;
  if (root.classList.contains("light")) {
    requestAnimationFrame(animateGradient);
    return;
  }
  if (!pageVisible) {
    requestAnimationFrame(animateGradient);
    return;
  }

  gradientT += 0.0007;
  if (gradientT >= 1) {
    gradientT = 0;
    currentTheme = nextTheme;
    nextTheme = (nextTheme + 1) % themes.length;
  }

  bg.style.transition = "background 6s ease-in-out";
  bg.style.background = themes[currentTheme].gradient;
  requestAnimationFrame(animateGradient);
}
if (!prefersReduce) animateGradient();

function setBackgroundTheme() {
  if (!bg) return;
  if (root.classList.contains("light")) {
    bg.style.transition = "background 0.6s ease";
    bg.style.background = "radial-gradient(ellipse 70% 42% at 18% 10%, rgba(84, 196, 255, 0.2), transparent 62%), radial-gradient(ellipse 48% 36% at 82% 18%, rgba(255, 150, 222, 0.1), transparent 64%), radial-gradient(ellipse 55% 40% at 58% 78%, rgba(167, 150, 255, 0.08), transparent 66%), linear-gradient(180deg, #ffffff 0%, #f5fbff 46%, #ffffff 100%)";
  }
}


// Year
document.getElementById("year").textContent = new Date().getFullYear();

// Light/Dark toggle with smooth transition
const toggle = document.getElementById("themeToggle");
function applyTheme(theme, persist = false) {
  root.style.transition = "background 0.5s ease";
  root.classList.toggle("light", theme === "light");
  setBackgroundTheme();
  if (toggle) toggle.textContent = theme === "light" ? "☀️" : "🌙";
  if (persist) localStorage.setItem("theme", theme);
}

const savedTheme = localStorage.getItem("theme");
applyTheme(savedTheme || (systemTheme.matches ? "light" : "dark"));

systemTheme.addEventListener?.("change", (event) => {
  if (localStorage.getItem("theme")) return;
  applyTheme(event.matches ? "light" : "dark");
});

toggle?.addEventListener("click", () => {
  applyTheme(root.classList.contains("light") ? "dark" : "light", true);
});

// Reversible cinematic scroll reveal.
const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add("visible");
      entry.target.classList.remove("visible-out");
    } else if (entry.boundingClientRect.top < 0) {
      entry.target.classList.remove("visible");
      entry.target.classList.add("visible-out");
    } else {
      entry.target.classList.remove("visible", "visible-out");
    }
  });
}, {
  threshold: [0, 0.12, 0.45],
  rootMargin: "-8% 0px -10% 0px"
});

document.querySelectorAll(".reveal").forEach((el) => observer.observe(el));

// Subtle handcrafted parallax that reverses naturally while scrolling.
(function cinematicParallax() {
  if (prefersReduce) return;

  const layers = Array.from(document.querySelectorAll("[data-depth]"));
  if (!layers.length) return;

  let ticking = false;
  function update() {
    ticking = false;
    const viewportMid = window.innerHeight * 0.5;
    layers.forEach((layer) => {
      const depth = Number(layer.dataset.depth || 0);
      const rect = layer.getBoundingClientRect();
      const layerMid = rect.top + rect.height * 0.5;
      const offset = (layerMid - viewportMid) * depth;
      layer.style.setProperty("--parallax-y", `${Math.max(-70, Math.min(70, offset)).toFixed(2)}px`);
    });
  }

  function requestUpdate() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(update);
  }

  window.addEventListener("scroll", requestUpdate, { passive: true });
  window.addEventListener("resize", requestUpdate, { passive: true });
  update();
})();

// Pointer-driven ambience for the hero light field.
(function pointerAmbience() {
  if (prefersReduce || isTouch) return;

  let ticking = false;
  let x = 50;
  let y = 18;

  window.addEventListener("pointermove", (event) => {
    x = (event.clientX / window.innerWidth) * 100;
    y = (event.clientY / window.innerHeight) * 100;
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      document.body.style.setProperty("--cursor-x", `${x.toFixed(2)}%`);
      document.body.style.setProperty("--cursor-y", `${y.toFixed(2)}%`);
      ticking = false;
    });
  }, { passive: true });
})();

// Apple-style smooth tilt on hover (desktop only)
if (!isTouch && !prefersReduce) {
  document.querySelectorAll(".tilt").forEach((card) => {
    let rect;
    const damp = 25; // More subtle tilt
    let animationId;

    function update(e) {
      rect = rect || card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const rx = ((y - rect.height / 2) / damp);
      const ry = -((x - rect.width / 2) / damp);
      card.style.transform = `perspective(1000px) rotateX(${rx}deg) rotateY(${ry}deg) scale3d(1.02, 1.02, 1.02)`;
    }

    function reset() {
      rect = null;
      card.style.transform = "perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)";
    }

    card.addEventListener("mouseenter", () => {
      card.style.transition = "transform 0.15s ease-out";
    }, { passive: true });

    card.addEventListener("mousemove", update, { passive: true });
    card.addEventListener("mouseleave", () => {
      card.style.transition = "transform 0.4s ease-out";
      reset();
    }, { passive: true });
  });
}

// Apple-style magnetic buttons (desktop only)
if (!isTouch && !prefersReduce) {
  const magnets = document.querySelectorAll(".magnet");
  magnets.forEach(el => {
    const strength = 15; // Subtle magnetic effect
    let rect;

    function move(e) {
      rect = rect || el.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      el.style.transition = "transform 0.15s ease-out";
      el.style.transform = `translate(${x / strength}px, ${y / strength}px)`;
    }

    function reset() {
      rect = null;
      el.style.transition = "transform 0.3s ease-out";
      el.style.transform = "translate(0,0)";
    }

    el.addEventListener("mousemove", move, { passive: true });
    el.addEventListener("mouseleave", reset, { passive: true });
  });
}


// iOS "liquid" orb animation with mouse attraction
(function liquidOrb() {
  if (prefersReduce) return;

  const wrapper = document.getElementById("liquid");
  if (!wrapper) return;
  const drops = Array.from(wrapper.querySelectorAll(".drop"));

  drops.forEach((d) => {
    d.style.setProperty("--phase", (Math.random() * Math.PI * 2).toFixed(3));
    d.style.left = d.style.left || `${10 + Math.random() * 70}%`;
    d.style.top = d.style.top || `${10 + Math.random() * 70}%`;
  });

  let mouse = { x: 0.5, y: 0.5, inside: false };
  wrapper.addEventListener("pointerenter", () => (mouse.inside = true), { passive: true });
  wrapper.addEventListener("pointerleave", () => (mouse.inside = false), { passive: true });
  wrapper.addEventListener("pointermove", (e) => {
    const rect = wrapper.getBoundingClientRect();
    mouse.x = (e.clientX - rect.left) / rect.width;
    mouse.y = (e.clientY - rect.top) / rect.height;
  }, { passive: true });

  function animate() {
    if (!pageVisible) { requestAnimationFrame(animate); return; }

    drops.forEach((d, i) => {
      const phase = parseFloat(getComputedStyle(d).getPropertyValue("--phase")) + 0.0025 * (i + 1);
      d.style.setProperty("--phase", phase.toString());
      const baseX = 0.5 + Math.sin(phase + i) * 0.18;
      const baseY = 0.5 + Math.cos(phase * 1.1 + i) * 0.18;
      let targetX = baseX, targetY = baseY;
      if (mouse.inside) {
        targetX = baseX * 0.75 + mouse.x * 0.25;
        targetY = baseY * 0.75 + mouse.y * 0.25;
      }
      d.style.left = `calc(${(targetX * 100).toFixed(2)}% - ${d.offsetWidth / 2}px)`;
      d.style.top = `calc(${(targetY * 100).toFixed(2)}% - ${d.offsetHeight / 2}px)`;
    });

    requestAnimationFrame(animate);
  }
  requestAnimationFrame(animate);
})();


// Apple-style subtle sparkles on canvas
(function sparkles() {
  if (prefersReduce) return;

  const c = document.getElementById('sparkles');
  if (!c) return;
  const ctx = c.getContext('2d', { alpha: true });

  let w, h, stars, scale, last = 0;

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    scale = dpr;
    w = Math.floor(window.innerWidth);
    h = Math.floor(window.innerHeight);
    c.width = Math.max(1, w * scale);
    c.height = Math.max(1, h * scale);
    c.style.width = w + 'px';
    c.style.height = h + 'px';
    ctx.setTransform(scale, 0, 0, scale, 0, 0);

    // Fewer, more subtle stars for Apple aesthetic
    const target = Math.min(60, Math.floor((w * h) / 35000));
    stars = Array.from({ length: target }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      z: Math.random() * 0.6 + 0.4,
      r: Math.random() * 1.2 + 0.3,
      pulse: Math.random() * Math.PI * 2
    }));
  }

  function draw(ts) {
    if (!pageVisible) { requestAnimationFrame(draw); return; }
    if (ts - last < 50) { requestAnimationFrame(draw); return; } // ~20fps for battery
    last = ts;

    ctx.clearRect(0, 0, w, h);

    for (const s of stars) {
      s.pulse += 0.02;
      const alpha = 0.3 + 0.3 * Math.sin(s.pulse);
      const parallaxY = (window.scrollY * 0.02) * s.z;

      ctx.globalAlpha = alpha * s.z;
      ctx.beginPath();
      ctx.arc(s.x, (s.y + parallaxY) % h, s.r, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(200, 215, 255, 0.8)";
      ctx.fill();
    }
    requestAnimationFrame(draw);
  }

  window.addEventListener('resize', debounce(resize, 200), { passive: true });
  resize();
  requestAnimationFrame(draw);
})();
function debounce(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }


// Apple-style smooth scroll progress
(function progress() {
  const bar = document.getElementById('scrollProgress');
  if (!bar) return;

  let max = 1;
  let currentWidth = 0;
  let targetWidth = 0;

  function updateMax() {
    max = Math.max(1, document.body.scrollHeight - window.innerHeight);
  }

  function update() {
    targetWidth = (window.scrollY / max) * 100;
  }

  // Smooth animation for progress bar
  function animate() {
    const diff = targetWidth - currentWidth;
    currentWidth += diff * 0.1; // Smooth easing
    bar.style.width = `${currentWidth}%`;
    requestAnimationFrame(animate);
  }

  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', () => { updateMax(); update(); }, { passive: true });

  updateMax();
  update();
  animate();
})();

// One-click return to the top once visitors reach the final scene.
(function scrollToTopButton() {
  const button = document.getElementById('scrollToTop');
  if (!button) return;

  button.addEventListener('click', () => {
    const behavior = prefersReduce ? 'auto' : 'smooth';
    document.documentElement.scrollTo({ top: 0, behavior });
    document.body.scrollTo?.({ top: 0, behavior });
    window.scrollTo({ top: 0, behavior });
  });
  button.classList.add('visible');
})();

// Contact form via local SMTP endpoint.
(function contactForm() {
  const form = document.getElementById('contactForm');
  const status = document.getElementById('contactStatus');

  if (!form || !status) return;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const submitButton = form.querySelector('button[type="submit"]');
    const originalText = submitButton?.textContent || 'Send';
    const formData = new FormData(form);
    const payload = Object.fromEntries(formData.entries());

    status.className = 'contact-status';
    status.textContent = 'Sending...';
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = 'Sending';
    }

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || 'Unable to send message.');
      }

      form.reset();
      status.className = 'contact-status success';
      status.textContent = 'Message sent. Thanks for reaching out!';
    } catch (error) {
      status.className = 'contact-status error';
      status.textContent = error.message || 'Unable to send message.';
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = originalText;
      }
    }
  });
})();

// === Mobile menu open/close ===
(function mobileMenu() {
  const menu = document.getElementById('mobileMenu');
  const scrim = document.getElementById('scrim');
  const btnOpen = document.getElementById('menuToggle');
  const btnClose = document.getElementById('menuClose');

  if (!menu || !btnOpen || !scrim) return;

  function open() {
    menu.dataset.open = "true";
    scrim.hidden = false;
    document.body.classList.add('menu-open');
    btnOpen.setAttribute('aria-expanded', 'true');
  }
  function close() {
    delete menu.dataset.open;
    scrim.hidden = true;
    document.body.classList.remove('menu-open');
    btnOpen.setAttribute('aria-expanded', 'false');
  }

  btnOpen.addEventListener('click', open);
  btnClose?.addEventListener('click', close);
  scrim.addEventListener('click', close);

  // close when a link is tapped
  menu.querySelectorAll('a[href^="#"], a[target="_blank"]').forEach(a => {
    a.addEventListener('click', close);
  });

  // close with Escape
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
})();


// Close mobile menu whenever we switch to desktop width
(function () {
  const mq = window.matchMedia('(min-width: 901px)');
  const menu = document.getElementById('mobileMenu');
  const scrim = document.getElementById('scrim');
  const btnOpen = document.getElementById('menuToggle');

  function closeMenu() {
    if (!menu) return;
    delete menu.dataset.open;
    if (scrim) scrim.hidden = true;
    document.body.classList.remove('menu-open');
    if (btnOpen) btnOpen.setAttribute('aria-expanded', 'false');
  }

  // If page loads already wide, ensure it's closed
  if (mq.matches) closeMenu();

  // When crossing to desktop, close it
  mq.addEventListener('change', (e) => {
    if (e.matches) closeMenu();
  });
})();

// Grab modal elements
const modal = document.getElementById("projectModal");
const modalTitle = document.getElementById("modalTitle");
const modalLinks = document.getElementById("modalLinks");
const closeBtn = document.getElementById("modalClose"); // updated selector ✅

function openProjectModal() {
  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
  closeBtn?.focus();
}

function closeProjectModal() {
  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
}

// Define project links
const projectLinks = {
  stallsync: [
    { name: "Backend Repo.", url: "https://github.com/zhzhhyzh/StallSync-api" },
    { name: "Frontend (Website, Admin) Repo.", url: "https://github.com/zhzhhyzh/stallsync-portal" },
    { name: "Frontend (Mobile, Client) Repo", url: "https://github.com/WwwWKit/Stallsync-native" },
    { name: "Testing Script", url: "https://github.com/zhzhhyzh/StallSync-testscript" }
  ],
  invento: [
    { name: "Backend Repo.", url: "https://github.com/zhzhhyzh/invento-api" },
    { name: "Frontend Repo.", url: "https://github.com/zhzhhyzh/invento-portal" }
  ],
  mltoolkit: [
    { name: "Time-series Algorithm (ARIMA)", url: "https://github.com/zhzhhyzh/Time-series-algorithm" },
    { name: "Collaborative Recommendation", url: "https://github.com/zhzhhyzh/StallSync-Recommendation" },
    { name: "Backend for Reinforcement Learning", url: "https://github.com/zhzhhyzh/PERSIS-api" },
    { name: "Chatbot", url: "https://github.com/zhzhhyzh/ChatterBot" }
  ],
  opengl: [
    { name: "Poseidon", url: "https://github.com/zhzhhyzh/opengl_poseidon" },
    { name: "London Bridge", url: "https://github.com/zhzhhyzh/opengl-bridge" }
  ],
  mobileapp: [
    { name: "Network Connection App.", url: "https://github.com/zhzhhyzh/velora-flutter" },
    { name: "Inventory App.", url: "https://github.com/zhzhhyzh/flutter-inventory-app" }
  ],
  blockchain: [
    { name: "Timelock Fund Transfer", url: "https://github.com/zhzhhyzh/Timelock-Solidity" }
  ],
  snake: [
    { name: "Play Snake Game", url: "https://zhzhhyzh.github.io/snake-game/" },
    { name: "Play Tetris", url: "https://zhzhhyzh.github.io/tetris-game" },
    { name: "Play Slot Verse", url: "https://zhzhhyzh.github.io/slot-verse" },
    { name: "Play Count Stickman Game", url: "https://zhzhhyzh.github.io/count-stickman-game" },
    { name: "Play Upgrade Supercar Game", url: "https://zhzhhyzh.github.io/upgrade-car-game" },
    { name: "Play Dress Up Game", url: "https://zhzhhyzh.github.io/dress-up-game" },
  ],
  owndev: [
    { name: "Dev. needed tools", url: "https://zhzhhyzh-dev-tools.vercel.app/" },
    { name: "PDF Tools", url: "https://zhzhhyzh-pdf-tools.vercel.app/" },
    { name: "Currency Converter", url: "https://currency-frontend-3mdz.onrender.com/" }
  ],
  agentic: [
    { name: "Agentic AI Bank", url: "https://github.com/zhzhhyzh/AI-Banking" },
  ],
};

// Handle "View Project" clicks
document.querySelectorAll(".view-btn").forEach(btn => {
  btn.addEventListener("click", e => {
    e.preventDefault();
    const project = btn.dataset.project;
    const links = projectLinks[project] || [];

    // Set modal title safely
    const parentCard = btn.closest(".project");
    modalTitle.textContent = parentCard ? parentCard.querySelector("h3").textContent : "Select a link";

    // Populate modal with links
    modalLinks.innerHTML = links
      .map(link => `<a href="${link.url}" target="_blank" rel="noopener noreferrer">${link.name}</a>`)
      .join("");

    // Show modal
    openProjectModal();
  });
});

// ✅ Close button click
closeBtn?.addEventListener("click", closeProjectModal);

// ✅ Click outside modal content to close
window.addEventListener("click", e => {
  if (e.target === modal) {
    closeProjectModal();
  }
});

window.addEventListener("keydown", e => {
  if (e.key === "Escape" && modal?.classList.contains("open")) {
    closeProjectModal();
  }
});

// =========================================================
// SKILLS BANNER - Drag to Scroll Functionality
// =========================================================
function initBannerDrag(bannerId, trackClass) {
  const banner = document.getElementById(bannerId);
  if (!banner) return;

  const track = banner.querySelector(trackClass);
  if (!track) return;

  let isDragging = false;
  let startX;
  let scrollLeft;
  let currentTranslate = 0;
  let animationPaused = false;

  // Get current translateX from animation
  function getCurrentTranslate() {
    const style = window.getComputedStyle(track);
    const matrix = new DOMMatrix(style.transform);
    return matrix.m41;
  }

  // Pause animation and set current position
  function pauseAnimation() {
    if (!animationPaused) {
      currentTranslate = getCurrentTranslate();
      track.style.animation = 'none';
      track.style.transform = `translateX(${currentTranslate}px)`;
      animationPaused = true;
    }
  }

  // Resume animation from current position
  function resumeAnimation() {
    if (animationPaused && !isDragging) {
      // Calculate what percentage through the animation we are
      const trackWidth = track.scrollWidth / 2;
      const progress = Math.abs(currentTranslate) / trackWidth;

      // Resume animation
      track.style.transform = '';
      track.style.animation = '';
      animationPaused = false;
    }
  }

  // Mouse events
  banner.addEventListener('mousedown', (e) => {
    isDragging = true;
    banner.classList.add('dragging');
    startX = e.pageX;
    pauseAnimation();
    scrollLeft = currentTranslate;
  });

  banner.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    e.preventDefault();
    const x = e.pageX;
    const walk = (x - startX) * 1.5; // Drag sensitivity
    currentTranslate = scrollLeft + walk;

    // Keep within bounds (loop)
    const trackWidth = track.scrollWidth / 2;
    if (currentTranslate > 0) currentTranslate = -trackWidth + currentTranslate;
    if (currentTranslate < -trackWidth) currentTranslate = currentTranslate + trackWidth;

    track.style.transform = `translateX(${currentTranslate}px)`;
  });

  banner.addEventListener('mouseup', () => {
    isDragging = false;
    banner.classList.remove('dragging');
    // Resume animation after a short delay
    setTimeout(resumeAnimation, 2000);
  });

  banner.addEventListener('mouseleave', () => {
    if (isDragging) {
      isDragging = false;
      banner.classList.remove('dragging');
      setTimeout(resumeAnimation, 2000);
    }
  });

  // Touch events for mobile
  banner.addEventListener('touchstart', (e) => {
    isDragging = true;
    banner.classList.add('dragging');
    startX = e.touches[0].pageX;
    pauseAnimation();
    scrollLeft = currentTranslate;
  }, { passive: true });

  banner.addEventListener('touchmove', (e) => {
    if (!isDragging) return;
    const x = e.touches[0].pageX;
    const walk = (x - startX) * 1.5;
    currentTranslate = scrollLeft + walk;

    const trackWidth = track.scrollWidth / 2;
    if (currentTranslate > 0) currentTranslate = -trackWidth + currentTranslate;
    if (currentTranslate < -trackWidth) currentTranslate = currentTranslate + trackWidth;

    track.style.transform = `translateX(${currentTranslate}px)`;
  }, { passive: true });

  banner.addEventListener('touchend', () => {
    isDragging = false;
    banner.classList.remove('dragging');
    setTimeout(resumeAnimation, 2000);
  });
}

// Initialize both banners
document.addEventListener('DOMContentLoaded', () => {
  initBannerDrag('skillsBanner', '.skills-track');
  initBannerDrag('iconBanner', '.icon-track');
});
