//constants
var REQUEST_TYPE_GET = "GETPARAM";
var REQUEST_TYPE_PUT = "PUTPARAM";
var REQUEST_TYPE_PUT_INTERACTIONS = "PUTINTERACTIONS";
var REQUEST_TYPE_EXIT = "EXITAU";


var objXMLHTTP = null;
var queryString = location.search.substring(1);
var strAICCSID = getParameter('AICC_SID');
var strAICCURL = getParameter('AICC_URL');

var serverData = null;


function putAICCData(data) {
	serverData = MakePutParamRequest(strAICCSID, strAICCURL,data);
	var err = getAICCParam('error');
	return err;
}


function getAICCParam(param) {

	 var arr = serverData.split("\n");
	 //alert(arr[0]);
	 for (var i=0; i < arr.length; i++) {
	 	if (arr[i].toLowerCase().indexOf(param) > -1) {
	 		var s = arr[i].split("=");
	 		var l = s[1];
	 		//alert(l);
	 		return l;
	   }
	 }
	 return "";
}

function AICCGetLearnerId() {
  return getAICCParam('student_id');
}

function AICCGetLearnerName() {
  return getAICCParam('student_name');
}
	


function getParameter ( parameterName ) {
	var parameterName = parameterName + "=";
	if ( queryString.length > 0 ) 
	{
		begin = queryString.indexOf ( parameterName );
		if ( begin != -1 ) 
		{
			begin += parameterName.length;
			end = queryString.indexOf ( "&" , begin );
			if ( end == -1 ) 
			{
				end = queryString.length
			}
			return unescape ( queryString.substring ( begin, end ) );
		}
		return null;
	}
} 





function initAICC() {
	url = strAICCURL;
	//alert('Url is ' + url);
	//url = url.replace(/www.itslearning.com/g, "files.itslearning.com");
	if (strAICCSID != null) {
		//alert('doing it');
		serverData = MakeGetParamRequest(strAICCSID, strAICCURL);
	}
	//alert(AICCGetLearnerId());
	//alert(AICCGetLearnerName());
}



function SubmitFormUsingXMLHTTP(strAICCURL, strAICCSID, strRequestType, strAICCData){
	
	// alert("starting function SubmitFormUsingXMLHTTP");
	// alert("strAICCURL: "+ strAICCURL);
	var strReturn;
	var strPostData;

	//alert(strAICCURL);
	objXMLHTTP.open ("POST", strAICCURL, false);

	// alert("opened objXMLHTTP object");

	objXMLHTTP.setRequestHeader ("Content-Type", "application/x-www-form-urlencoded");
	
	strPostData = "session_id=" + URLEncode(strAICCSID) + 
				  "&version=3.5" + 
				  "&command=" + URLEncode(strRequestType) +
				  "&aicc_data=" + URLEncode(strAICCData);
	

	objXMLHTTP.send (strPostData);
	
	strReturn = objXMLHTTP.responseText;
	
	
	
	return strReturn;

	//ProcessLMSResult(strRequestType, strReturn);
}


function MakePutParamRequest(strAICCSID, strAICCURL, strAICCData){

	//alert ("strAICCData:"+strAICCData);
	return SubmitFormUsingXMLHTTP(strAICCURL, strAICCSID, REQUEST_TYPE_PUT, strAICCData);

}


function MakeExitParamRequest(strAICCSID, strAICCURL, strAICCData){

	//alert ("strAICCData:"+strAICCData);
	return SubmitFormUsingXMLHTTP(strAICCURL, strAICCSID, REQUEST_TYPE_EXIT, "");

}
function MakeGetParamRequest(strAICCSID, strAICCURL){
		
	return SubmitFormUsingXMLHTTP(strAICCURL, strAICCSID, REQUEST_TYPE_GET, "");
}

function URLEncode(str){
	
	str = new String(str);
	
	str = escape(str);
	str = str.replace(/%20/g, "+");
	
	return str;
}
