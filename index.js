const express = require('express')
const app = express()
const port = process.env.PORT || 5000;

//Midle Wares
const { MongoClient, ObjectId , ServerApiVersion } = require('mongodb');
const cors = require('cors');
const jwt = require('jsonwebtoken');
app.use(cors())
app.use(express.json())
require('dotenv').config()

//MongoDB Configuration
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@firstmongodb.yjij5fj.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
//Genarate Access token
app.post('/getaccesstoken', async(req, res)=> {
    const user = req.body;
    const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {expiresIn: '1d'})
    res.send({token})
    console.log(token);

})

//Verification 
const verifyJWT = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if(!authHeader){
        res.status(401).send({message: 'unauthorized access'})
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (error, decoded) => {
        if(error){
            res.status(401).send({message: 'unathorized Access'})
        }
        req.decoded = decoded;
    })
    next()
}


const dbConnect = () => {
    const productCollection = client.db("repiitDB").collection("products");

    //Get the Data from the Database
    app.get('/products', async(req, res)=> {
        const query = {};
        const currentPage = parseInt(req.query.currentPage);
        const productPerPage = parseInt(req.query.productPerPage);
        const cursor = productCollection.find(query)
        const products = await cursor.skip(currentPage * productPerPage).limit(productPerPage).toArray();
        const count = await productCollection.estimatedDocumentCount();
        res.send({count, products})
    })
    //Get Specific Data from Mongo
    app.get('/products/:id', async(req,res)=> {
        const id = req.params.id;
        const query = {_id: ObjectId(id)}
        const cursor = productCollection.find(query);
        const product = await cursor.toArray()
        res.send(product);
    })
    //Create New Order
    const ordersData = client.db("repiitDB").collection("orders");

    app.post('/orders/create', async(req, res)=> {
        //Get the data sent from requested body
        const order = req.body;
        const result = await ordersData.insertOne(order)
        res.send(result);
    })
    //Get Order for a specific user
    app.get('/orders', verifyJWT, async(req, res)=> {
        let query = {}
        //Receive the email from requested query
        const email = req.query.email;
        //If there is email then set it to the email as query
        const decoded = req.decoded;
        if(decoded.email !== email){
            res.status(403).send({message: 'unauthorized access'})
        }
        if(email){
            query: {
                email: email
            }
        }
        const cursor = ordersData.find(query)
        const orders = await cursor.toArray()
        res.send(orders)
    })
    //Delete an order from the database based on user click
    app.delete('/orders/:id', async(req, res)=> {
        const id = req.params.id;
        console.log(id);
        const query = {_id: ObjectId(id)}
        const result = await ordersData.deleteOne(query)
        res.send(result)
    })
    //Update Order Status
    app.patch('/orders/:id', async(req, res)=> {
        const id = req.params.id;
        const filter = {_id: ObjectId(id)}
        const status = req.body.status;
        console.log(status);
        const updatedOrder  = {
            $set:{
                status: status
            }
        }
        const result = await ordersData.updateOne(filter, updatedOrder);
        res.send(result)
    })
}
dbConnect()
//Server root route
app.get('/', (req, res)=> {
    res.send('Reppit Server is Running...')
})

//App Listener
app.listen(port, ()=>{
    console.log('Server Running on Port', port);
})