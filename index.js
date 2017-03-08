/**
 * Created by Wojtek on 2017-02-18.
 */

const express = require('express');
//const session = require('express-session');
const http = require('http');
const session = require('./session/index');

const app = express();

// const sessionParams = {
//     resave: false,
//     rolling: false,
//     name: "dupa",
//     saveUninitialized: true,
//     secret: "dupaaaa",
//     unset: "keep",
//     cookie: {
//         maxAge: 60000,
//         //originalMaxAge: 1800000,
//         httpOnly: true
//     }
// };

const sessionParams = {
    expires: false, // false
    resave: false,
    rolling: false,
    name: "dupa",
    saveUninitialized: false,
    secret: "dupaaaa",
    cookie: {
        secure: false
    }
};

app.use(session(sessionParams));

app.get("/", function (req, res, next) {
    "use strict";

    console.log(req.session.expires);
    req.session.expires = 60000;
    res.json({view: req.session.view});
});

app.get("/kaka", function (req, res, next) {
    "use strict";
    
    req.session.view ?
        req.session.view++ :
        req.session.view = 1;
    
    res.json({view: req.session.view});
});

app.use(function (err, req, res, next) {
    "use strict";
    
    console.log(err);
    res.json({err: err.stack});
});

http.createServer(app)
    .listen(3003)
    .on('error', function (err) {
        "use strict";
        console.log(err);
    })
    .on('listening', function () {
        "use strict";
        console.log("on port 3003");
    });