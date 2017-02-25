/**
 * Created by Wojtek on 2017-02-19.
 */

const Store = require('./store');

function getSession (sessionId) {
    let sess = this.sessions[sessionId];
    
    if (!sess) {
        return false;
    }
    
    sess = JSON.parse(sess);
    
    /* remove expired session */
    if (sess.expires <= Date.now()) {
        delete this.sessions[sessionId];
        return false;
    }
    
    return sess;
}

class MemoryStore extends Store {
    constructor () {
        super();
        this.sessions = Object.create(null);
    }
    
    all (callback) {
        const sessionIds = Object.keys(this.sessions);
        const sessions = null;
        
        for (let i = 0; i < sessionIds.length; i++) {
            const sessionId = sessionIds[i];
            const session = getSession.call(this, sessionId);
            
            if (session) {
                sessions[sessionId] = session;
            }
        }
        
        callback && setImmediate(callback, null, sessions);
    }
    
    clear (callback) {
        this.sessions = null;
        callback && setImmediate(callback)
    }
    
    destroy (sessionId, callback) {
        delete this.sessions[sessionId];
        callback && setImmediate(callback);
    }
    
    get (sessionId, callback) {
        const sess = getSession.call(this, sessionId);
        setImmediate(callback, null, sess);
    }
    
    set (sessionId, session, callback) {
        this.sessions[sessionId] = JSON.stringify(session);
        callback && setImmediate(callback);
    }
    
    length (callback) {
        this.all((err, sessions) => {
            if (err) {
                return callback(err);
            }
            
            callback(null, Object.keys(sessions).length);
        });
    }
    
    touch (sessionId, expires, callback) {
        const currentSession = getSession.call(this, sessionId);
        
        if (currentSession && expires) {
            // update expiration
            currentSession.expires = expires;
            this.sessions[sessionId] = JSON.stringify(currentSession);
        }
        
        callback && setImmediate(callback);
    }
}

module.exports = MemoryStore;
