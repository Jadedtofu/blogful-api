const { expect } = require('chai');
const supertest = require('supertest');
const knex = require('knex');
const app = require('../src/app');
const { makeArticlesArray, makeBadArticle } = require('./articles.fixtures');
const { makeUsersArray } = require('./users.fixtures');

describe('Articles Endpoints', function() {
    let db;

    before('make knex instance', () => {
        db = knex({
            client: 'pg',
            connection: process.env.TEST_DATABASE_URL,
        });
        app.set('db', db);
        // we skipped ./src/server.js and need app.set('db', knexInstance) here to run tests
    });

    after('disconnect from db', () => db.destroy());

    // before('clean the table', () => db('blogful_articles').truncate());
    before('clean the table', () => db.raw('TRUNCATE blogful_articles, blogful_users, blogful_comments RESTART IDENTITY CASCADE'));

    // afterEach('cleanup', () => db('blogful_articles').truncate());
    afterEach('cleanup',() => db.raw('TRUNCATE blogful_articles, blogful_users, blogful_comments RESTART IDENTITY CASCADE'));

    // we can make context to describe app in a state where the database
    // has articles. We'll use beforEach to insert testArticles:

    describe(`GET /api/articles`, () => {
        context(`Given no articles`, () => {
            it(`responds with 200 and an empty list`, () => {
                return supertest(app)
                    .get('/api/articles')
                    .expect(200, []);
            });
        });

        context(`Given there are articles in the database`, () => {
            const testUsers = makeUsersArray();
            const testArticles = makeArticlesArray();
    
            beforeEach(`insert articles`, () => {
                return db
                    .into('blogful_articles')
                    .insert(testUsers)
                    .then(() => {
                        return db
                            .into('blogful_articles')
                            .insert(testArticles.map(testArticle => ({  // to make sure the time issue passes in Windows:
                                id: testArticle.id,
                                title: testArticle.title,
                                style: testArticle.style,
                                content: testArticle.content,
                                date_published: new Date(testArticle.date_published)
                            })));
                           // insert this array of objects into the table
                    });
            });
    
            it(`responds with 200 and all of the articles`, () => {
                return supertest(app)
                    .get('/api/articles')
                    // .expect(200);
                    // TODO: add more assertions about the body
                    .expect(200, testArticles);  // uses what was inserted, so the time is fine
                  // the response body that we are expecting
            });
        });

        context(`Given an XSS attack article`, () => {
            const testUsers = makeUsersArray();
            const { badArticle, expectedArticle } = makeBadArticle();

            beforeEach('insert bad article', () => {
                return db
                    .into('blogful_articles')
                    .insert(testUsers)
                    .then(() => {
                        return db
                            .into('blogful_articles')
                            .insert([ badArticle ])
                });
            });

            it('removes XSS attack content', () => {
                return supertest(app)
                    .get(`/api/articles`)
                    .expect(200)
                    .expect(res => {
                        expect(res.body[0].title).to.eql(expectedArticle.title);
                        expect(res.body[0].content).to.eql(expectedArticle.content)
                    });
            });
        });
    });

    describe(`GET /api/articles/:article_id`, () => {
        context(`Given there are no articles`, () => {
            it(`responds with 404`, () => {
                const articleId = 12345
                return supertest(app)
                    .get(`/api/articles/${articleId}`)
                    .expect(404, {
                                    error: { 
                                        message: `Article doesn't exist`}
                                    });
            });
        });

        context('Given there are articles in the database', () => {
            const testUsers = makeUsersArray();
            const testArticles = makeArticlesArray();
    
            beforeEach(`insert articles`, () => {
                return db
                    .into('blogful_articles')
                    .insert(testUsers)
                    .then(() => {
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
                    })
            });
    
            it(`responds with 200 and the specified article`, () => {
                const articleId = 2;
                const expectedArticle = testArticles[articleId - 1];
                return supertest(app)
                    .get(`/api/articles/${articleId}`)
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
        //             .insert([ maliciousArticle ]);
        //     });

        //     // here, the Naughty with <script> + oneerror alert get removed
        //     it('removes XSS attack content', () => {
        //         return supertest(app)
        //             .get(`/api/articles/${maliciousArticle.id}`)
        //             .expect(200)
        //             .expect(res => {
        //                 expect(res.body.title).to.eql('Naughty naughty very naughty &lt;script&gt;alert(\"xss\");&lt;/script&gt;');
        //                 expect(res.body.content).to.eql(`Bad image <img src="https://url.to.file.which/does-not.exist">. But not <strong>all</strong> bad.`);
        //             });
        //     });
        // });

        context(`Given an XSS attack article`, () => {
            const testUsers = makeUsersArray();
            const { badArticle, expectedArticle } = makeBadArticle();

            beforeEach('insert bad article', () => {
                return db
                    .into('blogful_articles')
                    .insert(testUsers)
                    .then(() => {
                        return db
                            .into('blogful_articles')
                            .insert([ badArticle ]);
                    });
            });

            it('removes XSS attack content', () => {
                return supertest(app)
                    .get(`/api/articles/${badArticle.id}`)
                    .expect(200)
                    .expect(res => {
                        expect(res.body.title).to.eql(expectedArticle.title);
                        expect(res.body.content).to.eql(expectedArticle.content);
                    });
            });
        });
    });

    describe(`POST /api/articles`, () => {
        const testUsers = makeUsersArray();
        beforeEach('insert users', () => {
            return db
                .into('blogful_users')
                .insert(testUsers);
        });

        it(`creates an article, responds with 201 and the new article`, () => {
            this.retries(3)  // test 3 times to count as failure if all 3 fails
            const newArticle = {
                title: 'Test new article',
                style: 'Listicle',
                content: 'Test new article content...'
            }
            return supertest(app)
                .post('/api/articles')
                .send(newArticle)
                .expect(201)
                .expect(res => {
                    expect(res.body.title).to.eql(newArticle.title)
                    expect(res.body.style).to.eql(newArticle.style)
                    expect(res.body.content).to.eql(newArticle.content)
                    expect(res.body).to.have.property('id')
                    expect(res.headers.location).to.eql(`/api/articles/${res.body.id}`)
                    const expected = new Date().toLocaleString('en', { timeZone: 'UTC' })
                    const actual = new Date(res.body.date_published).toLocaleString()
                    expect(actual).to.eql(expected) // generating current date-time
                })
                .then(res =>  // so mocha knows to wait for both requests to resolve
                    supertest(app)
                        .get(`/api/articles/${res.body.id}`)
                        .expect(res.body)
                );
        });

        // it(`responds with 400 and an error message when 'title' is missing`, () => {
        //     return supertest(app)
        //         .post('/api/articles')
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
        //         .post('/api/articles')
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
        //         .post('/api/articles')
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
                    // deletes the value of the input field
                return supertest(app)
                    .post('/api/articles')
                    .send(newArticle)
                    .expect(400, {
                        error: { message: `Missing '${field}' in request body` }
                    });
            });
        });

        it(`removes XSS attack content from response`, () => {
            const { badArticle, expectedArticle } = makeBadArticle();
            return supertest(app)
                .post(`/api/articles`)
                .send(badArticle)
                .expect(201)
                .expect(res => {
                    expect(res.body.title).to.eql(expectedArticle.title);
                    expect(res.body.content).to.eql(expectedArticle.content);
                });
        });
    });

    describe(`DELETE /api/articles/:article_id`, () => {
        context(`Given no articles`, () => {
            it(`responds with 404`, () => {
                const articleId = 123456
                return supertest(app)
                    .delete(`/api/articles/${articleId}`)
                    .expect(404, {
                        error: { message: `Article doesn't exist`}
                    });
            });
        });

        context(`Given there are articles in the database`, () => {
            const testUsers = makeUsersArray();
            const testArticles = makeArticlesArray();

            beforeEach('insert articles', () => {
                return db
                    .into('blogful_articles')
                    .insert(testUsers)
                    .then(() => {
                        return db
                            .into('blogful_articles')
                            .insert(testArticles.map(testArticle => ({
                                id: testArticle.id,
                                title: testArticle.title,
                                style: testArticle.style,
                                content: testArticle.content,
                                date_published: new Date(testArticle.date_published)
                                // need this ^ for the time to pass
                            })));
                    });
            });  

            it('responds with 204 and removes the article', () => {
                const idToRemove = 2;
                const expectedArticles = testArticles.filter(article => article.id !== idToRemove);  
                return supertest(app)  // to test response
                    .delete(`/api/articles/${idToRemove}`)
                    .expect(204)
                    .then(() => 
                        supertest(app)
                            .get(`/api/articles`)
                            .expect(expectedArticles)
                    );
            });
        })
    });

    describe(`PATCH /api/articles/:article_id`, () => {
        context(`Given no articles`, () => {
            it(`responds with 404`, () => {
                const articleId = 123456;
                return supertest(app)
                    .patch(`/api/articles/${articleId}`) // reading has .delete(`/api/articles ...)
                    .expect(404, { error: { message: `Article doesn't exist`}})
            });
        });

        context(`Given there are articles in the db`, () => {
            const testUsers = makeUsersArray();
            const testArticles = makeArticlesArray();

            beforeEach(`insert articles`, () => {
                return db
                    .into('blogful_articles')
                    .insert(testUsers)
                    .then(() => {
                        return db
                            .into('blogful_articles')
                            .insert(testArticles.map(testArticle => ({
                                id: testArticle.id,
                                title: testArticle.title,
                                style: testArticle.style,
                                content: testArticle.content,
                                date_published: new Date(testArticle.date_published)
                            })));
                    });
            });

            it('responds with 204 and updates the article', () => {
                const idToUpdate = 2;
                const updateArticle = {
                    title: 'updated article title', 
                    style: 'Interview',
                    content: 'updated article content',
                }
                const expectedArticle = {
                    ...testArticles[idToUpdate -1],
                    ...updateArticle
                }
                return supertest(app)
                    .patch(`/api/articles/${idToUpdate}`)
                    .send(updateArticle)
                    .expect(204)
                    .then(() => 
                        supertest(app)
                            .get(`/api/articles/${idToUpdate}`)
                            .expect(expectedArticle)
                    );
            });

            it(`responds with 400 when no req'd fields are supplied`, () => {
                const idToUpdate = 2;
                return supertest(app)
                    .patch(`/api/articles/${idToUpdate}`)
                    .send({ irrelevantFIeld: 'foo' })
                    .expect(400, {
                        error: { 
                            message: `Request body must contain 'title', 'style', or 'content'` 
                        }
                    });
            });

            it(`responds with 204 when updating only a subset of fields`, () => {
                const idToUpdate = 2;
                const updateArticle = {
                    title: 'updated article title',
                }
                const expectedArticle = {
                    ...testArticles[idToUpdate -1],
                    ...updateArticle
                }

                return supertest(app)
                    .patch(`/api/articles/${idToUpdate}`)
                    .send({
                        ...updateArticle,
                        fieldToIgnore: 'should not be in GET response'
                    })
                    .expect(204)
                    .then(() =>
                        supertest(app)
                            .get(`/api/articles/${idToUpdate}`)
                            .expect(expectedArticle));
            });
        });
    });
});
