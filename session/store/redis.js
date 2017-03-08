/**
 * Created by Wojtek on 2017-03-02.
 */

const debug = require('debug')('session');
const redis = require('redis');
const Store = require('./../store');
const helpers = require('./../helpers');

class RedisStore extends Store {
    constructor (config) {
        super();
        this.sessions = Object.create(null);

        const client = this.client = redis.createClient({
            host: config.host,
            port: config.port,
            retry_strategy: function (options) {
                if (options.error && options.error.code === 'ECONNREFUSED') {
                    // End reconnecting on a specific error and flush all commands with a individual error
                    return new Error('The server refused the connection');
                }
                if (options.total_retry_time > 1000 * 60) {
                    // End reconnecting after a specific timeout and flush all commands with a individual error
                    return new Error('Retry time exhausted');
                }
                if (options.times_connected > 100) {
                    // End reconnecting with built in error
                    return undefined;
                }
                // reconnect after
                return Math.min(options.attempt * 100, 3000);
            }
        });

        client.on('error', (err) => {
            debug("Redis error:", err);
            this.emit('disconnect');
        });
        
        client.on('connect', () => {
            this.emit('connect');
        });
    
        client.on('reconnecting', () => {
            this.emit('disconnect');
        });
    
        client.on('end', () => {
            this.emit('disconnect');
        });
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

    touch (sessionId, callback) {
        const currentSession = helpers.getSession(this.sessions, sessionId);

        if (currentSession && helpers.isActive(currentSession)) {
            // update session activity
            currentSession.lastActiv = Date.now();
            this.sessions[sessionId] = JSON.stringify(currentSession);
        }

        callback && setImmediate(callback);
    }
}

module.exports = RedisStore;
