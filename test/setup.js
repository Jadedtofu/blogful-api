process.env.TZ = 'UTC'  
// ^Special env variable to force display as UTC (but does not work in Windows)
require('dotenv').config();
const { expect } = require('chai');
const supertest = require('supertest');

global.expect = expect;
global.supertest = supertest;

