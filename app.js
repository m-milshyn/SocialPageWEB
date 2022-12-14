const express = require('express')
const app = express()
const db = require("./database.js")
const bcrypt = require('bcrypt')
const session = require('express-session')
const { data } = require('jquery')
app.use(session({
    secret: 'randomly generated secret',
}))

app.set('view engine', 'ejs')
app.use('/bootstrap', express.static(__dirname + '/node_modules/bootstrap/dist'))
app.use('/jquery', express.static(__dirname + '/node_modules/jquery/dist/'))
app.use('/public', express.static(__dirname + '/public'))
app.use('/images', express.static(__dirname + '/images'))
app.use(express.urlencoded())
app.use(session({
    secret: 'randomly generated secret',
}))

function setCurrentUser(req, res, next) {
    if (req.session.loggedIn) {
        let sql = "SELECT * FROM user WHERE user_id = ?";
        let params = [req.session.userId];
        db.get(sql, params, (err, row) => {
            if (row !== undefined) {
                req.session.Admin = row["email"] === "admin@gmail.com";
                res.locals.currentUser = row
                req.session.userFailed = row["failed_login"]
            }
            return next()
        });
    } else {
        return next()
    }
}
app.use(setCurrentUser)

function checkAuth(req, res, next) {
    if (req.session.loggedIn) {
        return next()
    } else {
        res.redirect('/login')
    }
}

app.get('/', function (req, res) {
    let sql = "SELECT * FROM posts"
    db.all(sql, [], (err, rows) => {
        if (err) {
            res.status(400)
            res.send("database error:" + err.message)
            return;
        }
        res.render('mainblog', { activePage: "mainblog", posts: rows })
    });
})

app.get('/search', function (req, res) {
    let sql = "SELECT * FROM posts";
    db.all(sql, [], (err, rows) => {
        if (err) {
            res.status(400)
            res.send("database error:" + err.message)
            return;
        }
        req.session.Search = rows
        res.render('search', { activePage: "search", posts: rows })
    });
})

app.get('/contact', function (req, res) {
    res.render('contact', { activePage: "contact" })
})

app.get('/new_post', function (req, res) {
    res.render('new_post', { activePage: "new_post" })
})

app.get('/register', function (req, res) {
    req.session.Error = false
    res.render('register', { activePage: "register", error: "" })
})

app.get('/login', function (req, res) {
    req.session.Error = false
    res.render('login', { activePage: "login", error: "" })
})

app.get('/profile', checkAuth, function (req, res) {
    res.render('profile', { activePage: "profile" })
})

app.get('/admin_user', function (req, res) {
    let sql = "SELECT * FROM user";
    db.all(sql, [], (err, rows) => {
        if (err) {
            res.status(400)
            res.send("database error:" + err.message)
            return;
        }
        res.render('admin_user', { activePage: "admin_user", users: rows })
    });
})
app.get('/admin_user/:id/edit', function (req, res) {
    let sql = "SELECT * FROM user WHERE user_id = ?";
    let params = [req.params.id];
    db.get(sql, params, (err, row) => {
        if (err) {
            res.status(400)
            res.send("database error:" + err.message)
            return;
        }
        req.session.AdminError = false
        res.render('edit_user', { user: row, activePage: "admin_user", err: req.session.AdminError })
    });
})
app.post('/admin_user/:id/edit', function (req, res) {
    bcrypt.hash(req.body.password, 10, function (err, hash) {
        let data = [
            req.body.name,
            req.body.email,
            hash,
            req.params.id
        ];
        let sql = "SELECT * FROM user WHERE (email = ? AND user_id <> ?)";
        db.get(sql, [req.body.email, req.params.id], (err, row) => {
            console.log(row)
            if (row === undefined) {
                db.run(
                    `UPDATE user SET
         name = COALESCE(?,name),
         email = COALESCE(?,email),
         password = COALESCE(?,password)
         WHERE user_id = ?`,
                    data,
                    function (err, result) {
                        if (err) {
                            res.status(400)
                            console.log(result)
                            res.send("database error:" + err.message)
                            return;
                        }
                        res.redirect('/admin_user')
                    });
            } else {
                let sql = "SELECT * FROM user WHERE user_id = ?";
                let params = [req.params.id];
                db.get(sql, params, (err, row) => {
                    if (err) {
                        res.status(400)
                        res.send("database error:" + err.message)
                        return;
                    }
                    req.session.AdminError = true
                    res.render('edit_user', { activePage: "admin_user", user: row, err: req.session.AdminError })
                })
            }

        })
    })
})
app.get('/admin_user/:id/delete', function (req, res) {
    let sql = "DELETE FROM user WHERE user_id = ?";
    let params = [req.params.id];
    db.get(sql, params, (err, row) => {
        if (err) {
            res.status(400)
            res.send("database error:" + err.message + row)
            return;
        }
        res.redirect('/admin_user')
    });
})

app.get('/feedback_admin', function (req, res) {
    let sql = "SELECT * from feedback";
    db.all(sql, [], (err, rows) => {
        if (err) {
            req.status(400)
            res.send("database error:" + err.message)
        }
        res.render('feedback_admin', { activePage: "feedback_admin", feedbacks: rows })
    });
})
app.get('/feedback_admin/:id/delete', function (req, res) {
    let sql = "DELETE FROM feedback WHERE id = ?"
    let params = [req.params.id]
    db.get(sql, params, (err, row) => {
        if (err) {
            res.status(400)
            res.send("database error:" + err.message + row)
            return;
        }
        res.redirect('/feedback_admin')
    });
})

app.get('/posts', function (req, res) {
    if (req.session.Admin) {
        let sql = "SELECT * FROM posts"
        db.all(sql, [], (err, rows) => {
            if (err) {
                res.status(400)
                res.send("database error:" + err.message)
                return;
            }
            res.render('posts', { activePage: "posts", posts: rows })
        });
    } else {
        let params = [req.session.userId]
        let sql = "SELECT * FROM posts WHERE id_user = ?"
        db.all(sql, params, (err, rows) => {
            if (err) {
                res.status(400)
                res.send("database error:" + err.message)
                return;
            }
            res.render('posts', { activePage: "posts", posts: rows })
        });
    }
})
app.get('/posts/:id/edit', function (req, res) {
    let sql = "SELECT * FROM posts WHERE id = ?"
    let params = [req.params.id]
    db.get(sql, params, (err, row) => {
        if (err) {
            res.status(400)
            res.send("database error:" + err.message)
            return;
        }
        res.render('edit_post', { post: row, activePage: "posts" })
    });
})
app.get('/new_post', function (req, res) {
    res.render('new_post', { activePage: "new_post" })
})

app.post('/contact', function (req, res) {
    let data = [
        req.body.name,
        req.body.email,
        req.body.message
    ]
    let sql = "INSERT INTO feedback (name, email, body) VALUES (?,?,?)"
    db.run(sql, data, function (err, result) {
        if (err) {
            res.status(400)
            res.send("database error:" + err.message + result)
            return;
        }
        res.render('contact_answer', { activePage: "contact", formData: req.body })
    });
})

app.post('/new_post', function (req, res) {
    if (req.session.loggedIn) {
        let data = [
            req.session.userId,
            req.body.title,
            req.session.userName,
            req.body.category,
            req.body.body,
            req.body.hashtag
        ];
        let sql = "INSERT INTO posts (id_user, title, author, category, body, hashtag) VALUES (?,?,?,?,?,?)";
        db.run(sql, data, function (err, result) {
            if (err) {
                res.status(400)
                res.send("database error:" + err.message + result)
                return;
            }
            res.render('newpost_answer', { activePage: "new_post", formDataPost: req.body })
        });
    }
})
app.post('/posts/:id/edit', function (req, res) {
    let data = [
        req.body.title,
        req.body.author,
        req.body.category,
        req.body.body,
        req.body.hashtag,
        req.params.id
    ];
    db.run(
        `UPDATE posts SET
         title = COALESCE(?,title),
         author = COALESCE(?,author),
         category = COALESCE(?,category),
         body = COALESCE(?,body),
         hashtag = COALESCE(?, hashtag)
         WHERE id = ?`,
        data,
        function (err, result) {
            if (err) {
                res.status(400)
                res.send("database error:" + err.message + result)
                return;
            }
            res.redirect('/posts')
        });
})
app.get('/posts/:id/delete', function (req, res) {
    let sql = "DELETE FROM posts WHERE id = ?"
    let params = [req.params.id]
    db.get(sql, params, (err, row) => {
        if (err) {
            res.status(400)
            res.send("database error:" + err.message + row)
            return;
        }
        res.redirect('/posts')
    });
})

app.get('/posts/:id/show', function (req, res) {
    let sql = "SELECT * FROM posts WHERE id = ?"
    let params = [req.params.id]
    db.get(sql, params, (err, row) => {
        if (err) {
            res.status(400)
            res.send("database error:" + err.message)
            return;
        }
        let sql1 = "SELECT * FROM comment WHERE (id_post = ? AND comment_body IS NOT NULL)"
        db.all(sql1, params, (err, rows) => {
            if (err) {
                res.status(400)
                res.send("database error:" + err.message)
                return;
            }
            res.render("show_post", { activePage: "posts", Post: row, comments: rows, ActiveUser: req.session.userId, error: req.session.Error, Admin: req.session.Admin })
        });
    });
})

app.post('/posts/:id/show/comment', function (req, res) {
    let postid = req.params.id
    if (req.session.loggedIn) {
        let data = [
            req.params.id,
            req.session.userId,
            req.body.comment_author,
            req.body.comment_body
        ]
        let sql = "INSERT INTO comment (id_post, user_id, comment_author, comment_body) VALUES (?,?,?,?)"
        db.run(sql, data, function (err, result) {
            if (err) {
                res.status(400)
                res.send("database error:" + err.message + result)
                return;
            }
            req.session.Error = false
            res.redirect("/posts/" + postid + "/show")
        });
    } else {
        req.session.Error = true
        res.redirect("/posts/" + postid + "/show")
    }
})

app.get('/posts/:id/show/:comment_id/delete', function (req, res) {
    let sql = "DELETE FROM comment WHERE comment_id = ?"
    db.get(sql, [req.params.comment_id], (err, row) => {
        if (err) {
            res.status(400)
            res.send("database error:" + err.message + row)
            return;
        }
        res.redirect('/posts/' + req.params.id + '/show')
    });
})

app.post('/register', function (req, res) {
    let sql1 = "SELECT * FROM user WHERE email = ?"
    let params1 = [req.body.email]
    db.all(sql1, params1, function (err, rows) {
        console.log(rows)
        if (rows == "") {
            bcrypt.hash(req.body.password, 10, function (err, hash) {
                let data = [
                    req.body.name,
                    req.body.email,
                    hash
                ]
                let sql = "INSERT INTO user (name, email, password, failed_login) VALUES (?,?,?, 0)"
                db.run(sql, data, function (err, result) {
                    if (err) {
                        res.status(400)
                        res.send("database error:" + err.message + result)
                        return;
                    }
                    let sql = "SELECT * FROM user WHERE email = ?"
                    db.get(sql, [req.body.email], (err, row) => {
                        req.session.userId = row["user_id"]
                        req.session.userName = row["name"]
                        req.session.loggedIn = true
                        let params = [req.session.userId]
                        sql = "SELECT * FROM posts WHERE id_user = ?"
                        db.all(sql, params, (err, rows) => {
                            if (err) {
                                res.status(400)
                                res.send("database error:" + err.message + rows)
                                return;
                            }
                            res.redirect("/posts")
                        });
                    })
                });
            });
        }
        else {
            res.render('register', { activePage: "register", error: "User with this email address already exists" })
        }
    });
})

app.post('/login', function (req, res) {
    let sql = "SELECT * FROM user WHERE email = ?"
    let params = [req.body.email]
    let error = ""
    db.get(sql, params, (err, row) => {
        if (req.session.userFailed >= 3) {
            error = "Your account is blocked"
            res.render('login', { activePage: "login", error: error })
        }
        else {
            if (err) {
                error = err.message
            }
            if (row === undefined) {
                error = "Wrong email or password"
            }
            if (error !== "") {
                res.render('login', { activePage: "login", error: error })
                return
            }
            bcrypt.compare(req.body.password, row["password"], function (err, hashRes) {
                if (hashRes === false) {
                    if (req.session.userFailed < 3) {
                        req.session.userFailed = row["failed_login"]
                        error = "Wrong email or password"
                        req.session.userFailed += 1
                    }
                    db.run(
                        `UPDATE user SET
                     failed_login = COALESCE(?,failed_login)
                     WHERE user_id = ?`,
                        [req.session.userFailed, row["user_id"]],
                        function (err, result) {
                            if (err) {
                                res.status(400)
                                res.send("database error:" + err.message + result)
                                return 0;
                            }
                        });
                    res.render('login', { activePage: "login", error: error })
                    return
                }
                req.session.userId = row["user_id"]
                req.session.userName = row["name"]
                req.session.loggedIn = true
                db.run(
                    `UPDATE user SET
             failed_login = COALESCE(0,failed_login)
             WHERE user_id = ?`,
                    req.session.userId,
                    function (err, result) {
                        if (err) {
                            res.status(400)
                            res.send("database error:" + err.message + result)
                            return;
                        }
                        res.redirect("/")
                    });
            });
        }
    })
})

app.get('/logout', function (req, res) {
    req.session.userId = null
    req.session.loggedIn = false
    req.session.Admin = false
    res.redirect("/")
})

app.post('/profile', checkAuth, function (req, res) {
    bcrypt.hash(req.body.password, 10, function (err, hash) {
        let data = [
            req.body.name,
            req.body.email,
            hash,
            req.session.userId
        ]
        db.run(
            `UPDATE user SET
         name = COALESCE(?,name),
         email = COALESCE(?,email),
         password = COALESCE(?,password)
         WHERE user_id = ?`,
            data,
            function (err, result) {
                if (err) {
                    res.status(400)
                    res.send("database error:" + err.message + result)
                    return;
                }
                req.session.userId = null
                req.session.loggedIn = false
                res.redirect('/login')
            });
    });
})


app.post('/search', function (req, res) {
    let sql = "SELECT * FROM posts WHERE (UPPER(title) LIKE UPPER('%' || ? || '%') OR UPPER(hashtag) LIKE UPPER('%' || ? || '%'))"
    db.all(sql, [req.body.search, req.body.search], (err, rows) => {
        if (err) {
            res.status(400)
            res.send("database error:" + err.message)
            return;
        }
        req.session.Search = rows
        res.render('search', { activePage: "search", posts: rows })
    });
})
app.post('/search/sort', function (req, res) {
    req.session.Search = req.session.Search.sort(function (a, b) {
        if (req.body.order === 'ASC') {
            if (a[req.body.column] > b[req.body.column]) {
                return 1
            } else {
                return -1
            }
        } else if (req.body.order === 'DESC') {
            if (a[req.body.column] < b[req.body.column]) {
                return 1
            } else {
                return -1
            }
        }
    })
    res.render('search', { activePage: "search", posts: req.session.Search })
})

const port = parseInt(process.env.PORT) || 8080;
app.listen(port, () => {
    console.log(`SocialWEB: listening on port ${port}`);
});
