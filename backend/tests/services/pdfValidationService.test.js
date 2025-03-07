const pdfValidationService = require("../../src/services/pdfValidationService");
const fs = require("fs");
const path = require("path");
const mockFs = require("mock-fs");

describe("PDF Validation Format", () => {
  const validPdfBuffer = Buffer.from("%PDF-1.4 Valid PDF File");
  const invalidPdfBuffer = Buffer.from("This is not a PDF");

  beforeAll(() => {
    mockFs({
      "samples/valid.pdf": validPdfBuffer,
      "samples/invalid.pdf": invalidPdfBuffer,
    });
  });

  afterAll(() => {
    mockFs.restore();
  });

  test("Should accept valid PDF file", async () => {
    const filePath = path.resolve("samples/valid.pdf");
    const fileBuffer = fs.readFileSync(filePath);

    const result = await pdfValidationService.validatePDF(fileBuffer, "application/pdf", "valid.pdf");
    expect(result).toBe(true);
  });

  test("Should reject non-PDF MIME type", async () => {
    const filePath = path.resolve("samples/valid.pdf");
    const fileBuffer = fs.readFileSync(filePath);

    await expect(
      pdfValidationService.validatePDF(fileBuffer, "image/png", "valid.png")
    ).rejects.toThrow("Invalid MIME type");
  });

  test("Should reject non-PDF extension", async () => {
    const filePath = path.resolve("samples/valid.pdf");
    const fileBuffer = fs.readFileSync(filePath);

    await expect(
      pdfValidationService.validatePDF(fileBuffer, "application/pdf", "document.txt")
    ).rejects.toThrow("Invalid file extension");
  });

  test("Should reject invalid PDF content", async () => {
    const filePath = path.resolve("samples/invalid.pdf");
    const fileBuffer = fs.readFileSync(filePath);

    await expect(
      pdfValidationService.validatePDF(fileBuffer, "application/pdf", "invalid.pdf")
    ).rejects.toThrow("Invalid PDF file");
  });
});

describe("PDF File Size Validation", () => {
  const validPdfBuffer = Buffer.alloc(10 * 1024 * 1024, "%PDF-1.4 Valid PDF File");
  const largePdfBuffer = Buffer.alloc(21 * 1024 * 1024, "%PDF-1.4 Valid PDF File");
  const edgePdfBuffer = Buffer.alloc(20 * 1024 * 1024, "%PDF-1.4 Valid PDF File");

  beforeAll(() => {
    mockFs({
      "samples/valid.pdf": validPdfBuffer,
      "samples/large.pdf": largePdfBuffer,
      "samples/edge.pdf": edgePdfBuffer,
    });
  });

  afterAll(() => {
    mockFs.restore();
  });

  test("Should accept a valid PDF file under 20MB", async () => {
    const filePath = path.resolve("samples/valid.pdf");
    const fileBuffer = fs.readFileSync(filePath);

    const result = await pdfValidationService.validateSizeFile(fileBuffer);
    expect(result).toBe(true);
  });

  test("Should reject a PDF file larger than 20MB", async () => {
    const filePath = path.resolve("samples/large.pdf");
    const fileBuffer = fs.readFileSync(filePath);

    await expect(
      pdfValidationService.validateSizeFile(fileBuffer)
    ).rejects.toThrow("File exceeds maximum allowed size of 20MB");
  });

  test("Should accept a PDF file exactly 20MB (Edge Case)", async () => {
    const filePath = path.resolve("samples/edge.pdf");
    const fileBuffer = fs.readFileSync(filePath);

    const result = await pdfValidationService.validateSizeFile(fileBuffer);
    expect(result).toBe(true);
  });
});

describe("PDF Encryption Check with Real Implementation", () => {
  const unencryptedPdfBuffer = Buffer.from(
    "%PDF-1.3\n" +
    "1 0 obj\n<</Type/Catalog/Pages 2 0 R>>\nendobj\n" +
    "2 0 obj\n<</Type/Pages/Kids[3 0 R]/Count 1>>\nendobj\n" +
    "3 0 obj\n<</Type/Page/MediaBox[0 0 595 842]/Parent 2 0 R/Resources<<>>>>\nendobj\n" +
    "xref\n0 4\n0000000000 65535 f\n0000000010 00000 n\n0000000053 00000 n\n0000000102 00000 n\n" +
    "trailer\n<</Size 4/Root 1 0 R>>\n" +
    "startxref\n178\n%%EOF"
  );

  const encryptedPdfBuffer = Buffer.from(
    "%PDF-1.3\n" +
    "1 0 obj\n<</Type/Catalog/Pages 2 0 R>>\nendobj\n" +
    "2 0 obj\n<</Type/Pages/Kids[3 0 R]/Count 1>>\nendobj\n" +
    "3 0 obj\n<</Type/Page/MediaBox[0 0 595 842]/Parent 2 0 R/Resources<<>>>>\nendobj\n" +
    "4 0 obj\n<</Filter/Standard/V 1/R 2/O<1234567890ABCDEF1234567890ABCDEF>/U<ABCDEF1234567890ABCDEF1234567890>/P -3904>>\nendobj\n" +
    "xref\n0 5\n0000000000 65535 f\n0000000010 00000 n\n0000000053 00000 n\n0000000102 00000 n\n0000000183 00000 n\n" +
    "trailer\n<</Size 5/Root 1 0 R/Encrypt 4 0 R>>\n" +
    "startxref\n291\n%%EOF"
  );

  beforeAll(() => {
    mockFs({
      "samples/unencrypted.pdf": unencryptedPdfBuffer,
      "samples/encrypted.pdf": encryptedPdfBuffer,
    });
  });

  afterAll(() => {
    mockFs.restore();
  });

  test("Should detect unencrypted PDF correctly", async () => {
    const filePath = path.resolve("samples/unencrypted.pdf");
    const fileBuffer = fs.readFileSync(filePath);

    const result = await pdfValidationService.isPdfEncrypted(fileBuffer);
    expect(result).toBe(false);
  });

  test("Should detect encrypted PDF correctly", async () => {
    const filePath = path.resolve("samples/encrypted.pdf");
    const fileBuffer = fs.readFileSync(filePath);

    const result = await pdfValidationService.isPdfEncrypted(fileBuffer);
    expect(result).toBe(true);
  });
});

describe("PDF Integrity Check", () => {
  const validPdfBuffer = Buffer.from(
    "%PDF-1.3\n" +
    "1 0 obj\n<</Type/Catalog/Pages 2 0 R>>\nendobj\n" +
    "2 0 obj\n<</Type/Pages/Kids[3 0 R]/Count 1>>\nendobj\n" +
    "3 0 obj\n<</Type/Page/MediaBox[0 0 595 842]/Parent 2 0 R/Resources<<>>>>\nendobj\n" +
    "xref\n0 4\n0000000000 65535 f\n0000000010 00000 n\n0000000053 00000 n\n0000000102 00000 n\n" +
    "trailer\n<</Size 4/Root 1 0 R>>\n" +
    "startxref\n178\n%%EOF"
  );

  const corruptedPdfBuffer = Buffer.from(
    "%PDF-1.3\n" +
    "1 0 obj\n<</Type/Catalog/Pages 2 0 R>>\nendobj\n" +
    "2 0 obj\n<</Type/Pages/Kids[3 0 R]/Count 1>>\nendobj\n" +
    "3 0 obj\n<</Type/Page/MediaBox[0 0 595 842]/Parent 2 0 R/Resources<<>>>>\nendobj\n" +
    "trailer\n<</Size 4/Root 1 0 R>>\n" +
    "startxref\n" +
    "%%EOF"
  );

  const truncatedPdfBuffer = Buffer.from(
    "%PDF-1.3\n" +
    "1 0 obj\n<</Type/Catalog/Pages 2 0 R>>\nendobj\n" +
    "2 0 obj\n<</Type/Pages/Kids[3"
  );

  beforeAll(() => {
    mockFs({
      "samples/valid.pdf": validPdfBuffer,
      "samples/corrupted.pdf": corruptedPdfBuffer,
      "samples/truncated.pdf": truncatedPdfBuffer,
    });
  });

  afterAll(() => {
    mockFs.restore();
  });

  test("Should confirm integrity of a valid PDF file", async () => {
    const filePath = path.resolve("samples/valid.pdf");
    const fileBuffer = fs.readFileSync(filePath);

    const result = await pdfValidationService.checkPdfIntegrity(fileBuffer);
    expect(result).toBe(true);
  });

  test("Should return false for a corrupted PDF with missing xref table", async () => {
    const filePath = path.resolve("samples/corrupted.pdf");
    const fileBuffer = fs.readFileSync(filePath);

    const result = await pdfValidationService.checkPdfIntegrity(fileBuffer);
    expect(result).toBe(false);
  });

  test("Should return false for a truncated PDF file", async () => {
    const filePath = path.resolve("samples/truncated.pdf");
    const fileBuffer = fs.readFileSync(filePath);

    const result = await pdfValidationService.checkPdfIntegrity(fileBuffer);
    expect(result).toBe(false);
  });

  test("Should handle empty buffer correctly", async () => {
    const emptyBuffer = Buffer.alloc(0);

    const result = await pdfValidationService.checkPdfIntegrity(emptyBuffer);
    expect(result).toBe(false);
  });

  test("should handle PDF with malformed startxref in checkPdfIntegrity", async () => {
    const malformedPdfBuffer = Buffer.from(
      "%PDF-1.3\n" +
      "1 0 obj\n<</Type/Catalog/Pages 2 0 R>>\nendobj\n" +
      "trailer\n<</Size 4/Root 1 0 R>>\n" +
      "startxref\nABC\n" +
      "%%EOF"
    );
    const result = await pdfValidationService.checkPdfIntegrity(malformedPdfBuffer);
    expect(result).toBe(false);
  });

  test("should handle PDF without objects in checkPdfIntegrity", async () => {
    const noObjectsPdfBuffer = Buffer.from(
      "%PDF-1.3\n" +
      "trailer\n<</Size 4/Root 1 0 R>>\n" +
      "startxref\n123\n" +
      "%%EOF"
    );
    const result = await pdfValidationService.checkPdfIntegrity(noObjectsPdfBuffer);
    expect(result).toBe(false);
  });
});