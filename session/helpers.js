/**
 * Created by Wojtek on 2017-02-24.
 */

const crc = require('crc').crc32;
const cookie = require('cookie');
const signature = require('cookie-signature');

const helpers = {
    hash: function (sess) {
        return crc(JSON.stringify(sess, function (key, val) {
            if (this === sess && key === 'expires') {
                return;
            }
            
            return val;
        }));
    },
    
    setObjProp: function (source, key, value) {
        "use strict";
        Object.defineProperty(source, key, {
            configurable: false,
            enumerable: false,
            value: value,
            writable: false
        });
        
        return source;
    },
    
    getCookie: function (req, name, secrets) {
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
    },
    
    setCookie: function (res, val, params) {
        const signed = 's:' + signature.sign(val, params.secret);
        const data = cookie.serialize(params.name, signed, params.cookie);
        const prev = res.getHeader('set-cookie') || [];
        const header = Array.isArray(prev)
            ? prev.concat(data)
            : [prev, data];
        
        res.setHeader('set-cookie', header);
    },
    
    unSignCookie: function (val, secret) {
        const result = signature.unsign(val, secret);
        
        if (!result) {
            return false;
        }
        
        return result;
    }
};

module.exports = helpers;