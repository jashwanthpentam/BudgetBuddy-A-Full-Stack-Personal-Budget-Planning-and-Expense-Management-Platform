from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("savings", "0006_savingsgoal_finalized_amount_and_more"),
    ]

    operations = [
        migrations.RunSQL(
            sql="""
                ALTER TABLE savings_savingsgoal
                DROP COLUMN IF EXISTS lifecycle_status;

                ALTER TABLE savings_savingsgoal
                DROP COLUMN IF EXISTS final_progress_percentage;

                ALTER TABLE savings_savingsgoal
                DROP COLUMN IF EXISTS final_result;
            """,
            reverse_sql="""
                ALTER TABLE savings_savingsgoal
                ADD COLUMN IF NOT EXISTS lifecycle_status varchar(20) NOT NULL DEFAULT 'ACTIVE';

                ALTER TABLE savings_savingsgoal
                ADD COLUMN IF NOT EXISTS final_progress_percentage numeric(7,2) NOT NULL DEFAULT 0;

                ALTER TABLE savings_savingsgoal
                ADD COLUMN IF NOT EXISTS final_result varchar(30) NOT NULL DEFAULT '';
            """,
        ),
    ]
