// Performance helpers (keep these)
const prefersReduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const isTouch = matchMedia('(hover: none)').matches;
let pageVisible = true;
document.addEventListener('visibilitychange', () => { pageVisible = !document.hidden; });

// === Apple-Inspired Animated Background Themes ===
const themes = [
  { name: "Ocean", gradient: "radial-gradient(ellipse 80% 50% at 30% 40%, rgba(0, 113, 227, 0.18), transparent), radial-gradient(ellipse 60% 40% at 70% 60%, rgba(168, 85, 247, 0.12), transparent)" },
  { name: "Aurora", gradient: "radial-gradient(ellipse 70% 50% at 25% 35%, rgba(99, 102, 241, 0.15), transparent), radial-gradient(ellipse 60% 45% at 75% 65%, rgba(236, 72, 153, 0.12), transparent)" },
  { name: "Sunset", gradient: "radial-gradient(ellipse 75% 50% at 35% 45%, rgba(251, 146, 60, 0.14), transparent), radial-gradient(ellipse 55% 40% at 65% 55%, rgba(244, 63, 94, 0.11), transparent)" }
];

// === Smooth Gradient Transition ===
let currentTheme = 0;
const bg = document.getElementById("background");
let nextTheme = 1;
let gradientT = 0;

function animateGradient() {
  if (!pageVisible) {
    requestAnimationFrame(animateGradient);
    return;
  }
  
  gradientT += 0.001; // Slower for smoother Apple-like transition
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


// Year
document.getElementById("year").textContent = new Date().getFullYear();

// Light/Dark toggle with smooth transition
const root = document.documentElement;
const toggle = document.getElementById("themeToggle");
toggle.addEventListener("click", () => {
  root.style.transition = "background 0.5s ease";
  root.classList.toggle("light");
  // Update toggle icon
  toggle.textContent = root.classList.contains("light") ? "🌙" : "🌓";
});

// Apple-style scroll reveal with staggered animations
const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry, index) => {
    if (entry.isIntersecting) {
      // Add staggered delay for smoother reveal
      setTimeout(() => {
        entry.target.classList.add("visible");
      }, index * 100);
      observer.unobserve(entry.target);
    }
  });
}, { 
  threshold: 0.08,
  rootMargin: "0px 0px -50px 0px"
});

document.querySelectorAll(".reveal").forEach((el) => observer.observe(el));

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
      .map(link => `<a href="${link.url}" target="_blank">${link.name}</a>`)
      .join("");

    // Show modal
    modal.style.display = "block";
  });
});

// ✅ Close button click
closeBtn.addEventListener("click", () => {
  modal.style.display = "none";
});

// ✅ Click outside modal content to close
window.addEventListener("click", e => {
  if (e.target === modal) {
    modal.style.display = "none";
  }
});
