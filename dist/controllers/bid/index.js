"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.closeBid = exports.getBid = exports.listBidders = exports.createBid = void 0;
const error_1 = require("../../middlewares/error");
const bidModel_1 = __importDefault(require("../../models/bidModel"));
const projectModel_1 = __importDefault(require("../../models/projectModel")); // Assuming Project model is available
const processDouments_1 = require("../../helpers/processDouments");
const sendMail_1 = require("../../utils/sendMail");
const mongoose_1 = __importDefault(require("mongoose"));
const createBid = async (req, res, next) => {
    try {
        const { projectId, amount, proposal, days, supportingDocs } = req.body;
        const user = req.user._id;
        // Validate required fields
        if (!projectId || !amount || !proposal) {
            return next(new error_1.CustomError("Project ID, amount, and proposal are required.", 404));
        }
        // Check if the project exists
        const projectExists = await projectModel_1.default.findById(projectId);
        if (!projectExists) {
            return next(new error_1.CustomError("Project not found.", 404));
        }
        // Check if the user has already placed a bid on this project
        const existingBid = await bidModel_1.default.findOne({ projectId: new mongoose_1.default.Types.ObjectId(projectId), user });
        if (existingBid) {
            return next(new error_1.CustomError("You have already placed a bid on this project.", 400));
        }
        const docsInfo = await (0, processDouments_1.processDocuments)(supportingDocs);
        // Create a new bid
        const newBid = new bidModel_1.default({
            projectId,
            user,
            amount,
            proposal,
            status: "pending",
            "deliveredIn.days": days,
            supportingDocs: docsInfo?.map(doc => ({
                fileName: doc?.fileName,
                fileUrl: doc?.getUrl,
                key: doc?.key,
                ...doc
            }))
        });
        // Save the bid to the database
        await newBid.save();
        projectExists?.bids.push(newBid);
        await projectExists?.save();
        try {
            await (0, sendMail_1.sendMail)({
                email: req.user.email,
                subject: `Application sent for ${projectExists.title}`,
                message: projectExists.title,
            });
        }
        catch (error) {
            console.log(error);
        }
        res.status(201).json({
            success: true,
            message: "Bid created successfully",
            bid: newBid,
        });
    }
    catch (error) {
        next(new error_1.CustomError(error.message));
    }
};
exports.createBid = createBid;
const listBidders = async (req, res, next) => {
    try {
        const { projectId } = req.params;
        // Validate required fields
        if (!projectId) {
            return next(new error_1.CustomError("Project ID is required.", 404));
        }
        const bids = await bidModel_1.default.find({ projectId });
        if (!bids)
            return next(new error_1.CustomError("No bids", 404));
        res.status(200).json({
            success: true,
            bids
        });
    }
    catch (error) {
        next(new error_1.CustomError(error.message));
    }
};
exports.listBidders = listBidders;
const getBid = async (req, res, next) => {
    try {
        const { bidId } = req.params;
        if (!bidId) {
            return next(new error_1.CustomError("Bid ID is required.", 404));
        }
        const bid = await bidModel_1.default.findById(bidId).populate({
            path: "user",
            select: "name",
        });
        if (!bid)
            return next(new error_1.CustomError("Bid not exists", 404));
        res.status(200).json({
            success: true,
            bid
        });
    }
    catch (error) {
        next(new error_1.CustomError(error.message));
    }
};
exports.getBid = getBid;
const closeBid = async (req, res, next) => {
    try {
        const { bidId } = req.params;
        if (!bidId) {
            return next(new error_1.CustomError("Bid ID is required.", 404));
        }
        const bid = await bidModel_1.default.findById(bidId);
        if (!bid)
            return next(new error_1.CustomError("Bid not exists", 404));
        bid.status = 'closed';
        await bid.save();
        res.status(200).json({
            success: true,
            message: "Bid closed"
        });
    }
    catch (error) {
        next(new error_1.CustomError(error.message));
    }
};
exports.closeBid = closeBid;
