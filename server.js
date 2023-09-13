const express = require("express");
const { PrismaClient } = require("@prisma/client");
const multer = require("multer");
const uploadFileToS3 = require("./s3Upload");

const prisma = new PrismaClient();
const cors = require("cors");
const app = express();
const port = 5000;

app.use(express.json());
app.use(cors());

const generateUploadURL = require("./s3");

app.use(express.json());

const storage = multer.memoryStorage();

// Set up Multer middleware to handle file uploads
const upload = multer({
  storage: multer.memoryStorage(),
});

app.get("/api/s3Url", async (req, res) => {
  // console log res
  console.log("res", req.query);
  try {
    const { contentType } = req.query;
    const url = await generateUploadURL(contentType);
    console.log("done");

    res.send({ url });
  } catch (error) {
    console.error("Error generating upload URL:", error);
    res
      .status(500)
      .json({ error: "An error occurred while generating upload URL" });
  }
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
    console.log(imageUrl);
    return res.json({ imageUrl });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Failed to upload images to S3" });
  }
});

// POST /api/posts route handler
app.post("/api/posts", async (req, res) => {
  try {
    const { title, content, imageUrl, userId } = req.body;

    const newPost = await prisma.hikingPost.create({
      data: {
        title,
        content,
        imageUrl,
        userId,
      },
    });

    res.status(201).json(newPost);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error | /api/posts" });
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

      //Get username and userprofilepicture with the post
      include: {
        user: {
          select: {
            userId: true,
            userName: true,
            profileImage: true,
          },
        },
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
    const { userId, comment } = req.body;
    const newComment = await prisma.comment.create({
      data: {
        postId,
        userId,
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
      include: {
        user: {
          select: {
            userName: true,
            profileImage: true,
          },
        },
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
      userId,
    } = req.body;

    const newTrail = await prisma.trail.create({
      data: {
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
        userId,
      },
    });

    res.status(201).json(newTrail);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error | /api/trails" });
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

// GET /api/trails/:trailId route handler with trail rating
app.get("/api/trails/:trailId", async (req, res) => {
  try {
    const { trailId } = req.params;
    const trail = await prisma.trail.findUnique({
      where: {
        trailId,
      },
      include: {
        trailRating: true,
      },
    });
    res.json(trail);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error | /api/trails" });
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
    res
      .status(500)
      .json({ error: "Internal Server Error | /api/trails/:trailId" });
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
    res
      .status(500)
      .json({ error: "Internal Server Error | /api/trails/:trailId" });
  }
});

// POST /api/trails/:trailId/reviews route handler
app.post("/api/trails/:trailId/reviews", async (req, res) => {
  try {
    const { trailId } = req.params;
    const { reviewTitle, reviewContent, userId } = req.body;
    const newReview = await prisma.review.create({
      data: {
        trailId,
        reviewTitle,
        reviewContent,
        userId,
      },
    });

    res.status(201).json(newReview);
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ error: "Internal Server Error | /api/trails/:trailId/reviews" });
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
      include: {
        user: {
          select: {
            userName: true,
            profileImage: true,
          },
        },
      },
    });
    res.json(reviews);
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ error: "Internal Server Error | /api/trails/:trailId/reviews" });
  }
});

// POST /api/trails/:trailId/ratings route handler
app.post("/api/trails/:trailId/rating", async (req, res) => {
  try {
    const { trailId } = req.params;
    const { rating } = req.body;

    const newRating = await prisma.trailRating.create({
      data: {
        trailId,
        userId: req.body.userId,
        rating,
      },
    });

    res.status(201).json(newRating);
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ error: "Internal Server Error | /api/trails/:trailId/ratings" });
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

// POST /api/trails/:trailId/favorites route handler
app.post("/api/trails/:trailId/favorites", async (req, res) => {
  try {
    const { trailId } = req.params;
    const { userId } = req.body;

    console.log(trailId, userId)

    const newFavorite = await prisma.savedTrails.create({
      data: {
        trailId,
        userId,
      },
    });

    console.log(newFavorite)

    res.status(201).json(newFavorite);
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ error: "Internal Server Error | /api/trails/:trailId/favorites" });
  }
});

// GET /api/trails/:trailId/favorites route handler based on userId
app.get("/api/trails/:userId/favorites", async (req, res) => {
  try {
    const { trailId } = req.params;
    const { userId } = req.body;

    const newFavorite = await prisma.savedTrails.findMany({
      where: {
        trailId,
        userId,
      },
      include: {
        trail: true,
      },
    });

    res.status(201).json(newFavorite);
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ error: "Internal Server Error | /api/trails/:trailId/favorites" });
  }
});


// POST the image directly to the s3 bucket
app.post("/api/uploadImage", upload.single("image"), async (req, res) => {
  try {
    const { image } = req.file;
    const userId = req.body.userId; // Assuming you have the userId available in the request body

    // Extract the file extension from the original filename
    const fileExtension = image.originalname.split(".").pop();
    console.log(fileExtension);

    // Generate a pre-signed URL for image upload using the userId and file extension
    console.log("uploadImage:", fileExtension);
    const s3Url = await generateUploadURL(fileExtension);

    // Upload the image to the S3 URL using a library like axios or fetch
    // Example using axios:
    await axios.put(s3Url, image.buffer, {
      headers: { "Content-Type": image.mimetype },
    });

    res.status(200).json({ s3Url });
  } catch (error) {
    console.error("Error uploading image:", error);
    res.status(500).json({ error: "An error occurred while uploading image" });
  }
});

// Receive the data for new registered user send from frontend
app.post("/api/register", upload.single("profilePicture"), async (req, res) => {
  try {
    const {
      userName,
      userEmail,
      password,
      phoneNum,
      birthDate,
      gender,
      profileImage,
    } = req.body;

    // Diospaly profile image
    console.log("profileImage", profileImage);

    // Create a new user with Prisma and store the S3 URL
    const newUser = await prisma.user.create({
      data: {
        userName,
        userEmail,
        password,
        phoneNum,
        birthDate,
        gender,
        profileImage,
      },
    });

    res.status(201).json(newUser);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Unable to register user" });
  }
});

// Check whether the email has been existed in the database
app.get("/api/checkEmail", async (req, res) => {
  console.log("Backend received");

  // Check what has received
  console.log(req.query);

  const { userEmail } = req.query;

  console.log("data received:", userEmail);

  try {
    // Get the value received
    console.log("Inside try");

    const result = await prisma.user.findUnique({
      where: {
        userEmail: userEmail,
      },
    });
    console.log(result);
    if (result) {
      res.status(200).json(false);
    } else {
      res.status(200).json(true);
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Unable to check email" });
  }
});

// Check whether the phone has been existed in the database
app.get("/api/checkPhone", async (req, res) => {
  console.log("Backend received");

  // Check what has received
  console.log(req.query);

  const { userPhone } = req.query;

  console.log("data received:", userPhone);

  try {
    // Get the value received
    console.log("Inside try");

    const result = await prisma.user.findUnique({
      where: {
        phoneNum: userPhone,
      },
    });
    console.log(result);
    if (result) {
      res.status(200).json(false);
    } else {
      res.status(200).json(true);
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Unable to check phone number" });
  }
});

// Check whether the user has login with the registered email
app.get("/api/checkUserRegister", async (req, res) => {
  console.log("Backend received");
  // Check what has received
  console.log(req.query);
  const { userEmail } = req.query;
  console.log("data received:", userEmail);
  try {
    // Get the value received
    console.log("Inside try");
    const result = await prisma.user.findUnique({
      where: {
        userEmail: userEmail,
      },
    });
    console.log(result);
    res.status(200).json(result);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Unable to check user" });
  }
});

// Get the user information based on the userID
app.get("/api/getUserInfo/:userID", async (req, res) => {
  console.log("Backend User Info received");
  // Check what has received
  console.log(req.params);
  const { userID } = req.params;

  console.log("data received:", userID);
  try {
    // Get the value received
    console.log("Inside try");
    const result = await prisma.user.findUnique({
      where: {
        userId: userID,
      },
    });
    console.log(result);
    res.status(200).json(result);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Unable to get user information" });
  }
});

// Get the image URL for a user
app.get("/api/getUserImageURL/:userId", async (req, res) => {
  try {
    console.log("Get user image");
    const userId = req.params.userId;
    // Fetch user data from the database
    const userData = await getUserData(userId);
    if (!userData) {
      return res.status(404).json({ error: "User not found" });
    }
    // Get the profileImage URL from the user data
    const imageUrl = userData.profileImage;
    res.json({ imageUrl });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Edit Profile

// Add a new PATCH route to update the user's name
app.patch("/api/updateUserName/:userId", async (req, res) => {
  const { userId } = req.params;
  const { newName } = req.body;

  try {
    // Update the user's name in the database
    const updatedUser = await prisma.user.update({
      where: {
        userId: userId,
      },
      data: {
        userName: newName,
      },
    });

    res.status(200).json(updatedUser);
  } catch (error) {
    console.error("Error updating user name:", error);
    res
      .status(500)
      .json({ error: "An error occurred while updating user name" });
  }
});

// Add a new PATCH route to update the user's gender
app.patch("/api/updateUserGender/:userId", async (req, res) => {
  const { userId } = req.params;
  const { newGender } = req.body;
  try {
    // Update the user's gender in the database
    const updatedUser = await prisma.user.update({
      where: {
        userId: userId,
      },
      data: {
        gender: newGender,
      },
    });
    res.status(200).json(updatedUser);
  } catch (error) {
    console.error("Error updating user gender:", error);
    res
      .status(500)
      .json({ error: "An error occurred while updating user gender" });
  }
});

// Add a new PATCH route to update the user's birth date
app.patch("/api/updateUserBirthdate/:userId", async (req, res) => {
  const { userId } = req.params;
  const { newBirthDate } = req.body;
  // display
  console.log("newBirthDate", newBirthDate);

  try {
    // Update the user's birth date in the database
    const updatedUser = await prisma.user.update({
      where: {
        userId: userId,
      },
      data: {
        birthDate: newBirthDate,
      },
    });
    res.status(200).json(updatedUser);
  } catch (error) {
    console.error("Error updating user birth date:", error);
    res
      .status(500)
      .json({ error: "An error occurred while updating user birth date" });
  }
});

// Add a new PATCH route to update the user's phone number
app.patch("/api/updateUserPhone/:userId", async (req, res) => {
  const { userId } = req.params;
  const { newPhone } = req.body;

  try {
    // Check if the new phone number is already associated with another user
    const existingUserWithPhone = await prisma.user.findUnique({
      where: {
        phoneNum: newPhone,
      },
    });

    if (existingUserWithPhone && existingUserWithPhone.userId !== userId) {
      // Another user is already using the new phone number
      return res
        .status(400)
        .json({ error: "Phone number is already in use by another user" });
    }

    // Update the user's phone number in the database
    const updatedUser = await prisma.user.update({
      where: {
        userId: userId,
      },
      data: {
        phoneNum: newPhone,
      },
    });

    res.status(200).json(updatedUser);
  } catch (error) {
    console.error("Error updating user phone number:", error);
    res
      .status(500)
      .json({ error: "An error occurred while updating user phone number" });
  }
});

// check user password
app.get("/api/getUserPassword", async (req, res) => {
  console.log("Backend received");
  // Check what has received
  console.log(req.query);
  const { userId } = req.query;
  console.log("data received:", userId);
  try {
    // Get the value received
    console.log("Inside try");
    const result = await prisma.user.findUnique({
      where: {
        userId: userId,
      },
    });
    console.log("Result: ", result);
    res.status(200).json(result);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Unable to check user" });
  }
});

// Add a new PATCH route to update the user's password
app.patch("/api/updateUserPassword/:userId", async (req, res) => {
  const { userId } = req.params;
  const { newPassword } = req.body;

  console.log("New password: ", newPassword);

  try {
    const updatedUser = await prisma.user.update({
      where: {
        userId: userId,
      },
      data: {
        password: newPassword,
      },
    });
    res.status(200).json(updatedUser);
  } catch (error) {
    console.error("Error updating user password:", error);
    res
      .status(500)
      .json({ error: "An error occurred while updating user password" });
  }
});

// Add a new PATCH route to update the user's profile picture
app.patch("/api/updateUserProfileImage/:userId", async (req, res) => {
  const { userId } = req.params;
  const { newProfilePhoto } = req.body;
  console.log("new Profile Picture", newProfilePhoto);
  try {
    const updatedUser = await prisma.user.update({
      where: {
        userId: userId,
      },
      data: {
        profileImage: newProfilePhoto,
      },
    });
    res.status(200).json(updatedUser);
  } catch (error) {
    console.error("Error updating user profile picture:", error);
    res
      .status(500)
      .json({ error: "An error occurred while updating user profile picture" });
  }
});

// Travel

// CREATE travle post
app.post("/api/createTravelBuddyPost", async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      destination,
      buddyPreference,
      additionalInfo,
      userId,
    } = req.body;

    // Convert startDate and endDate to Date objects
    const formattedStartDate = new Date(startDate);
    const formattedEndDate = new Date(endDate);

    console.log(buddyPreference);

    // Parse the buddyPreference JSON string back to an array
    const parsedBuddyPreference = JSON.parse(buddyPreference);

    // Create a new TravelPost in the database
    const newTravelPost = await prisma.travelPost.create({
      data: {
        startDate: formattedStartDate,
        endDate: formattedEndDate,
        destination,
        buddyPreference: {
          set: parsedBuddyPreference,
        },
        additionalInfo,
        creator: {
          connect: {
            userId: userId,
          },
        },
      },
    });

    console.log("New Travel Post created:", newTravelPost);

    res.status(201).json({
      message: "Travel Post created successfully",
      data: newTravelPost,
    });
  } catch (error) {
    console.error("Error creating Travel Post:", error);
    res
      .status(500)
      .json({ error: "An error occurred while creating the Travel Post" });
  }
});

// GET the travel post
app.get("/api/getTravelBuddyPost", async (req, res) => {
  console.log("Get Post Backend");

  try {
    const allTravelPost = await prisma.travelPost.findMany({
      include: {
        creator: true,
      },
    });

    console.log("All Travel Post:", allTravelPost);

    res.status(200).json(allTravelPost);
  } catch (error) {
    console.error("Error getting all Travel Post:", error);
    res
      .status(500)
      .json({ error: "An error occurred while getting all Travel Post" });
  }
});



// GET travel post details by travelPostId
app.get("/api/getTravelBuddyPostDetails/:travelPostId", async (req, res) => {
  try {
    const { travelPostId } = req.params;
    
    const singleTravelPost = await prisma.travelPost.findFirst({
      where: {
        travelPostId: travelPostId, // This assumes the primary key column name in your Prisma model is 'id'. Replace with 'travelPostId' if that's your primary key.
      },
    });

    console.log(`Single Travel Post Details ${singleTravelPost}`);
    res.status(200).json(singleTravelPost);
  } catch (error) {
    console.error("Error getting single Travel Post:", error);
    res
      .status(500)
      .json({ error: "An error occurred while getting single Travel Post" });
  }
});

// /api/getAllBuddyRequests
app.get("/api/getAllBuddyRequests", async (req, res) => {
  try {
    const allBuddyRequests = await prisma.buddyRequest.findMany({
      include: {
        requester: true,
        post: true,
      },
    });
    console.log('All Buddy Requests:', allBuddyRequests );
    res.status(200).json(allBuddyRequests);
  } catch (error) {
    console.error("Error getting all Buddy Requests:", error);
    res
      .status(500)
      .json({ error: "An error occurred while getting all Buddy Requests" });
  }
});

// /api/deleteBuddyRequest/${requestId}
app.delete("/api/deleteBuddyRequest/:requestId", async (req, res) => {
  try {
    const { requestId } = req.params;
    const deletedBuddyRequest = await prisma.buddyRequest.delete({
      where: {
        buddyRequestId: requestId,
      },
    });
    console.log(`Deleted Buddy Request ${requestId}`);
    res.status(200).json({ message: `Deleted Buddy Request ${requestId}` });
  } catch (error) {
    console.error("Error deleting Buddy Request:", error);
    res
      .status(500)
      .json({ error: "An error occurred while deleting Buddy Request" });
  }
});



// DELETE travel post by id (/api/deleteTravelBuddyPost)
app.delete("/api/deleteTravelBuddyPost/:travelPostId", async (req, res) => {
  try {
    const { travelPostId } = req.params;

    if (!travelPostId) {
      return res.status(400).json({ error: "Missing travelPostId parameter" });
    }

    // First, find the TravelPost to obtain related BuddyRequest IDs
    const travelPost = await prisma.travelPost.findUnique({
      where: {
        travelPostId: travelPostId,
      },
      include: {
        buddyRequests: {
          select: {
            buddyRequestId: true,
          },
        },
      },
    });

    if (!travelPost) {
      return res.status(404).json({ error: "Travel Post not found" });
    }

    // Extract BuddyRequest IDs
    const buddyRequestIds = travelPost.buddyRequests.map(
      (request) => request.buddyRequestId
    );

    // Use Prisma to delete related BuddyRequest records first
    await prisma.buddyRequest.deleteMany({
      where: {
        buddyRequestId: {
          in: buddyRequestIds,
        },
      },
    });

    // Then, delete the TravelPost
    await prisma.travelPost.delete({
      where: {
        travelPostId: travelPostId,
      },
    });

    console.log(`Deleted Travel Post ${travelPostId}`);
    res.status(200).json({ message: `Deleted Travel Post ${travelPostId}` });
  } catch (error) {
    console.error("Error deleting Travel Post:", error);
    res
      .status(500)
      .json({ error: "An error occurred while deleting Travel Post" });
  }
});

// GET travel request log
app.get("/api/getTravelBuddyRequestLog", async (req, res) => {
  try {
    const allTravelRequest = await prisma.BuddyRequest.findMany({
      include: {
        requester: true,
        post: true,
      },
    });
    // console.log(`All Buddy Requests: ${JSON.stringify(allTravelRequest)}`);
    res.status(200).json(allTravelRequest);
  } catch (error) {
    console.error("Error getting all Buddy Requests:", error);
    res
      .status(500)
      .json({ error: "An error occurred while getting all Buddy Requests" });
  }
});

// CREATE travel request
app.post("/api/createTravelBuddyRequest", async (req, res) => {
  console.log("Create Request Backend");
  console.log(req.body);

  try {
    const { userId, postId } = req.body; // Extract userId and postId from req.body

    const newTravelRequest = await prisma.BuddyRequest.create({
      data: {
        requester: {
          connect: {
            userId: userId,
          },
        },
        post: {
          connect: {
            travelPostId: postId,
          },
        },
      },
    });

    console.log("New Buddy Request created:", newTravelRequest);

    res.status(201).json({
      message: "Travel Request created successfully",
      data: newTravelRequest,
    });
  } catch (error) {
    console.error("Error creating Travel Request:", error);
    res
      .status(500)
      .json({ error: "An error occurred while creating the Travel Request" });
  }
});

// Get the requested posts with requester and post owner information
app.get("/api/getRequestedPosts", async (req, res) => {
  try {
    const requestedPosts = await prisma.BuddyRequest.findMany({
      where: {
        post: {
          buddyFound: false, // Only get posts where buddyFound is false
        },
        requestStatus: "Pending", // Filter by requestStatus 'Pending'
      },
      include: {
        post: {
          select: {
            travelPostId: true,
            startDate: true,
            endDate: true,
            destination: true,
            creator: {
              select: {
                userId: true,
                userName: true,
                profileImage: true,
              },
            },
          },
        },
        requester: {
          select: {
            userId: true,
            userName: true,
            gender: true,
            profileImage: true,
          },
        },
      },
    });

    console.log("Requested Posts:", requestedPosts);

    const formattedRequestedPosts = requestedPosts.map((request) => {
      return {
        post: request.post,
        requester: request.requester,
        requestId: request.buddyRequestId,
      };
    });

    res.status(200).json(formattedRequestedPosts);
  } catch (error) {
    console.error("Error getting requested posts:", error);
    res
      .status(500)
      .json({ error: "An error occurred while getting requested posts" });
  }
});

// Get the pending request post with the post owner information
app.get("/api/getPendingRequests", async (req, res) => {
  console.log("Trying");
  try {
    const { userId } = req.query;
    console.log("userId", userId);
    const pendingRequests = await prisma.BuddyRequest.findMany({
      include: {
        post: {
          select: {
            travelPostId: true,
            startDate: true,
            endDate: true,
            destination: true,
            buddyFound: true,
            buddyPreference: true,
            additionalInfo: true,
            creator: {
              select: {
                userId: true,
                userName: true,
                profileImage: true,
                birthDate: true,
                gender: true,
              },
            },
          },
        },
        requester: {
          select: {
            userId: true,
            userName: true,
          },
        },
      },
    });
    console.log("pending requests", pendingRequests);
    const formattedPendingRequests = pendingRequests.map((request) => {
      return {
        buddyRequestId: request.buddyRequestId,
        post: request.post,
        creator: request.post.creator,
        requester: request.requester,
        requestStatus: request.requestStatus,
      };
    });
    console.log("formatted Pending Requests ", formattedPendingRequests);
    res.status(200).json(formattedPendingRequests);
  } catch (error) {
    console.error("Error getting pending requests:", error);
    res
      .status(500)
      .json({ error: "An error occurred while getting pending requests" });
  }
});

app.post("/api/acceptBuddyRequest", async (req, res) => {
  const { userId, postId } = req.body;

  try {
    // Update the TravelPost to store the accepted buddy's userId and set buddyFound to true
    const updatedTravelPost = await prisma.travelPost.update({
      where: { travelPostId: postId },
      data: {
        buddyId: userId,
        buddyFound: true,
      },
    });

    // Find all other BuddyRequests for the same post and mark them as rejected
    await prisma.buddyRequest.updateMany({
      where: {
        postId: postId,
        NOT: {
          requesterId: userId, // Exclude the accepted request from rejection
        },
      },
      data: {
        requestStatus: "Rejected",
      },
    });

    // Find the BuddyRequest to update the requestStatus
    const buddyRequest = await prisma.buddyRequest.findFirst({
      where: {
        postId: postId,
        requesterId: userId,
      },
    });

    if (!buddyRequest) {
      throw new Error("Buddy request not found");
    }

    // Update the BuddyRequest to set requestStatus to 'Accepted'
    const updatedBuddyRequest = await prisma.buddyRequest.update({
      where: { buddyRequestId: buddyRequest.buddyRequestId },
      data: {
        requestStatus: "Accepted",
      },
    });

    res.status(200).json({ message: "Buddy request accepted successfully" });
  } catch (error) {
    console.error("Error accepting buddy request:", error);
    res
      .status(500)
      .json({ error: "An error occurred while accepting the buddy request" });
  }
});

app.post("/api/rejectBuddyRequest", async (req, res) => {
  const { userId, postId } = req.body;

  console.log(userId, postId);

  try {
    // Delete the BuddyRequest to reject the request
    const buddyRequest = await prisma.buddyRequest.findFirst({
      where: {
        postId: postId,
        requesterId: userId,
      },
    });

    if (!buddyRequest) {
      throw new Error("Buddy request not found");
    }

    // Update the BuddyRequest to set requestStatus to 'Rejected'
    await prisma.buddyRequest.update({
      where: { buddyRequestId: buddyRequest.buddyRequestId },
      data: {
        requestStatus: "Rejected",
      },
    });

    res.status(200).json({ message: "Buddy request rejected successfully" });
  } catch (error) {
    console.error("Error rejecting buddy request:", error);
    res
      .status(500)
      .json({ error: "An error occurred while rejecting the buddy request" });
  }
});

// Get the post that has been find a buddy
app.get("/api/getBuddyFoundPosts", async (req, res) => {
  try {
    const buddyFoundPosts = await prisma.travelPost.findMany({
      where: {
        buddyFound: true,
      },
      include: {
        creator: true,
      },
    });
    console.log("buddy found posts", buddyFoundPosts);
    res.status(200).json(buddyFoundPosts);
  } catch (error) {
    console.error("Error getting buddy found posts:", error);
    res
      .status(500)
      .json({ error: "An error occurred while getting buddy found posts" });
  }
});

// ---------------------------Useless-----------------------------------------

// Get requester information based on requesterIds
app.get("/api/getRequesters", async (req, res) => {
  try {
    const { requesterIds } = req.query;
    const requesterIdsArray = requesterIds.split(",");

    const requesters = await prisma.BuddyRequest.findMany({
      where: {
        requesterId: {
          in: requesterIdsArray,
        },
      },
      include: {
        requester: true,
      },
    });

    const requesterInfo = requesters.map((requester) => ({
      requesterId: requester.requesterId,
      profilePic: requester.requester.profilePic,
      name: requester.requester.name,
    }));

    res.status(200).json(requesterInfo);
  } catch (error) {
    console.error("Error getting requester information:", error);
    res
      .status(500)
      .json({ error: "An error occurred while getting requester information" });
  }
});

// Get the travel posts owned by the user
app.get("/api/getUserOwnedPosts", async (req, res) => {
  try {
    const userOwnedPosts = await prisma.TravelPost.findMany({
      where: {
        creatorId: userId,
      },
      select: {
        travelPostId: true,
        startDate: true,
        endDate: true,
        destination: true,
      },
    });

    console.log("User Owned Posts:", userOwnedPosts);

    res.status(200).json(userOwnedPosts);
  } catch (error) {
    console.error("Error getting user owned posts:", error);
    res
      .status(500)
      .json({ error: "An error occurred while getting user owned posts" });
  }
});

// Update the status when the owner accepts a buddy request
app.put("/api/acceptBuddyRequest/:postId/:requesterId", async (req, res) => {
  const { postId, requesterId } = req.params;

  try {
    // Update the travel post's buddyFound status
    const updatedTravelPost = await prisma.TravelPost.update({
      where: {
        travelPostId: postId,
      },
      data: {
        buddyFound: true,
      },
    });

    // You can perform additional actions here, such as updating the BuddyRequest status

    console.log("Travel Post status updated:", updatedTravelPost);

    res
      .status(200)
      .json({ message: "Travel Post status updated successfully" });
  } catch (error) {
    console.error("Error updating Travel Post status:", error);
    res
      .status(500)
      .json({ error: "An error occurred while updating Travel Post status" });
  }
});

app.put("/api/acceptBuddyRequest/:postId/:requesterId", async (req, res) => {
  const { postId, requesterId } = req.params;

  try {
    const updatedTravelPost = await prisma.TravelPost.update({
      where: {
        travelPostId: postId,
      },
      data: {
        buddyFound: true,
        buddyId: requesterId, // Store the buddy's userId
      },
    });

    console.log("Travel Post status updated:", updatedTravelPost);

    // You can update the BuddyRequest status here

    res
      .status(200)
      .json({ message: "Travel Post status updated successfully" });
  } catch (error) {
    console.error("Error updating Travel Post status:", error);
    res
      .status(500)
      .json({ error: "An error occurred while updating Travel Post status" });
  }
});

// Get the requester user
app.get("/api/getUserPosts/:userID", async (req, res) => {
  try {
    const { userId } = req.params;

    const { postIds } = req.query;

    const userPosts = await prisma.travelPost.findMany({
      where: {
        creatorId: userId,
        travelPostId: {
          in: postIds.split(","),
        },
      },
      include: {
        creator: true,
      },
    });

    console.log("User Posts:", userPosts);

    res.status(200).json(userPosts);
  } catch (error) {
    console.error("Error getting user posts:", error);
    res
      .status(500)
      .json({ error: "An error occurred while getting user posts" });
  }
});

// Get the post id that has been requested
app.get("/api/getTravelBuddyRequest", async (req, res) => {
  try {
    const requestedPostIds = await prisma.BuddyRequest.findMany({
      select: {
        postId: true,
        requesterId: true,
      },
    });

    console.log("Requested Post IDs:", requestedPostIds);

    res.status(200).json(requestedPostIds);
  } catch (error) {
    console.error("Error getting requested post IDs:", error);
    res
      .status(500)
      .json({ error: "An error occurred while getting requested post IDs" });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server started on port ${port}`);
});
