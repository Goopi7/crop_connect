const express = require("express");
const { predictPriceHandler } = require("../controllers/predictionController");

const router = express.Router();

router.post("/predict", predictPriceHandler);

module.exports = router;

