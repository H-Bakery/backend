const path = require('path')
const mockFs = require('mock-fs')
const { parseCSV } = require('../../utils/csvParser')
const logger = require('../../utils/logger')

// Mock dependencies
jest.mock('../../utils/csvParser', () => ({
  parseCSV: jest.fn()
}))

jest.mock('../../models', () => {
  const mockProduct = {
    count: jest.fn(),
    bulkCreate: jest.fn().mockResolvedValue([])
  }
  
  return {
    Product: mockProduct
  }
})

describe('Product Seeder', () => {
  let productSeeder
  let models
  
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks()
    
    // Reset modules to get fresh instances
    jest.resetModules()
    
    // Get fresh instances for each test
    models = require('../../models')
    productSeeder = require('../../seeders/productSeeder')
  })
  
  afterEach(() => {
    mockFs.restore()
  })
  
  test('should seed products when no products exist', async () => {
    // Arrange
    models.Product.count.mockResolvedValue(0)
    
    const mockProductsData = [
      { id: '1', name: 'Test Bread', category: 'Bread', image: '/test.jpg', price: '2.99' },
      { id: '2', name: 'Test Cake', category: 'Cake', image: '/test2.jpg', price: '5.99' }
    ]
    
    parseCSV.mockReturnValue(mockProductsData)
    
    // Act
    await productSeeder.seed()
    
    // Assert
    expect(models.Product.count).toHaveBeenCalled()
    expect(parseCSV).toHaveBeenCalledWith(expect.stringContaining('products.csv'))
    
    expect(models.Product.bulkCreate).toHaveBeenCalledWith([
      {
        id: 1,
        name: 'Test Bread',
        price: 2.99,
        description: 'Category: Bread',
        stock: 10,
        dailyTarget: 20,
        isActive: true,
        image: '/test.jpg'
      },
      {
        id: 2,
        name: 'Test Cake',
        price: 5.99,
        description: 'Category: Cake',
        stock: 10,
        dailyTarget: 20,
        isActive: true,
        image: '/test2.jpg'
      }
    ])
    
    expect(logger.info).toHaveBeenCalledWith(expect.stringMatching(/Created 2 products/))
  })
  
  test('should skip seeding when products already exist', async () => {
    // Arrange
    models.Product.count.mockResolvedValue(5)
    
    // Act
    await productSeeder.seed()
    
    // Assert
    expect(models.Product.count).toHaveBeenCalled()
    expect(parseCSV).not.toHaveBeenCalled()
    expect(models.Product.bulkCreate).not.toHaveBeenCalled()
    expect(logger.info).toHaveBeenCalledWith(expect.stringMatching(/Products already exist/))
  })
  
  test('should handle errors gracefully', async () => {
    // Arrange
    models.Product.count.mockRejectedValue(new Error('Database error'))
    
    // Act
    await productSeeder.seed()
    
    // Assert
    expect(logger.error).toHaveBeenCalledWith(expect.stringMatching(/Error seeding products/), expect.any(Error))
  })
  
  test('should handle missing Product model', async () => {
    // Arrange - Create a mock implementation that returns undefined for Product
    jest.mock('../../models', () => {
      return {
        // Return undefined for Product property to simulate missing model
        get Product() {
          return undefined;
        }
      };
    }, { virtual: true });
    
    // Re-require the seeder to use our modified models mock
    const seederWithoutProduct = require('../../seeders/productSeeder')
    
    // Act
    await seederWithoutProduct.seed()
    
    // Assert
    expect(logger.error).toHaveBeenCalledWith(expect.stringMatching(/Product model not found/))
  })
  
  test('should handle CSV parsing errors', async () => {
    // Arrange
    models.Product.count.mockResolvedValue(0)
    parseCSV.mockImplementation(() => {
      throw new Error('CSV parsing error')
    })
    
    // Act
    await productSeeder.seed()
    
    // Assert
    expect(logger.error).toHaveBeenCalledWith(expect.stringMatching(/Error seeding products/), expect.any(Error))
  })
})