import { v7 as uuidv7 } from "uuid";
import * as accountsRepo from "./accounts.repo.js";
import * as userRepo from "../user/user.repo.js";
import * as budgetsRepo from "../budgets/budgets.repo.js";
import * as transactionsRepo from "../transactions/transactions.repo.js";
import { authorizeUserAction } from "../../utils/authentication.utils.js";
import { decodeCursor, encodeCursor } from "../../utils/cursor.utils.js";
import { withTransaction } from "../../utils/db-transaction.utils.js"
import { handleDeleteTransactionWithAccount } from "../transactions/transactions.service.js";
import { throwErrorWithMessage } from "../../utils/error.utils.js";

export const getAllAccounts = async (loggedInUser, limit, cursor) =>
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

  const allAccounts = await accountsRepo.findAllAccountsByUserId(existingUser.id, limit, decodedCursor);

  if (!allAccounts) {
    throwErrorWithMessage("Error fetching accounts");
  }

  const hasMoreAccounts = allAccounts?.length > limit;

  if (hasMoreAccounts) {
    allAccounts.pop();
  }

  const lastAccount = allAccounts[allAccounts?.length - 1];

  const nextCursor = hasMoreAccounts ? encodeCursor(lastAccount) : null;

  return {
    data: allAccounts.map(({ ...account }) => account),
    pagination: {
      nextCursor,
      hasMore: hasMoreAccounts,
    },
  };
};

export const getAccountById = async (accountId, loggedInUser) =>
{
  // Check if user loggedIn is a valid user
  const existingUser = await userRepo.findUserByEmail(loggedInUser.email);

  if (!existingUser) {
    throwErrorWithMessage("User does not exist.");
  }

  const existingAccount = await accountsRepo.findAccountById(accountId, existingUser.id);

  if (!existingAccount) {
    throwErrorWithMessage("Account not found");
  }

  authorizeUserAction(existingAccount.user_id, existingUser.id);

  return existingAccount;
};

export const createAccount = async (body, loggedInUser) =>
{
  // Check if there is a user loggedIn to create account
  const existingUser = await userRepo.findUserByEmail(loggedInUser.email);

  if (!existingUser) {
    throwErrorWithMessage("User does not exist.");
  }

  const { name, balance } = body;

  if (!name || balance < 0) {
    throwErrorWithMessage("Please fill all required fields");
  }

  const accountData = {
    id: uuidv7(),
    user_id: existingUser.id,
    name,
    balance,
  };

  const createdAccountData =
    await accountsRepo.insertAccountToDB(accountData);

  if (!createdAccountData) {
    throwErrorWithMessage("Error creating account. Please try again.");
  }

  return createdAccountData;
};

export const updateAccountById = async (accountId, body, loggedInUser) =>
{
  if (!accountId) {
    throwErrorWithMessage("Something went wrong. No id found.");
  }

  // Check if there is a user loggedIn to create account
  const existingUser = await userRepo.findUserByEmail(loggedInUser.email);

  if (!existingUser) {
    throwErrorWithMessage("User does not exist.");
  }

  // Check if account exists
  const existingAccount =
    await accountsRepo.findAccountById(accountId, existingUser.id);

  if (!existingAccount) {
    throwErrorWithMessage("Account not found");
  }

  // Check if user is authorized.
  authorizeUserAction(existingAccount.user_id, existingUser.id);

  const { name, balance } = body;

  // Create account object to update in db
  const updateAccountPayload = {
    id: existingAccount.id,
    user_id: loggedInUser.id,
    name: name || existingAccount.name,
    balance: balance || existingAccount.balance,
  };

  const updatedAccountData = await accountsRepo.updateAccountById(
    updateAccountPayload,
  );

  if (!updatedAccountData) {
    throwErrorWithMessage("Error updating account. Please try again.");
  }

  return updatedAccountData;
};

export const deleteAccountById = async (accountId, loggedInUser) =>
{
  // Check if there is a user loggedIn to create account
  const existingUser = await userRepo.findUserByEmail(loggedInUser.email);

  if (!existingUser) {
    throwErrorWithMessage("User does not exist.");
  }

  const existingAccount = await accountsRepo.findAccountById(accountId, existingUser.id);

  if (!existingAccount) {
    throwErrorWithMessage("Account does not exist!");
  }

  // Check if user is authorized.
  authorizeUserAction(existingAccount?.user_id, existingUser?.id);

  const budgetsSummary = await budgetsRepo.getUserBudgetSummary(existingUser?.id);

  if (!budgetsSummary) {
    throwErrorWithMessage("Error getting budgets summary, please try again.");
  }

  const isValidToDeleteAccount = budgetsSummary?.total_unallocated - existingAccount?.balance >= 0;

  if (!isValidToDeleteAccount) {
    throwErrorWithMessage("Cannot perform action, account balance is being used by a budget");
  }

  const accountTransaction = await transactionsRepo.findAllTransactionsByAccountId(existingAccount?.id, existingUser?.id);

  if (!accountTransaction) {
    throwErrorWithMessage("Error getting accounts transactions, please try again.");
  }

  const deleteAccountPayload = {
    account: existingAccount,
    account_transactions: accountTransaction,
    user_id: existingUser?.id,
    budget_summary: budgetsSummary
  }

  return await withTransaction((client) => handleAccountDeletionWithTransaction(deleteAccountPayload, client));
};


const handleAccountDeletionWithTransaction = async (deleteAccountPayload, client) =>
{
  const { account, account_transactions, user_id, budget_summary } = deleteAccountPayload;

  const { total_balance, total_allocated, total_income_amount, total_expense_amount, total_fill_amount, total_unallocated } = budget_summary;

  if (account_transactions?.length > 0) {
    for (let i = 0, length = account_transactions?.length; i < length; i++) {
      await handleDeleteTransactionWithAccount(account_transactions[i], client);
    }
  }

  const summary = await budgetsRepo.getUserBudgetSummary(user_id, client);
  const currentAccount = await accountsRepo.findAccountById(account.id, user_id, client);


  const remainingBalance = summary?.total_balance - currentAccount?.balance;

  if (remainingBalance - summary.total_allocated < 0) {
    throwErrorWithMessage("Cannot delete account: removing this account would result in allocated budgets exceeding your remaining balance.");
  }

  const result = await accountsRepo.deleteAccountById(account?.id, user_id, client);

  if (!result) {
    throwErrorWithMessage("Error deleting account. Please try again.");
  }

  return { message: "Account deleted successfully" };
}