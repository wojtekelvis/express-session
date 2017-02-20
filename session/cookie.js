/**
 * Created by Wojtek on 2017-02-19.
 */

const cookie = require('cookie');
const signature = require('cookie-signature');
const merge = require('merge');
const debug = require('debug')('session');

module.exports = (function () {
    "use strict";
    
    const cookieHelper = {
        create: function (options) {
            
            
        },
        getCookie: function (req, name, secrets) {
            const header = req.headers.cookie;
            let raw;
            let val;
            
            // read from cookie header
            if (header) {
                const cookies = cookie.parse(header);
                
                raw = cookies[name];
                
                if (raw) {
                    if (raw.substr(0, 2) === 's:') {
                        val = this.unSignCookie(raw.slice(2), secrets);
                        
                        if (val === false) {
                            debug('cookie signature invalid');
                            val = undefined;
                        }
                    } else {
                        debug('cookie unsigned')
                    }
                }
            }
            
            return val;
        },
        
        setCookie: function (res, val, params) {
            const signed = 's:' + signature.sign(val, params.secret);
            const data = cookie.serialize(params.name, signed, params.cookie);
            
            debug('set-cookie %s', data);
            
            const prev = res.getHeader('set-cookie') || [];
            const header = Array.isArray(prev)
                ? prev.concat(data)
                : [prev, data];
            
            res.setHeader('set-cookie', header);
        },
        
        unSignCookie: function (val, secrets) {
            for (let i = 0; i < secrets.length; i++) {
                const result = signature.unsign(val, secrets[i]);
                
                if (result !== false) {
                    return result;
                }
            }
            
            return false;
        }
    };
    
    return cookieHelper;
})();
