import { apiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {Playlist} from "../models/playlist.models.js";
import mongoose, { isValidObjectId } from "mongoose";
import { apiResponse } from "../utils/apiResponse.js";
import {Video} from "../models/video.models.js";

const createPlaylist = asyncHandler(async (req, res) => {
    const {name, description} = req.body

    if(!name){
        throw new apiError(400, "Playlist name is required");
    }

    if(isValidObjectId(req.user?._id)){
        throw new apiError(400, "Invalid user");
    }

    const newPlaylist = await Playlist.create(
        {
            name: name,
            description: description,
            owner: req.user?._id
        }
    );

    if(!newPlaylist){
        throw new apiError(500, "Error creating playlist");
    }

    return res
    .status(200)
    .json(
        new apiResponse(
            200,
            newPlaylist,
            "Playlist created Successfully"
        )
    );
    
});

const getUserPlaylists = asyncHandler(async (req, res) => {
    const {userId} = req.params;

    if(!isValidObjectId(userId)){
        throw new apiError(400, "Invalid user");
    }

    const playlists = await Playlist.aggregate([
        {
            $match : {
                owner: new mongoose.Types.ObjectId(userId)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "videos",
                foreignField: "_id",
                as: "videos",
                pipeline: [
                    {
                        $project: {
                            videoFile: 1,
                            thumbnail: 1,
                            duration: 1,
                            views: 1,
                            description: 1,
                            title: 1,
                            updatedAt: 1
                        }
                    }
                ]
            }
        },
        {
            $addFields: {
                playlistSize: {
                    $size: "$videos"
                },
                totalViews: {
                    $sum: "$videos.views"
                }
            }
        },
        {
            $project: {
                _id: 1,
                playlistSize: 1,
                totalViews: 1,
                description: 1,
                name: 1,
                updatedAt: 1,
            }
        }
    ]);

    return res
    .status(200)
    .json(
        new apiResponse(
            200,
            playlists,
            "User Playlists fetched successfully"
        )
    );
    
});

const getPlaylistById = asyncHandler(async (req, res) => {
    const {playlistId} = req.params

    if(!isValidObjectId(playlistId)){
        throw new apiError(400, "Invalid playlist Id");
    }

    const playlistExists = await Playlist.findOne(playlistId);

    if(!playlistExists){
        throw new apiError(404, "Playlist not found");
    }

    const playlist = await Playlist.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(playlistId)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "videos",
                foreignField: "_id",
                as: "videos",
                pipeline: [
                    {
                        $match: {
                            isPublished: true
                        },
                        $project: {
                            _id: 1,
                            videoFile: 1,
                            thumbnail: 1,
                            duration: 1,
                            views: 1,
                            description: 1,
                            title: 1,
                            updatedAt: 1
                        }
                    }
                ]
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
                        $project: {
                            userName: 1,
                            avatar: 1,
                            coverImage: 1,
                            fullName: 1
                        }
                    }
                ]
            }
        },
        {
            $addFields: {
                owner: {
                    $first: "$owner"
                },
                playlistSize: {
                    $size: "$videos"
                },
                totalViews: {
                    $sum: "$videos.views"
                }
            }
        },
        {
            $project: {
                name: 1,
                description: 1,
                createdAt: 1,
                updatedAt: 1,
                owner: 1,
                videos: 1,
                totalViews: 1,
                playlistSize: 1
            }
        }
    ]);

    return res
    .status(200)
    .json(
        new apiResponse(
            200,
            playlist,
            "Playlist fetched successfully"
        )
    );
});

const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params

    if(!isValidObjectId(playlistId)){
        throw new apiError(400, "Invalid playlist Id");
    }

    if(!isValidObjectId(videoId)){
        throw new apiError(400, "Invalid video Id");
    }

    const playlist = await Playlist.findById(playlistId);
    const video = await Video.findById(videoId);

    if(!playlist){
        throw new apiError(404, "Playlist not found");
    }
     
    if(!video){
        throw new apiError(404, "Video not found");
    }

    if(playlist.owner?.toString() != req.user?._id.toString()){
        throw new apiError(403, "Only owner of the playlist can edit this playlist");
    }

    const updatedPlaylist = await Playlist.findByIdAndUpdate(
        playlist?.id,
        {
            $addToSet: {
                videos: videoId,
            }
        },
        {
            new: true
        }
    );

    if(!updatedPlaylist){
        throw new apiError(500, "Failed to add video Try again later");
    }

    return res
    .status(200)
    .json(
        new apiResponse(
            200,
            updatedPlaylist,
            "Video added Successfully"
        )
    );
});

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params

    if(!isValidObjectId(playlistId)){
        throw new apiError(400, "Invalid playlist Id");
    }

    if(!isValidObjectId(videoId)){
        throw new apiError(400, "Invalid Video Id");
    }

    const playlist = await Playlist.findById(playlistId);
    const video = await Video.findById(videoId);

    if(!playlist){
        throw new apiError(404, "Playlist not found");
    }
     
    if(!video){
        throw new apiError(404, "Video not found");
    }

    if(playlist.owner.toString() != req.user?._id.toString()){
        throw new apiError(403, "Only owner can edit the playlist");
    }
    
    const updatedPlaylist = await Playlist.findByIdAndUpdate(
        playlist?._id,
        {
            $pull: {
                videos: videoId
            }
        },
        {
            new: true
        }
    );

    return res
    .status(200)
    .json(
        new apiResponse(
            200,
            updatedPlaylist,
            "Video removed successfully"
        )
    );
});

const deletePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params

    if(!isValidObjectId(playlistId)){
        throw new apiError(400, "Invalid Playlist Id");
    }

    const playlist = await Playlist.findById(playlistId);

    if(!playlist){
        throw new apiError(404, "Playlist not found");
    }

    if(playlist.owner.toString() != req.user?._id.toString()){
        throw new apiError(403, "Only owner can delete the playlist");
    }

    const deleted = await Playlist.findByIdAndDelete(playlistId);

    if(!deleted){
        throw new apiError(500, "Error in deleting Playlist");
    }

    return res
    .status(200)
    .json(
        new apiResponse(
            200, 
            {},
            "Playlist deleted successfully"
        )
    );

});

const updatePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    const {name, description} = req.body

    if(!isValidObjectId(playlistId)){
        throw new apiError(400, "Invalid Playlist Id");
    }

    if(!name || !description){
        throw new apiError(400, "Atleast one field is required name or description");
    }

    const playlist = await Playlist.findById(playlistId);

    if(!playlist){
        throw new apiError(404, "Playlist not found");
    }

    name = !name ? playlist.name: name;
    description = !description ? playlist.description : description;

    if(playlist.owner.toString() != req.user?._id?.toString()){
        throw new apiError(400, "Only owner can update the playlist");
    }

    const updatedPlaylist = await Playlist.findByIdAndUpdate(
        playlist._id, 
        {
            $set: {
                name: name,
                description: description,
            }
        },
        {
            new: true
        }
    );


    return res
    .status(200)
    .json(
        new apiResponse(
            200, 
            updatePlaylist,
            "Playlist updated successfully"
        )
    );
});


export {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist,
}