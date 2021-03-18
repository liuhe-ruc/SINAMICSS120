/*******************************************************************************************
    Version:    
    Notes:
         1:     Some comments in this file refer to literature:
                /patterns12/ 
                    Learning JavaScript Design Patterns
                    1st edition 2012
                    Addy Osmani, O'REILLY

        2:      To get at least some  kind of object oriented design with little overhead, 
                this library implements classes in the following way:
                - The interal class methods are added using prototypes 
                    (at least for classes that are instantiated more than one time)
                    => Memory optimized (see /patterns12/: Constructor pattern)
                    => Classes have public variables and methods only
                - To signal "private" class variables and methods,
                    * the "private" class variables and methods start with an underscore
                      (=> jslint nomen: true),
                    * all classes are in an "internal" namespace,
                    * the classes that are required outside use a decorator pattern                       
                      (see /patterns12/: Decorator pattern) or a similar pattern in the 
                      corresponding non-internal namespace making only those class variables
                      and methods being really required outside "visible".

        3:      Variables that should not be changed are in CAPITAL_LETTTTERS.
        4:      The minimum frequency of performing an update of the values in the html-page
                depends on the network connectin and the workload of the control unit of the 
                drive. Therefore the user of this library has to test and ensure that he does
                not call the update function in this library too frequently.
                Even in fast networks, update cycles below 1000ms are not recommended!
*******************************************************************************************/


/*******************************************************************************************
Warranty and Liability
======================
This library is not binding and does not claim to be complete regarding configuration, 
equipment and any eventuality. This library does not represent customer-specific solutions. 
It is only intended to provide support for typical applications. You are responsible for 
ensuring that the functionality you are using is tested and used correctly. 
This library does not relieve you of the responsibility to use sound practices in 
application, installation, operation and maintenance. 
When using this library, you recognize that we will not be liable for any damage/claims 
beyond the liability clause described. We reserve the right to make changes to this library 
at any time without prior notice.


We accept no liability for information contained in this document.
Any claims against us – based on whatever legal reason – resulting from the use of
this library, information, programs, engineering and performance data etc.,
described in this library shall be excluded. Such an exclusion shall not apply in the case 
of mandatory liability, e.g. under the German Product Liability Act (“Produkthaftungsgesetz”), 
in case of intent, gross negligence, or injury of life, body or health, guarantee for the 
quality of a product, fraudulent concealment of a deficiency or violation of fundamental 
contractual obligations. The damages for a breach of a substantial contractual obligation 
are, however, limited to the foreseeable damage, typical for the type of contract, except 
in the event of intent or gross negligence or injury to life, body or health. 
The above provisions do not imply a change in the burden of proof to your detriment.
It is not permissible to transfer or copy these library or excerpts thereof without express 
authorization from the author.
*******************************************************************************************/


/*jslint nomen: true, plusplus: true, continue: true*/
/*global document: false, alert: false, clearTimeout: false, setTimeout: false,
window: false, DOMParser: false, ActiveXObject: false, XMLHttpRequest: false */


/* Using namespaces (see /patterns12/ page 210) */
/*var libByMichael = libByMichael || {};
libByMichael.canvasControls = libByMichael.canvasControls || {};
libByMichael.canvasControls.internal = libByMichael.canvasControls.internal || {};*/


/*******************************************************************************************
    Module with some basic helpers for javascript
    Note:   Uses the revealing module pattern 
            (see /patterns12/ The Revealing Module Pattern)
*******************************************************************************************/
var jsHelpers = (function () {
    "use strict";
	
	/***************************************************************************************
        Add support for 'trim' for IE8 and earlier
	***************************************************************************************/
	if (typeof String.prototype.trim !== 'function') {
		String.prototype.trim = function() {
			return this.replace(/^\s+|\s+$/g, '');
		};
	}
	
    /***************************************************************************************
        Small helper to create a deep copy of an object
        Based on: http://stackoverflow.com/questions/728360/copying-an-object-in-javascript
    ***************************************************************************************/
    function clone(objToClone) {
        /* Handle the 3 simple types, and null or undefined */
        if (null === objToClone || "object" !== typeof objToClone) {
            return objToClone;
        }

        var copy, index, indexMax, attr;

        /* Handle Date */
        if (objToClone instanceof Date) {
            copy = new Date();
            copy.setTime(objToClone.getTime());
            return copy;
        }

        /* Handle Array */
        if (objToClone instanceof Array) {
            copy = [];
            indexMax = objToClone.length;
            for (index = 0; index < indexMax; index++) {
                copy[index] = clone(objToClone[index]);
            }
            return copy;
        }

        /* Handle Object */
        if (objToClone instanceof Object) {
            copy = {};
            for (attr in objToClone) {
                if (objToClone.hasOwnProperty(attr)) {
                    copy[attr] = clone(objToClone[attr]);
                }
            }
            return copy;
        }

        alert("Unable to copy object! Its type isn't supported.");
        return null;
    }


    /***************************************************************************************
       Check whether the passed variable is null or undefined
    ***************************************************************************************/
    function isNullOrUndefined(variableToTest) {
        if ((null === variableToTest) || (undefined === variableToTest)) {
            return true;
        }
        return false;
    }


    /***************************************************************************************
            Finally return the public functions of this module
    ***************************************************************************************/
    return {
        clone: clone,
        isNullOrUndefined: isNullOrUndefined
    };
}());


/*******************************************************************************************
    Module with some basic helpers for the canvas element
    Note:   Uses the revealing module pattern 
            (see /patterns12/ The Revealing Module Pattern)
*******************************************************************************************/
var moduleCanvasHelpers = (function () {
    "use strict";

    var canvasIsSupported = null;

    /***************************************************************************************
        Small helper to find out whether the browser supports canvas with 2d context
    ***************************************************************************************/
    function isCanvasSupported() {
        if (null !== canvasIsSupported) {
            return canvasIsSupported;
        }

        var canvas = document.createElement('canvas');
        if ((!canvas.getContext) || (!canvas.getContext('2d'))) {
            canvasIsSupported = false;
            return false;
        }

        canvasIsSupported = true;
        return true;
    }


    /***************************************************************************************
            Finally return the public functions of this module
    ***************************************************************************************/
    return {
        isCanvasSupported: isCanvasSupported
    };
}());


/*******************************************************************************************
    Module handling all the internal actions and data for the canvas controls
    Note:   Uses the revealing module pattern 
            (see /patterns12/: The Revealing Module Pattern)
*******************************************************************************************/
var canvasControlsInternal = (function () {
    "use strict";
    /***************************************************************************************
        Private module variables
    ***************************************************************************************/
    var LINE_COLOR = "rgb(50,50,50)",       /* Default line color for canvas elements */
        FONT_COLOR = "rgb(50,50,50)",       /* Default font color for canvas elements */
        SECTION_TYPE_NORMAL = 0,            /* Type for a normal colored section */
        SECTION_TYPE_WARNING = 1,           /* Type for a warning colored section */
        SECTION_TYPE_CRITICAL = 2;          /* Type for a critical colored section */

    /***************************************************************************************
        Private class definitions for classes that are required in the private methods
    ***************************************************************************************/
    /*******************************************************************************************
        Data of a sub section like warning, critical, ...
    *******************************************************************************************/
    function SectionData() {
        this.startValue = 0;
        this.endValue = 0;
        this.color = "rgb(120,120,120)";
        this.enabled = true;
        this.width = 1;
    }


    /***************************************************************************************
        Private module methods
    ***************************************************************************************/
    /***************************************************************************************
        Get a colored section (e.g. warning or critical)
    ***************************************************************************************/
    function getSection(startValue, endValue, sectionType) {
        var section;

        section = new SectionData();
        if ((!section) || jsHelpers.isNullOrUndefined(startValue) || jsHelpers.isNullOrUndefined(endValue)) {
            return null;
        }

        switch (sectionType) {
        case SECTION_TYPE_NORMAL:
            section.color = "rgb(0, 180, 0)";
            break;
        case SECTION_TYPE_WARNING:
            section.color = "rgb(238, 118, 33)";
            break;
        case SECTION_TYPE_CRITICAL:
            section.color = "rgb(205, 0, 0)";
            break;
        default:
            section.color = sectionType;
        }

        section.startValue = startValue;
        section.endValue = endValue;
        return section;
    }


    /***************************************************************************************
        Get the number of fixed digits to display e.g. in a label
    ***************************************************************************************/
    function getNumberOfFixedDigits(startValue, endValue) {
        var maxAbsValue = Math.max(Math.abs(startValue), Math.abs(endValue));
        if (maxAbsValue > 50) {
            return 0;
        }
        if (maxAbsValue > 5) {
            return 1;
        }
        if (maxAbsValue > 0.5) {
            return 2;
        }

        return 3;
    }


    /***************************************************************************************
        Get a number with the specified amount of decimal digits 
    ***************************************************************************************/
    function getFixedNumber(number, fixedDigits) {
        if ((0 >= fixedDigits) || (0 === number)) {
            return Math.round(number);
        }

        var roundingFactor, correctlyRoundedNumber;
        roundingFactor = Math.pow(10, fixedDigits);
        correctlyRoundedNumber = Math.round(number * roundingFactor) / roundingFactor;
        return correctlyRoundedNumber.toFixed(fixedDigits);
    }


    /***************************************************************************************
        Private class definitions for classes that are not required in the private methods
    ***************************************************************************************/
    /*******************************************************************************************
        Base class for all canvas controls
    *******************************************************************************************/
    function CanvasControl() {
        this._supportsSetValue = false;
        this._canvas = null;
        this._data = null;
        this._currentValue = NaN;
        this._setValue = NaN;
    }

    /***************************************************************************************
        Does the control the handling of a set value?
    ***************************************************************************************/
    CanvasControl.prototype.supportsSetValue = function () {
        return this._supportsSetValue;
    };


    /***************************************************************************************
        Set the background color of the canvas
    ***************************************************************************************/
    CanvasControl.prototype.setCanvasBackgroundColor = function (backgroundColor) {
        if (!this._canvas) {
            return;
        }
        this._canvas.backgroundColor = backgroundColor;
    };


    /***************************************************************************************
        Get the id of the canvas control (= id of the canvas element itself)
    ***************************************************************************************/
    CanvasControl.prototype.getId = function () {
        if (!this._canvas) {
            return null;
        }
        var id = this._canvas.getId();
        return id;
    };


    /***************************************************************************************
       Add a colored section to the canvasa control (e.g. a warning section)
       This function has to be overwritten by the child if the control supports 
       colored sections
    ***************************************************************************************/
    CanvasControl.prototype.addColoredSection = function (startValue, endValue, sectionType) {
        alert("The selected canvas control does not support adding colored sections. " +
                "The routine was called with the following parameters: " +
                "Start value: " + startValue + "; end value: " + endValue +
                "; section type: " + sectionType);
    };


    /***************************************************************************************
        Add the three default colored sections for the canvas control
    ***************************************************************************************/
    CanvasControl.prototype.addDefaultColoredSections = function (startValueNormal, endValueNormal,
                                                                    endValueWarning, endValueCritical) {
        this.addColoredSection(startValueNormal, endValueNormal, SECTION_TYPE_NORMAL);
        this.addColoredSection(endValueNormal, endValueWarning, SECTION_TYPE_WARNING);
        this.addColoredSection(endValueWarning, endValueCritical, SECTION_TYPE_CRITICAL);
    };


    /***************************************************************************************
       Get the current value of the control
    ***************************************************************************************/
    CanvasControl.prototype.getCurrentValue = function () {
        return this._currentValue;
    };


    /***************************************************************************************
       Get the set value of the control
    ***************************************************************************************/
    CanvasControl.prototype.getSetValue = function () {
        if (false === this._supportsSetValue) {
            alert("Error: Set values are NOT supported for the selected control!");
        }
        return this._setValue;
    };


    /*******************************************************************************************
        Data of an arc
    *******************************************************************************************/
    function ArcData() {
        this.counterClockwise = false;
        this.radius = 10;
        this.startAngle = 0.9 * Math.PI;
        this.endAngle = -0.1 * Math.PI;
        this.lineWidth = 1;
        this.lineColor = LINE_COLOR;
        this.centerX = 0;
        this.centerY = 0;
        this.fill = false;
        this.gradientStartColor = "rgba(240,240,240,1)";
        this.gradientEndColor = "rgba(100,100,100,1)";
    }


    /*******************************************************************************************
        Data of a line
    *******************************************************************************************/
    function LineData() {
        this.startX = 0;
        this.startY = 0;
        this.endX = 10;
        this.endY = 10;
        this.width = 1;
        this.color = LINE_COLOR;
        this.length = 0;    /* optional value to store the length of the line */
    }


    /*******************************************************************************************
        Data for a font
    *******************************************************************************************/
    function FontData() {
        this.size = 10;
        this.color = FONT_COLOR;
        this.style = 'normal';
        this.name = 'Times New Roman';
        this.textAlign = 'center';
        this.textBaseline = 'middle';
    }

    /***************************************************************************************
        Get the font as one expression
    ***************************************************************************************/
    FontData.prototype.getFont = function () {
        var fontExpression = this.style + " " + this.size + "pt " + this.name;
        return fontExpression;
    };


    /*******************************************************************************************
        Data for a label
    *******************************************************************************************/
    function LabelData() {
        this.text = "";
        this.positionX = 20;
        this.positionY = 10;
        this.doBaselineMiddleCorrectionForNumbersAndCapitalLetters = true;
        this.font = new FontData();
        if (!this.font) {
            alert("Internal error: Unable to init LabelData");
            return;
        }
    }

    /***************************************************************************************
        Do a correction for the center of the y coordinates (use for numbers and characters 
        with 'normal' height)
    ***************************************************************************************/
    LabelData.prototype.applyCorrectedCenterYForTextWithNumbersAndCapitalLetters =
        function (canvas) {
            if ((!canvas) || (!this.font)) {
                return;
            }

            this.positionY =
                canvas.getCorrectedCenterYForTextWithNumbersAndCapitalLetters(this.positionY, this.font);
        };

    /*******************************************************************************************
        Data for a rectangle with rounded corners
    *******************************************************************************************/
    function RoundedRectCenteredData() {
        this.centerX = 10;
        this.centerY = 10;
        this.width = 30;
        this.height = 20;
        this.cornerRadius = 5;
        this.fillStyle = null;
        this.lineWidth = 1;
        this.lineColor = LINE_COLOR;
    }

    /*******************************************************************************************
        Data for a normal rectangle
    *******************************************************************************************/
    function RectData() {
        this.top = 10;
        this.left = 10;
        this.height = 20;
        this.width = 30;
        this.gradientStartColor = "white";
        this.gradientEndColor = "white";
        this.fill = false;
        this.lineWidth = 1;
        this.lineColor = LINE_COLOR;
    }

    /*******************************************************************************************
        Data for an arrow
    *******************************************************************************************/
    function ArrowData() {
        this.centerX = 30;
        this.centerY = 20;
        this.height = 40;
        this.width = 15;
        this.rotationAngle = 0; // Angle of the rotation in radiants
        this.ratioWidthToShaft = 1.7;
        this.ratioHeightToShaft = 1.3;
        this.gradientStartColor = "white";
        this.gradientEndColor = "white";
        this.fill = false;
        this.lineWidth = 1;
        this.lineColor = LINE_COLOR;
    }

    /*******************************************************************************************
        Data for a rounded rectangle with a text inside
    *******************************************************************************************/
    function ValueDisplayData() {
        this.roundedRect = new RoundedRectCenteredData();
        this.label = new LabelData();

        if ((!this.roundedRect) || (!this.label)) {
            alert("Internal error: Unable to init ValueDisplayData");
            return;
        }
    }


    /*******************************************************************************************
        Data for a pointer
    *******************************************************************************************/
    function PointerData() {
        this.angle = Math.PI / 2;
        this.width = 8;
        this.Lenght = 50;
        this.lineWidth = 1;
        this.lineColor = LINE_COLOR;
        this.gradientColor = 'white';
    }


    /*******************************************************************************************
        Data of the scale of a control
    *******************************************************************************************/
    function ScaleData() {
        /* Major divisions */
        this.majorDivisions = 5;
        this.majorLine = new LineData();
        if (!this.majorLine) {
            alert("Internal error: Unable to init ScaleData");
            return;
        }

        this.majorLabel = new LabelData();
        if (!this.majorLabel) {
            alert("Internal error: Unable to init ScaleData");
            return;
        }

        /* Minor divisions */
        this.minorDivisionsPerMajor = 2;
        this.minorLine = new LineData();
        if (!this.minorLine) {
            alert("Internal error: Unable to init ScaleData");
            return;
        }
    }

    /*******************************************************************************************
        Data of the display of a bar control
    *******************************************************************************************/
    function BarDisplayData() {
        this.top = 15;
        this.left = 15;
        this.height = 60;
        this.width = 40;
        this.minValue = 0;
        this.maxValue = 100;
        this.positionMinValueY = 60;
        this.positionMaxValueY = 20;
        this.coloredSections = null;
        this.distanceOuterEdge = 1;
        this.innerRight = this.left + this.width - this.distanceOuterEdge;
    }


    /***************************************************************************************
            Get the y positon of the provided value
        ***************************************************************************************/
    BarDisplayData.prototype.getPositionY = function (value) {
        var valuePart,
            OFFSET_BAR_OUT_OF_RANGE = (this.positionMinValueY - this.positionMaxValueY) / 30;

        if (value < this.minValue) {
            return this.positionMinValueY + OFFSET_BAR_OUT_OF_RANGE;
        }
        if (value > this.maxValue) {
            return this.positionMaxValueY - OFFSET_BAR_OUT_OF_RANGE;
        }

        valuePart = (this.positionMaxValueY - this.positionMinValueY) / (this.maxValue - this.minValue) * (value - this.minValue);
        return this.positionMinValueY + valuePart;
    };


    /*******************************************************************************************
        Data of the dial of a gauge
    *******************************************************************************************/
    function DialData() {
        this.centerX = 15;
        this.centerY = 15;
        this.minValue = 0;
        this.maxValue = 100;
        this.startAngle = 0.75 * Math.PI;
        this.endAngle = 2.25 * Math.PI;
        this.radiusOuterArc = 10;
        this.radiusInnerArc = 10;
        this.majorDivisions = 5;
        this.coloredSections = null;
    }


    /***************************************************************************************
        Get the angle [in rad] on the dial for the provided value
    ***************************************************************************************/
    DialData.prototype.getAngle = function (value) {
        var OFFSET_ANGLE_OUT_OF_RANGE = 5 * Math.PI / 180,
            valuePart,
            angle;

        if (value < this.minValue) {
            return this.startAngle - OFFSET_ANGLE_OUT_OF_RANGE;
        }
        if (value > this.maxValue) {
            return this.endAngle + OFFSET_ANGLE_OUT_OF_RANGE;
        }

        valuePart = (value - this.minValue) / (this.maxValue - this.minValue);
        if (this.endAngle > this.startAngle) {
            angle = (this.endAngle - this.startAngle) * valuePart + this.startAngle;
        } else {
            angle = (this.startAngle - this.endAngle) * valuePart + this.endAngle;
        }
        return angle;
    };


    /*******************************************************************************************
        Some canvas extensions
    *******************************************************************************************/
    function CanvasEx(canvasId, relativeOffsetFromMiddleX, relativeOffsetFromMiddleY) {
        this._id = canvasId;
        var canvasObject = document.getElementById(this._id);
        if (!canvasObject) {
            alert("Error: Unable to get the specified canvas element: '" + this._id + "' !");
            return;
        }
        this.context = canvasObject.getContext('2d');
        if (!this.context) {
            alert("Error: Unable to get a 2D-context of the canvas element of your browser!");
            return;
        }

        this.width = canvasObject.width;
        this.height = canvasObject.height;
        this.centerX = this.width / 2 + (this.width / 2 * relativeOffsetFromMiddleX);
        this.centerY = this.height / 2 + (this.height / 2 * relativeOffsetFromMiddleY);
        this.shortestSide = Math.min(this.width, this.height);
        this.backgroundColor = 'rgba(255, 255, 255, 0.0)';  /* Fully transparent */
    }


    /***************************************************************************************
        Get a corrected y position for the vertical center position for different fonts:
        If textBaseline is set to 'middle' and the text contains numbers and capital letters
        only, the text is not placed at the center of the numbers. 
        Moreover different browsers use different middle baselines. 
        This routine tries to make it better and have the same output for all browsers.
        Notes:
            1.  The correction offset is different for different fonts and this 
                routine handles only some fonts. For the remaining fonts, an assumumption 
                is done. 
            2.  In addition to the y correction returned by this routine, the callee has to
                change the textBaseline from 'middle' to 'alphabetic' when drawing the text
    ***************************************************************************************/
    CanvasEx.prototype._getCorrectedCenterYForTextWithNumbersAndCapitalLetters = function (oldCenterYPosition,
            fontData) {
        if (!fontData) {
            return 0;
        }

        var correctionFactorY,
            correctedCenterYPosition;

        if (fontData.textBaseline !== "middle") {
            return oldCenterYPosition;
        }

        if (fontData.name.indexOf("Times") > -1) {
            correctionFactorY = 0.88;
        } else if (fontData.name.indexOf("Arial") > -1) {
            correctionFactorY = 0.96;
        } else if (fontData.name.indexOf("Verdana") > -1) {
            correctionFactorY = 0.98;
        } else if (fontData.name.indexOf("Tahoma") > -1) {
            correctionFactorY = 0.98;
        } else if (fontData.name.indexOf("Trebuchet MS") > -1) {
            correctionFactorY = 0.96;
        } else if (fontData.name.indexOf("Calibri") > -1) {
            correctionFactorY = 0.86;
        } else {
            correctionFactorY = 0.92;
        }

        correctedCenterYPosition = oldCenterYPosition + fontData.size / 2 * correctionFactorY;
        return correctedCenterYPosition;
    };


    /***************************************************************************************
        Get the x-coordinate for a given radius and angle 
    ***************************************************************************************/
    CanvasEx.prototype.getX = function (radius, angle) {
        var x = Math.cos(angle) * radius + this.centerX;
        return x;
    };


    /***************************************************************************************
        Get the y-coordinate for a given radius and angle 
    ***************************************************************************************/
    CanvasEx.prototype.getY = function (radius, angle) {
        var y = Math.sin(angle) * radius + this.centerY;
        return y;
    };


    /***************************************************************************************
        Draw an arc with the provided data
    ***************************************************************************************/
    CanvasEx.prototype.drawArc = function (arcData) {
        if (!arcData) {
            return;
        }
        var gradient;

        this.context.beginPath();
        this.context.arc(arcData.centerX, arcData.centerY,
                        arcData.radius, arcData.startAngle,
                        arcData.endAngle, arcData.counterClockwise);
        this.context.lineWidth = arcData.lineWidth;
        this.context.strokeStyle = arcData.lineColor;


        if (arcData.fill === true) {
            gradient = this.context.createRadialGradient(arcData.centerX, arcData.centerY, 0,
                                                        arcData.centerX, arcData.centerY, arcData.radius);
            gradient.addColorStop(0, arcData.gradientStartColor);
            gradient.addColorStop(1, arcData.gradientEndColor);
            this.context.fillStyle = gradient;
            this.context.fill();
        }

        this.context.stroke();
    };


    /***************************************************************************************
        Draw a line with the provided data
    ***************************************************************************************/
    CanvasEx.prototype.drawLine = function (lineData) {
        if (!lineData) {
            return;
        }

        this.context.beginPath();
        this.context.moveTo(lineData.startX, lineData.startY);
        this.context.lineTo(lineData.endX, lineData.endY);
        this.context.lineWidth = lineData.width;
        this.context.strokeStyle = lineData.color;
        this.context.stroke();
    };


    /***************************************************************************************
        Draw any label
    ***************************************************************************************/
    CanvasEx.prototype.drawLabel = function (labelData) {
        if (!labelData) {
            return;
        }

        var positionY;
        if (true === labelData.doBaselineMiddleCorrectionForNumbersAndCapitalLetters) {
            positionY = this._getCorrectedCenterYForTextWithNumbersAndCapitalLetters(labelData.positionY, labelData.font);
            this.context.textBaseline = "alphabetic";
        } else {
            positionY = labelData.positionY;
            this.context.textBaseline = labelData.font.textBaseline;
        }

        this.context.font = labelData.font.getFont();
        this.context.fillStyle = labelData.font.color;
        this.context.textAlign = labelData.font.textAlign;
        this.context.fillText(labelData.text, labelData.positionX, positionY);
    };


    /***************************************************************************************
        Get the width of the text of a label
    ***************************************************************************************/
    CanvasEx.prototype.getLabelWidth = function (labelData) {
        if ((!labelData) || (!this.context)) {
            return 0;
        }

        var metrics;
        this.context.font = labelData.font.getFont();
        metrics = this.context.measureText(labelData.text);
        return metrics.width;
    };


    /***************************************************************************************
        Draw a rounded rect
    ***************************************************************************************/
    CanvasEx.prototype.drawRoundedRectCentered = function (rRectCenteredData) {
        if (!rRectCenteredData) {
            return;
        }

        var topY, bottomY, leftX, rightX, radius;
        topY = rRectCenteredData.centerY - rRectCenteredData.height / 2;
        bottomY = rRectCenteredData.centerY + rRectCenteredData.height / 2;
        leftX = rRectCenteredData.centerX - rRectCenteredData.width / 2;
        rightX = rRectCenteredData.centerX + rRectCenteredData.width / 2;
        radius = rRectCenteredData.cornerRadius;

        this.context.beginPath();
        this.context.moveTo(leftX, topY + radius);
        this.context.arcTo(leftX, topY, leftX + radius, topY, radius);
        this.context.lineTo(rightX - radius, topY);
        this.context.arcTo(rightX, topY, rightX, topY + radius, radius);
        this.context.lineTo(rightX, bottomY - radius);
        this.context.arcTo(rightX, bottomY, rightX - radius, bottomY, radius);
        this.context.lineTo(leftX + radius, bottomY);
        this.context.arcTo(leftX, bottomY, leftX, bottomY - radius, radius);
        this.context.closePath();

        if (null !== rRectCenteredData.fillStyle) {
            this.context.fillStyle = rRectCenteredData.fillStyle;
            this.context.fill();
        }
        if (rRectCenteredData.lineWidth > 0) {
            this.context.lineWidth = rRectCenteredData.lineWidth;
            this.context.strokeStyle = rRectCenteredData.lineColor;
            this.context.stroke();
        }
    };


    /***************************************************************************************
        Draw a rectangle
    ***************************************************************************************/
    CanvasEx.prototype.drawRect = function (rectData) {
        if (!rectData) {
            return;
        }

        if (true === rectData.fill) {
            if (rectData.gradientStartColor === rectData.gradientEndColor) {
                this.context.fillStyle = rectData.gradientEndColor;
                this.context.fill();
            } else {
                var gradient = this.context.createLinearGradient(rectData.left, rectData.top, 0, rectData.top + rectData.height);
                gradient.addColorStop(0, rectData.gradientStartColor);
                gradient.addColorStop(1, rectData.gradientEndColor);
                this.context.fillStyle = gradient;
                this.context.fillRect(rectData.left, rectData.top, rectData.width, rectData.height);
            }
        }

        if (rectData.lineWidth > 0) {
            this.context.beginPath();
            this.context.rect(rectData.left, rectData.top, rectData.width, rectData.height);
            this.context.lineWidth = rectData.lineWidth;
            this.context.strokeStyle = rectData.lineColor;
            this.context.stroke();
        }
    };


    /***************************************************************************************
        Draw an arrow
    ***************************************************************************************/
    CanvasEx.prototype.drawArrow = function (arrowData) {
        if (!arrowData) {
            return;
        }

        var widthShaft, heightShaft, gradient;
        widthShaft = arrowData.width / arrowData.ratioWidthToShaft;
        heightShaft = arrowData.height / arrowData.ratioHeightToShaft;

        this.context.save();
        this.context.translate(arrowData.centerX, arrowData.centerY);
        this.context.rotate(arrowData.rotationAngle);
        this.context.beginPath();
        this.context.moveTo(widthShaft / -2, arrowData.height / 2);
        this.context.lineTo(widthShaft / -2, arrowData.height / 2 - heightShaft);
        this.context.lineTo(arrowData.width / -2, arrowData.height / 2 - heightShaft);
        this.context.lineTo(0, arrowData.height / -2);
        this.context.lineTo(arrowData.width / 2, arrowData.height / 2 - heightShaft);
        this.context.lineTo(widthShaft / 2, arrowData.height / 2 - heightShaft);
        this.context.lineTo(widthShaft / 2, arrowData.height / 2);
        this.context.closePath();

        if (true === arrowData.fill) {
            if (arrowData.gradientStartColor === arrowData.gradientEndColor) {
                this.context.fillStyle = arrowData.gradientEndColor;
                this.context.fill();
            } else {
                gradient = this.context.createLinearGradient(0, arrowData.height / -2, 0, arrowData.height / 2);
                gradient.addColorStop(0, arrowData.gradientStartColor);
                gradient.addColorStop(1, arrowData.gradientEndColor);
                this.context.fillStyle = gradient;
                this.context.fill();
            }
        }

        if (arrowData.lineWidth > 0) {
            this.context.lineWidth = arrowData.lineWidth;
            this.context.strokeStyle = arrowData.lineColor;
            this.context.stroke();
        }

        this.context.restore();
    };


    /***************************************************************************************
        Fill the canvas with the provided background color 
    ***************************************************************************************/
    CanvasEx.prototype.clear = function () {
        this.context.fillStyle = this.backgroundColor;
        this.context.fillRect(0, 0, this.width, this.height);
    };

    /***************************************************************************************
        Get the ID (in the html file) of the canvas element 
    ***************************************************************************************/
    CanvasEx.prototype.getId = function () {
        return this._id;
    };


    /*******************************************************************************************
      Data for the bar control (An extra class for the data is used to keep a better overview)
    *******************************************************************************************/
    function BarControlData(canvas, startValue, endValue, title, subTitle) {
        if (!canvas) {
            alert("Canvas is invalid: " + canvas);
            return;
        }
        if (jsHelpers.isNullOrUndefined(startValue) || jsHelpers.isNullOrUndefined(endValue)) {
            alert("Start or end value is invalid: " + startValue + "; " + endValue);
            return;
        }

        this._canvas = canvas;
        this.DISTANCE_FROM_CANVAS_BORDER = 6 + this.getScaledSize(2);
        this.DISTANCE_FROM_CANVAS_BORDER_TOP = 3;
        this.BACKGROUND_LINE_WIDTH = 1 + this.getScaledSize(0.3);


        /* Data for the title */
        this.title = new LabelData();
        if (!this.title) {
            alert("Internal error: Unable to init BarControlData");
            return;
        }
        this.title.text = title;
        this.title.font.size = 7 + this.getScaledSize(1.8);
        this.title.font.style = "bold";
        this.title.positionX = this._canvas.centerX;
        this.title.positionY = this.title.font.size * 0.5 + this.DISTANCE_FROM_CANVAS_BORDER_TOP;


        /* Data for the bar display (part 1/2)*/
        this.barDisplay = new BarDisplayData();
        if (!this.barDisplay) {
            alert("Internal error: Unable to init BarControlData");
            return;
        }
        this.barDisplay.minValue = startValue;
        this.barDisplay.maxValue = endValue;


        /* Data for the scale (part 1/2)*/
        this.scale = new ScaleData();
        if (!this.scale) {
            alert("Internal error: Unable to init BarControlData");
            return;
        }
        this.scale.majorDivisions = 5;
        if (this._canvas.height <= 180) {
            this.scale.majorDivisions = 3;
        }
        this.scale.minorDivisionsPerMajor = 3;
        this.scale.majorLabel.font.size = 7 + this.getScaledSize(1.8);
        this.scale.majorLabel.text = startValue;
        this.scale.majorLabel.font.textAlign = "left";
        this.scale.majorLabel.positionX = this._canvas.width - this.DISTANCE_FROM_CANVAS_BORDER - this._maxWidthMajorLabel(this.scale.majorLabel,
                                                        this.scale.majorDivisions);


        /* Data for the bar display (part 2/2)*/
        this.barDisplay.top = this.title.positionY + this.DISTANCE_FROM_CANVAS_BORDER * 0.7 + this.title.font.size / 2;
        this.barDisplay.left = this.DISTANCE_FROM_CANVAS_BORDER;
        this.barDisplay.width = this.scale.majorLabel.positionX - this.DISTANCE_FROM_CANVAS_BORDER - 3.5 - this.getScaledSize(0.8);
        this.barDisplay.height = this._canvas.height - this.barDisplay.top - this.DISTANCE_FROM_CANVAS_BORDER_TOP * 1.2;
        this.barDisplay.positionMinValueY = this.barDisplay.top + this.barDisplay.height - (5 + this.getScaledSize(5));
        this.barDisplay.positionMaxValueY = this.barDisplay.top + (5 + this.getScaledSize(5));
        this.barDisplay.distanceOuterEdge = this.BACKGROUND_LINE_WIDTH * 3.5;
        this.barDisplay.innerRight = this.barDisplay.left + this.barDisplay.width - this.barDisplay.distanceOuterEdge / 2;


        /* Data for the scale (part 2/2) */
        this.scale.majorLine.width = 1 + this.getScaledSize(1);
        this.scale.majorLine.length = 3 + this.getScaledSize(3);
        this.scale.majorLine.endX = this.barDisplay.innerRight;
        this.scale.majorLine.startX = this.scale.majorLine.endX - this.scale.majorLine.length;
        this.scale.minorLine.width = this.scale.majorLine.width / 2;
        this.scale.minorLine.endX = this.scale.majorLine.endX;
        this.scale.minorLine.startX = this.scale.minorLine.endX - 0.75 * this.scale.majorLine.length;


        /* Data for the background */
        this.background = new RectData();
        if (!this.background) {
            alert("Internal error: Unable to init BarControlData");
            return;
        }
        this.background.top = this.barDisplay.top;
        this.background.left = this.barDisplay.left;
        this.background.height = this.barDisplay.height;
        this.background.width = this.barDisplay.width;
        this.background.gradientStartColor = "rgba(220, 220, 220, 0.3)";
        this.background.gradientEndColor = "rgba(220, 220, 220, 0.6)";
        this.background.fill = true;
        this.background.lineColor = "rgb(100, 100, 100)";
        this.background.lineWidth = this.BACKGROUND_LINE_WIDTH;


        /* Data for the subtitle (e.g. the unit label) */
        this.subTitle = new LabelData();
        if (!this.subTitle) {
            alert("Internal error: Unable to init BarControlData");
            return;
        }
        this.subTitle.text = subTitle;
        this.subTitle.font.size = this.scale.majorLabel.font.size * 0.9;
        this.subTitle.positionX = ((this._canvas.width - this.DISTANCE_FROM_CANVAS_BORDER) - this.scale.majorLabel.positionX) / 2 + this.scale.majorLabel.positionX;
        this.subTitle.positionY = this.barDisplay.top + this.barDisplay.height / 2;
        this.subTitle.font.color = "rgb(80, 80, 80)";


        /* Data for the bar for displaying the current value */
        this.bar = new RectData();
        if (!this.bar) {
            alert("Internal error: Unable to init BarControlData");
            return;
        }
        this.bar.left = this.barDisplay.left + this.barDisplay.distanceOuterEdge;
        this.bar.width = this.barDisplay.innerRight - this.scale.majorLine.length - this.barDisplay.distanceOuterEdge - this.bar.left;
        this.bar.lineWidth = 0.9 + this.getScaledSize(0.4);
        this.bar.lineColor = "rgba(16,78,139, 1)";
        this.bar.fill = true;
        this.bar.gradientStartColor = this.bar.lineColor;
        this.bar.gradientEndColor = "rgba(16,78,139, 0.4)";

        /* Data for the arrow if the value is out of range */
        this.arrowOutOfRange = new ArrowData();
        if (!this.arrowOutOfRange) {
            alert("Internal error: Unable to init BarControlData");
            return;
        }
        this.arrowOutOfRange.centerX = this.bar.left + this.bar.width / 2;
        this.arrowOutOfRange.width = this.bar.width;
        this.arrowOutOfRange.height = Math.min(this.barDisplay.height * 0.75, this.arrowOutOfRange.width * 2.5);
        this.arrowOutOfRange.lineColor = "rgb(205, 0, 0)";
        this.arrowOutOfRange.lineWidth = this.bar.lineWidth;
        this.arrowOutOfRange.fill = true;
        this.arrowOutOfRange.gradientStartColor = this.arrowOutOfRange.lineColor;
        this.arrowOutOfRange.gradientEndColor = "rgba(205, 0, 0, 0.4)";

        this.isInitialized = true;
    }


    /***************************************************************************************
        Get the maximal width of a major label
    ***************************************************************************************/
    BarControlData.prototype._maxWidthMajorLabel = function (majorLabel, majorSegmentsCount) {
        var widthCurrentValue,
            maxWidth,
            labelsIndex,
            differenceBetweenTwoLabels,
            value,
            startValue = this.barDisplay.minValue,
            endValue = this.barDisplay.maxValue,
            fixedDigits = getNumberOfFixedDigits(startValue, endValue);

        if (majorSegmentsCount <= 0) {
            majorLabel.text = startValue;
            maxWidth = this._canvas.getLabelWidth(majorLabel);
        } else {
            differenceBetweenTwoLabels = (endValue - startValue) / majorSegmentsCount;
            maxWidth = 0;
            for (labelsIndex = 0; labelsIndex <= majorSegmentsCount; labelsIndex++) {
                value = startValue + labelsIndex * differenceBetweenTwoLabels;
                majorLabel.text = getFixedNumber(value, fixedDigits);
                widthCurrentValue = this._canvas.getLabelWidth(majorLabel);
                maxWidth = Math.max(widthCurrentValue, maxWidth);
            }
        }

        return maxWidth;
    };


    /***************************************************************************************
           Get a scaled size of a element based on the size of the canvas
       ***************************************************************************************/
    BarControlData.prototype.getScaledSize = function (sizeAt50ptCanvas) {
        return sizeAt50ptCanvas / 50 * this._canvas.width;
    };


    /***************************************************************************************
        Add a colored section for the dial (e.g. a warning section)
    ***************************************************************************************/
    BarControlData.prototype.addColoredSection = function (startValue, endValue, sectionType) {
        var section = getSection(startValue, endValue, sectionType),
            sectionLine = new LineData();

        if ((!section) || (!sectionLine)) {
            return null;
        }

        sectionLine.width = 1.5 + this.getScaledSize(1);
        sectionLine.color = section.color;
        sectionLine.startY = this.barDisplay.getPositionY(startValue);
        sectionLine.endY = this.barDisplay.getPositionY(endValue);
        sectionLine.startX = this.barDisplay.innerRight - sectionLine.width / 2;
        sectionLine.endX = sectionLine.startX;

        if (!this.barDisplay.coloredSections) {
            this.barDisplay.coloredSections = [sectionLine];
            return sectionLine;
        }

        this.barDisplay.coloredSections.push(sectionLine);
        return sectionLine;
    };


    /*******************************************************************************************
        A bar control using the canvas element
    *******************************************************************************************/
    function BarControl(canvasId, startValue, endValue, title, subTitle) {
        this._canvas = new CanvasEx(canvasId, 0, 0);
        this._data = new BarControlData(this._canvas, startValue, endValue, title, subTitle);
    }


    /*******************************************************************************************
        Do the inheritance from CanvasControl
    *******************************************************************************************/
    BarControl.prototype = new CanvasControl(); /* Inherit from CanvasControl class */
    BarControl.prototype.constructor = BarControl; /* Use the BarControl constructor */


    /***************************************************************************************
        Check whether the required variables are valid
    ***************************************************************************************/
    BarControl.prototype._isInitialized = function () {
        if ((!this._canvas) || (!this._data) || (!this._data.isInitialized) ||
                (false === this._data.isInitialized)) {
            alert("Bar object has not been initialized properly: Canvas:" + this._canvas + "; Data: " + this._data);
            return false;
        }

        return true;
    };

    /***************************************************************************************
        Draw the bar
    ***************************************************************************************/
    BarControl.prototype._drawBar = function (currentValue) {
        if (jsHelpers.isNullOrUndefined(currentValue)) {
            return;
        }

        if (currentValue < this._data.barDisplay.minValue) {
            if (!this._data.arrowOutOfRange) {
                return;
            }
            this._data.arrowOutOfRange.centerY = this._data.barDisplay.getPositionY(this._data.barDisplay.minValue) - this._data.arrowOutOfRange.height * 0.45;
            this._data.arrowOutOfRange.rotationAngle = Math.PI / -1;
            this._canvas.drawArrow(this._data.arrowOutOfRange);
            return;
        }

        if (currentValue > this._data.barDisplay.maxValue) {
            if (!this._data.arrowOutOfRange) {
                return;
            }
            this._data.arrowOutOfRange.centerY = this._data.barDisplay.getPositionY(this._data.barDisplay.maxValue) + this._data.arrowOutOfRange.height * 0.45;
            this._data.arrowOutOfRange.rotationAngle = 0;
            this._canvas.drawArrow(this._data.arrowOutOfRange);
            return;
        }

        var bottom = this._data.barDisplay.top + this._data.barDisplay.height - this._data.background.lineWidth / 2,
            top = this._data.barDisplay.getPositionY(currentValue),
            rectFill;

        // Draw the lines
        this._canvas.context.beginPath();
        this._canvas.context.moveTo(this._data.bar.left, bottom);
        this._canvas.context.lineTo(this._data.bar.left, top);
        this._canvas.context.lineTo(this._data.bar.left + this._data.bar.width, top);
        this._canvas.context.lineTo(this._data.bar.left + this._data.bar.width, bottom);
        this._canvas.context.lineWidth = this._data.bar.lineWidth;
        this._canvas.context.strokeStyle = this._data.bar.lineColor;

        this._canvas.context.shadowColor = "rgba(0,0,0,0.5)";
        this._canvas.context.shadowBlur = 3 + this._data.getScaledSize(1);
        this._canvas.context.shadowOffsetX = 1;
        this._canvas.context.shadowOffsetY = 1;

        this._canvas.context.stroke();


        // Draw the background
        rectFill = new RectData();
        if (!rectFill) {
            return;
        }

        rectFill.left = this._data.bar.left + this._data.bar.lineWidth / 2;
        rectFill.width = this._data.bar.width - this._data.bar.lineWidth;
        rectFill.top = top + this._data.bar.lineWidth / 2;
        rectFill.height = bottom - rectFill.top;
        rectFill.fill = this._data.bar.fill;
        rectFill.gradientStartColor = this._data.bar.gradientStartColor;
        rectFill.gradientEndColor = this._data.bar.gradientEndColor;
        rectFill.lineWidth = 0;
        this._canvas.drawRect(rectFill);
    };

    /***************************************************************************************
        Draw the major and minor divisons of the bar display and the major labels
    ***************************************************************************************/
    BarControl.prototype._drawScale = function () {
        if (!this._data.scale) {
            return;
        }

        var offsetBetweenMajorDivisions = (this._data.barDisplay.positionMaxValueY - this._data.barDisplay.positionMinValueY) / this._data.scale.majorDivisions,
            valueBetweenMajorDivisions = (this._data.barDisplay.maxValue - this._data.barDisplay.minValue) / this._data.scale.majorDivisions,
            majorDivision,
            majorPosition,
            majorValue,
            fixedDigits = getNumberOfFixedDigits(this._data.barDisplay.minValue, this._data.barDisplay.maxValue),
            offsetBetweenMinorDivisions,
            valueBetweenMinorDivisions,
            minorDivision,
            minorPosition;

        if (this._data.scale.minorDivisionsPerMajor > 1) {
            offsetBetweenMinorDivisions = offsetBetweenMajorDivisions / this._data.scale.minorDivisionsPerMajor;
            valueBetweenMinorDivisions = valueBetweenMajorDivisions / this._data.scale.minorDivisionsPerMajor;
        }

        majorPosition = this._data.barDisplay.positionMinValueY;
        majorValue = this._data.barDisplay.minValue;
        for (majorDivision = 0; majorDivision <= this._data.scale.majorDivisions; majorDivision++) {
            this._data.scale.majorLine.startY = majorPosition;
            this._data.scale.majorLine.endY = majorPosition;
            this._canvas.drawLine(this._data.scale.majorLine);

            this._data.scale.majorLabel.text = getFixedNumber(majorValue, fixedDigits);
            this._data.scale.majorLabel.positionY = majorPosition;
            this._canvas.drawLabel(this._data.scale.majorLabel);

            if (majorDivision < this._data.scale.majorDivisions) {
                for (minorDivision = 1; minorDivision < this._data.scale.minorDivisionsPerMajor; minorDivision++) {
                    minorPosition = majorPosition + offsetBetweenMinorDivisions * minorDivision;
                    this._data.scale.minorLine.startY = minorPosition;
                    this._data.scale.minorLine.endY = minorPosition;
                    this._canvas.drawLine(this._data.scale.minorLine);
                }
            }

            if (majorDivision === this._data.scale.majorDivision) {
                majorPosition = this._data.barDisplay.positionMaxValueY;
                majorValue = this._data.barDisplay.maxValue;
            } else {
                majorPosition = majorPosition + offsetBetweenMajorDivisions;
                majorValue = majorValue + valueBetweenMajorDivisions;
            }
        }
    };

    /***************************************************************************************
        Draw sections of the bar
    ***************************************************************************************/
    BarControl.prototype._drawBarSections = function () {
        if (!this._data.barDisplay.coloredSections) {
            return;
        }
        var sectionIndex,
            sectionIndexMax = this._data.barDisplay.coloredSections.length;

        for (sectionIndex = 0; sectionIndex < sectionIndexMax; sectionIndex++) {
            this._canvas.drawLine(this._data.barDisplay.coloredSections[sectionIndex]);
        }
    };


    /***************************************************************************************
        Add a colored section for the dial (e.g. a warning section)
    ***************************************************************************************/
    BarControl.prototype.addColoredSection = function (startValue, endValue, sectionType) {
        if (false === this._isInitialized()) {
            return null;
        }

        return this._data.addColoredSection(startValue, endValue, sectionType);
    };


    /***************************************************************************************
        Main function to refresh / redraw the bar
    ***************************************************************************************/
    BarControl.prototype.refresh = function (currentValue) {
        if (false === this._isInitialized()) {
            return;
        }

        this._currentValue = currentValue;
        this._canvas.clear();
        this._canvas.drawRect(this._data.background);
        this._drawScale();
        this._drawBarSections();
        this._canvas.drawLabel(this._data.title);
        this._canvas.drawLabel(this._data.subTitle);
        this._drawBar(currentValue);
    };


    /*******************************************************************************************
        Data of a gauge control
    *******************************************************************************************/
    function GaugeControlData(canvas, startValue, endValue, titleText, subTitleText) {
        if (!canvas) {
            alert("Canvas is invalid: " + canvas);
            return;
        }
        if (jsHelpers.isNullOrUndefined(startValue) || jsHelpers.isNullOrUndefined(endValue)) {
            alert("Start or end value is invalid: " + startValue + "; " + endValue);
            return;
        }

        this._canvas = canvas;

        /* Data for the dial */
        this.dial = new DialData();
        if (!this.dial) {
            alert("Internal error: Unable to init GaugeControlData");
            return;
        }
        this.dial.minValue = startValue;
        this.dial.maxValue = endValue;
        this.dial.counterClockwise = true;
        this.dial.radiusOuterArc = this.getScaledSize(48);
        this.dial.centerX = this._canvas.centerX;
        this.dial.centerY = this._canvas.centerY;

        /* Data for the background */
        this.background = new ArcData();
        if (!this.background) {
            alert("Internal error: Unable to init GaugeControlData");
            return;
        }
        this.background.centerX = this.dial.centerX;
        this.background.centerY = this.dial.centerY;
        this.background.gradientStartColor = "rgba(220, 220, 220, 0.6)";
        this.background.gradientEndColor = "rgba(220, 220, 220, 1)";
        this.background.fill = true;
        this.background.startAngle = 0;
        this.background.endAngle = 2 * Math.PI;
        this.background.lineColor = "rgb(100, 100, 100)";
        this.background.lineWidth = 1 + this.getScaledSize(0.3);
        this.background.radius = this.dial.radiusOuterArc - this.background.lineWidth / 2;

        this.dial.radiusInnerArc = this.dial.radiusOuterArc - this.background.lineWidth * 1.5;

        /* Data for the scale */
        this.scale = new ScaleData();
        if (!this.scale) {
            alert("Internal error: Unable to init GaugeControlData");
            return;
        }
        this.scale.majorDivisions = 5;
        this.scale.minorDivisionsPerMajor = 3;
        this.scale.majorLabel.font.size = 6 + this.getScaledSize(2.2);
        this.scale.majorLine.width = 1 + this.getScaledSize(1);
        this.scale.majorLine.length = 3 + this.getScaledSize(3);
        this.scale.minorLine.width = this.scale.majorLine.width / 2;
        this.scale.minorLine.length = this.scale.majorLine.length * 0.75;

        /* Data for the center arc */
        this.centerArc = new ArcData();
        if (!this.centerArc) {
            alert("Internal error: Unable to init GaugeControlData");
            return;
        }
        this.centerArc.radius = this.getScaledSize(5);
        this.centerArc.startAngle = 0;
        this.centerArc.endAngle = 2 * Math.PI;
        this.centerArc.lineWidth = 1;
        this.centerArc.lineColor = "rgb(50,50,50)";
        this.centerArc.centerX = this._canvas.centerX;
        this.centerArc.centerY = this._canvas.centerY;
        this.centerArc.gradientStartColor = "rgba(200,200,200,1)";
        this.centerArc.gradientEndColor = "rgba(100,100,100,1)";
        this.centerArc.fill = true;

        /* Data for the current value pointer */
        this.valuePointer = new PointerData();
        if (!this.valuePointer) {
            alert("Internal error: Unable to init GaugeControlData");
            return;
        }
        this.valuePointer.width = this.getScaledSize(6);
        this.valuePointer.length = this.dial.radiusInnerArc - this.scale.majorLine.length - this.getScaledSize(2);
        this.valuePointer.lineWidth = 0.9 + this.getScaledSize(0.4);
        this.valuePointer.lineColor = "rgba(16,78,139, 1)";
        this.valuePointer.gradientColor = "rgba(16,78,139, 0.4)";

        /* Data for the set value pointer */
        this.setValuePointer = new PointerData();
        if (!this.setValuePointer) {
            alert("Internal error: Unable to init GaugeControlData");
            return;
        }
        this.setValuePointer.width = this.getScaledSize(3);
        this.setValuePointer.length = this.valuePointer.length + this.scale.majorLine.length * 0.7;
        this.setValuePointer.lineColor = "rgba(255, 0, 0, 1)";
        this.setValuePointer.gradientColor = "rgba(255, 0, 0, 0.4)";

        /* Data for the title */
        this.title = new LabelData();
        if (!this.title) {
            alert("Internal error: Unable to init GaugeControlData");
            return;
        }
        this.title.text = titleText;
        this.title.font.size = 6 + this.getScaledSize(2);
        this.title.font.style = "bold";
        this.title.positionX = this._canvas.centerX;
        if (this.getScaledSize(100) < 200) {
            // The gauge i very small => the major ticks labels may overlap with the title
            this.title.positionY = this._canvas.centerY - this.dial.radiusInnerArc * (0.15 + this.getScaledSize(0.18));
        } else {
            this.title.positionY = this._canvas.centerY - this.dial.radiusInnerArc * 0.5;
        }


        /* Data for the subtitel (e.g. the unit label) */
        this.subTitle = new LabelData();
        if (!this.subTitle) {
            alert("Internal error: Unable to init GaugeControlData");
            return;
        }
        this.subTitle.text = subTitleText;
        this.subTitle.font.size = 6 + this.getScaledSize(1);
        this.subTitle.positionX = this._canvas.centerX;
        this.subTitle.positionY = this._canvas.centerY + this.dial.radiusInnerArc * 0.35;


        /* Data for the diplay of the current value */
        this.valueDisplay = new ValueDisplayData();
        if (!this.valueDisplay) {
            alert("Internal error: Unable to init GaugeControlData");
            return;
        }
        this.valueDisplay.label.font.size = 5 + this.getScaledSize(2.5);
        this.valueDisplay.label.font.style = "bold";
        this.valueDisplay.label.font.color = "white";
        this.valueDisplay.label.positionX = this.dial.centerX;
        this.valueDisplay.label.positionY = this.dial.centerY + 0.75 * this.dial.radiusInnerArc;
        this.valueDisplay.roundedRect.width = 5 * this.valueDisplay.label.font.size;
        this.valueDisplay.roundedRect.height = this.valueDisplay.label.font.size + 4 + this.getScaledSize(2.5);
        this.valueDisplay.roundedRect.centerX = this.valueDisplay.label.positionX;
        this.valueDisplay.roundedRect.centerY = this.valueDisplay.label.positionY;
        this.valueDisplay.roundedRect.cornerRadius = 2 + this.getScaledSize(1);
        this.valueDisplay.roundedRect.fillStyle = "rgba(50, 50, 50, 0.8)";

        this.isInitialized = true;
    }


    /***************************************************************************************
        Get a scaled size of a element based on the size of the this._canvas
    ***************************************************************************************/
    GaugeControlData.prototype.getScaledSize = function (sizeAt100ptCanvas) {
        return sizeAt100ptCanvas / 100 * this._canvas.shortestSide;
    };


    /***************************************************************************************
       Add a colored section for the dial (e.g. a warning section)
    ***************************************************************************************/
    GaugeControlData.prototype.addColoredSection = function (startValue, endValue, sectionType) {
        var section = getSection(startValue, endValue, sectionType);
        if (!section) {
            return null;
        }

        section.width = 1 + this.getScaledSize(1);

        if (!this.dial.coloredSections) {
            this.dial.coloredSections = [section];
            return section;
        }

        this.dial.coloredSections.push(section);
        return section;
    };


    /*******************************************************************************************
        A gauge control using the canvas element
    *******************************************************************************************/
    function GaugeControl(canvasId, startValue, endValue, title, subTitle) {
        this._canvas = new CanvasEx(canvasId, 0, 0);
        this._data = new GaugeControlData(this._canvas, startValue, endValue, title, subTitle);
        this._supportsSetValue = true;
    }


    /*******************************************************************************************
        Do the inheritance from CanvasControl
    *******************************************************************************************/
    GaugeControl.prototype = new CanvasControl(); /* Inherit from CanvasControl class */
    GaugeControl.prototype.constructor = GaugeControl; /* Use the GaugeControl constructor */


    /***************************************************************************************
            Check whether the required variables are valid
    ***************************************************************************************/
    GaugeControl.prototype._isInitialized = function () {
        if ((!this._canvas) || (!this._data) || (!this._data.isInitialized) ||
                (false === this._data.isInitialized)) {
            alert("Gauge object has not been initialized properly: Canvas:" + this._canvas + "; Data: " + this._data);
            return false;
        }

        return true;
    };


    /***************************************************************************************
        Draw a section (e.g. a warning or critical section)
    ***************************************************************************************/
    GaugeControl.prototype._drawDialSection = function (section) {
        if (!section) {
            return;
        }

        var startAngle = this._data.dial.getAngle(section.startValue),
            endAngle = this._data.dial.getAngle(section.endValue),
            radius = this._data.dial.radiusInnerArc - section.width / 2;

        this._canvas.context.beginPath();
        this._canvas.context.arc(this._data.dial.centerX, this._data.dial.centerY,
                        radius, startAngle,
                        endAngle, false);


        this._canvas.context.lineWidth = section.width;
        this._canvas.context.strokeStyle = section.color;

        this._canvas.context.stroke();
    };


    /***************************************************************************************
        Draw sections of the gauge
    ***************************************************************************************/
    GaugeControl.prototype._drawDialSections = function () {
        if (!this._data.dial.coloredSections) {
            return;
        }
        var sectionIndex,
            sectionIndexMax = this._data.dial.coloredSections.length;

        for (sectionIndex = 0; sectionIndex < sectionIndexMax; sectionIndex++) {
            this._drawDialSection(this._data.dial.coloredSections[sectionIndex]);
        }
    };


    /***************************************************************************************
        Draw a division line of the scale
    ***************************************************************************************/
    GaugeControl.prototype._drawDivisionLine = function (lineData, radiusStart, angle) {
        lineData.startX = this._canvas.getX(radiusStart, angle);
        lineData.startY = this._canvas.getY(radiusStart, angle);
        lineData.endX = this._canvas.getX(radiusStart + lineData.length, angle);
        lineData.endY = this._canvas.getY(radiusStart + lineData.length, angle);
        this._canvas.drawLine(lineData);
    };


    /***************************************************************************************
        Draw the label for a major division
    ***************************************************************************************/
    GaugeControl.prototype._drawDivisionLabel = function (radiusStart, angle, label) {
        if (!label) {
            return;
        }

        var width = this._canvas.getLabelWidth(label),
            height = label.font.size,
            distance = Math.sqrt(Math.pow(width / 2 * Math.cos(angle), 2) + Math.pow(height / 2 * Math.sin(angle), 2)),
            offsetFont = label.font.size / 2,
            radiusLabel = radiusStart - distance - offsetFont;

        label.positionX = this._canvas.getX(radiusLabel, angle);
        label.positionY = this._canvas.getY(radiusLabel, angle);
        this._canvas.drawLabel(label);
    };


    /***************************************************************************************
        Draw the major and minor divisons of the dial and the major labels
    ***************************************************************************************/
    GaugeControl.prototype._drawScale = function () {
        var angleBetweenMajorDivisions = (this._data.dial.endAngle - this._data.dial.startAngle) / this._data.scale.majorDivisions,
            valueBetweenMajorDivisions = (this._data.dial.maxValue - this._data.dial.minValue) / this._data.scale.majorDivisions,
            majorDivision,
            majorAngle = this._data.dial.startAngle,
            majorValue = this._data.dial.minValue,
            fixedDigits = getNumberOfFixedDigits(this._data.dial.minValue, this._data.dial.maxValue),
            angleBetweenMinorDivisions,
            valueBetweenMinorDivisions,
            minorDivision,
            minorAngle,
            minorValue;


        if (this._data.scale.minorDivisionsPerMajor > 1) {
            angleBetweenMinorDivisions = angleBetweenMajorDivisions / this._data.scale.minorDivisionsPerMajor;
            valueBetweenMinorDivisions = valueBetweenMajorDivisions / this._data.scale.minorDivisionsPerMajor;
        }


        for (majorDivision = 0; majorDivision <= this._data.scale.majorDivisions; majorDivision++) {
            this._drawDivisionLine(this._data.scale.majorLine, this._data.dial.radiusInnerArc - this._data.scale.majorLine.length, majorAngle);
            this._data.scale.majorLabel.text = getFixedNumber(majorValue, fixedDigits);
            this._drawDivisionLabel(this._data.dial.radiusInnerArc - this._data.scale.majorLine.length, majorAngle, this._data.scale.majorLabel);

            if (majorDivision < this._data.scale.majorDivisions) {
                for (minorDivision = 1; minorDivision < this._data.scale.minorDivisionsPerMajor; minorDivision++) {
                    minorAngle = majorAngle + angleBetweenMinorDivisions * minorDivision;
                    minorValue = majorValue + valueBetweenMinorDivisions * minorDivision;
                    this._drawDivisionLine(this._data.scale.minorLine, this._data.dial.radiusInnerArc - this._data.scale.minorLine.length, minorAngle);
                }
            }

            if (majorDivision === this._data.scale.majorDivision) {
                majorAngle = this._data.dial.endAngle;
                majorValue = this._data.dial.maxValue;
            } else {
                majorAngle = majorAngle + angleBetweenMajorDivisions;
                majorValue = majorValue + valueBetweenMajorDivisions;
            }
        }
    };


    /***************************************************************************************
        Draw a pointer of the gauge
    ***************************************************************************************/
    GaugeControl.prototype._drawPointer = function (pointerData) {
        if (!pointerData) {
            return;
        }

        var startX = pointerData.width / 2,
            startY = 0,
            endX = -1 * startX,
            endY = startY,
            offsetFactorStartTangente = 0.1,
            factorStartTangenteMain = 1 - offsetFactorStartTangente,
            factorStartTangenteBack = 1 + offsetFactorStartTangente,
            tangentePointerBackY = -this._data.getScaledSize(0.3) * pointerData.Lenght,
            gradient;


        this._canvas.context.save();
        this._canvas.context.translate(this._canvas.centerX, this._canvas.centerY);
        this._canvas.context.rotate(pointerData.angle - Math.PI / 2);
        this._canvas.context.beginPath();
        this._canvas.context.moveTo(startX, startY);

        // First side of the main part of the pointer
        this._canvas.context.bezierCurveTo(factorStartTangenteMain * startX, pointerData.length * 0.1,
                                        pointerData.lineWidth / 2, pointerData.length,
                                        0, pointerData.length);

        // Second side of the main part of the pointer
        this._canvas.context.bezierCurveTo(pointerData.lineWidth / -2, pointerData.length,
                                        (1 - offsetFactorStartTangente) * endX, pointerData.length * 0.1,
                                        endX, endY);

        // Back of the pointer
        this._canvas.context.bezierCurveTo(factorStartTangenteBack * endX, tangentePointerBackY,
                                        -1 * factorStartTangenteBack * endX, tangentePointerBackY,
                                        startX, startY);

        this._canvas.context.closePath();

        gradient = this._canvas.context.createLinearGradient(startX, 0, endX, 0);
        gradient.addColorStop(0, pointerData.gradientColor);
        gradient.addColorStop(1, pointerData.lineColor);

        this._canvas.context.fillStyle = gradient;
        this._canvas.context.shadowColor = "rgba(0,0,0,0.5)";
        this._canvas.context.shadowBlur = 3 + this._data.getScaledSize(1);
        this._canvas.context.shadowOffsetX = 1;
        this._canvas.context.shadowOffsetY = 1;
        this._canvas.context.fill();

        this._canvas.context.lineWidth = pointerData.lineWidth;
        this._canvas.context.strokeStyle = pointerData.lineColor;
        this._canvas.context.stroke();

        this._canvas.context.restore();
    };


    /***************************************************************************************
        Draw the pointers for the current value and the set value of the gauge
    ***************************************************************************************/
    GaugeControl.prototype._drawPointers = function (currentValue, setValue) {
        if (false === jsHelpers.isNullOrUndefined(setValue)) {
            this._data.setValuePointer.angle = this._data.dial.getAngle(setValue);
            this._drawPointer(this._data.setValuePointer);
        }

        if (false === jsHelpers.isNullOrUndefined(currentValue)) {
            this._data.valuePointer.angle = this._data.dial.getAngle(currentValue);
            this._drawPointer(this._data.valuePointer);
        }
    };


    /***************************************************************************************
        Draw the value as text
    ***************************************************************************************/
    GaugeControl.prototype._drawValue = function (currentValue) {
        if (jsHelpers.isNullOrUndefined(currentValue) || (!this._data.valueDisplay)) {
            return;
        }

        this._canvas.drawRoundedRectCentered(this._data.valueDisplay.roundedRect, this._canvas);

        var fixedDigits = getNumberOfFixedDigits(this._data.dial.minValue, this._data.dial.maxValue);

        this._data.valueDisplay.label.text = getFixedNumber(currentValue, fixedDigits);
        this._canvas.drawLabel(this._data.valueDisplay.label);
    };


    /***************************************************************************************
       Add a colored section for the dial (e.g. a warning section)
    ***************************************************************************************/
    GaugeControl.prototype.addColoredSection = function (startValue, endValue, sectionType) {
        if (false === this._isInitialized()) {
            return null;
        }


        return this._data.addColoredSection(startValue, endValue, sectionType);
    };


    /***************************************************************************************
        Main function to refresh / redraw the qauge
    ***************************************************************************************/
    GaugeControl.prototype.refresh = function (currentValue, setValue) {
        if (false === this._isInitialized()) {
            return;
        }

        this._currentValue = currentValue;
        this._setValue = setValue;

        this._canvas.clear();
        this._canvas.drawArc(this._data.background);
        this._drawScale();
        this._drawDialSections();
        this._canvas.drawLabel(this._data.title);
        this._canvas.drawLabel(this._data.subTitle);
        this._drawValue(currentValue);
        this._drawPointers(currentValue, setValue);
        this._canvas.drawArc(this._data.centerArc);
    };



    /***************************************************************************************
        Finally return the public functions of this module
    ***************************************************************************************/
    return {
        Bar: BarControl,
        Gauge: GaugeControl
    };
}());


/*******************************************************************************************
    Module providing some canvas controls
    Note:   This module uses the decorator pattern to provide exactly those interface that
            is required by the clients (see /patterns12/: The Decorator Pattern)
             => Data that is not required is hidden and cannot be manipulated accidently
                by the client
*******************************************************************************************/
var canvasControls = (function () {
    "use strict";
    /*******************************************************************************************
        A gauge control using the canvas element
    *******************************************************************************************/
    function GaugeControlDecorator(canvasId, startValue, endValue, title, subTitle) {
        var gauge = new canvasControlsInternal.Gauge(canvasId, startValue, endValue, title, subTitle);


        /***************************************************************************************
            Add a colored section for the dial (e.g. a warning section)
        ***************************************************************************************/
        this.addColoredSection = function (startValue, endValue, sectionType) {
            if (gauge) {
                gauge.addColoredSection(startValue, endValue, sectionType);
            }
        };


        /***************************************************************************************
          Set the background color of the canvas
        ***************************************************************************************/
        this.setCanvasBackgroundColor = function (backgroundColor) {
            if (gauge) {
                gauge.setCanvasBackgroundColor(backgroundColor);
            }
        };


        /***************************************************************************************
            Does the control the handling of a set value?
        ***************************************************************************************/
        this.supportsSetValue = function () {
            if (gauge) {
                return gauge.supportsSetValue();
            }

            return false;
        };


        /***************************************************************************************
            Get the current value of the control
        ***************************************************************************************/
        this.getCurrentValue = function () {
            if (gauge) {
                return gauge.getCurrentValue();
            }
            return null;
        };


        /***************************************************************************************
            Get the set value of the control
        ***************************************************************************************/
        this.getSetValue = function () {
            if (gauge) {
                return gauge.getSetValue();
            }
            return null;
        };


        /***************************************************************************************
            Get the id of the control (= id of the canvas element itself)
        ***************************************************************************************/
        this.getId = function () {
            if (gauge) {
                return gauge.getId();
            }
            return null;
        };


        /***************************************************************************************
            Add the three default colored sections for the gauge control
        ***************************************************************************************/
        this.addDefaultColoredSections = function (startValueNormal, endValueNormal,
                                                        endValueWarning, endValueCritical) {
            if (gauge) {
                gauge.addDefaultColoredSections(startValueNormal, endValueNormal, endValueWarning, endValueCritical);
            }
        };


        /***************************************************************************************
            Main function to refresh / redraw the qauge
        ***************************************************************************************/
        this.refresh = function (currentValue, setValue) {
            if (gauge) {
                gauge.refresh(currentValue, setValue);
            }
        };
    }


    /*******************************************************************************************
        A bar control using the canvas element
    *******************************************************************************************/
    function BarControlDecorator(canvasId, startValue, endValue, title, subTitle) {
        var bar = new canvasControlsInternal.Bar(canvasId, startValue, endValue, title, subTitle);

        /***************************************************************************************
            Add a colored section for the dial (e.g. a warning section)
        ***************************************************************************************/
        this.addColoredSection = function (startValue, endValue, sectionType) {
            if (bar) {
                bar.addColoredSection(startValue, endValue, sectionType);
            }
        };


        /***************************************************************************************
          Set the background color of the canvas
        ***************************************************************************************/
        this.setCanvasBackgroundColor = function (backgroundColor) {
            if (bar) {
                bar.setCanvasBackgroundColor(backgroundColor);
            }
        };


        /***************************************************************************************
            Does the control the handling of a set value?
        ***************************************************************************************/
        this.supportsSetValue = function () {
            if (bar) {
                return bar.supportsSetValue();
            }

            return false;
        };


        /***************************************************************************************
            Get the current value of the control
        ***************************************************************************************/
        this.getCurrentValue = function () {
            if (bar) {
                return bar.getCurrentValue();
            }

            return null;
        };


        /***************************************************************************************
            Get the set value of the control
        ***************************************************************************************/
        this.getSetValue = function () {
            if (bar) {
                return bar.getSetValue();
            }

            return null;
        };


        /***************************************************************************************
            Get the id of the control (= id of the canvas element itself)
        ***************************************************************************************/
        this.getId = function () {
            if (bar) {
                return bar.getId();
            }

            return null;
        };


        /***************************************************************************************
            Add the three default colored sections for the gauge control
        ***************************************************************************************/
        this.addDefaultColoredSections = function (startValueNormal, endValueNormal,
                                                        endValueWarning, endValueCritical) {
            if (bar) {
                bar.addDefaultColoredSections(startValueNormal, endValueNormal, endValueWarning, endValueCritical);
            }
        };


        /***************************************************************************************
            Main function to refresh / redraw the bar
        ***************************************************************************************/
        this.refresh = function (currentValue) {
            if (bar) {
                bar.refresh(currentValue);
            }
        };
    }


    /***************************************************************************************
        Finally return the public functions of this module
    ***************************************************************************************/
    return {
        Bar: BarControlDecorator,
        Gauge: GaugeControlDecorator
    };
}());


/*******************************************************************************************
    Module with some basic helpers for accessing / manipulating the object model of html/xml
    Note:   Uses the revealing module pattern 
            (see /patterns12/ The Revealing Module Pattern)
*******************************************************************************************/
var moduleDomHelpers = (function () {
    "use strict";
    var xmlParserSupportsTextProperty = null,
        browserSupportsDomParser = null;

    /*******************************************************************************************
        Get the first child of the provided node that belongs to the provided class
    *******************************************************************************************/
    function getFirstChildNodeOfClass(parentNode, className) {
        if ((!parentNode) || (!className)) {
            return null;
        }

        var childNodes = parentNode.childNodes,
            indexChilds,
            indexChildsMax;

        if (!childNodes) {
            return null;
        }

        indexChildsMax = childNodes.length;
        for (indexChilds = 0; indexChilds < indexChildsMax; indexChilds++) {
            if (!childNodes[indexChilds].className) {
                continue;
            }

            if (childNodes[indexChilds].className === className) {
                return childNodes[indexChilds];
            }
        }

        return null;
    }


    /*******************************************************************************************
        Get the first child of the provided node that has the provided name
    *******************************************************************************************/
    function getFirstChildNodeOfName(parentNode, nodeName) {
        var childNodes = parentNode.childNodes,
            indexChilds,
            indexChildsMax;

        if (!childNodes) {
            return null;
        }

        indexChildsMax = childNodes.length;
        for (indexChilds = 0; indexChilds < indexChildsMax; indexChilds++) {
            if (childNodes[indexChilds].nodeName === nodeName) {
                return childNodes[indexChilds];
            }
        }

        return null;
    }


    /*******************************************************************************************
       Get the value of an xml-node depending on the browser
    *******************************************************************************************/
    function getValueOfXmlNode(node) {
        if (!node) {
            return null;
        }

        if (null === xmlParserSupportsTextProperty) {
            if (undefined === node.text) {
                xmlParserSupportsTextProperty = false;
                return node.textContent;
            }

            xmlParserSupportsTextProperty = true;
            return node.text;
        }

        if (true === xmlParserSupportsTextProperty) {
            return node.text;
        }

        return node.textContent;
    }

    /*******************************************************************************************
       Get the document for a provided iframe-id
    *******************************************************************************************/
    function getIFrameDocument(containingWindow, iFrameName) {
        if ((!containingWindow) || jsHelpers.isNullOrUndefined(iFrameName) || (iFrameName.length < 1)) {
            return null;
        }

        var indexFrame,
            indexFrameMax = containingWindow.frames.length;

        if (indexFrameMax < 1) {
            return 0;
        }

        for (indexFrame = 0; indexFrame < indexFrameMax; indexFrame++) {
            if (containingWindow.frames[indexFrame].name === iFrameName) {
                return containingWindow.frames[indexFrame].document;
            }
        }

        return null;
    }


    /***************************************************************************************
        Get a node by its id and inform the user if an error occured
    ***************************************************************************************/
    function getDestinationNodeById(destDocument, destId) {
        if (jsHelpers.isNullOrUndefined(destId) || ("" === destId)) {
            alert("Destination ID is null or empty !");
            return null;
        }

        if (!destDocument) {
            alert("Destination document is null or undefined !");
            return null;
        }

        var destNode = destDocument.getElementById(destId);
        if (!destNode) {
            alert("ID: \'" + destId + "\' not found in the provided document ('" + document.title + "') to update !");
            return null;
        }

        return destNode;
    }


    /***************************************************************************************
        Get an xml document for the provided valid xml text
    ***************************************************************************************/
    function getXmlDocumentFromXmlText(xmlText) {
        var xmlDocument,
            xmlParser = null;

        if ((true === browserSupportsDomParser) || ((null === browserSupportsDomParser) && (window.DOMParser))) {
            xmlParser = new DOMParser();
            if (!xmlParser) {
                alert("Unable to access the xml-parser of your browser!");
                return null;
            }
            xmlDocument = xmlParser.parseFromString(xmlText, 'text/xml');
            browserSupportsDomParser = true;
        } else { /* xml-parser for older versions of Internet Explorer */
            xmlDocument = new ActiveXObject("Microsoft.XMLDOM");
            if (!xmlDocument) {
                alert("Unable to access xml-parser (Microsoft.XMLDOM) of your browser!");
                return null;
            }

            xmlDocument.async = false;
            xmlDocument.loadXML(xmlText);
            browserSupportsDomParser = false;
        }

        if (!xmlDocument) {
            alert("The requested xml-document could not be processed correctly!\n\n" + xmlText);
            return null;
        }

        return xmlDocument;
    }


    /***************************************************************************************
        Get the value of the desired URL-parameter
        Returns 'undefined' if the parameter in not found
    ***************************************************************************************/
    function getValueOfUrlParameter(parameterName, alertIfParameterValueIsMissing, parameterNameInAlert, sampleValueInAlert) {
        var PARAMS_SEPARATOR = '&',
            PARAM_NAME_VALUE_SEPARATOR = '=',
            INDEX_PARAM_NAME = 0,
            INDEX_PARAM_VALUE = 1,
            paramsIndex,
            paramsCount,
            paramName,
            paramValue,
            paramPair,
            urlParams,
            urlQueryString = window.location.search.substring(1);
            

        function paramValueIsMissing () {
            var paramNameInAlert,
                sampleValue;
                
            if (alertIfParameterValueIsMissing) {
                if (parameterNameInAlert) {
                    paramNameInAlert = parameterNameInAlert;
                } else {
                    paramNameInAlert = parameterName;
                }
                
                if (sampleValueInAlert) {
                   sampleValue = sampleValueInAlert;
                } else {
                    sampleValue = "parameterValue";
                }
                
                
                alert ("The URL-parameter for the '" + paramNameInAlert + 
                    "' is missing.\n\n" + 
                    "If this parameter is the only URL-parameter, please add it at the end of the URL like for example: ?" +
                    parameterName + "=" + sampleValue + "\n\n" + 
                    "Otherwise, please add it for example after the other URL-parameters " +
                    "at the end of the URL, like for example: &" + parameterName + "=" + sampleValue);
            }
            
            return undefined;
        }
        
        
        if (urlQueryString.length < 1) {
            return paramValueIsMissing();
        }
        
        urlParams = urlQueryString.split(PARAMS_SEPARATOR);
        paramsCount = urlParams.length;
        
        for (paramsIndex = 0; paramsIndex < paramsCount; paramsIndex++) {
            paramPair = urlParams[paramsIndex].split(PARAM_NAME_VALUE_SEPARATOR);
            if ((paramPair.length < 1) || (paramPair.length > 2)) {
                continue;
            }
            
            paramName = decodeURIComponent(paramPair[INDEX_PARAM_NAME]);
            if (paramName === parameterName) {
                if (paramPair.length === 1) {
                    if (alertIfParameterValueIsMissing) {
                        return paramValueIsMissing();
                    }
                    paramValue = "";
                } else {
                   paramValue = decodeURIComponent(paramPair[INDEX_PARAM_VALUE]);
                }
                return paramValue;
            }
        }
        
        return paramValueIsMissing();
    }

    /***************************************************************************************
        Finally return the public functions of this module
    ***************************************************************************************/
    return {
        getFirstChildNodeOfClass: getFirstChildNodeOfClass,
        getValueOfXmlNode: getValueOfXmlNode,
        getFirstChildNodeOfName: getFirstChildNodeOfName,
        getIFrameDocument: getIFrameDocument,
        getDestinationNodeById: getDestinationNodeById,
        getXmlDocumentFromXmlText: getXmlDocumentFromXmlText,
        getValueOfUrlParameter: getValueOfUrlParameter
    };
}());



/*******************************************************************************************
    Module handling all the actions that are required for updating the values of
    a webpages that follows the rules of the sample web-page (see application example)
    Note:   Uses the revealing module pattern 
            (see /patterns12/: The Revealing Module Pattern)
*******************************************************************************************/
var updateDocument = (function () {
    "use strict";

    /*******************************************************************************************
         Factory class to create an xml-http request object depending on the browser used. 
         A Singleton is used so that we can remember the browser
 
         Note:   Uses the Singleton and Factory pattern 
                 (see /patterns12/: The Singleton Pattern
                  see /patterns12/: The Factory Pattern)
     *******************************************************************************************/
    var XmlHttpRequestFactorySingleton = (function () {
        var instance;   /* Instance that stores a reference to the Singleton */

        /***************************************************************************************
            Definition of the xml-http request factory class
        ***************************************************************************************/
        function init() {
            var BROWSER_NOT_DETECTED = 0,
                BROWSER_SUPPORTS_XML_HTTP_REQUEST = 1,
                BROWSER_SUPPORTS_MSXML2 = 2,
                browserType = -1,
                xmlHttpRequest;

            /***************************************************************************************
                Create an xml-http request and return the created object 
            ***************************************************************************************/
            function createNewXmlHttpRequest() {
                switch (browserType) {
                case BROWSER_SUPPORTS_XML_HTTP_REQUEST:
                    return new XMLHttpRequest();
                case BROWSER_SUPPORTS_MSXML2:
                    return new ActiveXObject("MSXML2.XMLHTTP.3.0");
                case BROWSER_NOT_DETECTED:
                    return null;
                default:
                    if (window.XMLHttpRequest) {
                        xmlHttpRequest = new window.XMLHttpRequest();
                        browserType = BROWSER_SUPPORTS_XML_HTTP_REQUEST;
                        return xmlHttpRequest;
                    }

                    /* Support versions prior to IE 7.0 (see http://msdn.microsoft.com/en-us/library/ie/ms535874%28v=vs.85%29.aspx) */
                    try {
                        xmlHttpRequest = new ActiveXObject("MSXML2.XMLHTTP.3.0");
                        browserType = BROWSER_SUPPORTS_MSXML2;
                        return xmlHttpRequest;
                    } catch (ex) {
                        alert("Error: Updating variables is not supported, because your browser does not support xmlHttp requests. Please update your browser.");
                        return null;
                    }
                }
                return null;
            }


            /***************************************************************************************
                Return the public routines
            ***************************************************************************************/
            return {
                createNewXmlHttpRequest: createNewXmlHttpRequest
            };
        }


        /***************************************************************************************
                Get the Singleton instance if one exists or create one if it does not exist
        ***************************************************************************************/
        function getInstance() {
            if (!instance) {
                instance = init();
                if (!instance) {
                    alert("Error: Unable to create an instance for the XMLHttpFactory. Please restart your browser!");
                }
            }

            return instance;
        }


        /***************************************************************************************
                Enable the direct usage of the routine to create an xml-http request object
        ***************************************************************************************/
        function createNewXmlHttpRequest() {
            var myInstance = getInstance();

            if (!myInstance) {
                return null;
            }

            return instance.createNewXmlHttpRequest();
        }


        return {
            getInstance: getInstance,
            createNewXmlHttpRequest: createNewXmlHttpRequest
        };
    }());


    /*******************************************************************************************
        XmlHttp request wrapper class
    *******************************************************************************************/
    function XmlHttpRequestWrapper() {
        this._request = null;
    }


    /***************************************************************************************
        Load the specified xml-document from the server
        Note: 
            The callback function to be executed after the loading the updated document 
            needs the following function definition:
            functionName (responseText)

            The callback function to be executed if any error occured
            needs the following function definition:
            functionName (errorStatus)
    ***************************************************************************************/
    XmlHttpRequestWrapper.prototype.loadXmlDocument = function (urlOfXmlDocument,
            callbackFunctionToReceiveTextResult, callbackFunctionForErrors, requestType) {

        if (!urlOfXmlDocument) {
            alert("Please provide a valid url for the xml-document to load from the server!");
            return false;
        }

        if (!callbackFunctionToReceiveTextResult) {
            alert("Please specify a callback function for receiving the result to be loaded from the server!");
            return false;
        }

        if (!callbackFunctionForErrors) {
            alert("Please specify a callback function for the case if any error occured!");
            return false;
        }

        var RESPONSE_COMPLETE = 4,
            STATUS_OK = 200,
            REQUEST_TIMEOUT = 60 * 1000,   /* One minute should not be harmful */
            request = XmlHttpRequestFactorySingleton.createNewXmlHttpRequest(),
            requestTimer;

        this._request = request;
        request.onreadystatechange = function () {
            // alert("request.readyState: " + request.readyState + "; request.status: " + request.status);
            if (RESPONSE_COMPLETE === request.readyState) {
                clearTimeout(requestTimer);
                if (STATUS_OK === request.status) {
                    callbackFunctionToReceiveTextResult(request.responseText);
                } else {
                    callbackFunctionForErrors(request.statusText);
                }
            }
        };

        if ((requestType !== 'GET') && (requestType !== 'POST')) {
            alert('Error: Invalid type for XmlHttpRequest: ' + requestType);
            return false;
        }

        request.open(requestType, urlOfXmlDocument, true);
        /* request.setRequestHeader("Pragma", "no-cache"); */
        /* request.setRequestHeader("Cache-Control", "must-revalidate"); */
        /* request.setRequestHeader("If-Modified-Since", document.lastModified);*/

        request.setRequestHeader("Cache-Control", "no-cache");
        request.setRequestHeader("If-Modified-Since", "Sat, 01 Jan 2005 00:00:00 GMT"); /* Required to disable caching in IE7 */

        requestTimer = setTimeout(function() {
            request.abort();
            alert("Error: The requested update from the server exceeded a timeout of 1 minute and will be aborted!");
        }, REQUEST_TIMEOUT);

        request.send('');

        return true;
    };


    /***************************************************************************************
        Abort the current request
    ***************************************************************************************/
    XmlHttpRequestWrapper.prototype.abort = function () {
        if (this._request) {
            try {
                this._request.abort();
            } catch (ex) {
            }
        }
    };


    /*******************************************************************************************
        Class to handle the update of the web-page
        This class does not use any synchronization mechanisms like mutexes and uses asynchronous
        calls. Thus the callee has to take care that he only starts a new update request if the
        old request has been finished.

        A Singleton is used because of the restricted webserver ressources of the drive 

        Note:   Uses the Singleton pattern 
                (see /patterns12/: The Singleton Pattern)
    *******************************************************************************************/
    var WebPageUpdaterSingleton = (function () {
        var instance;   /* Instance that stores a reference to the Singleton */

        /***************************************************************************************
            Definition of the webPageUpdater class
        ***************************************************************************************/
        function init() {
            /* "Constants" */
            var PLAIN_TEXT_VARIABLES_ID = "plainTextVariables",
                NUMERIC_VARIABLES_ID = "numericVariables",
                INDICATOR_VARIABLES_ID = "indicatorVariables",
                INPUT_FIELD_VARIABLES_ID = "inputFieldVariables",
                GAUGE_VARIABLES_ID = "gaugeVariables",
                BAR_VARIABLES_ID = "barVariables",
                VALUE_CLASS = "value",
                CANVAS_CONTROL_VALUE_NODE_NAME = "value",
                CANVAS_CONTROL_SET_VALUE_NODE_NAME = "setValue",
                LIMIT_WARNING_CLASS = "warningLimit",
                LIMIT_CRITICAL_CLASS = "criticalLimit",
                CLASS_ENDING_CRITICAL = "Critical",
                CLASS_ENDING_WARNING = "Warning",
                /* TEXT_NODE_TYPE = 3,          *//* Text node */
                /* COMMENT_NODE_TYPE = 8,       *//* Comment node */
                VARIABLE_NODE_TYPE = 1,     /* Node with a variable */
                /* TEXT_NODE_TEXT = '#text',*/
                /* COMMENT_NODE_TEXT = '#comment',*/
                ROOT_NODE_NAME = "root",
                VERSIONS_NODE_NAME = "versions",
                VARIABLES_NODE_NAME = "variables",

            /* Private members */
                canvasControlsToUpdate = null;

            /***************************************************************************************
               Get the base of the css-class for coloring warnings, and criticals  
            ***************************************************************************************/
            function getBaseNameOfClass(className) {
                var baseName = className.replace(/Critical\b/, ""); /* replace only at tail */
                baseName = baseName.replace(/Warning\b/, "");

                return baseName;
            }


            /***************************************************************************************
                Update the values of a text node
            ***************************************************************************************/
            function updateTextNodeClass(nodeToUpdate, currentValue) {
                var criticalNode = moduleDomHelpers.getFirstChildNodeOfClass(nodeToUpdate, LIMIT_CRITICAL_CLASS),
                    limit,
                    className = nodeToUpdate.className,
                    classBasename,
                    warningNode;

                if (criticalNode) {
                    limit = Number(criticalNode.innerHTML);
                    if (currentValue >= limit) {
                        if (null === className.match(/Critical\b/)) {
                            classBasename = getBaseNameOfClass(className);
                            nodeToUpdate.className = classBasename + CLASS_ENDING_CRITICAL;
                        }
                        return;
                    }
                }

                warningNode = moduleDomHelpers.getFirstChildNodeOfClass(nodeToUpdate, LIMIT_WARNING_CLASS);
                if (warningNode) {
                    limit = Number(warningNode.innerHTML);
                    if (currentValue >= limit) {
                        if (null === className.match(/Warning\b/)) {
                            classBasename = getBaseNameOfClass(className);
                            nodeToUpdate.className = classBasename + CLASS_ENDING_WARNING;
                        }
                        return;
                    }
                }

                classBasename = getBaseNameOfClass(className);
                if (className !== classBasename) {
                    nodeToUpdate.className = classBasename;
                }
            }


            /***************************************************************************************
                Check whether the provided node needs to be updated and initiate the update if 
                required
            ***************************************************************************************/
            function updateTextNode(nodeToUpdate, currentValue) {
                var valueNode = moduleDomHelpers.getFirstChildNodeOfClass(nodeToUpdate, VALUE_CLASS),
                    oldValue;
                if (!valueNode) {
                    alert("Did not find sub-node '" + VALUE_CLASS + "' under node with ID: " + nodeToUpdate.id + " !");
                    return;
                }

                oldValue = valueNode.innerHTML;
                if (oldValue === currentValue) {
                    return;
                }

                valueNode.innerHTML = currentValue;
                updateTextNodeClass(nodeToUpdate, Number(currentValue));
            }


            /***************************************************************************************
                Check whether the provided plain text node needs to be updated and initiate the 
                update if required
            ***************************************************************************************/
            function updatePlainTextNode(nodeToUpdate, currentValue) {
                var oldValue = nodeToUpdate.innerHTML;
                if (oldValue === currentValue) {
                    return;
                }

                nodeToUpdate.innerHTML = currentValue;
            }

            /***************************************************************************************
                Check whether the provided input field node needs to be updated and initiate the 
                update if required
            ***************************************************************************************/
            function updateInputFieldNode(nodeToUpdate, currentValue) {
                var oldValue = nodeToUpdate.value;
                if (oldValue === currentValue) {
                    return;
                }

                nodeToUpdate.value = currentValue;
            }

            /***************************************************************************************
                Update the values of a canvas control
            ***************************************************************************************/
            function updateCanvasControl(canvasControlId, srcCanvasControlNode) {
                if ((!canvasControlsToUpdate) || (canvasControlsToUpdate.length < 1) ||
                        jsHelpers.isNullOrUndefined(canvasControlId) || (!srcCanvasControlNode)) {
                    alert("Error: A control (e.g. gauge or bar) could not be updated: " + canvasControlId);
                    return;
                }

                var canvasControlsIndexMax = canvasControlsToUpdate.length,
                    canvasControl,
                    currentValueNode = moduleDomHelpers.getFirstChildNodeOfName(srcCanvasControlNode, CANVAS_CONTROL_VALUE_NODE_NAME),
                    currentSetValueNode = moduleDomHelpers.getFirstChildNodeOfName(srcCanvasControlNode, CANVAS_CONTROL_SET_VALUE_NODE_NAME),
                    currentValue,
                    currentSetValue = NaN,
                    setValueAvailable = false,
                    canvasControlsIndex,
                    controlId = '',
                    foundControlToUpdate = false;

                if (!currentValueNode) {
                    alert("Child-node for class: \'value\' not found under node \'" + canvasControlId + "\' !");
                    return;
                }

                currentValue = moduleDomHelpers.getValueOfXmlNode(currentValueNode);
                currentValue = parseFloat(currentValue);
                if (true === isNaN(currentValue)) {
                    alert("Value of child-node for class: \'value\' under node \'" + canvasControlId + "\' is not a number: " + currentValue);
                    return;
                }

                if (currentSetValueNode) {
                    currentSetValue = moduleDomHelpers.getValueOfXmlNode(currentSetValueNode);
                    currentSetValue = parseFloat(currentSetValue);
                    if (true === isNaN(currentSetValue)) {
                        alert("Value of child-node for class: \'setValue\' under node \'" + canvasControlId + "\' is is not a number: " + currentSetValue);
                        return;
                    }

                    setValueAvailable = true;
                }

                for (canvasControlsIndex = 0; canvasControlsIndex < canvasControlsIndexMax; canvasControlsIndex++) {
                    canvasControl = canvasControlsToUpdate[canvasControlsIndex];
                    controlId = canvasControl.getId();

                    if (controlId === canvasControlId) {
                        foundControlToUpdate = true;
                        if ((true === setValueAvailable) && canvasControl.supportsSetValue()) {
                            if ((canvasControl.getCurrentValue() !== currentValue) ||
                                    (canvasControl.getSetValue() !== currentSetValue)) {
                                canvasControl.refresh(currentValue, currentSetValue);
                            }
                        } else if (canvasControl.getCurrentValue() !== currentValue) {
                            if (canvasControl.supportsSetValue()) {
                                canvasControl.refresh(currentValue, null);
                            } else {
                                canvasControl.refresh(currentValue);
                            }
                        }
                    }
                }

                if (false === foundControlToUpdate) {
                    alert("Error: The control '" + canvasControlId + "' was not found in the webpage. Thus it could not be updated !");
                }
            }


            /***************************************************************************************
                Update one single indicator in the calling document if its value has changed
            ***************************************************************************************/
            function updateIndicatorNode(nodeToUpdate, newValue) {
                var INDICATOR_CRITICAL_VALUE = 0,
                    INDICATOR_ON_VALUE = 1,
                    INDICATOR_WARNING_VALUE = 2,
                    INDICATOR_NEUTRAL_VALUE = 3,
                    INDICATOR_ON_ALT = 'on',
                    INDICATOR_CRITICAL_ALT = 'critical',
                    INDICATOR_WARNING_ALT = 'warning',
                    INDICATOR_NEUTRAL_ALT = 'neutral',
                    INDICATOR_OFF_ALT = 'off',
                    newAlt = '',
                    newIndicatorImagePath = '',
                    indicatorImage = nodeToUpdate,
                    currentAlt = indicatorImage.alt,
                    updateImage = false;

                switch (newValue) {
                case INDICATOR_CRITICAL_VALUE:
                    newIndicatorImagePath = 'images/indicatorCritical.png';
                    newAlt = INDICATOR_CRITICAL_ALT;
                    break;
                case INDICATOR_ON_VALUE:
                    newIndicatorImagePath = 'images/indicatorOn.png';
                    newAlt = INDICATOR_ON_ALT;
                    break;
                case INDICATOR_WARNING_VALUE:
                    newIndicatorImagePath = 'images/indicatorWarning.png';
                    newAlt = INDICATOR_WARNING_ALT;
                    break;
                case INDICATOR_NEUTRAL_VALUE:
                    newIndicatorImagePath = 'images/indicatorNeutral.png';
                    newAlt = INDICATOR_NEUTRAL_ALT;
                    break;
                default:
                    newIndicatorImagePath = 'images/indicatorOff.png';
                    newAlt = INDICATOR_OFF_ALT;
                }

                indicatorImage.alt = newAlt;

                if (newAlt.indexOf(currentAlt) === -1) {
                    updateImage = true;
                }

                if (true === updateImage) {
                    indicatorImage.src = newIndicatorImagePath;
                }
            }


            /***************************************************************************************
                Wrapper function for updating the values of one type
            ***************************************************************************************/
            function updateValuesOfOneType(variablesNode, destDocument, idOfTypeToHandle) {
                if (!variablesNode) {
                    return;
                }

                var srcParentNode = moduleDomHelpers.getFirstChildNodeOfName(variablesNode, idOfTypeToHandle),
                    srcChildNodes,
                    indexChildNodes,
                    indexChildNodesMax,
                    srcChildNode = null,
                    srcValue = 0,
                    destNode = null;

                if (!srcParentNode) {
                    /* alert("ID not found: " + idOfTypeToHandle); */
                    return;
                }

                srcChildNodes = srcParentNode.childNodes;
                if (!srcChildNodes) {
                    return;
                }
                indexChildNodesMax = srcChildNodes.length;

                if ((BAR_VARIABLES_ID === idOfTypeToHandle) || (GAUGE_VARIABLES_ID === idOfTypeToHandle)) {
                    if (false === moduleCanvasHelpers.isCanvasSupported()) {
                        return;
                    }
                }

                for (indexChildNodes = 0; indexChildNodes < indexChildNodesMax; indexChildNodes++) {
                    srcChildNode = srcChildNodes[indexChildNodes];
                    if ((!srcChildNode) || (srcChildNode.nodeType !== VARIABLE_NODE_TYPE)) {
                        continue;
                    }

                    destNode = moduleDomHelpers.getDestinationNodeById(destDocument, srcChildNode.nodeName);
                    if (null === destNode) {
                        continue;
                    }

                    srcValue = moduleDomHelpers.getValueOfXmlNode(srcChildNode);

                    switch (idOfTypeToHandle) {
                    case NUMERIC_VARIABLES_ID:
                        updateTextNode(destNode, parseFloat(srcValue));
                        break;
                    case INDICATOR_VARIABLES_ID:
                        updateIndicatorNode(destNode, Number(srcValue));
                        break;
                    case GAUGE_VARIABLES_ID:
                        updateCanvasControl(srcChildNode.nodeName, srcChildNode);
                        break;
                    case BAR_VARIABLES_ID:
                        updateCanvasControl(srcChildNode.nodeName, srcChildNode);
                        break;
                    case PLAIN_TEXT_VARIABLES_ID:
                        updatePlainTextNode(destNode, srcValue.trim());
                        break;
                    case INPUT_FIELD_VARIABLES_ID:
                        updateInputFieldNode(destNode, srcValue.trim());
                        break;
                    default:
                        alert("Don\'t know how to handle ID: " + idOfTypeToHandle);
                        return;
                    }
                }
            }


            /***************************************************************************************
              Check whether the version of the interpreter/parser (= this library) and the 
              document are compatible
            ***************************************************************************************/
            function isUpdatedXmlDocumentCompatibleWithMe(versionsNode) {
                var VERSION_INTERPRETER = 1,
                    VERSION_DOCUMENT_MIN_COMPATIBLE = 1,
                    VERSION_DOCUMENT_NODE_NAME = 'document',
                    VERSION_MIN_INTERPRETER_NODE_NAME = 'minInterpreter',
                    versionDocumentNode,
                    versionInterpreterMinCompatibleNode,
                    versionDocument,
                    versionInterpreterMinCompatible;

                if (!versionsNode) {
                    alert("Error: The node 'root' in the xml-document with the updated values does not contain a sub-node 'versions'!");
                    return false;
                }

                versionDocumentNode = moduleDomHelpers.getFirstChildNodeOfName(versionsNode, VERSION_DOCUMENT_NODE_NAME);
                versionInterpreterMinCompatibleNode = moduleDomHelpers.getFirstChildNodeOfName(versionsNode, VERSION_MIN_INTERPRETER_NODE_NAME);

                if (!versionDocumentNode) {
                    alert("Error: The node 'versions' in the xml-document with the updated values does not contain a sub-node '" + VERSION_DOCUMENT_NODE_NAME + "'!");
                    return false;
                }

                if (!versionInterpreterMinCompatibleNode) {
                    alert("Error: The node 'versions' in the xml-document with the updated values does not contain a sub-node '" + VERSION_MIN_INTERPRETER_NODE_NAME + "'!");
                    return false;
                }

                versionDocument = moduleDomHelpers.getValueOfXmlNode(versionDocumentNode);
                versionInterpreterMinCompatible = moduleDomHelpers.getValueOfXmlNode(versionInterpreterMinCompatibleNode);

                if (versionDocument < VERSION_DOCUMENT_MIN_COMPATIBLE) {
                    alert("The document version of the xml-document with the updated values is too old for the current version of this library!");
                    return false;
                }

                if (VERSION_INTERPRETER < versionInterpreterMinCompatible) {
                    alert("The xml-document with the updated values contains features that are not supported by the current version of this library. Please update your library!");
                    return false;
                }

                return true;
            }


            /***************************************************************************************
              Main function to update a web page with the values provided in the xml document
              passed as a parameter to it
            ***************************************************************************************/
            function processUpdatedValues(updatedXmlDocument, canvasControls, xmlDocAsPlainText) {
                if (!updatedXmlDocument) {
                    return false;
                }

                var rootNode = updatedXmlDocument.getElementsByTagName(ROOT_NODE_NAME)[0],
                    versionsNode = moduleDomHelpers.getFirstChildNodeOfName(rootNode, VERSIONS_NODE_NAME),
                    variablesNode = moduleDomHelpers.getFirstChildNodeOfName(rootNode, VARIABLES_NODE_NAME);

                if (!rootNode) {
                    alert("Error: The requested xml-document does not contain a valid node with the name 'root'!\n\n" + xmlDocAsPlainText);
                    return false;
                }

                if (!versionsNode) {
                    alert("Error: The node 'root' in the xml-document with the updated values does not contain a sub-node with the name'" + VERSIONS_NODE_NAME + "'.\n\n" + xmlDocAsPlainText);
                    return false;
                }

                if (!variablesNode) {
                    alert("Error: The node 'root' in the xml-document with the updated values does not contain a sub-node with the name'" + VARIABLES_NODE_NAME + "'.\n\n" + xmlDocAsPlainText);
                    return false;
                }

                if (false === isUpdatedXmlDocumentCompatibleWithMe(versionsNode)) {
                    return false;
                }

                canvasControlsToUpdate = canvasControls;
                updateValuesOfOneType(variablesNode, document, PLAIN_TEXT_VARIABLES_ID);
                updateValuesOfOneType(variablesNode, document, NUMERIC_VARIABLES_ID);
                updateValuesOfOneType(variablesNode, document, INDICATOR_VARIABLES_ID);
                updateValuesOfOneType(variablesNode, document, INPUT_FIELD_VARIABLES_ID);
                updateValuesOfOneType(variablesNode, document, GAUGE_VARIABLES_ID);
                updateValuesOfOneType(variablesNode, document, BAR_VARIABLES_ID);

                return true;
            }

            /***************************************************************************************
              Return the public routines
            ***************************************************************************************/
            return {
                processUpdatedValues: processUpdatedValues
            };
        }


        /***************************************************************************************
              Get the Singleton instance if one exists or create one if it does not exist
        ***************************************************************************************/
        function getInstance() {
            if (!instance) {
                instance = init();
            }

            return instance;
        }

        return {
            getInstance: getInstance
        };
    }());



    /*******************************************************************************************
        Controller and state-machine for the update process of the variables of the document
        A Singleton is used because of the restricted webserver ressources of the drive 

        Note:   Uses the Singleton pattern 
                (see /patterns12/: The Singleton Pattern)
    *******************************************************************************************/
    var UpdateControllerSingleton = (function () {
        /*******************************************************************************************
            Data for an update of a page
        *******************************************************************************************/
        function PageUpdateRequestData() {
            this.urlOfDocumentWithValue = '';
            this.canvasControlsToUpdate = null;
            this.requestType = 'GET';
            this.callbackFunctionAfterUpdateHasFinished = null;
        }

        var instance;   /* Instance that stores a reference to the Singleton */

        /***************************************************************************************
            Definition of the update controller class
        ***************************************************************************************/
        function init() {
            /* "Enums" */
            var STATES = {
                GENERAL_ERROR: -1,
                NOT_INITIALIZED: -2,
                PREPARING_REQUEST: 10,
                REQUEST_SENT: 12,
                REQUEST_GOOD_ANSWER_RECEIVED: 14,
                REQUEST_ABORTING: 16,
                RETRY_REQUEST: 18,
                DOCUMENT_UPDATING_WITH_NEW_VALUES: 30,
                IDLE: 100
            },

                STATES_CLIENT_CALLBACK = {
                    REQUEST_NOT_SUCCESSFUL: 0,
                    REQUEST_SUCCESSFUL: 1,
                    REQUEST_ABORTED: 2
                },


                /* Private members */
                MAX_RETRIES_BAD_REQUESTS = 2,
                startNextUpdateImmediatelyAfterCurrentUpdate = false,
                currentState = STATES.NOT_INITIALIZED,
                docUpdater = WebPageUpdaterSingleton.getInstance(),
                xmlHttpWrapper = null,
                abortingAllActions = false,
                retryCounterForBadRequests = 0,
                pageUpdateRequestData = new PageUpdateRequestData();


            /***************************************************************************************
                Routine to abort the update request
                Note: This routine may be enhanced to abort the document update, too.
            ***************************************************************************************/
            function callbackAfterUpdate(result) {
                if (!pageUpdateRequestData.callbackFunctionAfterUpdateHasFinished) {
                    return;
                }

                pageUpdateRequestData.callbackFunctionAfterUpdateHasFinished(result);
            }


            /***************************************************************************************
                Routine to abort the update request
                Note: This routine may be enhanced to abort the document update, too.
            ***************************************************************************************/
            function abortUpdate() {
                abortingAllActions = true;

                if (!xmlHttpWrapper) {
                    callbackAfterUpdate(STATES_CLIENT_CALLBACK.REQUEST_NOT_SUCCESSFUL);
                    return;
                }

                switch (currentState) {
                case STATES.REQUEST_SENT:
                    xmlHttpWrapper.abort();
                    currentState = STATES.REQUEST_ABORTING;
                    break;
                }

                callbackAfterUpdate(STATES_CLIENT_CALLBACK.REQUEST_ABORTED);
            }


            /***************************************************************************************
                Process the successfully updated response from the server 
            ***************************************************************************************/
            function processUpdatedXmlResponseCallback(responseText) {
                if ((true === abortingAllActions) || (!docUpdater)) {
                    callbackAfterUpdate(STATES_CLIENT_CALLBACK.REQUEST_ABORTED);
                    return;
                }

                currentState = STATES.REQUEST_GOOD_ANSWER_RECEIVED;

                var xmlDocument = moduleDomHelpers.getXmlDocumentFromXmlText(responseText),
                    result;
                if (!xmlDocument) {
                    alert("Error: Unable to convert the updated xml-document to a valid xml-document !");
                    currentState = STATES.IDLE;
                }


                currentState = STATES.DOCUMENT_UPDATING_WITH_NEW_VALUES;
                result = docUpdater.processUpdatedValues(xmlDocument, pageUpdateRequestData.canvasControlsToUpdate, responseText);
                if (false === result) {
                    alert("An error occured during the update of your web page !");
                    startNextUpdateImmediatelyAfterCurrentUpdate = false;
                }

                callbackAfterUpdate(STATES_CLIENT_CALLBACK.REQUEST_SUCCESSFUL);

                currentState = STATES.IDLE;
                if (startNextUpdateImmediatelyAfterCurrentUpdate) {
                    updateValues(pageUpdateRequestData.urlOfDocumentWithValue, pageUpdateRequestData.canvasControlsToUpdate, pageUpdateRequestData.callbackFunctionAfterUpdateHasFinished, pageUpdateRequestData.typeOfRequest);
                }
            }


            /***************************************************************************************
                Process any error that occured during the update process for requesting an
                updated document from the server
            ***************************************************************************************/
            function xmlHttpUpdateErrorCallback(statusText) {
                var errorText = "An error occured while getting the updated values from the server!";

                if (statusText && (statusText !== "")) {
                    errorText = errorText + " Status: " + statusText;
                } else {
                    if (retryCounterForBadRequests < MAX_RETRIES_BAD_REQUESTS) {
                        currentState = STATES.RETRY_REQUEST;
                        retryCounterForBadRequests = retryCounterForBadRequests + 1;

                        updateValues(pageUpdateRequestData.urlOfDocumentWithValue, pageUpdateRequestData.canvasControlsToUpdate, pageUpdateRequestData.callbackFunctionAfterUpdateHasFinished, pageUpdateRequestData.typeOfRequest);
                        return;
                    }
                }

                alert(errorText);
                callbackAfterUpdate(STATES_CLIENT_CALLBACK.REQUEST_NOT_SUCCESSFUL);
                currentState = STATES.IDLE;
            }


            /***************************************************************************************
                Request an updated xml document from the server
            ***************************************************************************************/
            function requestUpdatedXmlDocument() {
                currentState = STATES.PREPARING_REQUEST;

                if (!xmlHttpWrapper) {
                    xmlHttpWrapper = new XmlHttpRequestWrapper();
                    if (!xmlHttpWrapper) {
                        alert("Unable to create an object to update the page!");
                        currentState = STATES.IDLE;
                        return;
                    }
                }

                var result = xmlHttpWrapper.loadXmlDocument(pageUpdateRequestData.urlOfDocumentWithValue,
                                                            processUpdatedXmlResponseCallback,
                                                            xmlHttpUpdateErrorCallback,
                                                            pageUpdateRequestData.requestType);
                if (false === result) {
                    currentState = STATES.IDLE;
                    startNextUpdateImmediatelyAfterCurrentUpdate = false;
                    return;
                }

                currentState = STATES.REQUEST_SENT;
            }


            /***************************************************************************************
                Routine to handle new update requests
            ***************************************************************************************/
            function updateValues(urlOfXmlDocumentWithValues, canvasControls, callbackFunctionWhenFinished, requestType) {
                if (!docUpdater) {
                    if (STATES.NOT_INITIALIZED === currentState) {
                        currentState = STATES.GENERAL_ERROR;
                        alert("Error: Unable to create the object to update the web page. Please restart your browser");
                    }
                    return;
                }

                if (true === abortingAllActions) {
                    return;
                }

                var startNewRequest = false,
                    requestIsForSamePageAndObjectsAsPreviousOne = false,
                    raiseConcurrentRequestError = false;

                if (jsHelpers.isNullOrUndefined(pageUpdateRequestData)) {
                    alert("Error: Internal object for request data could not be created. Please restart your browser.");
                    return;
                }

                if ((urlOfXmlDocumentWithValues === pageUpdateRequestData.urlOfDocumentWithValue) &&
                        (canvasControls === pageUpdateRequestData.canvasControlsToUpdate) &&
                        (callbackFunctionWhenFinished === pageUpdateRequestData.callbackFunctionAfterUpdateHasFinished) &&
                        (requestType === pageUpdateRequestData.requestType)) {
                    requestIsForSamePageAndObjectsAsPreviousOne = true;
                }

                switch (currentState) {
                case STATES.PREPARING_REQUEST:
                    if (false === requestIsForSamePageAndObjectsAsPreviousOne) {
                        raiseConcurrentRequestError = true;
                    } else {
                        /* Do nothing, because we are creating a new request right now */
                        startNextUpdateImmediatelyAfterCurrentUpdate = false;
                    }
                    break;
                case STATES.REQUEST_SENT:
                    if (false === requestIsForSamePageAndObjectsAsPreviousOne) {
                        raiseConcurrentRequestError = true;
                    } else {
                        /* Cancel the current request and start a new request afterwards */
                        abortUpdate();
                        retryCounterForBadRequests = 0;
                        startNewRequest = true;
                    }
                    break;
                case STATES.REQUEST_GOOD_ANSWER_RECEIVED:
                    if (false === requestIsForSamePageAndObjectsAsPreviousOne) {
                        raiseConcurrentRequestError = true;
                    } else {
                        /* A successful update is going on. => No new action required */
                        startNextUpdateImmediatelyAfterCurrentUpdate = false;
                    }
                    break;
                case STATES.REQUEST_ABORTING:
                    retryCounterForBadRequests = 0;
                    startNewRequest = true;
                    break;
                case STATES.DOCUMENT_UPDATING_WITH_NEW_VALUES:
                    if (false === requestIsForSamePageAndObjectsAsPreviousOne) {
                        raiseConcurrentRequestError = true;
                    } else {
                        /* A successful update is going on. => No new action required */
                        startNextUpdateImmediatelyAfterCurrentUpdate = false;
                    }
                    break;
                case STATES.RETRY_REQUEST:
                    startNewRequest = true;
                    break;
                case STATES.IDLE:
                    startNewRequest = true;
                    retryCounterForBadRequests = 0;
                    break;
                case STATES.NOT_INITIALIZED:
                    currentState = STATES.IDLE;
                    startNewRequest = true;
                    retryCounterForBadRequests = 0;
                    break;
                }

                if (true === raiseConcurrentRequestError) {
                    alert("Error: The current version of this library does not support two simultaneous update requests with different parameters.");
                    return;
                }

                if (true === startNewRequest) {
                    abortingAllActions = false;
					pageUpdateRequestData.canvasControlsToUpdate = canvasControls;
                    pageUpdateRequestData.urlOfDocumentWithValue = urlOfXmlDocumentWithValues;
                    pageUpdateRequestData.callbackFunctionAfterUpdateHasFinished = callbackFunctionWhenFinished;
                    pageUpdateRequestData.requestType = requestType;

                    requestUpdatedXmlDocument();
                }
            }

            /***************************************************************************************
              Return the public routines
            ***************************************************************************************/
            return {
                updateValues: updateValues,
                abortUpdate: abortUpdate
            };
        }


        /***************************************************************************************
              Get the Singleton instance if one exists or create one if it does not exist
        ***************************************************************************************/
        function getInstance() {
            if (!instance) {
                instance = init();
            }

            return instance;
        }


        return {
            getInstance: getInstance
        };
    }());


    /***************************************************************************************
        Main function (extended) to update and to organize the update of a document
    ***************************************************************************************/
    function updateValuesEx(urlOfXmlDocumentWithValues, canvasControls, callbackFunctionWhenFinished) {
        var updateController = UpdateControllerSingleton.getInstance();
        if (updateController) {
            updateController.updateValues(urlOfXmlDocumentWithValues, canvasControls, callbackFunctionWhenFinished, 'GET');
        } else {
            alert("Error: Unable to get an instance of the object to update the values. Please restart your browser.");
        }
    }


    /***************************************************************************************
        Main function to update and to organize the update of a document
    ***************************************************************************************/
    function updateValues(urlOfXmlDocumentWithValues) {
        updateValuesEx(urlOfXmlDocumentWithValues, null, null);
    }


    /***************************************************************************************
        Finally return the public functions of this module
    ***************************************************************************************/
    return {
        updateValues: updateValues,
        updateValuesEx: updateValuesEx
    };
}());
