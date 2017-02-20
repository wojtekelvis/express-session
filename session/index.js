/**
 * Created by Wojtek on 2017-02-19.
 */

const cookie = require('cookie');
const signature = require('cookie-signature');
const merge = require('merge');
const crc = require('crc').crc32;
const parseUrl = require('parseurl');
const onHeaders = require('on-headers');
const debug = require('debug')('session');

const MemoryStore = require('./memory');

module.exports = session;

function session(options) {
    "use strict";
    
    const def = {
        expire: false,
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
    
    return function session(req, res, next) {
        if (req.session) {
            return next();
        }
    
        if (!storeReady) {
            debug('store is disconnected');
            return next();
        }
    
        req.sessionStore = store;
    
        const cookieId = req.sessionID = helpers.getCookie(req, opts.name, opts.secret);
        
        if (!req.sessionID) {
            store.generateSession(req, opts);
            helpers.setCookie(res, req.sessionID, opts);
    
            originalId = req.sessionID;
            originalHash = helpers.hash(req.session);
        }
        
        
    }
}

const helpers = {
    hash: function (sess) {
        return crc(JSON.stringify(sess));
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
