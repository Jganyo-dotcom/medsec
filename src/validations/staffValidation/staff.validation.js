const Joi = require("joi");

const addStaffSchema = Joi.object({
  name: Joi.string().min(3).required(),
  role: Joi.string()
    .valid("Doctor", "Nurse", "Technician", "IT Admin", "Other")
    .required(),
  email: Joi.string().email().required(),
  phone: Joi.string()
    .length(10)
    .pattern(/^[0-9]+$/)
    .required(),
  department: Joi.string().min(2).required(),
  password: Joi.string().min(6).required(),
});

const editStaffSchema = Joi.object({
  name: Joi.string().min(3),
  role: Joi.string().valid(
    "Doctor",
    "Nurse",
    "Technician",
    "IT Admin",
    "Other"
  ),
  email: Joi.string().email(),
  phone: Joi.string()
    .length(10)
    .pattern(/^[0-9]+$/),
  department: Joi.string().min(2),
});

const resetPasswordSchema = Joi.object({
  newPassword: Joi.string().min(6).required(),
  confirmPassword: Joi.string().valid(Joi.ref("newPassword")).required(),
});

module.exports = {
  addStaffSchema,
  editStaffSchema,
  resetPasswordSchema,
};
