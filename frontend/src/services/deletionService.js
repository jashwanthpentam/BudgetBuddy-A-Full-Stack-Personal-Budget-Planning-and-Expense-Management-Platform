import API from "./api";

export const getDeletionImpact = async (resource, ids) => {
  const response = await API.get("/dashboard/delete-impact/", {
    params: { resource, ids: ids.join(",") },
  });
  return response.data;
};

export const bulkDelete = async (resource, ids) => {
  const response = await API.post("/dashboard/bulk-delete/", { resource, ids });
  return response.data;
};

export const formatDeletionImpact = (impact) => {
  const lines = [`${impact.count || 0} record(s) will be permanently deleted.`];
  if (impact.resource === "income") {
    lines.push(`Income will decrease by ₹${impact.removed_amount}.`);
    lines.push(`Available balance will change from ₹${impact.current_balance} to ₹${impact.new_balance}.`);
    if (Number(impact.affected_budget_count || 0) > 0) {
      lines.push(`This will also delete ${impact.affected_budget_count} affected budget(s) totaling ₹${impact.affected_budget_amount}.`);
      if (Number(impact.dependent_expense_count || 0) > 0) {
        lines.push(`Those budgets have ${impact.dependent_expense_count} associated expense(s) totaling ₹${impact.dependent_expense_amount}, which will also be deleted.`);
      }
      lines.push("These budgets become invalid because the remaining income for their month is no longer sufficient.");
    } else {
      lines.push("No existing monthly budgets become invalid because of this income deletion.");
    }
    lines.push("Savings and dashboard calculations will be recalculated.");
  } else if (impact.resource === "expense") {
    lines.push(`Expenses will decrease by ₹${impact.removed_amount}.`);
    lines.push(`Available balance will change from ₹${impact.current_balance} to ₹${impact.new_balance}.`);
    lines.push("Budget alerts, savings and dashboard calculations will be recalculated.");
  } else if (impact.resource === "budget") {
    lines.push(`Budget allocation will decrease by ₹${impact.removed_amount}.`);
    if (Number(impact.dependent_expense_count || 0) > 0) {
      lines.push(`This will also delete ${impact.dependent_expense_count} associated expense(s) totaling ₹${impact.dependent_expense_amount}.`);
    } else {
      lines.push("There are no associated expenses to delete.");
    }
    lines.push("Expenses require an active matching budget for their category, month and year.");
    lines.push("Savings and dashboard calculations will be recalculated.");
  } else if (impact.resource === "savings") {
    lines.push("Active goal allocations will be released and remaining goals may be redistributed.");
    if (Number(impact.finalized_amount_released || 0) > 0) lines.push(`₹${impact.finalized_amount_released} of finalized savings will be released from the frozen goal reservation.`);
  } else {
    lines.push("The notification will be permanently removed.");
  }
  lines.push("This action cannot be undone.");
  return lines.join("\n");
};
