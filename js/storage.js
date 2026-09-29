export const PROJECTS_KEY = 'ig_projects';
export const ACTIVE_PROJECT_KEY = 'ig_active_project_id';

export const LEGACY_KEYS = {
  posts: 'ig_profile_posts',
  avatar: 'ig_profile_avatar',
  profile: 'ig_profile_info'
};

export function createBlankProfile() {
  return {
    username: 'new_profile',
    displayName: 'New Profile',
    category: '',
    bioText: '',
    bioLink: '',
    followersCount: '0',
    followingCount: '0'
  };
}

function generateProjectId() {
  return `proj-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createProject(name, profile, posts, avatar) {
  return {
    id: generateProjectId(),
    name,
    profile,
    posts,
    avatar,
    createdAt: Date.now()
  };
}

export function migrateLegacyProject(legacyProfile, legacyPosts, legacyAvatar) {
  return createProject(
    'lasertech_schio',
    legacyProfile || createBlankProfile(),
    legacyPosts || [],
    legacyAvatar || null
  );
}

export function addProject(projects, project) {
  return [...projects, project];
}

export function renameProject(projects, projectId, newName) {
  return projects.map((p) => (p.id === projectId ? { ...p, name: newName } : p));
}

export function duplicateProject(projects, projectId, newProject) {
  const index = projects.findIndex((p) => p.id === projectId);
  if (index === -1) return projects;
  const copy = projects.slice();
  copy.splice(index + 1, 0, newProject);
  return copy;
}

export function deleteProject(projects, projectId) {
  return projects.filter((p) => p.id !== projectId);
}

export function updateProjectData(projects, projectId, { profile, posts, avatar }) {
  return projects.map((p) => (p.id === projectId ? { ...p, profile, posts, avatar } : p));
}

export function findProject(projects, projectId) {
  return projects.find((p) => p.id === projectId) || null;
}

export function loadLegacyData(store) {
  let posts = null;
  let profile = null;
  const savedPosts = store.getItem(LEGACY_KEYS.posts);
  const savedProfile = store.getItem(LEGACY_KEYS.profile);
  const savedAvatar = store.getItem(LEGACY_KEYS.avatar);

  if (savedPosts) {
    try {
      posts = JSON.parse(savedPosts);
    } catch (e) {
      posts = null;
    }
  }
  if (savedProfile) {
    try {
      profile = JSON.parse(savedProfile);
    } catch (e) {
      profile = null;
    }
  }
  return { posts, profile, avatar: savedAvatar };
}

export function loadProjectsFromStorage(store) {
  const raw = store.getItem(PROJECTS_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

export function loadActiveProjectId(store) {
  return store.getItem(ACTIVE_PROJECT_KEY);
}

export function saveProjectsToStorage(store, projects, activeProjectId) {
  try {
    store.setItem(PROJECTS_KEY, JSON.stringify(projects));
    store.setItem(ACTIVE_PROJECT_KEY, activeProjectId);
  } catch (err) {
    console.warn('LocalStorage quota exceeded or write failed:', err);
    try {
      if (typeof store.removeItem === 'function') {
        store.removeItem(LEGACY_KEYS.posts);
        store.removeItem(LEGACY_KEYS.profile);
        store.removeItem(LEGACY_KEYS.avatar);
      }
      store.setItem(PROJECTS_KEY, JSON.stringify(projects));
      store.setItem(ACTIVE_PROJECT_KEY, activeProjectId);
    } catch (e2) {
      console.warn('Storage quota still exceeded after clearing legacy keys:', e2);
    }
  }
}

export function initializeProjects(store, defaultAvatar) {
  let projects = loadProjectsFromStorage(store);

  if (projects.length === 0) {
    const legacy = loadLegacyData(store);
    const project = (legacy.posts || legacy.profile || legacy.avatar)
      ? migrateLegacyProject(legacy.profile, legacy.posts, legacy.avatar)
      : createProject('Nuovo progetto', createBlankProfile(), [], defaultAvatar);
    projects = [project];
    try {
      if (typeof store.removeItem === 'function') {
        store.removeItem(LEGACY_KEYS.posts);
        store.removeItem(LEGACY_KEYS.profile);
        store.removeItem(LEGACY_KEYS.avatar);
      }
    } catch (e) {}
    saveProjectsToStorage(store, projects, project.id);
    return { projects, activeProjectId: project.id };
  }

  let activeProjectId = loadActiveProjectId(store);
  if (!activeProjectId || !findProject(projects, activeProjectId)) {
    activeProjectId = projects[0].id;
    saveProjectsToStorage(store, projects, activeProjectId);
  }

  return { projects, activeProjectId };
}
