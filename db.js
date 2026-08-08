// config/db.js
// This file is responsible for ONE thing: setting up our connection to PostgreSQL.
// We keep it separate from server.js so the connection logic is easy to find and reuse.

const { Sequelize } = require("sequelize");
const path = require("path");

let sequelize;

if (process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith("postgres")) {
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: "postgres",
    protocol: "postgres",
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false,
      },
    },
    logging: false,
  });
} else {
  sequelize = new Sequelize({
    dialect: "sqlite",
    storage: path.join(__dirname, "../database.sqlite"),
    logging: false,
  });
}

async function connectDB() {
  try {
    await sequelize.authenticate();
    const isPg = process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith("postgres");
    console.log(`${isPg ? "PostgreSQL" : "SQLite"} connected successfully`);

    await sequelize.sync();
    console.log("Database tables synced");
  } catch (error) {
    console.error("Database connection failed:", error.message);
    process.exit(1);
  }
}

module.exports = { sequelize, connectDB }; // export both: the instance (for models to use) and the connect function (for server.js to call)
