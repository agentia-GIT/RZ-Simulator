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

// Valide une adresse IPv4 (quatre nombres décimaux de 0 à 255).
// null est accepté volontairement : il signifie « pas d'adresse ».
function isValidIPv4(ipv4) 
{
    if (ipv4 === null) 
    {
        return true;
    }
    if (typeof ipv4 !== "string") 
    {
        return false;
    }

    var parts = ipv4.split(".");
    if (parts.length !== 4) 
    {
        return false;
    }

    for (var i = 0; i < 4; i++) 
    {
        if (!/^\d{1,3}$/.test(parts[i]) || (parseInt(parts[i], 10) > 255)) 
        {
            return false;
        }
    }

    return true;
}

function ipStringToInt(ip) 
{
    var result = null;
    if (ip !== null) 
    {
        var parts = ip.split(".");
        
        result = (parseInt(parts[0], 10) << 24) | (parseInt(parts[1], 10) << 16) | (parseInt(parts[2], 10) << 8) | parseInt(parts[3], 10);
    }
    
    return result;
}

function ipIntToString(ip) 
{
    var result = null;
    
    if (ip !== null) 
    {
        var byte1 = ip & 0XFF;
        var byte2 = ip >> 8 & 0xFF;
        var byte3 = ip >> 16 & 0xFF;
        var byte4 = ip >> 24 & 0xFF;
        
        result = byte4 + "." + byte3 + "." + byte2 + "." + byte1;
    }
    
    return result;
}

var IPInfo = function() 
{
    var IPv4 = null;
    var DNS1 = null;
    var DNS2 = null;
    var netmask = null;
    var isStatic = false;
    
    this.save = function() 
    {
        var result = {};
        result.IPv4 = isStatic ? IPv4 : null;
        result.DNS1 = isStatic ? DNS1 : null;
        result.DNS2 = isStatic ? DNS2 : null;
        result.netmask = isStatic ? netmask : null;
        result["static"] = isStatic;
        
        return result;
    };
    
    this.load = function(data) 
    {
        if (data != null) 
        {
            IPv4 = data.IPv4;
            DNS1 = data.DNS1;
            DNS2 = data.DNS2;
            netmask = data.netmask;
            isStatic = data["static"];
        }
    };
    
    this.sameNetwork = function(ip) 
    {
        var result = false;
        if ((IPv4 !== null) && (netmask !== null) && (ip !== null) && isValidIPv4(ip)) 
        {
            //console.log("Is "+ip+" in my network "+ipIntToString(IPv4)+"?");
            var intip = ipStringToInt(ip);
            var testnetwork = intip & netmask;
            var thisnetwork = IPv4 & netmask;
            result = testnetwork === thisnetwork;
        }
        return result;
    };
    
    this.setIPv4 = function(ipv4) 
    {
        if (isValidIPv4(ipv4)) 
        {
            IPv4 = ipStringToInt(ipv4);
        }
    };
    
    this.setNetmask = function(mask) 
    {
        if (isValidIPv4(mask)) 
        {
            netmask = ipStringToInt(mask);
        }
    };
    
    this.setDNS1 = function(dns) 
    {
        if (isValidIPv4(dns)) 
        {
            DNS1 = ipStringToInt(dns);
        }
    };
    
    this.setDNS2 = function(dns) 
    {
        if (isValidIPv4(dns)) 
        {
            DNS2 = ipStringToInt(dns);
        }
    };
    
    this.setStatic = function(s) 
    {
        isStatic = s;
    };
    
    this.getIPv4 = function() 
    {
        return ipIntToString(IPv4);
    };
    
    this.getDNS1 = function() 
    {
        return ipIntToString(DNS1);
    };
    
    this.getDNS2 = function() 
    {
        return ipIntToString(DNS2);
    };
    
    this.getNetmask = function() 
    {
        return ipIntToString(netmask);
    };
    
    this.getStatic = function() 
    {
        return isStatic;
    };
};
