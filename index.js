const express = require('express');
const app = express();
const cors = require('cors');
const port = process.env.PORT || 5000;
require('dotenv').config();

// middleware
app.use(cors());
app.use(express.json());



const { MongoClient, ServerApiVersion } = require('mongodb');
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
    const submittedCollection = client.db("contestDB").collection("submits")


    //contests related api
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