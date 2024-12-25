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
        { format: "mp4", video_codec: "h264" }, // Convert to MP4 format with H.264 codec
        { fetch_format: "auto" }, // Automatically choose the best format
        { width: 1920, height: 1080, crop: 'limit' }, // Downscale to 1080p (if larger)
        { quality: "auto" } // Automatically adjust quality
      ],
    };

    const params = type === 1 ? imageParams : videoParams;

    // Upload the file to Cloudinary
    const response = await cloudinary.uploader.upload(localFilePath, params);

    // File has been uploaded successfully, so now remove it
    if (fs.existsSync(localFilePath)) {
      fs.unlinkSync(localFilePath);
    }

    return response;
  } catch (error) {
    console.error(`Error while uploading to Cloudinary - ${error}`);
    if (fs.existsSync(localFilePath)) {
      fs.unlinkSync(localFilePath); // Remove the local file if it exists
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
