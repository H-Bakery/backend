const express = require('express');
const router = express.Router();
const recipeController = require('../controllers/recipeController');
const { authenticate } = require('../middleware/authMiddleware');

// Public routes (read-only)
router.get('/', recipeController.getAllRecipes);
router.get('/:slug', recipeController.getRecipeBySlug);

// Protected routes (require authentication)
router.post('/', authenticate, recipeController.createRecipe);
router.put('/:slug', authenticate, recipeController.updateRecipe);
router.delete('/:slug', authenticate, recipeController.deleteRecipe);

module.exports = router;