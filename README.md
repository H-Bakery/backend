# Bakery Backend
This repository contains the backend API for a bakery application. It's built using Node.js, Express, and Sequelize ORM with a SQLite database. The backend provides authentication functionality (register/login), cash management for tracking daily revenue, and a chat system for communication. The codebase follows a structured MVC (Model-View-Controller) pattern for better organization and maintainability.

## Architecture

bakery backend/
│
├── config/
│   └── database.js         # Database configuration
│
├── controllers/
│   ├── authController.js   # Authentication logic
│   ├── cashController.js   # Cash entry logic
│   └── chatController.js   # Chat message logic
│
├── middleware/
│   ├── authMiddleware.js   # Authentication middleware
│   └── loggerMiddleware.js # Request logging middleware
│
├── models/
│   ├── index.js            # Model definitions and relationships
│   ├── User.js             # User model
│   ├── Cash.js             # Cash model
│   └── Chat.js             # Chat model
│
├── routes/
│   ├── authRoutes.js       # Authentication routes
│   ├── cashRoutes.js       # Cash routes
│   └── chatRoutes.js       # Chat routes
│
├── utils/
│   └── logger.js           # Logging utility
│
└── index.js                # Main application entry
