# Multi-Project, Export/Import, Reorder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add multi-project support, PNG/JSON export-import, and drag-and-drop post reordering to the Instagram feed simulator, while splitting the monolithic `app.js` into focused ES modules.

**Architecture:** Pure, side-effect-free logic (project CRUD, migration, slugify/serialize/validate, array reordering) lives in small ES modules under `js/` and is covered by Node's built-in test runner. DOM wiring, `localStorage` access, and the `html2canvas` export live in a thin `js/app.js` that imports those modules — this file is verified manually in the browser, not by unit tests, since it has no logic worth unit-testing in isolation from the DOM.

**Tech Stack:** Vanilla ES6, native ES modules (`<script type="module">`, no bundler), `html2canvas` via CDN for image export, Node.js built-in `node:test` + `node:assert/strict` for unit tests (zero npm dependencies).

## Global Constraints

- No build step: native ES modules only, no bundler, no transpilation.
- No new npm dependencies. The only new external dependency is `html2canvas`, loaded via CDN `<script>` tag in `index.html`.
- Phone settings (simulated time, battery, iOS status bar toggle, dark mode toggle) remain **non-persisted** — unchanged from current behavior, not part of the project data model.
- Legacy `localStorage` keys (`ig_profile_posts`, `ig_profile_avatar`, `ig_profile_info`) are read once for migration and never deleted.
- Drag-and-drop reordering is scoped to the sidebar "manage list" only, not the 3-column phone grid.
- Deleting the last remaining project must never leave the app with zero projects — a fresh blank project is created automatically.

## Note on existing uncommitted change

`git status` shows an uncommitted diff in `app.js` that removes the hardcoded demo-post seeding block (~73 lines) from the old `loadData()`. Task 5 below replaces `loadData()`/`saveData()` entirely with the new project-based versions, which never seed demo posts either. That uncommitted diff becomes moot once Task 5 lands — no need to handle it separately, but do not discard it with `git checkout`/`git restore` before starting; just proceed, since Task 5's full-file rewrite supersedes it naturally.

---

### Task 1: `js/storage.js` — project data model, migration, and persistence

**Files:**
- Create: `package.json`
- Create: `js/storage.js`
- Test: `tests/storage.test.js`

**Interfaces:**
- Produces: `createBlankProfile()`, `createProject(name, profile, posts, avatar)`, `migrateLegacyProject(legacyProfile, legacyPosts, legacyAvatar)`, `addProject(projects, project)`, `renameProject(projects, projectId, newName)`, `duplicateProject(projects, projectId, newProject)`, `deleteProject(projects, projectId)`, `updateProjectData(projects, projectId, { profile, posts, avatar })`, `findProject(projects, projectId)`, `loadLegacyData(store)`, `loadProjectsFromStorage(store)`, `loadActiveProjectId(store)`, `saveProjectsToStorage(store, projects, activeProjectId)`, `initializeProjects(store, defaultAvatar)`, constants `PROJECTS_KEY`, `ACTIVE_PROJECT_KEY`, `LEGACY_KEYS`. `store` is any object with `getItem(key)`/`setItem(key, value)` (i.e. `localStorage`-compatible), passed explicitly so the module is testable without a browser.

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "instagram-feed-simulator",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test tests/"
  }
}
```

- [ ] **Step 2: Write the failing tests**

Create `tests/storage.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createBlankProfile,
  createProject,
  migrateLegacyProject,
  addProject,
  renameProject,
  duplicateProject,
  deleteProject,
  findProject,
  initializeProjects,
  PROJECTS_KEY,
  ACTIVE_PROJECT_KEY,
  LEGACY_KEYS
} from '../js/storage.js';

function createFakeStore(initial = {}) {
  const data = { ...initial };
  return {
    getItem: (key) => (key in data ? data[key] : null),
    setItem: (key, value) => { data[key] = value; }
  };
}

test('createBlankProfile returns expected default fields', () => {
  const profile = createBlankProfile();
  assert.equal(profile.username, 'new_profile');
  assert.equal(profile.displayName, 'New Profile');
  assert.equal(profile.followersCount, '0');
  assert.equal(profile.followingCount, '0');
});

test('createProject builds a project with a unique id and given data', () => {
  const profile = createBlankProfile();
  const project = createProject('Client A', profile, [], 'avatar-data');
  assert.equal(project.name, 'Client A');
  assert.equal(project.profile, profile);
  assert.deepEqual(project.posts, []);
  assert.equal(project.avatar, 'avatar-data');
  assert.equal(typeof project.id, 'string');
  assert.ok(project.id.length > 0);
  assert.equal(typeof project.createdAt, 'number');
});

test('createProject generates different ids for two calls', () => {
  const a = createProject('A', createBlankProfile(), [], null);
  const b = createProject('B', createBlankProfile(), [], null);
  assert.notEqual(a.id, b.id);
});

test('migrateLegacyProject uses a fixed project name and the provided data', () => {
  const legacyProfile = { username: 'lasertech_schio' };
  const legacyPosts = [{ id: '1' }];
  const project = migrateLegacyProject(legacyProfile, legacyPosts, 'avatar-b64');
  assert.equal(project.name, 'lasertech_schio');
  assert.equal(project.profile, legacyProfile);
  assert.equal(project.posts, legacyPosts);
  assert.equal(project.avatar, 'avatar-b64');
});

test('migrateLegacyProject falls back to blank profile and empty posts when missing', () => {
  const project = migrateLegacyProject(null, null, null);
  assert.equal(project.profile.username, 'new_profile');
  assert.deepEqual(project.posts, []);
  assert.equal(project.avatar, null);
});

test('addProject appends without mutating the original array', () => {
  const original = [createProject('A', createBlankProfile(), [], null)];
  const project = createProject('B', createBlankProfile(), [], null);
  const result = addProject(original, project);
  assert.equal(original.length, 1);
  assert.equal(result.length, 2);
  assert.equal(result[1], project);
});

test('renameProject only updates the matching project', () => {
  const a = createProject('A', createBlankProfile(), [], null);
  const b = createProject('B', createBlankProfile(), [], null);
  const result = renameProject([a, b], b.id, 'Renamed B');
  assert.equal(result[0].name, 'A');
  assert.equal(result[1].name, 'Renamed B');
  assert.equal(b.name, 'B');
});

test('duplicateProject inserts the copy right after the source project', () => {
  const a = createProject('A', createBlankProfile(), [], null);
  const b = createProject('B', createBlankProfile(), [], null);
  const copy = createProject('A (copia)', createBlankProfile(), [], null);
  const result = duplicateProject([a, b], a.id, copy);
  assert.equal(result.length, 3);
  assert.equal(result[0].id, a.id);
  assert.equal(result[1].id, copy.id);
  assert.equal(result[2].id, b.id);
});

test('duplicateProject returns the original array when the project id is not found', () => {
  const a = createProject('A', createBlankProfile(), [], null);
  const result = duplicateProject([a], 'missing-id', createProject('X', createBlankProfile(), [], null));
  assert.equal(result.length, 1);
  assert.equal(result[0], a);
});

test('deleteProject removes only the matching project', () => {
  const a = createProject('A', createBlankProfile(), [], null);
  const b = createProject('B', createBlankProfile(), [], null);
  const result = deleteProject([a, b], a.id);
  assert.equal(result.length, 1);
  assert.equal(result[0].id, b.id);
});

test('findProject returns null when no project matches', () => {
  const a = createProject('A', createBlankProfile(), [], null);
  assert.equal(findProject([a], 'missing'), null);
});

test('initializeProjects creates a default blank project when storage is empty', () => {
  const store = createFakeStore();
  const { projects, activeProjectId } = initializeProjects(store, 'default-avatar');
  assert.equal(projects.length, 1);
  assert.equal(projects[0].avatar, 'default-avatar');
  assert.equal(activeProjectId, projects[0].id);
});

test('initializeProjects migrates legacy keys into a single project', () => {
  const store = createFakeStore({
    [LEGACY_KEYS.posts]: JSON.stringify([{ id: 'p1' }]),
    [LEGACY_KEYS.profile]: JSON.stringify({ username: 'lasertech_schio' }),
    [LEGACY_KEYS.avatar]: 'legacy-avatar'
  });
  const { projects, activeProjectId } = initializeProjects(store, 'default-avatar');
  assert.equal(projects.length, 1);
  assert.equal(projects[0].name, 'lasertech_schio');
  assert.equal(projects[0].avatar, 'legacy-avatar');
  assert.deepEqual(projects[0].posts, [{ id: 'p1' }]);
  assert.equal(activeProjectId, projects[0].id);
});

test('initializeProjects returns existing projects untouched when present', () => {
  const existing = [createProject('Existing', createBlankProfile(), [], null)];
  const store = createFakeStore({
    [PROJECTS_KEY]: JSON.stringify(existing),
    [ACTIVE_PROJECT_KEY]: existing[0].id
  });
  const { projects, activeProjectId } = initializeProjects(store, 'default-avatar');
  assert.equal(projects.length, 1);
  assert.equal(projects[0].name, 'Existing');
  assert.equal(activeProjectId, existing[0].id);
});

test('initializeProjects repairs a missing or invalid active project id', () => {
  const existing = [createProject('Existing', createBlankProfile(), [], null)];
  const store = createFakeStore({
    [PROJECTS_KEY]: JSON.stringify(existing),
    [ACTIVE_PROJECT_KEY]: 'does-not-exist'
  });
  const { activeProjectId } = initializeProjects(store, 'default-avatar');
  assert.equal(activeProjectId, existing[0].id);
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `node --test tests/storage.test.js`
Expected: FAIL — error resolving `../js/storage.js` (module does not exist yet).

- [ ] **Step 4: Write `js/storage.js`**

```js
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
  store.setItem(PROJECTS_KEY, JSON.stringify(projects));
  store.setItem(ACTIVE_PROJECT_KEY, activeProjectId);
}

export function initializeProjects(store, defaultAvatar) {
  let projects = loadProjectsFromStorage(store);

  if (projects.length === 0) {
    const legacy = loadLegacyData(store);
    const project = (legacy.posts || legacy.profile || legacy.avatar)
      ? migrateLegacyProject(legacy.profile, legacy.posts, legacy.avatar)
      : createProject('Nuovo progetto', createBlankProfile(), [], defaultAvatar);
    projects = [project];
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
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `node --test tests/storage.test.js`
Expected: PASS — all 16 tests green.

- [ ] **Step 6: Commit**

```bash
git add package.json js/storage.js tests/storage.test.js
git commit -m "Add project data model, migration, and persistence module"
```

---

### Task 2: `js/project-io.js` — JSON serialize/validate/slugify

**Files:**
- Create: `js/project-io.js`
- Test: `tests/project-io.test.js`

**Interfaces:**
- Consumes: nothing (standalone module).
- Produces: `slugify(name)`, `serializeProject(project)`, `parseProjectJson(jsonText)`, `validateImportedProjectData(data)`, `downloadTextFile(filename, content, mimeType)`. `downloadTextFile` is a DOM-dependent side effect (creates a `Blob`, an `<a>` element, triggers a download) and is not unit tested — verified manually in Task 7.

- [ ] **Step 1: Write the failing tests**

Create `tests/project-io.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { slugify, serializeProject, parseProjectJson, validateImportedProjectData } from '../js/project-io.js';

test('slugify lowercases, strips accents, and replaces non-alphanumerics with dashes', () => {
  assert.equal(slugify('Laser Tech Schio'), 'laser-tech-schio');
  assert.equal(slugify('Città è bella!'), 'citta-e-bella');
  assert.equal(slugify('  Leading/trailing--dashes  '), 'leading-trailing-dashes');
});

test('slugify falls back to "progetto" for empty or fully-stripped input', () => {
  assert.equal(slugify(''), 'progetto');
  assert.equal(slugify('!!!'), 'progetto');
  assert.equal(slugify(undefined), 'progetto');
});

test('serializeProject outputs only name, profile, posts, and avatar', () => {
  const project = {
    id: 'proj-1',
    name: 'Client A',
    profile: { username: 'client_a' },
    posts: [{ id: 'p1' }],
    avatar: 'avatar-data',
    createdAt: 12345
  };
  const json = serializeProject(project);
  const parsed = JSON.parse(json);
  assert.deepEqual(Object.keys(parsed).sort(), ['avatar', 'name', 'posts', 'profile']);
  assert.equal(parsed.name, 'Client A');
  assert.deepEqual(parsed.posts, [{ id: 'p1' }]);
});

test('parseProjectJson parses valid JSON text', () => {
  const result = parseProjectJson('{"name":"X","profile":{},"posts":[]}');
  assert.equal(result.name, 'X');
});

test('parseProjectJson throws on invalid JSON text', () => {
  assert.throws(() => parseProjectJson('not json'));
});

test('validateImportedProjectData accepts data with an object profile and an array of posts', () => {
  assert.equal(validateImportedProjectData({ profile: {}, posts: [] }), true);
});

test('validateImportedProjectData rejects missing profile', () => {
  assert.equal(validateImportedProjectData({ posts: [] }), false);
});

test('validateImportedProjectData rejects non-array posts', () => {
  assert.equal(validateImportedProjectData({ profile: {}, posts: 'nope' }), false);
});

test('validateImportedProjectData rejects null or non-object input', () => {
  assert.equal(validateImportedProjectData(null), false);
  assert.equal(validateImportedProjectData('string'), false);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test tests/project-io.test.js`
Expected: FAIL — error resolving `../js/project-io.js` (module does not exist yet).

- [ ] **Step 3: Write `js/project-io.js`**

```js
export function slugify(name) {
  const base = (name || 'progetto')
    .toString()
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return base || 'progetto';
}

export function serializeProject(project) {
  const { name, profile, posts, avatar } = project;
  return JSON.stringify({ name, profile, posts, avatar }, null, 2);
}

export function parseProjectJson(jsonText) {
  return JSON.parse(jsonText);
}

export function validateImportedProjectData(data) {
  return Boolean(
    data &&
    typeof data === 'object' &&
    data.profile &&
    typeof data.profile === 'object' &&
    Array.isArray(data.posts)
  );
}

export function downloadTextFile(filename, content, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test tests/project-io.test.js`
Expected: PASS — all 9 tests green.

- [ ] **Step 5: Commit**

```bash
git add js/project-io.js tests/project-io.test.js
git commit -m "Add project JSON serialize/parse/validate module"
```

---

### Task 3: `js/reorder.js` — array reordering + drag wiring

**Files:**
- Create: `js/reorder.js`
- Test: `tests/reorder.test.js`

**Interfaces:**
- Produces: `reorderArray(items, fromIndex, toIndex)` (pure, unit tested), `initDragReorder(listEl, onReorder)` where `onReorder(draggedId, targetId)` is called on drop (DOM-dependent, not unit tested — verified manually in Task 8). Relies on rows inside `listEl` having a `data-drag-id` attribute and `draggable="true"`.

- [ ] **Step 1: Write the failing tests**

Create `tests/reorder.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reorderArray } from '../js/reorder.js';

test('reorderArray moves an item from an earlier index to a later index', () => {
  const result = reorderArray(['a', 'b', 'c', 'd'], 0, 2);
  assert.deepEqual(result, ['b', 'c', 'a', 'd']);
});

test('reorderArray moves an item from a later index to an earlier index', () => {
  const result = reorderArray(['a', 'b', 'c', 'd'], 3, 0);
  assert.deepEqual(result, ['d', 'a', 'b', 'c']);
});

test('reorderArray does not mutate the original array', () => {
  const original = ['a', 'b', 'c'];
  reorderArray(original, 0, 2);
  assert.deepEqual(original, ['a', 'b', 'c']);
});

test('reorderArray returns an equivalent copy when indexes are identical', () => {
  const original = ['a', 'b', 'c'];
  const result = reorderArray(original, 1, 1);
  assert.deepEqual(result, original);
  assert.notEqual(result, original);
});

test('reorderArray returns an unmodified copy for out-of-range indexes', () => {
  const original = ['a', 'b', 'c'];
  assert.deepEqual(reorderArray(original, -1, 1), original);
  assert.deepEqual(reorderArray(original, 0, 5), original);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test tests/reorder.test.js`
Expected: FAIL — error resolving `../js/reorder.js` (module does not exist yet).

- [ ] **Step 3: Write `js/reorder.js`**

```js
export function reorderArray(items, fromIndex, toIndex) {
  if (
    fromIndex === toIndex ||
    fromIndex < 0 || fromIndex >= items.length ||
    toIndex < 0 || toIndex >= items.length
  ) {
    return items.slice();
  }
  const result = items.slice();
  const [moved] = result.splice(fromIndex, 1);
  result.splice(toIndex, 0, moved);
  return result;
}

export function initDragReorder(listEl, onReorder) {
  let draggedId = null;

  listEl.addEventListener('dragstart', (e) => {
    const row = e.target.closest('[data-drag-id]');
    if (!row) return;
    draggedId = row.getAttribute('data-drag-id');
    row.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
  });

  listEl.addEventListener('dragend', (e) => {
    const row = e.target.closest('[data-drag-id]');
    if (row) row.classList.remove('dragging');
    draggedId = null;
  });

  listEl.addEventListener('dragover', (e) => {
    e.preventDefault();
  });

  listEl.addEventListener('drop', (e) => {
    e.preventDefault();
    const targetRow = e.target.closest('[data-drag-id]');
    if (!targetRow || draggedId === null) return;
    const targetId = targetRow.getAttribute('data-drag-id');
    if (targetId === draggedId) return;
    onReorder(draggedId, targetId);
  });
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test tests/reorder.test.js`
Expected: PASS — all 5 tests green.

- [ ] **Step 5: Commit**

```bash
git add js/reorder.js tests/reorder.test.js
git commit -m "Add post reorder module with pure array helper and drag wiring"
```

---

### Task 4: `js/image-export.js` — PNG export via html2canvas

**Files:**
- Create: `js/image-export.js`

**Interfaces:**
- Produces: `exportElementAsImage(element, filename)` — async, calls `window.html2canvas` (loaded globally via CDN script tag added in Task 7), converts the result to a PNG data URL, and triggers a download. Entirely DOM/browser-API dependent (`window.html2canvas`, `canvas.toDataURL`, `document.createElement('a')`) — no unit test; verified manually in Task 7 once wired into the UI.

- [ ] **Step 1: Write `js/image-export.js`**

```js
export async function exportElementAsImage(element, filename) {
  const canvas = await window.html2canvas(element, {
    backgroundColor: null,
    scale: 2
  });
  const dataUrl = canvas.toDataURL('image/png');
  const anchor = document.createElement('a');
  anchor.href = dataUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}
```

- [ ] **Step 2: Commit**

```bash
git add js/image-export.js
git commit -m "Add image export module wrapping html2canvas"
```

(No automated test for this file — it has no branching logic to test in isolation, and its correctness is inherently visual. It is verified by hand in Task 7's manual verification step, where the exported PNG is opened and inspected.)

---

### Task 5: Refactor `app.js` into `js/app.js`, wire the project storage module

**Files:**
- Modify: `app.js` → moved to `js/app.js` (via `git mv`), then edited
- Modify: `index.html:494` (script tag)

**Interfaces:**
- Consumes: everything produced by Task 1 (`js/storage.js`).
- Produces: the app boots from `initializeProjects()` instead of a hardcoded `profile` object; `loadData()`/`saveData()` now read/write through the multi-project model, keeping `projects` and `activeProjectId` as new module-level state alongside the existing `posts`, `profile`, `userAvatar`. Later tasks (6, 7, 8) add UI on top of this without touching `loadData`/`saveData` again.

This task does **not** add the project switcher UI yet — it only replaces the persistence layer so the app keeps working exactly as before (single implicit project, migrated from whatever was in `localStorage`), as a safe checkpoint before adding UI.

- [ ] **Step 1: Move the file**

```bash
git mv app.js js/app.js
```

- [ ] **Step 2: Replace the contents of `js/app.js`**

Replace the whole file with:

```js
/* ==========================================================================
   NEO-GLASS CREATIVE STUDIO - LOGIC & STATE
   Project: Instagram Profile Simulator & iPhone 16 Pro Max Mockup
   ========================================================================== */

import {
  createBlankProfile,
  createProject,
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
```

Notes on what changed vs. the original `app.js`:
- Added the `import { ... } from './storage.js'` block at the top.
- `profile` is now initialized via `createBlankProfile()` instead of the hardcoded `lasertech_schio` object; the real values are loaded a moment later by `loadData()`.
- `loadData()`/`saveData()` are fully replaced to go through `initializeProjects`/`updateProjectData`/`saveProjectsToStorage`.
- Added `loadActiveProjectIntoState()` helper.
- Added the `iphoneFrame` DOM reference (used by Task 7's image export).
- `clearFeedBtn`'s handler now resets only the in-memory `profile`/`posts`/`userAvatar` and calls `saveData()`, instead of calling `localStorage.clear()` — the old behavior would have wiped every saved project, not just the active one.
- Removed `createGradientPlaceholder()` — it was only used by the demo-post seeding block that the pending uncommitted diff already deletes; with `loadData()` rewritten it has no remaining callers.
- Everything else (grid rendering, overlay, carousel, likes, image compression) is unchanged.

- [ ] **Step 3: Update `index.html`'s script tag**

In `index.html`, find (around line 494):

```html
  <!-- JS Code execution -->
  <script src="app.js"></script>
```

Replace with:

```html
  <!-- JS Code execution -->
  <script src="js/app.js" type="module"></script>
```

- [ ] **Step 4: Manually verify in the browser**

Run: `python3 -m http.server 8080` from the project root, then open `http://localhost:8080`.

Expected:
- Page loads with no console errors.
- If `localStorage` already had the old `ig_profile_posts`/`ig_profile_info`/`ig_profile_avatar` keys from before this change, the profile and posts appear exactly as before (migrated automatically).
- Editing username/bio/avatar, adding a post, liking a post, and deleting a post all still work and persist after a page reload.
- "Reset to Factory Defaults" clears the current profile/posts back to blank, without needing to touch any other browser storage.

- [ ] **Step 5: Commit**

```bash
git add app.js js/app.js index.html
git commit -m "Refactor app.js into an ES module and wire the project storage layer"
```

---

### Task 6: Project selector UI (dropdown + new/rename/duplicate/delete)

**Files:**
- Modify: `index.html` (new panel in `#sidebar-left`)
- Modify: `style.css` (new rules for the selector/buttons)
- Modify: `js/app.js`

**Interfaces:**
- Consumes: `createProject`, `findProject`, `renameProject`, `duplicateProject`, `deleteProject`, `saveProjectsToStorage` from `js/storage.js` (already imported in Task 5 for a subset; this task extends the import list).
- Produces: `renderProjectSelector()`, `switchProject(newProjectId)`, `createNewProject()`, `renameActiveProject()`, `duplicateActiveProject()`, `deleteActiveProject()` inside `js/app.js`. No other task depends on these directly.

- [ ] **Step 1: Add the project selector panel to `index.html`**

Find (around line 48-50):

```html
    <aside class="studio-sidebar studio-sidebar-left" id="sidebar-left">
      
      <!-- Profile Customization Panel -->
```

Replace with:

```html
    <aside class="studio-sidebar studio-sidebar-left" id="sidebar-left">

      <!-- Project Selector Panel -->
      <section class="panel-card">
        <h2 class="section-title">
          <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="vertical-align: middle;">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
          </svg>
          Project
        </h2>
        <div class="project-selector-row">
          <select id="project-select" class="form-input project-select"></select>
        </div>
        <div class="project-actions-row">
          <button class="project-icon-btn" id="btn-project-new" title="New project">
            <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          </button>
          <button class="project-icon-btn" id="btn-project-rename" title="Rename project">
            <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4z"></path></svg>
          </button>
          <button class="project-icon-btn" id="btn-project-duplicate" title="Duplicate project">
            <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
          </button>
          <button class="project-icon-btn project-icon-btn-danger" id="btn-project-delete" title="Delete project">
            <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          </button>
        </div>
      </section>

      <!-- Profile Customization Panel -->
```

- [ ] **Step 2: Add CSS rules to `style.css`**

Find the end of the `.btn-secondary:hover` block (around line 418-421):

```css
.btn-secondary:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.2);
}
```

Add immediately after it:

```css

/* Project Selector */
.project-selector-row {
  margin-bottom: 10px;
}

.project-select {
  cursor: pointer;
}

.project-actions-row {
  display: flex;
  gap: 8px;
}

.project-icon-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--studio-glass-border);
  border-radius: 8px;
  padding: 8px;
  color: var(--studio-text-primary);
  cursor: pointer;
  transition: all 0.2s;
}

.project-icon-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.2);
}

.project-icon-btn-danger:hover {
  color: var(--studio-danger);
  border-color: rgba(239, 68, 68, 0.3);
}
```

- [ ] **Step 3: Wire the selector and buttons in `js/app.js`**

Update the import at the top of `js/app.js`:

```js
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
```

In the DOM ELEMENTS section, add (near the other option controls):

```js
  const projectSelect = document.getElementById('project-select');
  const btnProjectNew = document.getElementById('btn-project-new');
  const btnProjectRename = document.getElementById('btn-project-rename');
  const btnProjectDuplicate = document.getElementById('btn-project-duplicate');
  const btnProjectDelete = document.getElementById('btn-project-delete');
```

In the INITIALIZATION section, add `renderProjectSelector();` after `renderManageList();`:

```js
  // --- INITIALIZATION ---
  initClock();
  loadData();
  setupEventListeners();
  syncSidebarToProfileForm();
  updateProfileMockup();
  renderGrid();
  renderManageList();
  renderProjectSelector();
```

Add these new functions (place them right after `loadActiveProjectIntoState()`):

```js
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
```

In `setupEventListeners()`, add (as its own numbered block, e.g. after the "4. Controls Simulator" block):

```js
    // --- 5. Project management ---
    projectSelect.addEventListener('change', (e) => {
      switchProject(e.target.value);
    });

    btnProjectNew.addEventListener('click', createNewProject);
    btnProjectRename.addEventListener('click', renameActiveProject);
    btnProjectDuplicate.addEventListener('click', duplicateActiveProject);
    btnProjectDelete.addEventListener('click', deleteActiveProject);
```

- [ ] **Step 4: Manually verify in the browser**

Run: `python3 -m http.server 8080` (if not already running), open `http://localhost:8080`.

Expected:
- The dropdown shows one project (the migrated or default one) selected.
- "New project" (+) prompts for a name, creates and switches to a blank project; the dropdown now lists two projects.
- Editing the new project's profile/posts does not affect the other project (switch back to confirm).
- "Rename" updates the dropdown label immediately.
- "Duplicate" creates a copy with "(copy)" appended, switches to it, and the copy has the same posts/profile as the source at the time of duplication.
- "Delete" removes the active project and switches to another one; deleting the very last remaining project creates a fresh blank one instead of leaving the app with none.

- [ ] **Step 5: Commit**

```bash
git add index.html style.css js/app.js
git commit -m "Add multi-project selector UI (new/rename/duplicate/delete)"
```

---

### Task 7: Export image (html2canvas) + export/import project JSON

**Files:**
- Modify: `index.html` (html2canvas CDN script, new Export/Import panel)
- Modify: `js/app.js`

**Interfaces:**
- Consumes: `exportElementAsImage` from `js/image-export.js` (Task 4); `slugify`, `serializeProject`, `parseProjectJson`, `validateImportedProjectData`, `downloadTextFile` from `js/project-io.js` (Task 2); `createProject`, `findProject` from `js/storage.js`.
- Produces: no new exports for other tasks — this is a leaf integration.

- [ ] **Step 1: Add the html2canvas CDN script to `index.html`**

Find (around line 494, after Task 5's edit):

```html
  <!-- JS Code execution -->
  <script src="js/app.js" type="module"></script>
```

Replace with:

```html
  <!-- html2canvas (image export) -->
  <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>

  <!-- JS Code execution -->
  <script src="js/app.js" type="module"></script>
```

- [ ] **Step 2: Add the Export/Import panel to `index.html`**

Find the end of the "Curate Profile Grid" section and the start of "Interactive Guide" (around lines 466-469):

```html
        <button class="btn-secondary" id="btn-clear-feed" style="color: var(--studio-danger); border-color: rgba(239, 68, 68, 0.2); background: rgba(239, 68, 68, 0.02);">
          Reset to Factory Defaults
        </button>
      </section>

      <!-- Interactive Instructions Tips -->
```

Replace with:

```html
        <button class="btn-secondary" id="btn-clear-feed" style="color: var(--studio-danger); border-color: rgba(239, 68, 68, 0.2); background: rgba(239, 68, 68, 0.02);">
          Reset to Factory Defaults
        </button>
      </section>

      <!-- Export / Import Panel -->
      <section class="panel-card">
        <h2 class="section-title">
          <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="vertical-align: middle;">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
          Export / Import
        </h2>
        <button class="btn-primary" id="btn-export-image">
          <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <circle cx="8.5" cy="8.5" r="1.5"></circle>
            <polyline points="21 15 16 10 5 21"></polyline>
          </svg>
          Export as Image
        </button>
        <button class="btn-secondary" id="btn-export-json">Export Project (JSON)</button>
        <button class="btn-secondary" id="btn-import-json">Import Project (JSON)</button>
        <input type="file" id="import-json-input" accept="application/json" style="display: none;">
      </section>

      <!-- Interactive Instructions Tips -->
```

- [ ] **Step 3: Wire the buttons in `js/app.js`**

Update the import block at the top of `js/app.js` to add two more module imports:

```js
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
import { slugify, serializeProject, parseProjectJson, validateImportedProjectData, downloadTextFile } from './project-io.js';
import { exportElementAsImage } from './image-export.js';
```

In the DOM ELEMENTS section, add:

```js
  const btnExportImage = document.getElementById('btn-export-image');
  const btnExportJson = document.getElementById('btn-export-json');
  const btnImportJson = document.getElementById('btn-import-json');
  const importJsonInput = document.getElementById('import-json-input');
```

In `setupEventListeners()`, add a new block (after the "5. Project management" block added in Task 6):

```js
    // --- 6. Export / Import ---
    btnExportImage.addEventListener('click', async () => {
      const project = findProject(projects, activeProjectId);
      try {
        await exportElementAsImage(iphoneFrame, `${slugify(project.name)}-mockup.png`);
      } catch (err) {
        console.error('Error exporting image:', err);
        alert('Image export failed. Please try again.');
      }
    });

    btnExportJson.addEventListener('click', () => {
      const project = findProject(projects, activeProjectId);
      const json = serializeProject(project);
      downloadTextFile(`${slugify(project.name)}.json`, json, 'application/json');
    });

    btnImportJson.addEventListener('click', () => {
      importJsonInput.click();
    });

    importJsonInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = parseProjectJson(text);
        if (!validateImportedProjectData(data)) {
          alert('The selected file is not a valid project.');
          return;
        }
        const overwrite = confirm(
          'Overwrite the active project with this import? Click Cancel to create it as a new project instead.'
        );
        if (overwrite) {
          profile = data.profile;
          posts = data.posts;
          userAvatar = data.avatar || getPlaceholderAvatar();
          saveData();
          syncSidebarToProfileForm();
          updateProfileMockup();
          renderGrid();
          renderManageList();
        } else {
          const project = createProject(
            data.name || 'Imported project',
            data.profile,
            data.posts,
            data.avatar || getPlaceholderAvatar()
          );
          projects = [...projects, project];
          switchProject(project.id);
        }
      } catch (err) {
        console.error('Error importing project:', err);
        alert('Could not read the selected file.');
      } finally {
        importJsonInput.value = '';
      }
    });
```

- [ ] **Step 4: Manually verify in the browser**

Run: `python3 -m http.server 8080` (if not already running), open `http://localhost:8080`.

Expected:
- "Export as Image" downloads a PNG named `<project-name-slug>-mockup.png`; opening it shows the iPhone frame with the current profile/grid rendered.
- "Export Project (JSON)" downloads a `.json` file containing `name`, `profile`, `posts`, `avatar`.
- "Import Project (JSON)" with that same file: choosing "OK" (overwrite) replaces the active project's content in place; choosing "Cancel" creates a new project in the dropdown with the imported content.
- Importing a JSON file that lacks `profile` or `posts` shows the "not a valid project" alert and does not change any state.

- [ ] **Step 5: Commit**

```bash
git add index.html js/app.js
git commit -m "Add PNG export and project JSON export/import"
```

---

### Task 8: Drag-and-drop reorder in the manage list

**Files:**
- Modify: `js/app.js`
- Modify: `style.css`

**Interfaces:**
- Consumes: `reorderArray`, `initDragReorder` from `js/reorder.js` (Task 3).
- Produces: nothing consumed by later tasks (this is the last task).

- [ ] **Step 1: Add CSS for the draggable rows**

In `style.css`, find (around line 1351-1359):

```css
.manage-post-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgba(0, 0, 0, 0.15);
  border: 1px solid var(--studio-glass-border);
  border-radius: 8px;
  padding: 8px 12px;
}
```

Replace with:

```css
.manage-post-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgba(0, 0, 0, 0.15);
  border: 1px solid var(--studio-glass-border);
  border-radius: 8px;
  padding: 8px 12px;
  cursor: grab;
}

.manage-post-item.dragging {
  opacity: 0.4;
}
```

- [ ] **Step 2: Wire reordering in `js/app.js`**

Update the import block at the top of `js/app.js` to add:

```js
import { reorderArray, initDragReorder } from './reorder.js';
```

In `renderManageList()`, find:

```js
    posts.forEach((post) => {
      const item = document.createElement('div');
      item.className = 'manage-post-item';
      item.innerHTML = `
```

Replace with:

```js
    posts.forEach((post) => {
      const item = document.createElement('div');
      item.className = 'manage-post-item';
      item.setAttribute('draggable', 'true');
      item.setAttribute('data-drag-id', post.id);
      item.innerHTML = `
```

After the `renderManageList()` function, add:

```js
  function handlePostReorder(draggedId, targetId) {
    const fromIndex = posts.findIndex((p) => p.id === draggedId);
    const toIndex = posts.findIndex((p) => p.id === targetId);
    if (fromIndex === -1 || toIndex === -1) return;
    posts = reorderArray(posts, fromIndex, toIndex);
    saveData();
    renderGrid();
    renderManageList();
  }
```

In the INITIALIZATION section, add `initDragReorder(manageList, handlePostReorder);` after `renderProjectSelector();`:

```js
  // --- INITIALIZATION ---
  initClock();
  loadData();
  setupEventListeners();
  syncSidebarToProfileForm();
  updateProfileMockup();
  renderGrid();
  renderManageList();
  renderProjectSelector();
  initDragReorder(manageList, handlePostReorder);
```

(`initDragReorder` attaches its listeners once to the stable `manageList` container, using event delegation via `[data-drag-id]` lookups — it does not need to be re-called each time `renderManageList()` rebuilds the rows.)

- [ ] **Step 3: Manually verify in the browser**

Run: `python3 -m http.server 8080` (if not already running), open `http://localhost:8080`.

Expected:
- With at least 3 posts, dragging a row in the "Curate Profile Grid" list to a new position reorders it there, and the 3-column phone grid updates to match the new order.
- The dragged row shows reduced opacity while being dragged.
- Reordering persists after a page reload.
- Tapping a grid cell on the phone still opens its post detail overlay as before (unaffected by this change, since dragging is scoped to the sidebar list only).

- [ ] **Step 4: Commit**

```bash
git add js/app.js style.css
git commit -m "Add drag-and-drop reordering for posts in the manage list"
```

---

## Self-Review Notes

- **Spec coverage:** Task 1-2 cover multi-project + migration; Task 2 also covers JSON serialize/validate for import/export; Task 4+7 cover image export; Task 7 covers JSON import/export UI; Task 3+8 cover drag-and-drop reorder; Task 5 covers the ES module split. All four spec features and the architecture section are covered.
- **Placeholder scan:** no TODOs; every step has complete code or exact verification instructions.
- **Type/name consistency:** checked that `createProject(name, profile, posts, avatar)` argument order and `findProject(projects, projectId)` naming are used identically across Tasks 1, 6, 7, 8. `reorderArray(items, fromIndex, toIndex)` and `initDragReorder(listEl, onReorder)` signatures match between Task 3's definition and Task 8's usage. `exportElementAsImage(element, filename)` matches between Task 4's definition and Task 7's usage.
- **Scope:** all 8 tasks stay within the approved design; no unapproved feature added. The `clearFeedBtn` behavior change and `createGradientPlaceholder` removal in Task 5 are both flagged inline as necessary consequences of the data-model refactor, not scope creep.
