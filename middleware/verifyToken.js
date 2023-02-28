const jwt = require('jsonwebtoken');

module.exports = function verifyToken(req, res, next) {
    const authorization = req?.headers?.auth;
    const email = req?.query?.email;

    if (!authorization) {
        console.log('Token is required.')
        return res.status(401).send({ message: "Unauthorize access 0" });
    }
    // get access token from a sting;
    const token = authorization.split(" ")[1];

    jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded) => {

        if (err) {
            console.log('Token decoded failed.')
            return res.status(403).send({ message: "Forbidden access 1" });
        } else {
            // Check access token email & api requested email;
            if (decoded.email === email) {
                return next();
            } else {
                console.log('Token info not matched.')
                return res.status(403).send({ message: "Forbidden access 2" });
            }
        }
    });
}

