from decimal import Decimal
from django.db.models import Sum
from income.models import Income
from expenses.models import Expense
from budgets.models import Budget
from savings.models import SavingsGoal


def financial_totals(user):
    income = Income.objects.filter(user=user).aggregate(v=Sum('amount'))['v'] or Decimal('0')
    expense = Expense.objects.filter(user=user).aggregate(v=Sum('amount'))['v'] or Decimal('0')
    budget = Budget.objects.filter(user=user).aggregate(v=Sum('budget_amount'))['v'] or Decimal('0')
    return income, expense, budget


def deletion_impact(user, resource, ids):
    ids = list(dict.fromkeys(int(i) for i in ids))
    if resource == 'income':
        qs = Income.objects.filter(user=user, id__in=ids)
        removed = qs.aggregate(v=Sum('amount'))['v'] or Decimal('0')
        income, expense, budget = financial_totals(user)
        new_income = income - removed
        return {
            'resource': resource, 'count': qs.count(), 'removed_amount': removed,
            'current_income': income, 'new_income': new_income,
            'current_balance': income - expense, 'new_balance': new_income - expense,
            'budget_over_income': budget > new_income,
            'expenses_over_income': expense > new_income,
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
        return {
            'resource': resource, 'count': qs.count(), 'removed_amount': removed,
            'expenses_preserved': True, 'budget_tracking_changes': True,
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
