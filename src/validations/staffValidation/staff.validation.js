const Joi = require("joi");

const addStaffSchema = Joi.object({
  firstName: Joi.string().trim().min(2).required(),
  lastName: Joi.string().trim().min(2).required(),
  email: Joi.string().email().required(),
  phone: Joi.string()
    .pattern(/^[0-9+ -]{7,15}$/)
    .required()
    .messages({
      "string.pattern.base": "Please provide a valid phone number.",
    }),
  role: Joi.string()
    .valid(
      "Doctor",
      "Nurse",
      "LabScientist",
      "Pharmacist",
      "IT Admin",
      "Receptionist",
    )
    .required(),
  department: Joi.string().min(2).required(),
  password: Joi.string().min(6).required(),
  staffID: Joi.string().min(3).optional(),
  staffId: Joi.string().min(3).optional(),
}).or("staffID", "staffId"); // Accepts staffID or staffId from request



const editStaffSchema = Joi.object({
  firstName: Joi.string().trim().allow(""),
  lastName: Joi.string().trim().allow(""),
  name: Joi.string().min(2).trim(),
  email: Joi.string().email().trim().lowercase(),
  phone: Joi.string().trim().allow(""),
  contact: Joi.string().trim().allow(""), // Accepts frontend 'contact' input
  department: Joi.string().min(2).trim(),
  role: Joi.string().valid(
    "Doctor",
    "Nurse",
    "LabScientist",
    "Pharmacist",
    "IT Admin",
    "Receptionist",
    "Technician",
    "Other"
  ),
  accessLevel: Joi.string().trim().allow(""),
}).min(1);



const resetPasswordSchema = Joi.object({
  newPassword: Joi.string().min(6).required(),
  confirmPassword: Joi.string().valid(Joi.ref("newPassword")).required(),
});

module.exports = {
  addStaffSchema,
  editStaffSchema,
  resetPasswordSchema,
};
