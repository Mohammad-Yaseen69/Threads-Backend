import mongoose from "mongoose"
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"

const userSchema = new mongoose.Schema({
    name: {
        type: String,
    },
    userName: {
        type: String,
        required: true,
        unique: true,
        lowerCase: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowerCase: true,
        trim: true
    },
    password: {
        type: String,
        required: true
    },
    followers: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }
    ],
    following: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }
    ],
    pfp: {
        url: String,
        filePath: String
    },
    bio: {
        type: String,
        default: ""
    },

    instagram: String,

    token: String
}, { timestamps: true })


userSchema.pre('save', async function () {
    try {
        if (this.isModified('password')) {
            this.password = await bcrypt.hash(this.password, 10)
        }
    } catch (error) {
        console.log(error)
    }
})


userSchema.methods.comparePassword = async function (password) {
    return await bcrypt.compare(password, this.password)
}


userSchema.methods.generateToken = function () {
    return jwt.sign(
        {
            _id: this._id
        },
        process.env.SECRET_KEY,
        {
            expiresIn: process.env.EXPIRES_IN
        }
    )
}

export const User = mongoose.model('User', userSchema)