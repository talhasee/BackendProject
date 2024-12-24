import mongoose, { isValidObjectId } from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import { apiError } from "../utils/apiError.js";
import { Comment } from "../models/comments.models.js";
import { apiResponse } from "../utils/apiResponse.js";
import { Video } from "../models/video.models.js";
import { Like } from "../models/likes.models.js";
 
//DONE
const getVideoComments = asyncHandler( async(req, res) => {
    const {videoId} = req.params;
    const {page = 1, limit = 15} = req.query;

    const video = await Video.findById(videoId);

    if(!video){
        throw new apiError(404, "Video not found");
    }

    const commentPipeline = Comment.aggregate([
        {
            $match: {
                video: new mongoose.Types.ObjectId(videoId)
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "ownerDetails"
            }
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "comment",
                as: "likes"
            }
        },
        {
            $addFields: {
                likesCount: {
                    $size: "$likes"
                },
                owner: {
                    $first: "$ownerDetails"
                },
                isLiked: {
                    $cond: {
                        if: {
                            $in: [req.user?._id, "$likes.likedBy"]
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
                createdAt: 1,
                likesCount: 1,
                owner: {
                    userName: 1,
                    fullName: 1,
                    avatar: 1
                },
                isLiked: 1
            }
        }
    ]); 

    if(!commentPipeline){
        throw new apiError(500, "Error fetching comments");
    }

    const paginateOptions = {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10)
    };

    const comments = await Comment.aggregatePaginate(
        commentPipeline,
        paginateOptions
    );

    return res
    .status(200)
    .json(
        new apiResponse(
            200, 
            comments,
            "Comments fetched successuflly"
        )
    );
});

//DONE
const addComment = asyncHandler( async (req, res) => {
    const {videoId} = req.params;
    const {content} = req.body;

    if(!content){
        throw new apiError(400, "Comment content cannot be empty");
    }

    const video = Video.findById(videoId);

    if(!video){
        throw new apiError(404, "Video not found");
    }

    const comment = await Comment.create({
        content,
        owner: req.user?._id,
        video: videoId
    });

    if(!comment){
        throw new apiError(500, "Error creating Comment");
    }

    return res
    .status(200)
    .json(
        new apiResponse(
            200,
            comment,
            "Comment created successfully"
        )
    );
});

//DONE
const updateComment = asyncHandler( async(req, res) => {
    const {commentId} = req.params;
    const {content} = req.body;

    if(!content){
        throw new apiError(400, "Content cannot be empty");
    }

    const comment = await Comment.findById(commentId);

    if(!comment){
        throw new apiError(404, "Comment not found");
    }

    if(comment?.owner.toString() != req.user?._id.toString()){
        throw new apiError(403, "You cannot edit this comment");
    }

    const updatedComment = await Comment.findByIdAndUpdate(
        comment?._id,
        {
            $set: {
                content: content
            }
        },
        {
            new: true
        }
    );

    if(!updatedComment){
        throw new apiError(500, "Error in updating comment");
    }

    return res
    .status(200)
    .json(
        new apiResponse(
            200,
            updatedComment,
            "Comment updated Successfully"
        )
    );
});

//DONE
const deleteComment = asyncHandler( async(req, res) => {
    const {commentId} = req.params;

    const comment = await Comment.findById(commentId);

    if(!comment){
        throw new apiError(404, "Comment not found");
    }

    if(comment.owner.toString() != req.user?._id.toString()){
        throw new apiError(403, "You are not the owner of the comment. (Unauthorized)")
    }

    const deletedComment = await Comment.findByIdAndDelete(commentId);

    const likesDocument = await Like.deleteMany({
        comment: commentId,
        likedBy: req.user?._id
    });

    if(!deletedComment || !likesDocument){
        throw new apiError(500, "Error deleting Comment");
    }

    return res
    .status(200)
    .json(
        200,
        {},
        "Comment deleted successfully"
    );
});

export {
    getVideoComments,
    addComment,
    updateComment,
    deleteComment
};