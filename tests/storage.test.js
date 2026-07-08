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
