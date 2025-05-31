# Bakery Backend Overview

This directory contains the Node.js backend for the bakery management system. It's built using Express, Sequelize ORM with a SQLite database.

## Project Structure

- `config/` - Database configuration 
- `controllers/` - Request handlers and business logic
- `middleware/` - Express middleware (auth, logging)
- `models/` - Sequelize data models
- `routes/` - API route definitions
- `seeders/` - Database seed data
- `utils/` - Utility functions and helpers

## Key Features

- REST API for product management
- CSV product import from content/products directory
- User authentication and authorization
- Cash management system
- Chat functionality

## Recent Updates

The backend now supports importing product data from CSV files:
- Added CSV parser utility in `utils/csvParser.js`
- Updated product model to include image and category fields
- Modified product seeder to read from CSV instead of hardcoded values
- Added test script for CSV parsing in `test-csv.js`

## API Endpoints

- Authentication: `/login`, `/register` 
- Products: `/products`, `/products/:id`
- Orders: `/orders`
- Baking List: `/baking-list`
- Cash: `/cash`
- Chat: `/chat`

## Code Style

- No semicolons
- MVC architecture
- Async/await pattern for asynchronous operations
- Proper error handling
- Sequelize for database operations

## Getting Started

Run `npm install` to install dependencies and `npm start` to start the server. The server will run on port 5000 by default.