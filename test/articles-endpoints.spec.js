const { expect } = require('chai');
const supertest = require('supertest');
const knex = require('knex');
const app = require('../src/app');
const { makeArticlesArray } = require('./articles.fixtures');

describe('Articles Endpoints', function() {
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

    describe.only(`GET /articles/:article_id`, () => {
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

        // context(`Given an XSS attack article`, () => {
        //     const maliciousArticle = {
        //         id: 911,
        //         title: 'Naughty naughty very naughty <script>alert("xss");</script>',
        //         style: 'How-to',
        //         content: `Bad image <img src="https://url.to.file.which/does-not.exist" onerror="alert(document.cookie);">. But not <strong>all</strong> bad.`
        //     }

        //     beforeEach('insert malicious article', () => {
        //         return db
        //             .into('blogful_articles')
        //             .insert([ maliciousArticle]);
        //     });

        //     // here, the Naughty with <script> + oneerror alert get removed
        //     it('removes XSS attack content', () => {
        //         return supertest(app)
        //             .get(`/articles/${maliciousArticle.id}`)
        //             .expect(200)
        //             .expect(res => {
        //                 expect(res.body.title).to.eql('Naughty naughty very naughty &lt;script&gt;alert(\"xss\");&lt;/script&gt;');
        //                 expect(res.body.content).to.eql(`Bad image <img src="https://url.to.file.which/does-not.exist">. But not <strong>all</strong> bad.`);
        //             });
        //     });
        // });
    });

    describe.only(`POST /articles`, () => {
        it(`creates an article, responds with 201 and the new article`, function() {
            this.retries(3)  // test 3 times to count as failure if all 3 fails
            const newArticle = {
                title: 'Test new article',
                style: 'Listicle',
                content: 'Test new article content...'
            }
            return supertest(app)
                .post('/articles')
                .send(newArticle)
                .expect(201)
                .expect(res => {
                    expect(res.body.title).to.eql(newArticle.title)
                    expect(res.body.style).to.eql(newArticle.style)
                    expect(res.body.content).to.eql(newArticle.content)
                    expect(res.body).to.have.property('id')
                    expect(res.headers.location).to.eql(`/articles/${res.body.id}`)
                    const expected = new Date().toLocaleString('en', { timeZone: 'UTC' })
                    const actual = new Date(res.body.date_published).toLocaleString()
                    expect(actual).to.eql(expected) // generating current date-time
                })
                .then(postRes =>  // so mocha knows to wait for both requests to resolve
                    supertest(app)
                        .get(`/articles/${postRes.body.id}`)
                        .expect(postRes.body));
        });

        // it(`responds with 400 and an error message when 'title' is missing`, () => {
        //     return supertest(app)
        //         .post('/articles')
        //         .send({
        //             style: 'Listicle',
        //             content: 'Test new article content...'
        //         })
        //         .expect(400, {
        //             error: { message: `Missing 'title' in request body`}
        //         });
        // });

        // it(`responds with 400 and an error message when 'content' is missing`, () => {
        //     return supertest(app)
        //         .post('/articles')
        //         .send({
        //             title: 'Test new article',
        //             style: 'Listicle',
        //         })
        //         .expect(400, {
        //             error: { message: `Missing 'content' in request body` }
        //         });
        // });

        // it(`responds with 400 and an error message when 'style' is missing`, () => {
        //     return supertest(app)
        //         .post('/articles')
        //         .send({
        //             title: 'Test new article',
        //             content: 'Test new article content...'
        //         })
        //         .expect(400, {
        //             error: { message: `Missing 'style' in request body` }
        //         });
        // });

        const requiredFields = ['title', 'style', 'content'];

        requiredFields.forEach(field => {
            const newArticle = {
                title: 'Test new article',
                style: 'Listicles',
                content: 'Test new article content...'
            }

            it(`responds with 400 and an error message when '${field}' is missing`, () => {
                delete newArticle[field];
                    // what's this do? ^
                return supertest(app)
                    .post('/articles')
                    .send(newArticle)
                    .expect(400, {
                        error: { message: `Missing '${field}' in request body` }
                    });
            });
        });
    });

    describe.only(`DELETE /articles/:article_id`, () => {
        context('Given there are articles in the database', () => {
            const testArticles = makeArticlesArray();

            beforeEach('insert articles', () => {
                return db
                    .into('blogful_articles')
                    .insert(testArticles.map(testArticle => ({
                        id: testArticle.id,
                        title: testArticle.title,
                        style: testArticle.style,
                        content: testArticle.content,
                        date_published: new Date(testArticle.date_published)
                    })));
            });  // need this ^ for the time to pass

            it('responds with 204 and removes the article', () => {
                const idToRemove = 2;
                const expectedArticles = testArticles.filter(article => article.id !== idToRemove);  
                return supertest(app)  // why is it like this ?? <-----
                    .delete(`/articles/${idToRemove}`)
                    .expect(204)
                    .then(res => 
                        supertest(app)
                            .get(`/articles`)
                            .expect(expectedArticles)
                    );
            });
        });
    });

    describe.only(`DELETE /articles/:article_id`, () => {
        context(`Given no articles`, () => {
            it(`responds with 404`, () => {
                const articleId = 123456
                return supertest(app)
                    .delete(`/articles/${articleId}`)
                    .expect(404, {
                        error: { message: `Article doesn't exist`}
                    });
            });
        });
    });

});
