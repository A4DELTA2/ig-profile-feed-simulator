/* ==========================================================================
   NEO-GLASS CREATIVE STUDIO - LOGIC & STATE
   Project: Instagram Profile Simulator & iPhone 16 Pro Max Mockup
   ========================================================================== */

import {
  createBlankProfile,
  createProject,
  renameProject,
  duplicateProject,
  deleteProject,
  findProject,
  updateProjectData,
  initializeProjects,
  saveProjectsToStorage
} from './storage.js';

document.addEventListener('DOMContentLoaded', () => {
  // --- STATE ---
  let projects = [];
  let activeProjectId = null;
  let posts = [];
  let currentPostImages = []; // Stores base64 strings of uploaded photos for new post
  let userAvatar = getPlaceholderAvatar(); // Base64 of default avatar
  let profile = createBlankProfile();

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
  const iphoneFrame = document.getElementById('iphone-frame');

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

  const projectSelect = document.getElementById('project-select');
  const btnProjectNew = document.getElementById('btn-project-new');
  const btnProjectRename = document.getElementById('btn-project-rename');
  const btnProjectDuplicate = document.getElementById('btn-project-duplicate');
  const btnProjectDelete = document.getElementById('btn-project-delete');

  // --- INITIALIZATION ---
  initClock();
  loadData();
  setupEventListeners();
  syncSidebarToProfileForm();
  updateProfileMockup();
  renderGrid();
  renderManageList();
  renderProjectSelector();

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

  // Load the active project's data from the multi-project store
  function loadData() {
    const result = initializeProjects(localStorage, getPlaceholderAvatar());
    projects = result.projects;
    activeProjectId = result.activeProjectId;
    loadActiveProjectIntoState();
  }

  function loadActiveProjectIntoState() {
    const project = findProject(projects, activeProjectId);
    profile = project.profile;
    posts = project.posts;
    userAvatar = project.avatar || getPlaceholderAvatar();
  }

  function renderProjectSelector() {
    projectSelect.innerHTML = '';
    projects.forEach((project) => {
      const option = document.createElement('option');
      option.value = project.id;
      option.textContent = project.name;
      option.selected = project.id === activeProjectId;
      projectSelect.appendChild(option);
    });
  }

  function switchProject(newProjectId) {
    if (newProjectId === activeProjectId) return;
    activeProjectId = newProjectId;
    saveProjectsToStorage(localStorage, projects, activeProjectId);
    loadActiveProjectIntoState();
    syncSidebarToProfileForm();
    updateProfileMockup();
    renderGrid();
    renderManageList();
    renderProjectSelector();
  }

  function createNewProject() {
    const name = prompt('New project name:', '');
    if (!name || !name.trim()) return;
    const project = createProject(name.trim(), createBlankProfile(), [], getPlaceholderAvatar());
    projects = [...projects, project];
    switchProject(project.id);
  }

  function renameActiveProject() {
    const current = findProject(projects, activeProjectId);
    const name = prompt('Rename project:', current.name);
    if (!name || !name.trim()) return;
    projects = renameProject(projects, activeProjectId, name.trim());
    saveProjectsToStorage(localStorage, projects, activeProjectId);
    renderProjectSelector();
  }

  function duplicateActiveProject() {
    const current = findProject(projects, activeProjectId);
    const copy = createProject(
      `${current.name} (copy)`,
      JSON.parse(JSON.stringify(current.profile)),
      JSON.parse(JSON.stringify(current.posts)),
      current.avatar
    );
    projects = duplicateProject(projects, activeProjectId, copy);
    switchProject(copy.id);
  }

  function deleteActiveProject() {
    if (!confirm('Delete this project? This cannot be undone.')) return;
    const remaining = deleteProject(projects, activeProjectId);
    if (remaining.length === 0) {
      const fresh = createProject('New project', createBlankProfile(), [], getPlaceholderAvatar());
      projects = [fresh];
      activeProjectId = fresh.id;
    } else {
      projects = remaining;
      activeProjectId = remaining[0].id;
    }
    saveProjectsToStorage(localStorage, projects, activeProjectId);
    loadActiveProjectIntoState();
    syncSidebarToProfileForm();
    updateProfileMockup();
    renderGrid();
    renderManageList();
    renderProjectSelector();
  }

  function saveData() {
    try {
      projects = updateProjectData(projects, activeProjectId, { profile, posts, avatar: userAvatar });
      saveProjectsToStorage(localStorage, projects, activeProjectId);
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

    // Resets only the ACTIVE project's profile/posts/avatar, not other
    // projects and not the ig_projects/ig_active_project_id keys themselves
    // (see Task 5 note: this replaces the old localStorage.clear() behavior,
    // which would have wiped every saved project).
    clearFeedBtn.addEventListener('click', () => {
      if (confirm('Are you sure you want to reset this project? Its custom posts and bio settings will be cleared.')) {
        profile = createBlankProfile();
        posts = [];
        currentPostImages = [];
        previewContainer.innerHTML = '';
        userAvatar = getPlaceholderAvatar();
        saveData();
        syncSidebarToProfileForm();
        updateProfileMockup();
        renderGrid();
        renderManageList();
      }
    });

    // --- 5. Project management ---
    projectSelect.addEventListener('change', (e) => {
      switchProject(e.target.value);
    });

    btnProjectNew.addEventListener('click', createNewProject);
    btnProjectRename.addEventListener('click', renameActiveProject);
    btnProjectDuplicate.addEventListener('click', duplicateActiveProject);
    btnProjectDelete.addEventListener('click', deleteActiveProject);
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
