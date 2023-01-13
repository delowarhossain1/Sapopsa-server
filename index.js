const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const env = require('dotenv').config();
const PORT = process.env.PORT || 5000;
const verifyToken = require('./middleware/verifyToken');
const multer = require('./middleware/imageUpload');
const app = express();

// Middleware
app.use(express.json());
app.use(cors({
    origin: 'http://localhost:3000'
}));

// Default route
app.get('/', (req, res) => {
    res.send('Hello, everyone. The server is running.')
});


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
        const ordersCollection = client.db('Sapopsa').collection('orders');


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
                return res.status(403).send({ message: "Forbidden access 2" });
            }
        };

        /******************************
         *  Website heading
         * ****************************/

        // Get website heading
        app.get('/web-heading', async (req, res) => {
            const allHeading = await headingCollection.find().toArray();
            const title = allHeading[0];
            res.send(title);
        });

        // Update websit heading (admin required)
        app.patch('/web-heading', verifyToken, verifyAdmin, async (req, res) => {
            const heading = req.body;
            const query = { _id: ObjectId('63b5c60260d78d6022c1b330') };
            const result = await headingCollection.updateOne(query, { $set: heading });
            res.send(result);
        });

        /******************************
        *  Sliders
        * ****************************/

        //  Get all sliders
        app.get('/sliders', async (req, res) => {
            const sliders = await slidersCollection.find().toArray();
            res.send(sliders);
        });

        // delete slider ( admin verified )
        app.delete('/slider/:id', verifyToken, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) }
            const result = await slidersCollection.deleteOne(query);
            res.send(result);
        });

        // Add new slider (admin required)
        app.put('/sliders', async (req, res) => {
            const data = req.body;
            console.log(data)
        });

        /******************************
         *  Categories
         * ****************************/

        // get all categories
        app.get('/categories', async (req, res) => {
            const categories = await categoriesCollection.find().limit(15).toArray();
            res.send(categories);
        });

        // insert a new categories (admin required)
        app.post('/categories', async (req, res) => {

        });

        // get all categories (admin required )
        app.get('/all-categories', verifyToken, verifyAdmin, async (req, res) => {
            const categories = await categoriesCollection.find().toArray();
            res.send(categories);
        });

        // delete category ( admin verified )
        app.delete('/category/:id', verifyToken, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) }
            const result = await categoriesCollection.deleteOne(query);
            res.send(result);
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

        // delete product ( admin veryfied )
        app.delete('/product/:id', verifyToken, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await productsCollection.deleteOne(query);
            res.send(result)
        });

        // Dashboard report  ( admin verified );
        app.get('/report', verifyToken, verifyAdmin, async (req, res) => {
            const totalUsers = await usersCollection.estimatedDocumentCount();
            const totalOrders = await ordersCollection.estimatedDocumentCount();
            const latestFiveCount = totalUsers > 5 ? totalUsers - 5 : 0;
            const latestFiveCount2 = totalOrders > 5 ? totalOrders - 5 : 0;

            const users = await usersCollection.find().limit(5).skip(latestFiveCount).toArray();
            const orders = await ordersCollection.find().limit(5).skip(latestFiveCount2).toArray();

            const report = {
                totalUsers,
                totalOrders,
                users,
                orders,
            }

            res.send(report);
        });

        // Get products (admin required)
        app.get('/products', verifyToken, verifyAdmin, async (req, res) => {
            const products = await productsCollection.find().project({
                img: 1,
                title: 1,
                price: 1,
            }).toArray();
            res.send(products);
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
                expiresIn: '1y'
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

        // customers ( Admin required )
        app.get('/customers', verifyToken, verifyAdmin, async (req, res) => {
            const customer = await usersCollection.find({ role: { $exists: false } }).toArray();
            res.send(customer);
        });

        // admins ( admin required )
        app.get('/admins', verifyToken, verifyAdmin, async (req, res) => {
            const admins = await usersCollection.find({ role: 'admin' }).toArray();
            res.send(admins);
        });

        // make admin ( admin required )
        app.patch('/make-admin', verifyToken, verifyAdmin, async (req, res) => {
            const query = req.body;
            const doc = { role: 'admin' }
            const result = await usersCollection.updateOne(query, { $set: doc });
            res.send(result);
        });

        // Delete admin
        app.patch('/delete-admin', verifyToken, verifyAdmin, async (req, res) => {
            const query = req.body;
            const doc = { role: '' };
            const result = await usersCollection.updateOne(query, { $unset: doc });
            res.send(result);
        });

    }
    finally {

    }
}

run().catch(console.dir);


app.listen(PORT, () => {
    console.log('The server is running.');
});