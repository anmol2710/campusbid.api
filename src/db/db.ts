import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

let db: mongoose.Connection;

const ConnectToDB = async () => {
  const DatabaseUrl = process.env.DATABASE_URL as string;

  try {
    await mongoose.connect(DatabaseUrl);
    db = mongoose.connection;
    console.log("CampusBid_DB Connected.");

  } catch (error) {
    console.log("Error connecting to databases:", error);
  }
};

export { db };
export default ConnectToDB;
