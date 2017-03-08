/**
 * Created by Wojtek on 2017-02-24.
 */

const debug = require('debug')('session');
const crc = require('crc').crc32;
const cookie = require('cookie');
const signature = require('cookie-signature');
const merge = require('merge');
const uid = require('uid-safe').sync;

class Helpers {
    merge () {
        return merge.recursive(true, ...arguments);
    }
    
    getSid () {
        return uid(24);
    }
    
    isActive (session) {
        return session.expires
            ? (session.expires + session.lastActiv) > Date.now()
            : true;
    }
    
    getSession (sessions, sessionId) {
        let sess = sessions[sessionId];
        
        if (!sess) {
            return undefined;
        }
        
        try {
            sess = JSON.parse(sess);
        } catch (e) {
            sess = undefined;
        }
        
        return sess;
    }
    
    hash (sess) {
        return crc(JSON.stringify(sess, function (key, val) {
            if (this === sess && key === 'expires') {
                return;
            }
            
            return val;
        }));
    }
    
    setObjProp (source, key, value) {
        Object.defineProperty(source, key, {
            configurable: false,
            enumerable: false,
            value: value,
            writable: false
        });
        
        return source;
    }
    
     getCookie (req, name, secrets) {
        const header = req.headers.cookie;
        let val;
        
        if (header) {
            const cookies = cookie.parse(header);
            const raw = cookies[name];
            
            if (raw && raw.substr(0, 2) === 's:') {
                val = this.unSignCookie(raw.slice(2), secrets);

                if (val === false) {
                    val = undefined;
                }
            }
        }
        
        return val;
    }
    
    setCookie (res, val, params) {
        const signed = 's:' + signature.sign(val, params.secret);
        const data = cookie.serialize(params.name, signed, params.cookie);
        const prev = res.getHeader('set-cookie') || [];
        const header = Array.isArray(prev)
            ? prev.concat(data)
            : [prev, data];
        
        res.setHeader('set-cookie', header);
    }

    unSignCookie (val, secret) {
        const result = signature.unsign(val, secret);

        if (!result) {
            return false;
        }

        return result;
    }
}

module.exports = new Helpers();
