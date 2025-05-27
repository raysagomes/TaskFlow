const express = require("express");
const router = express.Router();
const {
  register,
  login,
  getMembers,
  getEntities,
  createEntity,
  associateUserToEntity,
} = require("../controllers/userController");

const { authenticateToken } = require("../middleware/authenticateToken");
const { isAdmin, verifyTokenAndAdmin } = require("../middleware/roles"); // se quiser separar

router.post("/register", register);
router.post("/login", login);

router.get("/admin/members", authenticateToken, isAdmin, getMembers);
router.get("/admin/entities", authenticateToken, isAdmin, getEntities);
router.post("/admin/entities", authenticateToken, isAdmin, createEntity);
router.post(
  "/admin/associate",
  authenticateToken,
  isAdmin,
  associateUserToEntity
);

module.exports = router;
