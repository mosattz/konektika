# PowerShell script to import the database schema
$schemaContent = Get-Content -Path "schema.sql" -Raw
$schemaContent | mysql -u konektika_user -pkonektika_pass_2024 konektika