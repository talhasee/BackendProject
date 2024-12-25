import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import { apiError } from "./apiError.js";

const temp = cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (localFilePath, type) => {
  try {
    if (!localFilePath) return null;

    const imageParams = {
      resource_type: 'auto',
    };

    const videoParams = {
      resource_type: 'video',
      transformation: [
        { format: "mp4", video_codec: "h264" },
        { fetch_format: "auto" },
        { width: 1920, height: 1080, crop: 'limit' },
        { quality: "auto" },
      ]
    };

    const params = type === 1 ? imageParams : videoParams;
    
    const response = await cloudinary.uploader.upload(localFilePath, params);

    // Cleanup local file after successful upload
    if (fs.existsSync(localFilePath)) {
      fs.unlinkSync(localFilePath);
    }

    return response;
  } catch (error) {
    console.error(`Error while uploading to Cloudinary `, error);
    
    // Cleanup local file on error
    if (fs.existsSync(localFilePath)) {
      fs.unlinkSync(localFilePath);
    }
    
    return null;
  }
};



const deleteFromCloudinary = async (publicId) => {
  try {
    if (!publicId) return null;

    await cloudinary.uploader
      .destroy(publicId, {
        resource_type: "image",
      })
      .then((result) => {
        console.log(`Deletion status- DONE`);
      });

    
    // return response;
  } catch (error) {
    throw new apiError(500, `Error while deleting- ${error}`);
  }
};

export { uploadOnCloudinary, deleteFromCloudinary };
