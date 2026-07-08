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
