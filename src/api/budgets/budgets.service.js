import { v7 as uuidv7 } from "uuid";
import * as budgetsRepo from "./budgets.repo.js";
import * as userRepo from "../user/user.repo.js";
import * as transactionsRepo from "../transactions/transactions.repo.js";
import * as categoriesRepo from "../categories/categories.repo.js";
import { authorizeUserAction } from "../../utils/authentication.utils.js";
import { decodeCursor, encodeCursor } from "../../utils/cursor.utils.js";
import { withTransaction } from "../../utils/db-transaction.utils.js";
import { handleDeleteTransactionWithAccount } from "../transactions/transactions.service.js";
import { throwErrorWithMessage } from "../../utils/error.utils.js";

export const getAllBudgets = async (loggedInUser, limit, cursor) =>
{
  // Check if user loggedIn is a valid user
  const existingUser = await userRepo.findUserByEmail(loggedInUser.email);

  if (!existingUser) {
    throwErrorWithMessage("User does not exist.");
  }

  let decodedCursor = null;

  if (cursor) {
    decodedCursor = decodeCursor(cursor);
  }

  const allBudgets = await budgetsRepo.findAllBudgetsByUserId(existingUser.id, limit, decodedCursor);

  if (!allBudgets) {
    throwErrorWithMessage("Error fetching budgets");
  }

  const hasMoreBudgets = allBudgets?.length > limit;

  if (hasMoreBudgets) {
    allBudgets.pop();
  }

  const lastBudget = allBudgets[allBudgets?.length - 1];

  const nextCursor = hasMoreBudgets ? encodeCursor(lastBudget) : null;

  return {
    data: allBudgets.map(({ ...budget }) => budget),
    pagination: {
      nextCursor,
      hasMore: hasMoreBudgets,
    },
  };
};

export const getBudgetById = async (budgetId, loggedInUser) =>
{
  // Check if user loggedIn is a valid user
  const existingUser = await userRepo.findUserByEmail(loggedInUser.email);

  if (!existingUser) {
    throwErrorWithMessage("User does not exist.");
  }

  const existingBudget =
    await budgetsRepo.findBudgetById(budgetId, existingUser.id);

  if (!existingBudget) {
    throwErrorWithMessage("Budget not found");
  }

  authorizeUserAction(existingBudget.user_id, existingUser.id);

  return existingBudget;
};

export const createBudget = async (createPayload, loggedInUser) =>
{
  // Check if there is a user loggedIn to create budget
  const existingUser = await userRepo.findUserByEmail(loggedInUser.email);

  if (!existingUser) {
    throwErrorWithMessage("User does not exist.");
  }

  const { category_id, name, target_amount } = createPayload;

  // Validate payload
  if (!name ) {
    throwErrorWithMessage("Please fill all required fields");
  }

  let existingCategory;

  if (category_id) {
    existingCategory = await categoriesRepo.findCategoryById(category_id, existingUser.id);
    
    // Check if category exists
    if (!existingCategory) {
      throwErrorWithMessage("Category not found");
    }
  }

  // Gather budget data and insert to database using budget helper
  const budgetPayload = {
    id: uuidv7(),
    user_id: existingUser.id,
    category_id: category_id ? existingCategory.id : null,
    name,
    target_amount,
  };

  const createdBudget = await budgetsRepo.insertBudgetToDB(budgetPayload);

  if (!createdBudget) {
    throwErrorWithMessage("Error creating budget, please try again.");
  }

  return createdBudget;
};

export const updateBudgetById = async (budgetId, updatePayload, loggedInUser) =>
{
  if (!budgetId) throwErrorWithMessage("Something went wrong. No id found.");

  const existingBudget = await getBudgetById(budgetId, loggedInUser);

  // 6. Gather payload
  const {
    category_id,
    name,
    target_amount,
  } = updatePayload;

  let newCategory;

  if (category_id) {
    newCategory = await categoriesRepo.findCategoryById(category_id, loggedInUser.id);
  
    if (!newCategory) {
      throwErrorWithMessage("Budget not found");
    }
  }

  const updateBudgetPayload = {
    id: existingBudget?.id,
    user_id: loggedInUser?.id,
    category_id: newCategory?.id ?? existingBudget?.category_id,
    name: name || existingBudget?.name,
    target_amount: target_amount ?? existingBudget?.target_amount,
  };

  const updatedBudgetData = await budgetsRepo.updateBudgetById(updateBudgetPayload);

  if (!updatedBudgetData) {
    throwErrorWithMessage("Error in updating budget");
  }

  return updatedBudgetData;
};

export const getBudgetSummary = async (loggedInUser) =>
{
  const existingUser = await userRepo.findUserByEmail(loggedInUser.email);
  
  if (!existingUser) {
    throwErrorWithMessage("User does not exist.");
  }

  const unallocatedSumamry = await budgetsRepo.getUserBudgetSummary(existingUser.id);

  if (!unallocatedSumamry) {
    throwErrorWithMessage("Summary does not exist.");
  }

  return unallocatedSumamry;
}

export const deleteBudgetById = async (budgetId, loggedInUser) =>
{
  const existingBudget = await getBudgetById(budgetId);

  const allTransaction = await transactionsRepo.findAllTransactionsByBudgetId(existingBudget?.id, loggedInUser?.id);

  if (!allTransaction) {
    throwErrorWithMessage("Budget does not exist!");
  }

  const deleteBudgetPayload = {
    all_transaction: allTransaction,
    user_id: loggedInUser?.id
  }

  return withTransaction((client) => handleBudgetDeletionWithTransaction(existingBudget?.id, deleteBudgetPayload, client));
};

// Helpers
export const handleBudgetDeletionWithTransaction = async (budgetId, deleteBudgetPayload, client) =>
{
  const { all_transaction, user_id } = deleteBudgetPayload;
  
  for (let i = 0, length = all_transaction.length; i < length; i ++) {
    await handleDeleteTransactionWithAccount(all_transaction[i], client);
  }
  
  const deletedBudget = await budgetsRepo.deleteBudgetById(budgetId, user_id, client);
  
  return { isBudgetDeleted: deletedBudget }
}