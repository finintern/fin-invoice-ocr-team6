/**
 * Script to compare performance between pdf-page-counter and pdfjsLib
 * for validating PDF page count
 */
const fs = require('fs');
const path = require('path');
const pdfjsLib = require('pdfjs-dist');
const pdfValidationService = require('../src/services/pdfValidationService');

/**
 * Legacy implementation using pdfjsLib for page count validation
 * For performance comparison purposes
 * 
 * @param {Buffer} fileBuffer - Buffer containing the PDF file data
 * @returns {Promise<boolean>} - Returns true if the PDF has a valid page count
 * @throws {Error} - Throws an error if the PDF is empty or exceeds the limit
 */
async function validatePdfPageCountWithPdfjsLib(fileBuffer) {
    try {
        const uint8ArrayBuffer = new Uint8Array(fileBuffer);

        const loadingTask = pdfjsLib.getDocument({ data: uint8ArrayBuffer });
        const pdfDocument = await loadingTask.promise;
        const pageCount = pdfDocument.numPages;

        if (pageCount === 0) {
            throw new Error("PDF has no pages.");
        }

        if (pageCount > 100) {
            throw new Error("PDF exceeds the maximum allowed pages (100).");
        }

        return true;
    } catch (error) {
        if (error.message === "PDF has no pages." || error.message === "PDF exceeds the maximum allowed pages (100).") {
            throw error;
        }
        throw new Error("Failed to read PDF page count.");
    }
}

async function runPerformanceTest() {
    // Paths to sample PDF files for testing
    const sampleDir = path.join(__dirname, '../..', 'sample_file/invoice');    const sampleFiles = fs.readdirSync(sampleDir)
                          .filter(file => file.endsWith('.pdf'))
                          .slice(0, 30); // Use first 30 PDF files for testing
    
    console.log(`Testing with ${sampleFiles.length} PDF files`);
    
    // Performance comparison results
    const results = {
        pdfCounter: {
            times: [],
            avg: 0,
            totalTime: 0
        },
        pdfjsLib: {
            times: [],
            avg: 0,
            totalTime: 0
        }
    };
    
    // Test each sample file
    for (const file of sampleFiles) {
        const filePath = path.join(sampleDir, file);
        const fileBuffer = fs.readFileSync(filePath);
        
        // console.log(`Testing file: ${file}`);
        
        // Test pdf-page-counter implementation
        const startPdfCounter = Date.now();
        try {
            await pdfValidationService.validatePdfPageCount(fileBuffer);
            const timePdfCounter = Date.now() - startPdfCounter;
            results.pdfCounter.times.push(timePdfCounter);
            results.pdfCounter.totalTime += timePdfCounter;
            // console.log(`  pdf-page-counter time: ${timePdfCounter}ms`);
        } catch (error) {
            console.error(`  Error with pdf-page-counter: ${error.message}`);
        }
          // Test pdfjsLib implementation
        const startPdfjsLib = Date.now();
        try {
            await validatePdfPageCountWithPdfjsLib(fileBuffer);
            const timePdfjsLib = Date.now() - startPdfjsLib;
            results.pdfjsLib.times.push(timePdfjsLib);
            results.pdfjsLib.totalTime += timePdfjsLib;
            // console.log(`  pdfjsLib time: ${timePdfjsLib}ms`);
        } catch (error) {
            console.error(`  Error with pdfjsLib: ${error.message}`);
        }
        
        // console.log('----------------------------');
    }
    
    // Calculate averages
    if (results.pdfCounter.times.length > 0) {
        results.pdfCounter.avg = results.pdfCounter.totalTime / results.pdfCounter.times.length;
    }
    if (results.pdfjsLib.times.length > 0) {
        results.pdfjsLib.avg = results.pdfjsLib.totalTime / results.pdfjsLib.times.length;
    }
    
    // Print summary
    console.log('\nPerformance Summary:');
    console.log('===================');
    console.log(`pdf-page-counter: Average ${results.pdfCounter.avg.toFixed(2)}ms, Total ${results.pdfCounter.totalTime}ms`);
    console.log(`pdfjsLib: Average ${results.pdfjsLib.avg.toFixed(2)}ms, Total ${results.pdfjsLib.totalTime}ms`);
    
    // Calculate performance improvement
    if (results.pdfjsLib.avg > 0 && results.pdfCounter.avg > 0) {
        const improvement = ((results.pdfjsLib.avg - results.pdfCounter.avg) / results.pdfjsLib.avg) * 100;
        console.log(`\nPerformance improvement: ${improvement.toFixed(2)}%`);
    }
}

// Run the performance test
runPerformanceTest()
    .then(() => console.log('Performance test completed.'))
    .catch(err => console.error('Error running performance test:', err));
