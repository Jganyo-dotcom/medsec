const Joi = require("joi");

const validateCreateHospital = Joi.object({
  h_name: Joi.string().min(5).required(),
  addresse: Joi.string().min(4).required(),
  h_postalAdress:Joi.string().min(4).required(),
  h_phone: Joi.string()
    .min(7)
    .max(16)
    .pattern(/^\+?[0-9]+$/) // Accepts optional '+' followed by numbers only
    .required(), // Added required() if you want it mandatory like r_phone
  h_email: Joi.string().email().required(),
  r_name: Joi.string().min(5).required(),
  r_email: Joi.string().email().required(),
  r_phone: Joi.string()
    .min(7)
    .max(16)
    .pattern(/^\+?[0-9]+$/) // Accepts optional '+' followed by numbers only
    .required(),
  r_password: Joi.string().min(6).required(),
  r_confirm_password: Joi.string().min(6).required(),
});

module.exports = validateCreateHospital;
