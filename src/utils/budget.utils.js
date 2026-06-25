import { throwErrorWithMessage } from "./error.utils.js";
import { roundNumber } from "./math.utils.js";

export const getTotalBudgetNewAllocatedAmount = (budgets) =>
{
    if (budgets.length <= 0) throwErrorWithMessage("Missing budgets");

    const total = budgets?.reduce((accumulator, budget) => accumulator + (budget?.new_allocated_amount ?? 0), 0);

    return roundNumber(total);
}