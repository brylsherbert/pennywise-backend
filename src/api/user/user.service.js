import { generateToken } from "../../utils/generate-token.utils.js";
import * as userRepo from "./user.repo.js";
import * as budgetsRepo from "../budgets/budgets.repo.js";
import * as transactionsRepo from "../transactions/transactions.repo.js";
import * as transactionBudgetsRepo from "../transactions/transaction.budgets.repo.js";
import * as accountsRepo from "../accounts/accounts.repo.js";
import * as categoriesRepo from "../categories/categories.repo.js";
import { createTransactionOnClient } from "../transactions/transactions.service.js";
import { hash, genSalt, compare } from "bcrypt";
import { v7 as uuidv7 } from "uuid";
import { toLowerCaseAndRemoveSpaces } from "../../utils/handle-text-transformation.utils.js";
import { throwErrorWithMessage } from "../../utils/error.utils.js";
import { withTransaction } from "../../utils/db-transaction.utils.js";
import { roundNumber } from "../../utils/math.utils.js";

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

  const user = {
    id: existingUser.id,
    username: toLowerCaseAndRemoveSpaces(newUsername),
    password: isPasswordSame ? existingUser.password : newPassword,
  };

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

export const importGuestData = async (payload, loggedInUser) =>
{
  const userId = loggedInUser?.id;

  if (!userId) {
    throwErrorWithMessage("User does not exist!");
  }

  return withTransaction((client) => handleImportGuestData(payload, userId, client));
};

const handleImportGuestData = async (payload, userId, client) =>
{
  const {
    categories = [],
    accounts = [],
    budgets = [],
    transactions = [],
  } = payload;

  const id_map = {
    categories: {},
    accounts: {},
    budgets: {},
    transactions: {},
  };

  const counts = {
    categories: 0,
    accounts: 0,
    budgets: 0,
    transactions: 0,
  };

  for (const category of categories) {
    const { row, inserted } = await categoriesRepo.insertCategoryByClientId(
      {
        id: uuidv7(),
        user_id: userId,
        name: category.name,
        color: category.color,
        client_id: category.client_id,
      },
      client,
    );

    if (!row) {
      throwErrorWithMessage("Error importing category. Please try again.");
    }

    id_map.categories[category.client_id] = row.id;
    if (inserted) {
      counts.categories += 1;
    }
  }

  const openingByAccountClientId = computeAccountOpeningBalances(accounts, transactions);
  const openingAllocatedByBudgetClientId = computeBudgetOpeningAllocated(budgets, transactions);

  for (const account of accounts) {
    const openingBalance = openingByAccountClientId.get(account.client_id);

    const { row, inserted } = await accountsRepo.insertAccountByClientId(
      {
        id: uuidv7(),
        user_id: userId,
        name: account.name,
        balance: openingBalance,
        client_id: account.client_id,
      },
      client,
    );

    if (!row) {
      throwErrorWithMessage("Error importing account. Please try again.");
    }

    id_map.accounts[account.client_id] = row.id;
    if (inserted) {
      counts.accounts += 1;
    }
  }

  for (const budget of budgets) {
    let categoryId = null;

    if (budget.category_client_id) {
      categoryId = await resolveClientIdToServerId(
        budget.category_client_id,
        id_map.categories,
        (clientId) => categoriesRepo.findCategoryByClientId(clientId, userId, client),
        "Category not found",
      );
    }

    const { row, inserted } = await budgetsRepo.insertBudgetByClientId(
      {
        id: uuidv7(),
        user_id: userId,
        category_id: categoryId,
        name: budget.name,
        target_amount: budget.target_amount,
        allocated_amount: openingAllocatedByBudgetClientId.get(budget.client_id) ?? 0,
        client_id: budget.client_id,
      },
      client,
    );

    if (!row) {
      throwErrorWithMessage("Error importing budget. Please try again.");
    }

    id_map.budgets[budget.client_id] = row.id;
    if (inserted) {
      counts.budgets += 1;
    }
  }

  for (const transaction of transactions) {
    let accountId = null;
    let budgetId = null;
    let fillBudgets;

    if (transaction.account_client_id) {
      accountId = await resolveClientIdToServerId(
        transaction.account_client_id,
        id_map.accounts,
        (clientId) => accountsRepo.findAccountByClientId(clientId, userId, client),
        "Account not found",
      );
    }

    if (transaction.budget_client_id) {
      budgetId = await resolveClientIdToServerId(
        transaction.budget_client_id,
        id_map.budgets,
        (clientId) => budgetsRepo.findBudgetByClientId(clientId, userId, client),
        "Budget not found",
      );
    }

    if (transaction.type === "fill") {
      fillBudgets = [];
      for (const fillBudget of transaction.budgets || []) {
        const resolvedBudgetId = await resolveClientIdToServerId(
          fillBudget.budget_client_id,
          id_map.budgets,
          (clientId) => budgetsRepo.findBudgetByClientId(clientId, userId, client),
          "Budget not found",
        );

        fillBudgets.push({
          budget_id: resolvedBudgetId,
          new_allocated_amount: fillBudget.new_allocated_amount,
        });
      }
    }

    const result = await createTransactionOnClient(
      {
        account_id: accountId,
        budget_id: budgetId,
        type: transaction.type,
        amount: transaction.amount,
        title: transaction.title,
        transaction_date: transaction.transaction_date,
        budgets: fillBudgets,
        client_id: transaction.client_id,
      },
      userId,
      client,
    );

    if (!result?.transaction) {
      throwErrorWithMessage("Error importing transaction. Please try again.");
    }

    id_map.transactions[transaction.client_id] = result.transaction.id;
    if (result.inserted) {
      counts.transactions += 1;
    }
  }

  return {
    categories: counts.categories,
    accounts: counts.accounts,
    budgets: counts.budgets,
    transactions: counts.transactions,
    id_map,
  };
};

const computeAccountOpeningBalances = (accounts, transactions) =>
{
  const openingByAccountClientId = new Map();

  for (const account of accounts) {
    let incomeSum = 0;
    let expenseSum = 0;
    let hasIncomeOrExpense = false;

    for (const transaction of transactions) {
      if (transaction.account_client_id !== account.client_id) {
        continue;
      }

      if (transaction.type === "income") {
        hasIncomeOrExpense = true;
        incomeSum += Number(transaction.amount) || 0;
      } else if (transaction.type === "expense") {
        hasIncomeOrExpense = true;
        expenseSum += Number(transaction.amount) || 0;
      }
    }

    const providedBalance = Number(account.balance) || 0;
    const opening = hasIncomeOrExpense
      ? roundNumber(providedBalance - incomeSum + expenseSum)
      : roundNumber(providedBalance);

    if (opening < 0) {
      throwErrorWithMessage(
        `Invalid opening balance for account "${account.name}". Provided balance is inconsistent with imported transactions.`,
      );
    }

    openingByAccountClientId.set(account.client_id, opening);
  }

  return openingByAccountClientId;
};

const computeBudgetOpeningAllocated = (budgets, transactions) =>
{
  const openingAllocatedByBudgetClientId = new Map();

  for (const budget of budgets) {
    let expenseSum = 0;
    let fillSum = 0;

    for (const transaction of transactions) {
      if (transaction.type === "expense" && transaction.budget_client_id === budget.client_id) {
        expenseSum += Number(transaction.amount) || 0;
        continue;
      }

      if (transaction.type !== "fill") {
        continue;
      }

      for (const fillBudget of transaction.budgets || []) {
        if (fillBudget.budget_client_id === budget.client_id) {
          fillSum += Number(fillBudget.new_allocated_amount) || 0;
        }
      }
    }

    const openingAllocated = roundNumber(Math.max(0, expenseSum - fillSum));
    openingAllocatedByBudgetClientId.set(budget.client_id, openingAllocated);
  }

  return openingAllocatedByBudgetClientId;
};

const resolveClientIdToServerId = async (clientId, idMap, findByClientId, notFoundMessage) =>
{
  if (idMap[clientId]) {
    return idMap[clientId];
  }

  const existing = await findByClientId(clientId);

  if (!existing) {
    throwErrorWithMessage(notFoundMessage);
  }

  idMap[clientId] = existing.id;
  return existing.id;
};

const handleResetDataWithTranscation = async (userId, client) =>
{
  try {
    await categoriesRepo.deleteAllCategories(userId, client);
    await transactionBudgetsRepo.deleteAllTransactionBudgets(userId, client);
    await transactionsRepo.deleteAllTransaction(userId, client);
    await budgetsRepo.deleteAllBudget(userId, client);
    await accountsRepo.deleteAllAccount(userId, client);

    return true;
  } catch (err) {
    throwErrorWithMessage(`Failed to reset user data: ${err.message}`)
  }
}
