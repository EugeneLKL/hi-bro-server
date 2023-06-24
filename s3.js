const dotenv = require("dotenv");
const aws = require("aws-sdk");
const { S3Client, PutObjectCommand, GetObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

const { v4: uuidv4 } = require("uuid");
const crypto = require("crypto");
const { promisify } = require("util");
const randomBytes = promisify(crypto.randomBytes);

dotenv.config();
const region = "ap-southeast-1";
const bucketName = "upload-s3-hibro-application";
const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

const s3 = new S3Client({
  region,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
});

async function generateUploadURL() {
  const rawBytes = await randomBytes(16);
  const imageName = rawBytes.toString("hex");

  const s3Params = {
    Bucket: bucketName,
    Key: imageName,
  };

  const command = new GetObjectCommand(s3Params);
  const uploadUrl = await getSignedUrl(s3, command);

  return uploadUrl;
}

module.exports = { generateUploadURL };
