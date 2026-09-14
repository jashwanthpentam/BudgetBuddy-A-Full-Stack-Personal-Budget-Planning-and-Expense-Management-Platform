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
    if (impact.budget_over_income) lines.push("Existing budgets will exceed the remaining income and will be kept for you to review.");
    if (impact.expenses_over_income) lines.push("Existing expenses will exceed the remaining income; they will be preserved, not deleted.");
    lines.push("Savings and dashboard calculations will be recalculated.");
  } else if (impact.resource === "expense") {
    lines.push(`Expenses will decrease by ₹${impact.removed_amount}.`);
    lines.push(`Available balance will change from ₹${impact.current_balance} to ₹${impact.new_balance}.`);
    lines.push("Budget alerts, savings and dashboard calculations will be recalculated.");
  } else if (impact.resource === "budget") {
    lines.push(`Budget allocation will decrease by ₹${impact.removed_amount}.`);
    lines.push("Existing expenses will be preserved; only budget tracking for the deleted budget will disappear.");
  } else if (impact.resource === "savings") {
    lines.push("Active goal allocations will be released and remaining goals may be redistributed.");
    if (Number(impact.finalized_amount_released || 0) > 0) lines.push(`₹${impact.finalized_amount_released} of finalized savings will be released from the frozen goal reservation.`);
  } else {
    lines.push("The notification will be permanently removed.");
  }
  lines.push("This action cannot be undone.");
  return lines.join("\n");
};
