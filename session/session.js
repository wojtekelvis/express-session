/**
 * Created by Wojtek on 2017-02-19.
 */

module.exports = Session;

function Session(req, data) {
    this.req = req;
    this.id = req.sessionID;
    
    if (typeof data === 'object' && data !== null) {
        // merge data into this, ignoring prototype properties
        for (var prop in data) {
            if (!(prop in this)) {
                this[prop] = data[prop]
            }
        }
    }
}

