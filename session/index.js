/**
 * Created by Wojtek on 2017-02-19.
 */

const merge = require('merge');
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
    const opts = merge.recursive(true, def, options || {});
    
    if (!opts.store) {
        opts.store = new MemoryStore();
    }
    
    const store = opts.store;
    
    if (!opts.secret) {
        throw new TypeError('secret option must be a string');
    }
    
    const storeImplementsTouch = typeof store.touch === 'function';
    let storeReady = true;
    let originalId; /* value of session ID after loaded from store or generated */
    let originalHash; /* value of crc of session object after loaded from store */
    let savedHash; /* value of crc of session object after saved or same as originalHash when resave == false */
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
        
        function generate (sess) {
            store.generateSession(req, opts, sess);
            originalId = req.session.id;
            originalHash = helpers.hash(req.session);
            
            return originalId;
        }
    
        function isModified () {
            return originalId !== req.session.id || originalHash !== currentHash;
        }
    
        function isSaved () {
            return originalId === req.session.id && savedHash === currentHash;
        }
    
        function shouldSave () {
            return cookieId !== req.session.id && !opts.saveUninitialized
                ? isModified()
                : !isSaved()
        }
    
        function shouldTouch() {
            return cookieId === req.session.id;
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
    
                generate(sess || { id: cookieId });
    
                /* avoid saving session on END handler */
                if (!opts.resave) {
                    savedHash = originalHash
                }
                
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
