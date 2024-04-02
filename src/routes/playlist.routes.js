import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";
import { addVideoToPlaylist, createPlaylist, deletePlaylist, getPlaylistById, getUserPlaylists, removeVideoFromPlaylist, updatePlaylist } from "../controllers/playlist.controller.js";

const router = Router();

//Add Authentication before every route
router.use(verifyJWT, upload.none());

//Create a playlist for the user
router
.route('/')
.post(createPlaylist);

//Add video to the playlist
router
.route(`/add/:videoId/:playlistId`)
.patch(addVideoToPlaylist);

//Update any Playlist
router
.route(`/:playlistId`)
.patch(updatePlaylist);

//Get Any Playlist of the user
router
.route('/:playlistId')
.get(getPlaylistById);

//Get User's All playlists
router
.route('/user/:userId')
.get(getUserPlaylists);

//Removing Video from the Playlist
router
.route('/remove/:videoId/:playlistId')
.patch(removeVideoFromPlaylist);

//Delete Playlist
router
.route('/:playlistId')
.delete(deletePlaylist);

export default router;