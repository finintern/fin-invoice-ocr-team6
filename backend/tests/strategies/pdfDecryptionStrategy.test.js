const PDFDecryptionStrategy = require('../../src/strategies/pdfDecryptionStrategy');

describe('PDFDecryptionStrategy', () => {
  let strategy;

  beforeEach(() => {
    strategy = new PDFDecryptionStrategy();
  });

  test('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  test('should have decrypt method', () => {
    expect(typeof strategy.decrypt).toBe('function');
  });

  test('should throw error when decrypt is called directly on base class', () => {
    const pdfBuffer = Buffer.from('dummy PDF content');
    const password = 'password123';
    
    expect(() => {
      strategy.decrypt(pdfBuffer, password);
    }).toThrow('decrypt method must be implemented');
  });

  test('should throw error with correct message', () => {
    expect(() => {
      strategy.decrypt();
    }).toThrow('decrypt method must be implemented');
  });

  test('should throw the same error regardless of arguments', () => {
    // Try with different combinations of arguments
    const testCases = [
      [], // No arguments
      [Buffer.from('test')], // Only buffer
      [null, 'password'], // Null buffer
      [Buffer.from('test'), null], // Null password
      [Buffer.from('test'), 'password'], // Both arguments
    ];

    testCases.forEach(args => {
      expect(() => {
        strategy.decrypt(...args);
      }).toThrow('decrypt method must be implemented');
    });
  });

  test('should be properly extended by child classes', () => {
    class ConcreteDecryptionStrategy extends PDFDecryptionStrategy {
      decrypt(pdfBuffer, password) {
        return Buffer.from('decrypted content');
      }
    }
    
    const concreteStrategy = new ConcreteDecryptionStrategy();
    const result = concreteStrategy.decrypt(Buffer.from('test'), 'password');
    
    expect(result).toEqual(Buffer.from('decrypted content'));
  });
});
