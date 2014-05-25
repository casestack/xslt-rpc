/*jslint vars: true, browser: true, node: true, regexp: true */
/*global angular, $, jQuery, alert*/

'use strict';

var xsltGUI   = angular.module('xsltGUI', ['ui.ace']);
var xml2js    = require('xml2js'),
    xml2json  = require('xml2json');
    //XSLT      = require('/rabbit/rpc-xslt.js');

var xmlBuilder = new xml2js.Builder();

var XSLT = require(require('path').join(process.cwd(), '/js/rabbit/rpc-xslt.js'));

xsltGUI.run(function ($rootScope, $location, $log) {
    console.log("NodeJS Version: " + process.version);
    $(document).ready(function () {
        var resizeApp = function () {
            $(".ace_editor").height($(window).height() - 50);
        };
        $(window).on('resize', resizeApp);
        resizeApp();
    });
});

xsltGUI.controller("bodyController", function ($scope, $log, $http, $rootScope) {

    $scope.dataSource = "<?xml version=\"1.0\"?>\n<greeting>Hello world.</greeting>";
    $scope.dataXSLT = "<?xml version=\"1.0\"?>\n<html xmlns:xsl=\"http://www.w3.org/1999/XSL/Transform\" xsl:version=\"1.0\">\n<head><title>Hello World</title></head> <body> <p> I just want to say <b><xsl:value-of select=\"greeting\"/></b> </p></body> </html>";
    $scope.dataOutput = "";
    $scope.xslt = new XSLT();

    $scope.applyTransformation = function () {
        $scope.dataOutput = "Calling RPC...";
        $scope.xslt.transform($scope.dataSource, $scope.dataXSLT, function (error, output) {
            if (error) {
                $scope.dataOutput = "An error occured during transformation\n" + error;
            } else {
                $scope.dataOutput = output.output;
            }
            $scope.safeApply();
        });
    };

    $scope.editors = {}; //keep track of all ACE editors instantiated

    $scope.sourceEditor = {
        useWrapMode : false,
        showGutter: true,
        mode: 'xml',
        theme: 'monokai',
        onLoad: function (editor) {
            console.log("ACE JSON Editor Loaded");
            $scope.editors.json = editor;
            $scope.aceLoaded(editor);
        }
    };

    $scope.stylesheetEditor = {
        useWrapMode : false,
        showGutter: true,
        mode: 'xml',
        theme: 'monokai',
        onLoad: function (editor) {
            console.log("ACE XML Editor Loaded");
            $scope.editors.xml = editor;
            $scope.aceLoaded(editor);
        }
    };

    $scope.outputEditor = {
        useWrapMode : false,
        showGutter: true,
        mode: 'xml',
        theme: 'monokai',
        onLoad: function (editor) {
            console.log("ACE YAML Editor Loaded");
            $scope.editors.yaml = editor;
            $scope.aceLoaded(editor);
        }
    };

    $scope.aceLoaded = function (editor) {
        editor.setHighlightActiveLine(false);
        editor.setFontSize("10px");
        editor.renderer.setShowPrintMargin(false);
    };

    $scope.safeApply = function (fn) {
        var phase = this.$root.$$phase;
        if (phase === '$apply' || phase === '$digest') {
            if (fn && (typeof (fn) === 'function')) {
                fn();
            }
        } else {
            this.$apply(fn);
        }
    };

});
