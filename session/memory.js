/**
 * Created by Wojtek on 2017-02-19.
 */

const Store = require('./store');
const helpers = require('./helpers');

class MemoryStore extends Store {
    constructor () {
        super();
        this.sessions = Object.create(null);
        
        /* compaction */
        setInterval(() => {
            this.allInactive((err, sessions) => {
                console.log('compacting ', sessions);
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
        delete this.sessions[sessionId];
        callback && setImmediate(callback);
    }
    
    get (sessionId, callback) {
        const sess = helpers.getSession(this.sessions, sessionId);
        setImmediate(callback, null, sess);
    }
    
    set (sessionId, session, callback) {
        this.sessions[sessionId] = JSON.stringify(session);
        callback && setImmediate(callback);
    }
    
    touch (sessionId, expires, callback) {
        const currentSession = helpers.getSession(this.sessions, sessionId);
        
        if (currentSession) {
            // update expiration
            currentSession.expires = helpers.setExpires(expires);
            this.sessions[sessionId] = JSON.stringify(currentSession);
        }
        
        callback && setImmediate(callback);
    }
}

module.exports = MemoryStore;
