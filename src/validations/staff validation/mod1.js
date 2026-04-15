// validation/patientBasic.validation.js
const Joi = require("joi");

const patientBasicValidation = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  dob: Joi.date().required(),
  phone: Joi.string()
    .pattern(/^[0-9+\-()\s]{7,20}$/)
    .required(),
  addresse: Joi.string().min(5).max(200).required(),
  occupation: Joi.string().min(2).max(100).required(),
  tribe: Joi.string().min(2).max(100).required(),
  informant: Joi.string().min(2).max(100).required(),
  gender: Joi.string().valid("Male", "Female", "Other").required(),
  wardAssignment: Joi.string().min(2).max(100).required(),
});

module.exports = patientBasicValidation;
