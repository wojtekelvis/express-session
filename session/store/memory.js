/**
 * Created by Wojtek on 2017-02-19.
 */

const debug = require('debug')('session');
const Store = require('./../store');
const helpers = require('./../helpers');

class MemoryStore extends Store {
    constructor () {
        super();
        this.sessions = Object.create(null);
        
        /* compaction */
        setInterval(() => {
            this.allInactive((err, sessions) => {
                debug('Store memory: compacting ', sessions);
                for (const elem in sessions) {
                    if (sessions.hasOwnProperty(elem)) {
                        this.sessions[sessions[elem]] = null;
                        delete this.sessions[sessions[elem]];
                    }
                }
            });
        }, 60000);
    }
    
    allInactive (callback) {
        const sessionIds = Object.keys(this.sessions);
        const sessions = [];
        
        for (let i = 0; i < sessionIds.length; i++) {
            const sessionId = sessionIds[i];
            const session = helpers.getSession(this.sessions, sessionId);
            
            if (session && !helpers.isActive(session)) {
                sessions.push(sessionId);
            }
        }
        
        callback && setImmediate(callback, null, sessions);
    }
    
    destroy (sessionId, callback) {
        debug('Store memory: destroy ' + sessionId);
        delete this.sessions[sessionId];
        callback && setImmediate(callback);
    }
    
    get (sessionId, callback) {
        debug('Store memory: get ' + sessionId);
        const sess = helpers.getSession(this.sessions, sessionId);
        setImmediate(callback, null, sess);
    }
    
    set (sessionId, session, callback) {
        debug('Store memory: set ' + sessionId, session);
        this.sessions[sessionId] = JSON.stringify(session);
        callback && setImmediate(callback);
    }
    
    touch (sessionId, callback) {
        debug('Store memory: touch ' + sessionId);
        
        const currentSession = helpers.getSession(this.sessions, sessionId);
        
        if (currentSession && helpers.isActive(currentSession)) {
            // update session activity
            currentSession.lastActiv = Date.now();
            this.sessions[sessionId] = JSON.stringify(currentSession);
        }
        
        callback && setImmediate(callback);
    }
}

module.exports = MemoryStore;
