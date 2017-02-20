/**
 * Created by Wojtek on 2017-02-18.
 */

const express = require('express');
const session = require('express-session');
const http = require('http');
//const session = require('./session/session');


const app = express();

const sessionParams = {
    resave: true,
    rolling: false,
    name: "dupa",
    saveUninitialized: true,
    secret: "dupaaaa",
    unset: "keep",
    cookie: {
        maxAge: false,
        //originalMaxAge: 1800000,
        httpOnly: true
    }
};

/*const sessionParams = {
    expire: 900000, // false
    resave: true,
    rolling: false,
    name: "dupa",
    saveUninitialized: true,
    secret: "dupaaaa",
    unset: "keep",
    cookie: {
        maxAge: false,
        //originalMaxAge: 1800000,
        httpOnly: true
    }
};*/

app.use(session(sessionParams));

app.use(function (req, res, next) {
    "use strict";
    
    let reqEnd = res.end;
    
    res.end = function (chunk, encoding) {
        console.log("dupa");
    
        reqEnd.call(res, chunk, encoding);
    };
    
    next();
});

app.get("/", function (req, res, next) {
    "use strict";
    
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
    
    res.json({err: err.message});
});



http.createServer(app)
    .listen(3000)
    .on('error', function (err) {
        "use strict";
        console.log(err);
    })
    .on('listening', function () {
        "use strict";
        console.log("on port 3000");
    });