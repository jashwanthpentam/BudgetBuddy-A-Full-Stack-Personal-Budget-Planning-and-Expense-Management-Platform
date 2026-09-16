from datetime import date
from decimal import Decimal

from django.contrib.auth.models import User
from django.test import TestCase

from expenses.models import Expense
from income.models import Income
from .services import parse_period_params, period_querysets


class PeriodSelectionTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="period_user", password="TestPass123!")
        Income.objects.create(user=self.user, amount=Decimal("1000.00"), source="SALARY", income_date=date(2026, 1, 5))
        Income.objects.create(user=self.user, amount=Decimal("2000.00"), source="SALARY", income_date=date(2026, 2, 5))
        Expense.objects.create(user=self.user, amount=Decimal("100.00"), category="FOOD", expense_date=date(2026, 1, 10))
        Expense.objects.create(user=self.user, amount=Decimal("200.00"), category="TRAVEL", expense_date=date(2026, 2, 10))

    def test_month_period_scopes_income_and_expense(self):
        period, month, year, start, end = parse_period_params({"period": "month", "month": "2", "year": "2026"})
        incomes, expenses, budgets = period_querysets(self.user, period, month, year, start, end)
        self.assertEqual(incomes.count(), 1)
        self.assertEqual(expenses.count(), 1)
        self.assertEqual(incomes.first().amount, Decimal("2000.00"))

    def test_custom_period_is_inclusive(self):
        period, month, year, start, end = parse_period_params({"period": "custom", "start_date": "2026-01-05", "end_date": "2026-02-05"})
        incomes, expenses, budgets = period_querysets(self.user, period, month, year, start, end)
        self.assertEqual(incomes.count(), 2)
        self.assertEqual(expenses.count(), 2)

    def test_lifetime_includes_all_transactions(self):
        period, month, year, start, end = parse_period_params({"period": "lifetime"})
        incomes, expenses, budgets = period_querysets(self.user, period, month, year, start, end)
        self.assertEqual(incomes.count(), 2)
        self.assertEqual(expenses.count(), 2)
