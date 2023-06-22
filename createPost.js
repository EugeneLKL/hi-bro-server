const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function createNewPost(req, res) {
  try {
    const { title, content } = req.body;

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
