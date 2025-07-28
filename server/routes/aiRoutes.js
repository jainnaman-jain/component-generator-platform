const express = require("express");
const router = express.Router();
const { generateComponent } = require("../controllers/aiController");
const authenticateToken = require("../middleware/authMiddleware");

router.post("/generate", authenticateToken, generateComponent);

module.exports = router;
