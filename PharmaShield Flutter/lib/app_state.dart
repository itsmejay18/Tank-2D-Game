import 'package:flutter/material.dart';
import '/backend/api_requests/api_manager.dart';
import 'backend/supabase/supabase.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'flutter_flow/flutter_flow_util.dart';

class FFAppState extends ChangeNotifier {
  static FFAppState _instance = FFAppState._internal();

  factory FFAppState() {
    return _instance;
  }

  FFAppState._internal();

  static void reset() {
    _instance = FFAppState._internal();
  }

  Future initializePersistedState() async {}

  void update(VoidCallback callback) {
    callback();
    notifyListeners();
  }

  String _EmAil = '';
  String get EmAil => _EmAil;
  set EmAil(String value) {
    _EmAil = value;
  }

  String _scannedQRValue = '';
  String get scannedQRValue => _scannedQRValue;
  set scannedQRValue(String value) {
    _scannedQRValue = value;
  }

  String _validatedcode = '';
  String get validatedcode => _validatedcode;
  set validatedcode(String value) {
    _validatedcode = value;
  }
}
