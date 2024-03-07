import { asyncHandler } from "../utils/asyncHandler.js";
import {apiError}  from "../utils/apiError.js";
import { User } from "../models/user.models.js";
import {uploadOnCloudinary} from "../utils/cloudinary.js";
import {apiResponse} from "../utils/apiResponse.js";

const registerUser = asyncHandler(async (req, res) => {
  // get user details from frontend
  // validation - not empty
  // check if user already exists: username, email
  // check for images, check for avatar
  // upload them to cloudinary, avatar
  // create user object - create entry in db
  // remove password and refresh token field from response
  // check for user creation
  // return res

  const { fullName, userName, email, password } = req.body;

  // if(fullName == ""){
  //     throw new apiError(400, "fullname is required")
  // }

  //if any of below field is empty after trimming spaces then throw error
  if (
    [fullName, email, userName, password].some((field) => field?.trim() === "")
  ) {
    throw new apiError(400, "All fields are required");
  }

  //Give first entry which has given username or email
  const existedUser = await User.findOne({
    $or: [{ userName }, { email }]
  })

  if(existedUser){
    throw new apiError(409, "User with email or username already exists");
  }

  const avatarLocalPath = req.files?.avatar[0]?.path;
//   const coverImageLocalPath = req.files?.coverImage[0]?.path;
  let coverImageLocalPath;
  if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0){
    coverImageLocalPath = req.files.coverImage[0].path;
  }

  if(!avatarLocalPath){
    throw new apiError(400, "Avatar file is required");
  }
  
  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if(!avatar){
    throw new apiError(400, "Avatar files is required. DB Issue");
  }

  const user = await User.create({
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    userName: userName.toLowerCase() 
  });

  //checking if user is created successfully
  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  ); 

  if(!createdUser){
    throw new apiError(500, "Something went wrong while registering the user");
  }

  return res.status(201).json(
    new apiResponse(200, createdUser, "User registered successfully")
  );

});

export { registerUser };
