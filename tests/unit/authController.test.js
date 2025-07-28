const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const authController = require("../../controllers/authController");
const { User } = require("../../models");
const { setupTestDatabase, cleanupTestDatabase } = require("../helpers/testSetup");
const { SECRET_KEY } = require("../../middleware/authMiddleware");

// Mock the logger to avoid console output during tests
jest.mock("../../utils/logger", () => ({
  info: jest.fn(),
  error: jest.fn(),
  db: jest.fn(),
  debug: jest.fn(),
  request: jest.fn(),
}));

describe("Auth Controller", () => {
  let req, res;

  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  beforeEach(async () => {
    // Clear users table before each test
    await User.destroy({ where: {} });

    // Reset mock request and response objects
    req = {
      body: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
  });

  describe("register", () => {
    it("should successfully register a new user", async () => {
      req.body = {
        username: "testuser",
        password: "testpassword123",
      };

      await authController.register(req, res);

      expect(res.json).toHaveBeenCalledWith({ message: "User created" });
      
      // Verify user was created in database
      const user = await User.findOne({ where: { username: "testuser" } });
      expect(user).toBeTruthy();
      expect(user.username).toBe("testuser");
      
      // Verify password was hashed
      expect(user.password).not.toBe("testpassword123");
      const isPasswordValid = await bcrypt.compare("testpassword123", user.password);
      expect(isPasswordValid).toBe(true);
    });

    it("should reject registration with duplicate username", async () => {
      // Create a user first
      await User.create({
        username: "existinguser",
        password: await bcrypt.hash("password123", 10),
      });

      req.body = {
        username: "existinguser",
        password: "newpassword123",
      };

      await authController.register(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: "User exists" });
    });

    it("should handle missing username", async () => {
      req.body = {
        password: "testpassword123",
      };

      await authController.register(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: "Server error" });
    });

    it("should handle missing password", async () => {
      req.body = {
        username: "testuser",
      };

      await authController.register(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: "Server error" });
    });

    it("should handle empty request body", async () => {
      req.body = {};

      await authController.register(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: "Server error" });
    });
  });

  describe("login", () => {
    beforeEach(async () => {
      // Create a test user for login tests
      await User.create({
        username: "loginuser",
        password: await bcrypt.hash("correctpassword", 10),
      });
    });

    it("should successfully login with valid credentials", async () => {
      req.body = {
        username: "loginuser",
        password: "correctpassword",
      };

      await authController.login(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          token: expect.any(String),
        })
      );

      // Verify the token is valid
      const call = res.json.mock.calls[0][0];
      const token = call.token;
      const decoded = jwt.verify(token, SECRET_KEY);
      expect(decoded.id).toBeTruthy();
    });

    it("should reject login with invalid username", async () => {
      req.body = {
        username: "nonexistentuser",
        password: "correctpassword",
      };

      await authController.login(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: "Invalid credentials" });
    });

    it("should reject login with invalid password", async () => {
      req.body = {
        username: "loginuser",
        password: "wrongpassword",
      };

      await authController.login(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: "Invalid credentials" });
    });

    it("should handle missing username", async () => {
      req.body = {
        password: "correctpassword",
      };

      await authController.login(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: "Invalid credentials" });
    });

    it("should handle missing password", async () => {
      req.body = {
        username: "loginuser",
      };

      await authController.login(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: "Server error" });
    });

    it("should handle empty request body", async () => {
      req.body = {};

      await authController.login(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: "Invalid credentials" });
    });

    it("should generate different tokens for different users", async () => {
      // Create another user
      await User.create({
        username: "anotheruser",
        password: await bcrypt.hash("password123", 10),
      });

      // Login as first user
      req.body = { username: "loginuser", password: "correctpassword" };
      await authController.login(req, res);
      const firstToken = res.json.mock.calls[0][0].token;

      // Reset mocks
      res.json.mockClear();

      // Login as second user
      req.body = { username: "anotheruser", password: "password123" };
      await authController.login(req, res);
      const secondToken = res.json.mock.calls[0][0].token;

      expect(firstToken).not.toBe(secondToken);

      // Verify both tokens decode to different user IDs
      const firstDecoded = jwt.verify(firstToken, SECRET_KEY);
      const secondDecoded = jwt.verify(secondToken, SECRET_KEY);
      expect(firstDecoded.id).not.toBe(secondDecoded.id);
    });
  });

  describe("Password Security", () => {
    it("should hash passwords with sufficient salt rounds", async () => {
      req.body = {
        username: "securitytest",
        password: "testpassword123",
      };

      await authController.register(req, res);

      const user = await User.findOne({ where: { username: "securitytest" } });
      
      // Password should be hashed and different from original
      expect(user.password).not.toBe("testpassword123");
      expect(user.password.length).toBeGreaterThan(50); // bcrypt hashes are typically 60 chars
      expect(user.password).toMatch(/^\$2[aby]\$\d+\$/); // bcrypt format
    });

    it("should generate different hashes for the same password", async () => {
      const password = "samepassword123";

      // Register first user
      req.body = { username: "user1", password };
      await authController.register(req, res);

      // Register second user with same password
      req.body = { username: "user2", password };
      await authController.register(req, res);

      const user1 = await User.findOne({ where: { username: "user1" } });
      const user2 = await User.findOne({ where: { username: "user2" } });

      expect(user1.password).not.toBe(user2.password);
    });
  });

  describe("JWT Token Security", () => {
    beforeEach(async () => {
      await User.create({
        username: "tokenuser",
        password: await bcrypt.hash("password123", 10),
      });
    });

    it("should generate valid JWT tokens", async () => {
      req.body = { username: "tokenuser", password: "password123" };
      await authController.login(req, res);

      const token = res.json.mock.calls[0][0].token;
      expect(typeof token).toBe("string");

      // Should be able to decode without error
      const decoded = jwt.verify(token, SECRET_KEY);
      expect(decoded.id).toBeTruthy();
      expect(typeof decoded.id).toBe("number");
    });

    it("should include correct user ID in token", async () => {
      req.body = { username: "tokenuser", password: "password123" };
      await authController.login(req, res);

      const token = res.json.mock.calls[0][0].token;
      const decoded = jwt.verify(token, SECRET_KEY);
      
      const user = await User.findOne({ where: { username: "tokenuser" } });
      expect(decoded.id).toBe(user.id);
    });
  });

  describe("Error Handling", () => {
    it("should handle database connection errors during registration", async () => {
      // Mock User.create to throw an error
      const originalCreate = User.create;
      User.create = jest.fn().mockRejectedValue(new Error("Database connection error"));

      req.body = { username: "testuser", password: "testpassword" };
      await authController.register(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: "Server error" });

      // Restore original method
      User.create = originalCreate;
    });

    it("should handle database connection errors during login", async () => {
      // Mock User.findOne to throw an error
      const originalFindOne = User.findOne;
      User.findOne = jest.fn().mockRejectedValue(new Error("Database connection error"));

      req.body = { username: "testuser", password: "testpassword" };
      await authController.login(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: "Server error" });

      // Restore original method
      User.findOne = originalFindOne;
    });

    it("should handle bcrypt errors during registration", async () => {
      // Mock bcrypt.hash to throw an error
      const originalHash = bcrypt.hash;
      bcrypt.hash = jest.fn().mockRejectedValue(new Error("Bcrypt error"));

      req.body = { username: "testuser", password: "testpassword" };
      await authController.register(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: "Server error" });

      // Restore original method
      bcrypt.hash = originalHash;
    });

    it("should handle bcrypt errors during login", async () => {
      // Create a user first
      await User.create({
        username: "bcrypttest",
        password: await bcrypt.hash("password123", 10),
      });

      // Mock bcrypt.compare to throw an error
      const originalCompare = bcrypt.compare;
      bcrypt.compare = jest.fn().mockRejectedValue(new Error("Bcrypt error"));

      req.body = { username: "bcrypttest", password: "password123" };
      await authController.login(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: "Server error" });

      // Restore original method
      bcrypt.compare = originalCompare;
    });
  });
});