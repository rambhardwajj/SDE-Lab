import { Router } from "express";
import { isLoggedIn } from "../middlewares/auth.middleware";
import { addProblemInPlaylist, createPlaylist, deletePlaylist, getAllPlaylists, getPlaylistById, removeProblemFromPlaylist } from "../controllers/playlist.controller";

const router = Router();

router.post('/create', isLoggedIn, createPlaylist ) 
router.get('/', isLoggedIn, getAllPlaylists  )
router.get('/:playListId', isLoggedIn, getPlaylistById  )
router.post('/:playListId/addProblems', isLoggedIn, addProblemInPlaylist ) 
router.delete('/:playListId/removeProblem', isLoggedIn, removeProblemFromPlaylist ) 
router.delete('/:playListId', isLoggedIn, deletePlaylist ) 

export default router