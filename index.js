const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken')
require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)
const port = process.env.PORT || 5000;

// middleware
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:5174',
    'https://contest-hub-2af37.web.app',
    'https://contest-hub-2af37.firebaseapp.com'
  ],
  credentials: true,
}));
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
    const winnerCollection = client.db("contestDB").collection("winnerDetails");
    const commentCollection = client.db("contestDB").collection("commentDetails");
    const personalCollection = client.db("contestDB").collection("personalDetails");
    const paymentsCollection = client.db("contestDB").collection("payments");
    const paidContestsCollection = client.db("contestDB").collection("paidContests");


    ///middle ware
    const verifyToken = (req ,res, next) =>{
      if(!req.headers.authorization){
        return res.status(403).send({message: 'forbidden Access'})
      }
      const token = req.headers.authorization.split(' ')[1];
      jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded) =>{
        if(err){
          return res.status(403).send({message: 'forbidden Access'})
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


    //



    //contests related api
    app.post('/contests', async(req, res) =>{
      const contest = req.body;
      const result = await contestCollection.insertOne(contest);
      res.send(result);
    })

    
    app.get('/contests',async (req, res) => {
      const result = await contestCollection.find().toArray();
      console.log('85')
      res.send(result);
    });
    

    
    app.get('/contests/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await contestCollection.findOne(query);
      res.send(result);
    });

    app.put('/contests/:id',async(req, res) =>{
      const id = req.params.id;
      const filter = {_id: new ObjectId(id)};
      const options = {upsert: true};
      const updatedTask = req.body;
      const Task = {
        $set:{
        name:updatedTask.name,
        description:updatedTask.description ,
        price:updatedTask.price,
        gift:updatedTask.gift ,
        submission:updatedTask.submission ,
        date:updatedTask.date ,
        image:updatedTask.image,
        tag:updatedTask.tag,
        }
      }

      const result = await contestCollection.updateOne(filter, Task, options);
      res.send(result);
    })

    app.delete('/contests/:id', async(req, res) =>{
      const id = req.params.id;
      const query = { _id : new ObjectId(id)};
      const result = await contestCollection.deleteOne(query);
      res.send(result);
    })

    app.patch('/contests/:id',async(req, res) =>{
      const id = req.params.id;
      const filter = { _id : new ObjectId(id)};
      const updatedUser = {
        $set:{
          accepted : true
        }
      }
      const result = await contestCollection.updateOne(filter,updatedUser);
      res.send(result);
    })
    
    app.patch('/pay/contests/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedUser = {
        $set: {
          isPaid: true,
        }
      };
      const result = await contestCollection.updateOne(filter, updatedUser);
      res.send(result);
    });
    

    

    // app.patch('/users/admin/:id',verifyToken,verifyAdmin, async( req, res) =>{
    //   const id = req.params.id;
    //   const filter = { _id : new ObjectId(id)};
    //   const updatedUser = {
    //     $set:{
    //       isAdmin:'admin'
    //     }
    //   }
    //   const result = await userCollection.updateOne(filter,updatedUser);
    //   res.send(result);
    // })
  

    

    
    

    

    //submitted 
    app.post('/submits', async (req, res) => {
      const item = req.body;
      const result = await submittedCollection.insertOne(item);
      res.send(result);
    });
    app.get('/submits',async (req, res) => {
      const name = req.query.name;
      const query = { name : name};
      const result = await submittedCollection.find().toArray();
      console.log('172');
      res.send(result);
    });
    app.get('/submits/:name', async (req, res) => {
      const name = req.params.name;
      const query = { name : name }
      const result = await submittedCollection.find(query).toArray();
      console.log('179');
      res.send(result);
    });

    app.patch('/submits', async (req, res) => {
      const name = req.query.name;  // or req.params.name if you are using path parameters
      const anotherParam = req.query.anotherParam
      const query = { name: name };
      console.log(query.name);
      const results = await submittedCollection.find(query).toArray();
      console.log(results);
      // Update each document to add winner: "yes"
      const updatePromises = results.map(result =>
        submittedCollection.updateOne(
          { _id: result._id },
          { $set: { winner: `${anotherParam}` } }
        )
      );

      const updateResults = await Promise.all(updatePromises);

      // Log each update result for debugging
      updateResults.forEach((updateResult, index) => {
        console.log(`Document ${index + 1}:`, updateResult);
      });

      res.status(200).json({ message: "Documents updated successfully", updatedCount: updatePromises.length });
    });


    //access

    app.patch('/users/accessOn/:id',verifyToken,verifyAdmin, async( req, res) =>{
      const id = req.params.id;
      const filter = { _id : new ObjectId(id)};
      const updatedUser = {
        $set:{
          access:'on'
        }
      }
      const result = await userCollection.updateOne(filter,updatedUser);
      res.send(result);
    })
    app.patch('/users/accessOff/:id',verifyToken,verifyAdmin, async( req, res) =>{
      const id = req.params.id;
      const filter = { _id : new ObjectId(id)};
      const updatedUser = {
        $set:{
          access:'off'
        }
      }
      const result = await userCollection.updateOne(filter,updatedUser);
      res.send(result);
    })
  
  


    
    
    


    

    
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

    app.get('/users',verifyToken, async(req,res) =>{
      console.log( 'user get',req.headers);
      const result = await userCollection.find().toArray();
      res.send(result);
    })

    app.delete('/users/:id',verifyToken,verifyAdmin, async(req, res) =>{
      const id = req.params.id;
      const query = { _id : new ObjectId(id)};
      const result = await userCollection.deleteOne(query);
      res.send(result);
    })



    //admin related

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

    //creator related

    app.patch('/users/creator/:id',verifyToken,verifyAdmin, async( req, res) =>{
      const id = req.params.id;
      const filter = { _id : new ObjectId(id)};
      const updatedUser = {
        $set:{
          role:'creator'
        }
      }
      const result = await userCollection.updateOne(filter,updatedUser);
      res.send(result);
    })

    app.get('/users/creator/:email',verifyToken, async(req, res) =>{
      const email = req.params.email;
      if(email !== req.decoded.email){
        return res.status(403).send({message: 'unauthorized access'})
      }

      const query = { email: email};
      const user = await userCollection.findOne(query);
      let creator = false;
      if(user){
        creator = user?.role === 'creator'
      }
      res.send({ creator })
    })




    

    


    //winner details
    app.post('/winnerDetails', async(req,res) =>{
      const detail = req.body;
      const result = await winnerCollection.insertOne(detail);
      res.send(result);
    })

    app.get('/winnerDetails',async (req, res) => {
      const result = await winnerCollection.find().toArray();
      res.send(result);
    });

    app.put('/winnerDetails/',async(req, res) =>{
      const options = {upsert: true};
      const updatedTask = req.body;
      const Task = {
        $set:{
        name:updatedTask.name,
        description:updatedTask.description ,
        price:updatedTask.price,
        gift:updatedTask.gift ,
        submission:updatedTask.submission ,
        date:updatedTask.date ,
        image:updatedTask.image,
        tag:updatedTask.tag,
        }
      }

      const result = await contestCollection.updateOne(filter, Task, options);
      res.send(result);
    })



    //comment 
    app.post('/commentDetails', async(req,res) =>{
      const comment = req.body;
      const result = await commentCollection.insertOne(comment);
      res.send(result);
    })

    app.get('/commentDetails',async (req, res) => {
      const result = await commentCollection.find().toArray();
      res.send(result);
    });

    app.delete('/commentDetails/:id', async(req, res) =>{
      const id = req.params.id;
      console.log(id);
      const query = { _id : new ObjectId(id)};
      const result = await commentCollection.deleteOne(query);
      res.send(result);
    })
    


    //personal

    app.post('/personalDetails',  async (req, res) => {
      const item = req.body;
      const result = await personalCollection.insertOne(item);
      res.send(result);
    });

    app.get('/personalDetails',async (req, res) => {
      const result = await personalCollection.find().toArray();
      res.send(result);
    });
    

    app.patch('/personalDetails/accessOff',verifyToken,verifyAdmin, async( req, res) =>{
      const email = req.query.email
      const query = { email: email};
      const updatedUser = {
        $set:{
          access:'off'
        }
      }
      const result = await personalCollection.updateOne(query,updatedUser);
      res.send(result);
    })
    app.patch('/personalDetails/accessOn',verifyToken,verifyAdmin, async( req, res) =>{
      const email = req.query.email
      const query = { email: email};
      const updatedUser = {
        $set:{
          access:'on'
        }
      }
      const result = await personalCollection.updateOne(query,updatedUser);
      res.send(result);
    })


    //card payment
    app.post('/create-payment-intent', async(req,res) =>{
      const { price } = req.body;
      const amount = parseInt(price*100);

      const paymentIntent = await stripe.paymentIntents.create({
        amount:amount,
        currency:'usd',
        payment_method_types:['card']
      });

      res.send({
        clientSecret: paymentIntent.client_secret
      })
    })

    app.post('/payments',  async (req, res) => {
      const item = req.body;
      const result = await paymentsCollection.insertOne(item);
      res.send(result);
    });

    app.get('/payments', async(req,res) =>{
      const result = await paymentsCollection.find().toArray();
      res.send(result);
    })



    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    // console.log("Pinged your deployment. You successfully connected to MongoDB!");
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