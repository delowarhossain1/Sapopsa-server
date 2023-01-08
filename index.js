const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
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
        const slidersCollection = client.db('Sapopsa').collection('sliders');
        const categoriesCollection = client.db('Sapopsa').collection('categories');
        const productsCollection = client.db('Sapopsa').collection('products');
        const usersCollection = client.db('Sapopsa').collection('users');


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

        // Update websit heading (admin required)
        app.patch('/web-heading', async (req, res) => {

        });

        /******************************
        *  Sliders
        * ****************************/

        //  Get all sliders
        app.get('/sliders', async (req, res) => {
            const sliders = await slidersCollection.find().toArray();
            res.send(sliders);
        });

        // Add new slider (admin required)
        app.post('/sliders', async (req, res) => {
            const data = req.body;

        });

        /******************************
         *  Categories
         * ****************************/

        // get all categories
        app.get('/categories', async (req, res) => {
            const categories = await categoriesCollection.find().toArray();
            res.send(categories);
        });

        // insert a new categories (admin required)
        app.post('/categories', async (req, res) => {

        });

        /******************************
        *  Products 
        * ****************************/

        //  get latest 6 products
        app.get('/latest-products', async (req, res) => {
            const countProducts = await productsCollection.estimatedDocumentCount();
            const lastSixProducts = countProducts > 6 ? countProducts - 6 : 0;
            const products = await productsCollection.find().project({
                img: 1,
                title: 1,
                price: 1,
                description: 1
            })
                .limit(6)
                .skip(lastSixProducts)
                .toArray();

            res.send(products);
        });

        // get product by id
        app.get('/get-product/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const product = await productsCollection.findOne(query);
            res.send(product);
        });


        // Dashboard report  ( admin verified );
        app.get('/report', verifyToken, verifyAdmin, async (req, res) => {
            const totalUsers = await usersCollection.estimatedDocumentCount();
            const latestFiveCount = totalUsers > 5 ? totalUsers - 5 : 0;
            const users = await usersCollection.find().limit(5).skip(latestFiveCount).toArray();

            const report = {
                totalUsers,
                users,
            }
        });



        /******************************
         *  User management
         * ****************************/

        // Add user, update user and send access token. 
        app.put('/user', async (req, res) => {
            const userInfo = req.body;
            const email = userInfo.email;
            const user = { $set: userInfo }
            const option = { upsert: true };
            const result = await usersCollection.updateOne({ email }, user, option);

            const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, {
                expiresIn: '1m'
            });

            res.send({ result, token });
        });

        // Is admin
        app.get('/is-admin/:email', async (req, res) => {
            const email = req.params.email;
            const user = await usersCollection.findOne({ email });

            if (user?.role === 'admin') {
                res.send({ isAdmin: true });
            }
            else {
                res.send({ isAdmin: false });
            }
        });


    }
    finally {

    }
}

run().catch(console.dir);


app.listen(PORT, () => {
    console.log('The server is running.');
});