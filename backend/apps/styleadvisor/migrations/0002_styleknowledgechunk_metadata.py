from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("styleadvisor", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="styleknowledgechunk",
            name="title",
            field=models.CharField(blank=True, default="", max_length=255),
        ),
        migrations.AddField(
            model_name="styleknowledgechunk",
            name="source_file",
            field=models.CharField(blank=True, default="", max_length=255),
        ),
        migrations.AddField(
            model_name="styleknowledgechunk",
            name="content_hash",
            field=models.CharField(blank=True, default="", max_length=64),
        ),
        migrations.AddField(
            model_name="styleknowledgechunk",
            name="embedding",
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.AlterModelOptions(
            name="styleknowledgechunk",
            options={"ordering": ["source_file", "created_at"]},
        ),
    ]