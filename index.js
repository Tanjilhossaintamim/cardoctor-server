const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = process.env.PORT || 5000;
const app = express();


// middlewares
app.use(cors({
    origin: ['http://localhost:5173'],
    credentials: true
}));
app.use(express.json());

app.use(cookieParser());

const verifyToken = (req, res, next) => {
    console.log(req.cookies?.token);
    const token = req.cookies?.token;
    if (!token) {
        return res.status(401).send({ message: 'unauthorized' });
    }
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decode) => {
        if (err) {
            return res.status(401).send({ message: 'unauthorized' });
        }
        req.user = decode;
        next();
    });

};




app.get('/', (req, res) => {
    res.send('car doctor server is running !');
});

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.kkcmbk1.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();
        const database = client.db('carDoctor');
        const servicesCollection = database.collection('services');
        const bookingCollection = database.collection('bookings');
        // authenication related api
        app.post('/jwt', (req, res) => {
            const user = req.body?.user;
            const token = jwt.sign({ user }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
            console.log(token);
            res.cookie('token', token, { httpOnly: true, secure: true, sameSite: 'none' }).send({ success: true });
        });
        app.post('/logout', (req, res) => {
            res.clearCookie('token', { maxAge: 0 }).send({ success: true });
        });

        /// services related api

        app.get('/services', async (req, res) => {
            const result = await servicesCollection.find().toArray();
            res.send(result);
        });
        app.get('/services/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const options = {


                // Include only the `title` and `imdb` fields in the returned document
                projection: { title: 1, price: 1, service_id: 1, img: 1 },
            };
            const result = await servicesCollection.findOne(query, options);
            res.send(result);
        });
        app.get('/bookings', verifyToken, async (req, res) => {



            const query = {};
            if (req.query?.email) {
                if (req.query?.email !== req.user.user) {

                    return res.status(403).send({ message: 'forbidden' });
                }


                query.email = req.query.email;
            }

            const result = await bookingCollection.find(query).toArray();
            res.send(result);
        });
        app.post('/booking', async (req, res) => {
            const bookinginfo = req.body;
            const result = await bookingCollection.insertOne(bookinginfo);
            res.send(result);
        });
        app.delete('/bookings/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await bookingCollection.deleteOne(query);
            res.send(result);
        });
        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);



app.listen(port, () => {
    console.log(`server is running on port ${port}`);
});