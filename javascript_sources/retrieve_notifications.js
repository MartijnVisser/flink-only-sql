//This code is used to recognize the browser, make the call to retrieve notifications and to display or hide them

//Check if there's a cookie called 'identifier'
var getIdentifier = (document.cookie.match(/^(?:.*;)?\s*identifier\s*=\s*([^;]+)(?:.*)?$/)||[,null])[1]
//If there's no identifier cookie set, create one with value 'anonymous' and set the identifier to 'anonymous'
if (!getIdentifier) {
    document.cookie = "identifier=anonymous";
    getIdentifier = 'anonymous';
}

//Only make the API call if there's an identifier which is not anonymous
if (getIdentifier != 'anonymous') {
    //Retrieve the notifications for the specified identifier
    var url = 'http://localhost:9200/notifications/_doc/' + getIdentifier;
    var req = new XMLHttpRequest();
    req.responseType = 'json';
    req.open('GET', url, true);
    req.onload  = function() {
        if(req.status == 404 || req.status == 405) {
        //Make sure that we hide any notifications if there's nothing for that identifier (anymore)
            $('#notifications').hide();
        }
        else if (req.status == 200) {
            var jsonResponse = req.response;
            notificationResult = jsonResponse._source;
            //Check if there's a link belonging to the notification. If not, just display the text
            if(notificationResult.notification_link == null) {
                document.getElementById("notificationMessage").innerHTML = notificationResult.notification_text;
            }
            //If there is a link, make sure that's being included in the HTML code
            else {
                document.getElementById("notificationMessage").innerHTML = "<a href=\"" + notificationResult.notification_link + "\">" + notificationResult.notification_text + "</a>"
            }
            //Show the notification
            $('#notifications').show();
        }
    };
    req.send(null);
}
//Make sure to hide any notification if the identifier has changed to anonymous
else {
    $('#notifications').hide();
}