const express = require("express");
const { PrismaClient } = require("@prisma/client");
const multer = require("multer");
const uploadFileToS3 = require("./s3Upload");

const prisma = new PrismaClient();
const app = express();
const port = 5000;

app.use(express.json());

// Set up Multer middleware to handle file uploads
const upload = multer({
  storage: multer.memoryStorage(),
});

// Route handler for image upload
app.post("/upload", upload.array("images", 10), async (req, res) => {
  const files = req.files; // The uploaded image files

  try {
    const uploadPromises = files.map(uploadFileToS3);

    // Wait for all uploads to complete
    const uploadedKeys = await Promise.all(uploadPromises);

    const imageUrl = uploadedKeys.map(
      (key) =>
        `https://upload-s3-hibro-application.s3.amazonaws.com/${key}`
    );

    // Return the image URLs in the response
    return res.json({ imageUrl });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Failed to upload images to S3" });
  }
});

// POST /api/posts route handler
app.post("/api/posts", async (req, res) => {
  try {
    const { title, content, imageUrl } = req.body;

    const newPost = await prisma.hikingPost.create({
      data: {
        title,
        content,
        imageUrl,
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

    console.log(posts);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server started on port ${port}`);
});


