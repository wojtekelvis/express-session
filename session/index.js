/**
 * Created by Wojtek on 2017-02-19.
 */

const debug = require('debug')('session');
const MemoryStore = require('./memory');
const helpers = require('./helpers');

function session (options) {
    "use strict";
    
    const def = {
        expires: false,
        cookie: {
            path: "/",
            maxAge: null,
            httpOnly: true,
            originalMaxAge: null,
            secure: true
        },
        name: "connect.sid",
        resave: false,
        rolling: false,
        saveUninitialized: false,
        secret: null
    };
    const opts = helpers.merge(def, options || {});
    
    if (!opts.store) {
        opts.store = new MemoryStore();
    }
    
    const store = opts.store;
    
    if (!opts.secret) {
        throw new TypeError('secret option must be a string');
    }
    
    const storeImplementsTouch = typeof store.touch === 'function';
    let storeReady = true;
    let originalHash; /* value of crc of session object after loaded from store */
    let currentHash;
    
    store
        .on('disconnect', function onDisconnect() {
            storeReady = false
        })
        .on('connect', function onConnect() {
            storeReady = true
        });
    
    return function session (req, res, next) {
        /* cookieID -> value of the loaded from session cookie ID */
        const cookieId = helpers.getCookie(req, opts.name, opts.secret);
        
        function setOrigin() {
            originalHash = helpers.hash(req.session);
    
            /* avoid saving session on END handler */
            if (!opts.resave) {
                currentHash = originalHash;
            }
        }
        
        function generate (sess) {
            store.generateSession(req, opts.expires, sess);
            setOrigin();
            
            return req.session.id;
        }
    
        function isModified () {
            return cookieId !== req.session.id || originalHash !== currentHash;
        }
    
        function isSaved () {
            return cookieId === req.session.id && originalHash === currentHash;
        }
    
        function shouldSave () {
            return cookieId !== req.session.id && !opts.saveUninitialized
                ? isModified()
                : !isSaved()
        }
    
        function shouldTouch() {
            return cookieId === req.session.id && req.session.expires;
        }
    
        function shouldSetCookie () {
            return cookieId !== req.session.id
                ? opts.saveUninitialized || isModified()
                : opts.rolling;
        }
        
        if (req.session) {
            return next();
        }
    
        if (!storeReady) {
            debug('store is disconnected');
            return next();
        }
    
        helpers.setObjProp(req, 'sessionStore', store);
    
        /* BEGIN - PROXY END HANDLER */
        const _end = res.end;
        res.end = function end (chunk, encoding) {
            
            function setResponse (withoutCookie) {
                if (!withoutCookie && shouldSetCookie()) {
                    helpers.setCookie(res, req.session.id, opts);
                }
                
                return _end.call(res, chunk, encoding);
            }
            
            /* something really wrong happened */
            if (!req.session || !req.session.id) {
                return setResponse(true);
            }
            
            if (typeof req.session.id === 'string') {
                currentHash = helpers.hash(req.session);
                
                if (shouldSave()) {
                    return store.set(req.session.id, req.session, function onSave () {
                        
                        return setResponse();
                    });
                } else if (storeImplementsTouch && shouldTouch()) {
                    return store.touch(req.session.id, opts.expires, function onTouch () {
                        
                        return setResponse();
                    });
                }
            }
    
            return setResponse();
        };
        /* END - PROXY END HANDLER */
        
        if (cookieId) {
            return store.get(cookieId, function getSession (err, sess) {
                if (err && err.code !== 'ENOENT') {
                    return next(err);
                }
    
                /* check if session is expired, then change session ID */
                if (sess) {
                    if (helpers.isActive(sess)) {
                        generate(sess);
                        
                        return next();
                    } else {
                        return store.regenerateSession(req, opts.expires, function onRegenerate () {
                            setOrigin();
        
                            return next();
                        });
                    }
                }
          
                generate({ id: cookieId });
                
                return next();
            });
        }
    
        /* missing session ID from browser req */
        let sessionID = generate();
        
        if (shouldSetCookie()) {
            /* set cookie here to allow application consume it before END handler */
            helpers.setCookie(res, sessionID, opts);
        }
    
        return next();
    };
}

module.exports = session;
