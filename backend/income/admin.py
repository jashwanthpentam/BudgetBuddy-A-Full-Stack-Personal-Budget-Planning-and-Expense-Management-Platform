from django.contrib import admin

from .models import Income


@admin.register(Income)
class IncomeAdmin(admin.ModelAdmin):

    list_display = (
        "source",
        "amount",
        "income_date",
        "user",
    )

    list_filter = (
        "source",
        "income_date",
    )

    search_fields = (
        "user__username",
    )