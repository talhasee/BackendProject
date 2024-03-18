import mongoose, { isValidObjectId } from "mongoose";
import {Subscription} from "../models/subscription.models.js"
import { asyncHandler } from "../utils/asyncHandler.js";
import { apiError } from "../utils/apiError.js";
import { apiResponse } from "../utils/apiResponse.js";


const toggleSubscription = asyncHandler(async (req, res) => {
    const {channelId} = req.params
    
    if(!isValidObjectId(channelId)){
        throw new apiError(400, "Invalid Channel Id");
    }

    const alreadySubscribed = await Subscription.findOne(
        {
            subscriber: req.user?._id,
            channel: channelId
        }
    )

    if(alreadySubscribed){
        const removeSubscription = await Subscription.findByIdAndDelete(alreadySubscribed?._id);

        if(!removeSubscription){
            throw new apiError(500, "Error in toggling subscription")
        }

        return res
        .status(200)
        .json(
            new apiResponse(
                200,
                {isSubscribed: true},
                "Unsubscribed Successfully"
            )
        )
    }

    const newSubscriber = await Subscription.create(
        {
            subscriber: req.user?._id,
            channel: channelId,
        }
    )

    if(!newSubscriber){
        throw new apiError(500, "Error in Subscribing Channel");
    }

    return res
    .status(200)
    .json(
        new apiResponse(
            200,
            {isSubscribed: true, newSubscriber},
            "Subscribed Successfully"
        )
    );
});

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    const {channelId} = req.params

    if(!isValidObjectId(channelId)){
        throw new apiError(400, "Invalid Channel Id");
    }

    const subscribers = await Subscription.aggregate([
        {
            $match: new mongoose.Types.ObjectId(channelId)
        },
        {
            $lookup: {
                from: "users",
                localField: "subscriber",
                foreignField: "_id",
                as: "subscriber",
                pipeline: [
                    {
                        $lookup: {
                            from: "subscription",
                            localField: "_id",
                            foreignField: "channel",
                            as: "subscribedToSubscriber"
                        },
                    },
                    {
                        $addFields: {
                            subscribedToSubscriber: {
                                $cond: {
                                    if: {
                                        $in: [
                                            new mongoose.Types.ObjectId(channelId), 
                                            "$subscribedToSubscriber.subscriber"
                                        ]
                                    },
                                    then: true,
                                    else: false
                                }
                            },
                            subscriberCount: {
                                $size: "$subscriber"
                            }
                        }
                    }
                ]
            }
        },
        {
            $unwind: "$subscriber"
        },
        {
            $project:{
                _id: 0,
                $addFields: {
                    subscribedToSubscriber: 1,
                    subscriberCount: 1,
                    avatar: 1,
                    userName: 1,
                    fullName: 1,
                    coverImage: 1,
                }
            }
        }
    ]);
});

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
    const { subscriberId } = req.params;

    if(!isValidObjectId(subscriberId)){
        throw new apiError(400, "Invalid Subscriber Id");
    }

    const subscribedChannels = await Subscription.aggregate([
        {
            $match: new mongoose.Types.ObjectId(subscriberId)
        },
        {
            $lookup: {
                from: "users",
                localField: "channel",
                foreignField: "_id",
                as: "subscribedChannel",
                pipeline: [
                    {
                        $lookup: {
                            from: "videos",
                            localField: "_id",
                            foreignField: "owner",
                            as: "videos"
                        }
                    },
                    {
                        $addFields: {
                            latestVideo: {
                                $last: "$videos"
                            }
                        }
                    }
                ]
            }
        },
        {
            //because single user may have subscribed multiple channels
            $unwind: "$subscribedChannel"
        },
        {
            $project: {
                _id: 0,
                subscribedChannel: {
                    _id: 1,
                    userName: 1,
                    fullName: 1,
                    coverImage: 1,
                    avatar: 1,
                    latestVideo: {
                        _id: 1,
                        videoFile: 1,
                        thumbnail: 1,
                        title: 1,
                        duration: 1,
                        views: 1,
                        description: 1,
                        owner: 1,
                        createdAt: 1
                    }
                }
            }
        }
    ]);

    return res
    .status(200)
    .json(
        new apiResponse(
            200,
            subscribedChannels,
            "Subscribed Channel fetched successfully"
        )
    )
})

export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels,
}