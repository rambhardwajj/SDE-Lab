import { db } from "../configs/db";
import { ApiResponse } from "../utils/ApiResponse";
import { asyncHandler } from "../utils/asyncHandler";
import { CustomError } from "../utils/CustomError";

const createPlaylist = asyncHandler(async (req, res) => {
  const { name, description } = req.body;

  const userId = req.user.id;

  const playlist = await db.playlist.create({
    data: {
      name,
      description,
      userId,
    },
  });

  res
    .status(200)
    .json(new ApiResponse(200, playlist, "Playlist created successfully"));
});

const getAllPlaylists = asyncHandler(async (req, res) => {
  const playlists = await db.playlist.findMany({
    where: {
      userId: req.user.id,
    },
    include: {
      problems: {
        include: {
          problem: true,
        },
      },
    },
  });
  res
    .status(200)
    .json(new ApiResponse(200, playlists, "Playlists retrieved successfully"));
});

const getPlaylistById = asyncHandler(async (req, res) => {
  const { playListId } = req.params;
  
  const playlists = await db.playlist.findUnique({
    where: {
      id: playListId,
    },
    include: {
      problems: {
        include: {
          problem: true,
        },
      },
    },
  })
  console.log(playlists)
  if(!playlists){
    return res.status(404).json(new ApiResponse(404, null, "Playlist not found"))
  }
  res
    .status(200)
    .json(new ApiResponse(200, playlists, "Playlist retrieved successfully"));
});

const addProblemInPlaylist = asyncHandler(async (req, res) => {
  // const {playlistId, problemId} = req.params
  const { playListId } = req.params;
  let { problemIds } = req.body;

  console.log("probls", problemIds);
  if (!Array.isArray(problemIds) || problemIds.length === 0) {
    throw new CustomError(
      400,
      "Invalid problemIds, must be an array of problemIds"
    );
  }

  problemIds = await Promise.all(problemIds.map(async (problemId: string) => {
    const existingProblemInPlaylist = await db.problemInPlaylist.findFirst({
      where: {
        problemId: problemId,
      },
    });
    console.log("exis", existingProblemInPlaylist);
    if (!existingProblemInPlaylist) {
      return problemId;
    }
  }));

  console.log("probIds", problemIds);

  if (!problemIds) {
    throw new CustomError(500, "Failed to add problem to playlist");
  }

  const problemInPlaylist = await db.problemInPlaylist.createMany({
    data: problemIds.map((problemId: string) => ({
      playListId,
      problemId,
    })),
  });

  if (!problemInPlaylist) {
    throw new CustomError(500, "Problem not added ");
  }

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        problemInPlaylist,
        "Problems added to playlist successfully"
      )
    );
});

const removeProblemFromPlaylist = asyncHandler(async (req, res) => {
  const { playListId } = req.params;
  const { problemIds } = req.body;

  if (!Array.isArray(problemIds) || problemIds.length === 0) {
    return res.status(400).json({ error: "Invalid or missing problemIds" });
  }

  const deletedProblem = await db.problemInPlaylist.deleteMany({
    where: {
      playListId,
      problemId: {
        in: problemIds,
      },
    },
  });
  res.status(200).json({
    success: true,
    message: "Problem removed from playlist successfully",
    deletedProblem,
  });
});

const deletePlaylist = asyncHandler(async (req, res) => {
  const { playListId } = req.params;
  const deletedPlaylist = await db.playlist.delete({
    where: {
      id: playListId,
    },
  });
  res.status(200).json({
    success: true,
    message: "Playlist deleted successfully",
    deletedPlaylist,
  });
});

export {
  createPlaylist,
  getAllPlaylists,
  getPlaylistById,
  addProblemInPlaylist,
  removeProblemFromPlaylist,
  deletePlaylist,
};
