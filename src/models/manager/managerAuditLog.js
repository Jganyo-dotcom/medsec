const mongoose = require("mongoose");

const actionLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId,}, // who did the action
  path:{type:String, enum:["Manager","Hospital"]},
  action: { type: String, required: true },                      // e.g. CREATE_HOSPITAL                     // e.g. "Hospital", "Login"
  message: { type: String, required: true },                     // human-readable message
  entityId: { type: mongoose.Schema.Types.ObjectId },            // reference ID if applicable
  entityType: { type: String }                                   // model name if you want dynamic populate
}, { timestamps: true });

module.exports = mongoose.model("ActionLog", actionLogSchema);
