// s3.js
const AWS = require('aws-sdk');
const crypto = require('crypto');
const { promisify } = require('util');
const randomBytes = promisify(crypto.randomBytes);

AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID_CK,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY_CK,
  region: 'us-east-1',
});

const s3 = new AWS.S3();

async function generateUploadURL(contentType) {
  const rawBytes = await randomBytes(16);
  const imageName = rawBytes.toString('hex');

  const params = {
    Bucket: 'hi-bro-profile-bucket',
    Key: imageName,
    ContentType: contentType

  }

  console.log('hahaha');

  return s3.getSignedUrl('putObject', params);
}

module.exports = generateUploadURL;
