import mongodb from "./db/mongodb";
import {MONGODB_URI, MONGODB_DB} from '$env/static/private'

const options = {
    uri: MONGODB_URI, 
    db: MONGODB_DB
}

export const db = await mongodb(options)
