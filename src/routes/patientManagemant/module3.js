const express = require("express");
const {
  orderInvestigation,
  getInvestigationQueue,
  enterResult,
} = require("../../controllers/patientManagemant/module3");

const router = express.Router();

// router.post("/order", orderInvestigation);
// router.get("/queue", getInvestigationQueue);
// router.put("/result/:id", enterResult);

module.exports = router;
