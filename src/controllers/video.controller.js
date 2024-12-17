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

//DONE
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

//DONE
const getVideoById = asyncHandler(async (req, res) => {
    /*
    think what we need to show on the page when we have video id
    Video with owner's username, subscribers, we had subscribed them or not,
    likes on the video, views on the video, liked by user or not
    */
    const { videoId } = req.params;
    // console.log(`Video Id - ${videoId}`);

    if(!isValidObjectId(videoId)){
        throw new apiError(400, "Invalid Video id");
    }

    if(!isValidObjectId(req.user?._id)){
        throw new apiError(400, "Invalid user");
    }

    const video = await Video.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(videoId)
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
                localField: "owner",
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
                                            new mongoose.Types.ObjectId(req.user?.id),
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
                                new mongoose.Types.ObjectId(req.user?.id),
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
                videoFile: 1,
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
        throw new apiError(404, "Video not found");
    }

    //check if its unique user if yes only then increment views else not
    const user = await User.findOne( {_id: req.user?._id, watchHistory: { $in: [videoId] } } );

    if(!user){
        await Video.findByIdAndUpdate(videoId, {
            $inc: {
                views: 1
            }
        });
    }

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

//DONE
const updateVideo = asyncHandler(async (req, res) => {
    const {title, description} = req.body;
    const {videoId} = req.params;

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
    let oldThumbnail = video?.thumbnail;
    //deleting old thumbnail and updating with new one
    const thumbnailToDelete = video.thumbnail.public_id;

    const newTitle = title ? title : oldTitle;
    const newDescription = description ? description : oldDescription;

    //if we have user thumbnail image for updation then update url else we 
    //keep url as it is
    if (thumbnailLocalPath) {
        const newThumbnail = await uploadOnCloudinary(thumbnailLocalPath);
        if (!newThumbnail || !newThumbnail.secure_url) {
            throw new apiError(400, "Error in uploading thumbnail");
        }
        console.log(JSON.stringify(newThumbnail));
        oldThumbnail = newThumbnail.url; // Extract the string URL
    }
    

    const updatedVideo = await Video.findByIdAndUpdate(
        videoId,
        {
            $set: {
                title: newTitle,
                description: newDescription,
                thumbnail: oldThumbnail
            }
        },
        {
            new: true
        }
    )

    if(!updatedVideo){
        throw new apiError(500, "Error in updating video details Try again");
    }else{
        await deleteFromCloudinary(extractPublicId(thumbnailToDelete));
    }

    return res
    .status(200)
    .json(
        new apiResponse(
            200,
            updatedVideo,
            "Video updated Successfully"
        )
    );
});

//
const deleteVideo = asyncHandler(async(req, res) => {
    const {videoId} = req.params;
    
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

//DONE
const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query;

    const pipeline = [];
    
    if (query) {
        pipeline.push({
            $search: {
                index: "video-search",
                text: {
                    query: query,
                    path: ["title", "description"],
                    fuzzy: {
                        maxEdits: 2,
                        prefixLength: 0,
                        maxExpansions: 50
                    }
                }
            }
        });

        // Add relevance score to each document
        pipeline.push({
            $addFields: {
                relevance: { $meta: "searchScore" }
            }
        });
    }

    if (userId) {
        if (!isValidObjectId(userId)) {
            throw new apiError(400, "Invalid userId");
        }

        pipeline.push({
            $match: {
                owner: new mongoose.Types.ObjectId(userId)
            }
        });
    }

    // Only those videos which are published
    pipeline.push({
        $match: {
            isPublished: true
        }
    });

    // Sort by relevance if query is present
    if (query) {
        pipeline.push({
            $sort: {
                relevance: -1
            }
        });
    } else if (sortBy && sortType) {
        pipeline.push({
            $sort: {
                [sortBy]: sortType === 'asc' ? 1 : -1
            }
        });
    } else {
        pipeline.push({
            $sort: {
                createdAt: -1
            }
        });
    }

    pipeline.push(
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
            $unwind: "$ownerDetails"
        }
    );

    const videoPipeline = Video.aggregate(pipeline);

    const options = {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10)
    };

    const video = await Video.aggregatePaginate(videoPipeline, options);

    return res
        .status(200)
        .json(
            new apiResponse(
                200,
                video,
                "Videos fetched successfully"
            )
        );
});




//DONE
const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    // console.log(`Video Id - ${videoId}`);

    if(!isValidObjectId(videoId)){
        throw new apiError(400, "Invalid video Id");
    }

    const video = await Video.findById(videoId);

    if(!video){
        throw new apiError(404, "Video not found");
    }

    // console.log(`videoId - ${video.owner.toString()}----------Owner id - ${req.user?._id.toString()}`);
    if(video.owner.toString() != req.user?._id.toString()){
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
    getAllVideos,
    togglePublishStatus,
};  