const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 5000;

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.unrqwzu.mongodb.net/?retryWrites=true&w=majority`;
//middleware
app.use(
  cors({
    origin: ["http://localhost:5173"],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const verifyToken = async (req, res, next) => {
  const token = req.cookies?.token;
  console.log(token);
  if (!token) {
    return res.status(401).send({ message: "unauthorized access" });
  }

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: "unauthorized access" });
    }
    req.user = decoded;
    next();
  });
};

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const addJobs = client.db("jobBidPro").collection("addJobs");
    const bidJobsCollection = client.db("jobBidPro").collection("bidJobs");

    app.post("/jwt", async (req, res) => {
      const user = req.body;

      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });

      res
        .cookie("token", token, {
          httpOnly: true,
          secure: true,
          sameSite: "none",
        })
        .send({ success: true });
    });

    app.post("/logout", async (req, res) => {
      const user = req.body;

      res.clearCookie("token", { maxAge: 0 }).send({ success: true });
    });

    app.get("/allJobs", async (req, res) => {
      const data = addJobs.find();
      const result = await data.toArray();
      res.send(result);
    });

    app.get("/job_details/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };

      const result = await addJobs.findOne(query);
      res.send(result);
    });

    app.post("/add_job", verifyToken, async (req, res) => {
      const job = req.body;
      const result = await addJobs.insertOne(job);
      res.send(result);
    });

    app.post("/bid_request", verifyToken, async (req, res) => {
      const bid = req.body;
      const result = await bidJobsCollection.insertOne(bid);
      res.send(result);
    });

    app.get("/my_posted_jobs", verifyToken, async (req, res) => {
      const email = req.query.email;
      const data = addJobs.find({ employer: email });
      const result = await data.toArray();
      res.send(result);
    });

    app.put("/edit_job/:id", async (req, res) => {
      const id = req.params.id;
      const updatedProduct = req.body;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };

      const updatedDoc = {
        $set: {
          employer: updatedProduct.updateJob.employer,
          job: updatedProduct.updateJob.job,
          deadline: updatedProduct.updateJob.deadline,
          description: updatedProduct.updateJob.description,
          category: updatedProduct.updateJob.category,
          minimum: updatedProduct.updateJob.minimum,
          maximum: updatedProduct.updateJob.maximum,
        },
      };

      const result = await addJobs.updateOne(filter, updatedDoc, options);
      res.send(result);
    });

    app.delete("/delete_job/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await addJobs.deleteOne(query);
      res.send(result);
    });

    app.get("/my_bids", verifyToken, async (req, res) => {
      const email = req.query.email;
      const sortDirection = req.query.sort === "asc" ? 1 : -1;
      const data = bidJobsCollection
        .find({ userEmail: email })
        .sort({ status: sortDirection });
      const result = await data.toArray();
      res.send(result);
    });

    app.patch("/my_bids/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const status = req.body.status;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          status: status,
        },
      };
      const result = await bidJobsCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });

    app.get("/my_bid_requests", verifyToken, async (req, res) => {
      const email = req.query.email;
      const data = bidJobsCollection.find({ buyerEmail: email });
      const result = await data.toArray();
      res.send(result);
    });

    app.patch("/my_bid_request/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const status = req.body.status;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          status: status,
        },
      };
      const result = await bidJobsCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log(`Server is running on post ${port}`);
});
