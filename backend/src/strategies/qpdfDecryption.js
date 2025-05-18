const PdfDecryptionStrategy = require('./pdfDecryptionStrategy');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const os = require('os');
const { spawn } = require('child_process');
const DecryptLogger = require('../services/decryptLoggerAdapter');
const Sentry = require("../instrument");

class QpdfDecryption extends PdfDecryptionStrategy {
    constructor() {
        super();
        this._qpdfAvailabilityPromise = null;
    }

    _checkQpdfInPath() {
        return new Promise((resolve, reject) => {                     
            const envPath = process.env.QPDF_PATH;
            if (envPath && fs.existsSync(envPath)) {
                DecryptLogger.logDecryptionAvailability('QPDF', true);
                return resolve(envPath);
            }  
            DecryptLogger.logDecryptionAvailability('QPDF', false);
            reject(new Error('QPDF not found in PATH.'));
        });
    }

    _checkQpdfVersion(qpdfPath) {
        return new Promise((resolve, reject) => {
            const process = spawn(qpdfPath, ['--version']);
            
            process.on('error', (error) => {
                DecryptLogger.logDecryptionError(0, error, 'QPDF');
                reject(error);
            });
            
            process.on('close', (code) => {
                if (code !== 0) {
                    const error = new Error('Failed to verify qpdf version');
                    DecryptLogger.logDecryptionError(0, error, 'QPDF');
                    return reject(error);
                }
                DecryptLogger.logDecryptionAvailability('QPDF', true);
                resolve();
            });
        });
    }

    async checkQpdfAvailability() {
        if (this._qpdfAvailabilityPromise) {
            return this._qpdfAvailabilityPromise;
        }
        
        this._qpdfAvailabilityPromise = new Promise((resolve) => {
            this._checkQpdfInPath()
                .then(qpdfPath => this._checkQpdfVersion(qpdfPath))
                .then(() => resolve(true))
                // eslint-disable-next-line no-unused-vars
                .catch(_error => {                    
                    console.warn('QPDF is not installed or not in PATH. PDF decryption will not work until qpdf is installed.');
                    Sentry.addBreadcrumb({
                        category: 'pdf-decryption',
                        message: 'QPDF is not installed or not in PATH',
                        level: 'warning'
                    });
                    resolve(false);
                });
        });
        
        return this._qpdfAvailabilityPromise;
    }

    async execCommand(command, args) {
        const isAvailable = await this.checkQpdfAvailability();
        
        if (!isAvailable) {
            const error = new Error(
                'QPDF is not installed. Please install QPDF to decrypt PDF files.\n' +
                'Windows: Install from https://qpdf.sourceforge.io/ or using Chocolatey: choco install qpdf\n' +
                'Linux: sudo apt-get install qpdf\n' +
                'MacOS: brew install qpdf'
            );
            DecryptLogger.logDecryptionError(0, error, 'QPDF');
            throw error;
        }

        return new Promise((resolve, reject) => {
            const process = spawn(command, args);
    
            let stderr = '';
            process.stderr.on('data', (data) => {
                stderr += data.toString();
            });
    
            process.on('close', (code) => {
                if (code !== 0) {
                    const error = new Error(`Failed to decrypt PDF: ${stderr.trim()}`);
                    DecryptLogger.logDecryptionError(0, error, 'QPDF');
                    reject(error);
                } else {
                    resolve();
                }
            });
        });
    }

    sanitizePassword(password) {
        // Ensure the input is a string
        if (typeof password !== 'string') {
            throw new Error('Password must be a string');
        }

        // Prevent denial-of-service via excessive length
        const MAX_PASSWORD_LENGTH = 1024;
        if (password.length > MAX_PASSWORD_LENGTH) {
            throw new Error(`Password exceeds maximum length of ${MAX_PASSWORD_LENGTH} characters`);
        }

        // Only allow printable ASCII characters (space to ~)
        // This prevents shell control characters, escape sequences, etc.
        const printableAsciiRegex = /^[\x20-\x7E]*$/;
        if (!printableAsciiRegex.test(password)) {
            throw new Error('Password contains invalid or unsafe characters');
        }

        return password;
    }


    async decrypt(pdfBuffer, password) {
        if (!Buffer.isBuffer(pdfBuffer)) {
            const error = new Error('Invalid input: Expected a Buffer.');
            DecryptLogger.logDecryptionError(0, error, 'QPDF');
            throw error;
        }
        const sanitizedPassword = this.sanitizePassword(password);

        
        const startTime = Date.now();
        const fileSize = pdfBuffer.length;
        let tempDir = null;
        let inputPath = null;
        let outputPath = null;

        try {
            tempDir = path.join(os.tmpdir(), `pdf-decrypt-${crypto.randomBytes(8).toString('hex')}`);
            fs.mkdirSync(tempDir, { recursive: true });

            inputPath = path.join(tempDir, 'encrypted.pdf');
            outputPath = path.join(tempDir, 'decrypted.pdf');

            fs.writeFileSync(inputPath, pdfBuffer);


            DecryptLogger.logDecryptionStart(fileSize, 'QPDF decrypt');
            Sentry.addBreadcrumb({
                category: 'pdf-decryption',
                message: `Decrypting PDF with size ${fileSize} bytes using QPDF`,
                level: 'info'
            });

            await this.execCommand('qpdf', [
                `--password=${sanitizedPassword}`,
                '--decrypt',
                inputPath,
                outputPath
            ]);            

            if (!fs.existsSync(outputPath)) {
                const error = new Error('Failed to decrypt PDF: Output file not created.');
                DecryptLogger.logDecryptionError(fileSize, error, 'QPDF');
                throw error;
            }

            const decryptedPdf = fs.readFileSync(outputPath);
            const processTime = Date.now() - startTime;
            DecryptLogger.logDecryptionSuccess(fileSize, processTime, 'QPDF');
            
            return decryptedPdf;
        } catch (error) {
            const processTime = Date.now() - startTime;
            
            if (error.message.toLowerCase().includes('password')) {
                const passwordError = new Error('Failed to decrypt PDF: Incorrect password.');
                DecryptLogger.logDecryptionError(fileSize, passwordError, 'QPDF', processTime);
                throw passwordError;
            } else if (error.message.includes('PDF header') || error.message.includes('not a PDF')) {
                const corruptedError = new Error('Failed to decrypt PDF: Corrupted file.');
                DecryptLogger.logDecryptionError(fileSize, corruptedError, 'QPDF', processTime);
                throw corruptedError;
            } else {
                DecryptLogger.logDecryptionError(fileSize, error, 'QPDF', processTime);
                throw error;  
            }
        } finally {
            this.cleanupFiles([inputPath, outputPath, tempDir]);
        }
    }

    cleanupFiles(paths) {
        for (const filePath of paths) {
            if (filePath && fs.existsSync(filePath)) {
                try {
                    if (fs.lstatSync(filePath).isDirectory()) {
                        fs.rmSync(filePath, { recursive: true, force: true });
                    } else {
                        fs.unlinkSync(filePath);
                    }
                } catch (cleanupError) {
                    console.warn(`Cleanup failed for ${filePath}: ${cleanupError.message}`);
                    DecryptLogger.logDecryptionError(0, cleanupError, 'QPDF-Cleanup');
                }
            }
        }
    }
}

module.exports = QpdfDecryption;
