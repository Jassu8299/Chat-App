const mongo = require('mongoose')

const connectDB = async () => {
    mongo.connect(process.env.MONGO_URL, {dbName: "jassu8299db"})
    .then(() => {
        console.log('Database connected successfully')
    })
    .catch((err) => {
        console.log('Database connection failed', err)
    })
}

module.exports = connectDB;