import { User } from "../models/user.model.js";
import jwt from "jsonwebtoken"
import { ApiError } from "../utils/apiError.js"
import { asyncHandler } from "../utils/asyncHandler.js";

const userAuth = asyncHandler(async (req, res, next) => {
        const token = req.cookies.token;


        if (!token) {
            throw new ApiError(401, "Unauthorized request");
        }

        const Id = jwt.verify(token, process.env.SECRET_KEY)

        const user = await User.findOne({ _id: Id._id })

        if (!user) {
            throw new ApiError(404, "User not Found")
        }


        req.user = user

        next()
})


export { userAuth }