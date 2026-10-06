import knex from 'knex';
import config from '../knexfile.js';

const database = knex(config.development);

export default database;

// import db from './db/knex.js';

// const users = await db('users').select('*');

// console.log(users);