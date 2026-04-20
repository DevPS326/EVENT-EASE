const logger = require('../utils/logger');
const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI);
        logger.info(`MongoDB Database Connected: ${conn.connection.host}`);
    } catch (error) {
        logger.error(`Error connecting to DB: ${error.message}`);
        // Exit process with failure
        process.exit(1);
    }
};

module.exports = connectDB;