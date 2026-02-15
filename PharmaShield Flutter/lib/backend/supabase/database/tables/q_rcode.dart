import '../database.dart';

class QRcodeTable extends SupabaseTable<QRcodeRow> {
  @override
  String get tableName => 'QRcode';

  @override
  QRcodeRow createRow(Map<String, dynamic> data) => QRcodeRow(data);
}

class QRcodeRow extends SupabaseDataRow {
  QRcodeRow(Map<String, dynamic> data) : super(data);

  @override
  SupabaseTable get table => QRcodeTable();

  int get id => getField<int>('id')!;
  set id(int value) => setField<int>('id', value);

  DateTime get createdAt => getField<DateTime>('created_at')!;
  set createdAt(DateTime value) => setField<DateTime>('created_at', value);

  String? get code => getField<String>('code');
  set code(String? value) => setField<String>('code', value);
}
