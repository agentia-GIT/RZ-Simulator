/*
 * This file is part of the Education Network Simulator project and covered 
 * by GPLv3 license. See full terms in the LICENSE file at the root folder
 * or at http://www.gnu.org/licenses/gpl-3.0.html.
 * 
 * (c) 2015 Jorge García Ochoa de Aspuru
 * bardok@gmail.com
 * 
 * Images are copyrighted by their respective authors and have been 
 * downloaded from http://pixabay.com/
 * 
 */

var AnimationControls =
{
    MSG_ADVANCE_PRE: 0,
    MSG_ADVANCE: 2,
    controlsWindow: null,
    setSpeed: function(multiplier)
    {
        this.MSG_ADVANCE *= multiplier;
        if (this.MSG_ADVANCE > 16)
        {
            this.MSG_ADVANCE = 16;
        }
        else if (this.MSG_ADVANCE < 0.125)
        {
            this.MSG_ADVANCE = 0.125;
        }
    },
    playPause: function()
    {
        var tmp = this.MSG_ADVANCE;
        this.MSG_ADVANCE = this.MSG_ADVANCE_PRE;
        this.MSG_ADVANCE_PRE = tmp;
    }
};

function createControlsWindow()
{
    AnimationControls.controlsWindow = new UIWindow("controlswindow", "Animation Controls", 200, 50,false,1.0);
    // Centrée horizontalement (automatique), fixée à 70 px du haut
    AnimationControls.controlsWindow.setMinWidth(170);
    AnimationControls.controlsWindow.setPos(null, 70);

    var controls = '<img src="img/v3i/minus.svg" alt="'+_("Slow")+'" title="'+_("Slow")+'" onclick="AnimationControls.setSpeed(0.5);" style="width:32px;cursor:pointer;" />';
    controls += '<img src="img/v3i/playpause.svg" alt="'+_("Play/Pause")+'" title="'+_("Play/Pause")+'" onclick="AnimationControls.playPause();" style="width:32px;cursor:pointer;" />';
    controls += '<img src="img/v3i/plus.svg" alt="'+_("Fast")+'" title="'+_("Fast")+'" onclick="AnimationControls.setSpeed(2);" style="width:32px;cursor:pointer;" />';
    
    AnimationControls.controlsWindow.setControls(controls);

    AnimationControls.controlsWindow.render();
}