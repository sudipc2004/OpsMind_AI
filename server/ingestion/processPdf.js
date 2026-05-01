const pdf = require('pdf-parse');

/**
 * Parses a PDF buffer into structured page objects.
 */
async function parsePdf(buffer) {
  const data = await pdf(buffer);
  
  // pdf-parse doesn't easily give page breaks in a clean array, 
  // so we split by common page break patterns if possible, 
  // or treat as one big text and chunk it.
  
  // For better accuracy, we'll return the full text and metadata
  return {
    text: data.text,
    pageCount: data.numpages,
    info: data.info
  };
}

/**
 * Chunks text into manageable pieces for embedding.
 */
function chunkText(text, size = 800, overlap = 150) {
  const chunks = [];
  let start = 0;
  
  while (start < text.length) {
    const end = Math.min(start + size, text.length);
    chunks.push(text.slice(start, end));
    start += (size - overlap);
  }
  
  return chunks;
}

module.exports = { parsePdf, chunkText };
