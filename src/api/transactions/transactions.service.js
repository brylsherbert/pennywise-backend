import { v7 as uuidv7 } from "uuid";
import * as transactionsRepo from "./transactions.repo.js";
import * as userRepo from "../user/user.repo.js";
import * as accountsRepo from "../accounts/accounts.repo.js";
import * as budgetsRepo from "../budgets/budgets.repo.js";
import { authorizeUserAction } from "../../utils/authentication.utils.js";
import { decodeCursor, encodeCursor } from "../../utils/cursor.utils.js";
import { getBalanceDelta, getDiffAmount, hasEnoughTotalUnallocatedForFill, isBalanceValidForExpense } from "../../utils/balance.utils.js";
import { withTransaction } from "../../utils/db-transaction.utils.js";
import { throwErrorWithMessage } from "../../utils/error.utils.js";

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
  // Check if user loggedIn is a valid user
  const existingUser = await userRepo.findUserByEmail(loggedInUser.email);

  if (!existingUser) {
    throwErrorWithMessage("User does not exist.");
  }

  const existingBudget = await budgetsRepo.findBudgetById(budgetId, existingUser?.id);

  if (!existingBudget) {
    throwErrorWithMessage("Budget does not exist.");
  }

  const allTransactions = await transactionsRepo.findAllTransactionsByBudgetId(existingBudget?.id, existingUser.id);

  if (!allTransactions) {
    throwErrorWithMessage("Error fetching transactions");
  }

  return {
    data: allTransactions.map(({ ...transaction }) => transaction),
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

  const existingTransaction = await transactionsRepo.findTransactionById(transactionId);

  if (!existingTransaction) {
    throwErrorWithMessage("Transaction not found");
  }

  authorizeUserAction(existingTransaction.user_id, existingUser.id);

  return existingTransaction;
};

export const createTransaction = async (payload, loggedInUser) =>
{
  // Check if there is a user loggedIn to create transaction
  const existingUser = await userRepo.findUserByEmail(loggedInUser.email);

  if (!existingUser) {
    throwErrorWithMessage("User does not exist.");
  }

  const { account_id, budget_id, type, amount, title, transaction_date } = payload;

  // Validate payload
  if (!type || !amount || !title) {
    throwErrorWithMessage("Please fill all required fields");
  }

  let existingAccount;
  let existingBudget;

  // Check if account exists
  if (account_id) {
    existingAccount = await accountsRepo.findAccountById(account_id, existingUser?.id);

    if (!existingAccount) {
      throwErrorWithMessage("Account not found");
    }
  }

  // Check if budget exist
  if (budget_id) {
    // Check if category exists
    existingBudget = await budgetsRepo.findBudgetById(budget_id, existingUser?.id);

    if (!existingBudget) {
      throwErrorWithMessage("Budget not found");
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

  // Validate if total_unallocated is enough for fill
  if (type === "fill") {
    const hasEnoughUnallocated = await hasEnoughTotalUnallocatedForFill(existingUser?.id, amount);

    if (!hasEnoughUnallocated) {
      throwErrorWithMessage("Not enough total_unallocated for fill transaction. Please try again.");
    }
  }

  const transcationHelpers = {
    balanceDelta: getBalanceDelta(type, amount)
  }

  // Gather transaction data and insert to database using transaction helper
  const transactionPayload = {
    id: uuidv7(),
    user_id: existingUser?.id,
    account_id: type === 'fill' ? null : existingAccount?.id,
    budget_id: type === 'income' ? null : existingBudget?.id,
    type,
    amount,
    title,
    transaction_date: transaction_date ? transaction_date : new Date().toISOString(),
  };

  return await withTransaction((client) => handleCreateTransactionWithAccount(transactionPayload, transcationHelpers, client));
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

  const isSameTransactionAmount = existingTransaction?.amount === amount;

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
    diff_transaction_amount: isSameTransactionAmount ? existingTransaction?.amount : amount
  }

  const transactionPayload = {
    id: existingTransaction.id,
    user_id: existingTransaction.user_id,
    type: existingTransaction.type,

    // Fields that can be updated to new value
    account_id: existingTransaction.type === 'fill' ? existingTransaction.account_id : (account_id || existingTransaction?.account_id),
    budget_id: existingTransaction.type === 'income' ? existingTransaction.budget_id : (budget_id || existingTransaction?.budget_id),
    amount: amount ?? existingTransaction.amount,
    title: title || existingTransaction.title,
    transaction_date: transaction_date || existingTransaction.transaction_date,
  };

  if (existingTransaction?.type === 'expense') {
    await handleExpenseValidationOnUpdate(transactionPayload, transactionHelpers);
  }

  if (existingTransaction?.type === 'fill') {
    await handleFillValidationOnUpdate(transactionPayload, transactionHelpers);
  }

  return await withTransaction((client) => handleUpdateTransactionWithAccount(transactionPayload, transactionHelpers, client));
};

export const deleteTransactionById = async (transactionId, loggedInUser) =>
{
  // Check if there is a user loggedIn to create transaction
  const existingUser = await userRepo.findUserByEmail(loggedInUser.email);

  if (!existingUser) {
    throwErrorWithMessage("User does not exist.");
  }

  const existingTransaction = await transactionsRepo.findTransactionById(transactionId);

  if (!existingTransaction) {
    throwErrorWithMessage("Transaction does not exist!");
  }

  // Check if user is authorized.
  authorizeUserAction(existingTransaction?.user_id, existingUser?.id);

  return await withTransaction((client) => handleDeleteTransactionWithAccount(existingTransaction, client));
};


//--- Helpers

// Create transaction and update account balance based on transaction type
const handleCreateTransactionWithAccount = async (transcationPayload, transactionHelpers, client) =>
{
  // 1. Create transaction using transcationPayload
  const createdTransaction = await transactionsRepo.insertTransactionToDB(transcationPayload, client);

  // 2. Check if transaction is created successfully
  if (!createdTransaction) {
    throwErrorWithMessage("Error creating transaction. Please try again.");
  }

  // 3. Deconstruct transactionPayload and transactionHelpers
  const { balanceDelta } = transactionHelpers;
  const { account_id, budget_id, user_id, type, amount } = transcationPayload;

  let account;
  let budget;

  // Handles account income and expense
  if (['income', 'expense'].includes(type)) {
    account = await accountsRepo.updateAccountBalance(account_id, user_id, balanceDelta, client);

    if (!account) {
      throwErrorWithMessage("Error updating account balance. Please try again.");
    }
  }

  // Handles budget fill and expense
  if (['fill', 'expense'].includes(type)) {
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
  const updatedTransaction = await transactionsRepo.updateTransactionById(transactionPayload, client);

  if (!updatedTransaction) {
    throwErrorWithMessage("Error updating transaction. Please try again.");
  }

  let old_account;
  let new_account;
  let old_budget;
  let new_budget;
  let updated_accounts;
  let updated_budgets;

  const updateHandlers = {
    fill: handleFillUpdate,
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
  // 1. Deconstruct transactionPayload
  const { id, user_id, budget_id, amount, type, account_id } = existingTransaction;

  const deletedTransaction = await transactionsRepo.deleteTransactionById(id, user_id, client);

  if (!deletedTransaction) {
    throwErrorWithMessage("Error deleting transaction. Please try again.");
  }

  let account;
  let budget;

  // 4. Get balance delta (-balanceDelta for income, +balanceDelta for expense)
  const balanceDelta = -(getBalanceDelta(type, amount));

  if (type !== 'fill') {
    // 5. Update account balance based on transaction_amount and transaction_type
    account = await accountsRepo.updateAccountBalance(account_id, user_id, balanceDelta, client);

    // 6. Check if account succeeded
    if (!account) {
      throwErrorWithMessage("Error updating account balance. Please try again.");
    }
  }

  if (type !== 'income') {
    // 7. Update budget allocated amount based on transaction_amount and transaction_type
    budget = await budgetsRepo.updateAllocatedAmount(budget_id, user_id, balanceDelta, client);

    // 8. Check if budget succeeded
    if (!budget) {
      throwErrorWithMessage("Error updating budget allocated amount. Please try again.");
    }
  }

  return { is_transaction_delete: deletedTransaction, account, budget };
}


// Update old and new account allocated_balance & old and new budget allocated_amount
const handleFillUpdate = async (transactionPayload, transactionHelpers, client) =>
{
  const { budget_id, type, user_id } = transactionPayload;
  const { is_same_budget, is_same_transaction_amount, existing_transaction, diff_amount, diff_transaction_amount } = transactionHelpers;
  const { amount: existingTransactionAmount, budget_id: existingBudgetId } = existing_transaction;

  let old_account;
  let new_account;
  let old_budget;
  let new_budget;

  /// Do nothing if is_same_transaction_amount && is_same_account || is_same_budget
  if (type === 'fill') {
    //  Update old account allocated_balance and old budget allocated_amount if !is_same_transaction_amount
    if (!is_same_transaction_amount) {
      if (is_same_budget) {
        old_budget = await budgetsRepo.updateAllocatedAmount(existingBudgetId, user_id, diff_amount, client);

        if (!old_budget) {
          throwErrorWithMessage("Error updating budget allocated_amount. Please try again.");
        }
      }
    }

    // Handles is_same_transaction_amount & !is_same_transaction_amount
    // Subtract existingTransactionAmount to old and add diff_transaction_amount to new
    if (!is_same_budget) {
      old_budget = await budgetsRepo.updateAllocatedAmount(existingBudgetId, user_id, -existingTransactionAmount, client);

      if (!old_budget) {
        throwErrorWithMessage("Error updating old budget allocated_amount. Please try again.");
      }

      new_budget = await budgetsRepo.updateAllocatedAmount(budget_id, user_id, diff_transaction_amount, client);

      if (!new_budget) {
        throwErrorWithMessage("Error updating new budget allocated_amount. Please try again.");
      }
    }
  }

  return { old_account, new_account, old_budget, new_budget };
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
const handleFillValidationOnUpdate = async (transactionPayload, transactionHelpers) =>
{
  const { type } = transactionPayload;
  const { is_same_budget, existing_transaction, old_budget, diff_amount } = transactionHelpers;
  const { user_id: existingTransactionUserId } = existing_transaction;

  if (type === 'fill') {
    const hasEnoughUnallocated = await hasEnoughTotalUnallocatedForFill(existingTransactionUserId, diff_amount);

    if (!hasEnoughUnallocated) {
      throwErrorWithMessage("Insufficient unallocated amount for fill. Please try again.");
    }

    if (diff_amount < 0 && is_same_budget) {
      if ((Number(old_budget.allocated_amount) + diff_amount) < 0) {
        throwErrorWithMessage("Cannot reduce fill below what this budget has already spent.");
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