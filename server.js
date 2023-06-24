const express = require("express");
const { PrismaClient } = require("@prisma/client");
const createNewPost = require("./createNewPost.js");
const cors = require("cors");
const { generateUploadURL } = require("./s3.js");
const prisma = new PrismaClient();
const app = express();
const port = 5000;

app.use(
  cors({
    origin:
      process.env.NODE_ENV === "production"
        ? `https://${process.env.DOMAIN}`
        : ["http://localhost:3000"],
    credentials: true,
  })
);

// Middleware to parse JSON request bodies
app.use(express.json());

// app.get("/s3Url", async (req, res) => {
//   try {
//     const s3Data = await generateUploadURL();
//     res.send(s3Data);
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ error: "Internal Server Error" });
//   }
// });

// POST /api/posts route handler
app.post("/api/posts", async (req, res) => {
  try {
    const { title, content, imageUrl } = req.body.formData;

    const newPost = await prisma.hikingPost.create({
      data: {
        title,
        content,
      },
    });

    res.status(201).json(newPost);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// GET /api/posts route handler
app.get("/api/posts", async (req, res) => {
  try {
    const posts = await prisma.hikingPost.findMany();
    res.json(posts);

    console.log(posts)

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server started on port ${port}`);
});
