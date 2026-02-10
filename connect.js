import mongoose from "mongoose";

console.log("Attempting to connect to MongoDB...");

export const connectDB = async () => {
    try {
        await mongoose.connect("mongodb://127.0.0.1:27017/pokebdd");
        console.log("Connected to MongoDB successfully");
    } catch (error) {
        console.error("Error connecting to MongoDB:", error);
        process.exit(1);
    }
};

connectDB();