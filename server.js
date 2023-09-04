const express = require("express");
const { PrismaClient } = require("@prisma/client");
const multer = require("multer");
const uploadFileToS3 = require("./s3Upload");

const prisma = new PrismaClient();
const cors = require('cors');
const app = express();
const port = 5000;

app.use(express.json());
app.use(cors());

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
      (key) => `https://upload-s3-hibro-application.s3.amazonaws.com/${key}`
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

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// GET /api/posts/:postId route handler
app.get("/api/posts/:postId", async (req, res) => {
  try {
    const { postId } = req.params;
    const post = await prisma.hikingPost.findUnique({
      where: {
        postId,
      },
    });
    res.json([post]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// DELETE /api/posts/:postId route handler
app.delete("/api/posts/:postId", async (req, res) => {
  try {
    const { postId } = req.params;

    // Delete comments associated with the post
    await prisma.comment.deleteMany({
      where: {
        postId,
      },
    });

    // Delete the post
    await prisma.hikingPost.delete({
      where: {
        postId,
      },
    });

    res.json({ message: "Post deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});


// PATCH /api/posts/:postId route handler
app.patch("/api/posts/:postId", async (req, res) => {
  try {
    const { postId } = req.params;
    const { title, content, imageUrl } = req.body;

    const post = await prisma.hikingPost.update({
      where: {
        postId,
      },
      data: {
        title,
        content,
        imageUrl,
      },
    });

    res.json(post);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// GET /api/search route handler
app.get("/api/search", async (req, res) => {
  try {
    const { query } = req.query;
    const posts = await prisma.hikingPost.findMany({
      where: {
        title: {
          contains: query,
          mode: "insensitive",
        },
      },
    });

    res.json(posts);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// PATCH /api/votes/:postId route handler
app.patch("/api/votes/:postId", async (req, res) => {
  try {
    const { postId } = req.params;
    const { voteCounter } = req.body;

    const hikingVote = await prisma.hikingPost.update({
      where: {
        postId,
      },
      data: {
        voteCounter,
      },
    });

    res.json(hikingVote);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// GET /api/votes/:postId route handler
app.get("/api/votes/:postId", async (req, res) => {
  try {
    const { postId } = req.params;
    const hikingVote = await prisma.hikingPost.findUnique({
      where: {
        postId,
      },
    });
    res.json(hikingVote);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// POST /api/posts/:postId/comments route handler
app.post("/api/posts/:postId/comments", async (req, res) => {
  try {
    const { postId } = req.params;
    const { comment } = req.body;
    const newComment = await prisma.comment.create({
      data: {
        postId, 
        comment, 
      },
    });

    res.status(201).json(newComment);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// GET /api/posts/:postId/comments route handler 
app.get("/api/posts/:postId/comments", async (req, res) => {
  try {
    const { postId } = req.params;
    const comments = await prisma.comment.findMany({
      where: {
        postId,
      },
    });
    res.json(comments);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// GET /api/users route handler
app.get("/api/users", async (req, res) => {
  try {
    const users = await prisma.user.findMany();
    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// POST /api/posts/:postId/reports route handler
app.post("/api/posts/:postId/report", async (req, res) => {
  try {
    const { postId } = req.params;
    const { title, content } = req.body; 
    const newReport = await prisma.report.create({
      data: {
        postId, 
        reportTitle: title,
        reportContent: content, 
      },
    });

    res.status(201).json(newReport);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// POST /api/trails route handler
app.post("/api/trails", async (req, res) => {
  try {
    const { trailName, trailLat, trailLng, trailType, trailLength, trailDifficulty, trailDescription, trailImagesUrl, estimatedDuration, amenities } = req.body;
 
    const newTrail = await prisma.trail.create({
      data: {
        trailName,
        trailLat,
        trailLng,
        trailType,
        trailDifficulty,
        trailLength,
        trailDescription,
        trailImagesUrl,
        estimatedDuration,
        amenities,
      },
    });

    res.status(201).json(newTrail);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// GET /api/trails route handler
app.get("/api/trails", async (req, res) => {
  try {
    const trails = await prisma.trail.findMany();
    res.json(trails);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error | /api/trails" });
  }
});

// GET /api/trails/:trailId route handler
app.get("/api/trails/:trailId", async (req, res) => {
  try {
    const { trailId } = req.params;
    const trail = await prisma.trail.findUnique({
      where: {
        trailId,
      },
    });
    res.json(trail);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error | /api/trails/:trailId" });
  }
});

// Delete /api/trails/:trailId route handler
app.delete("/api/trails/:trailId", async (req, res) => {
  try {
    const { trailId } = req.params;
    const trail = await prisma.trail.delete({
      where: {
        trailId,
      },
    });
    res.json(trail);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error | /api/trails/:trailId" });
  }
});

// PUT /api/trails/:trailId route handler
app.put("/api/trails/:trailId", async (req, res) => {
  try {
    const { trailId } = req.params;
    const {
      trailName,
      trailLat,
      trailLng,
      trailType,
      trailLength,
      trailDifficulty,
      trailDescription,
      trailImagesUrl,
      estimatedDuration,
      amenities,
    } = req.body;

    const existingTrail = await prisma.trail.findUnique({
      where: { trailId },
    });

    if (!existingTrail) {
      return res.status(404).json({ error: "Trail not found" });
    }

    const updatedData = {
      trailName: trailName || existingTrail.trailName,
      trailLat: trailLat || existingTrail.trailLat,
      trailLng: trailLng || existingTrail.trailLng,
      trailType: trailType || existingTrail.trailType,
      trailLength: trailLength || existingTrail.trailLength,
      trailDifficulty: trailDifficulty || existingTrail.trailDifficulty,
      trailDescription: trailDescription || existingTrail.trailDescription,
      trailImagesUrl: trailImagesUrl || existingTrail.trailImagesUrl,
      estimatedDuration: estimatedDuration || existingTrail.estimatedDuration,
      amenities: amenities || existingTrail.amenities,
    };

    const trail = await prisma.trail.update({
      where: {
        trailId,
      },
      data: updatedData,
    });

    res.json(trail);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error | /api/trails/:trailId" });
  }
});

// POST /api/trails/:trailId/reviews route handler
app.post("/api/trails/:trailId/reviews", async (req, res) => {
  try {
    const { trailId } = req.params;
    const { reviewTitle, reviewContent } = req.body;
    const newReview = await prisma.review.create({
      data: {
        trailId,
        reviewTitle,
        reviewContent,
      },
    });

    res.status(201).json(newReview);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error | /api/trails/:trailId/reviews" });
  }
});

// GET /api/trails/:trailId/reviews route handler
app.get("/api/trails/:trailId/reviews", async (req, res) => {
  try {
    const { trailId } = req.params;
    const reviews = await prisma.review.findMany({
      where: {
        trailId,
      },
    });
    res.json(reviews);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error | /api/trails/:trailId/reviews" });
  }
});

//GET /api/trailSearch route handler
app.get("/api/trailSearch", async (req, res) => {
  try {
    const { query } = req.query;
    const trails = await prisma.trail.findMany({
      where: {
        trailName: {
          contains: query,
          mode: "insensitive",
        },
      },
    });

    res.json(trails);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error | /api/trailSearch" });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server started on port ${port}`);
});
