import { asyncHandler } from "../utils/asyncHandler.js";
import { apiError } from "../utils/apiError.js";
import {Like} from "../models/likes.models.js";
import { apiResponse } from "../utils/apiResponse.js";
import mongoose from "mongoose";

const getLikedVideos = asyncHandler(async (req, res) => {
    const liked = await Like.aggregate(
        {
            $match: {
                likedBy: new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "video",
                foreignField: "_id",
                as: "likedVideo"
            },
            pipeline: [
                {
                    $lookup: {
                        from: "users",
                        localField: "owner",
                        foreignField: "_id",
                        as: "ownerDetails"
                    },
                    pipeline: [
                        {
                            $project: {
                                userName: 1,
                                fullName: 1,
                                avatar: 1,
                            }
                        }
                    ]
                },
                {
                    //Destructuring because user would have liked multiple videos of same channel(or user)
                    $unwind: "$ownerDetails"
                }
            ]
        },
        {
            //Again destructuring because it will destructure each likedVideo document and
            //give me a single array with lots of likedVideo docs where each docs will have 
            /*
            [
                {
                    "likedBy": "User1",
                    "likedVideo": {
                        "video": "Video A",
                        "ownerDetails": ["Owner A"]
                    }
                }, and so on
            ]
            */
            $unwind: "$likedVideo"
        },
        {
            $project: {
                likedVideo: {
                    _id: 1,
                    videoFile: 1,
                    thumbnail: 1,
                    likedVideosCount: 1,
                    ownerDetails: 1,
                    title: 1,
                    description: 1,
                    duration: 1,
                    createdAt: 1,
                    isPublished: 1,
                }
            }
        },
        {
            //groups all the document and count number documents in my output but return only accumulated value
            //so i have to push likedVideo as well such that it will also come in  output 
            $group: {
                _id: null,
                likedVideos: {$push : "$likedVideo"},
                likedVideosCount: { $sum : 1 }
            }
        },
    )
});

export {
    getLikedVideos,
};