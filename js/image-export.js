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
