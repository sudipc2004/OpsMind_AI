const pdfParse = require('pdf-parse');

/**
 * Extract plain text from a PDF buffer.
 * Returns an array of { page, text } objects, one per page.
 */
async function parsePdf(buffer) {
  const options = {
    // Called for each page during parsing
    pagerender: async function (pageData) {
      const textContent = await pageData.getTextContent();
      return textContent.items.map((item) => item.str).join(' ');
    },
  };

  const data = await pdfParse(buffer, options);

  // pdf-parse gives us all text; split by form-feed character (page breaks)
  const rawText = data.text;

  // Split into pages if possible, otherwise treat as single page
  const pages = rawText.split(/\f/).filter((p) => p.trim().length > 0);

  if (pages.length === 0) {
    return [{ page: 1, text: rawText.trim() }];
  }

  return pages.map((text, idx) => ({ page: idx + 1, text: text.trim() }));
}

module.exports = { parsePdf };
