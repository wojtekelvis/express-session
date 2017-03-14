/**
 * Created by Wojtek on 2017-02-19.
 */

const debug = require('debug')('session');
const EventEmitter = require('events').EventEmitter;
const helpers = require('./helpers');

class Store extends EventEmitter {
    constructor (expiration) {
        super();
        this.defaultExpiration = expiration;
    }
    
    generate (req, prevSession) {
        debug("Generating session with expires");
        
        if (!req.session) {
            helpers.setObjProp(req, 'session', {});
        }
    
        req.session.id = !prevSession ? helpers.getSid() : prevSession.id;
        req.session.lastActiv = Date.now();
        req.session.expires = helpers.setExpire(this.defaultExpiration, prevSession);
        
        if (typeof prevSession === 'object' && prevSession !== null) {
            for (const prop in prevSession) {
                if (prevSession.hasOwnProperty(prop) && !(prop in req.session)) {
                    req.session[prop] = prevSession[prop];
                }
            }
        }
        
        return req.session;
    }
    
    regenerate (req, fn) {
        debug("Regenerating session");

        if (req.session) {
            return this.destroy(req.session.id, (err) => {
                for (let prop in req.session) {
                    if (req.session.hasOwnProperty(prop)) {
                        delete req.session[prop];
                    }
                }
        
                this.generate(req);
                return fn(err);
            });
        } else {
            this.generate(req);
            return fn(null);
        }
    }
}

module.exports = Store;
