import { asyncHandler } from "../utils/asyncHandler.js";
import { apiError } from "../utils/apiError.js";
import {Like} from "../models/likes.models.js";
import { apiResponse } from "../utils/apiResponse.js";
import mongoose, { isValidObjectId } from "mongoose";

const getLikedVideos = asyncHandler(async (req, res) => {
    const likedVideos = await Like.aggregate([
        {
            $match: {
                likedBy: new mongoose.Types.ObjectId(req.user?._id)
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
    ])

    return res
    .status(200)
    .json(
        new apiResponse(
            200,
            likedVideos,
            "Liked Videos fetched successfully"
        )
    );
});

//Please implement debouncing throttling technique at client side
//so that this toggleVideoLike is not being called multiple times causing 
//lots db calls
const toggleVideoLike = asyncHandler(async (req, res) => {
    const {videoId} = req.params;

    if(!isValidObjectId(videoId)){
        throw new apiError(400, "Invalid video Id");
    }

    if(!isValidObjectId(req.user?._id)){
        throw new apiError(400, "Invalid User");
    }

    const alreadyLiked = Like.findById(
        {
            video: videoId,
            likedBy: req.user?._id
        }
    );

    if(alreadyLiked){
        const like = await Like.findByIdAndDelete(
            {
                video: videoId,
                likedBy: req.user?._id
            }
        );

        if(!like){
            throw new apiError(500, "Error in removing comment Like");
        }

        return res
        .status(200)
        .json(
            new apiResponse(
                200,
                {isLiked: false},
            )
        );
    }
    const liked = await Like.create(
        {
            video: videoId,
            likedBy: req.user?._id
        }
    );

    if(!liked){
        throw new apiError(500, "Unable to register like Try again");
    }

    return res
    .status(200)
    .json(
        new apiResponse(
            200,
            {isLiked: true},
        )
    );
    
});

const toggleCommentLike = asyncHandler(async (req, res) => {
    const {commentId} = req.params
    
    if(!isValidObjectId(commentId)){
        throw new apiError(400, "Invalid Comment Id");
    }

    if(!isValidObjectId(req.user?._id)){
        throw new apiError(400, "Invalid User");
    }

    const alreadyLiked = Like.findById(
        {
            comment: commentId,
            likedBy: req.user?._id
        }
    );

    if(alreadyLiked){
        const commentLike = await Like.findByIdAndDelete(
            {
                comment: commentId,
                likedBy: req.user?._id
            }
        );

        if(!commentLike){
            throw new apiError(500, "Error in removing comment Like");
        }

        return res
        .status(200)
        .json(
            new apiResponse(
                200,
                {},
                "Comment Liked removed successfully"
            )
        );
    }
    const commentLike = await Like.create(
        {
            comment: commentId,
            likedBy: req.user?._id
        }
    );
        
    if(!commentLike){
        throw new apiError(500, "Error while Liking comment");
    }

    return res
    .status(200)
    .json(
        new apiResponse(
            200,
            {},
            "Comment Liked successfully"
        )
    );

});

const toggleTweetLike = asyncHandler(async (req, res) => {
    const {tweetId} = req.params
    
    if(!isValidObjectId(tweetId)){
        throw new apiError(400, "Invalid tweet Id");
    }
    if(!isValidObjectId(req.user?._id)){
        throw new apiError(400, "Invalid user");
    }

    const alreadyLiked = await Like.findById(
        {
            tweet: tweetId,
            likedBy: req.user?._id
        }
    );

    if(alreadyLiked){
        const tweetLike = await Like.findByIdAndDelete(
            {
                tweet: tweetId,
                likedBy: req.user?._id
            }
        );
        
        if(!tweetLike){
            throw new apiError(500, "Error while removing tweet Like");
        }

        return res
        .status(200)
        .json(
            new apiResponse(
                200,
                {},
                "Successfully removed like"
            )
        );
    }

    const tweetLike = await Like.create(
        {
            tweet: tweetId,
            likedBy: req.user?._id
        }
    );

    if(!tweetLike){
        throw new apiError(500, "Error while liking tweet");
    }

    return res
    .status(200)
    .json(
        new apiResponse(
            200,
            {},
            "Successfully liked Tweet"
        )
    );

});

export {
    getLikedVideos,
    toggleVideoLike,
    toggleCommentLike,
    toggleTweetLike
};