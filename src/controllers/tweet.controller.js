import mongoose, { isValidObjectId } from "mongoose"
import {Tweet} from "../models/tweets.models.js"
import {User} from "../models/user.models.js"
import {apiError} from "../utils/apiError.js"
import {apiResponse} from "../utils/apiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const createTweet = asyncHandler(async (req, res) => {
    const {content} = req.body;

    if(!content){
        throw new apiError(400, "Content cannot be empty");
    }

    const tweet = await Tweet.create(
        {
            content: content,
            owner: req.user?._id
        }
    );

    if(!tweet){
        throw new apiError(500, "Unable to create Tweet");
    }

    return res
    .status(200)
    .json(
        new apiResponse(
            200,
            tweet,
            "Tweet create successfully"
        )
    );
});

const getUserTweets = asyncHandler(async (req, res) => {
    const { userId } = req.params;

    if (!isValidObjectId(userId)) {
        throw new apiError(400, "Invalid userId");
    }

    const userTweets = await Tweet.aggregate(
        [
            {
                $match: {
                    owner: new mongoose.Types.ObjectId(userId)
                }
            },
            {
                $lookup: {
                    from: "users",
                    localField: "owner",
                    foreignField: "_id",
                    as: "ownerDetails",
                    pipeline: [
                        {
                            $project: {
                                userName: 1,
                                avatar: 1
                            }
                        }
                    ]
                }
            },
            {
                $lookup: {
                    from: "likes",
                    localField: "_id",
                    foreignField: "tweet",
                    as: "likedByDetails",
                }
            },
            {
                $addFields: {
                    likesCount: {
                        $size: "$likedByDetails"
                    },
                    likedByUserdIds: {
                        $map: {
                            input: "$likedByDetails",
                            as: "like",
                            in: "$$like.likedBy"
                        }
                    },
                    ownerDetails: {
                        $first: "$ownerDetails"
                    },
                    isLikedBy: {
                        $cond: {
                            if: {
                                $in: [req.user?._id, "$likedByDetails"]
                            },
                            then: true,
                            else: false
                        }
                    }
                }
            },
            {
                $sort: {
                    createdAt: -1
                }
            },
            {
                $project: {
                    content: 1,
                    isLikedBy: 1,
                    likesCount: 1,
                    ownerDetails: 1,
                    createdAt: 1,
                    likedByUserdIds: 1  
                }
            }
        ]
    )

    if(!userTweets){
        throw new apiError(500, "Unable to fetch user Tweets");
    }

    return res
    .status(200)
    .json(
        new apiResponse(
            200,
            userTweets,
            "User tweets fetched successfully"
        )
    );
});

const updateTweet = asyncHandler(async (req, res) => {
    const {content} = req.body;
    const {tweetId} = req.params;

    if(!isValidObjectId(tweetId)){
        throw new apiError(400, "Invalid Tweet Id");
    }

    if(!content){
        throw new apiError(400, "Content is required");
    }

    const tweet = await Tweet.findById(tweetId);

    if(!tweet){
        throw new apiError(404, "Tweet not found");
    }

    if(tweet?.owner.toString() != req.user?._id.toString()){
        throw new apiError(403, "You are not the owner of this tweet");
    }

    const newTweet = await Tweet.findByIdAndUpdate(
        tweetId,
        {
            $set: {
                content
            },
        },
        {
            new: true
        }
    );

    if(!newTweet){
        throw new apiError(500, "Unable to update the tweet Try again");
    }

    return res
    .status(200)
    .json(
        new apiResponse(
            200,
            newTweet,
            "Tweet updated successfully"
        )
    );

});

const deleteTweet = asyncHandler(async (req, res) => {
    const {tweetId} = req.params;

    if(isValidObjectId(tweetId)){
        throw new apiError(400, "Invalid tweet");
    }

    const tweet = await Tweet.findByIdAndDelete(tweetId);

    if(!tweet){
        throw new apiError(500, "Unable to find Tweet");
    }

    if(tweet?.owner.toString() != req.user?._id.toString()){
        throw new apiError(400, "You cannot delete the tweet");
    }

    await Tweet.findByIdAndDelete(tweetId);

    return res
    .status(200)
    .json(
        new apiResponse(
            200, 
            {},
            "Tweet deleted Successfully"
        )
    );
});

export {
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet,
};


