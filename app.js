/* ==========================================================================
   NEO-GLASS CREATIVE STUDIO - LOGIC & STATE
   Project: Instagram Profile Simulator & iPhone 16 Pro Max Mockup
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  // --- STATE ---
  let posts = [];
  let currentPostImages = []; // Stores base64 strings of uploaded photos for new post
  let userAvatar = getPlaceholderAvatar(); // Base64 of default avatar
  
  let profile = {
    username: 'lasertech_schio',
    displayName: 'LASER TECH SCHIO',
    category: 'Impresa industriale',
    bioText: `Laser Tech Schio è leader nel taglio laser e lavorazione lamiera su specifica del cliente.\n#acciaioinox`,
    bioLink: 'www.lasertech-srl.it/',
    followersCount: '293',
    followingCount: '316'
  };
  
  // --- DOM ELEMENTS ---
  // Profile settings
  const inputUsername = document.getElementById('post-username');
  const inputDisplayName = document.getElementById('post-display-name');
  const inputCategory = document.getElementById('post-category');
  const inputBioText = document.getElementById('post-bio-text');
  const inputBioLink = document.getElementById('post-bio-link');
  const inputFollowers = document.getElementById('post-followers-count');
  const inputFollowing = document.getElementById('post-following-count');
  const avatarUploadInput = document.getElementById('avatar-upload');
  const avatarPreview = document.getElementById('avatar-preview-img');
  
  // Mockup elements to update
  const lblHeaderUsername = document.getElementById('header-profile-username');
  const lblDisplayName = document.getElementById('lbl-display-name');
  const lblCategory = document.getElementById('lbl-category');
  const lblBioText = document.getElementById('lbl-bio-text');
  const lblBioLink = document.getElementById('lbl-bio-link');
  const lblStatPosts = document.getElementById('stat-posts-val');
  const lblStatFollowers = document.getElementById('stat-followers-val');
  const lblStatFollowing = document.getElementById('stat-following-val');
  const imgMainAvatar = document.getElementById('profile-main-avatar-img');
  const imgNavAvatar = document.getElementById('nav-avatar-preview');
  
  // Post Creator Form
  const uploadInput = document.getElementById('post-photos-upload');
  const uploadZone = document.getElementById('upload-zone');
  const previewContainer = document.getElementById('uploaded-images-preview');
  const captionInput = document.getElementById('post-caption');
  const locationInput = document.getElementById('post-location');
  const addPostBtn = document.getElementById('btn-add-post');
  
  // Layout containers
  const igProfileGrid = document.getElementById('ig-profile-grid');
  const phonePerspectiveWrapper = document.getElementById('phone-perspective-wrapper');
  const stageContainer = document.querySelector('.stage-container');
  const dynamicIsland = document.getElementById('dynamic-island');
  
  // Slide-up Detail Overlay Modal
  const postOverlay = document.getElementById('ig-post-detail-overlay');
  const overlayPostBody = document.getElementById('overlay-post-body');
  const btnCloseOverlay = document.getElementById('btn-close-overlay');

  // Option Controls (Right Panel)
  const timeSelector = document.getElementById('sys-time');
  const batterySelector = document.getElementById('sys-battery');
  const toggleIosOverlay = document.getElementById('toggle-ios');
  const toggleDarkMode = document.getElementById('toggle-dark');
  const clearFeedBtn = document.getElementById('btn-clear-feed');
  const manageList = document.getElementById('manage-list');
  
  const iosTimeEl = document.querySelector('.ios-time');
  const iosStatusBar = document.querySelector('.ios-status-bar');
  const igAppContainer = document.querySelector('.ig-app');

  // --- INITIALIZATION ---
  initClock();
  loadData();
  setupEventListeners();
  syncSidebarToProfileForm();
  updateProfileMockup();
  renderGrid();
  renderManageList();

  // --- FUNCTIONS ---

  // Live clock on top-left of status bar
  function initClock() {
    function updateClock() {
      const now = new Date();
      let hours = now.getHours();
      let minutes = now.getMinutes();
      hours = hours < 10 ? '0' + hours : hours;
      minutes = minutes < 10 ? '0' + minutes : minutes;
      if (timeSelector.value === 'live') {
        iosTimeEl.textContent = `${hours}:${minutes}`;
      } else {
        iosTimeEl.textContent = timeSelector.value;
      }
    }
    updateClock();
    setInterval(updateClock, 1000 * 30);
  }

  // Populate sidebar form with values loaded from state
  function syncSidebarToProfileForm() {
    inputUsername.value = profile.username;
    inputDisplayName.value = profile.displayName;
    inputCategory.value = profile.category;
    inputBioText.value = profile.bioText;
    inputBioLink.value = profile.bioLink;
    inputFollowers.value = profile.followersCount;
    inputFollowing.value = profile.followingCount;
    avatarPreview.src = userAvatar;
  }

  // Update text label elements inside mock screen
  function updateProfileMockup() {
    lblHeaderUsername.textContent = profile.username;
    lblDisplayName.textContent = profile.displayName;
    lblCategory.textContent = profile.category;
    
    // Formatting newlines in Bio
    lblBioText.innerHTML = escapeHtml(profile.bioText).replace(/\n/g, '<br>');
    
    // Handle link
    lblBioLink.innerHTML = `
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="margin-right: 2px; flex-shrink: 0;">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
      </svg>
      ${escapeHtml(profile.bioLink)}
    `;
    lblBioLink.href = profile.bioLink.startsWith('http') ? profile.bioLink : 'https://' + profile.bioLink;
    
    lblStatPosts.textContent = posts.length;
    lblStatFollowers.textContent = profile.followersCount;
    lblStatFollowing.textContent = profile.followingCount;
    
    imgMainAvatar.src = userAvatar;
    imgNavAvatar.src = userAvatar;
  }

  // Generate beautiful custom gradient SVGs with title and subtitle
  function createGradientPlaceholder(title, subtitle, color1, color2, isDark = false) {
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600">
        <defs>
          <linearGradient id="grad-${title.replace(/[^a-zA-Z]/g, '')}" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:${color1};stop-opacity:1" />
            <stop offset="100%" style="stop-color:${color2};stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect width="600" height="600" fill="url(#grad-${title.replace(/[^a-zA-Z]/g, '')})" />
        <rect x="30" y="30" width="540" height="540" rx="12" fill="none" stroke="rgba(255,255,255,0.07)" stroke-width="2" />
        
        <!-- Steel pattern graphic lines -->
        <circle cx="300" cy="300" r="180" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="8" />
        <line x1="120" y1="120" x2="480" y2="480" stroke="rgba(255,255,255,0.04)" stroke-width="4" />
        <line x1="480" y1="120" x2="120" y2="480" stroke="rgba(255,255,255,0.04)" stroke-width="4" />

        <!-- Text Elements -->
        <text x="300" y="270" font-family="'Outfit', sans-serif" font-weight="700" font-size="34" fill="#ffffff" text-anchor="middle" letter-spacing="1">${title}</text>
        <text x="300" y="330" font-family="'Outfit', sans-serif" font-weight="500" font-size="16" fill="rgba(255,255,255,0.75)" text-anchor="middle">${subtitle}</text>
        
        <!-- Laser pointer dot graphic -->
        <circle cx="300" cy="180" r="8" fill="#ff3040" filter="drop-shadow(0 0 8px #ff3040)" opacity="0.8"/>
      </svg>
    `;
    return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg.trim());
  }

  // Default User Avatar SVG (Company logo silhouette)
  function getPlaceholderAvatar() {
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120">
        <defs>
          <linearGradient id="avatar-logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#e6683c" />
            <stop offset="50%" style="stop-color:#dc2743" />
            <stop offset="100%" style="stop-color:#bc1888" />
          </linearGradient>
        </defs>
        <rect width="120" height="120" fill="url(#avatar-logo-grad)" />
        <rect x="25" y="25" width="70" height="70" rx="10" fill="none" stroke="#ffffff" stroke-width="6" />
        <circle cx="60" cy="60" r="18" fill="none" stroke="#ffffff" stroke-width="6" />
        <circle cx="80" cy="40" r="4" fill="#ffffff" />
      </svg>
    `;
    return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg.trim());
  }

  // Load state from local storage or pre-populate with screenshot match templates
  function loadData() {
    const savedPosts = localStorage.getItem('ig_profile_posts');
    const savedAvatar = localStorage.getItem('ig_profile_avatar');
    const savedProfile = localStorage.getItem('ig_profile_info');
    
    if (savedAvatar) {
      userAvatar = savedAvatar;
    }
    
    if (savedProfile) {
      try {
        profile = JSON.parse(savedProfile);
      } catch (e) {}
    }
    
    if (savedPosts) {
      try {
        posts = JSON.parse(savedPosts);
      } catch (e) {
        posts = [];
      }
    }
    
    // Seed screenshot defaults if empty
    if (posts.length === 0) {
      posts = [
        {
          id: 'post-1',
          username: 'lasertech_schio',
          userAvatar: getPlaceholderAvatar(),
          location: 'Schio, Italy',
          images: [
            createGradientPlaceholder('FARE IMPRESA', 'Crescere insieme ai propri clienti. - Aldo', '#dc2743', '#833ab4'),
            createGradientPlaceholder('IL FUTURO', 'Progettazione e automazione industriale', '#f5af19', '#f12711')
          ],
          caption: 'Fare Impresa vuol dire crescere insieme ai propri clienti. Aldo #lasertech #laser #lavorazionelamiera #lasercutting',
          likes: 97,
          likedByMe: false,
          timeAgo: '1 DAY AGO'
        },
        {
          id: 'post-2',
          username: 'lasertech_schio',
          userAvatar: getPlaceholderAvatar(),
          location: 'Vibe Lab',
          images: [
            createGradientPlaceholder('TECNOLOGIA', 'La tecnologia evolve. I valori restano.', '#2c3e50', '#000000')
          ],
          caption: 'La tecnologia evolve. I valori con cui lavoriamo restano. ⚙️📐 #metalwork #lamiera #lasercut',
          likes: 124,
          likedByMe: true,
          timeAgo: '3 DAYS AGO'
        },
        {
          id: 'post-3',
          username: 'lasertech_schio',
          userAvatar: getPlaceholderAvatar(),
          location: 'HQ Production',
          images: [
            createGradientPlaceholder('ALDO', 'Aldo - Industrial Tag Team Lead', '#d35400', '#2c3e50')
          ],
          caption: 'Incontra il nostro team: Aldo, responsabile reparto taglio laser. Qualità e cura dei dettagli. #staff #meettheteam',
          likes: 76,
          likedByMe: false,
          timeAgo: '4 DAYS AGO'
        },
        {
          id: 'post-4',
          username: 'lasertech_schio',
          userAvatar: getPlaceholderAvatar(),
          location: 'Schio Factory',
          images: [
            createGradientPlaceholder('MARIANNA', 'Marianna - Customer Operations Manager', '#e67e22', '#34495e')
          ],
          caption: 'Il motore dei nostri progetti: Marianna. Dialogo e precisione al servizio delle vostre specifiche. #team #operations #customercare',
          likes: 85,
          likedByMe: false,
          timeAgo: '1 WEEK AGO'
        },
        {
          id: 'post-5',
          username: 'lasertech_schio',
          userAvatar: getPlaceholderAvatar(),
          location: 'Schio HQ',
          images: [
            createGradientPlaceholder('IDEE E PERSONE', 'Idee. Tecnologia. Persone.', '#111111', '#444444')
          ],
          caption: 'IDEE, TECNOLOGIA, PERSONE. Tre elementi uniti per dare vita a lavorazioni su misura ad alto valore tecnologico. 🛠️📐✨',
          likes: 62,
          likedByMe: false,
          timeAgo: '2 WEEKS AGO'
        }
      ];
      saveData();
    }
  }

  function saveData() {
    try {
      localStorage.setItem('ig_profile_posts', JSON.stringify(posts));
      localStorage.setItem('ig_profile_avatar', userAvatar);
      localStorage.setItem('ig_profile_info', JSON.stringify(profile));
    } catch (e) {
      console.warn('LocalStorage quota limit reached, saving failed:', e);
      // Soft fail: notify console but do not crash the app
    }
  }

  // Setup Event Handlers
  function setupEventListeners() {
    // --- 1. Live profile inputs synchronization ---
    const updateProfileValue = (key, val) => {
      profile[key] = val;
      saveData();
      updateProfileMockup();
    };

    inputUsername.addEventListener('input', (e) => {
      updateProfileValue('username', e.target.value.trim());
      // Render detail views with updated username if open
      renderGrid();
    });

    inputDisplayName.addEventListener('input', (e) => {
      updateProfileValue('displayName', e.target.value);
    });

    inputCategory.addEventListener('input', (e) => {
      updateProfileValue('category', e.target.value);
    });

    inputBioText.addEventListener('input', (e) => {
      updateProfileValue('bioText', e.target.value);
    });

    inputBioLink.addEventListener('input', (e) => {
      updateProfileValue('bioLink', e.target.value);
    });

    inputFollowers.addEventListener('input', (e) => {
      updateProfileValue('followersCount', e.target.value);
    });

    inputFollowing.addEventListener('input', (e) => {
      updateProfileValue('followingCount', e.target.value);
    });

    // Avatar uploading
    avatarPreview.addEventListener('click', () => {
      avatarUploadInput.click();
    });

    avatarUploadInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (file) {
        try {
          // Compress avatar to maximum 256px width/height
          userAvatar = await resizeAndCompress(file, 256);
          avatarPreview.src = userAvatar;
          saveData();
          updateProfileMockup();
          renderGrid(); // Redraw grid cells to update avatar inside post templates
        } catch (err) {
          console.error('Error processing avatar:', err);
        }
      }
    });

    // --- 2. Post Creation ---
    uploadZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      uploadZone.classList.add('dragover');
    });

    uploadZone.addEventListener('dragleave', () => {
      uploadZone.classList.remove('dragover');
    });

    uploadZone.addEventListener('drop', (e) => {
      e.preventDefault();
      uploadZone.classList.remove('dragover');
      handleFiles(e.dataTransfer.files);
    });

    uploadInput.addEventListener('change', (e) => {
      handleFiles(e.target.files);
    });

    addPostBtn.addEventListener('click', () => {
      const caption = captionInput.value.trim();
      const location = locationInput.value.trim();

      if (currentPostImages.length === 0) {
        alert('Please upload at least one image before creating a post.');
        return;
      }

      // Dynamic Island "Publishing" animation
      triggerDynamicIslandAnimation();

      const newPost = {
        id: Date.now().toString(),
        username: profile.username,
        userAvatar: userAvatar,
        location: location,
        images: [...currentPostImages],
        caption: caption,
        likes: 0,
        likedByMe: false,
        timeAgo: 'JUST NOW'
      };

      posts.unshift(newPost);
      currentPostImages = [];
      previewContainer.innerHTML = '';
      captionInput.value = '';
      locationInput.value = '';
      uploadInput.value = '';

      saveData();
      updateProfileMockup();
      renderGrid();
      renderManageList();
    });

    // --- 3. Modal close button ---
    btnCloseOverlay.addEventListener('click', () => {
      postOverlay.classList.remove('active');
      // Clean content to stop slider memory leaks
      overlayPostBody.innerHTML = '';
    });

    // --- 4. Controls Simulator (Right panel) ---
    timeSelector.addEventListener('change', () => {
      const val = timeSelector.value;
      if (val === 'live') {
        // clock handles this
      } else {
        iosTimeEl.textContent = val;
      }
    });

    batterySelector.addEventListener('change', () => {
      const val = batterySelector.value;
      const batteryLevelSvg = document.getElementById('battery-level-svg');
      if (batteryLevelSvg) {
        batteryLevelSvg.style.width = `${val}%`;
      }
    });

    toggleIosOverlay.addEventListener('change', (e) => {
      if (e.target.checked) {
        iosStatusBar.style.display = 'flex';
      } else {
        iosStatusBar.style.display = 'none';
      }
    });

    toggleDarkMode.addEventListener('change', (e) => {
      if (e.target.checked) {
        igAppContainer.classList.add('ig-dark-mode');
      } else {
        igAppContainer.classList.remove('ig-dark-mode');
      }
    });

    clearFeedBtn.addEventListener('click', () => {
      if (confirm('Are you sure you want to reset the simulator? Your custom posts and bio settings will be cleared.')) {
        localStorage.clear();
        posts = [];
        currentPostImages = [];
        previewContainer.innerHTML = '';
        userAvatar = getPlaceholderAvatar();
        profile = {
          username: 'lasertech_schio',
          displayName: 'LASER TECH SCHIO',
          category: 'Impresa industriale',
          bioText: `Laser Tech Schio è leader nel taglio laser e lavorazione lamiera su specifica del cliente.\n#acciaioinox`,
          bioLink: 'www.lasertech-srl.it/',
          followersCount: '293',
          followingCount: '316'
        };
        loadData();
        syncSidebarToProfileForm();
        updateProfileMockup();
        renderGrid();
        renderManageList();
      }
    });
  }

  // Handle uploaded photo files with async compression
  async function handleFiles(files) {
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue;
      try {
        // Compress images to max 1080px (standard Instagram size)
        const compressedDataUrl = await resizeAndCompress(file, 1080);
        currentPostImages.push(compressedDataUrl);
        renderUploadThumbs();
      } catch (err) {
        console.error('Error compressing image:', err);
      }
    }
  }

  function renderUploadThumbs() {
    previewContainer.innerHTML = '';
    currentPostImages.forEach((imgSrc, index) => {
      const thumb = document.createElement('div');
      thumb.className = 'preview-thumb';
      thumb.innerHTML = `
        <img src="${imgSrc}" alt="">
        <button class="remove-img" data-index="${index}">&times;</button>
        <span class="img-index">${index + 1}</span>
      `;
      
      thumb.querySelector('.remove-img').addEventListener('click', (e) => {
        const idx = parseInt(e.target.getAttribute('data-index'));
        currentPostImages.splice(idx, 1);
        renderUploadThumbs();
      });

      previewContainer.appendChild(thumb);
    });
  }

  // Dynamic Island popup action
  function triggerDynamicIslandAnimation() {
    dynamicIsland.classList.add('expanded');
    
    dynamicIsland.innerHTML = `
      <div class="dynamic-island-content">
        <img class="island-avatar" src="${userAvatar}" alt="">
        <span style="font-weight: 500;">Grid feed updating...</span>
        <div class="island-pulse"></div>
      </div>
    `;

    setTimeout(() => {
      dynamicIsland.classList.remove('expanded');
      setTimeout(() => {
        dynamicIsland.innerHTML = '';
      }, 400);
    }, 2000);
  }

  // Render 3-column photo grid
  function renderGrid() {
    igProfileGrid.innerHTML = '';

    if (posts.length === 0) {
      igProfileGrid.innerHTML = `
        <div style="grid-column: span 3; padding: 60px 20px; text-align: center; color: var(--ig-text-muted);">
          <svg style="width: 42px; height: 42px; stroke: currentColor; fill:none; margin: 0 auto 10px auto; display: block;" viewBox="0 0 24 24">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="12" y1="8" x2="12" y2="16"></line>
            <line x1="8" y1="12" x2="16" y2="12"></line>
          </svg>
          <p style="font-size: 12.5px;">No posts yet.<br>Publish your first grid post!</p>
        </div>
      `;
      return;
    }

    posts.forEach((post) => {
      const cell = document.createElement('div');
      cell.className = 'grid-cell';
      cell.dataset.postId = post.id;
      
      // Thumbnail image
      cell.innerHTML = `<img src="${post.images[0]}" alt="Post preview">`;

      // If carousel, append badge
      if (post.images.length > 1) {
        cell.innerHTML += `
          <div class="grid-carousel-badge">
            <svg viewBox="0 0 24 24">
              <path d="M19 2H8a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2zM4 6H2v14a2 2 0 0 0 2 2h14v-2H4V6z"/>
            </svg>
          </div>
        `;
      }

      // Click grid cell -> slide-up post details popup modal!
      cell.addEventListener('click', () => {
        openPostOverlay(post);
      });

      igProfileGrid.appendChild(cell);
    });
  }

  // Build full Instagram Post detail inside the popup modal
  function openPostOverlay(post) {
    overlayPostBody.innerHTML = '';
    
    const postCard = document.createElement('div');
    postCard.className = 'ig-post';

    // 1. Post Header
    const headerHtml = `
      <div class="post-header">
        <div class="post-user-info">
          <img class="post-user-avatar" src="${userAvatar}" alt="">
          <div class="post-user-meta">
            <span class="post-username">${profile.username}</span>
            ${post.location ? `<span class="post-location">${escapeHtml(post.location)}</span>` : ''}
          </div>
        </div>
        <div class="post-options">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="1"></circle>
            <circle cx="5" cy="12" r="1"></circle>
            <circle cx="19" cy="12" r="1"></circle>
          </svg>
        </div>
      </div>
    `;

    // 2. Carousel Image track structure
    const hasCarousel = post.images.length > 1;
    let mediaHtml = `
      <div class="post-media-container ${hasCarousel ? 'draggable' : ''}">
        <div class="post-media-wrapper" style="width: ${post.images.length * 100}%">
    `;

    post.images.forEach((imgSrc) => {
      mediaHtml += `
        <div class="post-media-item">
          <img src="${imgSrc}" alt="">
        </div>
      `;
    });

    mediaHtml += `
        </div>
        <svg class="double-tap-heart" viewBox="0 0 24 24">
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
        </svg>
    `;

    if (hasCarousel) {
      mediaHtml += `
        <button class="media-nav-btn nav-prev" style="display: none;">
          <svg viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7"/></svg>
        </button>
        <button class="media-nav-btn nav-next">
          <svg viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg>
        </button>
        <div class="post-carousel-dots">
      `;
      post.images.forEach((_, i) => {
        mediaHtml += `<div class="post-carousel-dot ${i === 0 ? 'active' : ''}"></div>`;
      });
      mediaHtml += `</div>`;
    }

    mediaHtml += `</div>`;

    // 3. Post Action Buttons (Heart like trigger)
    const actionsHtml = `
      <div class="post-actions">
        <div class="post-actions-left">
          <svg class="btn-like ${post.likedByMe ? 'liked' : ''}" viewBox="0 0 24 24">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
          </svg>
          <svg viewBox="0 0 24 24">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
          </svg>
          <svg viewBox="0 0 24 24">
            <line x1="22" y1="2" x2="11" y2="13"></line>
            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
          </svg>
        </div>
        <div class="post-actions-right">
          <svg viewBox="0 0 24 24">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
          </svg>
        </div>
      </div>
    `;

    // 4. Post Details text block
    const detailsHtml = `
      <div class="post-details">
        <div class="post-likes">${post.likes.toLocaleString()} likes</div>
        <div class="post-caption-wrapper">
          <span class="post-caption-user">${profile.username}</span>
          <span class="post-caption-text">${escapeHtml(post.caption)}</span>
        </div>
        <div class="post-comments-link">View all comments</div>
        <div class="post-time">${post.timeAgo}</div>
      </div>
    `;

    postCard.innerHTML = headerHtml + mediaHtml + actionsHtml + detailsHtml;
    overlayPostBody.appendChild(postCard);

    // Bind slider swiping & double tap likes to the overlay post card elements
    bindPostEvents(postCard, post);

    // Slide up modal
    postOverlay.classList.add('active');
  }

  // Handle swipe/drag/slide and likes in active post modal
  function bindPostEvents(postEl, postData) {
    const mediaContainer = postEl.querySelector('.post-media-container');
    const mediaWrapper = postEl.querySelector('.post-media-wrapper');
    const prevBtn = postEl.querySelector('.nav-prev');
    const nextBtn = postEl.querySelector('.nav-next');
    const dots = postEl.querySelectorAll('.post-carousel-dot');
    const likeBtn = postEl.querySelector('.btn-like');
    const doubleTapHeart = postEl.querySelector('.double-tap-heart');
    
    let currentIndex = 0;
    const totalImages = postData.images.length;

    // Like Toggle Click
    likeBtn.addEventListener('click', () => {
      toggleLike(postData, likeBtn, postEl);
    });

    // Double click to Like
    let lastTap = 0;
    mediaContainer.addEventListener('click', (e) => {
      if (e.target.closest('.media-nav-btn')) return;

      const currentTime = new Date().getTime();
      const tapDelay = currentTime - lastTap;
      
      if (tapDelay < 300 && tapDelay > 0) {
        doubleTapHeart.classList.remove('animate');
        void doubleTapHeart.offsetWidth; // Reflow reset
        doubleTapHeart.classList.add('animate');
        
        if (!postData.likedByMe) {
          toggleLike(postData, likeBtn, postEl);
        }
      }
      lastTap = currentTime;
    });

    // Carousel controller (Only if multiple images)
    if (totalImages > 1) {
      const updateSlider = () => {
        mediaWrapper.style.transform = `translateX(-${currentIndex * (100 / totalImages)}%)`;
        
        if (prevBtn) prevBtn.style.display = currentIndex === 0 ? 'none' : 'flex';
        if (nextBtn) nextBtn.style.display = currentIndex === totalImages - 1 ? 'none' : 'flex';
        
        dots.forEach((dot, idx) => {
          if (idx === currentIndex) {
            dot.classList.add('active');
          } else {
            dot.classList.remove('active');
          }
        });
      };

      if (prevBtn && nextBtn) {
        prevBtn.addEventListener('click', () => {
          if (currentIndex > 0) {
            currentIndex--;
            updateSlider();
          }
        });

        nextBtn.addEventListener('click', () => {
          if (currentIndex < totalImages - 1) {
            currentIndex++;
            updateSlider();
          }
        });
      }

      // Drag/Swipe Mouse & Touch Physics support
      let startX = 0;
      let diffX = 0;
      let isDragging = false;

      const dragStart = (e) => {
        isDragging = true;
        startX = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX;
        mediaWrapper.style.transition = 'none';
      };

      const dragMove = (e) => {
        if (!isDragging) return;
        const currentX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
        diffX = currentX - startX;
        
        // elastic pull at boundaries
        if ((currentIndex === 0 && diffX > 0) || (currentIndex === totalImages - 1 && diffX < 0)) {
          diffX = diffX * 0.3;
        }

        const containerWidth = mediaContainer.offsetWidth;
        const currentOffsetPct = -currentIndex * 100;
        const dragOffsetPct = (diffX / containerWidth) * 100;
        mediaWrapper.style.transform = `translateX(${currentOffsetPct + dragOffsetPct}%)`;
      };

      const dragEnd = () => {
        if (!isDragging) return;
        isDragging = false;
        mediaWrapper.style.transition = 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)';
        
        const containerWidth = mediaContainer.offsetWidth;
        
        if (diffX < -containerWidth * 0.2 && currentIndex < totalImages - 1) {
          currentIndex++;
        } else if (diffX > containerWidth * 0.2 && currentIndex > 0) {
          currentIndex--;
        }
        
        diffX = 0;
        updateSlider();
      };

      mediaContainer.addEventListener('mousedown', dragStart);
      mediaContainer.addEventListener('mousemove', dragMove);
      window.addEventListener('mouseup', dragEnd);

      mediaContainer.addEventListener('touchstart', dragStart, { passive: true });
      mediaContainer.addEventListener('touchmove', dragMove, { passive: true });
      window.addEventListener('touchend', dragEnd);
    }
  }

  // Like event toggler
  function toggleLike(postData, likeBtn, postEl) {
    const likesCountEl = postEl.querySelector('.post-likes');
    
    if (postData.likedByMe) {
      postData.likedByMe = false;
      postData.likes = Math.max(0, postData.likes - 1);
      likeBtn.classList.remove('liked');
    } else {
      postData.likedByMe = true;
      postData.likes += 1;
      likeBtn.classList.add('liked');
    }

    likesCountEl.textContent = `${postData.likes.toLocaleString()} likes`;
    saveData();
  }

  // Post manager inside Right Sidebar
  function renderManageList() {
    manageList.innerHTML = '';
    
    if (posts.length === 0) {
      manageList.innerHTML = '<div class="empty-feed-text">Profile grid is empty.</div>';
      return;
    }

    posts.forEach((post) => {
      const item = document.createElement('div');
      item.className = 'manage-post-item';
      item.innerHTML = `
        <img class="manage-post-thumb" src="${post.images[0]}" alt="">
        <div class="manage-post-info">
          <div class="manage-post-caption">${post.caption ? escapeHtml(post.caption) : 'No caption'}</div>
          <div class="manage-post-type">${post.images.length} photo${post.images.length > 1 ? 's (Carousel)' : ''}</div>
        </div>
        <button class="btn-icon-delete" data-id="${post.id}">
          <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            <line x1="10" y1="11" x2="10" y2="17"></line>
            <line x1="14" y1="11" x2="14" y2="17"></line>
          </svg>
        </button>
      `;

      item.querySelector('.btn-icon-delete').addEventListener('click', (e) => {
        const id = e.target.closest('.btn-icon-delete').getAttribute('data-id');
        deletePost(id);
      });

      manageList.appendChild(item);
    });
  }

  function deletePost(id) {
    if (confirm('Are you sure you want to delete this grid post?')) {
      posts = posts.filter(post => post.id !== id);
      saveData();
      updateProfileMockup();
      renderGrid();
      renderManageList();
    }
  }

  // HTML escaping utility
  function escapeHtml(text) {
    if (!text) return '';
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, function(m) { return map[m]; });
  }

  // Client-side canvas image resizing and compression helper
  function resizeAndCompress(file, maxDim = 1080) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          
          // Export as compressed JPEG format (0.8 quality = ~20-50x reduction in size)
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.8);
          resolve(compressedDataUrl);
        };
        img.onerror = (err) => reject(err);
        img.src = e.target.result;
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  }
});
