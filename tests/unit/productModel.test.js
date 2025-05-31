const { testSequelize, models } = require('../helpers/testDatabase')
const logger = require('../../utils/logger')

describe('Product Model', () => {
  let Product

  beforeAll(async () => {
    // Initialize the test database
    await testSequelize.sync({ force: true })
    
    // Get the Product model from our test models
    Product = models.Product
  })

  afterAll(async () => {
    // Close the database connection
    await testSequelize.close()
  })

  afterEach(() => {
    // Clean up the database between tests
    return Product.destroy({ where: {}, truncate: true })
  })

  test('should create a product with required fields', async () => {
    // Arrange
    const productData = {
      name: 'Test Bread',
      price: 3.99
    }

    // Act
    const product = await Product.create(productData)

    // Assert
    expect(product).toBeDefined()
    expect(product.id).toBeDefined()
    expect(product.name).toBe(productData.name)
    expect(product.price).toBe(productData.price)
    expect(product.isActive).toBe(true) // Default value
    expect(product.stock).toBe(0) // Default value
    expect(product.dailyTarget).toBe(0) // Default value
  })

  test('should create a product with all fields', async () => {
    // Arrange
    const productData = {
      name: 'Complete Product',
      price: 4.99,
      stock: 10,
      dailyTarget: 20,
      description: 'A complete test product',
      isActive: true,
      image: '/path/to/image.jpg',
      category: 'Test Category'
    }

    // Act
    const product = await Product.create(productData)
    const foundProduct = await Product.findByPk(product.id)

    // Assert
    expect(foundProduct.name).toBe(productData.name)
    expect(foundProduct.price).toBe(productData.price)
    expect(foundProduct.stock).toBe(productData.stock)
    expect(foundProduct.dailyTarget).toBe(productData.dailyTarget)
    expect(foundProduct.description).toBe(productData.description)
    expect(foundProduct.isActive).toBe(productData.isActive)
    expect(foundProduct.image).toBe(productData.image)
    expect(foundProduct.category).toBe(productData.category)
  })

  test('should not create product without name', async () => {
    // Arrange
    const productData = {
      price: 3.99
    }

    // Act & Assert
    await expect(Product.create(productData)).rejects.toThrow()
  })

  test('should not create product without price', async () => {
    // Arrange
    const productData = {
      name: 'Test Product No Price'
    }

    // Act & Assert
    await expect(Product.create(productData)).rejects.toThrow()
  })

  test('should update product fields', async () => {
    // Arrange
    const product = await Product.create({
      name: 'Initial Product',
      price: 3.99,
      stock: 5
    })

    // Act
    const updatedValues = {
      name: 'Updated Product',
      price: 4.99,
      stock: 10,
      isActive: false
    }
    
    await product.update(updatedValues)
    const updatedProduct = await Product.findByPk(product.id)

    // Assert
    expect(updatedProduct.name).toBe(updatedValues.name)
    expect(updatedProduct.price).toBe(updatedValues.price)
    expect(updatedProduct.stock).toBe(updatedValues.stock)
    expect(updatedProduct.isActive).toBe(updatedValues.isActive)
  })

  test('should delete a product', async () => {
    // Arrange
    const product = await Product.create({
      name: 'Product To Delete',
      price: 3.99
    })

    // Act
    await product.destroy()
    const foundProduct = await Product.findByPk(product.id)

    // Assert
    expect(foundProduct).toBeNull()
  })

  test('should bulk create products', async () => {
    // Arrange
    const productsData = [
      { name: 'Bulk Product 1', price: 2.99 },
      { name: 'Bulk Product 2', price: 3.99 },
      { name: 'Bulk Product 3', price: 4.99 }
    ]

    // Act
    const createdProducts = await Product.bulkCreate(productsData)
    const count = await Product.count()

    // Assert
    expect(createdProducts.length).toBe(3)
    expect(count).toBe(3)
  })

  test('should find products by category', async () => {
    // Arrange
    await Product.bulkCreate([
      { name: 'Bread 1', price: 2.99, category: 'Bread' },
      { name: 'Bread 2', price: 3.99, category: 'Bread' },
      { name: 'Cake 1', price: 4.99, category: 'Cake' }
    ])

    // Act
    const breadProducts = await Product.findAll({
      where: { category: 'Bread' }
    })

    // Assert
    expect(breadProducts.length).toBe(2)
    expect(breadProducts[0].category).toBe('Bread')
    expect(breadProducts[1].category).toBe('Bread')
  })
})