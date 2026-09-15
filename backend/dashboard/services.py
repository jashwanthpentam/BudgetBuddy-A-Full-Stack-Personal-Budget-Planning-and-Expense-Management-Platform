from decimal import Decimal
from django.db.models import Sum
from income.models import Income
from expenses.models import Expense
from budgets.models import Budget
from savings.models import SavingsGoal
from django.db.models import Q

def financial_totals(user):
    income = Income.objects.filter(user=user).aggregate(v=Sum('amount'))['v'] or Decimal('0')
    expense = Expense.objects.filter(user=user).aggregate(v=Sum('amount'))['v'] or Decimal('0')
    budget = Budget.objects.filter(user=user).aggregate(v=Sum('budget_amount'))['v'] or Decimal('0')
    return income, expense, budget


def _income_affected_budgets(user, income_qs):
    """Return budgets invalidated by deleting the supplied income records.

    Budget validity is monthly: a budget can only exist when the month's
    total budget allocation does not exceed that month's income. Therefore,
    deleting income only affects budgets in the same month/year periods as
    the deleted income, and only when that period becomes over-allocated.
    """
    periods = set(
        income_qs.values_list("income_date__month", "income_date__year")
    )
    if not periods:
        return Budget.objects.none()

    affected_ids = []
    for month, year in periods:
        remaining_income = (
            Income.objects.filter(
                user=user,
                income_date__month=month,
                income_date__year=year,
            )
            .exclude(id__in=income_qs.values("id"))
            .aggregate(v=Sum("amount"))["v"]
            or Decimal("0")
        )
        period_budgets = Budget.objects.filter(
            user=user,
            month=month,
            year=year,
        )
        allocated_budget = period_budgets.aggregate(
            v=Sum("budget_amount")
        )["v"] or Decimal("0")
        if allocated_budget > remaining_income:
            affected_ids.extend(period_budgets.values_list("id", flat=True))

    return Budget.objects.filter(user=user, id__in=set(affected_ids))


def _delete_budget_dependencies(user, budget_qs):
    """Delete expenses whose exact category/month/year budget is being deleted."""
    dependent_expenses = get_dependent_expenses(user, budget_qs)
    deleted_expense_count = dependent_expenses.count()
    dependent_expenses.delete()
    deleted_budget_count = budget_qs.count()
    budget_qs.delete()
    return deleted_budget_count, deleted_expense_count


def delete_budget_with_dependencies(user, budget_qs):
    """Delete budgets and their exact dependent expenses atomically."""
    return _delete_budget_dependencies(user, budget_qs)


def delete_income_with_dependencies(user, income_qs):
    """Delete income and any budgets/expenses invalidated by that deletion."""
    affected_budgets = _income_affected_budgets(user, income_qs)
    dependent_expenses = get_dependent_expenses(user, affected_budgets)

    deleted_expense_count = dependent_expenses.count()
    deleted_budget_count = affected_budgets.count()
    dependent_expenses.delete()
    affected_budgets.delete()
    deleted_income_count = income_qs.count()
    income_qs.delete()

    return deleted_income_count, deleted_budget_count, deleted_expense_count

def get_dependent_expenses(user, budget_qs):
    """
    Return expenses belonging to budgets selected for deletion.

    Matching is strictly based on:
    user + category + expense month + expense year.
    """
    expenses = Expense.objects.filter(user=user)

    query = Q()

    for budget in budget_qs:
        query |= Q(
            category=budget.category,
            expense_date__month=budget.month,
            expense_date__year=budget.year,
        )

    if not query:
        return Expense.objects.none()

    return expenses.filter(query).distinct()

def deletion_impact(user, resource, ids):
    ids = list(dict.fromkeys(int(i) for i in ids))
    if resource == 'income':
        qs = Income.objects.filter(user=user, id__in=ids)
        removed = qs.aggregate(v=Sum('amount'))['v'] or Decimal('0')
        income, expense, budget = financial_totals(user)
        new_income = income - removed
        affected_budgets = _income_affected_budgets(user, qs)
        dependent_expenses = get_dependent_expenses(user, affected_budgets)
        affected_budget_amount = affected_budgets.aggregate(v=Sum('budget_amount'))['v'] or Decimal('0')
        dependent_expense_amount = dependent_expenses.aggregate(v=Sum('amount'))['v'] or Decimal('0')
        return {
            'resource': resource, 'count': qs.count(), 'removed_amount': removed,
            'current_income': income, 'new_income': new_income,
            'current_balance': income - expense, 'new_balance': new_income - expense,
            'budget_over_income': affected_budgets.exists(),
            'expenses_over_income': expense > new_income,
            'affected_budget_count': affected_budgets.count(),
            'affected_budget_amount': affected_budget_amount,
            'dependent_expense_count': dependent_expenses.count(),
            'dependent_expense_amount': dependent_expense_amount,
            'budgets_deleted': affected_budgets.exists(),
            'expenses_deleted': dependent_expenses.exists(),
            'savings_recalculation': True, 'dashboard_recalculation': True,
        }
    if resource == 'expense':
        qs = Expense.objects.filter(user=user, id__in=ids)
        removed = qs.aggregate(v=Sum('amount'))['v'] or Decimal('0')
        income, expense, budget = financial_totals(user)
        new_expense = expense - removed
        return {
            'resource': resource, 'count': qs.count(), 'removed_amount': removed,
            'current_expense': expense, 'new_expense': new_expense,
            'current_balance': income - expense, 'new_balance': income - new_expense,
            'savings_recalculation': True, 'budget_recalculation': True,
            'dashboard_recalculation': True,
        }
    if resource == 'budget':
        qs = Budget.objects.filter(user=user, id__in=ids)
        removed = qs.aggregate(v=Sum('budget_amount'))['v'] or Decimal('0')
        dependent_expenses = get_dependent_expenses(user, qs)
        dependent_expense_amount = dependent_expenses.aggregate(v=Sum('amount'))['v'] or Decimal('0')
        return {
            'resource': resource,
            'count': qs.count(),
            'removed_amount': removed,
            'dependent_expense_count': dependent_expenses.count(),
            'dependent_expense_amount': dependent_expense_amount,
            'expenses_deleted': True,
            'budget_tracking_changes': True,
            'savings_recalculation': True,
            'dashboard_recalculation': True,
        }
    if resource == 'savings':
        qs = SavingsGoal.objects.filter(user=user, id__in=ids)
        finalized = qs.filter(is_finalized=True).aggregate(v=Sum('finalized_amount'))['v'] or Decimal('0')
        return {
            'resource': resource, 'count': qs.count(), 'removed_amount': finalized,
            'active_allocations_released': qs.filter(is_finalized=False).count() > 0,
            'finalized_amount_released': finalized,
            'savings_recalculation': True,
        }
    if resource == 'notification':
        qs = __import__('notifications.models', fromlist=['Notification']).Notification.objects.filter(user=user, id__in=ids)
        return {'resource': resource, 'count': qs.count(), 'removed_amount': Decimal('0')}
    raise ValueError('Unsupported resource')
