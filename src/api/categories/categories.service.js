import { v7 as uuidv7 } from "uuid";
import * as categoriesRepo from "./categories.repo.js";
import * as userRepo from "../user/user.repo.js";
import { authorizeUserAction } from "../../utils/authentication.utils.js";
import { throwErrorWithMessage } from "../../utils/error.utils.js";

export const getAllCategories = async (loggedInUser) => {
  const allCategories = await categoriesRepo.findAllCategoriesByUserId(
    loggedInUser.id,
  );

  if (!allCategories) {
    throwErrorWithMessage("Error fetching categories");
  }

  return allCategories;
};

export const getCategoryById = async (categoryId, loggedInUser) =>
{
  const existingUser = await userRepo.findUserByEmail(loggedInUser?.email);

  if (!existingUser) {
    throwErrorWithMessage("User not found");
  }

  const existingCategory = await categoriesRepo.findCategoryById(categoryId, existingUser?.id);

  if (!existingCategory) {
    throwErrorWithMessage("Category not found");
  }

  authorizeUserAction(existingCategory.user_id, loggedInUser.id);

  return existingCategory;
};

export const createCategory = async (body, loggedInUser) => {
  // Check if there is a user loggedIn to create category
  const existingUser = await userRepo.findUserByEmail(loggedInUser.email);

  if (!existingUser) {
    throwErrorWithMessage("User does not exist.");
  }

  const { name, color } = body;

  if (!name || !color) {
    throwErrorWithMessage("Please fill all fields");
  }

  const categoryData = {
    id: uuidv7(),
    user_id: loggedInUser.id,
    name,
    color,
  };

  const createdCategoryData = await categoriesRepo.insertCategoryToDB(categoryData);

  if (!createdCategoryData) {
    throwErrorWithMessage("Error creating category. Please try again.");
  }

  return createdCategoryData;
};

export const updateCategoryById = async (categoryId, body, loggedInUser) => {
  if (!categoryId) {
    throwErrorWithMessage("Something went wrong. No id found.");
  }

  // Check if there is a user loggedIn to create category
  const existingUser = await userRepo.findUserByEmail(loggedInUser.email);

  if (!existingUser) {
    throwErrorWithMessage("User does not exist.");
  }

  // Check if category exists
  const existingCategory = await categoriesRepo.findCategoryById(categoryId);

  if (!existingCategory) {
    throwErrorWithMessage("Category not found");
  }
  
  // Check if user is authorized.
  authorizeUserAction(existingCategory.user_id, existingUser.id);

  const { name, color } = body;

  if (!name || !color) {
    throwErrorWithMessage("Please fill all fields");
  }

  // Create category object to update in db
  const updateCategoryPayload = {
    id: existingCategory.id,
    user_id: loggedInUser.id,
    name: name ? name : existingCategory.name,
    color: color ? color : existingCategory.color,
  };

  const updatedCategoryData = await categoriesRepo.updateCategoryById(updateCategoryPayload);

  if (!updatedCategoryData) {
    throwErrorWithMessage("Error updating category. Please try again.");
  }

  return { category: updatedCategoryData };
};

export const deleteCategoryById = async (categoryId, loggedInUser) =>
{
  // Check if there is a user loggedIn to create category
  const existingUser = await userRepo.findUserByEmail(loggedInUser.email);

  if (!existingUser) {
    throwErrorWithMessage("User does not exist.");
  }
  
  const existingCategory = await categoriesRepo.findCategoryById(categoryId);
  if (!existingCategory) {
    throwErrorWithMessage("Category does not exist!");
  }

  // Check if user is authorized.
  authorizeUserAction(existingCategory?.user_id, existingUser?.id);

  const result = await categoriesRepo.deleteCategoryById(
    existingCategory.id,
    existingUser?.id,
  );

  if (!result) {
    throwErrorWithMessage("Error deleting category. Please try again.");
  }

  return { message: "Category deleted successfully" };
};
