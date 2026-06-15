import * as authService from "./auth.service.js";
import { handleResponse } from "../../utils/response-handler.utils.js";

export const createUser = async (req, res, next) =>
{
    try {
        const newUser = await authService.createUser(req.body, res);
        handleResponse(res, 201, "User created successfully", newUser);
    } catch (error) {
        next(error);
    }
};

export const loginUser = async (req, res, next) =>
{
    try {
        const loggedInUser = await authService.loginUser(req.body, res);
        handleResponse(
            res,
            200,
            `Welcome back, ${loggedInUser.user.username}! You have logged in successfully.`,
            loggedInUser,
        );
    } catch (error) {
        next(error);
    }
};

export const logoutUser = (req, res, next) =>
{
    res.cookie("jwt", "", {
        httpOnly: true,
        expires: new Date(0),
    });

    handleResponse(res, 200, "User logged out successfully");
};