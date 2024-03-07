import { asyncHandler } from "../utils/asyncHandler.js";
import {apiError}  from "../utils/apiError.js";
import { User } from "../models/user.models.js";
import {uploadOnCloudinary} from "../utils/cloudinary.js";
import {apiResponse} from "../utils/apiResponse.js";
import jwt from "jsonwebtoken";

const generateAccessAndRefreshTokens = async (userId) => {
    try {
        const user = await User.findOne(userId);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        //saving refreshToken in db
        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });        

        // console.log(`Inside AccessToken - ${accessToken}, Refresh Token - ${refreshToken}`);
        return {accessToken, refreshToken};
    } catch (error) {
        throw new apiError(500, "Something went wrong while generating refresh and access token");
    }
}

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

const loginUser = asyncHandler(async (req, res) => {
    const {password, userName, email} = req.body;

    if(!userName && !email){
        throw new apiError(400, "Username or email is required");
    }

    const user = await User.findOne({
        $or: [{ userName }, { email }]
    });

    if(!user){
        throw new apiError(404, "User does not exist");
    }

    const isPasswordValid = await user.isPasswordCorrect(password);

    if(!isPasswordValid){
        throw new apiError(401, "Invalid user credentials");
    }

    const {accessToken, refreshToken} = await generateAccessAndRefreshTokens(user._id);

    //getting logged user details to send back as response and 
    //removing password and refreshToken
    const loggedInUser = await User.findById(user._id).
                        select("-password -refreshToken");

    //setting options for cookie sending
    const options = {
        httpOnly: true,
        secure: true
    }

    // console.log(`AccessToken - ${accessToken}, Refresh Token - ${refreshToken}`);
    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new apiResponse(
            200,
            {
                user: loggedInUser, accessToken, refreshToken
            },
            "User logged in Successfully"
        )
    );
    
});


const logoutUser = asyncHandler(async(req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined
            }
        },
        {
            new: true
        }
    )

    //setting options for cookie sending
    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(
        new apiResponse(
            200,
            {},
            "User logged out successfully"
        )
    )

})

const refresAccessToken = asyncHandler (async function (req, res){
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;

    if(!refreshToken){
        throw new apiError(401, "Unauthorized request");
    }

    try {
        const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);
    
        const user = await User.findById(decodedToken._id);
    
        if(!user){
            throw new apiError(401, "Invalid refresh token");
        }
    
        if(incomingRefreshToken != user?.refreshToken){
            throw new apiError(401, "Refresh token is expired or used");
        }
    
        //setting options for cookie sending
        const options = {
            httpOnly: true,
            secure: true
        }
    
        const {newRefreshToken} = await generateAccessAndRefreshTokens(user._id);
    
        return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", newRefreshToken, options)
        .json(
            new apiResponse(
                200,
                {
                   accessToken,
                   refreshToken: newRefreshToken
                },
                "Access Token refreshed"
            )
        )
    } catch (error) {
        throw new apiError(401, error?.message || "Invalid refresh Token00");
    }


})
export { 
    registerUser,
    loginUser, 
    logoutUser,
    refresAccessToken,
};
