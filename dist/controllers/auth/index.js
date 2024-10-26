"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUser = exports.logout = exports.resetpassword = exports.forgotPassword = exports.verifyToken = exports.login = exports.otpVerification = exports.resentOtp = exports.register = void 0;
const userModel_1 = __importDefault(require("../../models/userModel"));
const error_1 = require("../../middlewares/error");
const setCookie_1 = __importDefault(require("../../utils/setCookie"));
const generateOTP_1 = __importDefault(require("../../utils/generateOTP"));
const crypto_1 = __importDefault(require("crypto"));
const sendMail_1 = require("../../utils/sendMail");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const otpModal_1 = __importDefault(require("../../models/otpModal"));
const register = async (req, res, next) => {
    try {
        const { name, email, password } = req.body;
        const user = await userModel_1.default.findOne({ email });
        if (user)
            return next(new error_1.CustomError("User already exists", 400));
        const OTP = (0, generateOTP_1.default)();
        // await otpQueue.add("otpVerify", {
        //   options: {
        //     email,
        //     subject: "Verification",
        //     message: `Your verification OTP for registration is ${OTP}`,
        //   },
        // });
        await (0, sendMail_1.sendMail)({
            email,
            subject: "Verification",
            message: OTP,
            tag: "otp",
        });
        const newUser = {
            name,
            email,
            password,
        };
        // Save OTP and newUser data in the OTP model
        const hashedOTP = crypto_1.default.createHash("sha256").update(OTP).digest("hex");
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
        const existingOtpRecord = await otpModal_1.default.findOne({ email });
        if (existingOtpRecord) {
            existingOtpRecord.otp = hashedOTP;
            existingOtpRecord.expiresAt = expiresAt;
            existingOtpRecord.newUser = newUser;
            await existingOtpRecord.save();
        }
        else {
            const otpRecord = new otpModal_1.default({
                email,
                otp: hashedOTP,
                expiresAt,
                newUser,
            });
            await otpRecord.save();
        }
        res
            .status(200)
            .cookie("email", email, {
            httpOnly: true,
            sameSite: "none",
            secure: true,
        })
            .json({
            success: true,
            message: `Verification OTP sent to ${email}`,
        });
    }
    catch (error) {
        console.log(error);
        next(new error_1.CustomError(error.message));
    }
};
exports.register = register;
const resentOtp = async (req, res, next) => {
    try {
        const { email } = req.body;
        console.log(email);
        const otpRecord = await otpModal_1.default.findOne({ email });
        if (!otpRecord)
            return next(new error_1.CustomError("User not found", 404));
        const OTP = (0, generateOTP_1.default)();
        // await otpQueue.add("otpVerify", {
        //   options: {
        //     email,
        //     subject: "Verification",
        //     message: `Your verification OTP for registration is ${OTP}`,
        //   },
        // });
        await (0, sendMail_1.sendMail)({
            email,
            subject: "Verification",
            message: OTP,
            tag: "otp",
        });
        otpRecord.otp = crypto_1.default.createHash("sha256").update(OTP).digest("hex");
        otpRecord.expiresAt = new Date(Date.now() + 10 * 60 * 1000); // OTP valid for 10 minutes
        await otpRecord.save();
        res.status(200).json({
            success: true,
            message: `OTP resent successfully to ${email}`,
        });
    }
    catch (error) {
        console.log(error);
        next(new error_1.CustomError(error.message));
    }
};
exports.resentOtp = resentOtp;
const otpVerification = async (req, res, next) => {
    try {
        const { otp, email } = req.body;
        const otpRecord = await otpModal_1.default.findOne({ email });
        if (!otpRecord)
            return next(new error_1.CustomError("OTP not found", 404));
        const hashedOtp = crypto_1.default.createHash("sha256").update(otp).digest("hex");
        if (hashedOtp !== otpRecord.otp ||
            otpRecord.expiresAt < new Date(Date.now())) {
            return next(new error_1.CustomError("Invalid or expired OTP", 400));
        }
        const newUser = otpRecord.newUser;
        const user = await userModel_1.default.create(newUser);
        await otpModal_1.default.deleteOne({ email });
        (0, setCookie_1.default)({
            user,
            res,
            next,
            message: "Verification Success",
            statusCode: 200,
        });
    }
    catch (error) {
        console.log(error);
        next(new error_1.CustomError(error.message));
    }
};
exports.otpVerification = otpVerification;
const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        const user = await userModel_1.default.findOne({ email }).select("+password");
        if (!user)
            return next(new error_1.CustomError("Email not registered", 404));
        // Use the comparePassword method here
        const isMatched = await user.comparePassword(password);
        if (!isMatched)
            return next(new error_1.CustomError("Wrong password", 400));
        (0, setCookie_1.default)({
            user,
            res,
            next,
            message: "Login Success",
            statusCode: 200,
        });
    }
    catch (error) {
        console.log(error);
        next(new error_1.CustomError(error.message));
    }
};
exports.login = login;
const verifyToken = async (req, res, next) => {
    try {
        const { token } = req.body;
        if (!token)
            return next(new error_1.CustomError("Invalid token received or has expired!", 400));
        const secret = process.env.JWT_SECRET;
        if (!secret)
            return next(new error_1.CustomError("Jwt Secret not defined", 400));
        const decoded = jsonwebtoken_1.default.verify(token, secret);
        const user = await userModel_1.default.findById(decoded.id);
        if (!user)
            return next(new error_1.CustomError("Invalid token or has expired!", 400));
        res.status(200).json({
            success: true,
            isValidToken: true,
            message: "Token verified successfully!",
        });
    }
    catch (error) {
        console.log(error);
        next(new error_1.CustomError(error.message));
    }
};
exports.verifyToken = verifyToken;
const forgotPassword = async (req, res, next) => {
    try {
        const { email } = req.body;
        const user = await userModel_1.default.findOne({ email });
        if (!user)
            return next(new error_1.CustomError("Email not registered", 400));
        const resetToken = await user.getToken();
        await user.save(); //saving the token in user
        const url = `${process.env.FRONTEND_URL}/resetpassword/${resetToken}`;
        // await otpQueue.add("otpVerify", {
        //   options: {
        //     email: email,
        //     subject: "Password Reset",
        //     message: `You reset password link is here ${url}`,
        //   },
        // });
        await (0, sendMail_1.sendMail)({
            email,
            subject: "Password Reset",
            message: url,
            tag: "password_reset",
        });
        res.status(200).json({
            success: true,
            message: `Reset password link sent to ${email}`,
        });
    }
    catch (error) {
        next(new error_1.CustomError(error.message));
    }
};
exports.forgotPassword = forgotPassword;
const resetpassword = async (req, res, next) => {
    try {
        const resetToken = req.params.token;
        if (!resetToken)
            return next(new error_1.CustomError("Something went wrong", 400));
        const resetPasswordToken = crypto_1.default
            .createHash("sha256")
            .update(resetToken)
            .digest("hex");
        const user = await userModel_1.default.findOne({
            resetPasswordToken,
            resetTokenExpiry: {
                $gt: Date.now(),
            },
        });
        if (!user)
            return next(new error_1.CustomError("Your link is expired! Try again", 400));
        const salt = crypto_1.default.randomBytes(16).toString("hex");
        crypto_1.default.pbkdf2(req.body.password, salt, 1000, 64, "sha512", async (err, derivedKey) => {
            if (err)
                return next(new error_1.CustomError(err.message, 500));
            user.password = derivedKey.toString("hex");
            user.salt = salt;
            user.resetPasswordToken = null;
            user.resetTokenExpiry = null;
            await user.save();
            res.status(200).json({
                success: true,
                message: "You password has been changed",
            });
        });
    }
    catch (error) {
        next(new error_1.CustomError(error.message));
    }
};
exports.resetpassword = resetpassword;
const logout = async (req, res) => {
    res
        .status(200)
        .cookie("token", null, {
        expires: new Date(Date.now()),
        sameSite: "none",
        secure: true,
    })
        .json({
        success: true,
        message: "Logged out",
    });
};
exports.logout = logout;
const getUser = async (req, res, next) => {
    try {
        const user = await userModel_1.default.findById(req.user._id);
        if (!user)
            return next(new error_1.CustomError("User not found", 400));
        res.status(200).json({
            success: true,
            user,
        });
    }
    catch (error) {
        next(new error_1.CustomError(error.message));
    }
};
exports.getUser = getUser;
