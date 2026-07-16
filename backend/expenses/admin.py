from django.contrib import admin
from .models import Expense


@admin.register(Expense)
class ExpenseAdmin(admin.ModelAdmin):

    list_display = (
        "category",
        "amount",
        "expense_date",
        "user",
    )

    search_fields = (
        "category",
        "user__username",
    )

    list_filter = (
        "category",
        "expense_date",
    )

    ordering = (
        "-expense_date",
    )