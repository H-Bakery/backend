# Bakery Backend
This repository contains the backend API for a bakery application. It's built using Node.js, Express, and Sequelize ORM with a SQLite database. The backend provides authentication functionality (register/login), cash management for tracking daily revenue, chat system for communication, and product management with CSV data import. The codebase follows a structured MVC (Model-View-Controller) pattern for better organization and maintainability.

## Architecture

bakery backend/
│
├── config/
│   └── database.js         # Database configuration
│
├── controllers/
│   ├── authController.js   # Authentication logic
│   ├── cashController.js   # Cash entry logic
│   ├── chatController.js   # Chat message logic
│   └── productController.js # Product management logic
│
├── middleware/
│   ├── authMiddleware.js   # Authentication middleware
│   └── loggerMiddleware.js # Request logging middleware
│
├── models/
│   ├── index.js            # Model definitions and relationships
│   ├── User.js             # User model
│   ├── Cash.js             # Cash model
│   ├── Chat.js             # Chat model
│   └── Product.js          # Product model
│
├── routes/
│   ├── authRoutes.js       # Authentication routes
│   ├── cashRoutes.js       # Cash routes
│   ├── chatRoutes.js       # Chat routes
│   └── productRoutes.js    # Product routes
│
├── seeders/
│   └── productSeeder.js    # Seed data for products from CSV
│
├── tests/                  # Testing framework
│   ├── fixtures/           # Test data files
│   ├── helpers/            # Shared testing utilities
│   ├── integration/        # Integration tests
│   ├── unit/               # Unit tests
│   └── README.md           # Testing documentation
│
├── utils/
│   ├── logger.js           # Logging utility
│   └── csvParser.js        # CSV parsing utility
│
└── index.js                # Main application entry

## Testing

The project includes a comprehensive testing framework built with Jest. The tests cover both unit testing of individual components and integration testing of the full application flow.

### Running Tests

```bash
# Run all tests
npm test

# Run tests with coverage report
npm run test:coverage

# Run tests in watch mode (for development)
npm run test:watch

# Test the CSV parser utility
npm run test:csv
```

### Test Structure

- **Unit Tests**: Test individual components in isolation (models, controllers, utilities)
- **Integration Tests**: Test how components work together (API endpoints, database operations)
- **Test Fixtures**: Sample data files used in tests
- **Test Helpers**: Utilities to simplify test setup and teardown

For more information about the test framework, see the [tests README](tests/README.md).

## CSV Product Import

The backend includes functionality to import product data from CSV files. This feature allows for easy bulk loading of product data from the `content/products/products.csv` file.

For more details about the CSV import functionality, see [README-CSV-IMPORT.md](README-CSV-IMPORT.md).
