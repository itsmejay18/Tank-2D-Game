import '../database.dart';

class MigrationsTable extends SupabaseTable<MigrationsRow> {
  @override
  String get tableName => 'migrations';

  @override
  MigrationsRow createRow(Map<String, dynamic> data) => MigrationsRow(data);
}

class MigrationsRow extends SupabaseDataRow {
  MigrationsRow(Map<String, dynamic> data) : super(data);

  @override
  SupabaseTable get table => MigrationsTable();

  int get id => getField<int>('id')!;
  set id(int value) => setField<int>('id', value);

  String get migration => getField<String>('migration')!;
  set migration(String value) => setField<String>('migration', value);

  int get batch => getField<int>('batch')!;
  set batch(int value) => setField<int>('batch', value);
}
