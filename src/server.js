const knex = require('knex');
const app = require('./app');
const { PORT, DATABASE_URL } = require('./config');
// const { PORT } = require('./config');
// const PORT = process.env.PORT || 8000;

const db = knex({
    client: 'pg',
    connection: DATABASE_URL,
});

// Express feature to do this so we don't get a dependency cycle
// app.js will create the Express instance, app and exports it
// server.js creates the Knex instance and attaches to app like below: 
app.set('db', db); // set property 'db' with Knex instance as the value
// any request handling middleware can now read 'db' property to get Knex instance
// to read properties on the app ob: we use:
// req.app.get('property-name')

app.listen(PORT, () => {
    console.log(`Server listening at http://localhost: ${PORT}`);
});

