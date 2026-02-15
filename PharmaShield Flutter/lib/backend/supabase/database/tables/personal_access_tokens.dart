import '../database.dart';

class PersonalAccessTokensTable extends SupabaseTable<PersonalAccessTokensRow> {
  @override
  String get tableName => 'personal_access_tokens';

  @override
  PersonalAccessTokensRow createRow(Map<String, dynamic> data) =>
      PersonalAccessTokensRow(data);
}

class PersonalAccessTokensRow extends SupabaseDataRow {
  PersonalAccessTokensRow(Map<String, dynamic> data) : super(data);

  @override
  SupabaseTable get table => PersonalAccessTokensTable();

  int get id => getField<int>('id')!;
  set id(int value) => setField<int>('id', value);

  String get tokenableType => getField<String>('tokenable_type')!;
  set tokenableType(String value) => setField<String>('tokenable_type', value);

  int get tokenableId => getField<int>('tokenable_id')!;
  set tokenableId(int value) => setField<int>('tokenable_id', value);

  String get name => getField<String>('name')!;
  set name(String value) => setField<String>('name', value);

  String get token => getField<String>('token')!;
  set token(String value) => setField<String>('token', value);

  String? get abilities => getField<String>('abilities');
  set abilities(String? value) => setField<String>('abilities', value);

  DateTime? get lastUsedAt => getField<DateTime>('last_used_at');
  set lastUsedAt(DateTime? value) => setField<DateTime>('last_used_at', value);

  DateTime? get expiresAt => getField<DateTime>('expires_at');
  set expiresAt(DateTime? value) => setField<DateTime>('expires_at', value);

  DateTime? get createdAt => getField<DateTime>('created_at');
  set createdAt(DateTime? value) => setField<DateTime>('created_at', value);

  DateTime? get updatedAt => getField<DateTime>('updated_at');
  set updatedAt(DateTime? value) => setField<DateTime>('updated_at', value);
}
