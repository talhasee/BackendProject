import mongoose, { isValidObjectId } from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import { apiError } from "../utils/apiError.js";
import {apiResponse} from "../utils/apiResponse.js";
import {Subscription} from "../models/subscription.models.js";
import { Video } from "../models/video.models.js";

//DONE
const getChannelVideos = asyncHandler( async (req, res) => {
    const userId = req.user?._id;

    if(!isValidObjectId(userId)){
        throw new apiError(400, "Invalid userId");
    }

    const channelVideos = await Video.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(userId)
            }
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "video",
                as: "likedVideos"
            } 
        },
        {
            $addFields: {
                creationDate: {
                    $dateToParts: {
                        date: "$createdAt"
                    }
                },
                likesCount: {
                    $size: "$likedVideos"
                }
            }
        },
        {
            $sort: {
                creationDate: -1
            }
        },
        {
            $project: {
                _id: 1,
                videoFile: 1,
                thumbnai: 1,
                title: 1,
                description: 1,
                creationDate: {
                    year: 1, 
                    month: 1,
                    day: 1,
                },
                isPublished: 1,
                likesCount: 1
            }
        }
    ]);

    if(!channelVideos){
        throw new apiError(500, "Error in fetching user Videos");
    }

    return res
    .status(200)
    .json(
        new apiResponse(
            200,
            channelVideos,
            "User Channel Videos fetched successfully"
        )
    );
});

//DONE
const  getChannelStats = asyncHandler( async(req, res) => {
    const userId = req.user?._id;

    if(!isValidObjectId(userId)){
        throw new apiError(400, "Invalid userId");
    }

    const subscribers = await Subscription.aggregate([
        {
            $match: {
                channel: new mongoose.Types.ObjectId(userId)
            }
        },
        {
            $group: {
                _id: null,
                subscribersCount: {
                    $sum : 1
                }
            }
        }
    ]);


    const video = await Video.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(userId)
            }
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "video",
                as: "likes"
            }
        },
        {
            $project: {
                totalLikes: {
                    $size: "$likes"
                },
                totalViews: "$views", //why not sum operator used here
                totalVideos: 1
            }
        },
        {
            $group: {
                _id: null,
                totalLikes: {
                    $sum: "$totalLikes"
                },
                totalViews: {
                    $sum: "$totalViews"
                },
                totalVideos: {
                    $sum: 1
                }
            }
        }

    ]);

    const channelStats = {
        totalSubscribers: subscribers[0]?.subscribersCount || 0,
        totalLikes: video[0]?.totalLikes || 0,
        totalViews: video[0]?.totalViews || 0,
        totalVideos: video[0]?.totalVideos || 0
     }

     return res
     .status(200)
     .json(
        new apiResponse(
            200,
            channelStats,
            "Channel stats fetched successfully"
        )
     );
});

export {
    getChannelVideos,
    getChannelStats
}