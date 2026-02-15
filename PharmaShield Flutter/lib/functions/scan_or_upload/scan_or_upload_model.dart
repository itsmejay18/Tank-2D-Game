import '/backend/supabase/supabase.dart';
import '/flutter_flow/flutter_flow_animations.dart';
import '/flutter_flow/flutter_flow_icon_button.dart';
import '/flutter_flow/flutter_flow_theme.dart';
import '/flutter_flow/flutter_flow_util.dart';
import '/flutter_flow/flutter_flow_widgets.dart';
import '/flutter_flow/upload_data.dart';
import 'dart:math';
import 'dart:ui';
import '/index.dart';
import 'scan_or_upload_widget.dart' show ScanOrUploadWidget;
import 'package:flutter/material.dart';
import 'package:flutter/scheduler.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_barcode_scanner/flutter_barcode_scanner.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';

class ScanOrUploadModel extends FlutterFlowModel<ScanOrUploadWidget> {
  ///  State fields for stateful widgets in this page.

  var scanning = '';
  // Stores action output result for [Backend Call - Query Rows] action in Button widget.
  List<QRcodeRow>? qrquerry;
  bool isDataUploading_uploadData5t0 = false;
  FFUploadedFile uploadedLocalFile_uploadData5t0 =
      FFUploadedFile(bytes: Uint8List.fromList([]), originalFilename: '');
  String uploadedFileUrl_uploadData5t0 = '';

  @override
  void initState(BuildContext context) {}

  @override
  void dispose() {}
}
