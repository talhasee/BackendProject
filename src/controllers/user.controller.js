import { asyncHandler } from "../utils/asyncHandler.js";
import { apiError } from "../utils/apiError.js";
import { User } from "../models/user.models.js";
import {
  deleteFromCloudinary,
  uploadOnCloudinary,
} from "../utils/cloudinary.js";
import { apiResponse } from "../utils/apiResponse.js";
import jwt from "jsonwebtoken";
import { extractPublicId } from "cloudinary-build-url";
import mongoose from "mongoose";

const generateAccessAndRefreshTokens = async (userId) => {
  try {
    const user = await User.findOne(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    //saving refreshToken in db
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    // console.log(`Inside AccessToken - ${accessToken}, Refresh Token - ${refreshToken}`);
    return { accessToken, refreshToken };
  } catch (error) {
    throw new apiError(
      500,
      "Something went wrong while generating refresh and access token"
    );
  }
};

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
    $or: [{ userName }, { email }],
  });

  if (existedUser) {
    throw new apiError(409, "User with email or username already exists");
  }

  const avatarLocalPath = req.files?.avatar[0]?.path;
  //   const coverImageLocalPath = req.files?.coverImage[0]?.path;
  let coverImageLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files.coverImage[0].path;
  }

  if (!avatarLocalPath) {
    throw new apiError(400, "Avatar file is required");
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!avatar) {
    throw new apiError(400, "Avatar files is required. DB Issue");
  }

  const user = await User.create({
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    userName: userName.toLowerCase(),
  });

  //checking if user is created successfully
  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  if (!createdUser) {
    throw new apiError(500, "Something went wrong while registering the user");
  }

  return res
    .status(201)
    .json(new apiResponse(200, createdUser, "User registered successfully"));
});

const loginUser = asyncHandler(async (req, res) => {
  const { password, userName, email } = req.body;

  if (!userName && !email) {
    throw new apiError(400, "Username or email is required");
  }

  const user = await User.findOne({
    $or: [{ userName }, { email }],
  });

  if (!user) {
    throw new apiError(404, "User does not exist");
  }

  const isPasswordValid = await user.isPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new apiError(401, "Invalid user credentials");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    user._id
  );

  //getting logged user details to send back as response and
  //removing password and refreshToken
  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  //setting options for cookie sending
  const options = {
    httpOnly: true,
    secure: true,
  };

  // console.log(`AccessToken - ${accessToken}, Refresh Token - ${refreshToken}`);
  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new apiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken,
        },
        "User logged in Successfully"
      )
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      //   $set: {
      //     refreshToken: undefined,
      //   },

      $unset: {
        refreshToken: 1,
      },
    },
    {
      new: true,
    }
  );

  //setting options for cookie sending
  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new apiResponse(200, {}, "User logged out successfully"));
});

const refresAccessToken = asyncHandler(async function (req, res) {
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    throw new apiError(401, "Unauthorized request");
  }

  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    const user = await User.findById(decodedToken._id);

    if (!user) {
      throw new apiError(401, "Invalid refresh token");
    }

    if (incomingRefreshToken != user?.refreshToken) {
      throw new apiError(401, "Refresh token is expired or used");
    }

    //setting options for cookie sending
    const options = {
      httpOnly: true,
      secure: true,
    };

    const { newRefreshToken } = await generateAccessAndRefreshTokens(user._id);

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new apiResponse(
          200,
          {
            accessToken,
            refreshToken: newRefreshToken,
          },
          "Access Token refreshed"
        )
      );
  } catch (error) {
    throw new apiError(401, error?.message || "Invalid refresh Token00");
  }
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
  const [oldPassword, newPassword] = req.body;

  //if our middleware ran successfully then we will be having _id field in req
  const user = await User.findById(req.user?._id);

  const isPasswordCorrect = user.isPasswordCorrect(oldPassword);

  if (!isPasswordCorrect) {
    throw new apiError(400, "Invalid Password");
  }

  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new apiResponse(200, {}, "Password Changed Successfully"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new apiResponse(200, req.user, "current user fetched successfully"));
});

const updateAcccountDetails = asyncHandler(async (req, res) => {
  const [fullName, email] = req.body;

  if (!fullName || !email) {
    throw new apiError("All fields are required");
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        fullName,
        email,
      },
    },
    {
      new: true,
    }
  ).select("-password");
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new apiResponse(200, user, "Details upadted successfully"));
});

const updateUserAvatar = asyncHandler(async (req, res) => {
  //here we used "file" not "files" because only single file is being asked
  const localAvatarPath = req.file?.path;
  const oldPublicId = extractPublicId(req.user?.avatar);
  //   console.log(oldPublicId);

  if (!localAvatarPath) {
    throw new apiError(400, "Avatar file is missing");
  }

  const avatar = await uploadOnCloudinary(localAvatarPath);

  if (!avatar.url) {
    throw new apiError(400, "Error while uploading avatar");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      avatar: avatar.url,
    },
    {
      new: true,
    }
  ).select("-password");
  await user.save({ validateBeforeSave: false });

  const response = deleteFromCloudinary(oldPublicId);
  //   console.log(`Reponse in controller - ${response}`);

  return res
    .status(200)
    .json(new apiResponse(200, user, "Avatar Updated Successfully"));
});

const updateCoverImage = asyncHandler(async (req, res) => {
  //here we used "file" not "files" as we are accepting only a single file
  const coverImageLocalPath = req.file?.path;
  const oldPublicId = extractPublicId(req.user?.coverImage);

  if (!coverImageLocalPath) {
    throw new apiError(400, "Cover Image is missing");
  }

  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!coverImage) {
    throw new apiError(400, "Error while uploading Cover Image");
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      coverImage: coverImage.url,
    },
    {
      new: true,
    }
  );
  await user.save({ validateBeforeSave: false });

  const response = deleteFromCloudinary(oldPublicId);

  return res
    .status(200)
    .json(new apiResponse(200, user, "Cover Image updated successfully"));
});

const getUserChannelProfile = asyncHandler(async (req, res) => {
  //used params here because we go to url of that channel to see their
  //data so we extracted the username from the url or params
  const { username } = req.params;

  if (!username?.trim()) {
    throw new apiError(400, "Username is missing");
  }

  const channel = await User.aggregate([
    {
      //first filter to generate data which has channel name  = username
      //similar to "where" clause
      $match: {
        username: username?.toLowerCase(),
      },
    },
    {
      //In our Subscription model we have used reference of User in subscriber
      //So every channel or user will be having a document with subscriber a user and channel as himself
      //it is just left outer join
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers",
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedTo",
      },
    },
    {
      $addFields: {
        subscribersCount: {
          $size: "$subscribers",
        },
        channelSubscribedTo: {
          $size: "$subscribedTo",
        },
        isSubscribed: {
          $cond: {
            if: { $in: [req.user?._id, "$subscribers.subscriber"] },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $project: {
        fullName: 1,
        userName: 1,
        subscribersCount: 1,
        channelSubscribedTo: 1,
        isSubscribed: 1,
        coverImage: 1,
        avatar: 1,
      },
    },
  ]);

  if (!channel?.length) {
    throw new apiError(404, "Channel does not exists");
  }

  return res
    .status(200)
    .json(new apiResponse(200, channel[0], "User channel fetched succesfully"));
});

const getWatchHistory = asyncHandler(async (req, res) => {
  const user = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(req.user._id),
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "watchHistory",
        foreignField: "_id",
        as: "watchHistory",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipeline: [
                {
                  $project: {
                    fullName: 1,
                    userName: 1,
                    avatar: 1,
                  },
                },
              ],
            },
          },
          {
            //this will destructure return value and return object instead of array
            $addFields: {
              owner: {
                $first: "$owner",
              },
            },
          },
        ],
      },
    },
  ]);

  return res
    .status(200)
    .json(
      new apiResponse(
        200,
        user[0].watchHistory,
        "Watch history fetched successfully"
      )
    );
});

export {
  registerUser,
  loginUser,
  logoutUser,
  refresAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAcccountDetails,
  updateUserAvatar,
  updateCoverImage,
  getUserChannelProfile,
  getWatchHistory,
};
