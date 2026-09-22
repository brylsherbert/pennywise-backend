import * as userService from "./user.service.js";
import { handleResponse } from "../../utils/response-handler.utils.js";

export const getCurrentUserController = async (req, res, next) =>
{
  try {
    const userId = req?.user?.id;
    const currentUser = await userService.getCurrentUser(userId);

    handleResponse(res, 200, "Fetched users successfully", currentUser.data);
  } catch (error) {
    next(error);
  }
};

export const updateCurrentUserController = async (req, res, next) =>
{
  try {
    const updatedUser = await userService.updateCurrentUser(
      req.body,
      req.user,
      res,
    );
    handleResponse(res, 200, "User updated successfully", updatedUser);
  } catch (error) {
    next(error);
  }
};

export const deleteCurrentUserController = async (req, res, next) =>
{
  try {
    const deletedMessage = await userService.deleteCurrentUser(req.user);
    handleResponse(res, 200, deletedMessage?.message);
  } catch (error) {
    next(error);
  }
};

export const resetAllDataController = async (req, res, next) =>
{
  try {
    const resetDataResult = await userService.resetAllData(req.user);
    handleResponse(res, 200, resetDataResult);
  } catch (error) {
    next(error);
  }
};

export const importGuestDataController = async (req, res, next) =>
{
  try {
    const importResult = await userService.importGuestData(req.body, req.user);
    handleResponse(res, 201, "Guest data imported successfully", importResult);
  } catch (error) {
    next(error);
  }
};
