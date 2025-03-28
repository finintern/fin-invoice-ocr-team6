const fs = require('fs');
const path = require('path');
const qpdfDecryption = require('../../src/strategies/qpdfDecryption');
const os = require('os');
const crypto = require('crypto');

describe('qpdfDecryption', () => {
    let decryptionInstance;
    const testFilePath = path.join(__dirname, 'test-files', 'encrypted.pdf');
    const testPassword = 'correct-password'; // Ganti dengan password yang benar

    beforeAll(() => {
        decryptionInstance = new qpdfDecryption();
    });

    afterEach(() => {
        // Cleanup sisa file di temp directory
        jest.restoreAllMocks();
    });

    it('should successfully decrypt an encrypted PDF', async () => {
        if (!fs.existsSync(testFilePath)) {
            throw new Error('Test file not found: encrypted.pdf');
        }

        const encryptedBuffer = fs.readFileSync(testFilePath);
        const decryptedBuffer = await decryptionInstance.decrypt(encryptedBuffer, testPassword);

        expect(decryptedBuffer).toBeInstanceOf(Buffer);
        expect(decryptedBuffer.length).toBeGreaterThan(0);
    });

    it('should fail to decrypt with incorrect password', async () => {
        const encryptedBuffer = fs.readFileSync(testFilePath);
        const wrongPassword = 'wrong_password';

        await expect(decryptionInstance.decrypt(encryptedBuffer, wrongPassword))
            .rejects
            .toThrow('Failed to decrypt PDF: Incorrect password.');
    });

    it('should fail if input is not a Buffer', async () => {
        await expect(decryptionInstance.decrypt('invalid_input', testPassword))
            .rejects
            .toThrow('Invalid input: Expected a Buffer.');
    });

    it('should fail if file is corrupted', async () => {
        const corruptedBuffer = Buffer.from('this is not a PDF');

        await expect(decryptionInstance.decrypt(corruptedBuffer, testPassword))
            .rejects
            .toThrow('Failed to decrypt PDF: Corrupted file.');
    });

    it('should handle missing temp directory gracefully', async () => {
        jest.spyOn(fs, 'mkdirSync').mockImplementationOnce(() => {
            throw new Error('Filesystem error');
        });

        const encryptedBuffer = fs.readFileSync(testFilePath);

        await expect(decryptionInstance.decrypt(encryptedBuffer, testPassword))
            .rejects
            .toThrow('Filesystem error');
    });

    it('should handle failure to write input file', async () => {
        jest.spyOn(fs, 'writeFileSync').mockImplementationOnce(() => {
            throw new Error('Write error');
        });

        const encryptedBuffer = fs.readFileSync(testFilePath);

        await expect(decryptionInstance.decrypt(encryptedBuffer, testPassword))
            .rejects
            .toThrow('Write error');
    });

    it('should handle different error formats in exec callback', async () => {
        // Mock the execCommand method on the instance
        jest.spyOn(decryptionInstance, 'execCommand').mockImplementationOnce(async () => {
          throw new Error('Failed to decrypt PDF: stderr message');
        });
        
        const encryptedBuffer = fs.readFileSync(testFilePath);
        
        // Test that it throws with the stderr message
        await expect(decryptionInstance.decrypt(encryptedBuffer, testPassword))
          .rejects
          .toThrow('Failed to decrypt PDF: stderr message');
          
        // Test with error message only
        jest.spyOn(decryptionInstance, 'execCommand').mockImplementationOnce(async () => {
          throw new Error('Failed to decrypt PDF: Error without stderr');
        });
        
        await expect(decryptionInstance.decrypt(encryptedBuffer, testPassword))
          .rejects
          .toThrow('Failed to decrypt PDF: Error without stderr');
    });
      
    it('should throw when output file does not exist after successful exec', async () => {
        // Save originals
        const originalExec = require('child_process').exec;
        const originalExistsSync = fs.existsSync;
        
        try {
          // First make exec succeed
          require('child_process').exec = jest.fn().mockImplementation((cmd, callback) => {
            setTimeout(() => {
              callback(null, 'success output', ''); // No error
            }, 0);
            return { on: jest.fn() };
          });
          
          // Then make existsSync return false for output path
          let callCount = 0;
          fs.existsSync = jest.fn().mockImplementation(path => {
            // For output file check, return false; for all other checks return true
            if (path.includes('decrypted.pdf') && callCount++ === 0) {
              return false;
            }
            return true;
          });
          
          const encryptedBuffer = fs.readFileSync(testFilePath);
          
          // Should throw about missing output file
          await expect(decryptionInstance.decrypt(encryptedBuffer, testPassword))
            .rejects
            .toThrow('Failed to decrypt PDF: Output file not created.');
            
        } finally {
          // Restore originals
          require('child_process').exec = originalExec;
          fs.existsSync = originalExistsSync;
        }
    });

    it('should clean up temporary files after execution', async () => {
        // Generate a unique identifier for this test run
        const uniqueId = crypto.randomBytes(8).toString('hex');
        
        // Mock crypto.randomBytes to return our controlled value
        jest.spyOn(crypto, 'randomBytes').mockImplementationOnce(() => {
            return {
                toString: () => uniqueId
            };
        });
        
        const encryptedBuffer = fs.readFileSync(testFilePath);
        await decryptionInstance.decrypt(encryptedBuffer, testPassword);

        // Look specifically for our unique temp dir
        const specificTempDir = path.join(os.tmpdir(), `pdf-decrypt-${uniqueId}`);
        expect(fs.existsSync(specificTempDir)).toBe(false);
    });   
         

});

describe('cleanupFiles', () => {
    let strategy;

    beforeEach(() => {
        strategy = new qpdfDecryption();
        jest.spyOn(console, 'warn').mockImplementation(() => {}); // Supaya tidak nge-print di console
    });

    afterEach(() => {
        jest.restoreAllMocks(); // Reset semua spy setelah setiap test
    });

    test('should delete a file successfully', () => {
        jest.spyOn(fs, 'existsSync').mockReturnValue(true);
        jest.spyOn(fs, 'lstatSync').mockReturnValue({ isDirectory: () => false });
        const unlinkSpy = jest.spyOn(fs, 'unlinkSync').mockImplementation(() => {});

        strategy.cleanupFiles(['/fake/file.txt']);

        expect(unlinkSpy).toHaveBeenCalledWith('/fake/file.txt');
    });

    test('should delete a directory successfully', () => {
        jest.spyOn(fs, 'existsSync').mockReturnValue(true);
        jest.spyOn(fs, 'lstatSync').mockReturnValue({ isDirectory: () => true });
        const rmSpy = jest.spyOn(fs, 'rmSync').mockImplementation(() => {});

        strategy.cleanupFiles(['/fake/folder']);

        expect(rmSpy).toHaveBeenCalledWith('/fake/folder', { recursive: true, force: true });
    });

    test('should log warning if file deletion fails', () => {
        jest.spyOn(fs, 'existsSync').mockReturnValue(true);
        jest.spyOn(fs, 'lstatSync').mockReturnValue({ isDirectory: () => false });
        jest.spyOn(fs, 'unlinkSync').mockImplementation(() => {
            throw new Error('Mocked deletion error');
        });

        strategy.cleanupFiles(['/fake/file.txt']);

        expect(console.warn).toHaveBeenCalledWith(
            expect.stringContaining('Cleanup failed for /fake/file.txt: Mocked deletion error')
        );
    });

    test('should log warning if directory deletion fails', () => {
        jest.spyOn(fs, 'existsSync').mockReturnValue(true);
        jest.spyOn(fs, 'lstatSync').mockReturnValue({ isDirectory: () => true });
        jest.spyOn(fs, 'rmSync').mockImplementation(() => {
            throw new Error('Mocked deletion error');
        });

        strategy.cleanupFiles(['/fake/folder']);

        expect(console.warn).toHaveBeenCalledWith(
            expect.stringContaining('Cleanup failed for /fake/folder: Mocked deletion error')
        );
    });
});

const { exec } = require('child_process');

// Store original exec function
const originalExec = exec;

describe('execCommand function isolated tests', () => {
  // Import fresh modules for each test
  let qpdfDecryption;
  let instance;
  
  beforeEach(() => {
    // Clear the module cache to ensure we get a fresh instance
    jest.resetModules();
    
    // Mock child_process.exec before importing the module
    jest.mock('child_process', () => {
      return {
        exec: jest.fn()
      };
    });
    
    // Now import the module with mocked dependencies
    qpdfDecryption = require('../../src/strategies/qpdfDecryption');
    instance = new qpdfDecryption();
  });
  
  afterEach(() => {
    // Clean up mocks
    jest.resetAllMocks();
    jest.restoreAllMocks();
    jest.unmock('child_process');
  });
  
  afterAll(() => {
    // Final cleanup - restore real exec
    require('child_process').exec = originalExec;
  });
  
  it('should resolve when exec succeeds', async () => {
    // Set up the mock behavior for this test
    require('child_process').exec.mockImplementation((cmd, callback) => {
      process.nextTick(() => callback(null, 'success', ''));
      return { on: jest.fn() };
    });
    
    // Test the resolving path
    await expect(instance.execCommand('test command')).resolves.not.toThrow();
  });
  
  it('should reject with stderr when available', async () => {
    // Set up the mock behavior for this test
    require('child_process').exec.mockImplementation((cmd, callback) => {
      process.nextTick(() => callback(new Error('exec error'), '', 'stderr message'));
      return { on: jest.fn() };
    });
    
    // Test the stderr error path
    await expect(instance.execCommand('test command'))
      .rejects
      .toThrow('Failed to decrypt PDF: stderr message');
  });
  
  it('should reject with stdout when stderr is empty', async () => {
    // Set up the mock behavior for this test
    require('child_process').exec.mockImplementation((cmd, callback) => {
      process.nextTick(() => callback(new Error('exec error'), 'stdout message', ''));
      return { on: jest.fn() };
    });
    
    // Test the stdout error path
    await expect(instance.execCommand('test command'))
      .rejects
      .toThrow('Failed to decrypt PDF: stdout message');
  });
  
  it('should reject with error.message when both stderr and stdout are empty', async () => {
    // Set up the mock behavior for this test
    require('child_process').exec.mockImplementation((cmd, callback) => {
      process.nextTick(() => callback(new Error('plain error message'), '', ''));
      return { on: jest.fn() };
    });
    
    // Test the error message path
    await expect(instance.execCommand('test command'))
      .rejects
      .toThrow('Failed to decrypt PDF: plain error message');
  });
});
