from datetime import date, timedelta
from decimal import Decimal
from types import SimpleNamespace

from django.contrib.auth.models import User
from django.test import TestCase

from income.models import Income
from expenses.models import Expense
from .models import SavingsGoal
from .services import (
    _priority_weighted_allocations,
    period_totals,
    refresh_goal_allocations,
)


class SavingsAllocationTests(TestCase):
    def make_goal(self, goal_id, name, target, target_date):
        return SimpleNamespace(
            id=goal_id,
            goal_name=name,
            target_amount=Decimal(target),
            target_date=target_date,
        )

    def test_earlier_target_date_has_higher_priority(self):
        goals = [
            self.make_goal(1, "Later", "1000", date(2026, 12, 31)),
            self.make_goal(2, "Earlier", "1000", date(2026, 10, 1)),
        ]
        allocations, unallocated = _priority_weighted_allocations(
            goals, Decimal("90")
        )

        self.assertEqual(unallocated, Decimal("0.00"))
        self.assertEqual(allocations[2], Decimal("60.00"))
        self.assertEqual(allocations[1], Decimal("30.00"))

    def test_higher_target_breaks_same_date_tie(self):
        same_day = date(2026, 10, 1)
        goals = [
            self.make_goal(1, "Smaller", "500", same_day),
            self.make_goal(2, "Larger", "1000", same_day),
        ]
        allocations, unallocated = _priority_weighted_allocations(
            goals, Decimal("90")
        )

        self.assertEqual(unallocated, Decimal("0.00"))
        self.assertEqual(allocations[2], Decimal("60.00"))
        self.assertEqual(allocations[1], Decimal("30.00"))

    def test_allocation_never_exceeds_target_or_pool(self):
        goals = [
            self.make_goal(1, "Small", "20", date(2026, 10, 1)),
            self.make_goal(2, "Large", "1000", date(2026, 11, 1)),
        ]
        allocations, unallocated = _priority_weighted_allocations(
            goals, Decimal("500")
        )

        allocated = sum(allocations.values(), Decimal("0"))
        self.assertLessEqual(allocated, Decimal("500.00"))
        self.assertLessEqual(allocations[1], Decimal("20.00"))
        self.assertLessEqual(allocations[2], Decimal("1000.00"))
        self.assertEqual(allocated + unallocated, Decimal("500.00"))

    def test_lifetime_balance_excludes_frozen_finalized_amount(self):
        user = User.objects.create_user(username="savings-test", password="testpass")
        Income.objects.create(
            user=user,
            amount=Decimal("1000.00"),
            source="SALARY",
            description="test",
            income_date=date(2026, 9, 1),
        )
        SavingsGoal.objects.create(
            user=user,
            goal_name="Frozen",
            target_amount=Decimal("400.00"),
            target_date=date(2026, 9, 1),
            is_active=False,
            is_finalized=True,
            finalized_amount=Decimal("400.00"),
            finalized_at=None,
            status="Completed",
        )
        active = SavingsGoal.objects.create(
            user=user,
            goal_name="Active",
            target_amount=Decimal("1000.00"),
            target_date=date.today() + timedelta(days=30),
        )

        allocations, unallocated = refresh_goal_allocations(user, notify=False)

        self.assertEqual(allocations[active.id], Decimal("600.00"))
        self.assertEqual(unallocated, Decimal("0.00"))


class SavingsPeriodTotalsTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="period-test", password="testpass")
        Income.objects.create(
            user=self.user,
            amount=Decimal("1000.00"),
            source="SALARY",
            description="September",
            income_date=date(2026, 9, 5),
        )
        Income.objects.create(
            user=self.user,
            amount=Decimal("500.00"),
            source="FREELANCING",
            description="August",
            income_date=date(2026, 8, 20),
        )
        Expense.objects.create(
            user=self.user,
            amount=Decimal("200.00"),
            category="FOOD",
            description="September",
            expense_date=date(2026, 9, 6),
        )

    def test_month_totals(self):
        income, expense, net = period_totals(
            self.user, period="month", month=9, year=2026
        )
        self.assertEqual(income, Decimal("1000.00"))
        self.assertEqual(expense, Decimal("200.00"))
        self.assertEqual(net, Decimal("800.00"))

    def test_custom_period_is_inclusive(self):
        income, expense, net = period_totals(
            self.user,
            period="custom",
            start_date=date(2026, 9, 5),
            end_date=date(2026, 9, 6),
        )
        self.assertEqual(income, Decimal("1000.00"))
        self.assertEqual(expense, Decimal("200.00"))
        self.assertEqual(net, Decimal("800.00"))

    def test_lifetime_totals(self):
        income, expense, net = period_totals(self.user, period="lifetime")
        self.assertEqual(income, Decimal("1500.00"))
        self.assertEqual(expense, Decimal("200.00"))
        self.assertEqual(net, Decimal("1300.00"))

class SavingsLifecycleTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="lifecycle-test", password="testpass")

    def test_due_goal_is_finalized_and_frozen(self):
        goal = SavingsGoal.objects.create(
            user=self.user,
            goal_name="Due Goal",
            target_amount=Decimal("500.00"),
            target_date=date.today(),
        )
        Income.objects.create(
            user=self.user,
            amount=Decimal("500.00"),
            source="SALARY",
            description="funding",
            income_date=date.today(),
        )

        allocations, _ = refresh_goal_allocations(self.user, notify=False)
        goal.refresh_from_db()

        self.assertTrue(goal.is_finalized)
        self.assertFalse(goal.is_active)
        self.assertEqual(goal.status, "Completed")
        self.assertEqual(goal.finalized_amount, Decimal("500.00"))
        self.assertEqual(allocations[goal.id], Decimal("500.00"))

    def test_finalized_goal_does_not_receive_new_savings(self):
        finalized = SavingsGoal.objects.create(
            user=self.user,
            goal_name="Completed",
            target_amount=Decimal("100.00"),
            target_date=date.today() - timedelta(days=1),
            is_active=False,
            is_finalized=True,
            finalized_amount=Decimal("100.00"),
            status="Completed",
        )
        active = SavingsGoal.objects.create(
            user=self.user,
            goal_name="Current",
            target_amount=Decimal("300.00"),
            target_date=date.today() + timedelta(days=30),
        )
        Income.objects.create(
            user=self.user,
            amount=Decimal("400.00"),
            source="SALARY",
            description="funding",
            income_date=date.today(),
        )

        allocations, _ = refresh_goal_allocations(self.user, notify=False)

        self.assertEqual(allocations[finalized.id], Decimal("100.00"))
        self.assertEqual(allocations[active.id], Decimal("300.00"))

    def test_non_finalized_goal_can_be_paused_without_receiving_allocation(self):
        paused = SavingsGoal.objects.create(
            user=self.user,
            goal_name="Paused",
            target_amount=Decimal("100.00"),
            target_date=date.today() + timedelta(days=10),
            is_active=False,
        )
        active = SavingsGoal.objects.create(
            user=self.user,
            goal_name="Active",
            target_amount=Decimal("100.00"),
            target_date=date.today() + timedelta(days=20),
        )
        Income.objects.create(
            user=self.user,
            amount=Decimal("100.00"),
            source="SALARY",
            description="funding",
            income_date=date.today(),
        )

        allocations, unallocated = refresh_goal_allocations(self.user, notify=False)

        self.assertEqual(allocations.get(paused.id, Decimal("0")), Decimal("0"))
        self.assertEqual(allocations[active.id], Decimal("100.00"))
        self.assertEqual(unallocated, Decimal("0.00"))
