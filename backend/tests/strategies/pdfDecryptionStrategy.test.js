const PdfDecryptionStrategy = require('../../src/strategies/pdfDecryptionStrategy');

describe('PdfDecryptionStrategy', () => {
  let strategy;

  beforeEach(() => {
    strategy = new PdfDecryptionStrategy();
  });

  test('should be a class that can be instantiated', () => {
    expect(strategy).toBeInstanceOf(PdfDecryptionStrategy);
  });

  test('should throw an error when decrypt method is called without implementation', () => {
    expect(() => {
      strategy.decrypt();
    }).toThrow('decrypt method must be implemented');
  });

  test('should allow subclasses to implement the decrypt method', () => {
    class ConcreteDecryptionStrategy extends PdfDecryptionStrategy {
      decrypt() {
        return 'decrypted content';
      }
    }

    const concreteStrategy = new ConcreteDecryptionStrategy();
    expect(concreteStrategy).toBeInstanceOf(PdfDecryptionStrategy);
    expect(concreteStrategy.decrypt()).toBe('decrypted content');
  });

  test('should be used as a base class for other strategies', () => {
    // Test with mock implementation
    const mockImplementation = jest.fn().mockReturnValue('mocked result');
    
    class MockStrategy extends PdfDecryptionStrategy {
      decrypt() {
        return mockImplementation();
      }
    }

    const mockStrategy = new MockStrategy();
    const result = mockStrategy.decrypt();
    
    expect(mockImplementation).toHaveBeenCalled();
    expect(result).toBe('mocked result');
  });

  test('should be extendable with additional methods', () => {
    class ExtendedStrategy extends PdfDecryptionStrategy {
      decrypt() {
        return 'decrypted content';
      }
      
      additionalMethod() {
        return 'additional functionality';
      }
    }

    const extendedStrategy = new ExtendedStrategy();
    expect(extendedStrategy.decrypt()).toBe('decrypted content');
    expect(extendedStrategy.additionalMethod()).toBe('additional functionality');
  });

  test('should pass parameters to decrypt method in subclasses', () => {
    const mockDecrypt = jest.fn();
    
    class ParameterPassingStrategy extends PdfDecryptionStrategy {
      decrypt(...args) {
        return mockDecrypt(...args);
      }
    }

    const paramStrategy = new ParameterPassingStrategy();
    const pdfBuffer = Buffer.from('test pdf');
    const password = 'secret';
    
    paramStrategy.decrypt(pdfBuffer, password);
    
    expect(mockDecrypt).toHaveBeenCalledWith(pdfBuffer, password);
  });
});