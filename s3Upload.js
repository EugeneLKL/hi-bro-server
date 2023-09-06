const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { v4: uuidv4 } = require("uuid");

// Create an instance of the S3 client
const s3Client = new S3Client({
  region: "ap-southeast-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID_EL,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY_EL,
  },
});

// Function to upload a single file to S3
const uploadFileToS3 = async (file) => {
  const key = `${uuidv4()}`; // Generate a unique key for the image
  const params = {
    Bucket: "upload-s3-hibro-application",
    Key: key,
    Body: file.buffer,
    ContentType: file.mimetype,
  };

  // Upload the file to S3
  await s3Client.send(new PutObjectCommand(params));

  return key;
};

module.exports = uploadFileToS3;
