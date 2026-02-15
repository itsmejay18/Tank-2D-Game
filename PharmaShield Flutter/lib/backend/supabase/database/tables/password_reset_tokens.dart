import '../database.dart';

class PasswordResetTokensTable extends SupabaseTable<PasswordResetTokensRow> {
  @override
  String get tableName => 'password_reset_tokens';

  @override
  PasswordResetTokensRow createRow(Map<String, dynamic> data) =>
      PasswordResetTokensRow(data);
}

class PasswordResetTokensRow extends SupabaseDataRow {
  PasswordResetTokensRow(Map<String, dynamic> data) : super(data);

  @override
  SupabaseTable get table => PasswordResetTokensTable();

  String get email => getField<String>('email')!;
  set email(String value) => setField<String>('email', value);

  String get token => getField<String>('token')!;
  set token(String value) => setField<String>('token', value);

  DateTime? get createdAt => getField<DateTime>('created_at');
  set createdAt(DateTime? value) => setField<DateTime>('created_at', value);
}
