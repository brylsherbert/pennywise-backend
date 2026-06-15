import * as budgetsService from "./budgets.service.js";
import { handleResponse } from "../../utils/response-handler.utils.js";

export const getAllBudgetsController = async (req, res, next) => {
  try {
    const limit = Number(req.query.limit) || 20;
    const cursor = req.query.cursor;
    const allBudgets = await budgetsService.getAllBudgets(req.user, limit, cursor);
    handleResponse(res, 200, "Fetched budgets successfully", allBudgets.data, allBudgets.pagination);
  } catch (error) {
    next(error);
  }
};

export const getBudgetByIdController = async (req, res, next) => {
  try {
    const budget = await budgetsService.getBudgetById(
      req.params.id,
      req.user,
    );
    handleResponse(res, 200, "Fetched budget successfully", budget);
  } catch (error) {
    next(error);
  }
};

export const getBudgetsSummaryController = async (req, res, next) =>
{
  try {
    const summary = await budgetsService.getBudgetSummary(req.user);
    handleResponse(res, 200, "Fetched budget summary successfully", summary);
  } catch (error) {
    next(error);
  }
}

export const createBudgetController = async (req, res, next) => {
  try {
    const newBudget = await budgetsService.createBudget(
      req.body,
      req.user,
      res,
    );
    handleResponse(res, 201, "Budget created successfully", newBudget);
  } catch (error) {
    next(error);
  }
};

export const updateBudgetByIdController = async (req, res, next) => {
  try {
    const updatedBudget = await budgetsService.updateBudgetById(
      req.params.id,
      req.body,
      req.user,
    );
      
    handleResponse(res, 200, "Budget updated successfully", updatedBudget);
  } catch (error) {
    next(error);
  }
};

export const deleteBudgetByIdController = async (req, res, next) => {
  try {
    const deletedBudget = await budgetsService.deleteBudgetById(req.params.id, req.user);
    handleResponse(res, 200, "Budget deleted successfully", deletedBudget);
  } catch (error) {
    next(error);
  }
};
