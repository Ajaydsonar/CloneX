import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";
import { ApiResponce } from "../utils/ApiResponce.js";
import { ApiError } from "../utils/ApiError.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

const registerUser = asyncHandler(async (req, res) => {
  // Get User datails from Frontend - req.body
  // validation - not empty
  // check if user exist : username, email
  // check for images, check for avatar
  //upload them to clooudinary, avatar
  //create user object - create entry in DB
  //remove password and refresh token field from reeponse
  // check for user creation
  // return response

  const { fullName, password, email, username } = req.body;

  if (
    [fullName, password, email, username].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "Please Provide All the Fields");
  }

  const existedUser = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (existedUser) {
    throw new ApiError(409, "User with email or username Already Exists");
  }

  const avatarLocalPath = req.files?.avatar[0]?.path;

  // optimize way
  const coverImageLocalPath = req.files?.coverImage?.[0]?.path ?? undefined;

  // another way of doing same thing
  // let coverImageLocalPath;
  // if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0){
  //   coverImageLocalPath = req.files.coverImage[0].path;
  // }

  if (!avatarLocalPath) {
    throw new ApiError(400, "Please Provide Avatar!");
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!avatar) {
    throw new ApiError(400, "Please provide avatar");
  }

  const user = await User.create({
    fullName,
    email,
    username: username.toLowerCase(),
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    password,
  });

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  if (!createdUser) {
    throw new ApiError(500, "Something Went Wrong! while registring the user");
  }

  return res
    .status(201)
    .json(new ApiResponce(200, createdUser, "user registered Successfully!"));
});

export { registerUser };
