/**
 * Created by Wojtek on 2017-02-19.
 */

const cookie = require('cookie');
const signature = require('cookie-signature');
const merge = require('merge');
const crc = require('crc').crc32;
const debug = require('debug')('session');

const MemoryStore = require('./memory');

module.exports = session;

function session(options) {
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
    let touched = false;
    let originalHash;
    let originalId;
    let savedHash;
    
    store
        .on('disconnect', function onDisconnect() {
            storeReady = false
        })
        .on('connect', function onConnect() {
            storeReady = true
        });
    
    return function session (req, res, next) {
        if (req.session) {
            return next();
        }
    
        if (!storeReady) {
            debug('store is disconnected');
            return next();
        }
    
        req.sessionStore = store;
    
        const cookieId = req.sessionID = helpers.getCookie(req, opts.name, opts.secret);
    
        const _end = res.end;
        res.end = function end (chunk, encoding) {
            function shouldSave () {
                return !opts.saveUninitialized && cookieId !== req.sessionID
                    ? isModified(req.session)
                    : !isSaved(req.session)
            }
    
            function shouldTouch() {
                return cookieId === req.sessionID && !shouldSave();
            }
    
            function isModified (sess) {
                return originalId !== sess.id || originalHash !== helpers.hash(sess);
            }
    
            function isSaved (sess) {
                return originalId === sess.id && savedHash === helpers.hash(sess);
            }
    
            function saveSession (sess) {
                savedHash = helpers.hash(sess);
                store.set(this, arguments);
            }
            
            if (!req.sessionID && !req.session) {
                return _end.call(res, chunk, encoding);
            }
            
            /* check if session should be destroyed */
            if ((req.sessionID && !req.session) || (!req.sessionID && req.session)) {
                const id = req.sessionID || req.session.id;
                
                return store.destroy(id, function onDestroy (err) {
                    if (err) {
                        return next(err);
                    }
                    
                    return _end.call(res, chunk, encoding);
                });
            }
    
            if (!touched && storeImplementsTouch) {
                store.touch(req.session.id, );
                touched = true;
            }
            
            
            if (typeof req.sessionID === 'string') {
                savedHash = helpers.hash(req.session);
                
                /* should session be saved */
                if (shouldSave()) {
                    
                } else if (storeImplementsTouch && shouldTouch()) {
                    
                }
                
                /* should session be touched */
                
                
            }
            
            return _end.call(res, chunk, encoding);
        };
        
        /* missing session ID from browser req */
        if (!req.sessionID) {
            store.generateSession(req, opts);
            originalId = req.sessionID;
            originalHash = helpers.hash(req.session);
            
            helpers.setCookie(res, req.sessionID, opts);
            
            return next();
        } else {
            return store.get(req.sessionID, function getSession (err, sess) {
                if (err && err.code !== 'ENOENT') {
                    return next(err);
                }
    
                if (sess) {
                    store.loadSession(req, sess);
                    originalId = req.sessionID;
                    originalHash = helpers.hash(sess);
    
                    if (!opts.resave) {
                        savedHash = originalHash
                    }
                } else {
                    /* if there is no session or eny other errors */
                    store.generateSession(req, opts);
                    originalId = req.sessionID;
                    originalHash = helpers.hash(sess);
                }
                
                return next();
            });
        }
    };
}

const helpers = {
    hash: function (sess) {
        return crc(JSON.stringify(sess, function (key, val) {
            if (this === sess && key === 'expires') {
                return;
            }
    
            return val;
        }));
    },
    getCookie: function (req, name, secrets) {
        const header = req.headers.cookie;
        let raw;
        let val;
        
        // read from cookie header
        if (header) {
            const cookies = cookie.parse(header);
            
            raw = cookies[name];
            
            if (raw) {
                if (raw.substr(0, 2) === 's:') {
                    val = this.unSignCookie(raw.slice(2), secrets);
                    
                    if (val === false) {
                        debug('cookie signature invalid');
                        val = undefined;
                    }
                } else {
                    debug('cookie unsigned')
                }
            }
        }
        
        return val;
    },
    
    setCookie: function (res, val, params) {
        const signed = 's:' + signature.sign(val, params.secret);
        const data = cookie.serialize(params.name, signed, params.cookie);
        
        debug('set-cookie %s', data);
        
        const prev = res.getHeader('set-cookie') || [];
        const header = Array.isArray(prev)
            ? prev.concat(data)
            : [prev, data];
        
        res.setHeader('set-cookie', header);
    },
    
    unSignCookie: function (val, secret) {
        const result = signature.unsign(val, secret);
        if (!result) {
            return false;
            
        }
    
        return result;
    }
};
