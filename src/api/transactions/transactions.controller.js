import * as transactionsService from "./transactions.service.js";
import { handleResponse } from "../../utils/response-handler.utils.js";

export const getAllTransactionsController = async (req, res, next) => {
  try {
    const limit = Number(req.query.limit) || 20;
    const cursor = req.query.cursor;
    const allTransactions = await transactionsService.getAllTransactions(req.user, limit, cursor);
    handleResponse(res, 200, "Fetched transactions successfully", allTransactions.data, allTransactions.pagination);
  } catch (error) {
    next(error);
  }
};

export const getAllTransactionsByBudgetIdController = async (req, res, next) => {
  try {
    const allTransactions = await transactionsService.getAllTransactionsByBudgetId(req.params.id, req.user);
    handleResponse(res, 200, "Fetched transactions by budgetId successfully", allTransactions.data, allTransactions.pagination);
  } catch (error) {
    next(error);
  }
};

export const getAllTransactionsByAccountIdController = async (req, res, next) => {
  try {
    const allTransactions = await transactionsService.getAllTransactionsByAccountId(req.params.id, req.user);
    handleResponse(res, 200, "Fetched transactions by accountId successfully", allTransactions.data, allTransactions.pagination);
  } catch (error) {
    next(error);
  }
};

export const getTransactionByIdController = async (req, res, next) => {
  try {
    const transaction = await transactionsService.getTransactionById(
      req.params.id,
      req.user,
    );
    handleResponse(res, 200, "Fetched transaction successfully", transaction);
  } catch (error) {
    next(error);
  }
};

export const createTransactionController = async (req, res, next) => {
  try {
    const newTransaction = await transactionsService.createTransaction(
      req.body,
      req.user,
      res,
    );
    handleResponse(res, 201, "Transaction created successfully", newTransaction);
  } catch (error) {
    next(error);
  }
};

export const updateTransactionByIdController = async (req, res, next) => {
  try {
    const updatedTransaction = await transactionsService.updateTransactionById(
      req.params.id,
      req.body,
      req.user,
    );
      
    handleResponse(res, 200, "Transaction updated successfully", updatedTransaction);
  } catch (error) {
    next(error);
  }
};

export const deleteTransactionByIdController = async (req, res, next) => {
  try {
    const deletedTransaction = await transactionsService.deleteTransactionById(req.params.id, req.user);
    handleResponse(res, 200, "Transaction deleted successfully", deletedTransaction);
  } catch (error) {
    next(error);
  }
};
