const { expect } = require('chai');
const supertest = require('supertest');
const knex = require('knex');
const app = require('../src/app');
const { makeArticlesArray } = require('./articles.fixtures');

describe.only('Articles Endpoints', function() {
    let db;

    before('make knex instance', () => {
        db = knex({
            client: 'pg',
            connection: process.env.TEST_DB_URL,
        });
        app.set('db', db)  
        // we skipped ./src/server.js and need app.set('db', knexInstance) here to run tests
    });

    after('disconnect from db', () => db.destroy());

    before('clean the table', () => db('blogful_articles').truncate());

    afterEach('cleanup', () => db('blogful_articles').truncate());

    // we can make context to describe app in a state where the database
    // has articles. We'll use beforEach to insert testArticles:

    describe(`GET /articles`, () => {
        context(`Given no articles`, () => {
            it(`responds with 200 and an empty list`, () => {
                return supertest(app)
                    .get('/articles')
                    .expect(200, []);
            });
        });

        context(`Given there are articles in the database`, () => {
            const testArticles = makeArticlesArray();
    
            beforeEach(`insert articles`, () => {
                return db
                    .into('blogful_articles')
                    .insert(testArticles.map(testArticle => ({
                        id: testArticle.id,
                        title: testArticle.title,
                        style: testArticle.style,
                        content: testArticle.content,
                        date_published: new Date(testArticle.date_published)
                    })));
                    // insert this array of objects into the table
            });
    
            it(`responds with 200 and all of the articles`, () => {
                return supertest(app)
                    .get('/articles')
                    // .expect(200);
                    // TODO: add more assertions about the body
                    .expect(200, testArticles);
                  // the response body that we are expecting
            });
        });
    });

    describe(`GET /articles/:article_id`, () => {
        context(`Given there are no articles`, () => {
            it(`responds with 404`, () => {
                const articleId = 12345
                return supertest(app)
                    .get(`/articles/${articleId}`)
                    .expect(404, {
                                    error: { 
                                        message: `Article doesn't exist`}
                                    });
            });
        });

        context('Given there are articles in the database', () => {
            const testArticles = makeArticlesArray();
    
            beforeEach(`insert articles`, () => {
                return db
                    .into('blogful_articles')
                    .insert(testArticles.map(testArticle => ({
                        id: testArticle.id,
                        title: testArticle.title,
                        style: testArticle.style,
                        content: testArticle.content,
                        date_published: new Date(testArticle.date_published)
                    })));
                    // insert this array of objects into the table
            });
    
            it(`responds with 200 and the specified article`, () => {
                const articleId = 2;
                const expectedArticle = testArticles[articleId -1];
                return supertest(app)
                    .get(`/articles/${articleId}`)
                    .expect(200, expectedArticle);
                    // how to refactor this with the time thing in mind? 
            });
        });
    });

});
