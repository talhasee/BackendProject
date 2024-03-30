import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import { apiError } from "./apiError.js";

const temp = cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return null;

    //upload the file on cloudinary
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });

    //file has been uploaded successflly so now remove it
    fs.unlinkSync(localFilePath);
    // console.log("File has been uploaded succesfully ", response.url);

    return response;
  } catch (error) {
    console.log(`Error while uploading in cloudinary- ${error}`);
    fs.unlinkSync(localFilePath); //remove the locally saved temporary file as the upload operation got failed
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
