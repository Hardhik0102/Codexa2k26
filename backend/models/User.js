// models/User.js
// Defines the "users" table structure in PostgreSQL, and how passwords are hashed/checked.

const { DataTypes } = require("sequelize"); // gives us the types we use to describe each column (String, Enum, etc.)
const bcrypt = require("bcryptjs"); // library used to hash passwords so we never store them in plain text
const { sequelize } = require("../config/db"); // the shared database connection every model uses

// sequelize.define(tableName, columns, options) creates a Model tied to a PostgreSQL table
const User = sequelize.define("User", {
  id: {
    type: DataTypes.INTEGER, // whole number
    primaryKey: true, // marks this column as the table's primary key
    autoIncrement: true, // PostgreSQL will automatically assign 1, 2, 3... to new rows
  },
  name: {
    type: DataTypes.STRING, // text field (VARCHAR in SQL terms)
    allowNull: false, // this field cannot be left empty
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true, // no two users can share the same email — enforced at the database level
    validate: { isEmail: true }, // Sequelize checks this looks like a real email before saving
  },
  password: {
    type: DataTypes.STRING, // this stores the HASHED password, never the plain text one
    allowNull: false,
  },
  role: {
    type: DataTypes.ENUM("student", "admin"), // PostgreSQL enum type — only these two exact values are allowed
    defaultValue: "student", // if no role is given, assume student
  },
}, {
  timestamps: true, // automatically adds createdAt and updatedAt columns to the table
  hooks: {
    beforeCreate: async (user) => {
      if (user.email) user.email = user.email.toLowerCase();
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(user.password, salt);
    },
    beforeUpdate: async (user) => {
      if (user.email) user.email = user.email.toLowerCase();
      if (user.changed("password")) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
      }
    },
  },
});

// Custom instance method attached to every user record — lets us check a login attempt against the stored hash
User.prototype.comparePassword = async function (candidatePassword) {
  // bcrypt.compare hashes the candidate password the same way and checks if it matches the stored hash
  return bcrypt.compare(candidatePassword, this.password); // returns true or false
};

module.exports = User; // export the model so other files can create/find/update users
