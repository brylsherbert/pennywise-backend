import { generateToken } from "../../utils/generate-token.utils.js";
import * as userRepo from "./user.repo.js";
import * as budgetsRepo from "../budgets/budgets.repo.js";
import * as transactionsRepo from "../transactions/transactions.repo.js";
import * as transactionBudgetsRepo from "../transactions/transaction.budgets.repo.js";
import * as accountsRepo from "../accounts/accounts.repo.js";
import * as categoriesRepo from "../categories/categories.repo.js";
import { hash, genSalt, compare } from "bcrypt";
import { toLowerCaseAndRemoveSpaces } from "../../utils/handle-text-transformation.utils.js";
import { throwErrorWithMessage } from "../../utils/error.utils.js";
import { withTransaction } from "../../utils/db-transaction.utils.js";

export const getCurrentUser = async (userId) =>
{
  const existingUser = await userRepo.findUserById(userId);

  if (!existingUser) {
    throwErrorWithMessage("Error fetching current user. Please try again.");
  }

  const { password, ...user } = existingUser;

  return {
    data: user,
  };
};

export const updateCurrentUser = async (body, loggedInUser, res) =>
{
  const existingUser = await userRepo.findUserByEmail(loggedInUser?.email);

  if (!existingUser) {
    throwErrorWithMessage("User not found");
  }

  const { username, password, confirmPassword } = body;

  if (!username || !password || !confirmPassword) {
    throwErrorWithMessage("Please fill all fields");
  }

  if (password !== confirmPassword) {
    throwErrorWithMessage("Password don't match, please try again.");
  }

  const { username: existingUsername } = existingUser;

  const isSameUsername = username === existingUsername;

  const newUsername = isSameUsername ? existingUsername : username;

  let newPassword;

  const isPasswordSame = await compare(password, existingUser?.password);

  if (!isPasswordSame) {
    const salt = await genSalt(10);
    newPassword = await hash(password, salt);
  }

  // Create user object to update in db
  const user = {
    id: existingUser.id,
    username: toLowerCaseAndRemoveSpaces(newUsername),
    password: isPasswordSame ? existingUser.password : newPassword,
  };

  // Generate Token
  const token = generateToken(user.id, res);
  const { password: userPassword, ...userWithOutPassword } = await userRepo.updateUserById(user);

  return { user: userWithOutPassword, token };
};

export const deleteCurrentUser = async (loggedInUser) =>
{
  const existingUser = await userRepo.findUserByEmail(loggedInUser?.email);
  
  if (!existingUser) {
    throwErrorWithMessage("User does not exist!");
  }

  const result = await userRepo.deleteUserInDB(existingUser?.id);
  
  if (!result) {
    throwErrorWithMessage("Error deleting user. Please try again.");
  }

  return { message: "User deleted successfully" };
};

export const resetAllData = async (loggedInUser) =>
{
  const existingUser = await userRepo.findUserByEmail(loggedInUser?.email);
  
  if (!existingUser) {
    throwErrorWithMessage("User does not exist!");
  }

  return withTransaction((client) => handleResetDataWithTranscation(existingUser?.id, client))
};

const handleResetDataWithTranscation = async (userId, client) =>
{
  const deletedCategories = await categoriesRepo.deleteAllCategories(userId, client);
  
  if (!deletedCategories) {
    throwErrorWithMessage("Error deleting categories. Please try again.");
  }

  const deleteTransactionBudgets = await transactionBudgetsRepo.deleteAllTransactionBudgets(userId, client);
  
  if (!deleteTransactionBudgets) {
    throwErrorWithMessage("Error deleting transaction budgets. Please try again.");
  }

  const deletedTransactions = await transactionsRepo.deleteAllTransaction(userId, client);
  
  if (!deletedTransactions) {
    throwErrorWithMessage("Error deleting transactions. Please try again.");
  }

  const deletedBudgets = await budgetsRepo.deleteAllBudget(userId, client);
  
  if (!deletedBudgets) {
    throwErrorWithMessage("Error deleting budgets. Please try again.");
  }

  const deletedAccounts = await accountsRepo.deleteAllAccount(userId, client);
  
  if (!deletedAccounts) {
    throwErrorWithMessage("Error deleting accounts. Please try again.");
  }

  return true;
}