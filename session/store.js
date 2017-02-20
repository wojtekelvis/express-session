/**
 * Created by Wojtek on 2017-02-19.
 */

const EventEmitter = require('events').EventEmitter;
const uid = require('uid-safe').sync;
const util = require('util');

const cookie = require('./cookie');

module.exports = Store;

function Store () {
    EventEmitter.call(this);
}

util.inherits(Store, EventEmitter);

Store.prototype.generateSession = (req, options, data) => {
    req.sessionID = uid(24);
    req.sessionExpire = (typeof options.expire === 'number')
        ? Date.now() + options.expire
        : options.expire;
    
    this.loadSession(req, data);
};

Store.prototype.loadSession = (req, data) => {
    req.session = {
        id: req.sessionID,
        req
    };
    
    if (typeof data === 'object' && data !== null) {
        for (const prop in data) {
            if (data.hasOwnProperty(prop) && !(prop in req.session)) {
                req.session[prop] = data[prop];
            }
        }
    }
    
    return req.session;
};

Store.prototype.regenerate = (req, fn) => {
    this.destroy(req.sessionID, (err) => {
        this.generate(req);
        fn(err);
    });
};

Store.prototype.load = (sid, fn) => {
    this.get(sid, (err, sess) => {
        if (err || !sess) {
            return fn(err || undefined);
        }
        
        const req = {
            sessionID: sid,
            sessionStore: this
        };
        
        fn(null, this.createSession(req, sess));
    });
};
