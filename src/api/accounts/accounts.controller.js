import * as accountsService from "./accounts.service.js";
import { handleResponse } from "../../utils/response-handler.utils.js";

export const getAllAccountsController = async (req, res, next) => {
  try {
    const limit = Number(req.query.limit) || 20;
    const cursor = req.query.cursor;
    const allAccounts = await accountsService.getAllAccounts(req.user, limit, cursor);
    handleResponse(res, 200, "Fetched accounts successfully", allAccounts.data, allAccounts.pagination);
  } catch (error) {
    next(error);
  }
};

export const getAccountByIdController = async (req, res, next) => {
  try {
    const category = await accountsService.getAccountById(
      req.params.id,
      req.user,
    );
    handleResponse(res, 200, "Fetched category successfully", category);
  } catch (error) {
    next(error);
  }
};

export const createAccountController = async (req, res, next) => {
  try {
    const newAccount = await accountsService.createAccount(
      req.body,
      req.user,
      res,
    );
    handleResponse(res, 201, "Account created successfully", newAccount);
  } catch (error) {
    next(error);
  }
};

export const updateAccountByIdController = async (req, res, next) => {
  try {
    const updatedAccount = await accountsService.updateAccountById(
      req.params.id,
      req.body,
      req.user,
    );
      
    handleResponse(res, 200, "Account updated successfully", updatedAccount);
  } catch (error) {
    next(error);
  }
};

export const deleteAccountByIdController = async (req, res, next) => {
  try {
    await accountsService.deleteAccountById(req.params.id, req.user);
    handleResponse(res, 200, "Account deleted successfully");
  } catch (error) {
    next(error);
  }
};
