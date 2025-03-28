const PDFDecryptionStrategy = require('../../src/strategies/pdfDecryptionStrategy');

describe('pdfDecryptionStrategy', () => {
  
  test('should be defined', () => {
    expect(PDFDecryptionStrategy).toBeDefined();
  });

  test('should throw error when decrypt method is called directly on the base class', () => {
    const strategy = new PDFDecryptionStrategy();
    expect(() => strategy.decrypt()).toThrow('decrypt method must be implemented');
  });

  test('subclasses should implement decrypt method', () => {
    class qpdfDecryption extends PDFDecryptionStrategy {
      decrypt() {
        return 'PDF decrypted with password';
      }
    }

    const passwordStrategy = new qpdfDecryption();
    expect(passwordStrategy.decrypt()).toBe('PDF decrypted with password');
    expect(() => passwordStrategy.decrypt()).not.toThrow();
  });

  test('subclasses can be used polymorphically', () => {
    class pdfLibDecryption extends PDFDecryptionStrategy {
      decrypt() {
        return 'PDF decrypted with libs library';
      }
    }

    class qpdfDecrypt extends PDFDecryptionStrategy {
      decrypt() {
        return 'PDF decrypted with password';
      }
    }

    const strategies = [
      new pdfLibDecryption(),
      new qpdfDecrypt()
    ];

    expect(strategies[0].decrypt()).toBe('PDF decrypted with libs library');
    expect(strategies[1].decrypt()).toBe('PDF decrypted with password');
  });
    

});