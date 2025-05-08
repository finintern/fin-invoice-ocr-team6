const QpdfDecryption = require('../../src/strategies/qpdfDecryption');
const PDFDecryptionStrategy = require('../../src/strategies/pdfDecryptionStrategy');
const fs = require('fs');
const { spawn } = require('child_process');

// Mock dependencies
jest.mock('child_process', () => ({ 
  spawn: jest.fn()
 }));
jest.mock('fs', () => ({
  mkdirSync: jest.fn(),
  writeFileSync: jest.fn(),
  readFileSync: jest.fn().mockReturnValue(Buffer.from('decrypted pdf content')),
  existsSync: jest.fn().mockReturnValue(true),
  unlinkSync: jest.fn(),
  rmSync: jest.fn(),
  lstatSync: jest.fn().mockReturnValue({ isDirectory: jest.fn().mockReturnValue(false) })
}));

// Helper to create standardized spawn process mocks
const createMockProcess = (options = {}) => {
  const {
    exitCode = 0,
    stdoutData = '',
    stderrData = '',
    emitError = false
  } = options;
  
  return {
    stdout: {
      on: jest.fn((event, callback) => {
        if (event === 'data' && stdoutData) {
          callback(Buffer.from(stdoutData));
        }
      })
    },
    stderr: {
      on: jest.fn((event, callback) => {
        if (event === 'data' && stderrData) {
          callback(Buffer.from(stderrData));
        }
      })
    },
    on: jest.fn((event, callback) => {
      if (event === 'close') {
        callback(exitCode);
      }
      if (event === 'error' && emitError) {
        callback(new Error('Process error'));
      }
    })
  };
};

describe('QpdfDecryption', () => {
  let qpdfDecryption;
  
  beforeEach(() => {
    jest.clearAllMocks();
    spawn.mockReset(); 
    spawn.mockImplementation(() => createMockProcess({ exitCode: 0 }));
    // Prevent checkQpdfAvailability from running
    jest.spyOn(QpdfDecryption.prototype, 'checkQpdfAvailability').mockResolvedValue(true);
    qpdfDecryption = new QpdfDecryption();

  });

  describe('initialize', () => {
    test('initialize should call checkQpdfAvailability', async () => {
      const checkQpdfAvailabilitySpy = jest.spyOn(qpdfDecryption, 'checkQpdfAvailability');
      await qpdfDecryption.initialize();
      expect(checkQpdfAvailabilitySpy).toHaveBeenCalled();
    });
  
    test('initialize should handle errors', async () => {
      const checkQpdfAvailabilitySpy = jest.spyOn(qpdfDecryption, 'checkQpdfAvailability').mockRejectedValue(new Error('Test error'));
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      await qpdfDecryption.initialize();
      
      expect(checkQpdfAvailabilitySpy).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith(new Error('Test error'));
      
      consoleErrorSpy.mockRestore();
    }); 
  }); 

  describe('_checkQpdfInPath', () => {
    test('_checkQpdfInPath should find qpdf executable', async () => {
      // Setup the mock
      const mockProcess = createMockProcess({ stdoutData: '/usr/bin/qpdf\n' });
      spawn.mockImplementation(() => mockProcess);
      
      const qpdfPath = await qpdfDecryption._checkQpdfInPath();
      
      expect(spawn).toHaveBeenCalledWith('which', ['qpdf']);
      expect(qpdfPath).toBe('/usr/bin/qpdf');
    });

    test('_checkQpdfInPath should throw an error if qpdf is not found', async () => {
      const mockProcess = createMockProcess({ exitCode: 1, stderrData: 'QPDF not found in PATH' });
      spawn.mockImplementation(() => mockProcess);
      
      await expect(qpdfDecryption._checkQpdfInPath()).rejects.toThrow('QPDF not found in PATH');
      expect(spawn).toHaveBeenCalledWith('which', ['qpdf']);
    }); 
  }); 

  describe('_checkQpdfVersion', () => {
    test('_checkQpdfVersion should verify qpdf version', async () => {
      const mockProcess = createMockProcess();
      spawn.mockImplementation(() => mockProcess);
      
      await qpdfDecryption._checkQpdfVersion('/usr/bin/qpdf');
      
      expect(spawn).toHaveBeenCalledWith('/usr/bin/qpdf', ['--version']);
    });

    test('_checkQpdfVersion should reject when process emits an error', async () => {
      // Create a mock process that emits an error event
      const expectedError = new Error('Process execution failed');
      const mockProcess = {
        on: jest.fn((event, callback) => {
          if (event === 'error') {
            callback(expectedError);
          }
        })
      };
      
      spawn.mockImplementation(() => mockProcess);
      
      // Call the method and verify it rejects with the emitted error
      await expect(qpdfDecryption._checkQpdfVersion('/usr/bin/qpdf'))
        .rejects.toEqual(expectedError);
        
      // Verify spawn was called with correct arguments
      expect(spawn).toHaveBeenCalledWith('/usr/bin/qpdf', ['--version']);
    });
  
    test('_checkQpdfVersion should reject when process exits with non-zero code', async () => {
      // Create a mock process that returns a non-zero exit code
      const mockProcess = {
        on: jest.fn((event, callback) => {
          if (event === 'close') {
            callback(1); // Exit code 1 (error)
          }
        })
      };
      
      spawn.mockImplementation(() => mockProcess);
      
      // Call the method and verify it rejects with expected error message
      await expect(qpdfDecryption._checkQpdfVersion('/usr/bin/qpdf'))
        .rejects.toThrow('Failed to verify qpdf version');
        
      // Verify spawn was called with correct arguments
      expect(spawn).toHaveBeenCalledWith('/usr/bin/qpdf', ['--version']);
    });
  
    test('_checkQpdfVersion should reject when qpdf path is invalid', async () => {
      // Create a mock process that emits an error for invalid path
      const expectedError = new Error('ENOENT: no such file or directory');
      const mockProcess = {
        on: jest.fn((event, callback) => {
          if (event === 'error') {
            callback(expectedError);
          }
        })
      };
      
      spawn.mockImplementation(() => mockProcess);
      
      await expect(qpdfDecryption._checkQpdfVersion('/invalid/path/to/qpdf'))
        .rejects.toEqual(expectedError);
        
      expect(spawn).toHaveBeenCalledWith('/invalid/path/to/qpdf', ['--version']);
    });
  
    test('_checkQpdfVersion should reject when process is terminated with signal', async () => {
      // Create a mock process that gets terminated with a signal
      const mockProcess = {
        on: jest.fn((event, callback) => {
          if (event === 'close') {
            // Pass code=null and signal='SIGTERM' to simulate termination
            callback(null, 'SIGTERM');
          }
        })
      };
      
      spawn.mockImplementation(() => mockProcess);
      
      await expect(qpdfDecryption._checkQpdfVersion('/usr/bin/qpdf'))
        .rejects.toThrow('Failed to verify qpdf version');
    });

    test('should use default message when stderr is empty', async () => {
      const mockProcess = {
        stdout: {
          on: jest.fn((event) => {
            if (event === 'data') {
              // Don't provide any stdout data
            }
          })
        },
        stderr: {
          on: jest.fn((event) => {
            if (event === 'data') {
              // Empty stderr
            }
          })
        },
        on: jest.fn((event, callback) => {
          if (event === 'close') {
            // Call the close handler with non-zero exit code
            callback(1);
          }
        })
      };
      
      spawn.mockImplementation(() => mockProcess);
      
      // The original implementation should now reject with the default message
      await expect(qpdfDecryption._checkQpdfInPath()).rejects.toThrow('QPDF not found in PATH');
    });
  }); 

  describe('checkQpdfAvailability', () => {
    test('should set isQpdfAvailable to true when qpdf is found', async () => {
      // Restore original implementation for this test only
      QpdfDecryption.prototype.checkQpdfAvailability.mockRestore();
  
      // Mock both required methods
      jest.spyOn(qpdfDecryption, '_checkQpdfInPath').mockResolvedValue('/usr/bin/qpdf');
      jest.spyOn(qpdfDecryption, '_checkQpdfVersion').mockResolvedValue();
      
      // Reset the value to ensure the test is valid
      qpdfDecryption.isQpdfAvailable = false;
      
      const result = await qpdfDecryption.checkQpdfAvailability();
      expect(result).toBe(true);
    });
  
    test('should set isQpdfAvailable to false when qpdf is not found in path', async () => {
      // Restore original implementation for this test only
      QpdfDecryption.prototype.checkQpdfAvailability.mockRestore();
  
      // Mock both required methods
      jest.spyOn(qpdfDecryption, '_checkQpdfInPath').mockRejectedValue(new Error('qpdf not found'));
      // jest.spyOn(qpdfDecryption, '_checkQpdfVersion').mockResolvedValue();
      
      // Reset the value to ensure the test is valid
      qpdfDecryption.isQpdfAvailable = false;
  
      const result = await qpdfDecryption.checkQpdfAvailability();  
      expect(result).toBe(false);
    });
  
    test('should set isQpdfAvailable to false when qpdf version check fails', async () => {
      // Restore original implementation for this test only
      QpdfDecryption.prototype.checkQpdfAvailability.mockRestore();
  
      // Mock both required methods
      jest.spyOn(qpdfDecryption, '_checkQpdfInPath').mockResolvedValue('/usr/bin/qpdf');
      jest.spyOn(qpdfDecryption, '_checkQpdfVersion').mockRejectedValue(new Error('qpdf version check failed'));
      
      // Reset the value to ensure the test is valid
      qpdfDecryption.isQpdfAvailable = false;
  
      const result = await qpdfDecryption.checkQpdfAvailability();
      expect(result).toBe(false);
    });

    test('should cache the result of checkQpdfAvailability', async () => {
      // Restore original implementation for this test only
      QpdfDecryption.prototype.checkQpdfAvailability.mockRestore();
  
      // Mock both required methods
      jest.spyOn(qpdfDecryption, '_checkQpdfInPath').mockResolvedValue('/usr/bin/qpdf');
      jest.spyOn(qpdfDecryption, '_checkQpdfVersion').mockResolvedValue();
      
      // Reset the value to ensure the test is valid
      qpdfDecryption.isQpdfAvailable = false;
  
      const result1 = await qpdfDecryption.checkQpdfAvailability();
      const result2 = await qpdfDecryption.checkQpdfAvailability();
  
      expect(result1).toBe(true);
      expect(result2).toBe(true);
    });
  }); 
  
  test('execCommand functionality', async () => {
    // Success case
    spawn.mockImplementation(() => createMockProcess());
    await expect(qpdfDecryption.execCommand('qpdf', ['--decrypt'])).resolves.toBeUndefined();

    // QPDF not available
    jest.spyOn(qpdfDecryption, 'checkQpdfAvailability').mockResolvedValue(false);
    await expect(qpdfDecryption.execCommand('qpdf', ['--decrypt'])).rejects.toThrow('QPDF is not installed');
    
    // Command failure
    jest.spyOn(qpdfDecryption, 'checkQpdfAvailability').mockResolvedValue(true);
    spawn.mockImplementation(() => createMockProcess({ 
      exitCode: 1, 
      stderrData: 'Error output' 
    }));
    await expect(qpdfDecryption.execCommand('qpdf', ['--decrypt'])).rejects.toThrow('Failed to decrypt PDF: Error output');
  });
  
  test('decrypt method scenarios', async () => {
    const pdfBuffer = Buffer.from('encrypted pdf content');
    const password = 'password123';
    
    // Mock execCommand to isolate tests
    qpdfDecryption.execCommand = jest.fn().mockResolvedValue(undefined);
    
    // Input validation
    await expect(qpdfDecryption.decrypt('not a buffer', password)).rejects.toThrow('Invalid input: Expected a Buffer.');
    
    // Successful decryption
    const result = await qpdfDecryption.decrypt(pdfBuffer, password);
    expect(fs.mkdirSync).toHaveBeenCalled();
    expect(fs.writeFileSync).toHaveBeenCalled();
    expect(qpdfDecryption.execCommand).toHaveBeenCalledWith('qpdf', expect.arrayContaining([`--password=${password}`, '--decrypt']));
    expect(result).toEqual(Buffer.from('decrypted pdf content'));
    
    // Output file missing
    fs.existsSync.mockImplementation(path => !path.includes('decrypted.pdf'));
    await expect(qpdfDecryption.decrypt(pdfBuffer, password)).rejects.toThrow('Output file not created');
    
    // Error handling
    const errorCases = [
      { error: 'Invalid password', expectedMessage: 'Incorrect password' },
      { error: 'PDF header not found', expectedMessage: 'Corrupted file' },
      { error: 'not a PDF file', expectedMessage: 'Corrupted file' },
      { error: 'Unknown error', expectedMessage: 'Unknown error' }
    ];
    
    for (const { error, expectedMessage } of errorCases) {
      qpdfDecryption.execCommand = jest.fn().mockRejectedValue(new Error(error));
      await expect(qpdfDecryption.decrypt(pdfBuffer, password)).rejects.toThrow(expectedMessage);
    }
    
    // Cleanup is called even on error
    const cleanupSpy = jest.spyOn(qpdfDecryption, 'cleanupFiles');
    qpdfDecryption.execCommand = jest.fn().mockRejectedValue(new Error('Decryption failed'));
    try { await qpdfDecryption.decrypt(pdfBuffer, password); } catch (e) { /* ignore */ }
    expect(cleanupSpy).toHaveBeenCalled();
  });
  
  test('cleanupFiles functionality', () => {
    // Reset mocks to known state
    fs.existsSync.mockReturnValue(true);
    fs.lstatSync.mockReturnValue({ isDirectory: jest.fn().mockReturnValue(false) });
    
    // File removal
    qpdfDecryption.cleanupFiles(['/tmp/test.pdf']);
    expect(fs.unlinkSync).toHaveBeenCalledWith('/tmp/test.pdf');

    // Clear mock calls between test cases
    fs.unlinkSync.mockClear();
    
    // Directory removal
    fs.lstatSync.mockReturnValue({ isDirectory: jest.fn().mockReturnValue(true) });
    qpdfDecryption.cleanupFiles(['/tmp/test-dir']);
    expect(fs.rmSync).toHaveBeenCalledWith('/tmp/test-dir', { recursive: true, force: true });
    
    // Non-existent path
    fs.existsSync.mockReturnValue(false);
    qpdfDecryption.cleanupFiles(['/non-existent']);
    expect(fs.unlinkSync).not.toHaveBeenCalledWith('/non-existent');
    
    // Error handling
    fs.existsSync.mockReturnValue(true);
    fs.lstatSync.mockReturnValue({ isDirectory: jest.fn().mockReturnValue(false) });
    fs.unlinkSync.mockImplementation(() => { throw new Error('Permission denied'); });
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    qpdfDecryption.cleanupFiles(['/tmp/test.pdf']);
    expect(consoleWarnSpy).toHaveBeenCalled();
    consoleWarnSpy.mockRestore();
  });
  
  test('class inheritance', () => {
    expect(qpdfDecryption).toBeInstanceOf(PDFDecryptionStrategy);
  });


});