// utils/createManager.js
const bcrypt = require("bcrypt");
const Manager = require("../models/manager/manager");

const createManager = async () => {
  try {
    // Define the raw password
    const password = "manager123"; // you can change this

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create a new manager
    const manager = new Manager({
      name: "Elikem James Ganyo",
      email: "elikemejay@gmail.com",
      password: hashedPassword,
      role: "manager", // defaults to "manager"
      hasChangedPassword: false, // add this field in schema if you want to track password changes
    });

    await manager.save();
    console.log("Manager has been created successfully");
  } catch (error) {
    console.error("Error creating manager:", error);
  }
};

module.exports = { createManager };
