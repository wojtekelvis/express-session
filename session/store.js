/**
 * Created by Wojtek on 2017-02-19.
 */

const EventEmitter = require('events').EventEmitter;
const uid = require('uid-safe').sync;
const helpers = require('./helpers');

function setExpires (expires) {
    "use strict";
    return (typeof expires === 'number')
        ? Date.now() + expires
        : expires;
}

class Store extends EventEmitter {
    constructor () {
        super();
    }
    
    generateSession (req, options, prevSession) {
        const session = {
            id: !prevSession ? uid(24) : prevSession.id,
            expires: setExpires(options.expires)
        };
        
        if (typeof prevSession === 'object' && prevSession !== null) {
            for (const prop in prevSession) {
                if (prevSession.hasOwnProperty(prop) && !(prop in session)) {
                    session[prop] = prevSession[prop];
                }
            }
        }
        
        helpers.setObjProp(req, 'session', session);
        
        return req.session;
    }
    
    regenerate (req, options, fn) {
        this.destroy(req.session.id, (err) => {
            this.generateSession(req, options);
            fn(err);
        });
    }
}

module.exports = Store;
