 
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
/*global updateDocument: false, moduleDomHelpers: false */


/*******************************************************************************************
    Module handling all the internal actions and data for the status pages of the axes
    Note:   Uses the revealing module pattern 
            (see /patterns12/: The Revealing Module Pattern)
*******************************************************************************************/
var diagStatusAxisHandler = (function () {
    "use strict"; 

    /*****************************************************************************/
     /// \brief     Set the page contents depending on the selection box value */
    /*****************************************************************************/
    function setPageContents() {
        var selectedIndex = document.getElementById('selectContentsToShow').selectedIndex;

        if ((selectedIndex === null) || (selectedIndex === undefined) || (selectedIndex === 0)) {
            document.getElementById('controlWordColumn').style.display = 'block';
            document.getElementById('statusWordColumn').style.display = 'block';
            document.getElementById('controlWordAlarmsFaultsColumn').style.display = 'none';
            document.getElementById('statusWordAlarmsFaultsColumn').style.display = 'none';
            document.getElementById('statusWordAlarmsFaults2Column').style.display = 'none';
            document.getElementById('statusWordAlarmsFaults2Column').style.display = 'none';
            document.getElementById('controlWordSpeedController').style.display = 'none';
            document.getElementById('statusWordSpeedController').style.display = 'none';
        } else if (selectedIndex === 1) {
            document.getElementById('controlWordColumn').style.display = 'none';
            document.getElementById('statusWordColumn').style.display = 'none';
            document.getElementById('controlWordAlarmsFaultsColumn').style.display = 'block';
            document.getElementById('statusWordAlarmsFaultsColumn').style.display = 'block';
            document.getElementById('statusWordAlarmsFaults2Column').style.display = 'none';
            document.getElementById('controlWordSpeedController').style.display = 'none';
            document.getElementById('statusWordSpeedController').style.display = 'none';
        } else if (selectedIndex === 2) {
            document.getElementById('controlWordColumn').style.display = 'none';
            document.getElementById('statusWordColumn').style.display = 'none';
            document.getElementById('controlWordAlarmsFaultsColumn').style.display = 'block';
            document.getElementById('statusWordAlarmsFaultsColumn').style.display = 'none';
            document.getElementById('statusWordAlarmsFaults2Column').style.display = 'block';
            document.getElementById('controlWordSpeedController').style.display = 'none';
            document.getElementById('statusWordSpeedController').style.display = 'none';
        } else if (selectedIndex === 3) {
            document.getElementById('controlWordColumn').style.display = 'none';
            document.getElementById('statusWordColumn').style.display = 'none';
            document.getElementById('controlWordAlarmsFaultsColumn').style.display = 'none';
            document.getElementById('statusWordAlarmsFaultsColumn').style.display = 'none';
            document.getElementById('statusWordAlarmsFaults2Column').style.display = 'none';
            document.getElementById('controlWordSpeedController').style.display = 'block';
            document.getElementById('statusWordSpeedController').style.display = 'block';
        }
    }


    /*****************************************************************************/
    /// \brief     Change to cyclic updating mode
    /*****************************************************************************/
    function setupPage(){
        var doName = moduleDomHelpers.getValueOfUrlParameter("doName", true, "DO-name", "1");
        if (doName) {
            setInterval(function () { updateDocument.updateValues('variablesDiagStatusAxis.mwsl?doName=' + doName); }, 3000);
        }
    }

    
    /**************************************************************************************/
    /// \brief     Finally return the public functions of this module
    /**************************************************************************************/
    return {
        setPageContents: setPageContents,
        setupPage: setupPage
    };
}());