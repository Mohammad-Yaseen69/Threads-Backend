import admin from "firebase-admin"
import {createRequire} from "module"
const require =  createRequire(import.meta.url)
const serviceAccount = require("./threads-aea31-firebase-adminsdk-je5vx-1765318067.json")


admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: "gs://threads-aea31.appspot.com"
})


const bucket = admin.storage().bucket()


export {bucket}