/**
 * Created by Wojtek on 2017-02-19.
 */

const debug = require('debug')('session');
const MemoryStore = require('./store/memory');
const helpers = require('./helpers');

function getStore (opts) {
    const Store = require('./store/' + opts.store);
    return new Store(opts.storeConfig);
}

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
        secret: null,
        store: "memory",
        storeConfig: {
            host: "localhost",
            port: "6379"
        }
    };
    const opts = helpers.merge(def, options || {});
    
    if (!opts.store) {
        debug('Using default store as MemoryStore');
        opts.store = new MemoryStore();
    } else {
        opts.store = getStore(opts);
    }
    
    const store = opts.store;
    
    if (!opts.secret) {
        throw new TypeError('secret option must be a string');
    }
    
    const storeImplementsTouch = typeof store.touch === 'function';
    let storeReady = true;
    let originalHash; /* value of crc of session object after loaded from store */
    let currentHash;
    let cookieId;
    let sessionId;
    
    store
        .on('disconnect', function onDisconnect() {
            debug('disconnected from store');
            storeReady = false
        })
        .on('connect', function onConnect() {
            debug('connected to store');
            storeReady = true
        });
    
    return function session (req, res, next) {
        /* cookieID -> value of the loaded from session cookie ID */
        cookieId = helpers.getCookie(req, opts.name, opts.secret);
        
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
            return cookieId === sessionId
                && cookieId === req.session.id
                && originalHash === currentHash;
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
            debug('Store is disconnected...');
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
    
                debug('end.');
                
                return _end.call(res, chunk, encoding);
            }
            
            /* something really wrong happened */
            if (!req.session || !req.session.id) {
                debug('Missing session property inside req');
                return setResponse(true);
            }
            
            if (typeof req.session.id === 'string') {
                currentHash = currentHash || helpers.hash(req.session);
                
                if (shouldSave()) {
                    return store.set(req.session.id, req.session, function onSave (err) {
                        if (err && err.code !== 'ENOENT') {
                            return next(err);
                        }
                        
                        return setResponse();
                    });
                } else if (storeImplementsTouch && shouldTouch()) {
                    return store.touch(req.session.id, function onTouch (err) {
                        if (err && err.code !== 'ENOENT') {
                            return next(err);
                        }
                        
                        return setResponse();
                    });
                }
    
                debug('Exit without saving');
    
                return setResponse();
            }

            debug('session ID in wrong format');
    
            return setResponse();
        };
        /* END - PROXY END HANDLER */
        
        if (cookieId) {
            debug('Found cookie ID');
            
            return store.get(cookieId, function getSession (err, sess) {
                if (err && err.code !== 'ENOENT') {
                    return next(err);
                }
    
                /* check if session is expired, then change session ID */
                if (sess) {
                    debug('Found session');
                    
                    if (helpers.isActive(sess)) {
                        sessionId = sess.id;
                        generate(sess);
                        
                        return next();
                    } else {
                        debug('Session ID was found but is already expired');
                        return store.regenerateSession(req, sess.expires, function onRegenerate () {
                            setOrigin();
        
                            return next();
                        });
                    }
                }

                debug('Session ID was not found in store');
                generate({ id: cookieId });
                
                return next();
            });
        }

        debug('Missing session ID from cookie');
        generate();
    
        return next();
    };
}

module.exports = session;
