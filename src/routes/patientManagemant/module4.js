const express = require("express");
const {
  prescribeDrug,
  getPrescriptions,
  updatePrescriptionStatus,
} = require("../../controllers/patientManagemant/module4");

const router = express.Router();

router.post("/prescribe", prescribeDrug);
router.get("/queue", getPrescriptions);
router.put("/update/:id", updatePrescriptionStatus);

module.exports = router;
