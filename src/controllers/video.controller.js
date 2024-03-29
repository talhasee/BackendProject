import { apiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { deleteFromCloudinary, uploadOnCloudinary } from "../utils/cloudinary.js";
import { Video } from "../models/video.models.js";
import {Like} from "../models/likes.models.js";
import {Comment} from "../models/comments.models.js";
import { apiResponse } from "../utils/apiResponse.js";
import mongoose, { isValidObjectId } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";
import { User } from "../models/user.models.js";
import { extractPublicId } from "cloudinary-build-url";


const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description} = req.body
    
    if([title, description].some((field) => field?.trim() === "")){
        throw new apiError(400, "All fields are required");
    }

    const videoFileLocalPath = req.files?.videoFile[0].path;
    const thumbnailLocalPath = req.files?.thumbnail[0].path;

    if(!videoFileLocalPath){
        throw new apiError(400, "Video File is required");
    }

    if(!thumbnailLocalPath){
        throw new apiError(400, "Thumbnail is required");
    }

    const videoFile = await uploadOnCloudinary(videoFileLocalPath);
    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);

    if(!videoFile){
        throw new apiError(400, "Error in uploading video File Try again!")
    }

    if(!thumbnail){
        throw new apiError(400, "Error in uploading thumbnail Try again!");
    }

    const video = await Video.create(
        {
            videoFile: videoFile.url,
            title,
            description,
            duration: videoFile.duration,
            isPublished: false,
            views: 0,
            thumbnail: thumbnail.url,
            owner: req.user?._id,
        }
    )

    const videoUploaded = await Video.findById(video._id);

    if(!videoUploaded){
        throw new apiError(500, "Something went wrong in uploading video File, Try again");
    }

    return res
    .status(200)
    .json(
        new apiResponse(
            200,
            video,
            "Video uploaded successfully!"
        )
    );

});

const getVideoById = asyncHandler(async (req, res) => {
    /*
    think what we need to show on the page when we have video id
    Video with owner's username, subscribers, we had subscribed them or not,
    likes on the video, views on the video, liked by user or not
    */
    
    const { videoId } = req.params
    
    if(!videoId){
        throw new apiError(400, "Invalid Video id");
    }

    if(!isValidObjectId(req.user?._id)){
        throw new apiError(400, "Invalid user");
    }

    const video = await Video.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user?._id)
            }
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "video",
                as : "likes"
            }
        },
        {
            $lookup: {
                from: "users",
                locaField: "owner",
                foreignField: "_id",
                as: "owner",
                pipeline: [
                    {
                        $lookup: {
                            from: "subscriptions",
                            localField: "_id",
                            foreignField: "channel",
                            as: "subscribers"
                        }
                    },
                    {
                        $addFields: {
                            subscribersCount: {
                                $size: "$subscribers"  
                            },
                            isSubscribed: {
                                $cond: {
                                    if: {
                                        $in: [
                                            req.user?._id,
                                            "$subscribers.subscriber"
                                        ]
                                    },
                                    then: true,
                                    else: false
                                }
                            }
                        }
                    },
                    {
                        $project: {
                            userName: 1,
                            avatar: 1,
                            fullName: 1,
                            isSubscribed: 1,
                            subscribersCount: 1
                        }
                    }
                ]
            }
        },
        {
            $addFields: {
                likesCount: {
                    $size: "$likes"
                },
                owner: {
                    $first: "$owner"
                },
                isLiked: {
                    $cond: {
                        if: {
                            $in: [
                                req.user?.id,
                                "$likes.likedBy"
                            ]
                        },
                        then: true,
                        else: false
                    }
                },
            }
        },
        {
            $project: {
                video: 1,
                title: 1,
                description: 1,
                owner: 1,
                likesCount: 1,
                isLiked: 1,
                duration: 1,
                views: 1,
                createdAt: 1
            }
        }
    ]);

    if(!video){
        throw new apiError(500, "Failed video fetching.")
    }

    await video.findByIdandUpdate(videoId, {
        $inc: {
            views: 1
        }
    })

    await User.findByIdAndUpdate(req.user?._id,{
        $addToSet: {
            watchHistory: videoId
        }
    })

    return res
    .status(200)
    .json(
        new apiResponse(
            200,
            video,
            "Video Fetched successfully"
        )
    );

});

const updateVideo = asyncHandler(async (req, res) => {
    const [title, description] = req.body;
    const [videoId] = req.params;

    if(!isValidObjectId(videoId)){
        throw new apiError(400, "Invalid Video ID");
    }

    const video = await Video.findById(videoId);
    
    if(!video){
        throw new apiError(404, "Video not found");
    }
    
    if(video?.owner.toString() != req.user?._id.toString()){
        throw new apiError(400, "Permission denied");
    }
    
    const thumbnailLocalPath = req.file?.path;

    if(!title && !description && !thumbnailLocalPath){
        throw new apiError(400, "Atleast one value is required (Title or description or thumbnailLocalPath)");
    }

    const oldTitle = video?.title;
    const oldDescription = video?.description;
    const oldThumbnail = video?.thumbnail;

    title = title ? title : oldTitle;
    description = description ? description : oldDescription;

    //if we have user thumbnail image for updation then update url else we 
    //keep url as it is
    if(thumbnailLocalPath){
        const newThumbnail = await uploadOnCloudinary(thumbnailLocalPath);
        if(!newThumbnail){
            throw new apiError(400, "Error in uploading");
        }

        oldThumbnail = newThumbnail;
    }

    const updatedVideo = await Video.findByIdAndUpdate(
        videoId,
        {
            $set: {
                title,
                description,
                oldThumbnail
            }
        },
        {
            new: true
        }
    )

    if(!updatedVideo){
        throw new apiError(500, "Error in updating video details Try again");
    }else{
        await deleteFromCloudinary(extractPublicId(oldThumbnail));
    }

    return res
    .status(200)
    .json(
        200,
        updatedVideo,
        "Video updated Successfully"
    )

    
});

const deleteVideo = asyncHandler(async(req, res) => {
    const videoId = req.params;
    
    if(!isValidObjectId(videoId)){
        throw new apiError(400, "Invalid Video");
    }

    const video = await Video.findById(videoId);

    if(!video){
        throw new apiError(404, "Video not found");
    }

    if(video?.owner._id.toString() != req.user?._id){
        throw new apiError(403, "Permission denied")
    }

    const videoFile = video?.videoFile;
    const thumbnail = video?.thumbnail;

    const videoDeleted = await Video.findByIdAndDelete(video?._id);

    if(!videoDeleted){
        throw new apiError(500, "Unable to delete video Try again");
    }

    await deleteFromCloudinary(extractPublicId(videoFile));
    await deleteFromCloudinary(extractPublicId(thumbnail));

    Like.deleteMany(
        {
            video: video?._id
        }
    );

    Comment.deleteMany(
        {
            video: video?._id
        }
    );

    return res
    .status(200)
    .json(
        new apiResponse(
            200, 
            {},
            "Video deleted successfully"
        )
    );

});

const togglePublishStatus = asyncHandler(async (req, res) => {
    const videoId = req.params;

    if(!isValidObjectId(videoId)){
        throw new apiError(400, "Invalid video Id");
    }

    const video = await Video.findById(videoId);

    if(!video){
        throw new apiError(404, "Video not found");
    }

    if(video._id.toString() != req.user?._id.toString()){
        throw new apiError(403, "Permission denied");
    }

    const updatedVideo = await Video.findByIdAndUpdate(
        videoId,
        {
            $set: {
                isPublished: !video.isPublished
            }
        },
        {
            new: true
        }
    )

    if(!updateVideo){
        throw new apiError(500, "Failed to toggle publish status");
    }

    return res
    .status(200)
    .json(
        new apiResponse(
            200,
            updateVideo,
            "Video publish status toggled successfully"
        )
    );
    
});



export {
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus,
};  