const { MongoClient, ServerApiVersion } = require('mongodb');
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const env = require('dotenv').config();
const PORT = process.env.PORT || 5000;
const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// Default route
app.get('/', (req, res) => {
    res.send('Hello, everyone. The server is running.')
});


// Verify access token;
function verifyToken(req, res, next) {
    const authorization = req.headers.auth;
    const email = req.query.email;

    if (!authorization) {
        return res.status(401).send({ message: "Unauthorize access" });
    }
    // get access token from a sting;
    const token = authorization.split(" ")[1];

    jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded) => {
        if (err) {
            return res.status(403).send({ message: "Forbidden access" });
        } else {
            // Check access token email & api requested email;
            if (decoded.email === email) {
                return next();
            } else {
                return res.status(403).send({ message: "Forbidden access" });
            }
        }
    });
}

// Datebase action and routing.
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.c7vrvyh.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
    try {
        await client.connect();

        // Database collection
        const headingCollection = client.db('Sapopsa').collection('websiteHeading');

        /******************************
         *  verify Admin 
         * ****************************/

        const verifyAdmin = async (req, res, next) => {
            const email = req.query.email;
            const query = { email };
            const user = await usersCollection.findOne(query);

            if (user?.role === "admin") {
                return next();
            } else {
                return res.status(403).send({ message: "Forbidden access" });
            }
        };

        /******************************
         *  Website heading
         * ****************************/

        // Get website heading
        app.get('/web-heading', async (req, res) => {
            const title = await headingCollection.find().toArray();
            res.send(title);
        });

        // Update websit heading
        app.patch('/web-heading', async (req, res) => {

        });
    }
    finally {

    }
}

run().catch(console.dir);


app.listen(PORT, () => {
    console.log('The server is running.');
});