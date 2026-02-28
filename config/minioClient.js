const Minio = require("minio");
const config = require("config");

const minioConfig = config.get("minio");

const minioClient = new Minio.Client({
  endPoint: minioConfig.endPoint,
  port: minioConfig.port,
  useSSL: minioConfig.useSSL,
  accessKey: minioConfig.accessKey,
  secretKey: minioConfig.secretKey,
});

const bucketName = minioConfig.bucketName;

async function ensureBucket() {
  try {
    const exists = await minioClient.bucketExists(bucketName);
    if (!exists) {
      await minioClient.makeBucket(bucketName);
      console.log(`MinIO bucket '${bucketName}' created successfully.`);
    } else {
      console.log(`MinIO bucket '${bucketName}' already exists.`);
    }
  } catch (err) {
    console.error("MinIO bucket initialization error:", err.message);
  }
}

module.exports = {
  minioClient,
  bucketName,
  ensureBucket,
};
