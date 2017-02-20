/**
 * Created by Wojtek on 2017-02-19.
 */

const Store = require('./store');
const util = require('util');

module.exports = MemoryStore;

function MemoryStore() {
    Store.call(this);
    this.sessions = null;
}

util.inherits(MemoryStore, Store);

const getSession = (sessionId) => {
    let sess = this.sessions[sessionId];
    
    if (!sess) {
        return;
    }
    
    sess = JSON.parse(sess);
    
    // destroy expired session
    if (sess.expires <= Date.now()) {
        delete this.sessions[sessionId];
        return;
    }
    
    return sess;
};

MemoryStore.prototype.all = (callback) => {
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
};

MemoryStore.prototype.clear = (callback) => {
    this.sessions = null;
    callback && setImmediate(callback)
};

MemoryStore.prototype.destroy = (sessionId, callback) => {
    delete this.sessions[sessionId];
    callback && setImmediate(callback);
};

MemoryStore.prototype.get = (sessionId, callback) => {
    setImmediate(callback, null, getSession.call(this, sessionId));
};

MemoryStore.prototype.set = (sessionId, session, callback) => {
    this.sessions[sessionId] = JSON.stringify(session);
    callback && setImmediate(callback);
};

MemoryStore.prototype.length = (callback) => {
    this.all((err, sessions) => {
        if (err) {
            return callback(err);
        }
        
        callback(null, Object.keys(sessions).length);
    });
};

MemoryStore.prototype.touch = (sessionId, session, callback) => {
    const currentSession = getSession.call(this, sessionId);
    
    if (currentSession) {
        // update expiration
        currentSession.expires = session.expires;
        this.sessions[sessionId] = JSON.stringify(currentSession);
    }
    
    callback && setImmediate(callback);
};

