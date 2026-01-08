import { User } from "../models/user.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import {ApiResponse} from "../utils/ApiResponse.js"
import mongoose from "mongoose";
import {uploadOnCloudinary} from "../utils/cloudinary.js"

// generate Access Token and Refresh Token
const generateAccessAndRefreshToken = async (userId)=>{
    try {
        const user = await User.findById(userId).select("-password -refreshToken")
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()
    
        user.refreshToken = refreshToken
        await user.save({ validateBeforeSve: false})
    
        return {accessToken, refreshToken};
    } catch (error) {
        throw new ApiError(500, "error generating tokens", error)
    }
}


// Register User Controller
const registerUser = asyncHandler( async (req, res)=> {
        const {fullName, email, username, password} = req.body;
        
        if(
            [fullName, email, username, password].some((field)=>{ field?.trim()===""})
        ){
            throw new ApiError(400, "All fields are required");
        }

        const existedUser = await User.findOne({
            $or: [{email}, {username}] 
        });

        if(existedUser){
            throw new ApiError(409, "User with email or username already exist");
        }

        console.log(req.files);

        const avatarLocalPath = req.files?.avatar[0]?.path;

        let coverImageLocalPath;
        if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length> 0){
            coverImageLocalPath = req.files.coverImage[0].path;
        }

        if(!avatarLocalPath){
            throw new ApiError(400, "Avatar image is required")
        }

        //upload on cloudinary
        const avatar = await uploadOnCloudinary(avatarLocalPath);
        const coverImage = await uploadOnCloudinary(coverImageLocalPath)

        if(!avatar) {
            throw new ApiError(500, "Error uploading avatar image")
        }

        const user = await mongoose.create({
            username: username.toLowerCase(),
            email,
            fullName,
            password,
            avatar: avatar.secure_url,
            coverImage: coverImage?.secure_url || ""
        })

        const createdUser = await findById(user._id).select("-password -refreshToken")

        if(!createdUser){
            throw new ApiError(500, "Erro creating new user")
        }

        res.status(201).json(
            new ApiResponse(200, createdUser, "User successfully registered")
        )
})


// LoginUser Register
const loginUser = asyncHandler( async (req, res)=> {
    const {username, email, password} = req.body;

    if(!(username || email)){
        throw new ApiError(400, "username or email is required")
    }

    const user = await User.findOne({
        $or: [{email}, {username}]
    })

    if(!user){
        throw new ApiError(400, "User does not exist")
    }

    const isPasswordCorrect = await user.isPasswordCorrect(password)

    if(!isPasswordCorrect){
        throw new ApiError(400, "Invalid user credentials")
    }

    const {accessToken, refreshToken} = await generateAccessAndRefreshToken(user._id)

    const loginUser = await User.findById(user._id).select("-password -refreshToken")

    const options = {
        httpOnly: true,
        secure: true
    }

    res.status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponse
        (201, 
        "User logged in successfully",
         {
            user: loginUser, accessToken, refreshToken
         }
        )
    )

})

export {registerUser, loginUser}