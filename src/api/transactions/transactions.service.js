import { v7 as uuidv7 } from "uuid";
import * as transactionsRepo from "./transactions.repo.js";
import * as userRepo from "../user/user.repo.js";
import * as accountsRepo from "../accounts/accounts.repo.js";
import * as budgetsRepo from "../budgets/budgets.repo.js";
import * as transactionBudgetsRepo from "../transactions/transaction.budgets.repo.js";
import { authorizeUserAction } from "../../utils/authentication.utils.js";
import { decodeCursor, encodeCursor } from "../../utils/cursor.utils.js";
import { areAmountsEqual, getBalanceDelta, getDiffAmount, hasEnoughTotalUnallocatedForFill, isBalanceValidForExpense } from "../../utils/balance.utils.js";
import { withTransaction } from "../../utils/db-transaction.utils.js";
import { throwErrorWithMessage } from "../../utils/error.utils.js";
import { getTotalBudgetNewAllocatedAmount } from "../../utils/budget.utils.js";
import { getBudgetById } from "../budgets/budgets.service.js";

export const getAllTransactions = async (loggedInUser, limit, cursor) =>
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

  const allTransactions = await transactionsRepo.findAllTransactionsByUserId(existingUser.id, limit, decodedCursor);

  if (!allTransactions) {
    throwErrorWithMessage("Error fetching transactions");
  }

  const hasMoreTransactions = allTransactions?.length > limit;

  if (hasMoreTransactions) {
    allTransactions.pop();
  }

  const lastTransaction = allTransactions[allTransactions?.length - 1];

  const nextCursor = hasMoreTransactions ? encodeCursor(lastTransaction) : null;

  return {
    data: allTransactions.map(({ ...transaction }) => transaction),
    pagination: {
      nextCursor,
      hasMore: hasMoreTransactions,
    },
  };
};

export const getAllTransactionsByBudgetId = async (budgetId, loggedInUser) =>
{
  const existingBudget = await getBudgetById(budgetId, loggedInUser);

  if (!existingBudget) {
    throwErrorWithMessage("Budget does not exist.");
  }

  const allTransactions = await transactionsRepo.findAllTransactionsByBudgetId(existingBudget?.id, existingBudget?.user_id);

  if (!allTransactions) {
    throwErrorWithMessage("Error fetching transactions");
  }

  return {
    data: allTransactions.map(({ ...transaction }) => transaction),
  };
};

export const getAllFillTransactionBudgets = async (loggedInUser) =>
{
  // Check if user loggedIn is a valid user
  const existingUser = await userRepo.findUserByEmail(loggedInUser.email);

  if (!existingUser) {
    throwErrorWithMessage("User does not exist.");
  }

  const allFillTransactionBudgets = await transactionBudgetsRepo.findAllTransactionBudgets(existingUser?.id);

  if (!allFillTransactionBudgets) {
    throwErrorWithMessage("Error getting transaction budgets. Please try again.");
  }

  return {
    data: allFillTransactionBudgets.map(({ ...transaction }) => transaction),
  };
};

export const getAllFillTransactionBudgetsByTransactionId = async (transactionId, loggedInUser) =>
{
  // Check if user loggedIn is a valid user
  const existingUser = await userRepo.findUserByEmail(loggedInUser.email);

  if (!existingUser) {
    throwErrorWithMessage("User does not exist.");
  }

  const allFillTransactionBudgets = await transactionBudgetsRepo.findTransactionBudgetsByTransactionId(transactionId, existingUser?.id);

  if (!allFillTransactionBudgets) {
    throwErrorWithMessage("Fill transaction budgets does not exist.");
  }

  return {
    data: allFillTransactionBudgets.map(({ ...transaction }) => transaction),
  };
};

export const getAllTransactionsByAccountId = async (accountId, loggedInUser) =>
{
  // Check if user loggedIn is a valid user
  const existingUser = await userRepo.findUserByEmail(loggedInUser.email);

  if (!existingUser) {
    throwErrorWithMessage("User does not exist.");
  }

  const existingAccount = await accountsRepo.findAccountById(accountId, existingUser?.id);

  if (!existingAccount) {
    throwErrorWithMessage("Account does not exist.");
  }

  const allTransactions = await transactionsRepo.findAllTransactionsByAccountId(existingAccount?.id, existingUser.id);

  if (!allTransactions) {
    throwErrorWithMessage("Error fetching transactions");
  }

  return {
    data: allTransactions.map(({ ...transaction }) => transaction),
  };
};

export const getTransactionById = async (transactionId, loggedInUser) =>
{
  // Check if user loggedIn is a valid user
  const existingUser = await userRepo.findUserByEmail(loggedInUser.email);

  if (!existingUser) {
    throwErrorWithMessage("User does not exist.");
  }

  const existingTransaction = await transactionsRepo.findTransactionById(transactionId, existingUser?.id);

  if (!existingTransaction) {
    throwErrorWithMessage("Transaction not found");
  }

  authorizeUserAction(existingTransaction.user_id, existingUser.id);

  return existingTransaction;
};

export const getTransactionBudgetById = async (transactionBudgetId, loggedInUser) =>
{
  // Check if user loggedIn is a valid user
  const existingUser = await userRepo.findUserByEmail(loggedInUser.email);

  if (!existingUser) {
    throwErrorWithMessage("User does not exist.");
  }

  const existingTransactionBudget = await transactionBudgetsRepo.findTransactionBudgetById(transactionBudgetId, existingUser.id);

  if (!existingTransactionBudget) {
    throwErrorWithMessage("Transaction not found");
  }

  authorizeUserAction(existingTransactionBudget.user_id, existingUser.id);

  return existingTransactionBudget;
};

export const createTransaction = async (payload, loggedInUser) =>
{
  const existingUser = await userRepo.findUserByEmail(loggedInUser.email);

  if (!existingUser) {
    throwErrorWithMessage("User does not exist.");
  }

  const { inserted, ...result } = await withTransaction((client) =>
    createTransactionOnClient(payload, existingUser.id, client)
  );

  return result;
};

export const createTransactionOnClient = async (payload, userId, client) =>
{
  const { account_id, budget_id, budgets, type, amount, title, transaction_date, client_id } = payload;

  if (!type || !title) {
    throwErrorWithMessage("Please fill all required fields");
  }

  if (client_id) {
    const existingByClientId = await transactionsRepo.findTransactionByClientId(client_id, userId, client);
    if (existingByClientId) {
      return { transaction: existingByClientId, inserted: false };
    }
  }

  let existingAccount;
  let existingBudget;

  if (['expense', 'income'].includes(type)) {
    if (account_id) {
      existingAccount = await accountsRepo.findAccountById(account_id, userId, client);

      if (!existingAccount) {
        throwErrorWithMessage("Account not found");
      }
    }

    if (budget_id) {
      existingBudget = await budgetsRepo.findBudgetById(budget_id, userId, client);

      if (!existingBudget) {
        throwErrorWithMessage("Budget not found");
      }
    }
  }

  if (type === "expense") {
    if (!isBalanceValidForExpense(existingAccount?.balance, amount, type)) {
      throwErrorWithMessage("Insufficient account balance");
    }

    if (!isBalanceValidForExpense(existingBudget?.allocated_amount, amount, type)) {
      throwErrorWithMessage("Insufficient budget allocated amount");
    }
  }

  const transactionHelpers = {
    balanceDelta: getBalanceDelta(type, amount),
    budgets,
  }

  const transactionPayload = {
    id: uuidv7(),
    user_id: userId,
    account_id: type === 'fill' ? null : existingAccount?.id,
    budget_id: type === 'income' ? null : existingBudget?.id,
    type,
    amount: type === 'fill' ? null : amount,
    title,
    transaction_date: transaction_date ? transaction_date : new Date().toISOString(),
    client_id: client_id || null,
  };

  const result = await handleCreateTransactionWithAccount(transactionPayload, transactionHelpers, client);
  return { ...result, inserted: true };
};

export const updateTransactionById = async (transactionId, payload, loggedInUser) =>
{
  if (!transactionId) {
    throwErrorWithMessage("Something went wrong. No id found.");
  }

  const existingTransaction = await getTransactionById(transactionId, loggedInUser);

  // 6. Gather payload
  const {
    account_id,
    budget_id,
    amount,
    budgets,
    title,
    transaction_date,
  } = payload;

  let oldAccount;
  let newAccount;
  let isSameAccount;

  if (existingTransaction?.account_id) {
    oldAccount = await accountsRepo.findAccountById(existingTransaction?.account_id, existingTransaction.user_id);

    if (!oldAccount) {
      throwErrorWithMessage("Account not found.");
    }

    isSameAccount = existingTransaction?.account_id === account_id;

    if (!isSameAccount) {
      newAccount = await accountsRepo.findAccountById(account_id, existingTransaction.user_id);

      if (!newAccount) {
        throwErrorWithMessage("Account not found.");
      }
    }
  }

  let oldBudget;
  let newBudget;
  let isSameBudget;

  if (existingTransaction?.budget_id) {
    oldBudget = await budgetsRepo.findBudgetById(existingTransaction?.budget_id, existingTransaction.user_id);

    if (!oldBudget) {
      throwErrorWithMessage("Budget not found.");
    }

    isSameBudget = existingTransaction?.budget_id === budget_id;

    // If not same account_id verify the new account_id if account exist in db
    if (!isSameBudget) {
      newBudget = await budgetsRepo.findBudgetById(budget_id, existingTransaction.user_id);

      if (!newBudget) {
        throwErrorWithMessage("Budget not found.");
      }
    }
  }

  const isSameTransactionAmount = areAmountsEqual(existingTransaction?.amount, amount);

  const transactionHelpers = {
    is_same_account: isSameAccount,
    is_same_budget: isSameBudget,
    is_same_transaction_amount: isSameTransactionAmount,
    existing_transaction: existingTransaction,
    old_account: oldAccount,
    new_account: newAccount,
    old_budget: oldBudget,
    new_budget: newBudget,
    diff_amount: getDiffAmount(amount, existingTransaction?.amount),
    diff_transaction_amount: isSameTransactionAmount ? existingTransaction?.amount : amount,
    budgetsPayload: budgets,
  }

  const transactionPayload = {
    id: existingTransaction.id,
    user_id: existingTransaction.user_id,
    type: existingTransaction.type,

    // Fields that can be updated to new value
    account_id: existingTransaction.type === 'fill' ? null : (account_id || existingTransaction?.account_id),
    budget_id: existingTransaction.type === 'fill' ? null : (budget_id || existingTransaction?.budget_id),
    amount: existingTransaction.type === 'fill' ? null : amount ?? existingTransaction.amount,
    title: title || existingTransaction.title,
    transaction_date: transaction_date || existingTransaction.transaction_date,
  };

  if (existingTransaction?.type === 'expense') {
    await handleExpenseValidationOnUpdate(transactionPayload, transactionHelpers);
  }

  return await withTransaction((client) => handleUpdateTransactionWithAccount(transactionPayload, transactionHelpers, client));
};

export const deleteTransactionById = async (transactionId, loggedInUser) =>
{
  const existingTransaction = await getTransactionById(transactionId, loggedInUser);

  return await withTransaction((client) => handleDeleteTransactionWithAccount(existingTransaction, client));
};

export const deleteTransactionBudgetById = async (transactionBudgetId, loggedInUser) =>
{
  const existingTransactionBudget = await getTransactionBudgetById(transactionBudgetId, loggedInUser);

  return await withTransaction((client) => handleDeleteTransactionBudget(existingTransactionBudget, client));
};



//--- Helpers

// Create transaction and update account balance based on transaction type
const handleCreateTransactionWithAccount = async (transactionPayload, transactionHelpers, client) =>
{
  // 3. Deconstruct transactionPayload and transactionHelpers
  const { balanceDelta, budgets: budgetsPayload } = transactionHelpers;
  const { account_id, budget_id, user_id, type, amount } = transactionPayload;

  let account;
  let budget;

  if (type === 'fill') {
    const budgets = await getAllBudgetsWithNewAllocatedAmount(budgetsPayload, 'create', user_id, client);

    await handleFillValidationOnCreate(budgets, user_id, client);

    const totalBudgetNewAllocatedAmount = getTotalBudgetNewAllocatedAmount(budgets);

    const createdTransaction = await transactionsRepo.insertTransactionToDB(
      {
        ...transactionPayload,
        amount: totalBudgetNewAllocatedAmount,
        account_id: null,
        budget_id: null,
      }
      , client);

    if (!createdTransaction) {
      throwErrorWithMessage("Error creating transaction. Please try again.");
    }

    const newBudgets = await handleFillCreate(budgets, createdTransaction, user_id, client);

    return { transaction: createdTransaction, budgets: newBudgets };
  }

  // 1. Create transaction using transactionPayload
  const createdTransaction = await transactionsRepo.insertTransactionToDB(transactionPayload, client);

  // 2. Check if transaction is created successfully
  if (!createdTransaction) {
    throwErrorWithMessage("Error creating transaction. Please try again.");
  }

  // Handles account income and expense
  if (['income', 'expense'].includes(type)) {
    account = await accountsRepo.updateAccountBalance(account_id, user_id, balanceDelta, client);

    if (!account) {
      throwErrorWithMessage("Error updating account balance. Please try again.");
    }
  }

  // Handles budget fill and expense
  if (['expense'].includes(type)) {
    budget = await budgetsRepo.updateAllocatedAmount(budget_id, user_id, balanceDelta, client);

    if (!budget) {
      throwErrorWithMessage("Error updating budget allocated amount. Please try again.");
    }
  }

  // 7. Return transaction and account data
  return { transaction: createdTransaction, account, budget };
}

// Update transaction and handle updating existing and new account balance if is_same_account is false
const handleUpdateTransactionWithAccount = async (transactionPayload, transactionHelpers, client) =>
{
  let old_account;
  let new_account;
  let old_budget;
  let new_budget;
  let updated_accounts;
  let updated_budgets;

  const { existing_transaction, budgetsPayload } = transactionHelpers;

  if (transactionPayload?.type === 'fill') {
    const budgets = await getAllBudgetsWithNewAllocatedAmount(budgetsPayload, 'update', existing_transaction?.user_id, client);
    await handleFillValidationOnUpdate(existing_transaction, budgets, client);
    const { updatedTransaction, newBudgets } = await handleFillUpdate(transactionPayload, budgets, client);

    return { transaction: updatedTransaction, updated_budgets: newBudgets };
  }

  const updatedTransaction = await transactionsRepo.updateTransactionById(transactionPayload, client);

  if (!updatedTransaction) {
    throwErrorWithMessage("Error updating transaction. Please try again.");
  }

  const updateHandlers = {
    income: handleIncomeUpdate,
    expense: handleExpenseUpdate,
  };

  const handler = updateHandlers[transactionPayload?.type];
  if (!handler) {
    throwErrorWithMessage("Invalid transaction type provided for update.");
  }

  ({ old_account, new_account, old_budget, new_budget } = await handler(transactionPayload, transactionHelpers, client));

  if (old_account || new_account) {
    updated_accounts = { old_account, new_account }
  }

  if (old_budget || new_budget) {
    updated_budgets = { old_budget, new_budget }
  }

  return { transaction: updatedTransaction, updated_accounts, updated_budgets };
}

// Delete transaction and update account balance based on transaction_type
export const handleDeleteTransactionWithAccount = async (existingTransaction, client) =>
{

  const { id, user_id, budget_id, amount, type, account_id } = existingTransaction;

  let account;
  let budget;

  if (['fill'].includes(type)) {
    const { deletedTransaction } = await handleFillDelete(id, user_id, client);
    return deletedTransaction;
  }

  const deletedTransaction = await transactionsRepo.deleteTransactionById(id, user_id, client);

  if (!deletedTransaction) {
    throwErrorWithMessage("Error deleting transaction. Please try again.");
  }

  // 4. Get balance delta (-balanceDelta for income, +balanceDelta for expense)
  const balanceDelta = -(getBalanceDelta(type, amount));

  if (['expense', 'income'].includes(type)) {
    // 5. Update account balance based on transaction_amount and transaction_type
    account = await accountsRepo.updateAccountBalance(account_id, user_id, balanceDelta, client);

    // 6. Check if account succeeded
    if (!account) {
      throwErrorWithMessage("Error updating account balance. Please try again.");
    }
  }

  if (['expense'].includes(type)) {
    // 7. Update budget allocated amount based on transaction_amount and transaction_type
    budget = await budgetsRepo.updateAllocatedAmount(budget_id, user_id, balanceDelta, client);

    // 8. Check if budget succeeded
    if (!budget) {
      throwErrorWithMessage("Error updating budget allocated amount. Please try again.");
    }
  }

  return deletedTransaction;
}

export const handleDeleteTransactionBudget = async (existingTransactionBudget, client) =>
{
  const { id: transactionBudgetId, transaction_id, user_id, allocated_amount, budget_id } = existingTransactionBudget;
  
  const updatedTransaction = await transactionsRepo.updateTransactionAmount(transaction_id, user_id, -allocated_amount, client);
  
  if (!updatedTransaction) {
    throwErrorWithMessage("Failed to update transaction amount on budget deletion. Please try again.")
  }
  
  const budget = await budgetsRepo.updateAllocatedAmount(
    budget_id,
    user_id,
    -allocated_amount,
    client,
  );
  
  if (!budget) {
    throwErrorWithMessage("Failed to delete budget. Please try again.")
  }

  const deletedTransactionBudget = await transactionBudgetsRepo.deleteTransactionBudgetByTransactionBudgetId(transactionBudgetId, user_id, client);

  if (!deletedTransactionBudget) {
    throwErrorWithMessage("Failed to delete transaction budget. Please try again.")
  }

  return deletedTransactionBudget;
}

// Update old and new account balance based on transaction helpers
const handleIncomeUpdate = async (transactionPayload, transactionHelpers, client) =>
{
  const { account_id, type, amount, user_id } = transactionPayload;
  const { is_same_account, is_same_transaction_amount, existing_transaction, diff_amount, diff_transaction_amount } = transactionHelpers;
  const { amount: existingTransactionAmount, account_id: existingAccountId } = existing_transaction;

  let old_account;
  let new_account;

  if (type === 'income') {
    // Only update old account balance if !is_same_transaction_amount
    if (is_same_account && !is_same_transaction_amount) {
      old_account = await accountsRepo.updateAccountBalance(account_id, user_id, diff_amount, client);

      if (!old_account) {
        throwErrorWithMessage("Error updating account balance. Please try again.");
      }
    }

    // Handles both !is_same_transaction_amount and is_same_transaction_amount
    if (!is_same_account) {
      old_account = await accountsRepo.updateAccountBalance(existingAccountId, user_id, -existingTransactionAmount, client);

      if (!old_account) {
        throwErrorWithMessage("Error updating account balance. Please try again.");
      }

      new_account = await accountsRepo.updateAccountBalance(account_id, user_id, diff_transaction_amount, client);

      if (!new_account) {
        throwErrorWithMessage("Error updating account balance. Please try again.");
      }
    }
  }

  return { old_account, new_account }
}

// Update old and new account balance and allocated_amount & update old and new budget allocated_amount
const handleExpenseUpdate = async (transactionPayload, transactionHelpers, client) =>
{
  const { account_id, budget_id, user_id } = transactionPayload;
  const { is_same_account, is_same_budget, is_same_transaction_amount, existing_transaction, diff_amount, diff_transaction_amount } = transactionHelpers;
  const { amount: existingTransactionAmount, account_id: existingAccountId, budget_id: existingBudgetId } = existing_transaction;

  let old_account;
  let new_account;
  let old_budget;
  let new_budget;

  if (!is_same_transaction_amount) {
    if (is_same_account) {
      old_account = await accountsRepo.updateAccountBalance(existingAccountId, user_id, -diff_amount, client);

      if (!old_account) {
        throwErrorWithMessage("Error updating old account balance. Please try again.");
      }
    }

    if (is_same_budget) {
      old_budget = await budgetsRepo.updateAllocatedAmount(existingBudgetId, user_id, -diff_amount, client);

      if (!old_budget) {
        throwErrorWithMessage("Error updating old budget allocated amount. Please try again.");
      }
    }
  }

  // Handles both is_same_transaction_amount && !is_same_transaction_amount
  // Add existingTransactionAmount to old, subtract new account with the diff_transaction_amount
  if (!is_same_account) {
    old_account = await accountsRepo.updateAccountBalance(existingAccountId, user_id, existingTransactionAmount, client);

    if (!old_account) {
      throwErrorWithMessage("Error updating old account balance. Please try again.");

    }

    new_account = await accountsRepo.updateAccountBalance(account_id, user_id, -diff_transaction_amount, client);

    if (!new_account) {
      throwErrorWithMessage("Error updating new account balance. Please try again.");

    }
  }

  // Handles both is_same_transaction_amount && !is_same_transaction_amount
  // Add existingTransactionAmount to old, subtract new budget with the diff_transaction_amount
  if (!is_same_budget) {
    old_budget = await budgetsRepo.updateAllocatedAmount(existingBudgetId, user_id, existingTransactionAmount, client);

    if (!old_budget) {
      throwErrorWithMessage("Error updating old budget allocated amount. Please try again.");
    }

    new_budget = await budgetsRepo.updateAllocatedAmount(budget_id, user_id, -diff_transaction_amount, client);

    if (!new_budget) {
      throwErrorWithMessage("Error updating new budget allocated amount. Please try again.");
    }
  }

  return { old_account, new_account, old_budget, new_budget };
}

// Validates account unallocated_balance
const handleFillValidationOnUpdate = async (existingTransaction, budgets, client) =>
{
  if (budgets?.length <= 0) throwErrorWithMessage("Missing budgets. Please try again.")
  const { user_id, amount, } = existingTransaction;

  const newTotalAllocatedAmount = getTotalBudgetNewAllocatedAmount(budgets);
  const isSameTotalAllocatedAmount = areAmountsEqual(newTotalAllocatedAmount, amount);

  if (!isSameTotalAllocatedAmount) {
    const diffTotalAllocatedAmount = getDiffAmount(newTotalAllocatedAmount, amount);

    if (diffTotalAllocatedAmount > 0) {
      const hasEnoughUnallocated = await hasEnoughTotalUnallocatedForFill(user_id, diffTotalAllocatedAmount, client);

      if (!hasEnoughUnallocated) {
        throwErrorWithMessage("Not enough total_unallocated for fill transaction. Please try again.");
      }
    }
  }
}

// Validate budget allocated_amount and account balance
const handleExpenseValidationOnUpdate = async (transactionPayload, transactionHelpers) =>
{
  const { type } = transactionPayload;
  const { is_same_account, is_same_budget, is_same_transaction_amount, old_account, new_account, old_budget, new_budget, diff_amount, diff_transaction_amount } = transactionHelpers;

  if (type === 'expense') {
    // Handles both is_same_transaction_amount && !is_same_transaction_amount
    // Check new account balance if valid for expense transaction
    if (!is_same_account) {
      if (!isBalanceValidForExpense(new_account?.balance, diff_transaction_amount, type)) {
        throwErrorWithMessage("Insufficient new account balance");

      }
    }

    if (!is_same_budget) {
      if (!isBalanceValidForExpense(new_budget?.allocated_amount, diff_transaction_amount, type)) {
        throwErrorWithMessage("Insufficient new budget allocation amount");

      }
    }

    if (!is_same_transaction_amount && diff_amount > 0) {
      if (is_same_account) {
        if (!isBalanceValidForExpense(old_account?.balance, diff_amount, type)) {
          throwErrorWithMessage("Insufficient account balance");

        }
      }

      if (is_same_budget) {
        if (!isBalanceValidForExpense(old_budget?.allocated_amount, diff_amount, type)) {
          throwErrorWithMessage("Insufficient budget allocation amount");

        }
      }
    }
  }
}

// Fill Transaction Helpers
const handleFillValidationOnCreate = async (budgets, existingUserId, client) =>
{
  if (budgets?.length <= 0) throwErrorWithMessage("Missing budgets for fill transaction");

  const totalBudgetNewAllocatedAmount = getTotalBudgetNewAllocatedAmount(budgets);

  const hasEnoughUnallocated = await hasEnoughTotalUnallocatedForFill(existingUserId, totalBudgetNewAllocatedAmount, client);

  if (!hasEnoughUnallocated) {
    throwErrorWithMessage("Not enough total_unallocated for fill transaction. Please try again.");
  }
}

const handleFillCreate = async (budgets, createdTransaction, user_id, client) =>
{
  let newBudgets = [];

  for (let i = 0, length = budgets.length; i < length; i++) {
    let budget = budgets[i];

    const transactionBudget = await transactionBudgetsRepo.insertTransactionBudgetToDB(
      {
        id: uuidv7(),
        user_id: user_id,
        transaction_id: createdTransaction.id,
        budget_id: budget?.budget_data?.id,
        allocated_amount: budget?.new_allocated_amount,
      }, client
    );

    if (!transactionBudget) {
      throwErrorWithMessage("Error linking budget to fill transaction.");
    }

    budget = await budgetsRepo.updateAllocatedAmount(
      budget?.budget_data?.id,
      user_id,
      budget?.new_allocated_amount,
      client,
    );

    if (!budget) {
      throwErrorWithMessage("Error filling budget!");
    }

    newBudgets.push(budget);
  }

  return newBudgets;
}

const handleFillDelete = async (transactionId, userId, client) =>
{
  const fillTransactionBudgets = await transactionBudgetsRepo.findTransactionBudgetsByTransactionId(transactionId, userId, client);

  if (fillTransactionBudgets?.length > 0) {
    for (let i = 0, length = fillTransactionBudgets?.length; i < length; i++) {
      let fillBudget = fillTransactionBudgets[i];
  
      const existingBudget = await budgetsRepo.findBudgetById(fillBudget?.budget_id, userId, client);
  
      if (!existingBudget) throwErrorWithMessage("Budget not found. Please try again.");
  
      const revertedAllocatedAmount = existingBudget?.allocated_amount - fillBudget?.allocated_amount;
  
      if (revertedAllocatedAmount < 0) {
        throwErrorWithMessage(`Error reverting budget fill. ${existingBudget?.name} has spent ${-(revertedAllocatedAmount)} allocated amount. Please fill budget with amount and try again.`);
      }
  
      const budget = await budgetsRepo.updateAllocatedAmount(
        fillBudget?.budget_id,
        userId,
        -fillBudget?.allocated_amount,
        client,
      );
  
      if (!budget) throwErrorWithMessage("Error reverting budget fill!");
    }
  
    const deletedFillTransactionBudget = await transactionBudgetsRepo.deleteTransactionBudgetsByTransactionId(transactionId, userId, client);
  
    if (!deletedFillTransactionBudget) {
      throwErrorWithMessage("Error deleting fill transaction budget. Please try again.");
    }
  }

  const deletedTransaction = await transactionsRepo.deleteTransactionById(transactionId, userId, client);

  if (!deletedTransaction) {
    throwErrorWithMessage("Error deleting transaction. Please try again.");
  }

  return { deletedTransaction };
}

const handleFillUpdate = async (transactionPayload, budgets, client) =>
{
  let newBudgets = [];

  const { user_id, id } = transactionPayload;

  const transactionBudgets = await transactionBudgetsRepo.findTransactionBudgetsByTransactionId(id, user_id, client);

  if (!transactionBudgets) throwErrorWithMessage("Error getting transaction budgets for transaction. Please try again.");

  for (let i = 0, length = budgets.length; i < length; i++) {
    let budgetWithNewAllocatedAmount = budgets[i];

    const transactionBudget = transactionBudgets.find((t) => t.budget_id === budgetWithNewAllocatedAmount?.budget_data?.id);

    if (!transactionBudget && budgetWithNewAllocatedAmount?.new_allocated_amount > 0) {
      const transactionBudget = await transactionBudgetsRepo.insertTransactionBudgetToDB(
        {
          id: uuidv7(),
          user_id: user_id,
          transaction_id: id,
          budget_id: budgetWithNewAllocatedAmount?.budget_data?.id,
          allocated_amount: 0,
        }, client);

      if (!transactionBudget) throwErrorWithMessage("Error creating transaction budget. Please try again.");
    }

    const previousFillContribution = Number(transactionBudget?.allocated_amount ?? 0);

    const isSameAllocatedAmount = areAmountsEqual(
      budgetWithNewAllocatedAmount?.new_allocated_amount,
      previousFillContribution
    );

    if (!isSameAllocatedAmount) {
      const amountDiffAmount = getDiffAmount(budgetWithNewAllocatedAmount?.new_allocated_amount, previousFillContribution);

      if (amountDiffAmount < 0) {
        const resultingAllocatedAmount = Number(budgetWithNewAllocatedAmount?.budget_data?.allocated_amount) + amountDiffAmount;

        if (resultingAllocatedAmount < 0) {
          throwErrorWithMessage(
            `Error updating budget fill. ${budgetWithNewAllocatedAmount.budget_data.name} has spent ${-(resultingAllocatedAmount)} allocated amount. Please fill budget with amount and try again.`
          );
        }
      }

      // Update transaction budget
      const updatedTransactionBudget = await transactionBudgetsRepo.updateTransactionBudgetAllocatedAmount(
        id,
        budgetWithNewAllocatedAmount?.budget_data?.id,
        user_id,
        amountDiffAmount,
        client
      );

      if (!updatedTransactionBudget) throwErrorWithMessage("Error updating transaction budget allocated amount. Please try again.");

      // Update budget allocated amount
      const budget = await budgetsRepo.updateAllocatedAmount(budgetWithNewAllocatedAmount?.budget_data?.id, user_id, amountDiffAmount, client);

      if (!budget) throwErrorWithMessage("Error updating budget allocated amount. Please try again.");

      // Push budget to array
      newBudgets.push(budget);
    }
  }


  // Sum all new_allocated_amount and update transaction amount
  const updatedTransaction = await transactionsRepo.updateTransactionById(
    {
      ...transactionPayload,
      amount: getTotalBudgetNewAllocatedAmount(budgets),
      account_id: null,
      budget_id: null,
    }
    , client)

  if (!updatedTransaction) throwErrorWithMessage("Error updating transaction amount. Please try again.")

  return { updatedTransaction, newBudgets }
}

const getAllBudgetsWithNewAllocatedAmount = async (budgetsPayload, actionType, userId, client) =>
{
  const budgetsIdsFromPayload = budgetsPayload?.length > 0 ? budgetsPayload?.map((budget) => budget?.budget_id) : [];

  const budgets = await budgetsRepo.findBudgetsByIdsForUpdate(budgetsIdsFromPayload, userId, client);

  if (budgets?.length !== budgetsPayload?.length) throwErrorWithMessage(`One or more budgets in the payload could not be found.`);

  const mappedBudgets = budgets.map((budget) =>
  {
    return {
      budget_data: budget,
      new_allocated_amount: budgetsPayload?.find((budgetPayload) => budgetPayload?.budget_id === budget?.id)?.new_allocated_amount,
    }
  }
  );

  return actionType === 'update' ? mappedBudgets : mappedBudgets?.filter((b) => b?.new_allocated_amount > 0);
}