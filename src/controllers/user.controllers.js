import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";
import { ApiResponce } from "../utils/ApiResponce.js";
import { ApiError } from "../utils/ApiError.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import jwt from "jsonwebtoken";

const options = {
  httpOnly: true,
  secure: true,
};

// generate access token and refresh token
const generateAccessAndRefreshToken = async (userID) => {
  try {
    const user = await User.findById(userID);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.refreshAccessToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something Went Wrong while Generating Access and Refresh Token"
    );
  }
};

// register user
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

  const avatarLocalPath = req.files?.avatar?.[0]?.path;

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

// login user
const loginUser = asyncHandler(async (req, res) => {
  // Get data  req.body;
  //email or username
  //findUser
  // password check
  //access token
  // send cookies

  const { username, email, password } = req.body;

  if (!email && !username)
    throw new ApiError(401, "Email or Username is Required!");

  const user = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (!user) throw new ApiError(404, "User Does not Exist!");

  const isPasswordValid = await user.isPasswordCorrect(password);

  if (!isPasswordValid) throw new ApiError(404, "Invalid User Credentials!");

  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    user._id
  );

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponce(
        200,
        { loggedInUser, accessToken, refreshToken },
        "User loggedIn SuccessFully!"
      )
    );
});

// logout user
const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        refreshToken: undefined,
      },
    },
    {
      new: true,
    }
  );

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponce(200, {}, "User logged Out Successfully!"));
});

// refresh token Update
const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) throw new ApiError(401, "Unauthorized Request");

  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    const user = await User.findById(decodedToken._id);

    if (!user) throw new ApiError(401, "Invalid Refresh Token");

    if (incomingRefreshToken !== user.refreshToken)
      throw new ApiError(401, "Refresh Token is expired or invalid");

    const { accessToken, newRefreshToken } =
      await generateAccessAndRefreshToken(user._id);

    res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new ApiResponce(
          200,
          { accessToken, refreshToken: newRefreshToken },
          "Access Token Refreshed Successfully!"
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid Refresh Token");
  }
});

// update user password
const updateUserPassword = asyncHandler(async (req, res) => {
  // get old and new passoword
  const { newPassword, oldPassword } = req.body;

  if (!(newPassword || oldPassword))
    throw new ApiError(400, "Password is required!");

  const user = await User.findById(req.user?._id);
  const isPasswordCorrect = req.user.isPasswordCorrect(oldPassword);

  if (!isPasswordCorrect) throw new ApiError(400, "Password is Incorrect!");

  user.password = newPassword;

  user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponce(200, {}, "Your Password Changed SuccessFully!"));
});

//get user details
const getUserDetails = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponce(200, req.user, "Current user fetched SuccessFully!"));
});

// update Account details
const updateAccountDetails = asyncHandler(async (req, res) => {
  const { fullName, email } = req.body;

  if (!(fullName && email)) throw new ApiError(400, "All field Are required!");

  const updatedUserDetails = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        fullName,
        email,
      },
    },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(
      new ApiResponce(
        200,
        updatedUserDetails,
        "Account Details Updated Successfully!"
      )
    );
});

// Update User Avatar

const updateUserAvatar = asyncHandler(async (req, res) => {
  const avatarLocalPath = req.file?.path;

  if (!avatarLocalPath) throw new ApiError(400, "Avatar file is missing!");

  const avatar = await uploadOnCloudinary(avatarLocalPath);

  if (!avatarLocalPath.url)
    throw new ApiError(200, "Error Occured While Uploading Avatar!");

  const user = await User.findByIdAndUpdate(
    user._id,
    {
      $set: {
        avatar: avatar.url,
      },
    },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponce(200, user, "Avatar Changed Successfully!"));
});

// Update User Cover Image

const updateUserCoverImage = asyncHandler(async (req, res) => {
  const coverImageLocalPath = req.file?.path;

  if (!coverImageLocalPath)
    throw new ApiError(400, "Cover Image file is missing!");

  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!coverImage.url)
    throw new ApiError(200, "Error Occured While Uploading Cover image!");

  const user = await User.findByIdAndUpdate(
    user._id,
    {
      $set: {
        coverImage: coverImage.url,
      },
    },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponce(200, user, "Cover Image Changed Successfully!"));
});

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  updateUserPassword,
  getUserDetails,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
};
