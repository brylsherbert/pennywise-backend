import * as categoriesService from "./categories.service.js";
import { handleResponse } from "../../utils/response-handler.utils.js";

export const getAllCategoriesController = async (req, res, next) => {
  try {
    const allCategories = await categoriesService.getAllCategories(req.user);
    handleResponse(res, 200, "Fetched categories successfully", allCategories);
  } catch (error) {
    next(error);
  }
};

export const getCategoryByIdController = async (req, res, next) => {
  try {
    const category = await categoriesService.getCategoryById(
      req.params.id,
      req.user,
    );
    handleResponse(res, 200, "Fetched category successfully", category);
  } catch (error) {
    next(error);
  }
};

export const createCategoryController = async (req, res, next) => {
  try {
    const newCategory = await categoriesService.createCategory(
      req.body,
      req.user,
      res,
    );
    handleResponse(res, 201, "Category created successfully", newCategory);
  } catch (error) {
    next(error);
  }
};

export const updateCategoryByIdController = async (req, res, next) => {
  try {
    const updatedCategory = await categoriesService.updateCategoryById(
      req.params.id,
      req.body,
      req.user,
    );
      
    handleResponse(res, 200, "Category updated successfully", updatedCategory);
  } catch (error) {
    next(error);
  }
};

export const deleteCategoryByIdController = async (req, res, next) => {
  try {
    await categoriesService.deleteCategoryById(req.params.id, req.user);
    handleResponse(res, 200, "Category deleted successfully");
  } catch (error) {
    next(error);
  }
};
