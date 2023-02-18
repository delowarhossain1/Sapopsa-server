const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const env = require('dotenv').config();
const PORT = process.env.PORT || 5000;
const bodyParser = require('body-parser')
const verifyToken = require('./middleware/verifyToken');
const fileUpload = require('express-fileupload');
const makeFileName = require('./utilities/makeFileName');
const imageUpload = require('./utilities/imageUpload');

const hostURL = `http://localhost:${PORT}`;
const app = express();

// Middlewares
app.use(bodyParser.urlencoded({
    extended: true
}));

app.use(express.json())
app.use(cors());
app.use(fileUpload());
app.use('/images', express.static('uploades'))

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
        const dataBase = client.db('Sapopsa');
        const headingCollection = dataBase.collection('websiteHeading');
        const slidersCollection = dataBase.collection('sliders');
        const categoriesCollection = dataBase.collection('categories');
        const productsCollection = dataBase.collection('products');
        const usersCollection = dataBase.collection('users');
        const ordersCollection = dataBase.collection('orders');
        const settingCollection = dataBase.collection('setting');


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
                console.log('Admin required...')
                return res.status(403).send({ message: "Forbidden access 3" });
            }
        };

        /******************************
         *  Website heading
         * ****************************/

        // Get website heading
        app.get('/web-heading', async (req, res) => {
            try {
                const query = { _id: ObjectId('63b5c60260d78d6022c1b330') };
                const heading = await headingCollection.findOne(query);
                res.send(heading);
            }
            catch (err) {
                res.send({ err })
            }
        });

        // Update websit heading (admin required)
        app.patch('/web-heading', verifyToken, verifyAdmin, async (req, res) => {
            try {
                const heading = req.body;
                const query = { _id: ObjectId('63b5c60260d78d6022c1b330') };
                const result = await headingCollection.updateOne(query, { $set: heading });
                res.send(result);
            }
            catch (err) {
                res.send({ err });
            }
        });

        /******************************
        *  Sliders
        * ****************************/

        //  Get all sliders
        app.get('/sliders', async (req, res) => {
            try {
                const sliders = await slidersCollection.find().toArray();
                res.send(sliders);
            }
            catch (err) {
                res.send({ err });
            }
        });

        // delete slider ( admin verified )
        app.delete('/slider/:id', verifyToken, verifyAdmin, async (req, res) => {
            try {
                const id = req.params.id;
                const query = { _id: ObjectId(id) }
                const result = await slidersCollection.deleteOne(query);
                res.send(result);
            }
            catch (err) {
                res.send({ err });
            }
        });

        // Add new slider (admin required)
        app.post('/sliders', verifyToken, verifyAdmin, async (req, res) => {
            try {
                const file = req.files.img;
                const fileName = makeFileName(file?.name);
                const uploadDirectory = __dirname + "/uploades/" + fileName;
                const img = `${hostURL}/images/${fileName}`;
                const title = req.body.title;

                // Upload image and database update
                imageUpload(file, uploadDirectory, async () => {
                    const result = await slidersCollection.insertOne({ img, title });
                    res.send(result);
                });
            }
            catch (err) {
                res.send({ err })
            }
        });

        /******************************
         *  Categories
         * ****************************/

        // get all categories
        app.get('/categories', async (req, res) => {
            try {
                const categories = await categoriesCollection.find().limit(15).toArray();
                res.send(categories);
            }
            catch (err) {
                res.send({ err })
            }
        });

        // insert a new categories (admin required)
        app.post('/categories', verifyToken, verifyAdmin, async (req, res) => {
            try {
                const file = req.files?.img;
                const title = req.body?.title;
                const thisIsFor = req.body?.thisIsFor;
                const route = req.body?.route;
                const fileName = makeFileName(file?.name);
                const img = `${hostURL}/images/${fileName}`;
                const doc = { img, title, thisIsFor, route };
                const dir = __dirname + '/uploades/' + fileName;

                // upload image and update database
                imageUpload(file, dir, async () => {
                    const result = await categoriesCollection.insertOne(doc);
                    res.send(result);
                });
            }
            catch (err) {
                res.send({ err })
            }
        });

        // get all categories (admin required )
        app.get('/all-categories', verifyToken, verifyAdmin, async (req, res) => {
            try {
                const categories = await categoriesCollection.find().toArray();
                res.send(categories);
            }
            catch (err) {
                res.send({ err });
            }
        });

        // delete category ( admin verified )
        app.delete('/category/:id', verifyToken, verifyAdmin, async (req, res) => {
            try {
                const id = req.params.id;
                const query = { _id: ObjectId(id) }
                const result = await categoriesCollection.deleteOne(query);
                res.send(result);
            }
            catch (err) {
                res.send({ err });
            }
        });

        // Get category for menu
        app.get('/categories-list', async (req, res) => {
            try {
                const men = await categoriesCollection
                    .find({ thisIsFor: 'men' })
                    .project({ title: 1, route: 1 })
                    .toArray();

                const women = await categoriesCollection
                    .find({ thisIsFor: 'women' })
                    .project({ title: 1, route: 1 })
                    .toArray();

                const sports = await categoriesCollection
                    .find({ thisIsFor: 'sports' })
                    .project({ title: 1, route: 1 })
                    .toArray();

                res.send({ men, women, sports });
            }
            catch (err) {
                res.send({ err });
            }
        })

        /******************************
        *  Products 
        * ****************************/

        //  get latest 6 products
        app.get('/latest-products', async (req, res) => {
            try {
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
            }
            catch (err) {
                res.send({ err })
            }
        });

        // Product for ( men, women, sports );
        app.get('/product-for', async (req, res) => {
            try {
                const { thisIsFor } = req.query;
                const products = await productsCollection
                    .find({ thisIsFor })
                    .project({
                        img: 1,
                        title: 1,
                        price: 1,
                    })
                    .toArray();

                res.send(products);
            }
            catch (err) {
                res.send([]);
            }
        });

        // Get product by category 
        app.get('/categories-products', async (req, res) => {
            try {
                const { cty } = req.query;

                const products = await productsCollection
                    .find({ category: cty })
                    .project({
                        img: 1,
                        title: 1,
                        price: 1,
                    })
                    .toArray();

                res.send(products);
            }
            catch (err) {
                res.send([]);
            }
        });

        // get product by id
        app.get('/get-product/:id', async (req, res) => {
            try {
                const id = req.params.id;
                const query = { _id: ObjectId(id) };
                const product = await productsCollection.findOne(query);
                res.send(product);
            }
            catch (err) {
                res.send({ err });
            }
        });

        // delete product ( admin veryfied )
        app.delete('/product/:id', verifyToken, verifyAdmin, async (req, res) => {
            try {
                const id = req.params.id;
                const query = { _id: ObjectId(id) };
                const result = await productsCollection.deleteOne(query);
                res.send(result)
            }
            catch (err) {
                res.send({ err });
            }
        });

        // Dashboard report  ( admin verified );
        app.get('/report', verifyToken, verifyAdmin, async (req, res) => {
            try {
                const date = new Date().toDateString();
                const totalUsers = await usersCollection.estimatedDocumentCount();
                const totalOrders = await ordersCollection.estimatedDocumentCount();
                const totalProducts = await productsCollection.estimatedDocumentCount();
                const totalCategories = await categoriesCollection.estimatedDocumentCount();

                const latestFiveCount = totalUsers > 7 ? totalUsers - 7 : 0;
                const latestFiveCount2 = totalOrders > 3 ? totalOrders - 3 : 0;

                const users = await usersCollection
                    .find()
                    .limit(7)
                    .skip(latestFiveCount)
                    .toArray();

                const orders = await ordersCollection
                    .find()
                    .project({ isMultipleOrder: 1, total: 1, placed: 1 })
                    .limit(3)
                    .skip(latestFiveCount2)
                    .toArray();

                const todaysOrders = await ordersCollection
                    .countDocuments({ "placed.date": date });

                const successFulDelivered = await ordersCollection
                    .countDocuments({ status: "Delivered" });

                // latest 
                const latestOrders = orders.reverse();
                const latestUsers = users.reverse();

                const report = {
                    totalUsers,
                    totalOrders,
                    todaysOrders,
                    users : latestUsers,
                    orders : latestOrders,
                    successFulDelivered,
                    totalProducts,
                    totalCategories
                }

                res.send(report);
            }
            catch (err) {
                res.send({ err });
            }
        });

        // Get products (admin required)
        app.get('/products', verifyToken, verifyAdmin, async (req, res) => {
            try {
                const products = await productsCollection.find().project({
                    img: 1,
                    title: 1,
                    price: 1,
                    category: 1,
                    thisIsFor: 1
                }).toArray();
                res.send(products);
            }
            catch (err) {
                res.send({ err });
            }
        });

        // Add new product (admin required)
        app.post('/product', verifyToken, verifyAdmin, async (req, res) => {
            try {
                const { title, price, thisIsFor, category, des, colors, size, specification } = req.body;

                const gIMG = req.files['galleryIMG'];
                const dir = __dirname + '/uploades/';
                const imgURL = [];


                gIMG?.forEach(img => {
                    const imgName = makeFileName(img?.name);
                    const directory = dir + imgName;

                    imageUpload(img, directory, () => {
                        const url = `${hostURL}/images/${imgName}`;
                        imgURL.push(url);
                    });
                });

                setTimeout(async () => {
                    const doc = {
                        title,
                        thisIsFor,
                        category,
                        img: imgURL[0],
                        galleryIMG: imgURL,
                        description: des,
                        price: Number(price),
                        size: size || [],
                        colors: colors || [],
                        specification: specification || [],
                    }

                    const result = await productsCollection.insertOne(doc);
                    res.send(result);

                }, 1000);
            }
            catch (err) {
                res.send({ message: 'Product not added.', err })
            }
        });


        /******************************
         *  Orders management
         * ****************************/

        // Add a new order
        app.post('/order', verifyToken, async (req, res) => {
            try {
                const data = req.body;
                const result = await ordersCollection.insertOne(data);
                res.send(result);
            }
            catch (err) {
                res.send({ err });
            }
        });

        // Get may orders
        app.get('/my-orders', verifyToken, async (req, res) => {
            try {
                const email = req.query.email;
                const query = { "dailyveryInfo.email": email }

                const orders = await ordersCollection
                    .find(query)
                    .project({
                        placed: 1,
                        status: 1,
                        products: {
                            img: 1,
                            title: 1,
                            quantity: 1
                        },
                        payment: { txn: 1 },
                    })
                    .toArray();

                const latestOrders = orders.reverse();
                res.send(latestOrders);
            }
            catch (err) {
                res.send({ err });
            }
        });

        // get order by id;
        app.get('/get-order', verifyToken, async (req, res) => {
            try {
                const { id } = req.query;
                const result = await ordersCollection.findOne({ _id: ObjectId(id) });
                res.send(result);
            }
            catch (err) {
                res.send({ err });
            }
        });

        // get orders (admin verifyed)
        app.get('/orders', verifyToken, verifyAdmin, async (req, res) => {
            try {
                const { searchText } = req.query;

                const orders = await ordersCollection
                    .find({
                        $or: [
                            { status: searchText },
                            { "dailyveryInfo.email": searchText },
                            { "dailyveryInfo.phone": searchText },
                            { "payment.txn": searchText }
                        ]
                    })
                    .project({
                        isMultipleOrder: 1,
                        status: 1,
                        total: 1,
                        placed: 1,
                        dailyveryInfo: { phone: 1, email: 1 },
                        payment: { txn: 1 }
                    })
                    .toArray();

                const latestOrders = orders.reverse();
                res.send(latestOrders);
            }
            catch (err) {
                res.send({ err })
            }
        });

        // update order status (admin verifyed)
        app.patch('/update-order-status/:id', verifyToken, verifyAdmin, async (req, res) => {
            try {
                const { status } = req.query;
                const id = req.params.id;
                const doc = { status };
                const query = { _id: ObjectId(id) };

                const result = await ordersCollection.updateOne(query, { $set: doc });
                res.send(result);
            }
            catch (err) {
                res.send({ err })
            }
        });

        /******************************
         *  User management
         * ****************************/

        // Add user, update user and send access token. 
        app.put('/user', async (req, res) => {
            try {
                const { email, name } = req.query;
                const user = { $set: { email, name } }
                const option = { upsert: true };

                if (email) {
                    const result = await usersCollection.updateOne({ email }, user, option);

                    const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, {
                        expiresIn: '1y'
                    });
                    res.send({ result, token });
                }
                else {
                    res.send({ message: 'Email not available' });
                }
            }
            catch (err) {
                res.send({ err })
            }
        });

        // Is admin
        app.get('/is-admin/:email', async (req, res) => {
            try {
                const email = req.params.email;
                const user = await usersCollection.findOne({ email });

                if (user?.role === 'admin') {
                    res.send({ isAdmin: true });
                }
                else {
                    res.send({ isAdmin: false });
                }
            }
            catch (err) {
                res.send({ err });
            }
        });

        // customers ( Admin required )
        app.get('/customers', verifyToken, verifyAdmin, async (req, res) => {
            try {
                const customer = await usersCollection.find({ role: { $exists: false } }).toArray();
                res.send(customer);
            }
            catch (err) {
                res.send({ err })
            }
        });

        // admins ( admin required )
        app.get('/admins', verifyToken, verifyAdmin, async (req, res) => {
            try {
                const admins = await usersCollection.find({ role: 'admin' }).toArray();
                res.send(admins);
            }
            catch (err) {
                res.send({ err })
            }
        });

        // make admin ( admin required )
        app.patch('/make-admin', verifyToken, verifyAdmin, async (req, res) => {
            try {
                const email = req.body;
                const doc = { role: 'admin' };
                const result = await usersCollection.updateOne(email, { $set: doc });
                res.send(result);
            }
            catch (err) {
                res.send({ err });
            }
        });

        // Delete admin
        app.patch('/delete-admin', verifyToken, verifyAdmin, async (req, res) => {
            try {
                const email = req.query.deleteAdmin;
                const doc = { role: '' };
                const result = await usersCollection.updateOne({ email }, { $unset: doc });
                res.send(result);
            }
            catch (err) {
                res.send({ err });
            }
        });


        /*
            ************** Settings management ********
        */

        // Get app settings
        app.get('/settings', verifyToken, async (req, res) => {
            try {
                const query = {_id : ObjectId('63edeebb11d0f727c6f20515')};
                const settings = await settingCollection.findOne(query);
                res.send(settings);
            }
            catch (err) {
                res.send({ err });
            }
        });

        // inset or update settings
        app.patch('/settings', verifyToken, verifyToken, async(req, res)=>{
            try{
                const settingInfo = req.body;
                const query = {_id : ObjectId('63edeebb11d0f727c6f20515')};
                const result = await settingCollection.updateOne(query, {$set : settingInfo});

                // update heading status;
                const headingQuery = { _id: ObjectId('63b5c60260d78d6022c1b330') };
                const updateHeading = await headingCollection.updateOne(headingQuery, { $set: { isDispaly: settingInfo?.isNavbarTitleDisplay }});

                res.send(result);
            }
            catch(err){
                res.send({err});
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