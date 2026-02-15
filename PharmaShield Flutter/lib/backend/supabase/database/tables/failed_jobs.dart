import '../database.dart';

class FailedJobsTable extends SupabaseTable<FailedJobsRow> {
  @override
  String get tableName => 'failed_jobs';

  @override
  FailedJobsRow createRow(Map<String, dynamic> data) => FailedJobsRow(data);
}

class FailedJobsRow extends SupabaseDataRow {
  FailedJobsRow(Map<String, dynamic> data) : super(data);

  @override
  SupabaseTable get table => FailedJobsTable();

  int get id => getField<int>('id')!;
  set id(int value) => setField<int>('id', value);

  String get uuid => getField<String>('uuid')!;
  set uuid(String value) => setField<String>('uuid', value);

  String get connection => getField<String>('connection')!;
  set connection(String value) => setField<String>('connection', value);

  String get queue => getField<String>('queue')!;
  set queue(String value) => setField<String>('queue', value);

  String get payload => getField<String>('payload')!;
  set payload(String value) => setField<String>('payload', value);

  String get exception => getField<String>('exception')!;
  set exception(String value) => setField<String>('exception', value);

  DateTime get failedAt => getField<DateTime>('failed_at')!;
  set failedAt(DateTime value) => setField<DateTime>('failed_at', value);
}
