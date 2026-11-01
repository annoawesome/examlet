/** Triggers a browser download of `text` without any server round trip. */
export function downloadTextFile(fileName: string, text: string, mimeType = 'application/json'): void {
  const url = URL.createObjectURL(new Blob([text], { type: mimeType }));

  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();

  // Give the browser a tick to start the download before revoking.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
