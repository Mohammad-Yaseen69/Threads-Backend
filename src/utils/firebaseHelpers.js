import { bucket } from "../config/firebase.config.js";
import fs from "fs"
import {ApiError} from "./apiError.js"
import mime from "mime"

const uploadFile = async (destination, localFilePath) => {
    try {
        const fileDestination = destination + "/" + localFilePath
        const fileType = mime.getType(localFilePath)

        await bucket.upload(localFilePath, {
            destination: fileDestination,
            metadata: {
                contentType: fileType
            }
        })

        const file = bucket.file(fileDestination)

        await file.makePublic()

        fs.unlinkSync(localFilePath)

        return file.publicUrl()
    } catch (error) {
        fs.unlinkSync(localFilePath)
        throw new ApiError(400, error.message || "File uploadation failed!")
    }
}


const deleteFile = async (filePath) => {
    try {
        const file = bucket.file(filePath)
        await file.delete()
    } catch (error) {
        throw new ApiError(400, error.message || "File deletion failed!")
    }
}


export {
    uploadFile,
    deleteFile
}