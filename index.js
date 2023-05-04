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

const hostURL = process.env.HOST_URL;
const app = express();

// Middlewares
app.use(express.json({ limit: '50mb' }));
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true, parameterLimit: 50000 }));
app.use(cors());
app.use(fileUpload());
app.use('/api/images', express.static('uploades'));

// Datebase action and routing.
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.c7vrvyh.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
    try {
        await client.connect();

        // Database collection
        const dataBase = client.db('Sapopsa');
        const slidersCollection = dataBase.collection('sliders');
        const categoriesCollection = dataBase.collection('categories');
        const productsCollection = dataBase.collection('products');
        const usersCollection = dataBase.collection('users');
        const ordersCollection = dataBase.collection('orders');
        const settingCollection = dataBase.collection('settings');


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


        // Search bar
        app.get('/api/search', async (req, res) => {
            try {
                const text = req.headers.search;
                const products = await productsCollection.find({
                    $or: [
                        { title: { $regex: ".*" + text + ".*", $options: "i" } },
                        { thisIsFor: { $regex: ".*" + text + ".*", $options: "i" } },
                        { description: { $regex: ".*" + text + ".*", $options: "i" } },
                        { category: { $regex: ".*" + text + ".*", $options: "i" } }
                    ]
                })
                    .project({
                        img: 1,
                        title: 1,
                        price: 1,
                    })
                    .toArray();
                res.send(products);
            }
            catch (err) {
                res.send({ err });
            }
        });

        /******************************
        *  Sliders
        * ****************************/

        //  Get all sliders
        app.get('/api/sliders', async (req, res) => {
            try {
                const sliders = await slidersCollection.find().toArray();
                res.send(sliders);
            }
            catch (err) {
                res.send({ err });
            }
        });

        // delete slider ( admin verified )
        app.delete('/api/slider/:id', verifyToken, verifyAdmin, async (req, res) => {
            try {
                const id = req.params.id;
                const query = { _id: ObjectId(id) };
                const result = await slidersCollection.deleteOne(query);
                res.send(result);
            }
            catch (err) {
                res.send({ err });
            }
        });

        // Add new slider (admin required)
        app.post('/api/sliders', verifyToken, verifyAdmin, async (req, res) => {
            try {
                const file = req.files.img;
                const fileName = makeFileName(file?.name);
                const uploadDirectory = __dirname + "/uploades/" + fileName;
                const img = `${hostURL}/api/images/${fileName}`;
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
        app.get('/api/categories', async (req, res) => {
            try {
                const categories = await categoriesCollection.find().limit(15).toArray();
                res.send(categories);
            }
            catch (err) {
                res.send({ err })
            }
        });

        // insert a new categories (admin required)
        app.post('/api/categories', verifyToken, verifyAdmin, async (req, res) => {
            try {
                const file = req.files?.img;
                const title = req.body?.title;
                const thisIsFor = req.body?.thisIsFor;
                const route = req.body?.route;
                const fileName = makeFileName(file?.name);
                const img = `${hostURL}/api/images/${fileName}`;
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
        app.get('/api/all-categories', verifyToken, verifyAdmin, async (req, res) => {
            try {
                const categories = await categoriesCollection.find().toArray();
                res.send(categories);
            }
            catch (err) {
                res.send({ err });
            }
        });

        // delete category ( admin verified )
        app.delete('/api/category/:id', verifyToken, verifyAdmin, async (req, res) => {
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

        // update category (admin verified)
        app.patch('/api/category/:id', verifyToken, verifyAdmin, async (req, res) => {
            try {
                const id = req.params.id;
                const query = { _id: ObjectId(id) };
                const doc = { title: req.body.title };

                const result = await categoriesCollection.updateOne(query, { $set: doc });
                res.send(result);
            }
            catch (err) {
                res.send({ message: err });
            }
        });

        // Get category for menu
        app.get('/api/categories-list', async (req, res) => {
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
        app.get('/api/latest-products', async (req, res) => {
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
        app.get('/api/product-for', async (req, res) => {
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
        app.get('/api/categories-products', async (req, res) => {
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
        app.get('/api/get-product/:id', async (req, res) => {
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
        app.delete('/api/product/:id', verifyToken, verifyAdmin, async (req, res) => {
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
        app.get('/api/report', verifyToken, verifyAdmin, async (req, res) => {
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
                    users: latestUsers,
                    orders: latestOrders,
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
        app.get('/api/products', verifyToken, verifyAdmin, async (req, res) => {
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
        app.post('/api/product', verifyToken, verifyAdmin, async (req, res) => {
            try {
                const { title, price, thisIsFor, category, des, colors, size, specification } = req.body;

                const productSize = JSON.parse(size);
                const productColors = JSON.parse(colors);
                const productSpec = JSON.parse(specification);

                const gIMG = req.files['galleryIMG'];
                const dir = __dirname + '/uploades/';
                const imgURL = [];

                gIMG?.forEach(img => {
                    const imgName = makeFileName(img?.name);
                    const directory = dir + imgName;

                    imageUpload(img, directory, () => {
                        const url = `${hostURL}/api/images/${imgName}`;
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
                        size: productSize || [],
                        colors: productColors || [],
                        specification: productSpec || [],
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
        app.post('/api/order', verifyToken, async (req, res) => {
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
        app.get('/api/my-orders', verifyToken, async (req, res) => {
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
        app.get('/api/get-order', verifyToken, async (req, res) => {
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
        app.get('/api/orders', verifyToken, verifyAdmin, async (req, res) => {
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
        app.patch('/api/update-order-status/:id', verifyToken, verifyAdmin, async (req, res) => {
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
        app.put('/api/user', async (req, res) => {
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
        app.get('/api/is-admin/:email', async (req, res) => {
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
        app.get('/api/customers', verifyToken, verifyAdmin, async (req, res) => {
            try {
                const customer = await usersCollection.find({ role: { $exists: false } }).toArray();
                res.send(customer);
            }
            catch (err) {
                res.send({ err })
            }
        });

        // admins ( admin required )
        app.get('/api/admins', verifyToken, verifyAdmin, async (req, res) => {
            try {
                const admins = await usersCollection.find({ role: 'admin' }).toArray();
                res.send(admins);
            }
            catch (err) {
                res.send({ err })
            }
        });

        // make admin ( admin required )
        app.patch('/api/make-admin', verifyToken, verifyAdmin, async (req, res) => {
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
        app.patch('/api/delete-admin', verifyToken, verifyAdmin, async (req, res) => {
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
        app.get('/api/settings', async (req, res) => {
            try {
                const query = { _id: ObjectId('6436532d53d02eb0a8270c7d') };
                const settings = await settingCollection.findOne(query);
                res.send(settings);
            }
            catch (err) {
                res.send({ err });
            }
        });

        // Update navbar title
        app.patch('/api/settings/navbar-title', verifyToken, verifyAdmin, async (req, res) => {
            try {
                const navbarTitle = req.body;
                const query = { _id: ObjectId('6436532d53d02eb0a8270c7d') };
                const result = await settingCollection.updateOne(query, { $set: navbarTitle });
                res.send(result);
            }
            catch (err) {
                res.send({ err });
            }

        });

        // inset or update settings
        app.patch('/api/settings/shipping-navbarTitle-display', verifyToken, verifyAdmin, async (req, res) => {
            try {
                const settingInfo = req.body;
                const query = { _id: ObjectId('6436532d53d02eb0a8270c7d') };
                const result = await settingCollection.updateOne(query, { $set: settingInfo });

                res.send(result);
            }
            catch (err) {
                res.send({ err });
            }
        });

        // update about us
        app.patch('/api/settings/about-us', verifyToken, verifyAdmin, async (req, res) => {
            try {
                const aboutUs = req.body;
                const query = { _id: ObjectId('6436532d53d02eb0a8270c7d') };
                const result = await settingCollection.updateOne(query, { $set: aboutUs });

                res.send(result);
            }
            catch (err) {
                res.send({ err });
            }
        });

        // update update terms
        app.patch('/api/settings/termsAndCondition', verifyToken, verifyAdmin, async (req, res) => {
            try {
                const termsAndCondition = req.body;
                const query = { _id: ObjectId('6436532d53d02eb0a8270c7d') };
                const result = await settingCollection.updateOne(query, { $set: termsAndCondition });

                res.send(result);
            }
            catch (err) {
                res.send({ err });
            }
        });

        // Update contact (mobile and email)
        app.patch('/api/settings/contact', verifyToken, verifyAdmin, async (req, res) => {
            try {
                const contact = req.body;
                const query = { _id: ObjectId('6436532d53d02eb0a8270c7d') };
                const result = await settingCollection.updateOne(query, { $set: contact });

                res.send(result);
            }
            catch (err) {
                res.send({ err });
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