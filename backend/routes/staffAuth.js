const express = require("express");
const router = express.Router();

router.post("/login", async (req, res) => {

  return res.json({
    success: true,
    message: "Staff route working"
  });

});

module.exports = router;