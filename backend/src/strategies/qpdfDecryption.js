const PdfDecryptionStrategy = require('./pdfDecryptionStrategy');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const os = require('os');
const { spawn } = require('child_process');

class QpdfDecryption extends PdfDecryptionStrategy {
    constructor() {
        super();
        this._qpdfAvailabilityPromise = null;
    }

    _checkQpdfInPath() {
        return new Promise((resolve, reject) => {                     
            const envPath = process.env.QPDF_PATH;
            if (envPath && fs.existsSync(envPath)) {
                return resolve(envPath);
            }  
            reject(new Error('QPDF not found in PATH.'));
        });
    }

    _checkQpdfVersion(qpdfPath) {
        return new Promise((resolve, reject) => {
            const process = spawn(qpdfPath, ['--version']);
            
            process.on('error', (error) => {
                reject(error);
            });
            
            process.on('close', (code) => {
                if (code !== 0) {
                    return reject(new Error('Failed to verify qpdf version'));
                }
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
                    resolve(false);
                });
        });
        
        return this._qpdfAvailabilityPromise;
    }

    async execCommand(command, args) {
        const isAvailable = await this.checkQpdfAvailability();
        
        if (!isAvailable) {
            throw new Error(
                'QPDF is not installed. Please install QPDF to decrypt PDF files.\n' +
                'Windows: Install from https://qpdf.sourceforge.io/ or using Chocolatey: choco install qpdf\n' +
                'Linux: sudo apt-get install qpdf\n' +
                'MacOS: brew install qpdf'
            );
        }

        return new Promise((resolve, reject) => {
            const process = spawn(command, args);
    
            let stderr = '';
            process.stderr.on('data', (data) => {
                stderr += data.toString();
            });
    
            process.on('close', (code) => {
                if (code !== 0) {
                    reject(new Error(`Failed to decrypt PDF: ${stderr.trim()}`));
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
            throw new Error('Invalid input: Expected a Buffer.');
        }

        const sanitizedPassword = this.sanitizePassword(password);

        let tempDir = null;
        let inputPath = null;
        let outputPath = null;

        try {
            tempDir = path.join(os.tmpdir(), `pdf-decrypt-${crypto.randomBytes(8).toString('hex')}`);
            fs.mkdirSync(tempDir, { recursive: true });

            inputPath = path.join(tempDir, 'encrypted.pdf');
            outputPath = path.join(tempDir, 'decrypted.pdf');

            fs.writeFileSync(inputPath, pdfBuffer);
            await this.execCommand('qpdf', [
                `--password=${sanitizedPassword}`,
                '--decrypt',
                inputPath,
                outputPath
            ]);            

            if (!fs.existsSync(outputPath)) {
                throw new Error('Failed to decrypt PDF: Output file not created.');
            }

            const decryptedPdf = fs.readFileSync(outputPath);
            return decryptedPdf;
        } catch (error) {
            if (error.message.toLowerCase().includes('password')) {
                throw new Error('Failed to decrypt PDF: Incorrect password.');
            } else if (error.message.includes('PDF header') || error.message.includes('not a PDF')) {
                throw new Error('Failed to decrypt PDF: Corrupted file.');
            } else {
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
                }
            }
        }
    }
}

module.exports = QpdfDecryption;
