/**
 * Split an array of page objects into overlapping text chunks
 * suitable for embedding.
 *
 * @param {Array<{page: number, text: string}>} pages
 * @param {{ chunkSize?: number, overlap?: number }} options
 * @returns {Array<{text: string, page: number, chunkIndex: number}>}
 */
function chunkPages(pages, { chunkSize = 800, overlap = 150 } = {}) {
  const chunks = [];
  let globalIndex = 0;

  for (const { page, text } of pages) {
    // Split into words and slide a window
    const words = text.split(/\s+/).filter(Boolean);

    if (words.length === 0) continue;

    let start = 0;
    while (start < words.length) {
      const end = Math.min(start + chunkSize, words.length);
      const chunkText = words.slice(start, end).join(' ');

      if (chunkText.trim().length > 20) {
        chunks.push({
          text: chunkText,
          page,
          chunkIndex: globalIndex++,
        });
      }

      if (end === words.length) break;
      start += chunkSize - overlap;
    }
  }

  return chunks;
}

module.exports = { chunkPages };
