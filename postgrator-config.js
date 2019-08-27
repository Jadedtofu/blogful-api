require('dotenv').config();

module.exports = {
    "migrationDirectory": "migrations", // refers to folder in our app that contains the migration steps
    "driver": "pg",                     // refers to same driver setting used to create Knex instance
    "host": process.env.MIGRATION_DB_HOST,
    "port": process.env.MIGRATION_DB_PORT,
    "database": process.env.MIGRATION_DB_NAME,
    "username": process.env.MIGRATION_DB_USER,
    "password": process.env.MIGRATION_DB_PASS
}