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
