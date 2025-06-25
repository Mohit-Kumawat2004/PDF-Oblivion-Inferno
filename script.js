// === Theme Initialization ===
if (!localStorage.getItem("theme")) {
  localStorage.setItem("theme", "dark");
}
if (localStorage.getItem("theme") === "dark") {
  document.body.classList.add("dark");
} else {
  document.body.classList.remove("dark");
}

const imageInput = document.getElementById("image");
const imagePreviewContainer = document.getElementById("imagePreviewContainer");
let selectedImages = [];

imageInput.addEventListener("change", function () {
  const files = Array.from(this.files).filter((f) =>
    f.type.startsWith("image/")
  );
  selectedImages = files;
  renderImagePreviews();
});

function renderImagePreviews() {
  imagePreviewContainer.innerHTML = "";
  selectedImages.forEach((file, idx) => {
    const reader = new FileReader();
    reader.onload = function (e) {
      const div = document.createElement("div");
      div.className = "image-thumb";
      div.innerHTML = `
        <img src="${e.target.result}" alt="Image ${idx + 1}">
        <button class="remove-image-btn" data-idx="${idx}">&times;</button>
      `;
      imagePreviewContainer.appendChild(div);
    };
    reader.readAsDataURL(file);
  });
}

imagePreviewContainer.addEventListener("click", function (e) {
  if (e.target.classList.contains("remove-image-btn")) {
    const idx = parseInt(e.target.getAttribute("data-idx"));
    selectedImages.splice(idx, 1);
    renderImagePreviews();
    imageInput.value = "";
  }
});

async function generatePDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  const title = document.getElementById("title").value.trim();
  const content = document.getElementById("content").value.trim();

  if (!title || !content) {
    alert("Please enter both title and content.");
    return;
  }

  doc.setFontSize(18);
  doc.setFont("Helvetica", "bold");
  doc.text(title, 20, 30);

  doc.setFontSize(12);
  doc.setFont("Helvetica", "normal");
  doc.text(content, 20, 50, { maxWidth: 170 });

  if (selectedImages.length === 0) {
    doc.save(`${title}.pdf`);
    return;
  }

  for (let i = 0; i < selectedImages.length; i++) {
    const file = selectedImages[i];
    const imgData = await fileToDataURL(file);
    const img = new Image();
    img.src = imgData;
    await new Promise((res) => (img.onload = res));

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    let width = pageWidth,
      height = pageHeight;
    const imgAspect = img.width / img.height;
    const pageAspect = pageWidth / pageHeight;

    if (imgAspect > pageAspect) {
      height = pageWidth / imgAspect;
    } else {
      width = pageHeight * imgAspect;
    }

    const x = (pageWidth - width) / 2;
    const y = (pageHeight - height) / 2;

    doc.addPage();
    doc.addImage(imgData, "JPEG", x, y, width, height);
  }

  doc.deletePage(1);
  doc.save(`${title}.pdf`);
}

function fileToDataURL(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.readAsDataURL(file);
  });
}

// === Notes Maker Input Validation ===
imageInput.addEventListener("change", function () {
  const invalid = Array.from(this.files).some(
    (file) => !file.type.startsWith("image/")
  );
  if (invalid) {
    alert("Please select only valid image files.");
    this.value = "";
    selectedImages = [];
    renderImagePreviews();
  }
});

document.getElementById("title").addEventListener("input", function () {
  this.value = this.value.replace(/[^a-zA-Z0-9\s]/g, "");
});
document.getElementById("content").addEventListener("input", function () {
  this.value = this.value.replace(/[^a-zA-Z0-9\s.,!?]/g, "");
});

document.getElementById("generateBtn").addEventListener("click", generatePDF);

function toggleTheme() {
  document.body.classList.toggle("dark");
  const theme = document.body.classList.contains("dark") ? "dark" : "light";
  localStorage.setItem("theme", theme);
}

// === PDF TO IMAGE CONVERTER ===
const pdfImageInput = document.getElementById("pdfImageInput");
const convertPdfToImageBtn = document.getElementById("convertPdfToImageBtn");
const pdfImageOutput = document.getElementById("pdfImageOutput");
const downloadImageZipBtn = document.getElementById("downloadImageZipBtn");

pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js";

convertPdfToImageBtn.addEventListener("click", async () => {
  const file = pdfImageInput.files[0];
  if (!file || file.type !== "application/pdf") {
    alert("Please upload a valid PDF file.");
    return;
  }

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  pdfImageOutput.innerHTML = "";
  const imageUrls = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const scale = 2;
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    await page.render({ canvasContext: context, viewport }).promise;

    const imgData = canvas.toDataURL("image/png");
    imageUrls.push({ url: imgData, name: `page-${i}.png` });

    const img = document.createElement("img");
    img.src = imgData;
    img.alt = `Page ${i}`;
    img.style.maxWidth = "100%";
    img.style.marginBottom = "10px";
    pdfImageOutput.appendChild(img);
  }

  downloadImageZipBtn.onclick = () => downloadImagesAsZip(imageUrls);
  downloadImageZipBtn.style.display = "inline-block";
});

async function downloadImagesAsZip(images) {
  const zip = new JSZip();
  images.forEach((img) => {
    const base64Data = img.url.split("base64,")[1];
    zip.file(img.name, base64Data, { base64: true });
  });

  const blob = await zip.generateAsync({ type: "blob" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "pdf_images.zip";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// === Add Clear Button Logic ===
const clearImageInputBtn = document.getElementById("clearImageInputBtn");
const clearDocInputBtn = document.getElementById("clearDocInputBtn");
const pdfDocInput = document.getElementById("pdfDocInput");

pdfImageInput.addEventListener("change", () => {
  clearImageInputBtn.style.display =
    pdfImageInput.files.length > 0 ? "inline-block" : "none";
});
clearImageInputBtn.addEventListener("click", () => {
  pdfImageInput.value = "";
  clearImageInputBtn.style.display = "none";
  pdfImageOutput.innerHTML = "";
  downloadImageZipBtn.style.display = "none";
});

pdfDocInput.addEventListener("change", () => {
  clearDocInputBtn.style.display =
    pdfDocInput.files.length > 0 ? "inline-block" : "none";
});
clearDocInputBtn.addEventListener("click", () => {
  pdfDocInput.value = "";
  clearDocInputBtn.style.display = "none";
  document.getElementById("pdfDocOutput").innerHTML = "";
});

// === PDF TO DOC CONVERTER ===
const convertPdfToDocBtn = document.getElementById("convertPdfToDocBtn");
const pdfDocOutput = document.getElementById("pdfDocOutput");
const downloadDocBtn = document.getElementById("downloadDocBtn");

let docTextContent = "";
let currentDocFile = null;

// Convert PDF to DOC (extract text and preview)
convertPdfToDocBtn.addEventListener("click", async () => {
  const file = pdfDocInput.files[0];
  if (!file || file.type !== "application/pdf") {
    alert("Please upload a valid PDF file.");
    return;
  }

  currentDocFile = file;

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  docTextContent = "";
  pdfDocOutput.innerHTML = "";

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const strings = content.items.map((item) => item.str).join(" ");
    docTextContent += `Page ${i}:\n${strings}\n\n`;
  }

  // Show preview
  const preview = document.createElement("pre");
  preview.textContent = docTextContent.substring(0, 3000) + "\n...\n"; // limit preview
  preview.className = "doc-preview";
  pdfDocOutput.appendChild(preview);

  // Add remove button
  const removeBtn = document.createElement("button");
  removeBtn.textContent = "❌";
  removeBtn.className = "remove-pdf-btn";
  removeBtn.onclick = () => {
    pdfDocInput.value = "";
    pdfDocOutput.innerHTML = "";
    docTextContent = "";
    currentDocFile = null;
  };
  pdfDocOutput.appendChild(removeBtn);

  downloadDocBtn.style.display = "inline-block";
});

// Download DOC (text content saved as .doc file)
downloadDocBtn.addEventListener("click", () => {
  if (!docTextContent) return;
  const blob = new Blob([docTextContent], { type: "application/msword" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download =
    currentDocFile?.name.replace(/\.pdf$/, ".doc") || "converted.doc";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
});

//========= PDF INTO PPTX JAVASCRIPT FUNCTIONALITY=================
const pdfPptInput = document.getElementById("pdfPptInput");
const convertPdfToPptBtn = document.getElementById("convertPdfToPptBtn");
const pdfPptOutput = document.getElementById("pdfPptOutput"); 
const downloadPptBtn = document.getElementById("downloadPptBtn");
const clearPptInputBtn = document.getElementById("clearPptInputBtn");

let pptx = new PptxGenJS();
let pptPages = [];

// Show/hide clear button for PPT input
pdfPptInput.addEventListener("change", function () {
  clearPptInputBtn.style.display =
    this.files.length > 0 ? "inline-block" : "none";
});

// Clear PPT input and output
clearPptInputBtn.addEventListener("click", function () {
  pdfPptInput.value = "";
  clearPptInputBtn.style.display = "none";
  pdfPptOutput.innerHTML = "";
  downloadPptBtn.style.display = "none";
});

convertPdfToPptBtn.addEventListener("click", async () => {
  const file = pdfPptInput.files[0];
  if (!file || file.type !== "application/pdf") {
    alert("Please upload a valid PDF file.");
    return;
  }

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  pdfPptOutput.innerHTML = "";
  pptx = new PptxGenJS(); // reset
  pptPages = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 2 });

    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    await page.render({ canvasContext: context, viewport }).promise;

    const imgData = canvas.toDataURL("image/png");

    const img = document.createElement("img");
    img.src = imgData;
    img.style.maxWidth = "100%";
    img.style.marginBottom = "10px";
    pdfPptOutput.appendChild(img);

    // Add image as slide
    const slide = pptx.addSlide();
    slide.addImage({ data: imgData, x: 0, y: 0, w: 10, h: 5.6 }); // 10x5.6 inches = 16:9
  }

  downloadPptBtn.style.display = "inline-block";
});

downloadPptBtn.addEventListener("click", () => {
  pptx.writeFile("converted-presentation.pptx");
});

// ============PDF'S COMPRESSOR TOOL===================
const pdfCompressInput = document.getElementById("pdfCompressInput");
const clearCompressInputBtn = document.getElementById("clearCompressInputBtn");
const pdfCompressPreview = document.getElementById("pdfCompressPreview");
const compressPdfBtn = document.getElementById("compressPdfBtn");
const pdfCompressOutput = document.getElementById("pdfCompressOutput");
const downloadCompressedPdfBtn = document.getElementById("downloadCompressedPdfBtn");

let compressedBlob = null;
let originalSize = 0;
let compressedSize = 0;

// Show/hide clear button and preview file info
pdfCompressInput.addEventListener("change", function () {
  if (this.files.length > 0) {
    clearCompressInputBtn.style.display = "inline-block";
    const file = this.files[0];
    originalSize = file.size;
    pdfCompressPreview.innerHTML = `
      <b>Selected:</b> ${file.name}<br>
      <b>Size:</b> ${(file.size / 1024 / 1024).toFixed(2)} MB
    `;
    pdfCompressOutput.innerHTML = "";
    downloadCompressedPdfBtn.style.display = "none";
  } else {
    clearCompressInputBtn.style.display = "none";
    pdfCompressPreview.innerHTML = "";
  }
});

// Clear input and output
clearCompressInputBtn.addEventListener("click", function () {
  pdfCompressInput.value = "";
  clearCompressInputBtn.style.display = "none";
  pdfCompressPreview.innerHTML = "";
  pdfCompressOutput.innerHTML = "";
  downloadCompressedPdfBtn.style.display = "none";
  compressedBlob = null;
});

// Compress PDF
compressPdfBtn.addEventListener("click", async () => {
  const file = pdfCompressInput.files[0];
  if (!file || file.type !== "application/pdf") {
    alert("Please upload a valid PDF file.");
    return;
  }
  pdfCompressOutput.innerHTML = "Compressing...";
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFLib.PDFDocument.load(arrayBuffer, { updateMetadata: true });
    // Remove metadata (optional, can help reduce size)
    pdfDoc.setTitle('');
    pdfDoc.setAuthor('');
    pdfDoc.setSubject('');
    pdfDoc.setKeywords([]);
    pdfDoc.setProducer('');
    pdfDoc.setCreator('');
    pdfDoc.setCreationDate(new Date());
    pdfDoc.setModificationDate(new Date());

    // Save as new PDF (this can reduce size by removing unused objects/metadata)
    const compressedBytes = await pdfDoc.save({ useObjectStreams: true });
    compressedBlob = new Blob([compressedBytes], { type: "application/pdf" });
    compressedSize = compressedBlob.size;

    pdfCompressOutput.innerHTML = `
      <b>Original Size:</b> ${(originalSize / 1024).toFixed(1)} KB<br>
      <b>Compressed Size:</b> ${(compressedSize / 1024).toFixed(1)} KB<br>
      <b>Reduction:</b> ${((1 - compressedSize / originalSize) * 100).toFixed(1)}%
    `;
    downloadCompressedPdfBtn.style.display = "inline-block";
  } catch (err) {
    pdfCompressOutput.innerHTML = "Compression failed: " + err.message;
    downloadCompressedPdfBtn.style.display = "none";
  }
});

// Download compressed PDF
downloadCompressedPdfBtn.addEventListener("click", () => {
  if (!compressedBlob) return;
  const a = document.createElement("a");
  a.href = URL.createObjectURL(compressedBlob);
  a.download = "compressed.pdf";
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
});

//===============PDF TO TEXT  CONVERTER=====================
// === PDF TO TEXT CONVERTER ===
const pdfTextInput = document.getElementById("pdfTextInput");
const clearTextInputBtn = document.getElementById("clearTextInputBtn");
const convertPdfToTextBtn = document.getElementById("convertPdfToTextBtn");
const pdfTextOutput = document.getElementById("pdfTextOutput");
const downloadTextBtn = document.getElementById("downloadTextBtn");

let extractedText = "";

// Show/hide clear button for text input
pdfTextInput.addEventListener("change", function () {
  clearTextInputBtn.style.display = this.files.length > 0 ? "inline-block" : "none";
});

// Clear input and output
clearTextInputBtn.addEventListener("click", function () {
  pdfTextInput.value = "";
  clearTextInputBtn.style.display = "none";
  pdfTextOutput.innerHTML = "";
  downloadTextBtn.style.display = "none";
  extractedText = "";
});

// Convert PDF to text
convertPdfToTextBtn.addEventListener("click", async () => {
  const file = pdfTextInput.files[0];
  if (!file || file.type !== "application/pdf") {
    alert("Please upload a valid PDF file.");
    return;
  }
  pdfTextOutput.innerHTML = "Extracting text...";
  extractedText = "";
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  async function processPage(i) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map(item => item.str).join(" ");
    extractedText += pageText + "\n\n";
    pdfTextOutput.innerHTML = `<div>Processed page ${i} of ${pdf.numPages}</div>`;
    if (i < pdf.numPages) {
      setTimeout(() => processPage(i + 1), 10);
    } else {
      pdfTextOutput.innerHTML = `<textarea style="width:100%;height:120px">${extractedText}</textarea>`;
      downloadTextBtn.style.display = "inline-block";
    }
  }
  processPage(1);
});

// Download extracted text as .txt file
downloadTextBtn.addEventListener("click", () => {
  const blob = new Blob([extractedText], { type: "text/plain" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "extracted.txt";
  a.click();
});

//=========== PDF TO HTML CONVERTER ==============================
const pdfHtmlInput = document.getElementById("pdfHtmlInput");
const clearHtmlInputBtn = document.getElementById("clearHtmlInputBtn");
const convertPdfToHtmlBtn = document.getElementById("convertPdfToHtmlBtn");
const pdfHtmlOutput = document.getElementById("pdfHtmlOutput");
const downloadHtmlBtn = document.getElementById("downloadHtmlBtn");
let htmlContent = "";
// Show/hide clear button for HTML input
pdfHtmlInput.addEventListener("change", function () {
  clearHtmlInputBtn.style.display = this.files.length > 0 ? "inline-block" : "none";
});

// Clear input and output
clearHtmlInputBtn.addEventListener("click", function () {
  pdfHtmlInput.value = "";
  clearHtmlInputBtn.style.display = "none";
  pdfHtmlOutput.innerHTML = "";
  downloadHtmlBtn.style.display = "none";
  htmlContent = "";
});

// Convert PDF to HTML
convertPdfToHtmlBtn.addEventListener("click", async () => {
  const file = pdfHtmlInput.files[0];
  if (!file || file.type !== "application/pdf") {
    alert("Please upload a valid PDF file.");
    return;
  }
  pdfHtmlOutput.innerHTML = "Converting to HTML...";
  htmlContent = "";
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  async function processPage(i) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map(item => item.str).join(" ");
    htmlContent += `<div class="pdf-page"><h2>Page ${i}</h2><p>${pageText}</p></div>`;
    pdfHtmlOutput.innerHTML = `<div>Processed page ${i} of ${pdf.numPages}</div>`;
    if (i < pdf.numPages) {
      setTimeout(() => processPage(i + 1), 10);
    }
    else {
      pdfHtmlOutput.innerHTML = `
      <textarea style="width:100%;height:180px">${htmlContent
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")}</textarea>
      <div class="pdf-content" style="margin-top:10px">${htmlContent}</div>
      `;
      downloadHtmlBtn.style.display = "inline-block";
    }
  }
  processPage(1); 
});

// Download HTML content as .html file
downloadHtmlBtn.addEventListener("click", () => {
  const blob = new Blob([htmlContent], { type: "text/html" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "converted.html";
  a.click();
});

// ====================== PDF TO EPUB CONVERTER ===============================
const pdfEpubInput = document.getElementById("pdfEpubInput");
const clearEpubInputBtn = document.getElementById("clearEpubInputBtn");
const convertPdfToEpubBtn = document.getElementById("convertPdfToEpubBtn");
const pdfEpubOutput = document.getElementById("pdfEpubOutput");
const downloadEpubBtn = document.getElementById("downloadEpubBtn");
let epubContent = "";
// Show/hide clear button for EPUB input
pdfEpubInput.addEventListener("change", function () {
  clearEpubInputBtn.style.display = this.files.length > 0 ? "inline-block" : "none";
});
// Clear input and output
clearEpubInputBtn.addEventListener("click", function () {
  pdfEpubInput.value = "";
  clearEpubInputBtn.style.display = "none";
  pdfEpubOutput.innerHTML = "";
  downloadEpubBtn.style.display = "none";
  epubContent = "";
});
// Convert PDF to EPUB
convertPdfToEpubBtn.addEventListener("click", async () => {
  const file = pdfEpubInput.files[0];
  if (!file || file.type !== "application/pdf") {
    alert("Please upload a valid PDF file.");
    return;
  }
  pdfEpubOutput.innerHTML = "Converting to EPUB...";
  epubContent = "";
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  async function processPage(i) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map(item => item.str).join(" ");
    epubContent += `<section><h2>Page ${i}</h2><p>${pageText}</p></section>`;
    pdfEpubOutput.innerHTML = `<div>Processed page ${i} of ${pdf.numPages}</div>`;
    if (i < pdf.numPages) {
      setTimeout(() => processPage(i + 1), 10);
    } else {
      pdfEpubOutput.innerHTML = `
      <textarea style="width:100%;height:180px">${epubContent
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")}</textarea>
      <div class="epub-content" style="margin-top:10px">${epubContent}</div>
      `;
      downloadEpubBtn.style.display = "inline-block";
    }
  }
  processPage(1);
});

// Download EPUB content as a valid .epub file
downloadEpubBtn.addEventListener("click", async () => {
  // 1. mimetype (must be first, uncompressed)
  const mimetype = "application/epub+zip";

  // 2. META-INF/container.xml
  const containerXml = `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`;

  // 3. OEBPS/content.opf
  const opf = `<?xml version="1.0" encoding="UTF-8"?>
<package version="2.0" xmlns="http://www.idpf.org/2007/opf" unique-identifier="BookId">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>Converted PDF</dc:title>
    <dc:language>en</dc:language>
    <dc:identifier id="BookId">id:pdf2epub</dc:identifier>
  </metadata>
  <manifest>
    <item id="content" href="content.xhtml" media-type="application/xhtml+xml"/>
  </manifest>
  <spine>
    <itemref idref="content"/>
  </spine>
</package>`;

  // 4. OEBPS/content.xhtml
  const xhtml = `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml">
  <head>
    <title>Converted PDF</title>
    <meta charset="UTF-8"/>
  </head>
  <body>
    ${epubContent}
  </body>
</html>`;

  // 5. Build the EPUB zip
  const zip = new JSZip();
  zip.file("mimetype", mimetype, { compression: "STORE" }); // must be uncompressed
  zip.file("META-INF/container.xml", containerXml);
  zip.file("OEBPS/content.opf", opf);
  zip.file("OEBPS/content.xhtml", xhtml);

  // 6. Download as .epub
  const blob = await zip.generateAsync({ type: "blob" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "converted.epub";
  a.click();
});

// ============================ PDF TO ZIP CONVERTER ===============================
const pdfZipInput = document.getElementById("pdfZipInput");
const clearZipInputBtn = document.getElementById("clearZipInputBtn");
const convertPdfToZipBtn = document.getElementById("convertPdfToZipBtn");
const pdfZipOutput = document.getElementById("pdfZipOutput");
const downloadZipBtn = document.getElementById("downloadZipBtn");
let zipContent = "";
// Show/hide clear button for ZIP input
pdfZipInput.addEventListener("change", function () {
  clearZipInputBtn.style.display =
    this.files.length > 0 ? "inline-block" : "none";
});

// Clear input and output
clearZipInputBtn.addEventListener("click", function () {
  pdfZipInput.value = "";
  clearZipInputBtn.style.display = "none";
  pdfZipOutput.innerHTML = "";
  downloadZipBtn.style.display = "none";
  zipContent = "";
});

// Convert PDF to ZIP (no textarea, just process and enable download)
convertPdfToZipBtn.addEventListener("click", async () => {
  const file = pdfZipInput.files[0];
  if (!file || file.type !== "application/pdf") {
    alert("Please upload a valid PDF file.");
    return;
  }
  pdfZipOutput.innerHTML = "Converting to ZIP...";
  zipContent = "";
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map((item) => item.str).join(" ");
    zipContent += `<section><h2>Page ${i}</h2><p>${pageText}</p></section>\n`;
    pdfZipOutput.innerHTML = `<div>Processed page ${i} of ${pdf.numPages}</div>`;
  }
  pdfZipOutput.innerHTML = "Ready to download ZIP!";
  downloadZipBtn.style.display = "inline-block";
});
// Download ZIP content as .zip file
downloadZipBtn.addEventListener("click", () => {
  const zip = new JSZip();
  const file = pdfZipInput.files[0];
  if (!file) return;
  zip.file(file.name, file); // Add the original PDF file to the ZIP
  zip.generateAsync({ type: "blob" }).then((blob) => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "converted.zip";
    a.click();
  });
});

//========================== PDF TO JSON CONVERTER ============================
const pdfJsonInput = document.getElementById("pdfJsonInput");
const clearJsonInputBtn = document.getElementById("clearJsonInputBtn");
const convertPdfToJsonBtn = document.getElementById("convertPdfToJsonBtn");
const pdfJsonOutput = document.getElementById("pdfJsonOutput");
const downloadJsonBtn = document.getElementById("downloadJsonBtn");
let jsonContent = "";
// Show/hide clear button for JSON input
pdfJsonInput.addEventListener("change", function () {
  clearJsonInputBtn.style.display =
    this.files.length > 0 ? "inline-block" : "none";
});
// Clear input and output
clearJsonInputBtn.addEventListener("click", function () {
  pdfJsonInput.value = "";
  clearJsonInputBtn.style.display = "none";
  pdfJsonOutput.innerHTML = "";
  downloadJsonBtn.style.display = "none";
  jsonContent = "";
});
// Convert PDF to JSON
convertPdfToJsonBtn.addEventListener("click", async () => {
  const file = pdfJsonInput.files[0];
  if (!file || file.type !== "application/pdf") {
    alert("Please upload a valid PDF file.");
    return;
  }
  pdfJsonOutput.innerHTML = "Converting to JSON...";
  jsonContent = [];
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  async function processPage(i) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map((item) => item.str).join(" ");
    jsonContent.push({ page: i, text: pageText });
    pdfJsonOutput.innerHTML = `<div>Processed page ${i} of ${pdf.numPages}</div>`;
    if (i < pdf.numPages) {
      setTimeout(() => processPage(i + 1), 10);
    } else {
      pdfJsonOutput.innerHTML = `<textarea style="width:100%;height:120px;resize:vertical">${JSON.stringify(
        jsonContent,
        null,
        2
      )}</textarea>`;
      downloadJsonBtn.style.display = "inline-block";
    }
  }
  processPage(1);
});
// Download JSON content as .json file
downloadJsonBtn.addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(jsonContent, null, 2)], {
    type: "application/json",
  });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "converted.json";
  a.click();
});

// =========================== PDF TO CSV CONVERTER ============================
const pdfCsvInput = document.getElementById("pdfCsvInput");
const clearCsvInputBtn = document.getElementById("clearCsvInputBtn");
const convertPdfToCsvBtn = document.getElementById("convertPdfToCsvBtn");
const pdfCsvOutput = document.getElementById("pdfCsvOutput");
const downloadCsvBtn = document.getElementById("downloadCsvBtn");
let csvContent = "";
// Show/hide clear button for CSV input
pdfCsvInput.addEventListener("change", function () {
  clearCsvInputBtn.style.display =
    this.files.length > 0 ? "inline-block" : "none";
});
// Clear input and output
clearCsvInputBtn.addEventListener("click", function () {
  pdfCsvInput.value = "";
  clearCsvInputBtn.style.display = "none";
  pdfCsvOutput.innerHTML = "";
  downloadCsvBtn.style.display = "none";
  csvContent = "";
});
// Convert PDF to CSV
convertPdfToCsvBtn.addEventListener("click", async () => {
  const file = pdfCsvInput.files[0];
  if (!file || file.type !== "application/pdf") {
    alert("Please upload a valid PDF file.");
    return;
  }
  pdfCsvOutput.innerHTML = "Converting to CSV...";
  csvContent = [];
  const arrayBuffer = await file.arrayBuffer(); 
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  async function processPage(i) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map((item) => item.str).join(" ");
    csvContent.push(`Page ${i},${pageText.replace(/,/g, " ")}`);
    pdfCsvOutput.innerHTML = `<div>Processed page ${i} of ${pdf.numPages}</div>`;
    if (i < pdf.numPages) {
      setTimeout(() => processPage(i + 1), 10);
    } else {
      pdfCsvOutput.innerHTML = `<textarea style="width:100%;height:120px;resize:vertical">${csvContent.join("\n")}</textarea>`;
      downloadCsvBtn.style.display = "inline-block";
    }
  }
  processPage(1);
});
// Download CSV content as .csv file
downloadCsvBtn.addEventListener("click", () => {
  const blob = new Blob([csvContent.join("\n")], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "converted.csv";
  a.click();
});


// =========================== PDF TO XML CONVERTER ============================
const pdfXmlInput = document.getElementById("pdfXmlInput");
const clearXmlInputBtn = document.getElementById("clearXmlInputBtn");
const convertPdfToXmlBtn = document.getElementById("convertPdfToXmlBtn");
const pdfXmlOutput = document.getElementById("pdfXmlOutput");
const downloadXmlBtn = document.getElementById("downloadXmlBtn");
let xmlContent = "";
// Show/hide clear button for XML input
pdfXmlInput.addEventListener("change", function () {
  clearXmlInputBtn.style.display =
    this.files.length > 0 ? "inline-block" : "none";  
});
// Clear input and output
clearXmlInputBtn.addEventListener("click", function () {
  pdfXmlInput.value = "";
  clearXmlInputBtn.style.display = "none";
  pdfXmlOutput.innerHTML = "";
  downloadXmlBtn.style.display = "none";
  xmlContent = "";
});
// Convert PDF to XML
convertPdfToXmlBtn.addEventListener("click", async () => {
  const file = pdfXmlInput.files[0];
  if (!file || file.type !== "application/pdf") {
    alert("Please upload a valid PDF file.");
    return; 
  }
  pdfXmlOutput.innerHTML = "Converting to XML...";
  xmlContent = `<pdf>\n`;
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  async function processPage(i) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map((item) => item.str).join(" ");
    xmlContent += `  <page number="${i}">\n`;
    xmlContent += `    <text>${pageText.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</text>\n`;
    xmlContent += `  </page>\n`;
    pdfXmlOutput.innerHTML = `<div>Processed page ${i} of ${pdf.numPages}</div>`;
    if (i < pdf.numPages) {
      setTimeout(() => processPage(i + 1), 10);
    } else {
      xmlContent += `</pdf>`;
      pdfXmlOutput.innerHTML = `<textarea style="width:100%;height:120px;resize:vertical">${xmlContent}</textarea>`;
      downloadXmlBtn.style.display = "inline-block";
    } 
  }
  processPage(1);
});
// Download XML content as .xml file
downloadXmlBtn.addEventListener("click", () => {
  const blob = new Blob([xmlContent], { type: "application/xml" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "converted.xml";
  a.click();
});
