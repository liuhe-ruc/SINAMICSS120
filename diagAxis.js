
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
/*global updateDocument: false, moduleCanvasHelpers: false, canvasControls: false, 
    moduleDomHelpers: false */


/*******************************************************************************************
    Module handling all the internal actions and data for the diag pages of the axes
    Note:   Uses the revealing module pattern 
            (see /patterns12/: The Revealing Module Pattern)
*******************************************************************************************/
var diagAxisHandler = (function () {
    "use strict"; 

    /**************************************************************************************/
    /// \brief     Init the gauge controls of the web page
    /**************************************************************************************/
    function initGauges() {
        var gaugeSpeed = new canvasControls.Gauge('gaugeSpeed', 0, 3000, 'Rotation speed', 'rpm');
        gaugeSpeed.addDefaultColoredSections(0, 2400, 2700, 3000);    /* Add multiple colored sections */
        gaugeSpeed.refresh(null, null);

        return [gaugeSpeed];
    }

    /**************************************************************************************/
    /// \brief     Init the bar controls of the web page
    /**************************************************************************************/
    function initBars() {
        var barTorque = new canvasControls.Bar('barTorque', 0, 0.3, 'Torque', 'Nm');
        barTorque.addDefaultColoredSections(0, 0.1, 0.2, 0.3);

        /* Alternative methode to add some single colored sections */
        /*
        var NORMAL_SECTION = 0,
            WARNING_SECTION = 1,
            CRITICAL_SECTION = 2;
        
        barOutputVoltage.addColoredSection(5500, 6000, CRITICAL_SECTION);
        barOutputVoltage.addColoredSection(4500, 5500, WARNING_SECTION); 
        barOutputVoltage.addColoredSection(0, 4500, NORMAL_SECTION);
        */
        barTorque.refresh(null);

        return [barTorque];
    }


    /*****************************************************************************/
    /// \brief      Init the canvas controls of the web page and change to 
    ///             cyclic updating mode
    /*****************************************************************************/
    function setupPage() {
        var gauges,
            bars,
            canvasControls = null,
            doName;

        if (moduleCanvasHelpers.isCanvasSupported()) {
            gauges = initGauges();
            bars = initBars();
            canvasControls = gauges.concat(bars);
        } else {
            document.getElementById('canvasControls').style.display = 'none';
            document.getElementById('noCanvasControls').style.display = 'block';
        }
        
        doName = moduleDomHelpers.getValueOfUrlParameter("doName", true, "DO-name", "1");
        if (doName) {
            /* Change to cyclic updating mode with a period of 3000ms */
            setInterval(function () { updateDocument.updateValuesEx('variablesDiagAxis.mwsl?doName=' + doName, canvasControls, null); }, 3000);
        }
    }

    
    /**************************************************************************************/
    /// \brief     Finally return the public functions of this module
    /**************************************************************************************/
    return {
        setupPage: setupPage
    };
}()); 