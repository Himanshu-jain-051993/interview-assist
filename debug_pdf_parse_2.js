
const pdf = require("pdf-parse");
console.log("pdf.PDFParse type:", typeof pdf.PDFParse);
// Try calling it if it's a function or class
if (typeof pdf.PDFParse === 'function') {
  try {
    console.log("Attempting to call it as function...");
    pdf.PDFParse(Buffer.from(""));
  } catch (e) {
    console.log("Call result:", e.message);
  }
}
