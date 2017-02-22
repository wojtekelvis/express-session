/**
 * Created by Wojtek on 2017-02-19.
 */

const EventEmitter = require('events').EventEmitter;
const uid = require('uid-safe').sync;
const util = require('util');

module.exports = Store;

function Store () {
    EventEmitter.call(this);
}

util.inherits(Store, EventEmitter);

Store.prototype.generateSession = (req, options, data) => {
    options = options || {};
    req.sessionID = uid(24);
    req.sessionExpire = (typeof options.expire === 'number')
        ? Date.now() + options.expire
        : options.expire;
    
    this.loadSession(req, data);
};

Store.prototype.loadSession = (req, data) => {
    req.session = {
        id: req.sessionID,
        expires: req.sessionExpire,
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

Store.prototype.regenerate = (req, options, fn) => {
    this.destroy(req.sessionID, (err) => {
        this.generateSession(req, options);
        fn(err);
    });
};
