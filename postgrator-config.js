require('dotenv').config();

module.exports = {
    "migrationDirectory": "migrations", 
    // refers to folder in our app that contains the migration steps
    "driver": "pg",                     
    // refers to same driver setting used to create Knex instance
    "connectionString": (process.env.NODE_ENV === 'test')
        ? process.env.TEST_DATABASE_URL
        : process.env.DATABASE_URL,
    "ssl": !!process.env.SSL,
}