import '/flutter_flow/flutter_flow_theme.dart';
import '/flutter_flow/flutter_flow_util.dart';
import '/flutter_flow/flutter_flow_widgets.dart';
import 'dart:ui';
import '/index.dart';
import 'edit_profile_widget.dart' show EditProfileWidget;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';

class EditProfileModel extends FlutterFlowModel<EditProfileWidget> {
  ///  State fields for stateful widgets in this page.

  // State field(s) for Fname widget.
  FocusNode? fnameFocusNode;
  TextEditingController? fnameTextController;
  String? Function(BuildContext, String?)? fnameTextControllerValidator;
  // State field(s) for Mname widget.
  FocusNode? mnameFocusNode;
  TextEditingController? mnameTextController;
  String? Function(BuildContext, String?)? mnameTextControllerValidator;
  // State field(s) for Lname widget.
  FocusNode? lnameFocusNode;
  TextEditingController? lnameTextController;
  String? Function(BuildContext, String?)? lnameTextControllerValidator;
  // State field(s) for Num widget.
  FocusNode? numFocusNode;
  TextEditingController? numTextController;
  String? Function(BuildContext, String?)? numTextControllerValidator;

  @override
  void initState(BuildContext context) {}

  @override
  void dispose() {
    fnameFocusNode?.dispose();
    fnameTextController?.dispose();

    mnameFocusNode?.dispose();
    mnameTextController?.dispose();

    lnameFocusNode?.dispose();
    lnameTextController?.dispose();

    numFocusNode?.dispose();
    numTextController?.dispose();
  }
}
