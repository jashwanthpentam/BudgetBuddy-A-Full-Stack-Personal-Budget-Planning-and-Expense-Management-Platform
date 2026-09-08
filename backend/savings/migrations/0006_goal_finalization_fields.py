from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("savings", "0005_savingscontribution")]

    operations = [
        migrations.AddField(model_name="savingsgoal", name="is_active", field=models.BooleanField(default=True)),
        migrations.AddField(model_name="savingsgoal", name="is_finalized", field=models.BooleanField(default=False)),
        migrations.AddField(model_name="savingsgoal", name="finalized_amount", field=models.DecimalField(decimal_places=2, default=0, max_digits=10)),
        migrations.AddField(model_name="savingsgoal", name="finalized_at", field=models.DateTimeField(blank=True, null=True)),
    ]
