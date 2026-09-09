from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("savings", "0005_savingscontribution"),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            database_operations=[
                migrations.RunSQL(
                    sql="""
                    ALTER TABLE savings_savingsgoal
                    ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT TRUE;

                    ALTER TABLE savings_savingsgoal
                    ADD COLUMN IF NOT EXISTS is_finalized boolean NOT NULL DEFAULT FALSE;

                    ALTER TABLE savings_savingsgoal
                    ADD COLUMN IF NOT EXISTS finalized_amount numeric(10,2) NOT NULL DEFAULT 0;

                    ALTER TABLE savings_savingsgoal
                    ADD COLUMN IF NOT EXISTS finalized_at timestamp with time zone NULL;

                    DO $$
                    BEGIN
                        IF EXISTS (
                            SELECT 1
                            FROM information_schema.columns
                            WHERE table_schema = current_schema()
                              AND table_name = 'savings_savingsgoal'
                              AND column_name = 'final_saved_amount'
                        ) THEN
                            EXECUTE 'UPDATE savings_savingsgoal
                                     SET finalized_amount = COALESCE(final_saved_amount, 0)';
                        END IF;

                        IF EXISTS (
                            SELECT 1
                            FROM information_schema.columns
                            WHERE table_schema = current_schema()
                              AND table_name = 'savings_savingsgoal'
                              AND column_name = 'lifecycle_status'
                        ) THEN
                            EXECUTE 'UPDATE savings_savingsgoal
                                     SET is_active = CASE
                                         WHEN UPPER(COALESCE(lifecycle_status, ''ACTIVE'')) = ''ACTIVE''
                                              AND finalized_at IS NULL
                                         THEN TRUE ELSE FALSE END';
                        END IF;

                        IF EXISTS (
                            SELECT 1
                            FROM information_schema.columns
                            WHERE table_schema = current_schema()
                              AND table_name = 'savings_savingsgoal'
                              AND column_name = 'final_result'
                        ) THEN
                            EXECUTE 'UPDATE savings_savingsgoal
                                     SET is_finalized = CASE
                                         WHEN finalized_at IS NOT NULL
                                              OR COALESCE(final_result, '''') <> ''''
                                         THEN TRUE ELSE FALSE END';
                        ELSE
                            EXECUTE 'UPDATE savings_savingsgoal
                                     SET is_finalized = (finalized_at IS NOT NULL)';
                        END IF;
                    END $$;
                    """,
                    reverse_sql=migrations.RunSQL.noop,
                ),
            ],
            state_operations=[
                migrations.AddField(
                    model_name="savingsgoal",
                    name="finalized_amount",
                    field=models.DecimalField(
                        decimal_places=2,
                        default=0,
                        max_digits=10,
                    ),
                ),
                migrations.AddField(
                    model_name="savingsgoal",
                    name="finalized_at",
                    field=models.DateTimeField(
                        blank=True,
                        null=True,
                    ),
                ),
                migrations.AddField(
                    model_name="savingsgoal",
                    name="is_active",
                    field=models.BooleanField(default=True),
                ),
                migrations.AddField(
                    model_name="savingsgoal",
                    name="is_finalized",
                    field=models.BooleanField(default=False),
                ),
            ],
        ),
    ]
