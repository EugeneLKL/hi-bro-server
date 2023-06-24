const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const prisma = new PrismaClient();

async function createNewPost(req, res) {
  try {
    const { title, content } = req.body.formData;
    
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
}

module.exports = createNewPost;
