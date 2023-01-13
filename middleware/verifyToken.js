const jwt = require('jsonwebtoken');

module.exports = function verifyToken(req, res, next) {
    const authorization = req.headers.auth;
    const email = req.query.email;

    if (!authorization) {
        return res.status(401).send({ message: "Unauthorize access" });
    }
    // get access token from a sting;
    const token = authorization.split(" ")[1];
   
    jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded) => {

        if (err) {
            return res.status(403).send({ message: "Forbidden access 0" });
        } else {
            // Check access token email & api requested email;
            if (decoded.email === email) {
                return next();
            } else {
                return res.status(403).send({ message: "Forbidden access 1" });
            }
        }
    });
}

