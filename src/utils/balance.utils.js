import { getUserBudgetSummary } from "../api/budgets/budgets.repo.js";
import { roundNumber } from "./math.utils.js";

// e.g. src/utils/balance.utils.js
export const getBalanceDelta = (type, amount) =>
{
    const numericAmount = amount;

    switch (type) {
        case "income":
        case "fill":
            return numericAmount;
        case "expense":
            return -numericAmount;
        default:
            const error = new Error("Invalid transaction type");
            error.status = 400;
            throw error;
    }
};

export const isBalanceValidForExpense = (existingAccountBalance, amount, type) =>
{
    const result = type === "expense" ? (existingAccountBalance - amount >= 0) : true
    return result;
}

export const calculateUnallocated = (totalBalance, totalAllocated) =>
{
    return totalBalance - totalAllocated;
};

export const getAccountUnallocatedAmount = (balance, allocated_amount) =>
{
    return balance - allocated_amount;
}

export const hasEnoughTotalUnallocatedForFill = async (userId, amount) =>
{
    const { total_unallocated } = await getBudgetsSummary(userId);

    return Number(total_unallocated) >= Number(amount);
};

export const getBudgetsSummary = async (userId) =>
{
    const budgetsSummary = await getUserBudgetSummary(userId);

    if (!budgetsSummary) {
        const error = new Error("Error in fetching budgets summary. Please try again.");
        error.status = 400;
        throw error;
    }

    return budgetsSummary;
}

// Returns the difference between the new and existing transaction amounts. 
// Positive if the new amount is greater, negative otherwise.
export const getDiffAmount = (amount, existingTransactionAmount) =>
{
    const isAmountGreaterThanExisting = amount > existingTransactionAmount;
    const result = isAmountGreaterThanExisting ? amount - existingTransactionAmount : -(existingTransactionAmount - amount);
    const roundedResult = roundNumber(result);
    return roundedResult;
}