/**
 * Created by Wojtek on 2017-03-02.
 */

const debug = require('debug')('session');
const redis = require('redis');
const Store = require('./../store');
const helpers = require('./../helpers');

class RedisStore extends Store {
    constructor (config, expiration) {
        super(expiration);
        this.sessions = Object.create(null);
        this.prefix = "sessionID:";

        const redisSettings = helpers.merge({
            retry_strategy: function (options) {
                debug("Store Redis settings:", options);

                // reconnect after
                return Math.min(options.attempt * 100, 3000);
            }
        }, config);

        const client = this.client = redis.createClient(redisSettings);

        client.on('error', (err) => {
            debug("Store Redis error:", err);
            this.emit('disconnect');
        });
        
        client.on('connect', () => {
            debug("Store Redis connected");
            this.emit('connect');
        });
    
        client.on('reconnecting', () => {
            debug("Store Redis reconnecting");
            this.emit('disconnect');
        });
    
        client.on('end', (err) => {
            debug("Store Redis disconnecting ", err);
            this.emit('disconnect');
        });
    }
    
    destroy (sessionId, callback) {
        debug("Store Redis destroy session: " + sessionId);

        this.client.del(this.prefix + sessionId, (err) => {
            callback && setImmediate(callback, err);
        });
    }

    get (sessionId, callback) {
        debug("Store Redis get session: " + sessionId);
        
        this.client.get(this.prefix + sessionId, (err, reply) => {
            callback && setImmediate(callback, err, reply && JSON.parse(reply));
        });
    }

    set (sessionId, session, callback) {
        debug("Store Redis set session: " + sessionId, session);
        session.lastActiv = Date.now();
        
        const sess = JSON.stringify(session);
        const setCallback = (err, reply) => {
            callback && setImmediate(callback, err, reply);
        };
        
        if (session.expires) {
            return this.client.psetex(this.prefix + sessionId, session.expires, sess, setCallback);
        }
    
        this.client.set(this.prefix + sessionId, sess, setCallback);
    }

    touch (sessionId, session, callback) {
        debug("Store Redis touch session: " + sessionId);

        this.client.pexpire(this.prefix + sessionId, session.expires, (err, reply) => {
            callback && setImmediate(callback, err, reply);
        });
    }
}

module.exports = RedisStore;
