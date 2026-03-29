// =========================================================
// AI Chatbot - Zhe Heng's Personal Assistant
// =========================================================

(function() {
  'use strict';
  
  // Configuration
  const CONFIG = {
    botName: "Zhe Heng's AI",
    greeting: "Hi! I'm Zhe Heng's AI assistant. Ask me anything about his skills, projects, experience, or how to get in touch!",
    quickActions: [
      "What are your skills?",
      "Tell me about your projects",
      "Work experience?",
      "How to contact you?",
      "GitHub profile"
    ]
  };

  // Zhe Heng's Information (for context)
  const ZHE_HENG_INFO = {
    name: "Yeoh Zhe Heng",
    nickname: "Zhe Heng",
    title: "Software Engineer | Full-Stack Developer | AI & Cloud Enthusiast",
    location: "Kuala Lumpur, Malaysia",
    email: "henryyzh0309@gmail.com",
    
    // Social Media & Profiles
    github: "https://github.com/zhzhhyzh",
    linkedin: "https://linkedin.com/in/zhzhhyzh",
    leetcode: "https://leetcode.com/zhzhhyzh",
    facebook: "https://facebook.com/zhzhhyzh",
    instagram: "https://instagram.com/zhzhhyzh",
    
    // Personal Info (for social media context)
    personalInfo: {
      interests: ["Software Development", "AI/ML", "Cloud Technologies", "Problem Solving", "Hackathons"],
      hobbies: ["Coding", "Learning new technologies", "Building projects", "Competitive programming"],
      personality: "Passionate, hardworking, detail-oriented, team player",
      currentFocus: "Backend engineering at Ant International, exploring payment systems and IoT"
    },
    
    education: {
      university: "Tunku Abdul Rahman University of Management & Technology (TARUMT)",
      degree: "Bachelor of Software Engineering (Hons)",
      period: "2023 - 2026",
      cgpa: "3.97",
      achievements: ["President's List x5", "Soft Skill Competency Gold Award", "Bachelor's Degree Scholarship Recipient"]
    },
    
    skills: {
      languages: ["Java", "JavaScript", "TypeScript", "Python", "C++"],
      backend: ["Spring Boot", "Node.js", "Express.js"],
      frontend: ["React", "Flutter"],
      databases: ["MySQL", "MongoDB"],
      cloud: ["AWS (EC2, RDS, S3)", "Docker", "Kubernetes"],
      ai_ml: ["Reinforcement Learning (PPO, Q-learning)", "Time-Series Forecasting", "Scikit-learn", "Pandas"],
      tools: ["Git/GitHub/GitLab", "PM2", "Postman", "Figma", "VS Code", "IntelliJ"]
    },
    
    experience: [
      {
        role: "Java Backend Engineer",
        company: "Ant International",
        location: "TRX 106, Kuala Lumpur",
        period: "Nov 2025 – Present",
        highlights: [
          "Payment innovation solutions using SOFA stack",
          "IoT backend development",
          "RESTful APIs for payment systems"
        ]
      },
      {
        role: "Project Developer",
        company: "Persis (Remote)",
        period: "Mar 2025 – Sep 2025",
        highlights: [
          "Built Persis App with RL for personalized analytics",
          "Node.js backend + Python AI + Flutter frontend",
          "AWS EC2 deployment with PM2"
        ]
      },
      {
        role: "Full-Stack Developer",
        company: "33Digitec Solution",
        location: "Petaling Jaya, Kuala Lumpur",
        period: "Mar 2023 – Mar 2025",
        highlights: [
          "RESTful APIs using Node.js and Express",
          "Responsive React components",
          "Agile development with Git"
        ]
      }
    ],
    
    projects: [
      {
        name: "StallSync",
        description: "Full-stack canteen management system with React, Node.js, MySQL",
        features: ["Orders", "Inventory", "Rewards", "Analytics"]
      },
      {
        name: "Invento",
        description: "Inventory management with Spring Boot and React"
      },
      {
        name: "AI/ML Projects",
        description: "RL (PPO/Q-learning) and time-series forecasting on AWS"
      },
      {
        name: "OpenGL 3D",
        description: "3D objects with lighting and different views using C++"
      },
      {
        name: "Blockchain",
        description: "Solidity smart contracts with Node.js integration"
      },
      {
        name: "Mobile Apps",
        description: "Flutter/Dart apps with MVC architecture"
      }
    ],
    
    languages: {
      mandarin: "Native",
      english: "Proficient",
      malay: "Independent"
    },
    
    certifications: ["AWS Cloud (Beginner/Practitioner track)"],
    
    achievements: [
      "TARUMT Bachelor's Degree Scholarship Recipient",
      "President's List x5",
      "Soft Skills Competency Gold Award",
      "Hackathon & Student Exchange (Vietnam, China, U.S.)"
    ]
  };

  // Create chatbot HTML
  function createChatbotHTML() {
    const chatbotHTML = `
      <!-- Chatbot Toggle Button -->
      <button class="chatbot-toggle" id="chatbotToggle" aria-label="Open chat">
        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2C6.48 2 2 6.48 2 12c0 1.54.36 2.98.97 4.29L2 22l5.71-.97C9.02 21.64 10.46 22 12 22c5.52 0 10-4.48 10-10S17.52 2 12 2zm-1 15h2v-2h-2v2zm0-4h2V7h-2v6z"/>
        </svg>
      </button>
      
      <!-- Chat Window -->
      <div class="chatbot-window" id="chatbotWindow">
        <div class="chatbot-header">
          <div class="chatbot-avatar">🤖</div>
          <div class="chatbot-info">
            <div class="chatbot-name">${CONFIG.botName}</div>
            <div class="chatbot-status">Online • Ask me anything</div>
          </div>
          <button class="chatbot-close" id="chatbotClose" aria-label="Close chat">✕</button>
        </div>
        
        <div class="chatbot-messages" id="chatbotMessages">
          <!-- Messages will be inserted here -->
        </div>
        
        <div class="chatbot-quick-actions" id="chatbotQuickActions">
          ${CONFIG.quickActions.map(action => `<button class="quick-action">${action}</button>`).join('')}
        </div>
        
        <div class="chatbot-input-area">
          <textarea 
            class="chatbot-input" 
            id="chatbotInput" 
            placeholder="Ask about Zhe Heng..."
            rows="1"
          ></textarea>
          <button class="chatbot-send" id="chatbotSend" aria-label="Send message">
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
            </svg>
          </button>
        </div>
      </div>
    `;
    
    const container = document.createElement('div');
    container.id = 'chatbot-container';
    container.innerHTML = chatbotHTML;
    document.body.appendChild(container);
    
    // Add backdrop for mobile tap-to-close
    const backdrop = document.createElement('div');
    backdrop.className = 'chatbot-backdrop';
    backdrop.id = 'chatbotBackdrop';
    document.body.appendChild(backdrop);
  }

  // Draggable functionality
  function initDraggable() {
    const toggle = document.getElementById('chatbotToggle');
    let isDragging = false;
    let hasMoved = false;
    let startX, startY, initialX, initialY;
    
    function getPosition() {
      const rect = toggle.getBoundingClientRect();
      return { x: rect.left, y: rect.top };
    }
    
    function setPosition(x, y) {
      const maxX = window.innerWidth - toggle.offsetWidth;
      const maxY = window.innerHeight - toggle.offsetHeight;
      
      // Keep within bounds
      x = Math.max(0, Math.min(x, maxX));
      y = Math.max(0, Math.min(y, maxY));
      
      toggle.style.left = x + 'px';
      toggle.style.top = y + 'px';
      toggle.style.right = 'auto';
      toggle.style.bottom = 'auto';
    }
    
    function onStart(e) {
      const event = e.touches ? e.touches[0] : e;
      isDragging = true;
      hasMoved = false;
      startX = event.clientX;
      startY = event.clientY;
      
      const pos = getPosition();
      initialX = pos.x;
      initialY = pos.y;
      
      toggle.classList.add('dragging');
      e.preventDefault();
    }
    
    function onMove(e) {
      if (!isDragging) return;
      
      const event = e.touches ? e.touches[0] : e;
      const deltaX = event.clientX - startX;
      const deltaY = event.clientY - startY;
      
      // Check if actually moved (threshold of 5px)
      if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
        hasMoved = true;
      }
      
      setPosition(initialX + deltaX, initialY + deltaY);
      e.preventDefault();
    }
    
    function onEnd(e) {
      if (!isDragging) return;
      isDragging = false;
      toggle.classList.remove('dragging');
      
      // If not moved much, treat as click
      if (!hasMoved) {
        toggleChat();
      }
      
      // Save position
      savePosition();
    }
    
    // Mouse events
    toggle.addEventListener('mousedown', onStart);
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onEnd);
    
    // Touch events
    toggle.addEventListener('touchstart', onStart, { passive: false });
    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('touchend', onEnd);
    
    // Restore saved position
    restorePosition();
  }
  
  function savePosition() {
    const toggle = document.getElementById('chatbotToggle');
    const rect = toggle.getBoundingClientRect();
    localStorage.setItem('chatbotPosition', JSON.stringify({
      x: rect.left,
      y: rect.top
    }));
  }
  
  function restorePosition() {
    const saved = localStorage.getItem('chatbotPosition');
    if (saved) {
      try {
        const pos = JSON.parse(saved);
        const toggle = document.getElementById('chatbotToggle');
        toggle.style.left = pos.x + 'px';
        toggle.style.top = pos.y + 'px';
        toggle.style.right = 'auto';
        toggle.style.bottom = 'auto';
      } catch (e) {
        // Use default position
      }
    }
  }

  // Chat functionality
  let isOpen = false;
  let isTyping = false;
  
  function toggleChat() {
    const chatWindow = document.getElementById('chatbotWindow');
    const toggle = document.getElementById('chatbotToggle');
    const backdrop = document.getElementById('chatbotBackdrop');
    
    isOpen = !isOpen;
    chatWindow.classList.toggle('open', isOpen);
    toggle.classList.toggle('active', isOpen);
    
    // Show/hide backdrop on mobile
    if (backdrop) {
      backdrop.classList.toggle('visible', isOpen);
    }
    
    if (isOpen) {
      // Show greeting if first time
      const messages = document.getElementById('chatbotMessages');
      if (messages.children.length === 0) {
        addMessage(CONFIG.greeting, 'bot');
      }
      document.getElementById('chatbotInput').focus();
    }
  }
  
  function addMessage(text, type) {
    const messages = document.getElementById('chatbotMessages');
    const msg = document.createElement('div');
    msg.className = `chat-message ${type}`;
    msg.textContent = text;
    messages.appendChild(msg);
    messages.scrollTop = messages.scrollHeight;
  }
  
  function showTyping() {
    const messages = document.getElementById('chatbotMessages');
    const typing = document.createElement('div');
    typing.className = 'chat-message bot typing';
    typing.id = 'typingIndicator';
    typing.innerHTML = '<span></span><span></span><span></span>';
    messages.appendChild(typing);
    messages.scrollTop = messages.scrollHeight;
  }
  
  function hideTyping() {
    const typing = document.getElementById('typingIndicator');
    if (typing) typing.remove();
  }
  
  async function sendMessage(text) {
    if (!text.trim() || isTyping) return;
    
    // Add user message
    addMessage(text, 'user');
    
    // Clear input
    const input = document.getElementById('chatbotInput');
    input.value = '';
    input.style.height = 'auto';
    
    // Hide quick actions after first message
    document.getElementById('chatbotQuickActions').style.display = 'none';
    
    // Show typing indicator
    isTyping = true;
    showTyping();
    
    try {
      // Get AI response
      const response = await getAIResponse(text);
      hideTyping();
      addMessage(response, 'bot');
    } catch (error) {
      hideTyping();
      addMessage("Sorry, I couldn't process that. Please try again!", 'bot');
    }
    
    isTyping = false;
  }
  
  // AI Response Logic (local processing + optional API)
  async function getAIResponse(question) {
    const q = question.toLowerCase();
    
    // Try local matching first (faster, no API cost)
    const localResponse = getLocalResponse(q);
    if (localResponse) {
      // Simulate typing delay
      await new Promise(r => setTimeout(r, 500 + Math.random() * 500));
      return localResponse;
    }
    
    // Try API if available
    try {
      const apiResponse = await fetchAPIResponse(question);
      if (apiResponse) return apiResponse;
    } catch (e) {
      console.log('API not available, using fallback');
    }
    
    // Fallback response - strict focus on Zhe Heng
    await new Promise(r => setTimeout(r, 500));
    const fallbacks = [
      `I'm Zhe Heng's assistant and can only answer questions about him. Try asking about his skills, projects, work experience, or contact info!`,
      `That's outside my expertise. I specialize in Zhe Heng's professional background - his skills (Java, Node.js, React, AI/ML), projects, or experience. What would you like to know?`,
      `I focus specifically on Zhe Heng's profile. Ask me about his work at Ant International, his projects like StallSync, or how to connect with him!`,
      `I can only help with questions about Zhe Heng. Try: "What are his skills?" or "How do I contact him?" or "Tell me about his projects!"`
    ];
    return fallbacks[Math.floor(Math.random() * fallbacks.length)];
  }
  
  function getLocalResponse(q) {
    const info = ZHE_HENG_INFO;
    
    // Normalize the query - handle variations
    const normalized = q
      .replace(/zhe\s*heng'?s?|zheheng'?s?/gi, 'his')
      .replace(/\byour\b/gi, 'his')
      .replace(/\byou\b/gi, 'he')
      .replace(/what'?s|what is/gi, 'what')
      .toLowerCase();
    
    // Greetings
    if (q.match(/^(hi|hello|hey|greetings|good\s*(morning|afternoon|evening)|howdy|sup)/i)) {
      const greetings = [
        `Hello! I'm here to help you learn about ${info.name}. He's a ${info.title} based in ${info.location}. What would you like to know?`,
        `Hey there! 👋 I can tell you all about Zhe Heng - his skills, projects, experience, and how to connect with him. What interests you?`,
        `Hi! Ask me anything about Zhe Heng's professional background, technical skills, or how to get in touch!`
      ];
      return greetings[Math.floor(Math.random() * greetings.length)];
    }
    
    // Name/Introduction
    if (q.match(/who (are you|is (he|zhe|heng))|introduce|about (yourself|him|zhe|heng)|tell me about/i)) {
      return `${info.name} is a ${info.title} based in ${info.location}. He's currently pursuing a ${info.education.degree} at ${info.education.university} with a CGPA of ${info.education.cgpa}. He has experience at Ant International, Persis, and 33Digitec Solution.`;
    }
    
    // Email / Gmail - IMPORTANT: Check before general contact
    if (q.match(/gmail|email|mail|e-mail/i)) {
      return `Zhe Heng's email is: ${info.email}\n\nFeel free to reach out for job opportunities, collaborations, or just to say hi! 📧`;
    }
    
    // Phone (if asked - explain not public)
    if (q.match(/phone|number|call|whatsapp|telegram/i)) {
      return `Zhe Heng prefers to be contacted via email (${info.email}) or LinkedIn (${info.linkedin}) for professional inquiries. Feel free to reach out there!`;
    }
    
    // Skills
    if (q.match(/skill|tech|stack|know|programming|framework|what.*(can|does).*(do|use)|expertise|proficient/i)) {
      const skills = info.skills;
      return `Zhe Heng's technical skills include:\n\n• Languages: ${skills.languages.join(', ')}\n• Backend: ${skills.backend.join(', ')}\n• Frontend: ${skills.frontend.join(', ')}\n• Databases: ${skills.databases.join(', ')}\n• Cloud: ${skills.cloud.join(', ')}\n• AI/ML: ${skills.ai_ml.join(', ')}`;
    }
    
    // Projects
    if (q.match(/project|built|create|develop|portfolio|made|build/i)) {
      const projects = info.projects.map(p => `• ${p.name}: ${p.description}`).join('\n');
      return `Here are some of Zhe Heng's notable projects:\n\n${projects}\n\nCheck out his GitHub for more: ${info.github}`;
    }
    
    // Experience
    if (q.match(/experience|work|job|company|career|employ|worked|intern/i)) {
      const exp = info.experience.map(e => 
        `• ${e.role} at ${e.company} (${e.period})`
      ).join('\n');
      return `Zhe Heng's work experience:\n\n${exp}\n\nHe specializes in full-stack development, backend engineering, and AI/ML integration.`;
    }
    
    // Current job
    if (q.match(/current|currently|now|right now|at the moment|these days/i) && q.match(/work|do|job|role/i)) {
      const current = info.experience[0];
      return `Zhe Heng is currently working as a ${current.role} at ${current.company} (${current.location}). He's involved in ${current.highlights[0].toLowerCase()} and ${current.highlights[1].toLowerCase()}.`;
    }
    
    // Education
    if (q.match(/education|study|university|degree|school|cgpa|gpa|graduate|college|student/i)) {
      const edu = info.education;
      return `Zhe Heng is pursuing a ${edu.degree} at ${edu.university} (${edu.period}) with an impressive CGPA of ${edu.cgpa}. His achievements include: ${edu.achievements.join(', ')}.`;
    }
    
    // Contact (general)
    if (q.match(/contact|reach|connect with|get in touch|talk to/i)) {
      return `You can reach Zhe Heng through:\n\n• Email: ${info.email}\n• GitHub: ${info.github}\n• LinkedIn: ${info.linkedin}\n• LeetCode: ${info.leetcode}\n\nHe's open to permanent roles and exciting opportunities!`;
    }
    
    // GitHub
    if (q.match(/github|repo|repository|code|open source|git/i)) {
      return `Check out Zhe Heng's GitHub profile at ${info.github}\n\nYou'll find projects like StallSync, Invento, AI/ML experiments, and more. He's active in open source and always working on new things! 🚀`;
    }
    
    // LinkedIn
    if (q.match(/linkedin|professional.*(profile|network)|network/i)) {
      return `Connect with Zhe Heng on LinkedIn: ${info.linkedin}\n\nFeel free to reach out for professional opportunities or networking! 🤝`;
    }
    
    // LeetCode
    if (q.match(/leetcode|coding.*(challenge|problem)|algorithm|competitive/i)) {
      return `Check out Zhe Heng's LeetCode profile: ${info.leetcode}\n\nHe enjoys solving algorithmic problems and staying sharp with coding challenges!`;
    }
    
    // Facebook
    if (q.match(/facebook|fb|meta/i)) {
      return `Follow Zhe Heng on Facebook: ${info.facebook}\n\nConnect with him to see updates about his projects and professional journey! 📘`;
    }
    
    // Instagram
    if (q.match(/instagram|ig|insta/i)) {
      return `Follow Zhe Heng on Instagram: ${info.instagram}\n\nSee his tech journey and moments! 📸`;
    }
    
    // Social Media (general)
    if (q.match(/social media|social|follow|socials/i)) {
      return `You can follow Zhe Heng on social media:\n\n• LinkedIn: ${info.linkedin}\n• GitHub: ${info.github}\n• Facebook: ${info.facebook}\n• Instagram: ${info.instagram}\n• LeetCode: ${info.leetcode}\n\nConnect with him for updates on projects and opportunities! 🌐`;
    }
    
    // Interests/Hobbies (with actual info now)
    if (q.match(/interest|hobby|hobbies|passion|like to do|free time/i)) {
      const pi = info.personalInfo;
      return `Zhe Heng's interests include: ${pi.interests.join(', ')}.\n\nIn his free time, he enjoys ${pi.hobbies.join(', ').toLowerCase()}.\n\nHis current focus is on ${pi.currentFocus}. 💡`;
    }
    
    // Personality
    if (q.match(/personality|character|what.*(like|kind of person)|describe/i)) {
      return `Zhe Heng is ${info.personalInfo.personality}. He's passionate about building innovative solutions and continuously learning new technologies. Colleagues appreciate his dedication and teamwork! 🌟`;
    }
    
    // Achievements
    if (q.match(/achievement|award|accomplish|honor|recognition|certificate/i)) {
      return `Zhe Heng's achievements include:\n\n• ${info.achievements.join('\n• ')}\n\nHe's also participated in international hackathons and student exchanges in Vietnam, China, and the U.S.! 🏆`;
    }
    
    // Languages (spoken)
    if (q.match(/speak|spoken|language.*(speak|fluent)|multilingual|chinese|mandarin|english|malay/i)) {
      const langs = Object.entries(info.languages).map(([k,v]) => `${k}: ${v}`).join(', ');
      return `Zhe Heng speaks multiple languages: ${langs}. This helps him work effectively in diverse teams! 🌏`;
    }
    
    // Location
    if (q.match(/where|location|based|live|from|country|city|malaysia/i)) {
      return `Zhe Heng is based in ${info.location}. He's open to both local and remote opportunities! 📍`;
    }
    
    // Available/Hire
    if (q.match(/available|hire|hiring|open.*(role|position|job)|looking|opportunity|recruit/i)) {
      return `Yes! Zhe Heng is open to permanent roles. He brings expertise in full-stack development, Java/Spring Boot, Node.js, React, and cloud technologies. Contact him at ${info.email} or through LinkedIn: ${info.linkedin} ✨`;
    }
    
    // Resume/CV
    if (q.match(/resume|cv|curriculum/i)) {
      return `You can view Zhe Heng's resume/CV on this website or request it directly via email at ${info.email}. His portfolio showcases his projects and experience!`;
    }
    
    // Age (politely redirect)
    if (q.match(/how old|age|birthday|born/i)) {
      return `Zhe Heng is a fresh graduate (2023-2026 at TARUMT) with impressive professional experience at Ant International, Persis, and 33Digitec Solution. What matters most is his skills and passion for software engineering! 😊`;
    }
    
    // Thanks
    if (q.match(/thank|thanks|thx|appreciate/i)) {
      const thanks = [
        "You're welcome! Feel free to ask if you have more questions about Zhe Heng. 😊",
        "Happy to help! Don't hesitate to ask anything else about Zhe Heng's background or skills!",
        "Glad I could help! Check out the GitHub or LinkedIn links if you want to connect with Zhe Heng directly!"
      ];
      return thanks[Math.floor(Math.random() * thanks.length)];
    }
    
    // Goodbye
    if (q.match(/bye|goodbye|see you|later|cya/i)) {
      return `Goodbye! Thanks for learning about Zhe Heng. Feel free to come back anytime! 👋`;
    }
    
    // Help
    if (q.match(/help|what can you|how do i|guide/i)) {
      return `I can help you learn about Zhe Heng! Try asking about:\n\n• His technical skills & expertise\n• Work experience & current role\n• Projects he's built\n• Education & achievements\n• How to contact him\n• Social media: GitHub, LinkedIn, Facebook, Instagram`;
    }
    
    // Food/Eat/Drink - specific personal questions (politely decline)
    if (q.match(/\b(food|eat|drink|favorite food|meal)\b/i)) {
      return `I'm Zhe Heng's professional assistant and don't have info about his food preferences. But I can tell you about his professional interests like ${info.personalInfo.interests.slice(0, 3).join(', ')}! 😊`;
    }
    
    // Games/Movies/Music - entertainment questions (politely decline)
    if (q.match(/\b(game|movie|music|song|film|play|watch|listen)\b/i)) {
      return `I focus on Zhe Heng's professional profile. While I don't have his entertainment preferences, I know he's passionate about coding and competitive programming! Check out his LeetCode: ${info.leetcode}`;
    }
    
    // Salary/Compensation (politely redirect)
    if (q.match(/salary|pay|compensation|money|earn|income/i)) {
      return `For salary and compensation discussions, please reach out to Zhe Heng directly via email (${info.email}) or LinkedIn (${info.linkedin}). He's open to discussing opportunities!`;
    }
    
    // Name variations - what's his name
    if (q.match(/name|called|full name/i)) {
      return `His full name is ${info.name}, but you can call him Zhe Heng! He's a ${info.title} based in ${info.location}. 😊`;
    }
    
    // Unrelated questions - catch common patterns and decline
    if (q.match(/\b(weather|news|politics|president|who is (?!zhe|heng)|what is (?!zhe|heng|his|your)|calculate|math|recipe|how to cook|translate|define|meaning of)\b/i)) {
      return `I'm Zhe Heng's personal assistant and can only answer questions about him. Try asking about his skills, projects, work experience, or how to contact him! 😊`;
    }
    
    // Specific tech questions
    if (q.match(/java|spring|node|react|python|aws|docker|kubernetes|flutter/i)) {
      const tech = q.match(/java|spring|node|react|python|aws|docker|kubernetes|flutter/i)[0];
      return `Yes! Zhe Heng has experience with ${tech}. He's used it professionally at companies like Ant International, Persis, and 33Digitec Solution. Check out his GitHub (${info.github}) to see projects using these technologies!`;
    }
    
    return null; // No local match, try API
  }
  
  // Optional: API call for more complex questions
  async function fetchAPIResponse(question) {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        question,
        context: JSON.stringify(ZHE_HENG_INFO)
      })
    });
    
    if (!response.ok) throw new Error('API error');
    const data = await response.json();
    return data.response;
  }

  // Event listeners
  function initEventListeners() {
    const toggle = document.getElementById('chatbotToggle');
    const closeBtn = document.getElementById('chatbotClose');
    const sendBtn = document.getElementById('chatbotSend');
    const input = document.getElementById('chatbotInput');
    const quickActions = document.querySelectorAll('.quick-action');
    const backdrop = document.getElementById('chatbotBackdrop');
    
    closeBtn.addEventListener('click', toggleChat);
    
    // Backdrop click to close (mobile)
    if (backdrop) {
      backdrop.addEventListener('click', () => {
        if (isOpen) toggleChat();
      });
    }
    
    sendBtn.addEventListener('click', () => {
      sendMessage(input.value);
    });
    
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage(input.value);
      }
    });
    
    // Auto-resize textarea
    input.addEventListener('input', () => {
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 100) + 'px';
    });
    
    // Quick actions
    quickActions.forEach(btn => {
      btn.addEventListener('click', () => {
        sendMessage(btn.textContent);
      });
    });
    
    // Close on escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && isOpen) {
        toggleChat();
      }
    });
  }

  // Initialize
  function init() {
    createChatbotHTML();
    initDraggable();
    initEventListeners();
    console.log('[Chatbot] Initialized');
  }

  // Wait for DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
