const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken')
require('dotenv').config();
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());



const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.yn2a1td.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

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
    // await client.connect();

    const contestCollection = client.db("contestDB").collection("contests")
    const userCollection = client.db("contestDB").collection("users")
    const submittedCollection = client.db("contestDB").collection("submits");


    ///middle ware
    const verifyToken = (req ,res, next) =>{
      if(!req.headers.authorization){
        return res.status(403).se({message: 'forbidden Access'})
      }
      const token = req.headers.authorization.split(' ')[1];
      jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded) =>{
        if(err){
          return res.status(403).se({message: 'forbidden Access'})
        }
        req.decoded = decoded;
        next();
      })
    }

    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      const isAdmin = user?.role === 'admin';
      if (!isAdmin) {
        return res.status(403).send({ message: 'forbidden access' });
      }
      next();
    }
    

    //jwt related
    app.post('/jwt', async(req, res) =>{
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN, {
        expiresIn: '1h'
      });
      res.send({token})
    })



    //contests related api
    app.post('/contests', async(req, res) =>{
      const contest = req.body;
      const result = await contestCollection.insertOne(contest);
      res.send(result);
    })
    app.get('/contests',async (req, res) => {
        const result = await contestCollection.find().toArray();
        res.send(result);
      });

    app.get('/contests/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: id }
      const result = await contestCollection.findOne(query);
      res.send(result);
    })

    

    //submitted 
    app.post('/submits', async (req, res) => {
      const item = req.body;
      const result = await submittedCollection.insertOne(item);
      res.send(result);
    });


    
  
                 
    //user related
    app.post('/users', async (req, res) => {
      const user = req.body;
      // insert email if user doesnt exists: 
      // you can do this many ways (1. email unique, 2. upsert 3. simple checking)
      const query = { email: user.email }
      const existingUser = await userCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: 'user already exists', insertedId: null })
      }
      const result = await userCollection.insertOne(user);
      res.send(result);
    });

    app.get('/users',verifyToken,verifyAdmin, async(req,res) =>{
      console.log(req.headers);
      const result = await userCollection.find().toArray();
      res.send(result);
    })

    app.delete('/users/:id',verifyToken,verifyAdmin, async(req, res) =>{
      const id = req.params.id;
      const query = { _id : new ObjectId(id)};
      const result = await userCollection.deleteOne(query);
      req.send(result);
    })

    app.patch('/users/admin/:id',verifyToken,verifyAdmin, async( req, res) =>{
      const id = req.params.id;
      const filter = { _id : new ObjectId(id)};
      const updatedUser = {
        $set:{
          role:'admin'
        }
      }
      const result = await userCollection.updateOne(filter,updatedUser);
      res.send(result);
    })


    //verify Admin


    app.get('/users/admin/:email',verifyToken, async(req, res) =>{
      const email = req.params.email;
      if(email !== req.decoded.email){
        return res.status(403).send({message: 'unauthorized access'})
      }

      const query = { email: email};
      const user = await userCollection.findOne(query);
      let admin = false;
      if(user){
        admin = user?.role === 'admin'
      }
      res.send({ admin })
    })

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('contest is running')
  })
  
app.listen(port, () => {
console.log(`Contest is running on port ${port}`);
})