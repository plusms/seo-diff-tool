
const fs = require('fs');
const { JSDOM } = require('jsdom');

const filePath = 'C:\\Users\\koyan\\.gemini\\antigravity\\scratch\\seo-diff-tool\\sample\\https___diff.hvy.jp_diff_pages_word_14_page_71_body_update_6193_.htm';
const content = fs.readFileSync(filePath, 'utf-8');

const dom = new JSDOM(content);
const doc = dom.window.document;

console.log(`Initial Parse: Found ${doc.querySelectorAll('tr').length} rows`);

// Check if it's a View Source file
const body = doc.body;
console.log(`Body ID: ${body.id}`); // Should be 'viewsource'
console.log(`Classes: ${body.className}`);

// Try extracting text content
// In Firefox view-source, the structure is line numbers and spans.
// .textContent typically yields the source code, but with line numbers if we aren't careful.
// Actually, in Firefox view-source, selecting all copy-pastes the code. content of body might include line numbers.
// Let's check a snippet of textContent.
const textContent = body.textContent;
console.log('--- Text Content Preview (first 200 chars) ---');
console.log(textContent.substring(0, 200));

// Try parsing textContent as HTML
const innerDom = new JSDOM(textContent);
const innerDoc = innerDom.window.document;
console.log(`\nInner Parse: Found ${innerDoc.querySelectorAll('tr').length} rows`);

