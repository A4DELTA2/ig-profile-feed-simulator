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
