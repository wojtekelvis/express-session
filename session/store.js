/**
 * Created by Wojtek on 2017-02-19.
 */

const EventEmitter = require('events').EventEmitter;
const helpers = require('./helpers');

class Store extends EventEmitter {
    constructor () {
        super();
    }
    
    generateSession (req, expires, prevSession) {
        if (!req.session) {
            helpers.setObjProp(req, 'session', {});
        }
    
        req.session.id = !prevSession ? helpers.getSid() : prevSession.id;
        req.session.lastActiv = Date.now();
        req.session.expires = expires;
        
        if (typeof prevSession === 'object' && prevSession !== null) {
            for (const prop in prevSession) {
                if (prevSession.hasOwnProperty(prop) && !(prop in req.session)) {
                    req.session[prop] = prevSession[prop];
                }
            }
        }
        
        return req.session;
    }
    
    regenerateSession (req, expires, fn) {
        if (req.session) {
            return this.destroy(req.session.id, (err) => {
                for (let prop in req.session) {
                    if (req.session.hasOwnProperty(prop)) {
                        delete req.session[prop];
                    }
                }
        
                this.generateSession(req, expires);
                return fn(err);
            });
        } else {
            this.generateSession(req, expires);
            return fn(null);
        }
    }
}

module.exports = Store;
