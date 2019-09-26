const path = require('path')
const express = require('express');
const xss = require('xss');
const ArticlesService = require('./articles-service');

const articlesRouter = express.Router();
const jsonParser = express.json();

const serializeArticle = article => ({
    id: article.id,
    style: article.style,
    title: xss(article.title),
    content: xss(article.content),
    date_published: new Date(article.date_published),
    author: article.author,  // update code to include author when new article is created (author id)
});

articlesRouter
    .route('/')
    .get((req, res, next) => {
        ArticlesService.getAllArticles(
            req.app.get('db')
            )
            .then(articles => {
                res.json(articles.map(serializeArticle));
            })
            .catch(next);
    })
    .post(jsonParser, (req, res, next) => {
        const { title, content, style, author } = req.body; // adding author to req body
        const newArticle = { title, content, style };

        // if (!title) {
        //     return res.status(400).json({
        //         error: { message: `Missing 'title' in request body` }
        //     });
        // }

        // if (!content) {
        //     return res.status(400).json({
        //         error: { message: `Missing 'content' in request body`}
        //     });
        // }

        for (const [key, value] of Object.entries(newArticle)) {  
                // skipping validation of author, not req'd
            if (value == null) {
                return res.status(400).json({
                    error: { message: `Missing '${key}' in request body`}
                });
            }
        }
        newArticle.author = author;  // adding author to the object
        ArticlesService.insertArticle(
            req.app.get('db'),
            newArticle
        )
        .then(article => {
            res
                .status(201)
                // .location(`/articles/${article.id}`)
                // .location(req.originalUrl + `/${article.id}`)
                .location(path.posix.join(req.originalUrl, `/${article.id}`)) //posix for 
                .json(serializeArticle(article));
        })
        .catch(next);
    });

articlesRouter
    .route('/:article_id')
    .all((req, res, next) => {   // handles triggers for all methods: GET, DELETE, etc.
        ArticlesService.getById(
            req.app.get('db'),
            req.params.article_id
        )
        .then(article => {
            if(!article) {
                return res.status(404).json({
                    error: { message: `Article doesn't exist` }
                });
            }
            res.article = article; // save the article for next middleware
            next();  // don't forget to call next for next middleware
        })
        .catch(next);
    })
    .get((req, res, next) => {
        res.json(serializeArticle(res.article));  // what is this doing?? <-----
        // const knexInstance = req.app.get('db')
        // ArticlesService.getById(knexInstance, req.params.article_id)
        //     .then(article => {
        //         if(!article) {
        //             return res.status(404).json({
        //                 error: { message: `Article doesn't exist` }
        //             });
        //         }
        //         // res.json(article);
        //         res.json({
        //             id: article.id,
        //             style: article.style,
        //             title: xss(article.title), //sanitize title
        //             content: xss(article.content), //santitize content
        //             date_published: article.date_published
        //         });  // check with James how the above works ^
        //     })
        //     .catch(next)
    })
    .delete((req, res, next) => {
        // res.status(204).end();
        ArticlesService.deleteArticle(
            req.app.get('db'),
            req.params.article_id
        )
            .then(() => {
                res.status(204).end();
            })
            .catch(next);
    })
    // .patch((req, res) => {
    .patch(jsonParser, (req, res, next) => {
        const { title, content, style } = req.body;
        const articleToUpdate = { title, content, style };

        const numberOfValues = Object.values(articleToUpdate).filter(Boolean).length;
        if(numberOfValues === 0) {
            return res.status(400).json({
                error: {
                    message: `Request body must contain 'title', 'style', or 'content'`
                }
            });
        }
        // res.status(204).end();
        ArticlesService.updateArticle(
            req.app.get('db'),
            req.params.article_id,
            articleToUpdate
        )
        .then(() => {
            res.status(204).end()
        })
        .catch(next);
    });

module.exports = articlesRouter